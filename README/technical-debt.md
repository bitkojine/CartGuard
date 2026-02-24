# Tech Debt Index

## Debt Summary

- **Total Open Debt Count**: 4
- **Severity Breakdown**:
  - Critical: 0
  - High: 1
  - Medium: 2
  - Low: 1
- **Category Breakdown**:
  - Architecture: 1
  - Static Site: 1
  - DX: 1
  - Testing: 1
- **Status Trends**:
  - **Issues Found This Pass**: 0
  - **Issues Resolved Since Last Pass**: 2 (ARCH-001, ARCH-005)
  - **Trend**: Significant Improvement. Monolithic extension file broken down into modular components.

### Top 5 Highest Impact Issues

1. `ARCH-003`: Unabstracted VS Code API usage.
2. `SITE-001`: Manual HTML duplication in static site.
3. `TEST-002`: Thin unit test coverage for extension.
4. `DX-001`: Inconsistent tsconfig management.

---

## Active Tech Debt

| ID | Title | Category | Location | Severity | Effort | Status | Date Discovered |
|---|---|---|---|---|---|---|---|
| `ARCH-003` | Unabstracted VS Code API usage | Architecture | `packages/vscode-extension/src/extension.ts` | High | M | Open | 2026-02-24 |
| `SITE-001` | Manual HTML duplication | Static Site | `docs/**/*.html` | Medium | L | Open | 2026-02-24 |
| `TEST-002` | Thin unit test coverage for extension | Testing | `packages/vscode-extension/test` | Medium | M | Open | 2026-02-24 |
| `DX-001` | Inconsistent tsconfig management | DX | `packages/*/tsconfig.json` | Low | S | Open | 2026-02-24 |

---

## Debt Details

### `ARCH-003`: Unabstracted VS Code API usage
- **Description**: Direct calls to `vscode.commands`, `vscode.window`, and `vscode.workspace` throughout the business logic.
- **Impact**: Blocks unit testing of command logic; requires E2E environment for all validation tests.
- **Last Reviewed**: 2026-02-24

### `SITE-001`: Manual HTML duplication
- **Description**: Static pages in `docs/` replicate identical `<nav>` and layout structures manually.
- **Impact**: Maintenance burden; relies on brittle `guard-nav-links.mts` script to prevent drift.
- **Last Reviewed**: 2026-02-24

### `TEST-002`: Thin unit test coverage for extension
- **Description**: Most extension tests are E2E; internal parsing and state transitions lack isolated unit tests.
- **Impact**: Refactoring `extension.ts` is risky without a fast feedback loop from unit tests.
- **Last Reviewed**: 2026-02-24

### `DX-001`: Inconsistent tsconfig management
- **Description**: Shared configuration exists but package-level `tsconfig.json` files overlap and vary slightly in strictness.
- **Impact**: Slight inconsistencies in build behavior across monorepo packages.
- **Last Reviewed**: 2026-02-24

---

## Resolved Debt

| ID | Title | Date Resolved | Note |
|---|---|---|---|
| `ARCH-001` | Monolithic extension entry point | 2026-02-25 | Reduced `extension.ts` from 1500+ lines to ~450 lines by extracting renderers and types. |
| `ARCH-005` | High function complexity | 2026-02-25 | Extracted `renderDemoHtml` and `renderProcessHtml` to separate modules. |
| `ARCH-002` | Global state for demo lifecycle | 2026-02-24 | Encapsulated in `DemoManager` class. |
| `TYPE-001` | Weak input typing in generators | 2026-02-24 | Replaced casting with `GeneratorSeedSchema`. |
| `ARCH-004` | Hardcoded rule logic tokens | 2026-02-24 | Centralized tokens in `@cartguard/spec`. |
| `META-001` | Missing extension metadata | 2026-02-24 | Added `repository`, `LICENSE`, and `files` whitelist. |
| `VAL-001` | Manual data validation | 2026-02-24 | Migrated research/extension data to Zod schemas in `@cartguard/spec`. |
| `VAL-002` | Implicit any in error formatting | 2026-02-24 | Added explicit types for Zod issue mapping. |
| `TEST-001` | Missing demo relationship checks | 2026-02-24 | Added E2E tests for slideshow/workflow consistency. |
