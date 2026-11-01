# Employee Leave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver the approved local JSON-backed employee leave review workflow.

**Architecture:** Opt-in local-review mode reuses AuthProvider and shell, with a separate loopback Node service and private JSON storage. Production runtime remains available.

**Tech Stack:** React, TypeScript, MUI, Node built-ins, Playwright.

**Spec:** docs/superpowers/specs/2026-11-01-employee-leave-design.md

## Global Constraints

- SL=10 and CL=10 initially; admin-editable annual allowances.
- Admin alone sees all employee leave and approves/rejects requests.
- Employee identity enforced on the service; no Contabo or database calls in review mode.
- Whole calendar days, calendar year, no carry-forward.
- Beep after verified completion; do not push or deploy.

## Review Focus

- Forged employee identity and direct API calls cannot expose another employee's leave.
- Concurrent requests cannot lose data or overdraw approved allowance.
- Invalid dates, fractional days, overlaps and cross-year requests are rejected.
- Settings changes persist across restart and cannot invalidate approved usage.
- Login redirects and restricted navigation work for both roles on narrow screens.

### Task 1: Local service and persisted policy

**Files:** scripts/leave-review-server.mjs, scripts/leave-review-seed.json, tests/leave-review.test.mjs.
**Interfaces:** export createLeaveReviewServer({storage, seedPath?}) -> HTTP server; /local-leave-api/session, /login, /logout, /leaves, /settings, /leaves/:id/decision.

- [x] Write HTTP integration tests for login, role boundaries, submission, approval, balances, validation, settings, concurrency and restart persistence.
- [x] Run tests and confirm missing service fails; implement service; rerun to green.

### Task 2: Auth and corporate pages

**Files:** src/features/leave/{LeavePage,LeaveSettingsPage,client,types}, AuthProvider, App, AppShell, runtime, vite.config.ts, package.json, scripts/leave-review-dev.mjs.
**Interfaces:** localLeaveApi<T>(path, method?, body?) uses same-origin /local-leave-api; session provides existing auth shape with Employee role and leave permissions.

- [x] Write Playwright flow for employee submission, admin approval/settings, employee isolation and responsive page.
- [x] Run to see missing review command fail; implement local runtime, routes, forms and list.
- [x] Run HTTP tests, browser flow, typecheck/build, lint and existing unit suite.

### Task 3: Delivery

**Files:** README.md, this plan.

- [x] Document start command, demo credentials, JSON location and review limitations.
- [x] Review final diff, verify local URL, mark completed steps and play beep.

## Execution ledger

- Approved to proceed in this workspace on existing feature branch; implement inline and leave changes reviewable without automatic commit or publish.

- Verification: 20 unit tests, local HTTP integration, full leave browser workflow and two standalone browser regressions pass. Frontend production build and lint pass. Desktop/mobile screenshots inspected.
- Review: independent code review identified year selector mismatch; fixed to cover 2000-2100 with regression test. Layout corrected after visual inspection.
- Runtime: local JSON review running at http://localhost:5173/#/leave; anonymous session responds, employee login shows SL=10/CL=10 and direct JSON access is HTTP 403.
- Ruling: retain attendance/report calculations locally in review mode so existing pages cannot call Contabo. No backend repository changes, commits or deployment.
