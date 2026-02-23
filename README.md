# CartGuard VS Code Extension (Developer Setup)

This repository contains the CartGuard monorepo. For day-to-day use, this README is focused on one goal: **run the VS Code extension locally**.

## Prerequisites

- Node.js `>=20`
- pnpm `9.15.4`
- VS Code desktop

## 5-Minute Local Setup

1. Clone and install dependencies:

```bash
git clone https://github.com/bitkojine/CartGuard.git
cd CartGuard
pnpm install --frozen-lockfile
```

2. Build the workspace (includes extension dependencies):

```bash
pnpm build
```

3. Package the extension as VSIX:

```bash
pnpm --filter cartguard-vscode-extension exec vsce package --no-dependencies -o packages/vscode-extension/cartguard.vsix
```

4. Install the extension into VS Code:

Option A (CLI):

```bash
code --install-extension packages/vscode-extension/cartguard.vsix --force
```

Option B (UI):
- Open VS Code
- Open Extensions view
- Click `...` -> `Install from VSIX...`
- Select `packages/vscode-extension/cartguard.vsix`

5. Open this folder in VS Code:

- `packages/vscode-extension/demo`

6. Run from Command Palette:

- `CartGuard: Run Demo`
- `CartGuard: Open Process View`
- `CartGuard: Open Slideshow Demo`

## Extension Commands

- `CartGuard: Run Demo`
- `CartGuard: Validate JSON Files`
- `CartGuard: Open Process View`
- `CartGuard: Open Slideshow Demo`
- `CartGuard: Demo Next Step`
- `CartGuard: Reopen Slideshow Demo`

### What each command does

1. `CartGuard: Run Demo`
- Runs evaluation with default demo inputs.
- Opens JSON results in the editor.

2. `CartGuard: Validate JSON Files`
- Validates selected listing/rules/applicability JSON files.
- Opens JSON validation results.

3. `CartGuard: Open Process View`
- Runs evaluation and opens a process webview with summary + rule outcomes.

4. `CartGuard: Open Slideshow Demo`
- Opens the interactive step-by-step demo webview.
- Uses runtime data from `packages/vscode-extension/demo/slideshow.json` and `packages/vscode-extension/demo/workflow-batch.json`.

5. `CartGuard: Demo Next Step`
- Advances the slideshow one step.
- Auto-applies recommended gate decisions when needed in command-driven flow.

6. `CartGuard: Reopen Slideshow Demo`
- Resets and reopens the slideshow from step 1.

## Demo Data Files (Runtime)

The slideshow is file-driven:

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

Slow/manual (click-through):

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
    pnpm --filter cartguard-vscode-extension exec vsce package --no-dependencies -o packages/vscode-extension/cartguard.vsix
    ```

- CartGuard commands not visible
  - Confirm extension is installed (`@installed cartguard` in Extensions search).
  - Run `Developer: Reload Window`.
  - Confirm opened folder is `packages/vscode-extension/demo`.

## Optional Repository Checks

```bash
pnpm lint
pnpm guard
pnpm check
```

## License

MIT — see `LICENSE`.
