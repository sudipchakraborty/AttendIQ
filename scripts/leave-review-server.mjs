import { createServer } from 'node:http';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

const cookieName = 'attendiq_leave_review';
const lifetime = 8 * 60 * 60 * 1000;
function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
function publicUser(user) {
  const { id, name, email, role } = user;
  return { id, name, email, role, active: true, version: 1 };
}
function validYear(value) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100)
    fail(400, 'Choose a year between 2000 and 2100.');
  return year;
}
function dateRange(date, days) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    fail(400, 'Choose a valid start date.');
  const start = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(+start) || start.toISOString().slice(0, 10) !== date)
    fail(400, 'Choose a valid start date.');
  if (!Number.isInteger(days) || days < 1 || days > 366)
    fail(400, 'Days must be a whole number between 1 and 366.');
  const endDate = new Date(+start + (days - 1) * 86400000).toISOString().slice(0, 10);
  if (date.slice(0, 4) !== endDate.slice(0, 4))
    fail(400, 'Split leave across calendar years into separate applications.');
  return { endDate, year: validYear(date.slice(0, 4)) };
}
async function readBody(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json'))
    fail(415, 'Send JSON data.');
  let value = '';
  for await (const chunk of req) {
    value += chunk;
    if (Buffer.byteLength(value) > 16384) fail(413, 'Request is too large.');
  }
  try {
    const body = JSON.parse(value || '{}');
    if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Invalid JSON object.');
    return body;
  } catch {
    fail(400, 'Invalid JSON object.');
  }
}

