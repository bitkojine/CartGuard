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

## Domain Richness Score (9/10)
**Justification:** The ubiquitous language is clearly reflected in types (`ListingInput`, `EvidenceDocument`, `ApplicabilityRule`). Complex business invariants (like duplicate claim detection and applicability resolution) are explicitly modeled in the engine. Primitive obsession has been reduced by introducing branded ID types. State transitions for verification are explicitly modeled via `EvidenceVerificationEvent`, and the `Listing` and `Product` concepts have been properly split. Data and behavior are separated (functional core).

## Modeling Gaps

### 1. Primitive Obsession for Identifiers and Keys
- **Description:** IDs like `rule_id`, `listing_id`, and `document_key` are typed as `z.string().min(1)`.
- **Status:** **RESOLVED.** Adopted Branded Value Objects (e.g., `RuleIdSchema.brand("RuleId")`). 

### 2. Implicit Evidence Lifecycle / Verification Workflow
- **Description:** `EvidenceDocument` tracks `status` and `last_verified_at`, but doesn't model *how* verification happens or expires.
- **Status:** **RESOLVED.** Created `EvidenceVerificationEvent` to track status transitions explicitly.

### 3. Opaque Product to Listing Relationship
- **Description:** `ListingInput` contains both `listing_id` and `product_id/version`, blending marketplace-specific listing state with core product identity.
- **Status:** **RESOLVED.** Separated `Product` Aggregate and embedded inside `Listing` Aggregate.

## Domain Maturity Level
**Level 5: Strategic Domain Core**
The domain accurately captures complex industry rules (applicability tokens, triggers, requirement types) and expresses them clearly in code. It leverages a rigorous type system and functional purity. Business concepts like Product, Listing, and Evidence verification are isolated and explicit leveraging branded aggregate boundaries seamlessly.

---
- **Last Reviewed:** 2026-02-24
- **Trend:** Improving
