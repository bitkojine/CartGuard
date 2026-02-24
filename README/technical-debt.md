# Technical Debt Register

This document tracks known technical debt in the CartGuard repository, with focus on the VS Code demo extension.

## Scope

- Extension package: `packages/vscode-extension`
- Demo data/workflow files in `packages/vscode-extension/demo`
- Local release/install flow for the extension

## Current Debt

### 1) Slideshow state and panel lifecycle coupling

- Area: `packages/vscode-extension/src/extension.ts`
- Debt:
  - Demo mode/state/panel lifecycle all live in one command handler block.
  - Panel disposal callbacks can affect mode/state if not carefully guarded.
- Impact:
  - Higher risk of race conditions during mode switching (`default`, `exec`, `champion`).
  - Harder to reason about command behavior over time.
- Recommendation:
  - Extract slideshow state into a small state manager module.
  - Keep panel lifecycle and mode transitions as explicit state-machine events.

### 2) Large monolithic extension file

- Area: `packages/vscode-extension/src/extension.ts`
- Debt:
  - Parsing, rendering, command wiring, and state management are in one file.
- Impact:
  - Slower code review.
  - Increased regression risk when changing unrelated behavior.
- Recommendation:
  - Split into modules:
    - `commands/*`
    - `demo-state/*`
    - `webview/*`
    - `parsers/*`

### 3) Multiple slideshow entry points with implicit behavior

- Area: commands and slideshow data resolution.
- Debt:
  - `Open Slideshow`, `Open Exec`, `Open Champion`, `Reopen` share code paths with mode-specific behavior.
  - Reopen behavior intentionally resets to default, which can surprise users.
- Impact:
  - UX confusion if command semantics are not obvious.
- Recommendation:
  - Document explicit command contracts.
  - Consider adding `Reopen Exec` and `Reopen Champion` or "reopen last mode" behavior.

### 4) Demo UI complexity and divergence by mode

- Area: demo webview rendering.
- Debt:
  - Mode-specific rendering conditions are embedded inline in template strings.
- Impact:
  - UI drift risk and harder visual consistency checks.
- Recommendation:
  - Move each mode to a dedicated renderer function with shared primitives.

### 5) Demo data as product behavior driver

- Area: `packages/vscode-extension/demo/*.json`
- Debt:
  - Story logic depends heavily on JSON shape and naming conventions.
- Impact:
  - Small data edits can break flows or gate wiring.
- Recommendation:
  - Add strict schema validation for slideshow/workflow files in tests.
  - Fail fast with explicit error messaging when data is invalid.
- Status:
  - Partially paid down on 2026-02-24 with E2E schema checks for all slideshow files, gate/slide consistency checks, and scenario reference validation.

### 6) Packaging warnings in local release flow

- Area: `vsce package` output.
- Debt:
  - Missing `repository` metadata.
  - Missing `LICENSE` file inside extension package.
  - No `.vscodeignore` or restrictive `files` list.
- Impact:
  - Noisy release output and avoidable packaging risk.
- Recommendation:
  - Add `repository` field for extension package.
  - Ensure extension package includes license file path.
  - Add `.vscodeignore` or `files` whitelist.
- Status:
  - Paid down on 2026-02-24 by adding `repository`, extension-local `LICENSE`, and package `files` whitelist.

## Existing Mitigations

- E2E tests now cover:
  - default slideshow flow
  - exec flow
  - champion flow
  - reopen behavior
  - mode transition assertions
- Added one-command local release/install:
  - `pnpm vscode:release-local`

## Short-Term Debt Paydown Plan

1. Stabilize command contracts and document reopen semantics.
2. Extract slideshow state transitions into a dedicated module.
3. Add schema checks for `slideshow.json`, `exec-slideshow.json`, `champion-slideshow.json`, and `workflow-batch.json`.
4. Keep packaging metadata/whitelist in sync as files change.
5. Keep demo feature work paused until the above is complete.
