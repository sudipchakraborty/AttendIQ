# AttendIQ

## Current mode: standalone calculator

The default build opens without login and requires no backend. Run `npm ci` and `npm run dev` with Node.js 24.15+; upload an attendance TXT file, optionally upload salary TXT, and configure weekly leave, holidays, office hours, and dates. Reports and CSV exports are calculated in browser memory. No employee defaults are published; uploads clear on refresh. “Leave” in the report means configured holidays, as in the existing calculation policy.

`npm run build` produces a static `dist/` without the PHP API gateway. `npm run test:standalone` tests that built output with API access blocked. Set `VITE_STANDALONE=false` at build/start time to restore the connected login and management workspace. Its API and deployment requirements below apply only in connected mode.

The active API is the dedicated Node.js backend on Contabo. See [Node backend setup and deployment](docs/node-backend.md) for current instructions; PHP API sections below describe the legacy backend.

A React 19 + TypeScript attendance workspace built with Vite, Material UI, Emotion, and React Router. Includes three coordinated themes: Pearl Light, Graphite Dark, and Midnight Blue.

## Frontend structure

- `src/app/`: application shell, hash routes, and shared workspace state.
- `src/features/attendance/`: report setup, file upload, and holiday editor.
- `src/features/payroll/`: typed calculation engine, file readers, employee report hook, attendance table, and salary summary.
- `src/theme/`: centralized Material UI palettes, theme provider, and safe preference persistence.
- `src/shared/`: reusable card, theme picker, and display formatting.
- `tests/`: browser regressions for themes, uploads, cutoff, CSV totals, and mobile layouts.

Use the header's theme selector on either page. Selection persists locally; disabled browser storage still permits session-only switching. Material UI tokens cover the complete interface, native date/time control color schemes follow the selected theme, and the Inter font is bundled locally. Report UI is lazy-loaded with separate React and Material UI vendor chunks.

## Run locally

```sh
npm ci
npm run dev
```

Use Node.js 22.13 or later. Open the URL printed by Vite. `npm run build` creates the production files in `dist`.

The setup page supports attendance and salary text uploads, date ranges, weekly leave, editable holiday dates and purposes, office hours, and a tiffin break. Each missing upload independently falls back to `src/assets/Attendance.TXT` or `src/assets/Salary.txt`. Press Report to parse the files and open `#/report`. Each employee has a separate named tab with daily attendance, salary allocations, review flags, a salary total, and an employee-specific CSV download. Weekly, Monthly, Yearly, and Custom periods are supported. Back to setup retains the form and selected files; refreshing uses the bundled files. Hash routes support static hosting in subfolders.

Attendance input is the supplied tab-separated device format: `No`, `TMNo`, `EnNo`, `Name GMNo`, `Mode`, `DateTime` (`YYYY/MM/DD HH:mm:ss`). Salary text contains one employee name and monthly amount per line, separated by whitespace. Other upload formats are rejected explicitly. Salaries match names ignoring case and extra spaces; unnamed device IDs remain unmatched. Salary-only employees still receive a tab. The bundled attendance file has 279 punches spanning December 2019 to September 2025; when the selected period has no punches for an employee, the report opens their first recorded month. A Recorded month selector lists the months present in that employee's log. Explicit date controls remain available; employees without punches show a warning.

Salary policy: earned salary = recorded worked hours multiplied by the employee's monthly salary divided by that month's scheduled working hours. Scheduled hours use office end minus office start minus configured tiffin, multiplied by calendar workdays excluding weekly leave and holidays. Each month in a multi-month report has its own rate. Each paired work interval is capped at the configured office end time before tiffin deductions and salary calculation. Actual exit punches remain visible. Work entirely after office end earns zero. Work before the cutoff, including work on days off, uses the same hourly rate without a premium. Missing or incomplete punches earn zero work pay pending review; a missing salary rate remains unavailable. Daily amounts round to two decimals and the total adds those rounded amounts. The report and CSV include scheduled hours and hourly rates. Grand Total Salary adds earned work pay, Sunday pay, and configured holiday pay. Paid-day rate is monthly salary divided by calendar days in the month, rounded to two decimals before multiplying by the count. Each selected Sunday is paid; configured holidays on Sundays count once as Sunday pay. Leave in the breakdown means configured holidays, not missing attendance. Rates are grouped by month for multi-month reports. These are additional payments on top of the existing work-hours formula and may put a full-attendance grand total above the listed monthly base. A zero-hour schedule is rejected instead of dividing by zero.

