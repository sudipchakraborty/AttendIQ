import { spawn } from 'node:child_process';
import { phpBinary } from './php-runtime.mjs';
const child = spawn(
  phpBinary(),
  ['-S', '127.0.0.1:8000', '-t', 'server/public', 'server/router.php'],
  { stdio: 'inherit', windowsHide: true },
);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill());
child.on('exit', (code) => process.exit(code || 0));
