import { spawn } from 'node:child_process';
import { backendDirectory } from './node-backend.mjs';
const child = spawn(process.execPath, ['--import', 'tsx', '--test', 'tests/*.test.ts'], {
  cwd: backendDirectory,
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code || 0;
});
