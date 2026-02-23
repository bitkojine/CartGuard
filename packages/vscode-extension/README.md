# CartGuard VSCode Extension

## Commands

- `CartGuard: Run Demo`
  - Runs CartGuard against bundled demo JSON files in `demo/`.
  - Opens a JSON result document and writes logs to the `CartGuard` output channel.

- `CartGuard: Validate JSON Files`
  - Prompts you to select listing, rules, and applicability JSON files.
  - Runs CartGuard evaluation and opens the result as JSON.

- `CartGuard: Open Process View`
  - Opens a webview visualization of the full evaluation process.
  - Shows inputs, summary metrics, and rule-by-rule outcomes.

- `CartGuard: Open Slideshow Demo`
  - Opens a guided, step-by-step demo webview.
  - Each slide explains what CartGuard is doing now, what comes next, and customer impact.

## Local development

From repo root:

```bash
pnpm --filter @cartguard/vscode-extension build
```

In VSCode, open this repo and run extension host from `packages/vscode-extension` using the default extension debug launch config.
In VSCode, open this repo and launch an Extension Development Host for the extension package.

## E2E demo modes

- Normal E2E:

```bash
pnpm --filter cartguard-vscode-extension test:e2e
```

- Slow-motion walkthrough (pauses + hold-open window):

```bash
pnpm --filter cartguard-vscode-extension test:e2e:slow
```

Environment variables:

- `CARTGUARD_E2E_STEP_MS`: pause between steps in milliseconds
- `CARTGUARD_E2E_HOLD_OPEN_MS`: hold the Extension Development Host open at the end
