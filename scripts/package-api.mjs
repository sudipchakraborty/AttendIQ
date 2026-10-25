import { access, cp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
await access('server/vendor/autoload.php').catch(() => {
  throw new Error('Install PHP dependencies first: composer install --working-dir=server');
});
const destination = 'dist/api';
await mkdir(destination, { recursive: true });
for (const item of ['src', 'vendor', 'seed.php'])
  await cp(join('server', item), join(destination, item), { recursive: true });
await writeFile(
  join(destination, 'index.php'),
  "<?php\ndeclare(strict_types=1);\nrequire __DIR__ . '/src/bootstrap.php';\n\\AttendIQ\\serve();\n",
);
await writeFile(
  join(destination, '.htaccess'),
  `Options -Indexes
<FilesMatch "^(?!index\\.php$)">
  Require all denied
</FilesMatch>
`,
);
console.log(
  'Packaged PHP API and dependencies into dist/api. Private data and SMTP configuration are excluded.',
);
