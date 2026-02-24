# Domain Model Index

## Problem Space
CartGuard operates in the e-commerce product compliance and listing verification domain.

## Target Customer
Marketplace sellers, compliance teams, and potentially marketplaces themselves who need to ensure that physical products (especially consumer electronics, as evidenced by RED, LVD, and EMC directives) meet legal and marketplace-specific requirements before or while being listed for sale.

## Core Business Capabilities
- **Product Content Verification:** Validating product marketing claims against documented evidence based on confidence and category policies.
- **Rule Applicability Engine:** Determining which compliance rules (e.g., EU Directives) apply to a specific product based on its physical/technical characteristics (e.g., is it radio equipment, operating voltage).
- **Listing Compliance Evaluation:** Checking a product listing against a catalog of applicable rules to ensure all required evidence documents are present, valid, and not stale.

## Current Domain Concepts
- **Entities:** `Claim`, `ProductContent`, `ListingInput`, `RuleRecord`, `ApplicabilityRule`
- **Value Objects:** `ComplianceToken`, `ClaimCategory`, `ValidationPolicy`, `RequirementType`, `SourceType`, `ConfidenceLevel`, `ValidationStatus`, `EvidenceDocument`, `SubmissionMetadata`
- **Aggregates:** `RuleCatalog`, `ApplicabilityCatalog`, `ResearchIndex`
- **Domain Services:** `validateProductContent`, `evaluateListingAgainstRuleCatalog`, `getApplicabilityState` (in `@cartguard/engine`)
- **Policies / Rules:** `ValidationPolicySchema` (bounds on confidence and allowed claims), `ApplicabilityRuleSchema` (if-then logic for directives)

## Domain Purity Score (10/10)
**Justification:** The domain layer (`@cartguard/spec` and `@cartguard/engine`) is completely isolated from infrastructure. It does not import `vscode`, `fs`, network libraries, or UI frameworks. Time and randomness are deterministic. Business logic functions take pure data structures as input and return pure result structures. The boundary is strictly enforced using `zod` for input validation.

**Caveats:** Purity doesn't equal correctness. The spec is isolated, but the *contracts* it defines must be kept in sync across `@cartguard/spec`, `@cartguard/engine`, `@cartguard/vscode-extension`, example fixtures, and demo data. Purity provides isolation, not integration guarantees.

## Domain Richness Score (6/10)
**Justification:** The ubiquitous language is present but not deeply proven. We have types like `ListingInput`, `EvidenceDocument`, and `ApplicabilityRule`, and we explicitly model verification events. Primitive obsession was partially addressed with branded IDs.

**Weaknesses:**
- **Branded types are newly introduced and untested.** No production usage to validate they prevent actual bugs or just add complexity.
- **Product ↔ Listing separation is conceptually sound but breaks integration.** We just discovered demo fixtures were out of sync (d649aaf broke E2E tests). This cost a fix commit.
- **No version strategy or adapter layer.** Schema changes are breaking changes. There's no migration path, compatibility mode, or gradual rollout strategy.
- **Missing invariants:** `Listing` doesn't validate that `product` ID matches some canonical registry. `RuleRecord` references `document_keys` that may not exist in any `Product`. No foreign-key-like consistency.
- **Complex business rules are narrowly scoped:** Applicability resolution works for RED/LVD/EMC but hasn't been stress-tested against real-world rule complexity (multi-part jurisdictions, product families, temporal rules).
- **Evidence lifecycle incomplete:** `EvidenceVerificationEvent` exists but lacks expiry logic, re-verification scheduling, or degraded-state handling.

## Modeling Gaps & Architectural Debt

### 1. Primitive Obsession for Identifiers and Keys
- **Description:** IDs like `rule_id`, `listing_id`, and `document_key` are typed as `z.string().min(1)`.
- **Status:** **PARTIALLY RESOLVED.** Introduced Branded Value Objects (e.g., `RuleIdSchema.brand("RuleId")`), but this is *untested in production*. We don't know yet if it meaningfully prevents bugs or just adds type-system noise. Branded types can create false confidence without strong evidence.

