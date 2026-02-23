# CartGuard

Spec-driven compliance-check tooling for cross-border ecommerce launches, with a VSCode demo extension and public docs.

[![Quality Gates](https://github.com/bitkojine/CartGuard/actions/workflows/quality.yml/badge.svg)](https://github.com/bitkojine/CartGuard/actions/workflows/quality.yml)
[![Block Test Doubles](https://github.com/bitkojine/CartGuard/actions/workflows/testdouble-block.yml/badge.svg)](https://github.com/bitkojine/CartGuard/actions/workflows/testdouble-block.yml)
[![Secret and Token Scan](https://github.com/bitkojine/CartGuard/actions/workflows/secrets.yml/badge.svg)](https://github.com/bitkojine/CartGuard/actions/workflows/secrets.yml)
[![Deploy GitHub Pages](https://github.com/bitkojine/CartGuard/actions/workflows/pages.yml/badge.svg)](https://github.com/bitkojine/CartGuard/actions/workflows/pages.yml)

## What This Repo Contains

- TypeScript monorepo packages for domain schemas, rule evaluation, AI scaffolding, CLI tooling, and a VSCode extension.
- A public GitHub Pages site in `docs/` for sales and ops/research content.
- Guard scripts and CI gates that enforce repo policy before merge.

## Live Site

- Sales site: https://bitkojine.github.io/CartGuard/sales/
- Ops manual: https://bitkojine.github.io/CartGuard/ops/

## Core Principles

- Recommendations only. No legal determinations.
- Claims must be source-backed and confidence-labeled.
- Repository quality gates are mandatory for commit and CI.
- Test doubles are blocked by policy (details below).

## Monorepo Structure

```text
packages/
  spec/      Domain schemas and policy contracts
  engine/    Validation runtime and policy checks
  ai/        Generator interface
  cli/       cartguard CLI
  example/   Example integration and sample inputs
  vscode-extension/ VSCode extension for demo + visualization
docs/
  assets/    Research/careers data files for site rendering
  ops/       Operations manual pages
  sales/     Buyer-facing pages
research/
  entries/   Source-backed research notes
scripts/
  *.mts      Guard and utility scripts
```

## Requirements

- Node.js `>=20`
- pnpm `9.x`

## Quickstart

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Run full repository gate (lint + all guards + tests):

```bash
pnpm check
```

## VSCode Extension Demo

The extension is currently the fastest way to demo CartGuard end-to-end.

### Commands exposed by the extension

- `CartGuard: Run Demo`
- `CartGuard: Validate JSON Files`
- `CartGuard: Open Process View`
- `CartGuard: Open Slideshow Demo`
- `CartGuard: Demo Next Step`

### Run automated E2E demo

From repo root:

```bash
pnpm --filter cartguard-vscode-extension test:e2e
```

What it does:

- launches an Extension Development Host
- runs the demo commands
- verifies outputs
- closes the VSCode test window after slideshow completion
- reads slideshow/runtime data from `packages/vscode-extension/demo/*.json`

### Run slow/manual slideshow demo

From repo root:

```bash
pnpm --filter cartguard-vscode-extension test:e2e:slow
```

Slow mode behavior:

- step delays are enabled
- slideshow waits for manual Continue clicks
- host remains open for a hold window (`CARTGUARD_E2E_HOLD_OPEN_MS`)
- once final slideshow step is completed, the window closes automatically

You can override timing:

```bash
CARTGUARD_E2E_STEP_MS=1800 \
CARTGUARD_E2E_HOLD_OPEN_MS=180000 \
CARTGUARD_E2E_MANUAL_CONTINUE=1 \
pnpm --filter cartguard-vscode-extension test:e2e
```

### Run in browser VS Code (Codespaces, internal team)

This repo includes a ready-to-use devcontainer at:

- `/Users/name/trusted-git/public-repos/CartGuard/.devcontainer/devcontainer.json`

What it does:

- opens workspace at `packages/vscode-extension/demo`
- installs dependencies
- builds the extension
- packages and installs the extension into VS Code web

Manual setup command (if you need to rerun in Codespaces terminal):

```bash
pnpm demo:web:setup
```

Then run in Command Palette:

- `CartGuard: Open Slideshow Demo`

## Command Reference

- `pnpm lint`:
  - Lints TypeScript in `packages/**/*.{ts,mts}` and `scripts/**/*.{ts,mts}`.
- `pnpm guard`:
  - Runs all repository guard scripts.
- `pnpm check`:
  - Runs `lint`, `guard`, then workspace tests.

### Guard Commands

- `pnpm guard:nav` checks required top-nav links.
- `pnpm guard:warning` enforces ops warning banner presence/content.
- `pnpm guard:css-refresh` enforces CSS refresh script/button wiring.
- `pnpm guard:no-js` blocks tracked `.js/.mjs/.cjs` files.
- `pnpm guard:no-any` blocks explicit `any` in tracked TypeScript files.
- `pnpm guard:no-comments` blocks comments in tracked TypeScript code/tests.
- `pnpm guard:research-data` validates research data schema/link integrity.
- `pnpm guard:page-data` validates Research/Proof/Careers page data wiring.
- `pnpm guard:test-doubles` blocks test-double usage across tracked `.ts`/`.tsx` files.
- `pnpm guard:test-doubles-staged` blocks test-double usage in staged `.ts`/`.tsx` files only.

## No Test Doubles Policy

This repository blocks mocks, stubs, fakes, spies, and related patterns.

### Where it is enforced

- Pre-commit hook (`.husky/pre-commit`) runs:
  - `pnpm guard:test-doubles-staged`
- CI workflow (`.github/workflows/testdouble-block.yml`) runs:
  - `pnpm guard:test-doubles`

### Scope behavior

- **Staged mode** (`guard:test-doubles-staged`): checks only staged files.
- **Repo mode** (`guard:test-doubles`): checks all tracked files in git.

### Config

Use `.testdouble-block.json` to tune behavior:

- `ignore`: directory prefixes to skip
- `allow_files`: explicit file allowlist
- `patterns`: additional regex patterns
- `disabled_patterns`: disable built-in pattern IDs

Ignored by default: `node_modules/`, `dist/`, `build/`, `coverage/`.

### Required documentation if blocked

If this guard blocks your commit, document intent in:

- `docs/why-i-wanted-test-doubles.md`

## CLI Usage

Build and run the CLI:

```bash
pnpm --filter @cartguard/cli build
node packages/cli/dist/src/bin/cartguard.js validate \
  packages/example/sample-product.json \
  --policy packages/example/sample-policy.json
```

JSON output mode:

```bash
node packages/cli/dist/src/bin/cartguard.js validate \
  packages/example/sample-product.json \
  --policy packages/example/sample-policy.json \
  --json
```

Generate output from sample input:

```bash
node packages/cli/dist/src/bin/cartguard.js generate \
  packages/example/sample-input.json \
  --out packages/example/generated-product.json
```

Run extension-only tests:

```bash
pnpm --filter cartguard-vscode-extension test:e2e
```

## CI Workflows

- `quality.yml`: lint, guard, tests
- `testdouble-block.yml`: dedicated test-double blocker
- `secrets.yml`: secret/token scanning
- `pages.yml`: deploys `docs/` to GitHub Pages

## Contribution Checklist

Before opening a PR, run:

```bash
pnpm check
```

And confirm:

- No test doubles in `.ts/.tsx` files.
- All guards pass.
- Research/content changes keep data files and page wiring consistent.

## License

MIT — see `LICENSE`.
