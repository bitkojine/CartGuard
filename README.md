# CartGuard

**Ship compliant AI product claims.**

CartGuard is a TypeScript SDK that turns AI-generated ecommerce content into source-verified, policy-validated claims and blocks potentially non-compliant products at build time.

[Live Site](https://bitkojine.github.io/CartGuard/) • [Sales Backlog](./BACKLOG.md)

## Build Battle Script (Use This Live)

1. "We are building developer-first compliance infrastructure for AI-generated cosmetics content."
2. "CartGuard validates source-linked claims in CI and blocks potentially non-compliant listings before release."
3. "We enter through engineering teams first, then expand to compliance and operations. This is a Stripe-style go-to-market path."
4. "If cosmetics does not validate fast, we pivot into adjacent regulated claim workflows."
5. "Tonight we can show a working CLI and policy engine, not slides-only vapor."

## Event Win Readiness (Brutal)

Context: `Make Kaunas Great Again` build/pitch event on **February 22, 2026**.

Overall chance to stand out tonight: `6.6/10`

Why this is not higher:
- No customer proof yet (biggest weakness in front of judges)
- Business urgency is still argued, not proven
- Message can still drift into technical language if not tightly delivered

Scoring for tonight (0-10):
- Clear problem statement: `8.0`
- Live demo reliability: `8.1`
- Product quality for MVP stage: `7.3`
- Commercial proof: `3.8`
- Memorability of pitch: `6.7`
- Team readiness to answer hard questions: `6.4`

Likely judge reaction:
- "Strong technical execution."
- "Interesting market pain."
- "Show me proof that buyers pay and this is urgent now."

Highest ROI moves before/at the event:
1. Lead with one sentence: "We stop risky AI cosmetics claims before they go live."
2. Show the working CLI in under 60 seconds.
3. Admit unknowns directly: no pilot proof yet, currently validating buyer urgency.
4. Ask for 3 pilot intros from the room instead of pretending traction.
5. End with a concrete next step and timeline (first pilot in 30 days).

## Current Status

- Pitch-readiness score (brutal): `5.4/10`
- Repo execution score: `7.3/10`
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

## Top Product Weakness (Brutal)

The biggest weakness is not product architecture. It is missing market proof.

Today CartGuard has no public evidence that target teams will pay now for this workflow over internal tooling, manual compliance review, or agency processes. Until that proof exists, the product is credible but commercially unproven.

## Re-Rating (Brutal)

Pitch/business scores (0-10):
- Problem severity: `9.0`
- Willingness to pay now: `5.0`
- Differentiation in buyer eyes: `5.2`
- GTM readiness: `4.3`
- Investability at this stage: `4.8`

Updated pitch-readiness score: `5.4/10`

Repo/product scores (0-10):
- Codebase quality and structure: `8.2`
- Spec-driven integrity: `8.1`
- CLI and developer usability: `7.0`
- Test confidence for MVP scope: `7.1`
- Production maturity: `6.0`

Updated repo execution score: `7.3/10`

Hard truth:
- If pilot evidence is not captured soon, this remains a strong technical project with weak buying urgency.
- The next real upgrade is customer proof, not more internal engineering polish.

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