### 2. Implicit Evidence Lifecycle / Verification Workflow
- **Description:** `EvidenceDocument` tracks `status` and `last_verified_at`, but doesn't model *how* verification happens, when it expires, or how to handle stale/ambiguous evidence.
- **Status:** **PARTIALLY RESOLVED.** Added `EvidenceVerificationEvent` for explicit transitions, but the domain still lacks:
  - Expiry TTL enforcement
  - Re-verification scheduling rules
  - Degraded-state handling (e.g., "warning" vs "error")
  - Conflict resolution (multiple verifiers disagree)

### 3. Opaque Product to Listing Relationship
- **Description:** `ListingInput` contains both `listing_id` and `product_id/version`, blending marketplace-specific listing state with core product identity.
- **Status:** **CONCEPTUALLY RESOLVED, OPERATIONALLY FRAGILE.** We separated `Product` Aggregate and embedded inside `Listing`. This is architecturally correct but revealed a process gap: **schema changes break demo fixtures and test data automatically. We have no sync mechanism**. Cost: 1 breaking commit + 1 fix commit on day 1 of the change.

### 4. No Referential Integrity or Aggregate Boundaries (NEW)
- **Description:** A `RuleRecord` can reference `document_keys` that don't exist in any real or sample `Product`. A `Listing` can embed a `Product` with unrelated IDs. No canonical registries.
- **Status:** **UNADDRESSED.** The domain enforces no invariants across aggregates. It's possible to have logically broken configurations that parse successfully.

### 5. Schema Versioning & Integration Contracts (NEW)
- **Description:** When the spec changes, all downstream code (fixtures, examples, integrations) must be manually updated. No clear contract boundaries or deprecation path.
- **Status:** **UNADDRESSED.** We need:
  - Fixture generation from schema (e.g., `schema.example()` in Zod)
  - Breaking-change detection in CI
  - Adapter layer for old → new format
  - Multi-version support during migrations

## Domain Maturity Level
**Level 3: Established Domain, Early Volatility**

**Strengths:**
- Accurately captures key industry rules (RED, LVD, EMC regulatory tokens)
- Sound functional architecture (pure core, no infrastructure bleed)
- Reasonable aggregate decomposition (Product vs Listing vs Rule)
- Types are explicit and validated with Zod

**Weaknesses & Risks:**
- **High coupling between spec and integration layers.** Fixture and demo data aren't automatically kept in sync; we discovered this through test failure, not design.
- **Untested architectural patterns.** Branded types and Product/Listing separation are conceptually right but unproven. First refactor immediately broke test fixtures.
- **No invariant enforcement across aggregates.** `RuleRecord` and `Product` can reference non-existent IDs without validation.
- **Evidence lifecycle is incomplete.** Verification model exists but lacks expiry, re-check scheduling, and degradation states.
- **Implicit breaking-change culture.** We handle breaking changes by fixing follow-up bugs in later commits, not by design.

**Path to Level 4 (Mature):**
1. Add cross-aggregate validation (e.g., `rule.required_evidence_keys` ⊆ `product.evidence_documents[*].document_key`)
2. Implement fixture generation from schema (eliminate manual sync burden)
3. Add breaking-change detection to CI (fail on incompatible schema evolution)
4. Complete evidence lifecycle with expiry, conflict resolution, and degraded states
5. Validate branded types catch real bugs in integration tests before calling them "solved"

---
- **Last Reviewed:** 2026-02-24 (Post-refactor assessment)
- **Trend:** Improving conceptually, regressing operationally
- **Red Flags:** 
  - Breaking change on 2026-02-24 (d649aaf) required fixture fix on same day (fe9bd58)
  - No mechanism to prevent or catch schema drift in fixtures
  - Untested architectural patterns (branded types, aggregate split) being counted as "solved"
- **Next Review:** After completing Level 4 maturity work (cross-aggregate validation, fixture generation, CI breaking-change detection)
