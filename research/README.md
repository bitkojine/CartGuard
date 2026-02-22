# CartGuard Fact-Checked Research

This folder stores source-backed research used in CartGuard website content and pitch materials.

## Purpose
- Keep market claims grounded in primary or high-credibility sources.
- Track confidence level and verification status for every claim.
- Make updates and re-verification explicit over time.

## Required Metadata For Every Research Doc
Use this front matter format at the top of each file:

```yaml
id: short-unique-id
title: Human readable title
owner: person-or-team
status: draft|reviewed|approved
created_at: YYYY-MM-DD
last_verified_at: YYYY-MM-DD
confidence: high|medium|low
geography: ["EU", "APAC", "country-name"]
industry_scope: ["ecommerce", "consumer", "cross-border"]
summary: one-sentence summary
source_count: 0
primary_sources_required: true
```

## File Layout
- `entries/` -> dated research notes and fact-check reports.
- `templates.md` -> reusable prompt + checklist.

## Quality Rules
- Prefer primary sources: EU institutions, regulators, official statistics bodies.
- If a figure is modeled, mark it as modeled and include assumptions.
- Include exact date and geography for each metric.
- Never present legal interpretation as legal advice.

## Website Integration
Website index source:
- `docs/assets/research/index.json`

Site explorer page:
- `docs/research.html`
