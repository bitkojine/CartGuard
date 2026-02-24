# VS Code Extension: Local Setup

## Prerequisites

- Node.js `>=20`
- pnpm `9.15.4`
- VS Code desktop

## 5-Minute Setup

1. Clone and install:

```bash
git clone https://github.com/bitkojine/CartGuard.git
cd CartGuard
pnpm install --frozen-lockfile
```

2. Build workspace:

```bash
pnpm build
```

3. Package extension:

```bash
pnpm --filter cartguard-vscode-extension exec vsce package --no-dependencies -o cartguard.vsix
```

4. Install extension:

Option A (CLI):

```bash
code --install-extension packages/vscode-extension/cartguard.vsix --force
```

Option B (VS Code UI):
- Open Extensions view
- Click `...` -> `Install from VSIX...`
- Select `packages/vscode-extension/cartguard.vsix`

5. Open this folder in VS Code:
- `packages/vscode-extension/demo`

6. Run:
- `CartGuard: Run Demo`
- `CartGuard: Open Process View`
- `CartGuard: Open Slideshow Demo`

## Primary Demo Mode: Manual Click-to-Continue

From repo root:

```bash
pnpm --filter cartguard-vscode-extension test:e2e:slow
```

What this does:
- Builds the extension
- Opens an Extension Development Host window
- Opens the slideshow demo
- Waits for manual `Continue` clicks
- Keeps VS Code open for live walkthrough

How to continue slides:
- Click `Continue` inside the slideshow webview, or
- Use command palette command: `CartGuard: Demo Next Step`

How to finish:
- Continue through all steps until the final action (the host closes at the end), or
- Stop from terminal with `Ctrl+C`.

## Extension Commands

- `CartGuard: Run Demo`
- `CartGuard: Validate JSON Files`
- `CartGuard: Open Process View`
- `CartGuard: Open Slideshow Demo`
- `CartGuard: Demo Next Step`
- `CartGuard: Reopen Slideshow Demo`

## Command Behavior

1. `CartGuard: Run Demo`
- Runs evaluation with default demo inputs.
- Opens JSON result output.

2. `CartGuard: Validate JSON Files`
- Validates selected listing/rules/applicability JSON files.
- Opens JSON validation output.

3. `CartGuard: Open Process View`
- Runs evaluation and opens summary/rule outcomes in a webview.

4. `CartGuard: Open Slideshow Demo`
- Opens the interactive step-by-step demo webview.
- Reads runtime data from demo JSON files.

5. `CartGuard: Demo Next Step`
- Advances slideshow by one step.
- Auto-applies recommended gate decisions for command-driven flow.

6. `CartGuard: Reopen Slideshow Demo`
- Resets and reopens slideshow from step 1.

## Runtime Demo Files

- `packages/vscode-extension/demo/slideshow.json`
- `packages/vscode-extension/demo/workflow-batch.json`
- `packages/vscode-extension/demo/sample-listing.json`
- `packages/vscode-extension/demo/rules.json`
- `packages/vscode-extension/demo/applicability.json`

## E2E Demo Runs

Automated:

```bash
pnpm --filter cartguard-vscode-extension test:e2e
```

Slow/manual:

```bash
pnpm --filter cartguard-vscode-extension test:e2e:slow
```

## Troubleshooting

- `code: command not found`
  - Use VS Code UI install path (`Install from VSIX...`).

- `vsce` packaging fails
  - Re-run:
    ```bash
    pnpm install --frozen-lockfile
    pnpm --filter cartguard-vscode-extension build
    pnpm --filter cartguard-vscode-extension exec vsce package --no-dependencies -o cartguard.vsix
    ```

- CartGuard commands not visible
  - Confirm extension is installed (`@installed cartguard`).
  - Run `Developer: Reload Window`.
  - Confirm folder is `packages/vscode-extension/demo`.

## Optional Repo Checks

```bash
pnpm lint
pnpm guard
pnpm check
```
