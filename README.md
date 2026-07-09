# OFBiz ERP — Angular Web Client

An Angular 21 + Angular Material web client for [Apache OFBiz](https://ofbiz.apache.org/), built on top of the `common-api` REST plugin. It covers day-to-day ERP flows: sales and purchase orders, inventory (lots, cycle counts, transfers, picklists, shipments), manufacturing (BOMs, routings, jobs), parties (customers, suppliers, users), accounting (invoices, payments, journal entries), and reporting.

## Architecture

```text
Browser ──> Angular dev server (:4200)
                │  proxy /api/** ──> https://localhost:8443/rest/**
                ▼
        Apache OFBiz + common-api plugin (REST, JWT auth)
```

- All HTTP calls go through `/api` (see [src/environments](src/environments)); the dev server rewrites `/api` to OFBiz's `/rest` endpoint via [proxy.conf.json](proxy.conf.json).
- Authentication uses OFBiz JWTs stored in `sessionStorage`; roles and permissions come from token claims.
- State is managed with Angular signals; all edit flows use Material dialogs.

## Prerequisites

- Node.js 20+ and npm
- A running OFBiz instance with the `common-api` plugin and demo data loaded — see the plugin README at `plugins/common-api/README.md` for the full backend setup (framework patch, demo data, startup).

## Getting started

```sh
npm install
npm start          # dev server on http://localhost:4200, proxied to OFBiz on :8443
```

Log in with the OFBiz demo credentials (`admin` / `ofbiz`) once the backend has demo data loaded.

If your OFBiz instance runs elsewhere, change `target` in [proxy.conf.json](proxy.conf.json).

## Tests

```sh
npm run test:ci:all     # full suite (two shards) — use this in CI
npm run test:coverage   # with coverage (coverage/lcov.info)
npm test                # interactive watch mode
```

Note: prefer `test:ci:all` over `test:ci`; running all ~1500 specs in a single headless Chrome session can exhaust the browser and disconnect mid-run.

## Lint and Sonar

ESLint is configured with `@angular-eslint`, `@typescript-eslint`, and `eslint-plugin-sonarjs` (SonarSource's own rules), so SonarQube findings are reproducible locally:

```sh
npm run lint            # must be 0 errors / 0 warnings
npm run lint:sonar      # writes reports/eslint-report.json for SonarQube
```

SonarQube ingests `reports/eslint-report.json` and `coverage/lcov.info` as configured in [sonar-project.properties](sonar-project.properties). Generate both before running the scanner.

## Production build

```sh
npm run build           # outputs to dist/ofbiz-angular
```

Docker/Kubernetes deployment assets aren't included yet; this section will return once those are ready.

## Project structure

```text
src/app/
  components/    # feature components (po, so, inventory, manufacturing, party, ...)
  services/      # API services (one per domain) + common (auth, api, interceptors)
  models/        # typed API models
  pipes/         # display pipes (dates, ...)
  helpers/       # small pure helpers
```

Conventions:

- OFBiz REST responses wrap OUT parameters as `{ statusCode, data: {...} }` — services unwrap with `response?.data ?? response`.
- Components use `ChangeDetectionStrategy.OnPush` with signals; subscriptions are tied to `DestroyRef` via `takeUntilDestroyed`.
- Edit flows open `MatDialog` dialogs; no inline editing.
- Cross-module imports use the `@ofbiz/*` path alias (mapped to `src/app/*` in `tsconfig.json`), e.g. `import { ApiService } from '@ofbiz/services/common/api.service';`. Relative imports (`./`, `../`) are still used for files within the same feature folder.

## License

Licensed under the Apache License, Version 2.0 — see the license headers in each source file.
