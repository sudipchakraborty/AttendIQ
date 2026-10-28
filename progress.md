# Frontend progress

## 2026-10-28 — frontend-only attendance and leave calculator

- Published code commit `353cd51`; Hostinger deployment run `40666061901` completed successfully, including both browser suites and formatting.
- Live Chrome verification at https://attendiq.drsudip.com/ passed: old login link opens calculator, a synthetic attendance upload generates the employee report and leave breakdown, and no API requests occur. The test upload existed only in browser memory.

- User requested cloud access without the unavailable backend. Added `src/app/runtime.ts`: standalone mode is the default; build/start with `VITE_STANDALONE=false` to restore connected login/API mode.
- AuthProvider supplies a report-only browser workspace with no session request. Attendance/Reports remain accessible from old login links; backend management navigation and sign-out are hidden. Connected permissions and login remain available when explicitly enabled.
- Added reusable, documented `loadLocalSources` in `src/features/payroll/localSources.ts`. Attendance TXT upload is required, salary TXT optional, holidays may be entered or uploaded as TXT/CSV. Inputs remain in browser memory and clear on refresh; no sample employee/salary data is bundled. Existing calculation policy is unchanged: Leave means configured holidays, not an employee leave approval system.
- Updated reusable FileUpload badges/default hints, setup text, and sidebar privacy message to describe actual standalone behavior.
- Static production builds omit the PHP gateway. Updated deployment workflow to build standalone mode without a gateway secret; connected API/browser regressions still run in isolation. Added standalone Playwright config, npm script, production browser tests, and README setup/rollback instructions. Browser suites use separate artifact directories.
- Verification: frontend lint, 19 unit tests, TypeScript/production build passed. Both standalone production-browser tests passed with API access blocked (login redirect, missing attendance validation, holidays/pay/CSV, optional salary, and refresh clearing uploads). Six connected browser tests passed; login regression passed on rerun after resolving a shared test-artifact directory collision.
- Formatting passed with Windows line endings accepted (`prettier --check . --end-of-line auto`); Linux CI uses repository LF line endings. `dist/api` is absent and artifact scan found no bundled legacy employee sample names.

## 2026-10-28 — Contabo connectivity follow-up

- User provided server access for diagnosis. SSH on standard port 22 timed out before authentication; no credentials were saved in project files.
- Confirmed socket.sukalyanai.com resolves to the supplied server IP. TCP 80/443 connect; TCP 22/9443 do not connect from this environment. Existing HTTPS listener responds with nginx/Ubuntu and 404 for /ready; it is not evidence that AttendIQ is running.
- Requested custom SSH port or console listener/firewall/service output. No production configuration changed; gateway issue remains unresolved.

## 2026-10-28 — cloud API availability investigation

- Reproduced live failure: https://attendiq.drsudip.com/api/index.php?route=%2Fauth%2Fsession returns HTTP 502 with the gateway's Node API unavailable message.
- Reviewed PHP gateway: this response means the upstream request failed, had no valid HTTP status, or returned non-JSON. Missing PHP cURL or gateway-secret configuration has separate 503 messages; these were not observed.
- Direct requests to configured upstream https://socket.sukalyanai.com:9443/ready and /api/auth/session timed out after 20 seconds from this execution environment. Exact server-side cause remains unconfirmed.
- Development bypass is local only. Frontend deployment does not deploy the Node backend. No application behavior changed during this investigation; requested Contabo service/log diagnostics or an SSH connection to continue.

## 2026-10-28 — commit and push preparation

- Reviewed pending changes and fetched origin; local main matched origin/main before committing.
- Removed incidental npm lockfile metadata changes from dependency installation; dependency versions remain unchanged.
- Prepared the development login launcher, access indicator, Midnight Blue default, regression tests, and progress history for commit and push to origin/main as requested.
- Final checks: 19 tests passed, TypeScript and lint passed, changed-file formatting passed after normalizing three theme files. Git whitespace checks passed.

## 2026-10-28 — Midnight Blue default

- Set shared `DEFAULT_THEME` to `midnight` in `src/theme/preferences.ts` with a Doxygen comment; both preference-reader and provider storage-access fallback use it.
- First-time visitors, invalid preferences, and unavailable storage now use Midnight Blue. Valid saved Pearl Light, Graphite Dark, and Midnight Blue selections remain respected; preferences are browser-local rather than per-account.
- Updated existing preference regression assertions. Verification: all 19 frontend tests and TypeScript check passed.

## 2026-10-28 — temporary local login bypass

- User requested skipping login during development. `scripts/api-dev.mjs` now enables `ATTENDIQ_DEV_AUTH_BYPASS=1` by default for the local backend. Set `$env:ATTENDIQ_DEV_AUTH_BYPASS='0'` before `npm run dev:all` and restart to restore login.
- `AuthProvider` accepts the backend's `developmentBypass` flag; the existing session flow automatically enters the workspace. `AppShell` shows disabled “Development access” in place of Sign out, since bypass mode automatically grants access on every request.
- Local combined launcher binds Vite to 127.0.0.1. Production builds do not enable the bypass; backend configuration requires explicit development mode.
- Updated `.env.example` with the switch. No development password or persistent account created.
- Verification: frontend lint and TypeScript/production frontend build passed. Chrome smoke test against the running app verified no login screen, a developer Admin session, and successful Employees navigation. Normal authenticated login browser regression passed with bypass disabled.
- Restarted local app at http://127.0.0.1:5173/ with backend on 8000. Refresh an existing tab to enter directly.

## 2026-10-28 — development review

- Installed npm dependencies for local testing.
- Login fields already require email/password; protected routes redirect anonymous users to login. Existing sessions automatically enter the workspace.
- Existing Admin/HR/Viewer permissions are already integrated; no RBAC changes made.
- `npm run dev:all` starts the sibling Node backend on port 8000 and Vite on port 5173. The standalone backend default is 3201, so `npm run dev` alone needs the API running on 8000 or `ATTENDIQ_API_TARGET` configured.
- Added `tests/login.spec.ts` with a Doxygen-style description: empty browser submissions send no login request; missing, empty, and null API credentials are rejected and protected data stays inaccessible.
- Verification: 19 unit tests passed; lint, TypeScript/production build passed; all 6 existing Chrome browser tests and the new login regression passed (7 total). New test formatting and lint passed.
- Started `npm run dev:all` for manual testing at http://localhost:5173/; confirmed HTTP 200, anonymous session user=null, setupRequired=true, and backend /ready reports ready on port 8000.
- First local startup imported 7 legacy sample employees and no accounts. Create the first administrator using the private `../AttendIQ_BackEnd/.attendiq/setup-token.txt` file. No development account or login bypass was introduced.
- Initial sandboxed tests could not access Windows user information; tests passed when rerun outside the sandbox.
