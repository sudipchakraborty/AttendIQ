import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { phpBinary } from './php-runtime.mjs';
const binary = phpBinary();
async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'vendor') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await check(path);
    else if (entry.name.endsWith('.php')) {
      const result = spawnSync(binary, ['-l', path], { encoding: 'utf8', windowsHide: true });
      if (result.status !== 0) throw new Error(result.stdout + result.stderr);
    }
  }
}
await check('server');
console.log('PHP syntax checks passed.');