Work hours are informational: sort/deduplicate same-day punches and pair alternating in/out times. Two-punch days deduct the configured tiffin break; four or more punches use recorded breaks. Three-punch days show the second and third recorded punches as tiffin entry and return, with their elapsed duration; exit and working hours remain unconfirmed. Odd punch counts have unavailable hours and an incomplete flag. Tiffin times that are absent from the file are labelled Not recorded. Overnight shifts need manual review. Device Mode values are retained by the parser but do not identify in/out direction. Manual holidays and weekly leave determine scheduled workdays. Holiday uploads accept TXT or CSV with YYYY-MM-DD and optional comma/tab-separated purpose, one date per line; an optional Date,Purpose header is supported. CSV includes the policy, source names, daily status, all punches, hours, and salary totals.

Files are processed locally in browser memory. Bundled files are included in the frontend build; uploaded replacements reset on refresh. Run `npm test` for parser and salary calculation checks, and `npm run build` for production validation.

## Quality checks

```sh
npm run typecheck
npm run lint
npm test
npm run format:check
npm run build
```

Browser tests:

```sh
npx playwright install chromium
npm run test:e2e
```

For an installed Microsoft Edge browser on Windows, set `$env:PLAYWRIGHT_CHANNEL = 'msedge'` before `npm run test:e2e`. Playwright starts the development server when needed. Test artifacts are ignored by Git. CI runs lint, parser/payroll/theme tests, strict TypeScript, build, and formatting before deployment. `npm run format` applies the shared Prettier style.

## Deploy to Hostinger with GitHub Actions

This workflow is for Hostinger Web or Cloud hosting with FTP access, rather than a VPS or Website Builder site. GitHub builds the frontend and uploads only `dist/` using explicit FTPS on port 21. No Node.js process is needed on Hostinger.

1. In Hostinger hPanel, open your site's **Files → FTP Accounts** and obtain the FTP server, username, and password. Enable SSL for the website separately in hPanel.
2. In this GitHub repository, open **Settings → Secrets and variables → Actions**. Add these repository secrets:

   | Secret         | Value                                               |
   | -------------- | --------------------------------------------------- |
   | `FTP_SERVER`   | FTP hostname or IP only, without `ftp://` or a path |
   | `FTP_USERNAME` | Your site's FTP username                            |
   | `FTP_PASSWORD` | Your site's FTP password                            |

3. Add `FTP_SERVER_DIR` on the **Variables** tab (or as a repository secret). A variable takes precedence if both exist. Set it to the target website directory as seen by that FTP account, with a trailing slash. Common examples are `/public_html/` for a domain root or `/public_html/attendiq/` for a subfolder. If the FTP account is already restricted to the website directory, use `./`. Confirm the path in an FTP client; do not point this at another site's directory.
4. Commit and push the project, including `package-lock.json` and `.github/workflows/deploy.yml`, to `main`. Every push to `main` deploys automatically. You can also open **Actions → Deploy AttendIQ to Hostinger → Run workflow** and select `main`.
5. After the workflow succeeds, visit your domain (or chosen subfolder) and check that the page loads. A local build alone does not verify a live deployment.

The workflow validates required configuration before deployment. Credentials are read from GitHub secrets. It does not perform a clean-slate deletion, though files tracked by earlier deployments can be updated or removed during synchronization. Use a dedicated website directory. Documents, source files, and `node_modules` are not uploaded.

Assets use relative URLs so the same build works at a domain root or subfolder. This initial single-page form does not require server-side routing rules.
