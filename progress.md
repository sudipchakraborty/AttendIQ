# Frontend progress

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
