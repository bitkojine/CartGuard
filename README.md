# CartGuard

## Current Pitch-Readiness Score: `5.8/10` (Brutal)
## Current Direction: EU cosmetics ecommerce compliance infrastructure (build-time claim gating)
## If This Wedge Fails: Pivot Options
- EU supplements / nutraceutical claim compliance
- Sustainability-claim enforcement across DTC ecommerce
- Marketplace seller-listing compliance gate
- Pricing and promotion claim compliance engine
- Cross-border localization compliance validation
- Enterprise validation API (policy engine as infrastructure)

Five seconds. No poetry.

> "CartGuard is a TypeScript SDK that turns AI-generated ecommerce content into source-verified, policy-validated claims and blocks products that could be non-compliant at build time."

That’s it. Infrastructure for trustworthy AI commerce, not another copy generator.

## Who It Is For (Primary User)

CartGuard is built for engineering teams that ship ecommerce content through code, especially:
- Mid-sized EU ecommerce platforms
- Headless commerce teams using Next.js / Node / TypeScript
- Multi-country marketplaces with cross-border listing risk
- Regulated categories (supplements, cosmetics, sustainability claims)

## Where Users Get The Most Value

The highest-value outcome is preventing potentially non-compliant products from reaching production.

CartGuard gives teams:
- Build-time CI enforcement instead of post-publication legal cleanup
- Source-linked, auditable claims for every product assertion
- Policy-based controls that map to country/category requirements
- A shared contract between legal/compliance and engineering

## Brutal Business Case Review

No optimism fluff. Current viability depends on execution speed, proof of enforcement quality, and distribution.

Scores (0-10):
- Problem severity: `9/10`  
  EU ecommerce compliance pressure is real and increasing.
- Urgency to buy: `7/10`  
  Pain is high, but many teams still delay until legal/commercial pressure becomes acute.
- Product differentiation today: `6/10`  
  Strong spec-first angle, but buyers can still see this as \"yet another AI tooling layer\" unless outcomes are proven.
- Technical defensibility (near-term): `7/10`  
  Typed claims + policy engine + CI gating is a solid foundation; moats are weak until real regulatory adapters and integrations exist.
- Go-to-market difficulty: `4/10`  
  Selling infra + compliance into mid-market ecommerce is slow, multi-stakeholder, and trust-heavy.
- Adoption friction: `5/10`  
  Requires policy setup, claim discipline, and workflow changes across engineering/content/compliance.
- Revenue potential (if executed): `8/10`  
  Clear expansion path: API, enterprise policy packs, marketplace enforcement, audits.
- Current investability (MVP stage): `5/10`  
  Good thesis, but needs proof: pilot logos, measurable risk reduction, and integration velocity.

Overall viability score: `6.4/10` (promising but not yet de-risked)

Hard truth:
- Without concrete proof that CartGuard prevents costly compliance incidents better than internal tooling, this stays a \"nice-to-have.\"
- To become a must-have, CartGuard must show direct business impact: fewer blocked launches, fewer legal escalations, faster compliant publishing, and clear auditability for regulators/partners.

## Problem Statement

AI-generated ecommerce content is scaling quickly, but claims are often unsourced, unverifiable, and non-compliant. In the EU, that creates direct regulatory risk across anti-greenwashing rules, consumer protection, and cross-border listing obligations.

CartGuard treats compliance as code:
- Claims are typed and source-linked.
- Validation is policy-driven and auditable.
- Enforcement happens in developer workflows and CI.

## Market Positioning

CartGuard is developer-first AI infrastructure for ecommerce teams that need trust, auditability, and policy enforcement at build time.

Primary users:
- Mid-sized EU ecommerce platforms
- Headless commerce teams (Next.js / Node / TypeScript)
- Multi-country marketplaces
- Regulated verticals (supplements, cosmetics, sustainability-led products)

## Architecture Overview

Monorepo structure:

```text
/packages
  /spec     Domain schemas + policy definitions (source of truth)
  /engine   Policy-driven validation execution
  /ai       Generation interfaces + mock adapter
  /cli      cartguard command line entrypoint
  /example  Reference integration + CI simulation
```

Design principles:
- Spec-first domain modeling
- Strict TypeScript + runtime schema validation
- Policy-driven enforcement (no hidden constants)
- Clean separation of spec from execution

## GitHub Pages

This repository includes a static marketing site in `/docs` and a deploy workflow in `/.github/workflows/pages.yml`.

Publishing flow:
1. Push to `main`.
2. GitHub Actions runs `Deploy GitHub Pages`.
3. The `docs/` artifact is deployed to GitHub Pages.

If this is a new repository, set Pages source to `GitHub Actions` in repository settings.

## Spec-Driven Philosophy

CartGuard encodes business rules in explicit schemas and policy objects, not buried in handlers.

- `ClaimSchema` defines source-linked claim shape.
- `ProductContentSchema` defines listing content integrity.
- `ValidationPolicySchema` defines runtime policy constraints.
- Engine logic consumes validated policy + content and emits structured results.

This gives traceable validation decisions and deterministic CI gating.

## Example Policy Configuration

```json
{
  "minConfidence": 0.75,
  "allowedCategories": ["sustainability", "pricing", "general"],
  "requireSourceForCategories": ["sustainability", "health", "pricing"],
  "maxClaimsPerProduct": 10
}
```

## CLI Usage

Install dependencies:

```bash
pnpm install
```

Build all packages:

```bash
pnpm build
```

Validate a product against a policy:

```bash
node packages/cli/dist/src/bin/cartguard.js validate \
  packages/example/sample-product.json \
  --policy packages/example/sample-policy.json
```

Generate content from mock adapter:

```bash
node packages/cli/dist/src/bin/cartguard.js generate \
  packages/example/sample-input.json \
  --out packages/example/generated-product.json
```

Machine-readable validation output:

```bash
node packages/cli/dist/src/bin/cartguard.js validate \
  packages/example/sample-product.json \
  --policy packages/example/sample-policy.json \
  --json
```

## Example Failing Validation Output

Example (`strict-policy.json` with `minConfidence: 0.9`):

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

The example package includes a CI-style script:

```bash
pnpm --filter @cartguard/example demo
```

Flow:
1. Generates a product payload.
2. Validates with strict policy.
3. Exits with code `1` on non-compliance.

## Testing

Node test runner is used across packages.

```bash
pnpm test
```

Coverage focus:
- Schema rejection paths
- Policy edge conditions
- Duplicate claim detection
- Confidence threshold failures

## Roadmap

- LLM and RAG adapters implementing `ContentGenerator`
- EU regulatory policy adapters (per jurisdiction/domain)
- SaaS validation API and hosted policy engine
- Marketplace-native integration layer
