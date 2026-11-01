import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('local leave API enforces identity, approval policy and JSON persistence', async () => {
  const { createLeaveReviewServer } = await import('../scripts/leave-review-server.mjs');
  const storage = await mkdtemp(join(tmpdir(), 'attendiq-leave-'));
  let server;
  async function start() {
    server = await createLeaveReviewServer({ storage });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${server.address().port}/local-leave-api`;
  }
  let base = await start();
  function client() {
    let cookie = '',
      csrf = '';
    return async (path, method = 'GET', body, headers = {}) => {
      const response = await fetch(base + path, {
        method,
        headers: {
          Cookie: cookie,
          'Content-Type': 'application/json',
          'X-Leave-CSRF': csrf,
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (response.headers.get('set-cookie'))
        cookie = response.headers.get('set-cookie').split(';')[0];
      const data = await response.json();
      if (data.csrfToken) csrf = data.csrfToken;
      return { status: response.status, data };
    };
  }
  try {
    const anon = client(),
      admin = client(),
      alice = client(),
      bob = client();
    assert.equal((await anon('/settings/hours')).status, 401);
    assert.equal((await anon('/leaves')).status, 401);
    assert.equal(
      (await anon('/login', 'POST', { email: 'employee1@attendiq.local', password: 'wrong' }))
        .status,
      401,
    );
    const login = (email) => ({ email, password: 'Review@2026!' });
    assert.equal(
      (await admin('/login', 'POST', login('admin@attendiq.local'))).data.user.role,
      'Admin',
    );
    assert.equal(
      (await alice('/login', 'POST', login('employee1@attendiq.local'))).data.user.role,
      'Employee',
    );
    await bob('/login', 'POST', login('employee2@attendiq.local'));
    const hours = {
      dutyStart: '09:00',
      dutyEnd: '18:00',
      tiffinStart: '13:00',
      tiffinEnd: '13:45',
    };
    assert.equal((await alice('/settings/hours')).status, 403);
    assert.equal((await alice('/settings/hours', 'PUT', hours)).status, 403);
    assert.deepEqual((await admin('/settings/hours')).data, {
      dutyStart: '09:30',
      dutyEnd: '18:30',
      tiffinStart: '13:00',
      tiffinEnd: '13:30',
    });
    assert.equal(
      (await admin('/settings/hours', 'PUT', hours, { 'X-Leave-CSRF': 'invalid' })).status,
      403,
    );
    for (const invalid of [
      { ...hours, dutyStart: '' },
      { ...hours, dutyStart: '24:00' },
      { ...hours, dutyEnd: '08:00' },
      { ...hours, tiffinEnd: '13:00' },
      { ...hours, tiffinStart: '08:30' },
      { ...hours, tiffinEnd: '19:00' },
      { ...hours, tiffinStart: '09:00', tiffinEnd: '18:00' },
    ])
      assert.equal((await admin('/settings/hours', 'PUT', invalid)).status, 400);
    assert.equal((await admin('/settings/hours', 'PUT', hours)).status, 200);
    assert.deepEqual((await admin('/settings/hours')).data, hours);
    assert.deepEqual(
      JSON.parse(await readFile(join(storage, 'config.json'), 'utf8')).workHours,
      hours,
    );
    assert.equal(
      (
        await alice(
          '/leaves',
          'POST',
          { type: 'SL', date: '2026-11-01', days: 1 },
          { 'X-Leave-CSRF': 'forged' },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await alice(
          '/leaves',
          'POST',
          { type: 'SL', date: '2026-11-01', days: 1 },
          { Origin: 'http://untrusted.example' },
        )
      ).status,
      403,
    );
    assert.equal((await alice('/session')).data.user.passwordHash, undefined);
    assert.deepEqual(
      (await alice('/leaves?year=2026')).data.balances.map((b) => b.available),
      [10, 10],
    );
    assert.equal((await alice('/settings')).status, 403);
    assert.equal((await alice('/settings', 'PUT', { year: 2026, SL: 99, CL: 99 })).status, 403);
    for (const body of [
      { type: 'XX', date: '2026-11-01', days: 1 },
      { type: 'SL', date: '2026-02-30', days: 1 },
      { type: 'SL', date: '2026-11-01', days: 0.5 },
      { type: 'SL', date: '2026-12-31', days: 2 },
      { type: 'SL', date: '2026-11-01', days: 11 },
    ])
      assert.equal((await alice('/leaves', 'POST', body)).status, 400);
    assert.equal(
      (
        await alice('/leaves', 'POST', {
          type: 'SL',
          date: '2026-11-01',
          days: 2,
          employeeId: 'emp-002',
        })
      ).status,
      400,
    );
    const created = await alice('/leaves', 'POST', {
      type: 'SL',
      date: '2026-11-01',
      days: 2,
      reason: 'Medical rest',
    });
    assert.equal(created.status, 201);
    const id = created.data.application.id;
    assert.equal(created.data.application.employeeId, 'emp-001');
    assert.equal(created.data.application.status, 'Pending');
    assert.equal((await alice('/leaves?year=2026')).data.balances[0].available, 10);
    assert.equal(
      (await alice('/leaves', 'POST', { type: 'CL', date: '2026-11-02', days: 1 })).status,
      409,
    );
    assert.equal((await bob('/leaves?year=2026&employeeId=emp-001')).data.applications.length, 0);
    assert.equal((await bob(`/leaves/${id}/decision`, 'POST', { status: 'Approved' })).status, 403);
    assert.equal((await admin('/leaves?year=2026')).data.applications.length, 1);
    assert.equal(
      (await admin(`/leaves/${id}/decision`, 'POST', { status: 'Approved' })).status,
      200,
    );
    assert.equal(
      (await admin(`/leaves/${id}/decision`, 'POST', { status: 'Rejected' })).status,
      409,
    );
    assert.equal((await alice('/leaves?year=2026')).data.balances[0].available, 8);
    assert.equal((await admin('/settings', 'PUT', { year: 2026, SL: 1, CL: 10 })).status, 409);
    assert.equal((await admin('/settings', 'PUT', { year: 2026, SL: 12, CL: 14 })).status, 200);
    assert.equal((await alice('/leaves?year=2026')).data.balances[0].available, 10);
    const pending = await alice('/leaves', 'POST', { type: 'SL', date: '2026-11-10', days: 7 });
    const other = await alice('/leaves', 'POST', { type: 'SL', date: '2026-11-20', days: 7 });
    const decisions = await Promise.all(
      [pending, other].map((r) =>
        admin(`/leaves/${r.data.application.id}/decision`, 'POST', { status: 'Approved' }),
      ),
    );
    assert.deepEqual(decisions.map((r) => r.status).sort(), [200, 409]);
    const rejectedId = [pending, other][decisions.findIndex((r) => r.status === 409)].data
      .application.id;
    assert.equal(
      (await admin(`/leaves/${rejectedId}/decision`, 'POST', { status: 'Rejected' })).status,
      200,
    );
    assert.equal(
      (await bob('/leaves', 'POST', { type: 'CL', date: '2026-11-03', days: 1 })).status,
      201,
    );
    await new Promise((resolve) => server.close(resolve));
    base = await start();
    await admin('/login', 'POST', login('admin@attendiq.local'));
    assert.deepEqual((await admin('/settings/hours')).data, hours);
    await alice('/login', 'POST', login('employee1@attendiq.local'));
    const restored = (await alice('/leaves?year=2026')).data;
    assert.equal(restored.applications.length, 3);
    assert.equal(restored.balances[0].available, 3);
    assert.equal(restored.balances[1].allowance, 14);
    assert.equal((await alice('/leaves?year=2027')).data.balances[0].allowance, 10);
    assert.equal((await alice('/logout', 'POST', {})).status, 200);
    assert.equal((await alice('/leaves')).status, 401);
  } finally {
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
    await rm(storage, { recursive: true, force: true });
  }
});
