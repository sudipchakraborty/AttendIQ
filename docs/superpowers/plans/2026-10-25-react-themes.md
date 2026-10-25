# React framework and themes implementation plan

Goal: a maintainable typed React application with Material UI and three complete themes.

Spec: ../specs/2026-10-25-react-themes-design.md

Architecture: feature folders for attendance and payroll; shared shell, controls and theme provider; hash router preserves static hosting; existing calculations migrated without behavioral changes.

- [x] Add TypeScript, typed payroll models, feature boundaries, lint and formatting tools. Run existing domain tests before/after migration and strict type checks.
- [x] Build centralized palettes and persistent theme provider, responsive application shell, and modular Material UI setup form. Check theme persistence and upload validation.
- [x] Build Material UI employee report, date/employee controls, attendance table, salary summary and CSV download. Preserve office cutoff and paid-day logic.
- [x] Run lint, types, payroll tests, build, browser regressions for three themes and mobile layouts, and a final independent code review. Resolve important findings. Document final structure and commands. Beep on completion.

Review focus: blocked localStorage, direct report refresh, malformed text input, salary-unmatched employee, upload state retained on navigation, date auto-selection and payroll totals after switching theme or employee, visible/focus contrast and narrow-screen overflow.

Ruling: use a feature branch in the user's active checkout so the existing local preview immediately receives the work; preserve the separately modified PowerPoint. No commits or push until requested.

## Verification results

- Strict TypeScript, ESLint, Prettier check, and production build: passed.
- Domain/theme tests: 19 passed. All original 18 payroll tests preserved.
- Playwright browser tests: 3 passed using installed Microsoft Edge, covering three themes, persistence, blocked storage, mobile widths, upload overrides, invalid files, payroll cutoff, paid days, CSV and retained setup state.
- Built-app browser smoke on port 4173: passed for themes, vendor chunks, lazy report route, direct refresh and salary total 6,558.48.
- Independent review: no important findings. Reviewer compared 63 employee/range/settings cases; old and typed reports and CSV matched.
- Visual review caught a Material UI 9 text-color API difference. Added a failing browser assertion for secondary text, moved palette colors into sx, and reran the full browser suite successfully.
- User PowerPoint left untouched. Work is uncommitted on feat/react-typescript-mui-themes; no deployment was performed.
