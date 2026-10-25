import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
export function phpBinary() {
  const candidates = [
    process.env.PHP_BINARY,
    'php',
    process.env.LOCALAPPDATA &&
      join(process.env.LOCALAPPDATA, 'AttendIQ', 'tools', 'php', 'php.exe'),
  ].filter(Boolean);
  for (const candidate of candidates)
    if (spawnSync(candidate, ['-v'], { windowsHide: true, stdio: 'ignore' }).status === 0)
      return candidate;
  throw new Error('PHP 8.2+ is required. Install PHP or set PHP_BINARY to its executable.');
}
