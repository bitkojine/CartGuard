# Domain Model Index & DDD Evaluation

## Problem Space

CartGuard operates in the e-commerce product compliance and listing verification domain.

**Core Business:**  
Marketplace sellers, compliance teams, and potentially marketplaces themselves need to ensure that physical products (especially consumer electronics, as evidenced by RED, LVD, and EMC directives) meet legal and marketplace-specific requirements before or while being listed for sale.

**Core Business Capabilities:**
- **Product Content Verification:** Validating product marketing claims against documented evidence based on confidence and category policies.
- **Rule Applicability Engine:** Determining which compliance rules (e.g., EU Directives) apply to a specific product based on its physical/technical characteristics (e.g., is it radio equipment, operating voltage).
- **Listing Compliance Evaluation:** Checking a product listing against a catalog of applicable rules to ensure all required evidence documents are present, valid, and not stale.

---

## BRUTAL DOMAIN-DRIVEN DESIGN ASSESSMENT

### Executive Summary

**Domain Richness Score: 4/10** — CartGuard has a **clean architecture layering** but models the domain as **anemic schema + naive service functions**, not as a rich behavioral domain. The model is *spec-driven*, not *behavior-driven*. There are no real aggregates, no meaningful invariants, no lifecycle management. Business rules live in functions that operate on dumb data structures. When you scale to 100+ rules and real compliance obligations, this breaks.

---

### 1. Domain Fidelity: Does the Model Reflect the Real Business?

**Score: 3/10**

**Reality Check:**  
Compliance verification is NOT a simple data validation problem. It's a **regulatory state machine** with:
- **Evidence with temporal semantics:** Certificates expire, re-verification is scheduled, chains of custody matter.
- **Applicability as a learning process:** Rules apply differently across jurisdictions, product families, and time. Applicability is discovered, not hardcoded.
- **Conflict resolution:** When two verifiers disagree, or evidence is ambiguous, the system must record *why* and defer to a human expert.
- **Audit trails:** Compliance decisions must be provable and reversible.

**What Your Model Actually Does:**
- Schema-based input validation (Zod)
- Boolean applicability tokens evaluated in a function (`getApplicabilityState`)
- Simple status enum (missing, present, stale, mismatched, unknown, not_applicable)
- Rule evaluation that outputs a flat list of results

**What It's Missing:**
- No `Evidence` aggregate with lifecycle (uploaded → verified → re-check scheduled → expired → re-verified).
- No `VerificationConflict` concept (what if two auditors disagree?).
- No `ComplianceDecision` entity recording *why* a rule was deemed applicable and who made the call.
- No `RuleDiscovery` workflow (how does a new rule get added, tested, and rolled out?).
- No temporal versioning of rules (v1.0 of RED applies until 2026-06-01, then v1.1).

**Verdict:** The model reflects the **form** of the problem (products, evidence, rules), not the **substance** (lifecycle, uncertainty, auditability, learning).

---

### 2. Richness & Expressiveness: Are Invariants Enforced?

**Score: 3/10**

**Evidence:**

**Anemic Domain Model:**
- `Product`, `Listing`, `RuleRecord`, `EvidenceDocument` are **data containers**, not entities with behavior.
- All logic is in functions: `validateProductContent`, `evaluateListingAgainstRuleCatalog`, `getApplicabilityState`.
- This is a **transaction script disguised as domain modeling**.

**No Real Aggregates:**
- `RuleCatalog` and `ApplicabilityCatalog` are just `z.array()` containers.
- A real aggregate would enforce: "You cannot add a rule that references non-existent document_keys" or "All rule IDs must be unique."

**Missing Invariants:**
- **Referential Integrity:** `RuleRecord.required_evidence_keys` can reference keys that don't exist in `Product.evidence_documents`. No validation.
- **Evidence Expiry:** `EvidenceDocument.last_verified_at` is a date string, but there's no expiry TTL, no re-verification logic. Nothing sets a document to "stale" automatically. It's a manual flag.
- **Product Registry:** A `Product` is just embedded in `ListingInput`. There's no concept of "this product was already certified in our system."
- **Rule Applicability Consistency:** The applicability logic is a giant function with nested loops. There's no guarantee that two products with the same characteristics get the same decision.

