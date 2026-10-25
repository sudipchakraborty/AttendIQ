# React framework and themes

Approved direction: React + Vite + TypeScript + Material UI. Preserve static Hostinger deployment, hash routes, uploaded-file memory lifetime, and all existing payroll rules.

Deliver a typed feature-based app with a shared responsive sidebar/header, dedicated attendance setup and employee report pages, reusable form/report components, and centralized theme tokens. Three coordinated themes: Pearl Light (ivory/teal), Graphite Dark (charcoal/mint), Midnight Blue (navy/periwinkle). Theme selection is available on both pages and persists locally with a safe fallback if browser storage is unavailable. All UI surfaces and form controls use Material UI theme tokens.

The chosen approach is Material UI rather than retaining the custom CSS component system. This adds dependencies but supplies consistent accessible controls, theme integration and responsive primitives. Keep Vite rather than adopting a server framework because this application deploys static files. TypeScript covers the UI, file readers, and calculation engine. Add repeatable formatting, lint, type, domain and browser verification. Do not alter salary formulas, infer missing punches, modify the user's PowerPoint, or publish changes as part of this refactor.

Verification: payroll regression tests, strict TypeScript, ESLint, production build; browser checks of every theme on both pages, persisted selection, mobile layout, uploads and fallback data, employee tabs, payroll cutoff, salary breakdown and CSV download.
