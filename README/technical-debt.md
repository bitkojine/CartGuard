# Tech Debt Index

## Debt Summary

- **Total Open Debt Count**: 1
- **Total Architecture Debt Count**: 1
- **Severity Breakdown**:
  - Critical: 0
  - High: 0
  - Medium: 1
  - Low: 0
- **Category Breakdown**:
  - Architecture: 1
- **Status Trends**:
  - **Issues Found This Pass**: 0
  - **Issues Resolved Since Last Pass**: 1 (DX-001)
  - **Critical dependency violations**: 0
  - **Circular dependency count**: 0
  - **Domain purity violations**: 0
  - **Trend**: Stable. The codebase adheres strictly to Clean Architecture principles. Minimal adapter drift and UI clutter remain.

### Top 5 Highest Impact Issues

1. `SITE-001`: Manual HTML duplication in static site (Adapter Drift).

---

## Active Tech Debt

| ID | Title | Category | Location | Severity | Effort | Status | Date Discovered |
|---|---|---|---|---|---|---|---|
| `SITE-001` | Manual HTML duplication | Architecture | `docs/` | Medium | L | Open | 2026-02-24 |

---

## Debt Details


### `SITE-001`: Manual HTML duplication
- **Description**: Duplicate nav/layout in docs. No shared component abstraction.
- **Last Reviewed**: 2026-02-24

---

## Resolved Debt

| ID | Title | Date Resolved | Note |
|---|---|---|---|
| `DX-001` | Inconsistent tsconfig management | 2026-02-24 | Added `rootDir`, `outDir`, and `include` using `${configDir}` to `tsconfig.base.json`. |
| `TEST-002` | Thin unit test coverage for extension | 2026-02-24 | Added comprehensive `node:test` unit test suite for extension utility and logical layers. |
| `ARCH-013` | Dead view contribution | 2026-02-24 | Removed unused `cartguardActionsView` and its container from VS Code package.json contributes section. |
| `ARCH-007` | Large function: renderDemoHtml | 2026-02-24 | Decomposed into sub-renderers and helper functions in demo-renderer-components.ts. |
| `ARCH-003` | Unabstracted VS Code API usage | 2026-02-24 | Abstracted Logger and path resolution in extension-logic.ts. |
| `ARCH-008` | Large function: activate | 2026-02-24 | Extracted command registration to separate module. |
| `ARCH-014` | Demo state machine coupled to UI | 2026-02-24 | Extracted pure state machine logic to `DemoLogic`. |
| `ARCH-015` | Impure domain (Date.now) | 2026-02-24 | Side-effect removed; added timestamp support to GeneratorSeed. |
| `ARCH-006` | Large function: evaluateRule | 2026-02-24 | Helper functions extracted. |
| `ARCH-010` | Large file: engine index.ts | 2026-02-24 | Split into modules. |
| `ARCH-009` | Large file: extension.ts | 2026-02-24 | Extracted utilities and logic. |
| `ARCH-012` | Missing resource disposal | 2026-02-24 | Added to context.subscriptions. |
| `ARCH-011` | Circular dependencies | 2026-02-24 | Resolved via types.ts move. |
| `ARCH-001` | Monolithic extension entry point | 2026-02-24 | Refactored. |
| `ARCH-005` | High function complexity | 2026-02-24 | Extracted renderers and manager. |
| `ARCH-002` | Global state for demo lifecycle | 2026-02-24 | Encapsulated in DemoManager. |
| `TYPE-001` | Weak input typing in generators | 2026-02-24 | Replaced casting with GeneratorSeedSchema. |
| `ARCH-004` | Hardcoded rule logic tokens | 2026-02-24 | Centralized tokens in @cartguard/spec. |
| `META-001` | Missing extension metadata | 2026-02-24 | Added repository, license, etc. |
| `VAL-001` | Manual data validation | 2026-02-24 | Migrated to Zod. |
| `VAL-002` | Implicit any in error formatting | 2026-02-24 | Added explicit types. |
| `TEST-001` | Missing demo relationship checks | 2026-02-24 | Added E2E tests for slideshow/workflow. |
