# Tech Debt Index

## Debt Summary

- **Total Open Debt Count**: 7
- **Severity Breakdown**:
  - Critical: 0
  - High: 3
  - Medium: 2
  - Low: 2
- **Category Breakdown**:
  - Architecture: 4
  - Types: 1
  - Static Site: 1
  - DX: 1
- **Status Trends**:
  - **Issues Found This Pass**: 3 (Hardcoded tokens, Manual HTML sync, Weak input typing)
  - **Issues Resolved Since Last Pass**: 2 (Packaging metadata, Basic schema validation)
  - **Trend**: Improving (Core validation logic stabilized via Zod migration).

### Top 5 Highest Impact Issues

1. `ARCH-001`: Monolithic extension file (1500+ lines).
2. `ARCH-002`: Global state management for demo lifecycle.
3. `ARCH-003`: Unabstracted VS Code API usage.
4. `ARCH-004`: Hardcoded rule mapping tokens in engine.
5. `SITE-001`: Manual HTML duplication in static site.

---

## Active Tech Debt

| ID | Title | Category | Location | Severity | Effort | Status | Date Discovered |
|---|---|---|---|---|---|---|---|
| `ARCH-001` | Monolithic extension entry point | Architecture | `packages/vscode-extension/src/extension.ts` | High | L | Open | 2026-02-23 |
| `ARCH-002` | Global state for demo lifecycle | Architecture | `packages/vscode-extension/src/extension.ts` | High | M | Open | 2026-02-23 |
| `ARCH-003` | Unabstracted VS Code API usage | Architecture | `packages/vscode-extension/src/extension.ts` | High | M | Open | 2026-02-24 |
| `ARCH-004` | Hardcoded rule logic tokens | Architecture | `packages/engine/src/index.ts` | Medium | M | Open | 2026-02-24 |
| `SITE-001` | Manual HTML duplication | Static Site | `docs/**/*.html` | Medium | L | Open | 2026-02-24 |
| `TYPE-001` | Weak input typing in generators | Types | `packages/ai/src/index.ts` | Low | S | Open | 2026-02-24 |
| `DX-001` | Inconsistent tsconfig management | DX | `packages/*/tsconfig.json` | Low | S | Open | 2026-02-24 |

---

## Debt Details

### `ARCH-001`: Monolithic extension entry point
- **Description**: `extension.ts` exceeds 1500 lines, combining webview rendering, command logic, and state management.
- **Impact**: Increased regression risk, slow reviews, and circular dependency potential.
- **Last Reviewed**: 2026-02-24

### `ARCH-002`: Global state for demo lifecycle
- **Description**: `demoPanel`, `demoState`, and `workflowData` are tracked as top-level `let` variables.
- **Impact**: Difficult to test, risk of state leaks between demo runs.
- **Last Reviewed**: 2026-02-24

### `ARCH-003`: Unabstracted VS Code API usage
- **Description**: Direct calls to `vscode.commands`, `vscode.window`, and `vscode.workspace` throughout the business logic.
- **Impact**: Blocks unit testing of command logic; requires E2E environment for all validation tests.
- **Last Reviewed**: 2026-02-24

### `ARCH-004`: Hardcoded rule logic tokens
- **Description**: `tokenValue` contains direct string mapping for domain tokens (e.g. `equipment_not_radio_equipment_under_RED`).
- **Impact**: Brittleness if spec changes; engine logic is tightly coupled to specific spec version strings.
- **Last Reviewed**: 2026-02-24

### `SITE-001`: Manual HTML duplication
- **Description**: Static pages in `docs/` replicate identical `<nav>` and layout structures manually.
- **Impact**: Maintenance burden; relies on brittle `guard-nav-links.mts` script to prevent drift.
- **Last Reviewed**: 2026-02-24

### `TYPE-001`: Weak input typing in generators
- **Description**: `MockContentGenerator` uses `input as { ... }` instead of runtime validation or strict interface implementation.
- **Impact**: Runtime errors if invalid seeds are passed to the generator.
- **Last Reviewed**: 2026-02-24

### `DX-001`: Inconsistent tsconfig management
- **Description**: Shared configuration exists but package-level `tsconfig.json` files overlap and vary slightly in strictness.
- **Impact**: Slight inconsistencies in build behavior across monorepo packages.
- **Last Reviewed**: 2026-02-24

---

## Resolved Debt

| ID | Title | Date Resolved | Note |
|---|---|---|---|
| `META-001` | Missing extension metadata | 2026-02-24 | Added `repository`, `LICENSE`, and `files` whitelist. |
| `VAL-001` | Manual data validation | 2026-02-24 | Migrated research/extension data to Zod schemas in `@cartguard/spec`. |
| `VAL-002` | Implicit any in error formatting | 2026-02-24 | Added explicit types for Zod issue mapping. |
| `TEST-001` | Missing demo relationship checks | 2026-02-24 | Added E2E tests for slideshow/workflow consistency. |
