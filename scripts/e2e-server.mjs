import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';
import { phpBinary } from './php-runtime.mjs';
const directory = await mkdtemp(join(tmpdir(), 'attendiq-browser-'));
const smtp = net.createServer((socket) => {
  socket.write('220 local-browser-test ESMTP\r\n');
  let buffer = '',
    inData = false;
  socket.on('data', (chunk) => {
    buffer += chunk;
    while (buffer.includes('\r\n')) {
      const index = buffer.indexOf('\r\n'),
        line = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      if (inData) {
        if (line === '.') {
          inData = false;
          socket.write('250 accepted\r\n');
        }
      } else if (/^DATA/i.test(line)) {
        inData = true;
        socket.write('354 continue\r\n');
      } else if (/^QUIT/i.test(line)) socket.end('221 bye\r\n');
      else socket.write('250 local-browser-test\r\n');
    }
  });
});
await new Promise((resolve) => smtp.listen(0, '127.0.0.1', resolve));
const config = join(directory, 'config.php');
await writeFile(
  config,
  `<?php return ['smtp'=>['host'=>'127.0.0.1','port'=>${smtp.address().port},'encryption'=>'','from'=>'support@example.test']];`,
);
const php = spawn(
  phpBinary(),
  ['-S', '127.0.0.1:8001', '-t', 'server/public', 'server/router.php'],
  {
    windowsHide: true,
    stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, ATTENDIQ_STORAGE: directory, ATTENDIQ_CONFIG: config },
  },
);
let phpLogs = '';
php.stderr.on('data', (data) => {
  phpLogs += data;
});
let cookie = '',
  csrf = '';
async function request(route, body) {
  const response = await fetch(
    'http://127.0.0.1:8001/api/index.php?route=' + encodeURIComponent(route),
    {
      method: body ? 'POST' : 'GET',
      headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  const header = response.headers.get('set-cookie');
  if (header) cookie = header.split(';')[0];
  const result = await response.json();
  if (result.csrfToken) csrf = result.csrfToken;
  if (!response.ok) throw new Error(JSON.stringify(result));
  return result;
}
let vite;
const stop = () => {
  php.kill();
  vite?.kill();
  smtp.close();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
process.on('exit', stop);
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      await request('/auth/session');
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  if (!ready) throw new Error(phpLogs);
  const token = (await readFile(join(directory, 'setup-token.txt'), 'utf8')).trim();
  const password = 'BrowserTest-Only-932!';
  await request('/auth/setup', {
    token,
    name: 'Browser Admin',
    email: 'admin@example.test',
    password,
  });
  for (const role of ['HR', 'Viewer'])
    await request('/users', {
      name: `Browser ${role}`,
      email: `${role.toLowerCase()}@example.test`,
      password,
      role,
    });
  vite = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5175', '--strictPort'],
    {
      windowsHide: true,
      stdio: 'inherit',
      env: { ...process.env, ATTENDIQ_API_TARGET: 'http://127.0.0.1:8001' },
    },
  );
  vite.on('exit', (code) => {
    stop();
    process.exitCode = code || 0;
  });
} catch (error) {
  stop();
  throw error;
}
