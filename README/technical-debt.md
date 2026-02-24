# Tech Debt Index

## Debt Summary

- **Total Open Debt Count**: 9
- **Severity Breakdown**:
  - Critical: 0
  - High: 1
  - Medium: 7
  - Low: 1
- **Category Breakdown**:
  - Architecture: 6
  - Static Site: 1
  - Testing: 1
  - DX: 1
- **Status Trends**:
  - **Issues Found This Pass**: 0
  - **Issues Resolved Since Last Pass**: 1 (ARCH-012)
  - **Trend**: Improving. Resource management issue resolved.

### Top 5 Highest Impact Issues

1. `ARCH-003`: Unabstracted VS Code API usage.
2. `SITE-001`: Manual HTML duplication in static site.
3. `TEST-002`: Thin unit test coverage for extension.
4. `ARCH-007`: Extremely long rendering function (> 300 lines).
5. `ARCH-006`: Large function: evaluateRule.

---

## Active Tech Debt

| ID | Title | Category | Location | Severity | Effort | Status | Date Discovered |
|---|---|---|---|---|---|---|---|
| `ARCH-003` | Unabstracted VS Code API usage | Architecture | `packages/vscode-extension/src/extension.ts` | High | M | Open | 2026-02-24 |
| `ARCH-006` | Large function: evaluateRule | Architecture | `packages/engine/src/index.ts` | Medium | S | Open | 2026-02-24 |
| `ARCH-007` | Large function: renderDemoHtml | Architecture | `packages/vscode-extension/src/renderers/demo-renderer.ts` | Medium | M | Open | 2026-02-24 |
| `ARCH-008` | Large function: activate | Architecture | `packages/vscode-extension/src/extension.ts` | Medium | S | Open | 2026-02-24 |
| `ARCH-009` | Large file: extension.ts (> 500 lines) | Architecture | `packages/vscode-extension/src/extension.ts` | Medium | S | Open | 2026-02-24 |
| `ARCH-010` | Large file: engine index.ts (> 400 lines) | Architecture | `packages/engine/src/index.ts` | Medium | S | Open | 2026-02-24 |
| `SITE-001` | Manual HTML duplication | Static Site | `docs/**/*.html` | Medium | L | Open | 2026-02-24 |
| `TEST-002` | Thin unit test coverage for extension | Testing | `packages/vscode-extension/test` | Medium | M | Open | 2026-02-24 |
| `DX-001` | Inconsistent tsconfig management | DX | `packages/*/tsconfig.json` | Low | S | Open | 2026-02-24 |

---

## Debt Details

### `ARCH-003`: Unabstracted VS Code API usage
- **Description**: Direct calls to `vscode.commands`, `vscode.window`, and `vscode.workspace` throughout the business logic.
- **Impact**: Blocks unit testing of command logic; requires E2E environment for all validation tests.
- **Last Reviewed**: 2026-02-24

### `ARCH-006`: Large function: evaluateRule (110 lines)
- **Description**: `evaluateRule` in the engine handles multiple rule types and applicability logic in a single block.
- **Impact**: Increased risk of logic errors in compliance checks; hard to maintain.
- **Last Reviewed**: 2026-02-24

### `ARCH-007`: Large function: renderDemoHtml (326 lines)
- **Description**: `renderDemoHtml` contains massive template literals and inline mapping logic for the webview.
- **Impact**: High cognitive load; extremely difficult to safely modify the UI structure.
- **Last Reviewed**: 2026-02-24

### `ARCH-008`: Large function: activate (260 lines)
- **Description**: The `activate` function registers 10+ commands and complex message listeners in one block.
- **Impact**: Hard to trace command registration and extension lifecycle; high cyclomatic complexity.
- **Last Reviewed**: 2026-02-24

### `ARCH-009`: Large file: extension.ts (501 lines)
- **Description**: Entry point exceeds the 400-line threshold even after modularization.
- **Impact**: Still acts as a "gravity well" for miscellaneous logic and helper functions.
- **Last Reviewed**: 2026-02-24

### `ARCH-010`: Large file: engine index.ts (432 lines)
- **Description**: Core engine logic is centralized in a single file exceeding the 400-line threshold.
- **Impact**: Over-coupling of validation, applicability, and token resolution logic.
- **Last Reviewed**: 2026-02-24

### `SITE-001`: Manual HTML duplication
- **Description**: Static pages in `docs/` replicate identical `<nav>` and layout structures manually.
- **Impact**: Maintenance burden; relies on brittle `guard-nav-links.mts` script to prevent drift.
- **Last Reviewed**: 2026-02-24

### `TEST-002`: Thin unit test coverage for extension
- **Description**: Most extension tests are E2E; internal parsing and state transitions lack isolated unit tests.
- **Impact**: Refactoring logic is risky without a fast feedback loop from unit tests.
- **Last Reviewed**: 2026-02-24

### `DX-001`: Inconsistent tsconfig management
- **Description**: Shared configuration exists but package-level `tsconfig.json` files vary in `module` and `moduleResolution` (CommonJS vs NodeNext).
- **Impact**: Slight inconsistencies in build behavior across monorepo packages.
- **Last Reviewed**: 2026-02-24

---

## Resolved Debt

| ID | Title | Date Resolved | Note |
|---|---|---|---|
| `ARCH-012` | Missing resource disposal (OutputChannel) | 2026-02-24 | Added `OutputChannel` to `context.subscriptions`. |
| `ARCH-011` | Circular dependencies | 2026-02-24 | Moved `fallbackSlideshowData` to `types.ts` to break `extension` <-> `demo-manager` cycle. |
| `ARCH-001` | Monolithic extension entry point | 2026-02-24 | Reduced from 1500+ lines to ~500 lines. Major complexity removed. |
| `ARCH-005` | High function complexity | 2026-02-24 | Extracted renderers and manager. (N.B. Function size remains a secondary debt). |
| `ARCH-002` | Global state for demo lifecycle | 2026-02-24 | Encapsulated in `DemoManager` class. |
| `TYPE-001` | Weak input typing in generators | 2026-02-24 | Replaced casting with `GeneratorSeedSchema`. |
| `ARCH-004` | Hardcoded rule logic tokens | 2026-02-24 | Centralized tokens in `@cartguard/spec`. |
| `META-001` | Missing extension metadata | 2026-02-24 | Added `repository`, `LICENSE`, and `files` whitelist. |
| `VAL-001` | Manual data validation | 2026-02-24 | Migrated research/extension data to Zod schemas in `@cartguard/spec`. |
| `VAL-002` | Implicit any in error formatting | 2026-02-24 | Added explicit types for Zod issue mapping. |
| `TEST-001` | Missing demo relationship checks | 2026-02-24 | Added E2E tests for slideshow/workflow consistency. |
