# Domain Model and Language (DDD)

Canonical problem-space language for CartGuard.  
Last updated from current research pass: `2026-02-23`.

## Product archetypes

- `non-radio mains`: non-radio electrical products in LVD voltage range.
- `battery non-radio`: non-radio electronic products, often EMC-relevant, sometimes outside LVD voltage scope.
- `radio-enabled`: products with intentional radio functions (Wi-Fi/Bluetooth/cellular), treated as RED scope.

## Rule source boundaries

- `legal`: obligations from harmonization legislation (RED/LVD/EMC framing and evidence expectations).
- `marketplace`: operational platform workflows (Amazon MYC/Account Health document-request flow).
- `recommendation`: CartGuard guidance and prioritization logic.
- `unknown`: explicit state when evidence or scope is insufficient for safe automated conclusion.

## Core entities

- `Product`: sellable SKU/model with archetype, attributes, and target market.
- `Listing`: channel-specific representation of product data (example: Amazon.de attributes).
- `EvidenceArtifact`: DoC, technical documentation index, test metadata, manuals, labels.
- `Rule`: machine-evaluable requirement record with trigger, checks, and confidence.
- `Finding`: evaluation output (`present`, `missing`, `mismatched`, `stale`, `unknown`, `not_applicable`) + blocking flag.
- `DecisionGate`: forced choice (`ship`, `hold`, `escalate`) with recommendation and tradeoff context.
- `RoleOutput`: role-specific action package for Ops, Compliance, Engineering, Responsible Person.

## Ubiquitous terms

- `DoC`: EU Declaration of Conformity.
- `Technical File`: living evidence package supporting conformity claims.
- `Traceability`: consistency of model identity and economic-operator identity across artifacts.
- `Applicability`: expected instrument/rule set for product context.
- `Readiness`: pre-submission state combining legal evidence gaps and marketplace risk signal.

## Deterministic applicability logic in this model

- `radio-enabled` -> expects RED-oriented evidence and RED-context safety/EMC expectations.
- `non-radio mains` -> expects LVD/EMC-oriented evidence bundle.
- `battery non-radio` -> expects EMC-oriented evidence and escalates low-confidence scope edges.
- Low confidence classification -> output `unknown` and route to human review.

## Minimum evidence model

- Product identity and traceability fields.
- Applicable rules/standards references.
- Risk/safety information and user instruction coverage (including destination language checks where modeled).
- Test/report references and critical evidence links.
- Label and economic-operator consistency fields.

## Responsibilities modeled

- `manufacturer`: primary owner of technical documentation and DoC production.
- `importer` / `responsible person`: traceability and authority-response readiness owner in workflow handoff.
- `ops`: listing readiness and submission timing owner.
- `compliance`: rule interpretation, approval, and escalations owner.
- `engineering`: data/feed consistency owner across listing and evidence metadata.

## Decision policy

- CartGuard does not make legal determinations.
- CartGuard must separate `legal`, `marketplace`, and `recommendation` in meaningful findings.
- CartGuard must mark unsupported conclusions as `unknown` rather than over-assert.
- Gate outcomes are explicit and auditable (`ship`, `hold`, `escalate` + rationale).
