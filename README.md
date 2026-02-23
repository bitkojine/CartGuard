# CartGuard

Spec-driven compliance-check tooling for cross-border ecommerce launches.

[![Quality Gates](https://github.com/bitkojine/CartGuard/actions/workflows/quality.yml/badge.svg)](https://github.com/bitkojine/CartGuard/actions/workflows/quality.yml)
[![Block Test Doubles](https://github.com/bitkojine/CartGuard/actions/workflows/testdouble-block.yml/badge.svg)](https://github.com/bitkojine/CartGuard/actions/workflows/testdouble-block.yml)
[![Secret and Token Scan](https://github.com/bitkojine/CartGuard/actions/workflows/secrets.yml/badge.svg)](https://github.com/bitkojine/CartGuard/actions/workflows/secrets.yml)
[![Deploy GitHub Pages](https://github.com/bitkojine/CartGuard/actions/workflows/pages.yml/badge.svg)](https://github.com/bitkojine/CartGuard/actions/workflows/pages.yml)

## What CartGuard Is

CartGuard provides deterministic, source-backed compliance preflight checks for ecommerce product launches.

Current repository focus:
- TypeScript monorepo for spec, engine, AI interface, CLI, and VSCode demo extension.
- Data-driven VSCode slideshow demo for internal/external launch workflows.
- Strict repository quality controls (lint/guards/tests) in pre-commit and CI.

Operating principles:
- Recommendation system, not legal determination.
- Traceable evidence and confidence-labeled outputs.
- Deterministic builds and reproducible setup (`pnpm`, lockfile-driven).

## Monorepo Layout

```text
packages/
  spec/              Domain schemas and policy contracts
  engine/            Rule evaluation runtime
  ai/                Generator interface
  cli/               cartguard CLI
  example/           Example integration + sample inputs
  vscode-extension/  VSCode extension demo + E2E
scripts/             Guard and utility scripts
docs/                Public GitHub Pages content
research/            Source-backed research notes
```

## Requirements

- Node.js `>=20`
- pnpm `9.15.4` (pinned in `packageManager`)

## Quickstart (Deterministic)

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Run full repository gate:

```bash
pnpm check
```

## VSCode Demo (Primary Product Demo Path)

The extension is the fastest way to demo CartGuard end-to-end.

### Commands

- `CartGuard: Run Demo`
- `CartGuard: Validate JSON Files`
- `CartGuard: Open Process View`
- `CartGuard: Open Slideshow Demo`
- `CartGuard: Demo Next Step`
- `CartGuard: Reopen Slideshow Demo`

### Automated E2E

```bash
pnpm --filter cartguard-vscode-extension test:e2e
```

### Slow/manual slideshow E2E

```bash
pnpm --filter cartguard-vscode-extension test:e2e:slow
```

Behavior:
- opens Extension Development Host
- runs demo flow
- waits for manual `Continue` clicks
- closes VSCode at final step

### Demo runtime data files

The slideshow and scenario model are file-driven (not hardcoded):
- `packages/vscode-extension/demo/slideshow.json`
- `packages/vscode-extension/demo/workflow-batch.json`
- `packages/vscode-extension/demo/sample-listing.json`
- `packages/vscode-extension/demo/rules.json`
- `packages/vscode-extension/demo/applicability.json`

## Local Setup (New Machines)

Use this flow for team laptops/workstations.

1. Install prerequisites:
- Node.js `>=20`
- pnpm `9.15.4`
- VS Code desktop

2. Clone and bootstrap:

```bash
git clone https://github.com/bitkojine/CartGuard.git
cd CartGuard
pnpm install --frozen-lockfile
```

3. Build workspace:

```bash
pnpm build
```

4. Package the extension (cross-platform output path inside repo):

```bash
pnpm --filter cartguard-vscode-extension exec vsce package --no-dependencies -o packages/vscode-extension/cartguard.vsix
```

5. Install the VSIX in VS Code:

Option A: VS Code CLI installed

```bash
code --install-extension packages/vscode-extension/cartguard.vsix --force
```

Option B: VS Code UI (recommended fallback)
- Open VS Code
- Open Extensions view
- Click `...` (top-right in Extensions view)
- Click `Install from VSIX...`
- Select `packages/vscode-extension/cartguard.vsix`

6. Open the demo workspace folder in VS Code:
- `packages/vscode-extension/demo`

7. Reload VS Code window and run:
- `CartGuard: Run Demo`
- `CartGuard: Open Slideshow Demo`

Optional fast verification:

```bash
pnpm --filter cartguard-vscode-extension test:e2e
```

### Local setup troubleshooting

- `code: command not found`
  - Use the VS Code UI install path (`Install from VSIX...`) instead of CLI.

- `vsce` packaging fails
  - Re-run:
    ```bash
    pnpm install --frozen-lockfile
    pnpm --filter cartguard-vscode-extension build
    pnpm --filter cartguard-vscode-extension exec vsce package --no-dependencies -o packages/vscode-extension/cartguard.vsix
    ```

- CartGuard commands not visible in Command Palette
  - Confirm extension is installed (`@installed cartguard` in Extensions search).
  - Run `Developer: Reload Window`.
  - Ensure you opened folder `packages/vscode-extension/demo`.

## CLI Quick Usage

Validate sample product:

```bash
pnpm --filter @cartguard/cli build
node packages/cli/dist/src/bin/cartguard.js validate \
  packages/example/sample-product.json \
  --policy packages/example/sample-policy.json
```

JSON output:

```bash
node packages/cli/dist/src/bin/cartguard.js validate \
  packages/example/sample-product.json \
  --policy packages/example/sample-policy.json \
  --json
```

## Quality and Policy Gates

Repository gate scripts:
- `pnpm lint`
- `pnpm guard`
- `pnpm check`

Guard highlights:
- no tracked `.js/.mjs/.cjs` sources
- no explicit `any`
- no TypeScript code comments
- no test doubles (mocks/stubs/fakes/spies)
- page and research data integrity checks

No-test-doubles enforcement:
- pre-commit: `pnpm guard:test-doubles-staged`
- CI: `pnpm guard:test-doubles`
- config: `.testdouble-block.json`

If blocked by test-double policy, document intent in:
- `docs/why-i-wanted-test-doubles.md`

## CI Workflows

- `quality.yml` (lint + guards + tests)
- `testdouble-block.yml` (policy enforcement)
- `secrets.yml` (secret/token scan)
- `pages.yml` (GitHub Pages deploy)

## Live Docs

- Sales: https://bitkojine.github.io/CartGuard/sales/
- Ops: https://bitkojine.github.io/CartGuard/ops/

## Contributing

Before opening a PR:

```bash
pnpm check
```

Expected:
- all guards pass
- tests pass
- no policy violations
- docs/data changes remain wired and validated

## License

MIT — see `LICENSE`.
