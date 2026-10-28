import { cp, mkdir, writeFile } from 'node:fs/promises';
if (process.env.VITE_STANDALONE !== 'false') {
  console.log('Standalone calculator build: no API gateway or private data packaged.');
  process.exit(0);
}
const destination = 'dist/api';
await mkdir(destination, { recursive: true });
await cp('server/gateway.php', `${destination}/index.php`);
const gatewaySecret = process.env.ATTENDIQ_GATEWAY_SECRET || '';
if (gatewaySecret && !/^[a-f0-9]{64}$/.test(gatewaySecret))
  throw new Error('Invalid ATTENDIQ_GATEWAY_SECRET.');
await writeFile(`${destination}/.gateway-config.php`, `<?php\nreturn '${gatewaySecret}';\n`, {
  mode: 0o600,
});
await writeFile(
  `${destination}/.htaccess`,
  `Options -Indexes
<FilesMatch "^(?!index\\.php$)">
  Require all denied
</FilesMatch>
`,
);
console.log(
  'Packaged the same-origin Node.js API gateway into dist/api. No business logic or private data is deployed to the frontend host.',
);