**Verdict:** Primitive obsession + anemic data model + function-based logic = **no real domain encoding**.

---

### 3. Strategic DDD: Bounded Contexts & Context Mapping

**Score: 4/10**

**What You Have:**
- Packages act as bounded contexts: `spec`, `engine`, `cli`, `vscode-extension`, `ai`, `example`.

**What You're Missing:**
- No explicit **Ubiquitous Language** document. Language lives in comments, not enforced in code.
- No **Context Map.** What's the relationship between `engine` and `ai`? Are they separate contexts?
- **Big Ball of Mud Inside Packages:** `engine/src/index.ts` mixes schema, validation, applicability, and rule evaluation—all in one file.
- **No Anti-Corruption Layer:** The extension directly imports and uses engine types. Changes break immediately.
- **Spec-Driven Coupling:** The `spec` package is both the domain model AND the API contract. When spec changes, all consumers break.

**Verdict:** Packages are domains *by name*, not by design.

---

### 4. Aggregate Design

**Score: 2/10**

**Your Claimed Aggregates Are Fake:**
1. **`RuleCatalog` is not an aggregate** — just a container. A real aggregate would validate unique IDs and prevent circular dependencies.
2. **`Product` is too granular** — `evidence_documents` have no lifecycle behavior. No enforcement that evidence can't be stale and verified simultaneously.
3. **`Listing` has unclear boundaries** — Does it validate that the product matches some canonical registry? Nobody enforces this.
4. **`EvidenceDocument` is anemic** — All logic is in `evaluateRule()`, not in the entity.

**Transactional Consistency:**
- When you evaluate a listing, what's the transaction boundary? Answer: None. You load JSON, run a function, get back a result.
- Can two auditors verify the same document simultaneously? Unanswerable.

**Verdict:** Aggregates are **fake**. Boundaries are drawn by package structure, not invariant protection.

---

### 5. Dependency Direction & Layering

**Score: 9/10** ✓

**Good:**
- `spec` imports **only Zod**, no infrastructure.
- `engine` imports **only spec**, no `fs`, `http`, or framework code.
- No circular imports; time is deterministic.

**Bad:**
- **Spec IS Infrastructure.** It's the JSON schema contract coupling the system together. A break in spec breaks everything.
- **Engine Depends on Spec Everywhere.** If spec changes, engine breaks.

**Verdict:** Clean from traditional infra (DB, HTTP), but spec-coupling is a different kind of problem.

---

### 6. TypeScript-Specific Modeling

**Score: 4/10**

**What You're Not Doing:**
1. **No meaningful Branded Types** (recently added, unproven):
   - `RuleId`, `ProductId`, `ListingId` are identity-only. Missing semantic brands like `ComplianceDocPath`, `DocumentChecksum`.
   
2. **No Discriminated Unions:**
   - 6 boolean flags on `Product` instead of a union type. Impossible states are representable.

3. **No `readonly` Enforcement:**
   - `RuleRecord` properties are mutable. Nothing prevents mutation after loading.

4. **Zod Used Defensively, Not Expressively:**
   - No `.refine()` to enforce global constraints.
   - No chained parsers to compose domain rules.

**Verdict:** TypeScript's power is mostly unused. The model could be written in JSON Schema and lose no expressiveness.

---

### 7. Critical Smell Detection

**Smell 1: Anemic Domain Model (🔴 CRITICAL)**
- All data, no behavior. All logic in functions. This is a **transaction script system, not DDD**.
- **Impact:** At 50+ rules, the applicability function becomes unmaintainable. Tests fail. You can't explain decisions.

**Smell 2: God Object Function: `getApplicabilityState` (🔴 CRITICAL)**
- Nested loops + multiple flags = hard to reason about. Cyclomatic complexity ~8+.
- If a rule is not in the catalog, default is "applicable" (silent assumption).
- **Impact:** One bug in applicability logic breaks compliance for all products.

