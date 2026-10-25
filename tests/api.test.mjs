import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';
import { phpBinary } from '../scripts/php-runtime.mjs';

async function freePort() {
  const socket = net.createServer();
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}
test('PHP API: file persistence, RBAC, login, CSRF, stale writes and support SMTP', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'attendiq-api-'));
  const port = await freePort(),
    config = join(directory, 'config.php');
  await writeFile(config, '<?php return [];');
  const php = spawn(
    phpBinary(),
    ['-S', `127.0.0.1:${port}`, '-t', 'server/public', 'server/router.php'],
    {
      windowsHide: true,
      env: { ...process.env, ATTENDIQ_STORAGE: directory, ATTENDIQ_CONFIG: config },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let logs = '';
  php.stderr.on('data', (chunk) => {
    logs += chunk;
  });
  const base = `http://127.0.0.1:${port}/api/index.php?route=`;
  function client() {
    let cookie = '',
      csrf = '';
    return async (route, method = 'GET', body, omitToken = false) => {
      const response = await fetch(base + encodeURIComponent(route), {
        method,
        headers: {
          Cookie: cookie,
          ...(method === 'GET'
            ? {}
            : { 'Content-Type': 'application/json', 'X-CSRF-Token': omitToken ? '' : csrf }),
        },
        body: method === 'GET' ? undefined : JSON.stringify(body || {}),
      });
      const header = response.headers.get('set-cookie');
      if (header) cookie = header.split(';')[0];
      const data = await response.json();
      if (data.csrfToken) csrf = data.csrfToken;
      return { status: response.status, data, header };
    };
  }
  const admin = client(),
    viewer = client(),
    hr = client();
  try {
    let started = false;
    for (let i = 0; i < 80; i++) {
      try {
        if ((await admin('/auth/session')).status === 200) {
          started = true;
          break;
        }
      } catch {
        /* Wait for PHP listener. */
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(started, logs);
    const oversized = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify({ message: 'x'.repeat(33000) })),
        );
        controller.close();
      },
    });
    const rejected = await fetch(base + encodeURIComponent('/support'), {
      method: 'POST',
      body: oversized,
      duplex: 'half',
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(
      rejected.status,
      413,
      'Actual body size must be limited even without Content-Length',
    );
    assert.equal((await admin('/employees')).status, 401);
    const token = (await readFile(join(directory, 'setup-token.txt'), 'utf8')).trim();
    const owner = {
      token,
      name: 'API Test Owner',
      email: 'owner@example.test',
      password: 'TestOnly-Secret-143!',
    };
    assert.equal((await admin('/auth/setup', 'POST', owner, true)).status, 419);
    assert.equal((await admin('/auth/setup', 'POST', { ...owner, token: 'wrong' })).status, 403);
    const session = await admin('/auth/setup', 'POST', owner);
    assert.equal(session.status, 200, JSON.stringify(session.data));
    assert.match(session.header, /HttpOnly/i);
    assert.match(session.header, /SameSite=Strict/i);
    assert.equal((await admin('/auth/setup', 'POST', owner)).status, 409);
    const ownerUser = session.data.user;
    assert.equal(
      (await admin(`/users/${ownerUser.id}`, 'PUT', { version: 1, role: 'Viewer' })).status,
      409,
    );
    const newEmployee = await admin('/employees', 'POST', {
      id: '99',
      name: 'Test Employee',
      email: 'employee@example.test',
    });
    assert.equal(newEmployee.status, 200);
    assert.equal(
      (await admin('/salaries/99', 'PUT', { version: 1, monthlySalary: 12345.67 })).status,
      200,
    );
    assert.match(await readFile(join(directory, 'Salary.txt'), 'utf8'), /Test Employee\t12345\.67/);
    assert.equal((await admin('/employees/99', 'PUT', { version: 1, name: 'Stale' })).status, 409);
    assert.equal(
      (await admin('/employees/99', 'PUT', { version: 2, name: 'Renamed Employee', email: '' }))
        .status,
      200,
    );
    assert.match(
      await readFile(join(directory, 'Salary.txt'), 'utf8'),
      /Renamed Employee\t12345\.67/,
    );
    assert.ok(
      JSON.parse(await readFile(join(directory, 'employees.json'), 'utf8')).some(
        (e) => e.id === '99' && e.name === 'Renamed Employee',
      ),
    );
    assert.equal((await admin('/employees/99', 'DELETE', { version: 3 })).status, 200);
    assert.ok(!(await admin('/defaults')).data.employees.some((e) => e.id === '99'));
    assert.ok(
      !(await readFile(join(directory, 'Salary.txt'), 'utf8')).includes('Renamed Employee'),
    );
    assert.equal(
      (
        await admin('/employees/99', 'PUT', {
          version: 4,
          archived: false,
          name: 'Renamed Employee',
        })
      ).status,
      200,
    );
    assert.ok((await admin('/defaults')).data.employees.some((e) => e.id === '99'));
    assert.equal(
      (await admin('/salaries/99', 'PUT', { version: 5, monthlySalary: -1 })).status,
      422,
    );
    const viewerUser = await admin('/users', 'POST', {
      name: 'Test Viewer',
      email: 'viewer@example.test',
      role: 'Viewer',
      password: owner.password,
    });
    assert.equal(viewerUser.status, 200);
    await viewer('/auth/session');
    assert.equal(
      (
        await viewer('/auth/login', 'POST', {
          email: 'viewer@example.test',
          password: owner.password,
        })
      ).status,
      200,
    );
    assert.equal((await viewer('/defaults')).status, 200);
    assert.ok(!('email' in (await viewer('/defaults')).data.employees[0]));
    assert.equal((await viewer('/employees')).status, 403);
    assert.equal(
      (await viewer('/salaries/99', 'PUT', { version: 5, monthlySalary: 1 })).status,
      403,
    );
    assert.equal((await viewer('/users')).status, 403);
    assert.equal((await viewer('/employees', 'POST', { name: 'Forbidden' }, true)).status, 419);
    await admin('/users', 'POST', {
      name: 'Test HR',
      email: 'hr@example.test',
      role: 'HR',
      password: owner.password,
    });
    await hr('/auth/session');
    await hr('/auth/login', 'POST', { email: 'hr@example.test', password: owner.password });
    assert.equal((await hr('/employees')).status, 200);
    assert.equal((await hr('/users')).status, 403);
    assert.equal(
      (await admin(`/users/${viewerUser.data.user.id}`, 'PUT', { version: 1, active: false }))
        .status,
      200,
    );
    assert.equal((await viewer('/defaults')).status, 401);
    const missingSmtp = await admin('/support', 'POST', {
      subject: 'SMTP test',
      message: 'This is an isolated API test message.',
    });
    assert.equal(missingSmtp.status, 503);
    assert.equal(
      JSON.parse(await readFile(join(directory, 'state.json'), 'utf8')).tickets.at(-1).status,
      'failed',
    );
    const messages = [];
    const smtp = net.createServer((socket) => {
      socket.write('220 local-test ESMTP\r\n');
      let buffer = '',
        data = false,
        content = '';
      socket.on('data', (chunk) => {
        buffer += chunk.toString();
        while (buffer.includes('\r\n')) {
          const index = buffer.indexOf('\r\n'),
            line = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          if (data) {
            if (line === '.') {
              messages.push(content);
              data = false;
              socket.write('250 accepted\r\n');
            } else content += line + '\n';
          } else if (/^(EHLO|HELO)/i.test(line)) socket.write('250 local-test\r\n');
          else if (/^DATA/i.test(line)) {
            data = true;
            socket.write('354 send data\r\n');
          } else if (/^QUIT/i.test(line)) socket.end('221 bye\r\n');
          else socket.write('250 ok\r\n');
        }
      });
    });
    await new Promise((resolve) => smtp.listen(0, '127.0.0.1', resolve));
    try {
      await writeFile(
        config,
        `<?php return ['smtp'=>['host'=>'127.0.0.1','port'=>${smtp.address().port},'encryption'=>'','from'=>'support@example.test']];`,
      );
      const sent = await admin('/support', 'POST', {
        subject: 'Local transport test',
        message: 'This message must only reach the local test SMTP receiver.',
      });
      assert.equal(sent.status, 200, JSON.stringify(sent.data));
      assert.equal(sent.data.status, 'accepted');
      assert.match(messages[0], /info@niyanti\.com/);
      assert.match(messages[0], /owner@example\.test/);
    } finally {
      await new Promise((resolve) => smtp.close(resolve));
    }
    const stateText = await readFile(join(directory, 'state.json'), 'utf8');
    assert.ok(!stateText.includes(owner.password));
    assert.equal((await admin('/auth/logout', 'POST')).status, 200);
    assert.equal((await admin('/employees')).status, 401);
    console.log(
      'PHP integration verified: saved employee/salary files, stale-write protection, archives, role bypass denial, CSRF, session revocation, last admin, SMTP failure and local acceptance.',
    );
  } catch (error) {
    console.error(logs.slice(-3000));
    throw error;
  } finally {
    php.kill();
  }
});
