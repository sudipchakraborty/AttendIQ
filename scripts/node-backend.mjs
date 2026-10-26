import { resolve, join } from 'node:path';
import { readFile, writeFile, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
export const backendDirectory = resolve(process.env.ATTENDIQ_BACKEND_DIR || '../AttendIQ_BackEnd');
export async function legacyDefaults() {
  const source = await readFile('server/seed.php', 'utf8');
  const values = [...source.matchAll(/base64_decode\('([^']+)'\)/g)].map((m) =>
    Buffer.from(m[1], 'base64').toString('utf8'),
  );
  if (values.length !== 2) throw new Error('Cannot read legacy defaults for migration.');
  const [attendance, salary] = values;
  const rates = salary
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const m = /^(.+?)\s+([\d,.]+)$/.exec(line.trim());
      return m ? { name: m[1].trim(), amount: Number(m[2].replaceAll(',', '')) } : null;
    })
    .filter(Boolean);
  const employees = [],
    matched = new Set();
  let maxId = 0;
  for (const line of attendance.trim().split(/\r?\n/).slice(1)) {
    const fields = line.split('\t');
    if (fields.length !== 6) continue;
    const id = fields[2];
    maxId = Math.max(maxId, Number(id));
    if (employees.some((e) => e.id === id)) continue;
    const name = fields[3]
      .trim()
      .replace(/\s*\d+$/, '')
      .trim();
    const rate = name && rates.find((r) => r.name.toUpperCase() === name.toUpperCase());
    if (rate) matched.add(rate.name.toUpperCase());
    employees.push({
      id,
      name: name || `Unnamed employee (ID ${id})`,
      email: '',
      monthlySalary: rate ? rate.amount : null,
      archived: false,
      version: 1,
    });
  }
  for (const r of rates)
    if (!matched.has(r.name.toUpperCase()))
      employees.push({
        id: String(++maxId),
        name: r.name,
        email: '',
        monthlySalary: r.amount,
        archived: false,
        version: 1,
      });
  return {
    attendance,
    state: { revision: 1, employees, users: [], audit: [], tickets: [], limits: {} },
  };
}
export async function initializeNodeStorage(directory, useExisting = false) {
  if (
    await access(join(directory, 'attendiq.sqlite')).then(
      () => true,
      () => false,
    )
  )
    return;
  const { attendance, state } = await legacyDefaults();
  const source = useExisting
    ? await readFile('.attendiq/state.json', 'utf8').catch((error) => {
        if (error.code === 'ENOENT') return JSON.stringify(state);
        throw error;
      })
    : JSON.stringify(state);
  await writeFile(join(directory, 'migration-state.json'), source, { mode: 0o600 });
  await writeFile(join(directory, 'migration-attendance.txt'), attendance, { mode: 0o600 });
  await new Promise((done, reject) => {
    const child = spawn(
      process.execPath,
      [
        '--import',
        'tsx',
        'scripts/import-php.ts',
        join(directory, 'migration-state.json'),
        join(directory, 'migration-attendance.txt'),
        directory,
      ],
      { cwd: backendDirectory, windowsHide: true, stdio: 'inherit' },
    );
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? done() : reject(new Error('Node storage initialization failed.')),
    );
  });
}
export function startNodeBackend(directory, port, extraEnv = {}) {
  return spawn(
    process.execPath,
    ['--env-file-if-exists=.env', '--import', 'tsx', 'src/server.ts'],
    {
      cwd: backendDirectory,
      windowsHide: true,
      stdio: ['ignore', 'inherit', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'development',
        ATTENDIQ_STORAGE: directory,
        PORT: String(port),
        HOST: '127.0.0.1',
        ...extraEnv,
      },
    },
  );
}