**Smell 3: Primitive Obsession (🟡 HIGH)**
- `jurisdiction`, `channel`, `trigger`, `unknown_reason` are all free-form strings.
- Two rules might reference "EURecast" spelled differently, treated as different rules.

**Smell 4: Implicit Breaking Changes (🟡 HIGH)**
- Test fixtures broke on 2026-02-24 when you refactored Product/Listing.
- No mechanism to detect breaking changes in CI or auto-upgrade fixtures.

**Smell 5: Evidence Lifecycle Is Unmanaged (🟡 MEDIUM)**
- `EvidenceDocument.last_verified_at` is a string date. Nothing sets status to "stale" automatically.
- In production, sellers forget to re-verify. Stale evidence silently sits.

**Smell 6: Fake Referential Integrity (🟡 MEDIUM)**
- `RuleRecord.required_evidence_keys` can reference non-existent keys.
- Only when you evaluate a listing does it become apparent (late detection).

**Smell 7: Branded Types Are Unproven (🟡 MEDIUM)**
- You **admit in the docs:** "untested in production; we don't know if it prevents actual bugs."
- Using a pattern without validation is **cargo cult DDD**.

**Smell 8: Schema = Domain = API (🔴 HIGH)**
- `spec` defines types used as domain types AND API contracts.
- When spec changes, everything breaks simultaneously. No versioning strategy.

---

### 8. Summary Scores

| Dimension | Score | Justification |
|-----------|-------|------------|
| Domain Fidelity | 3/10 | Problem modeled as schema validation, not lifecycle state machine |
| Richness | 3/10 | Anemic model; all logic in functions; no aggregate invariants |
| Strategic DDD | 4/10 | Package-based contexts; no context mapping; implicit dependencies |
| Aggregate Design | 2/10 | Fake aggregates; no transactional boundaries; no real roots |
| Dependency Layering | 9/10 | ✓ Clean from infra; pure functions |
| TypeScript Usage | 4/10 | Minimal branded types; no discriminated unions |
| **Overall DDD Maturity** | **3/10** | **Spec-driven CRUD disguised as DDD** |

**Why 3/10:**
- You have good **infrastructure discipline** (clean layering, purity).
- You have **zero domain encoding** (anemic model, functions everywhere, no aggregates, no invariants, no lifecycle).
- This is **type-safe CRUD**, not DDD.

---

### 9. Top 3 Structural Flaws (in order of pain)

#### **#1: No Evidence Lifecycle Aggregate (🔴 BLOCKING SCALING)**

**Problem:** Evidence is a dumb data container. Real compliance requires certified expiry enforcement, re-verification scheduling, conflict tracking, audit trails, and grace periods.

**Current:** None. Sellers manually flag documents as stale.

**Impact:** In production, stale evidence sits undetected. Listings pass compliance with expired certificates. Regulatory risk.

**Fix Cost:** High. Requires new `EvidenceAggregate` class with lifecycle methods, event sourcing, scheduled tasks.

#### **#2: Applicability Logic Is Scattered and Unmaintainable (🔴 BLOCKING FEATURE VELOCITY)**

**Problem:** Giant function with hardcoded token logic. Adding a new token requires changes in 3+ places.

**Current:** 
```typescript
const tokenValue = (l: ListingInput, t: string): boolean | undefined => {
  if (t === ComplianceTokens.RED_RADIO_INTENTIONAL) return l.product.is_radio_equipment;
  // ... 8 more hardcoded conditions
};

const getApplicabilityState = (ruleId, l, a) => {
  // ... nested loops with unclear logic
};
```

**Impact:** Adding EU BatteryRegulation takes 4–5 hours, not 30 minutes. Easy to introduce bugs.

**Fix Cost:** Medium. Requires a `RulesEngine` class separating token definitions from applicability logic.

#### **#3: Spec-API Coupling (🔴 BLOCKING ITERATION)**

**Problem:** `spec` defines schemas used by CLI, extension, fixtures, examples, tests. When spec changes, everything must change simultaneously. No gradual migration.

