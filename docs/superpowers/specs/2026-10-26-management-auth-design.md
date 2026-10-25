# Employee management, access control, login and support

Approved backend direction: PHP API on the existing Hostinger deployment. Execute in order: employee and salary pages with file persistence; RBAC; login; support email. Default roles: Admin manages users and all operations, HR manages employees/salaries/reports, Viewer reads reports and submits support.

Server-owned storage lives outside the public directory. Seed attendance and salary records from the existing text files once; maintain employees.json and Salary.txt plus an authoritative JSON state file. Do not rewrite historical attendance punches when a name changes. Employee IDs are stable; deletion archives the employee and hides them from reports, preserving historical data. Salary updates and renames are reflected in Salary.txt; administrators can restore archived employees. Revision checks prevent stale edits. Use a file lock, atomic state replacement, recoverable text projections and audit entries.

Enforce permissions on every API request as well as in navigation. Use PHP password hashing, regenerated sessions, HttpOnly SameSite cookies, expiry, CSRF tokens, login throttling and no public registration. First admin is provisioned with an installation token stored outside the public directory. Admin user management assigns roles and resets passwords; prevent removal of the last admin. Do not bundle attendance/salary defaults into unauthenticated frontend assets.

Use PHPMailer SMTP to a fixed recipient info@niyanti.com. Validate support inputs, rate limit submissions, set the authenticated user's email as Reply-To, and report success only after the SMTP server accepts the message. Persist ticket status and return an explicit error if SMTP is unconfigured or fails. Never claim inbox delivery from a local test. Production SMTP credentials must be configured privately on the server; do not collect secrets in chat.

Keep all themes, payroll formulas, uploads, hash routes and payroll CSV exports. Default payroll sources now come from the authenticated API and use the managed employee IDs, names and rates. Uploaded attendance/salary remain explicit overrides in browser memory.

Verification: isolated PHP file-store tests, HTTP integration tests (auth/CSRF/role bypass, stale writes, reload persistence, archive/restore, last-admin protection, support SMTP failure/acceptance with a local test receiver), frontend unit/type/lint/build checks and real-browser management/login/report/theme flows. Do not modify the user's PowerPoint or push/deploy automatically. Beep after completion.
