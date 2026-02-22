# CartGuard

**Ship compliant AI product claims.**

CartGuard is a TypeScript SDK that turns AI-generated ecommerce content into source-verified, policy-validated claims and blocks potentially non-compliant products at build time.

[Live Site](https://bitkojine.github.io/CartGuard/) • [Sales Backlog](./BACKLOG.md)

## Current Status

- Pitch-readiness score (brutal): `5.6/10`
- Repo execution score: `7.1/10`
- Current wedge: `EU cosmetics ecommerce` (build-time claim gating)

## Who This Is For

CartGuard is currently built and positioned for teams that:
- Operate EU cosmetics ecommerce listings
- Use headless TypeScript/Node workflows
- Need compliance and engineering to collaborate in CI
- Want machine-readable, auditable claim validation

Primary converting visitors:
- Head of Engineering
- Compliance / Legal lead
- Platform operations lead

## Why Teams Use CartGuard

- Prevent potentially non-compliant products from reaching production
- Enforce policy in CI, not after legal escalation
- Keep claim decisions traceable to sources and policy configuration
- Produce deterministic pass/fail outputs for internal and external audit trails

## What CartGuard Includes

- `@cartguard/spec`: domain schemas + policy contracts (source of truth)
- `@cartguard/engine`: policy-driven validation runtime
- `@cartguard/ai`: generator interfaces + mock adapter
- `@cartguard/cli`: build-time command interface
- `@cartguard/example`: reference sample content + CI simulation

Monorepo layout:

```text
/packages
  /spec
  /engine
  /ai
  /cli
  /example
```

## Quickstart

Requirements:
- Node 20+
- pnpm 9+

Install:

```bash
pnpm install
```

Build:

```bash
pnpm build
```

Test:

```bash
pnpm test
```

## CLI Usage

Validate product content against policy:

```bash
node packages/cli/dist/src/bin/cartguard.js validate \
  packages/example/sample-product.json \
  --policy packages/example/sample-policy.json
```

Generate mock AI content:

```bash
node packages/cli/dist/src/bin/cartguard.js generate \
  packages/example/sample-input.json \
  --out packages/example/generated-product.json
```

Machine-readable output:

```bash
node packages/cli/dist/src/bin/cartguard.js validate \
  packages/example/sample-product.json \
  --policy packages/example/sample-policy.json \
  --json
```

## Example Failing Output

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

## Demo CI Simulation

```bash
pnpm --filter @cartguard/example demo
```

The demo intentionally exits with code `1` when strict policy fails.

## Spec-Driven Model

Core contracts in `@cartguard/spec`:
- `ClaimSchema`
- `ProductContentSchema`
- `ValidationPolicySchema`

Engine behavior in `@cartguard/engine`:
- Validate schemas first
- Enforce policy constraints second
- Return structured `ValidationResult`

## GitHub Pages Deployment

This repository deploys static site content from `docs/` using GitHub Actions workflow:
- `/.github/workflows/pages.yml`

Deployment trigger:
- Push to `main`

Site URL:
- [https://bitkojine.github.io/CartGuard/](https://bitkojine.github.io/CartGuard/)

## Brutal Business View

Hard truth:
- Without customer proof that CartGuard reduces real compliance incidents and manual review costs, this stays a nice-to-have.
- To become must-have infra, CartGuard needs pilot evidence and quantified business impact.

Top current weaknesses:
- No published pilot outcomes yet
- No validated pricing model yet
- No proven distribution channel yet

## If Current Wedge Fails

Pivot options:
- EU supplements / nutraceutical claim compliance
- Sustainability claim enforcement across DTC
- Marketplace seller listing compliance gate
- Pricing and promotion claim compliance engine
- Cross-border localization compliance validation
- Enterprise policy engine API

## Roadmap (Near-Term)

- Secure design-partner pilots in EU cosmetics
- Add jurisdiction-aware cosmetics policy adapters
- Add first real platform integration adapter
- Publish measurable pilot outcomes

## License

MIT. See [LICENSE](./LICENSE).