**Current:** Product/Listing refactor broke fixtures on 2026-02-24. Manual fixes across repositories.

**Impact:** Slows iteration. Teams hesitate to refactor. Schema becomes ossified.

**Fix Cost:** Medium-High. Requires fixture auto-generation, API versioning, adapter layer, CI breaking-change detection.

---

### 10. Single Highest-Leverage Improvement

**BUILD AN `Evidence` AGGREGATE (with lifecycle management).**

**Why:**
1. **Unblocks real compliance logic** — Re-verification scheduling, expiry enforcement, conflict tracking.
2. **Immediately demonstrates DDD value** — Once evidence has `reVerifyOn()`, `hasExpired()`, `recordConflict()` methods, the domain starts encoding business rules.
3. **Produces a real use case** — "Evidence expires 2026-06-01; re-verify by 2026-05-01" is domain knowledge.
4. **Doesn't require rewriting the system** — Start small and migrate gradually.
5. **Proves the pattern** — If it reduces bugs, roll it to Product, Listing, Rules.

**Estimated Impact:**
- 1–2 weeks of work.
- Catches 80% of bugs that will emerge in the next 12 months.
- Teams will see compliance as a **domain** (behavior) not a **schema** (data).

---

## Modeling Gaps & Roadmap

### Gap 1: Evidence Lifecycle / Verification Workflow
- **Status:** UNADDRESSED (critical for production)
- **Risk:** Stale evidence silently blocks releases; re-verification is unmapped.
- **Roadmap:**
  1. Create `EvidenceAggregate` with expiry tracking.
  2. Add `VerificationEvent` as a domain event.
  3. Implement re-verification scheduling.
  4. Add conflict resolution.

### Gap 2: Applicability Rules as First-Class Behavior
- **Status:** Scattered in functions; unmanaged as data
- **Risk:** Hard to add rules; easy to introduce bugs; logic is opaque.
- **Roadmap:**
  1. Extract `ApplicabilityRule` as a class with behavior.
  2. Create `RulesEngine` to manage tokens and rule evaluation.
  3. Consider a mini-DSL or decision table format.

### Gap 3: Schema Versioning & Backward Compatibility
- **Status:** UNADDRESSED
- **Risk:** Every spec change is a big-bang migration.
- **Roadmap:**
  1. Add `@version` to schema; track breaking changes in CI.
  2. Generate fixtures from schema (Zod examples or faker).
  3. Implement adapter layer for old → new format.
  4. Support dual-version APIs during migration.

### Gap 4: Referential Integrity Across Aggregates
- **Status:** UNADDRESSED
- **Risk:** Rules reference non-existent evidence keys; Products reference undefined jurisdictions.
- **Roadmap:**
  1. Add cross-aggregate validators during catalog loading.
  2. Define Repositories for `RuleCatalog` and `ApplicabilityCatalog`.
  3. Implement `CatalogConsistency` service.

### Gap 5: Bounded Context Mapping
- **Status:** Implicit (packages only); no explicit map
- **Risk:** Unclear ownership; implicit dependencies.
- **Roadmap:**
  1. Document context map: spec ↔ engine ↔ extension ↔ ai ↔ cli.
  2. Define ACL (Anti-Corruption Layer) between contexts.
  3. Define event bus for context communication.

---

## Domain Maturity Level

**Current: Level 2–3 (Hybrid Spec-Driven / Anemic Model)**

**Level Path:**
- **Level 1:** CRUD with validation (no domain encoding)
- **Level 2:** Schema-driven with behavioral hints (you are here)
- **Level 3:** Aggregates with invariant enforcement (1–2 months away)
- **Level 4:** Event-sourced, lifecycle-managed, strategic contexts (6+ months away)
- **Level 5:** Domain-driven at-scale with integrated bounded contexts (2+ years)

**Path to Level 4:**
1. **Build Evidence Aggregate** (2–3 weeks)
2. **Extract Applicability Rules** into managed behavior (2 weeks)
3. **Implement Schema Versioning & Fixtures** (2 weeks)
4. **Validate with Real Rules** (1 week) — add 10+ real EU/US compliance rules
5. **Add Cross-Aggregate Validators** (1 week)

