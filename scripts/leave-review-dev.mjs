import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createLeaveReviewServer } from './leave-review-server.mjs';

const testing = process.argv.includes('--test');
const storage = testing
  ? await mkdtemp(join(tmpdir(), 'attendiq-leave-browser-'))
  : resolve(process.env.ATTENDIQ_LEAVE_STORAGE || '.attendiq/leave-review');
const apiPort = testing ? 8012 : Number(process.env.ATTENDIQ_LEAVE_PORT || 8011);
const port = testing ? 5181 : Number(process.env.ATTENDIQ_LEAVE_FRONTEND_PORT || 5173);
const server = await createLeaveReviewServer({ storage });
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(apiPort, '127.0.0.1', resolve);
});
console.log(
  `Local JSON leave review: http://localhost:${port}/#/leave\nStorage: ${storage}\nNo Contabo services are used.`,
);
const child = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  {
    stdio: 'inherit',
    windowsHide: true,
    env: {
      ...process.env,
      VITE_LEAVE_REVIEW: 'true',
      ATTENDIQ_LEAVE_API_TARGET: `http://127.0.0.1:${apiPort}`,
    },
  },
);
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  child.kill();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  if (testing) await rm(storage, { recursive: true, force: true });
  process.exitCode = code;
}
child.on('error', (error) => {
  console.error(error);
  void stop(1);
});
child.on('exit', (code) => void stop(code || 0));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => void stop());
