# CartGuard

Policy-driven TypeScript tooling and public operations docs for launch-readiness checks in ecommerce workflows.

[![Quality Gates](https://github.com/bitkojine/CartGuard/actions/workflows/quality.yml/badge.svg)](https://github.com/bitkojine/CartGuard/actions/workflows/quality.yml)
[![Block Test Doubles](https://github.com/bitkojine/CartGuard/actions/workflows/testdouble-block.yml/badge.svg)](https://github.com/bitkojine/CartGuard/actions/workflows/testdouble-block.yml)
[![Secret and Token Scan](https://github.com/bitkojine/CartGuard/actions/workflows/secrets.yml/badge.svg)](https://github.com/bitkojine/CartGuard/actions/workflows/secrets.yml)
[![Deploy GitHub Pages](https://github.com/bitkojine/CartGuard/actions/workflows/pages.yml/badge.svg)](https://github.com/bitkojine/CartGuard/actions/workflows/pages.yml)

## What This Repo Contains

- A pnpm TypeScript monorepo with core packages for schema validation, policy evaluation, AI interface, and CLI tooling.
- A public GitHub Pages site in `docs/` split into:
  - sales pages (`/sales`) for external buyers
  - ops pages (`/ops`) for operating manual content and research-backed claims
- Guard scripts that enforce repository rules before merge.

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
pnpm install
pnpm build
pnpm test
```

Run full repository gate (lint + all guards + tests):

```bash
pnpm check
```

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
