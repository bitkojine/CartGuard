# Research Template + Fact-Check Checklist

## Prompt Template (Perplexity or analyst)
Goal: verify a specific market claim for CartGuard (APAC companies entering EU markets).

Required output per claim:
1. Exact metric value.
2. Date/year.
3. Geography.
4. Source URL.
5. Confidence score (High/Medium/Low).
6. Notes on limitations.

## Fact-Check Checklist
- [ ] Primary source found.
- [ ] Metric has exact date and geography.
- [ ] Any modeled estimates are clearly labeled.
- [ ] Source is still live and accessible.
- [ ] Claim language matches source strength.
- [ ] Legal boundary disclaimer is preserved.

## Metadata Block Example
```yaml
id: apac-eu-low-value-imports-2026-02
title: APAC to EU low-value import growth signals
owner: growth-team
status: reviewed
created_at: 2026-02-23
last_verified_at: 2026-02-23
confidence: high
geography: ["EU", "China"]
industry_scope: ["ecommerce", "cross-border"]
summary: EU low-value imports and China share show strong APAC->EU flow growth.
source_count: 4
primary_sources_required: true
```