/** Local review only: binds through the launcher to loopback, with no database or cloud calls. */
export async function createLeaveReviewServer({
  storage,
  seedPath = new URL('./leave-review-seed.json', import.meta.url),
}) {
  await mkdir(storage, { recursive: true });
  const path = join(storage, 'leave-data.json');
  let state;
  try {
    state = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const seed = JSON.parse(await readFile(seedPath, 'utf8'));
    state = {
      schemaVersion: 1,
      defaultAllowances: seed.defaultAllowances,
      policies: {},
      applications: [],
      users: seed.users.map(({ password, ...user }) => {
        const salt = randomBytes(16).toString('hex');
        return { ...user, salt, passwordHash: scryptSync(password, salt, 64).toString('hex') };
      }),
    };
    await writeFile(path, JSON.stringify(state, null, 2), { mode: 0o600 });
  }
  const sessions = new Map(),
    attempts = new Map();
  let queue = Promise.resolve();
  async function save(next) {
    await writeFile(`${path}.tmp`, JSON.stringify(next, null, 2), { mode: 0o600 });
    await rename(`${path}.tmp`, path);
    state = next;
  }
  const policy = (year) => state.policies[year] || state.defaultAllowances;
  function balances(employeeId, year) {
    return ['SL', 'CL'].map((type) => {
      const relevant = state.applications.filter(
        (a) => a.employeeId === employeeId && a.year === year && a.type === type,
      );
      const used = relevant
        .filter((a) => a.status === 'Approved')
        .reduce((sum, a) => sum + a.days, 0);
      const pending = relevant
        .filter((a) => a.status === 'Pending')
        .reduce((sum, a) => sum + a.days, 0);
      return {
        type,
        allowance: policy(year)[type],
        used,
        pending,
        available: policy(year)[type] - used,
      };
    });
  }
  function sessionData(session) {
    const user = session && state.users.find((u) => u.id === session.userId);
    return {
      user: user ? publicUser(user) : null,
      permissions: !user
        ? []
        : user.role === 'Admin'
          ? ['reports.read', 'leave.read.all', 'leave.approve', 'settings.leave']
          : ['leave.read.own', 'leave.apply'],
      setupRequired: false,
      csrfToken: session?.csrf || '',
    };
  }
  async function handle(req, res) {
    const send = (status, data) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(JSON.stringify(data));
    };
    try {
      const url = new URL(req.url, 'http://localhost');
      const route = url.pathname.replace(/^\/local-leave-api/, '');
      if (!url.pathname.startsWith('/local-leave-api/')) fail(404, 'Route not found.');
      const mutating = req.method !== 'GET';
      if (mutating && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host)
        fail(403, 'Cross-origin requests are not allowed.');
      const sessionId = (req.headers.cookie || '')
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${cookieName}=`))
        ?.slice(cookieName.length + 1);
      let session = sessions.get(sessionId);
      if (session && session.expires < Date.now()) {
        sessions.delete(sessionId);
        session = undefined;
      }
      if (route === '/session' && req.method === 'GET') return send(200, sessionData(session));
      if (route === '/login' && req.method === 'POST') {
        const body = await readBody(req);
        const key = req.socket.remoteAddress;
        let attempt = attempts.get(key);
        if (!attempt || attempt.until < Date.now()) {
          attempt = { count: 0, until: Date.now() + 15 * 60 * 1000 };
          attempts.set(key, attempt);
        }
        if (attempt.count >= 30) fail(429, 'Too many login attempts. Try again in 15 minutes.');
        const user = state.users.find((u) => u.email === String(body.email).trim().toLowerCase());
        const hash = scryptSync(String(body.password || ''), user?.salt || 'invalid-user', 64);
        if (!user || !timingSafeEqual(hash, Buffer.from(user.passwordHash, 'hex'))) {
          attempt.count++;
          fail(401, 'Email or password is incorrect.');
        }
        attempts.delete(key);
        if (sessionId) sessions.delete(sessionId);
        for (const [id, entry] of sessions) if (entry.expires < Date.now()) sessions.delete(id);
        const id = randomBytes(32).toString('hex');
        session = {
          userId: user.id,
          csrf: randomBytes(24).toString('hex'),
          expires: Date.now() + lifetime,
        };
        sessions.set(id, session);
        res.setHeader(
          'Set-Cookie',
          `${cookieName}=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,
        );
        return send(200, sessionData(session));
      }
      if (!session) fail(401, 'Please sign in.');
      const user = state.users.find((u) => u.id === session.userId);
      if (!user) fail(401, 'Please sign in.');
      const admin = user.role === 'Admin';
      if (mutating && req.headers['x-leave-csrf'] !== session.csrf)
        fail(403, 'Your session changed. Refresh and try again.');
      if (route === '/logout' && req.method === 'POST') {
        sessions.delete(sessionId);
        res.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
        return send(200, { ok: true });
      }
      if (route === '/settings') {
        if (!admin) fail(403, 'Only administrators can manage leave settings.');
        if (req.method === 'GET') {
          const year = validYear(url.searchParams.get('year') || new Date().getFullYear());
          return send(200, { year, ...policy(year) });
        }
        if (req.method === 'PUT') {
          const body = await readBody(req),
            year = validYear(body.year);
          for (const type of ['SL', 'CL']) {
            if (!Number.isInteger(body[type]) || body[type] < 0 || body[type] > 366)
              fail(400, 'Allowances must be whole days between 0 and 366.');
            if (
              state.users.some(
                (u) => balances(u.id, year).find((b) => b.type === type).used > body[type],
              )
            )
              fail(409, 'Allowance cannot be lower than leave already approved for an employee.');
          }
          const next = structuredClone(state);
          next.policies[year] = {
            SL: body.SL,
            CL: body.CL,
            updatedBy: user.name,
            updatedAt: new Date().toISOString(),
          };
          await save(next);
          return send(200, { year, ...policy(year) });
        }
      }
      if (route === '/leaves' && req.method === 'GET') {
        const year = validYear(url.searchParams.get('year') || new Date().getFullYear());
        return send(200, {
          year,
          applications: state.applications
            .filter((a) => a.year === year && (admin || a.employeeId === user.id))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          balances: admin ? [] : balances(user.id, year),
          employees: admin
            ? state.users
                .filter((u) => u.role === 'Employee')
                .map((u) => ({
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  balances: balances(u.id, year),
                }))
            : [],
        });
      }
      if (route === '/leaves' && req.method === 'POST') {
        if (user.role !== 'Employee') fail(403, 'Only employees can apply for leave.');
        const body = await readBody(req);
        if (Object.hasOwn(body, 'employeeId'))
          fail(400, 'Employee identity is taken from your login.');
        if (!['SL', 'CL'].includes(body.type)) fail(400, 'Choose SL or CL.');
        const { year, endDate } = dateRange(body.date, body.days);
        if (
          body.reason !== undefined &&
          (typeof body.reason !== 'string' || body.reason.length > 1000)
        )
          fail(400, 'Reason must be under 1,000 characters.');
        if (body.days > balances(user.id, year).find((b) => b.type === body.type).available)
          fail(400, 'This request exceeds your available leave.');
        if (
          state.applications.some(
            (a) =>
              a.employeeId === user.id &&
              a.status !== 'Rejected' &&
              body.date <= a.endDate &&
              endDate >= a.date,
          )
        )
          fail(409, 'These dates overlap an existing pending or approved application.');
        const application = {
          id: randomUUID(),
          employeeId: user.id,
          employeeName: user.name,
          type: body.type,
          date: body.date,
          endDate,
          year,
          days: body.days,
          reason: body.reason?.trim() || '',
          status: 'Pending',
          createdAt: new Date().toISOString(),
          decidedAt: null,
          decidedBy: null,
        };
        const next = structuredClone(state);
        next.applications.push(application);
        await save(next);
        return send(201, { application });
      }
      const decision = /^\/leaves\/([^/]+)\/decision$/.exec(route);
      if (decision && req.method === 'POST') {
        if (!admin) fail(403, 'Only administrators can approve or reject leave.');
        const body = await readBody(req);
        if (!['Approved', 'Rejected'].includes(body.status))
          fail(400, 'Choose Approved or Rejected.');
        const application = state.applications.find((a) => a.id === decision[1]);
        if (!application) fail(404, 'Application not found.');
        if (application.status !== 'Pending')
          fail(409, 'This application has already been decided. Refresh the list.');
        if (
          body.status === 'Approved' &&
          application.days >
            balances(application.employeeId, application.year).find(
              (b) => b.type === application.type,
            ).available
        )
          fail(409, 'Not enough leave remains to approve this application.');
        const next = structuredClone(state),
          updated = next.applications.find((a) => a.id === application.id);
        Object.assign(updated, {
          status: body.status,
          decidedAt: new Date().toISOString(),
          decidedBy: user.name,
        });
        await save(next);
        return send(200, { application: updated });
      }
      fail(404, 'Route not found.');
    } catch (error) {
      if (!error.status) console.error('Local leave service:', error);
      if (!res.headersSent)
        send(error.status || 500, {
          error: error.status ? error.message : 'Could not save data. Please try again.',
        });
    }
  }
  const server = createServer((req, res) => {
    queue = queue.then(() => handle(req, res)).catch((error) => console.error(error));
  });
  server.requestTimeout = 15000;
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await createLeaveReviewServer({
    storage: resolve(process.env.ATTENDIQ_LEAVE_STORAGE || '.attendiq/leave-review'),
  });
  server.listen(Number(process.env.ATTENDIQ_LEAVE_PORT || 8011), '127.0.0.1', () =>
    console.log('Local JSON leave service: http://127.0.0.1:' + server.address().port),
  );
}
