---
id: technical-feasibility-pilot-proof-engine-2026-02-23
title: Technical Feasibility - Pilot Proof Engine (APAC to EU)
owner: cartguard-core
status: reviewed
created_at: 2026-02-23
last_verified_at: 2026-02-23
confidence: medium
geography: ["APAC", "EU", "China", "Germany"]
industry_scope: ["b2b saas", "developer tools", "ecommerce compliance workflow"]
summary: Conditional Go verdict: a 5-7 person TypeScript team can build a credible pilot proof engine in 12 months with narrow scope, deterministic checks, and trustworthy metrics.
source_count: 13
primary_sources_required: true
---

## 1) Executive Verdict
Conditional Go. A 5-7 person TypeScript team can build this in 12 months if scope remains narrow, rules stay explicit config (not legal logic), and metrics/evidence trust is prioritized early.

## 2) Core Problem Decomposition
1. Schema modeling of required evidence by country/channel/category.
2. Ingestion and mapping from CI, CSV, PIM/CMS exports.
3. Deterministic evaluation engine with explicit pass/missing/invalid outcomes.
4. Append-only metrics/event stream for baseline/endline integrity.
5. Report generation from run data with source-linked requirement references.
6. Low-friction integration paths (GitHub Action, CLI, CSV first).
7. Trust surface: transparent logs, no silent fixes, anti-gaming controls.

## 3) Feasibility Snapshot
- High feasibility: CI integration, deterministic checks, report generation.
- Medium feasibility: evidence source rendering, PIM integrations, metrics integrity.
- Lower feasibility (defer): deep direct marketplace APIs and broad multi-jurisdiction coverage.

## 4) Buildability Guidance
- Start with one country + one vertical + one channel pathway.
- Keep requirement logic in versioned data, not hardcoded branches.
- Treat each evaluation run as immutable with rule-version hash.
- Freeze pilot cohorts for baseline/endline to prevent metric drift.

## 5) 30/60/90 Technical Plan
### 30 Days
- Germany electronics rulepack v1 (5-10 checks).
- GitHub Action + CLI for JSON/CSV checks.
- JSON to HTML pilot report v0.

### 60 Days
- Append-only `EvaluationRun` and event stream.
- Baseline/endline automation and coverage metrics.
- CSV mapping workflow for non-engineering operators.

### 90 Days
- One real integration beyond CSV (PIM/export path).
- Stronger report package with source appendix and run IDs.
- Rulepack regression harness and false-positive tracking.

## 6) Risks That Can Kill Trust Fast
- High false-positive rates.
- Silent rule changes during pilots.
- Incomplete cohort evaluation presented as improvement.
- Over-claiming legal certainty.

## 7) What To Stop Doing Immediately
- Do not ingest full legal docs/PDFs in MVP.
- Do not report pilot improvement without frozen cohort + run IDs.
- Do not mix legal interpretation into rule logic.
- Do not expand to many countries/categories before one wedge is stable.

## 8) What Engineers Can Ship This Week
- Minimal TS evaluator for missing evidence fields.
- GitHub Action wrapper with fail/warn modes.
- CSV -> normalized listing input path.
- Deterministic summary JSON -> HTML report.

## 9) Kill Criteria
Consider pivot/reposition if, after focused execution:
- Customers cannot provide structured evidence metadata.
- Integration friction stays high across qualified pilots.
- Rule maintenance load exceeds team capacity.
- Pilot metrics are repeatedly contested as untrustworthy.

## Source Table
- https://docs.github.com/actions
- https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- https://docs.github.com/articles/getting-started-with-github-actions
- https://betterstack.com/community/guides/observability/opentelemetry-collector-components/
- https://dataworkz.de/blog/building-in-compliance-in-your-ci-cd-pipeline-with-conftest/
- https://www.akeneo.com/blog/pim-data-governance/
- https://galileo.ai/blog/scaling-ai-guardrails-architecture-patterns
- https://sprinto.com/blog/vanta-vs-drata-vs-delve/
- https://taxation-customs.ec.europa.eu/customs/eu-customs-union-facts-and-figures/e-commerce-product-compliance-and-safety_en
- https://www.europarl.europa.eu/doceo/document/A-10-2025-0133_EN.html
- https://www.packnode.org/en/e-commerce/germany-ecommerce-packaging-law-2025
- https://www.symanty.com/blog/our-blog-1/how-much-does-it-cost-to-be-a-compliant-seller-in-europe-in-2025-12
- https://newsroom.fedex.com/newsroom/europe-english/fedex-survey-reveals-85-of-apac-smes-confident-in-europe-trade-growth
