# CartGuard

**CartGuard flags missing launch evidence for APAC ecommerce teams entering EU marketplaces before listings go live.**

[![Quality Gates](https://github.com/bitkojine/CartGuard/actions/workflows/quality.yml/badge.svg)](https://github.com/bitkojine/CartGuard/actions/workflows/quality.yml)
[![Secret and Token Scan](https://github.com/bitkojine/CartGuard/actions/workflows/secrets.yml/badge.svg)](https://github.com/bitkojine/CartGuard/actions/workflows/secrets.yml)
[![Deploy GitHub Pages](https://github.com/bitkojine/CartGuard/actions/workflows/pages.yml/badge.svg)](https://github.com/bitkojine/CartGuard/actions/workflows/pages.yml)

## Current Status (Brutal)

- `Overall pitch readiness:` **5.8/10**
- `Repo execution:` **7.6/10**
- `Biggest weakness:` repeatable pilot-to-paid conversion proof is still limited.

## What CartGuard Is

CartGuard is a spec-driven TypeScript monorepo for policy-based checks in ecommerce launch workflows.

For the current wedge, CartGuard helps teams detect **missing required documentation/evidence** before release steps.

## What CartGuard Is Not

- Not legal advice.
- Not a legal determination engine.
- Not a replacement for qualified counsel.

CartGuard provides recommendations and workflow checks only.

## Who We Are Focused On Right Now

- APAC marketplace-first sellers entering EU markets.
- First beachhead: China -> Germany, Amazon.de-focused flows.
- Team personas: Ops/compliance owner, marketplace owner, technical implementer.

## Live Site Split

- Buyer-facing flow: [Sales Site](https://bitkojine.github.io/CartGuard/sales.html)
- Internal operating manual: [Ops Site](https://bitkojine.github.io/CartGuard/index.html)

## Product Architecture

```text
AI/Listing Input
  -> Spec Validation (@cartguard/spec)
  -> Policy Checks (@cartguard/engine)
  -> Generator Interface (@cartguard/ai)
  -> CLI Integration (@cartguard/cli)
  -> CI Gate + Reports
```

## Monorepo Layout

```text
/packages
  /spec      # Domain schemas + policy contracts
  /engine    # Policy-driven validation runtime
  /ai        # Content generator interface + mock implementation
  /cli       # cartguard CLI
  /example   # Reference integration and CI demo
/docs        # GitHub Pages site (ops + sales)
/research    # Fact-checked research docs and metadata entries
/scripts     # Guardrails, CRM bootstrap, and repo checks
```

## Quickstart

Requirements:
- Node `20+`
- pnpm `9+`

Install:

```bash
pnpm install
```

Build all packages:

```bash
pnpm build
```

Run tests:

```bash
pnpm test
```

Run full quality checks (lint + guards + tests):

```bash
pnpm check
```

## CLI Usage

Build CLI first:

```bash
pnpm --filter @cartguard/cli build
```

Validate product content against policy:

```bash
node packages/cli/dist/src/bin/cartguard.js validate \
  packages/example/sample-product.json \
  --policy packages/example/sample-policy.json
```

Validate with machine-readable output:

```bash
node packages/cli/dist/src/bin/cartguard.js validate \
  packages/example/sample-product.json \
  --policy packages/example/sample-policy.json \
  --json
```

Generate mock content:

```bash
node packages/cli/dist/src/bin/cartguard.js generate \
  packages/example/sample-input.json \
  --out packages/example/generated-product.json
```

Run example CI simulation:

```bash
pnpm --filter @cartguard/example demo
```

## Validation Result Shape

```json
{
  "valid": false,
  "errors": [
    {
      "code": "POLICY_MIN_CONFIDENCE",
      "message": "Confidence 0.82 is below minConfidence 0.9",
      "path": "claims.0.confidence"
    }
  ],
  "warnings": []
}
```

## Engineering Guardrails

This repo enforces:
- strict TypeScript
- no tracked `.js/.mjs/.cjs` source files
- no explicit `any` in TypeScript code
- no code comments in TypeScript/test files (thinking goes in docs)
- required top-nav links on every page
- required brutal warning banner on ops pages
- secret scanning in CI

## Research Discipline

We keep market claims auditable via:
- `research/entries/*.md` for full notes
- metadata with confidence score, source count, owner, verification date
- website explorer at `docs/research.html`

If we cannot source a claim, we do not use it in pitch or sales materials.

## Near-Term Focus (30 Days)

1. Run paid pilots with baseline and close-out metrics.
2. Prove measurable reduction in missing-doc rate and review loop time.
3. Improve pilot-to-paid conversion evidence.
4. Tighten Germany-first rulepack and integration reliability.

## License

MIT. See [LICENSE](./LICENSE).