---

## Red Flags & Trends

| Flag | Status | Impact |
|------|--------|--------|
| Anemic domain model | 🔴 ACTIVE | Will limit feature velocity after 20+ rules |
| Spec-API coupling | 🔴 ACTIVE | Found 1 breaking migration in 2 days |
| Branded types unproven | 🟡 RISK | May be false confidence |
| Applicability function complexity | 🟡 RISK | Cyclomatic complexity ~8 |
| No evidence expiry enforcement | 🔴 CRITICAL | Will cause production failures |
| No cross-aggregate invariants | 🟡 RISK | Logically inconsistent catalogs are possible |
| No domain events | 🔴 ARCHITECTURAL | Audit trail is impossible |

---

## If This Model Stays As-Is for 3 Years, Here's What Breaks First

**Year 1 (Months 1–12): Evidence Expiry Fails**
- Sellers upload 3-year certificates; CartGuard doesn't track expiry.
- Month 13: First batch expires. Listings pass compliance with stale evidence.
- Marketplace suspends listing. Seller escalates.
- **Cost:** 1–2 FTE support staff to track expiry manually.
- **Risk:** Regulatory liability.

**Year 2 (Months 13–24): Applicability Rules Become Unmaintainable**
- 50–100 rules across RED, LVD, EMC, MachineDir, BatteryReg, UKCA.
- Adding a rule takes 4–6 hours. Feature velocity drops 40%.
- Sales blocked waiting for rules.

**Year 3 (Months 25–36): Referential Integrity & Audit Trail Fail**
- 200+ rules, 500+ products, 10k+ listings.
- Rules reference "eu_doc_xyz" which doesn't exist.
- Listings pass even though required evidence can't ever be present.
- 50+ support tickets: "We uploaded everything; why does CartGuard say we're missing docs?"
- No audit trail. Can't explain decisions. Regulators ask for proof of systematic testing.
- **Cost:** 2–3 months of back-office engineering; 1–2 legal escalations.

**Root Cause:** Spec-driven architecture (schemas + functions) vs. behavior-driven (entities + aggregates + invariants). At scale, data without behavior doesn't work.

---

## Current Domain Concepts (For Reference)

- **Entities:** `Claim`, `ProductContent`, `ListingInput`, `RuleRecord`, `ApplicabilityRule`
- **Value Objects:** `ComplianceToken`, `ClaimCategory`, `ValidationPolicy`, `RequirementType`, `SourceType`, `ConfidenceLevel`, `ValidationStatus`, `EvidenceDocument`, `SubmissionMetadata`
- **Aggregates (Claimed):** `RuleCatalog`, `ApplicabilityCatalog`, `ResearchIndex` ← **These are fake aggregates**
- **Domain Services (Actually Transaction Scripts):** `validateProductContent`, `evaluateListingAgainstRuleCatalog`, `getApplicabilityState`
- **Policies / Rules:** `ValidationPolicySchema`, `ApplicabilityRuleSchema`

---

## Last Review & Next Steps

- **Last Reviewed:** 2026-02-24 (Comprehensive DDD Assessment)
- **Assessed By:** Harsh Domain-Driven Design Evaluation
- **Conclusion:** Spec-driven architecture with zero domain encoding. Strategic DDD opportunities are missed.

**Next Review Triggers:**
1. After implementing Evidence Aggregate (assess if approach is correct).
2. After first 20 real rules are added (assess if applicability logic scales).
3. After first schema breaking change (assess if versioning strategy worked).

**Recommended Actions (Priority Order):**
1. 🔴 **CRITICAL:** Build Evidence Aggregate with expiry enforcement (2–3 weeks)
2. 🔴 **CRITICAL:** Add re-verification scheduling and audit trail (1 week)
3. 🟡 **HIGH:** Refactor `getApplicabilityState` into RulesEngine class (1 week)
4. 🟡 **HIGH:** Implement fixture generation & auto-sync (1 week)
5. 🟡 **HIGH:** Add schema versioning and breaking-change detection (1 week)
