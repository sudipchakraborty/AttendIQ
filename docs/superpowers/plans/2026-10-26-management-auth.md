# Management and auth implementation plan

Spec: ../specs/2026-10-26-management-auth-design.md

- [ ] Step 1: PHP private file store, stable employee records, salary projection, archive/restore, authenticated defaults integration, employee and salary pages and sidebar entries. Verify persistence and payroll name/rate updates.
- [ ] Step 2: central server permission policy, role-aware routes/navigation, admin user/role management, direct API denial tests.
- [ ] Step 3: session/CSRF/login/installation bootstrap/logout/password handling, login page and protected app. Verify session expiry/revocation, throttling and last-admin guards.
- [ ] Step 4: support page, fixed-recipient SMTP transport, ticket persistence and honest delivery state. Verify accepted and rejected mail with isolated SMTP receiver; production mail requires private server configuration.
- [ ] Final: quality checks, browser tests, independent security review, deployment packaging, private config instructions and completion beep.

Dependency ruling: step 1 needs the auth middleware foundation so later permissions can be enforced without an unsecured transitional API. Implement shared server foundations first; complete and verify the user-facing milestones in the requested order.
