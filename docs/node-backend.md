# Node.js backend integration

The backend now lives in the sibling [AttendIQ_BackEnd repository](https://github.com/sudipchakraborty/AttendIQ_BackEnd). Use Node.js 24 LTS and run `npm ci` in both checkouts, then run `npm run dev:all` here. `ATTENDIQ_BACKEND_DIR` overrides the sibling directory. Vite proxies `/api` to port 8000 locally. First startup imports existing `.attendiq/state.json` and legacy attendance defaults into the backend's private SQLite directory without modifying the PHP files. Existing PHP accounts retain their passwords; sessions require a new login. A first installation with no accounts uses the private setup token from the backend storage directory.

`npm run test:api` runs Node backend tests; `npm run test:api:php` retains the old PHP suite for rollback investigation. `npm run test:e2e` starts an isolated Node backend and local SMTP fixture. On this Windows computer, use `$env:PLAYWRIGHT_CHANNEL='chrome'` for the installed browser, or install the Playwright Chromium runtime. Tests never use production accounts or SMTP.

## Production

The API is hosted on Contabo at `https://socket.sukalyanai.com:9443` in a dedicated service environment. The production frontend remains on Hostinger. `npm run build` packages a small PHP cURL gateway as `dist/api/index.php`, with no API business logic, database, employee defaults, SMTP credentials, or server dependencies. PHP 8.2+ and cURL are required on the frontend host. The gateway validates TLS to the fixed upstream and forwards only the AttendIQ cookie and CSRF token. Browsers use same-origin secure cookies.

For per-client throttling, the gateway signs the client's source IP and a timestamp with a shared random secret. Contabo accepts forwarded identity only with a valid signature less than 60 seconds old. Set `ATTENDIQ_GATEWAY_SECRET` privately on Contabo and as the encrypted frontend GitHub Actions secret of the same name. The build writes the secret into a PHP configuration file denied by the packaged `.htaccess`; it is never included in browser JavaScript or Git. Keep the frontend host configured to execute PHP and enforce `.htaccess`. Local builds without the secret are suitable for Vite proxy previews; the packaged production gateway reports an explicit configuration error until the secret is present.

The existing GitHub Actions workflow builds the backend-compatible frontend, runs API and browser tests, and uploads `dist/` using the existing FTPS credentials. It does not overwrite Contabo data. Old PHP API files on Hostinger are not deleted automatically; the new gateway entrypoint replaces their execution. Preserve any private PHP production data before switching a live site. Do not assume local migration includes production accounts that exist only on Hostinger.

Support SMTP remains unconfigured in production. Requests correctly report delivery failure until configured privately on Contabo.
