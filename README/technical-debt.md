# Tech Debt Index

## Debt Summary

- **Total Open Debt Count**: 6
- **Critical**: 0
- **High**: 0
- **Medium**: 3
- **Low**: 3
- **Category Breakdown**:
  - Architecture: 2
  - Maintainability: 4
  - Reliability: 0
- **Status Trends**:
  - **Issues Found This Pass**: 7
  - **Issues Resolved Since Last Pass**: 2 (REL-001, REL-002)
  - **Critical dependency violations**: 0
  - **Circular dependency count**: 0
  - **Domain purity violations**: 0
  - **Trend**: Stable. Codebase maintains Clean Architecture. New issues are localized to VSCode extension renderer layer and dynamic imports.

### Top 5 Highest Impact Issues

1. `SITE-001`: Manual HTML duplication in static site (Adapter Drift).
2. `ARCH-016`: Dynamic Function() for imports in extension-logic (Anti-pattern).
3. `MAIN-001`: Duplicate CSS styles in renderer components (DRY violation).
4. `MAIN-002`: Long parameter list in renderDemoHtml (Maintainability).
5. `MAIN-003`: High complexity in getApplicabilityState (Maintainability).

---

## Active Tech Debt

| ID | Title | Category | Location | Severity | Effort | Status | Date Discovered |
|---|---|---|---|---|---|---|---|
| `SITE-001` | Manual HTML duplication | Architecture | `docs/` | Medium | L | Open | 2026-02-24 |
| `ARCH-016` | Dynamic Function() for imports | Architecture | `packages/vscode-extension/src/extension-logic.ts` | Medium | M | Open | 2026-02-24 |
| `MAIN-001` | Duplicate CSS styles in renderers | Maintainability | `packages/vscode-extension/src/renderers/` | Medium | M | Open | 2026-02-24 |
| `MAIN-002` | Long parameter list in renderDemoHtml | Maintainability | `packages/vscode-extension/src/renderers/demo-renderer.ts` | Low | S | Open | 2026-02-24 |
| `MAIN-003` | High complexity in getApplicabilityState | Maintainability | `packages/engine/src/index.ts` | Low | M | Open | 2026-02-24 |
| `MAIN-004` | Unhandled promise in setTimeout callbacks | Maintainability | `packages/vscode-extension/src/renderers/demo-renderer.ts` | Low | S | Open | 2026-02-24 |

---

## Debt Details


### `SITE-001`: Manual HTML duplication
- **Description**: Duplicate nav/layout structures in 17 docs HTML files. Each page manually duplicates head metadata, navigation markup, and styling. No shared template or component system.
- **Impact**: Maintenance burden. Updating nav links requires changing 17 files. Risk of inconsistency.
- **Why it matters**: Manual duplication increases defect risk and slows feature updates across the static site.
- **Last Reviewed**: 2026-02-24

---

### `ARCH-016`: Dynamic Function() for imports
- **Description**: [extension-logic.ts](packages/vscode-extension/src/extension-logic.ts#L40) uses `new Function("specifier", "return import(specifier);")` to dynamically import the engine module. This pattern is an anti-pattern and circumvents static module resolution.
- **Impact**: Harder to tree-shake; makes dependencies opaque to bundlers; potential security concern; non-standard pattern.
- **Why it matters**: Makes code harder to understand and optimize. Standard dynamic import() should be used instead.
- **Last Reviewed**: 2026-02-24
- **Effort**: M
- **Estimated Fix**: Replace with native `import()` dynamic import; update bundler config if needed.

---

### `MAIN-001`: Duplicate CSS styles in renderers
- **Description**: CSS styles are duplicated across [demo-renderer-components.ts](packages/vscode-extension/src/renderers/demo-renderer-components.ts#L1) and [process-renderer.ts](packages/vscode-extension/src/renderers/process-renderer.ts#L1). Both files define similar color schemes, grid layouts, table styles, and button styles inline in template literals.
- **Impact**: DRY violation. Updating color or layout requires changes in multiple places. Risk of inconsistency between demo and process views.
- **Why it matters**: Maintainability. Shared styles should live in one place.
- **Last Reviewed**: 2026-02-24
- **Effort**: M
- **Estimated Fix**: Extract shared CSS into a separate `shared-styles.ts` file and import in both renderers.

---

### `MAIN-002`: Long parameter list in renderDemoHtml
- **Description**: [demo-renderer.ts](packages/vscode-extension/src/renderers/demo-renderer.ts#L6) `renderDemoHtml` function has 10 parameters: `state, slides, decisionGatesByCheckId, listingPath, rulesPath, applicabilityPath, run, workflowData, demoMode, autoplayEnabled, autoplayStepMs`. Exceeds recommended 4-parameter limit.
- **Impact**: Harder to call and extend. Hard to remember parameter order. Makes function signature brittle.
- **Why it matters**: Reduced readability and maintainability. Future callers must carefully order arguments.
- **Last Reviewed**: 2026-02-24
- **Effort**: S
- **Estimated Fix**: Group parameters into config objects: `{ state, slides, gates, paths: { listing, rules, applicability }, run, workflow, mode, autoplay: { enabled, stepMs } }`.

---

### `MAIN-003`: High complexity in getApplicabilityState
- **Description**: [engine/src/index.ts](packages/engine/src/index.ts#L100) `getApplicabilityState` function has nested loops and multiple conditions evaluating token applicability. Cyclomatic complexity is high (~8+).
- **Impact**: Hard to test all branches. Risk of logic errors in rule applicability evaluation, which directly affects compliance checking.
- **Why it matters**: Core business logic. High complexity creates defect risk and slows feature changes.
- **Last Reviewed**: 2026-02-24
- **Effort**: M
- **Estimated Fix**: Extract token evaluation into separate helper; use early returns to flatten nesting; add focused unit tests for each token type.

---


### `MAIN-004`: Unhandled promise in setTimeout callbacks
- **Description**: [demo-renderer.ts](packages/vscode-extension/src/renderers/demo-renderer.ts#L108): Inside the autoplay setTimeout, `onRequireRun()` promise is called without await or .catch(). If the promise rejects, the error is silently swallowed.
- **Impact**: Autoplay can fail without user notification. Demo may hang.
- **Why it matters**: Unhandled promise rejection can crash the extension or leave it in inconsistent state.
- **Last Reviewed**: 2026-02-24
- **Effort**: S
- **Estimated Fix**: Wrap in try-catch; add error handling for autoplay promise failures.

## Resolved Debt

| ID | Title | Date Resolved | Note |
|---|---|---|---|
| `REL-002` | Type coercion in webview message handling | 2026-02-24 | Added webviewMessageSchema (Zod) with union types for gateDecision and continue messages. Messagevalidation via parseWebviewMessage helper. Eliminated unsafe type coercion. |
| `REL-001` | Error swallowing in command handlers | 2026-02-24 | Added vscode.window.showErrorMessage() dialogs to 3 handlers (runDemo, validateJsonFiles, openProcessView) while preserving output channel logging. |
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
