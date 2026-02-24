# Evidence Lifecycle Aggregate: Implementation Plan

**Objective:** Replace anemic `EvidenceDocument` with a rich `Evidence` aggregate that enforces expiry, re-verification scheduling, conflict recording, and audit trails.

**Timeline:** 2–3 weeks  
**Impact:** Blocks production failures; enables audit trail; demonstrates DDD value to the team

---

## Problem Statement

**Current State:**
- `EvidenceDocument` is a data container (properties only, no behavior).
- `status` is manually set to "stale" by external processes (nobody does this).
- `last_verified_at` is a string date; there's no TTL, no expiry enforcement, no re-verification scheduling.
- When evidence expires, the system silently allows it to pass compliance checks.
- No audit trail of *who* verified what, *when*, or *why*.

**Consequences in Production:**
- Seller uploads a 3-year certificate (expires 2029-02-24, re-verify by 2029-01-24).
- At month 13 (2027-02-24), certificate expires silently.
- CartGuard still says "evidence present; status = OK" because status is never auto-updated to "stale".
- Listing passes compliance check with expired certificate.
- Marketplace discovers expired evidence post-launch → listing suspended → seller escalates.
- Support team manually tracks expiry dates in spreadsheets (waste).

**Strategic Impact:**
- CartGuard claims to be a compliance engine but lets stale evidence pass → regulatory liability.
- Teams can't explain why a product was marked compliant (no audit trail).
- Feature velocity slows because evidence management is an afterthought.

---

## Solution Overview

### Design Goals

1. **Enforce Expiry:** Evidence cannot be "present" if it's beyond its TTL.
2. **Schedule Re-Verification:** System knows when re-verification is due (e.g., 90 days before expiry).
3. **Record Decisions:** Every verification action is recorded with who, when, and confidence.
4. **Support Conflict Resolution:** If two auditors disagree on evidence validity, record the conflict; don't silently pick one.
5. **Enable Audit Trails:** "Why was product X compliant on date Y?" must be answerable.

### Architecture Changes

#### 1. New Domain Concepts

```typescript
// In @cartguard/spec

// Value object: represents when something was verified
class VerificationTimestamp {
  constructor(readonly utcDate: Date) {
    if (utcDate > new Date()) throw new Error("Cannot verify in future");
  }
  
  isStaleBy(today: Date, ttlDays: number): boolean {
    const expiryDate = addDays(this.utcDate, ttlDays);
    return today > expiryDate;
  }
  
  daysUntilReVerificationDue(ttlDays: number, warningDays: number): number {
    const reVerifyTo = addDays(this.utcDate, ttlDays - warningDays);
    return differenceInDays(reVerifyTo, new Date());
  }
}

// Domain event: tracks every verification action
class EvidenceVerificationEvent {
  readonly id: string;
  readonly timestamp: VerificationTimestamp;
  readonly verifier: string;
  readonly decision: "verified" | "rejected" | "conflicted";
  readonly reason: string;
  readonly confidence: ConfidenceLevel;
  
  constructor(...) { ... }
}

// Aggregate root: manages evidence lifecycle
class Evidence {
  private events: EvidenceVerificationEvent[] = [];
  private _documentKey: DocumentKey;
  private _name: string;
  private _ttlDays: number;
  
  // Factory method: create new evidence
  static create(key: DocumentKey, name: string, ttlDays: number): Evidence {
    const ev = new Evidence(key, name, ttlDays);
    ev.events.push(
      new EvidenceVerificationEvent("verified", new VerificationTimestamp(new Date()), "system", "evidence_created", "high")
    );
    return ev;
  }
  
  // Query: is this evidence valid today?
  isValid(today: Date = new Date()): boolean {
    if (this.events.length === 0) return false;
    const latestVerification = this.events[this.events.length - 1];
    return !latestVerification.timestamp.isStaleBy(today, this._ttlDays);
  }
  
  // Query: status for reporting
  status(today: Date = new Date()): "present" | "stale" | "expired" | "conflicted" | "unverified" {
    if (this.events.length === 0) return "unverified";
    const latest = this.events[this.events.length - 1];
    if (latest.decision === "conflicted") return "conflicted";
    if (latest.decision === "rejected") return "stale";
    if (this.isValid(today)) return "present";
    return "expired";
  }
  
  // Query: when should re-verification happen?
  reVerificationDueDate(warningDays: number = 90): Date {
    if (this.events.length === 0) return new Date(); // Due immediately
    const latestVerified = this.events.find(e => e.decision === "verified");
    if (!latestVerified) return new Date();
    return addDays(latestVerified.timestamp.utcDate, this._ttlDays - warningDays);
  }
  
  // Command: verify the evidence
  verify(verifier: string, confidenceLevel: ConfidenceLevel = "high"): void {
    // Check for conflicts
    const recentConflicts = this.events
      .filter(e => e.decision === "conflicted")
      .filter(e => differenceInDays(new Date(), e.timestamp.utcDate) < 30);
    
    if (recentConflicts.length > 0) {
      this.events.push(
        new EvidenceVerificationEvent("conflicted", new VerificationTimestamp(new Date()), verifier, "recent_conflict_unresolved", confidenceLevel)
      );
      return; // Require human override
    }
    
    this.events.push(
      new EvidenceVerificationEvent("verified", new VerificationTimestamp(new Date()), verifier, "re_verified", confidenceLevel)
    );
  }
  
  // Command: reject evidence
  reject(verifier: string, reason: string): void {
    this.events.push(
      new EvidenceVerificationEvent("rejected", new VerificationTimestamp(new Date()), verifier, reason, "high")
    );
  }
  
  // Command: mark as conflicted (two auditors disagree)
  recordConflict(auditor1: string, auditor2: string, reason: string): void {
    this.events.push(
      new EvidenceVerificationEvent("conflicted", new VerificationTimestamp(new Date()), `${auditor1}+${auditor2}`, reason, "low")
    );
  }
  
  // Query: full audit trail
  auditTrail(): readonly EvidenceVerificationEvent[] {
    return Object.freeze([...this.events]);
  }
}

// Product aggregate now composes Evidence aggregates
class Product {
  private _evidences: Map<DocumentKey, Evidence> = new Map();
  
  addEvidence(ev: Evidence): void {
    this._evidences.set(ev.documentKey, ev);
  }
  
  getEvidenceStatus(key: DocumentKey, today: Date = new Date()): "present" | "stale" | "expired" | "conflicted" | "missing" {
    const ev = this._evidences.get(key);
    if (!ev) return "missing";
    return ev.status(today);
  }
  
  requiredReVerifications(today: Date = new Date()): Evidence[] {
    return Array.from(this._evidences.values())
      .filter(ev => ev.reVerificationDueDate() <= today);
  }
}
```

---

## Implementation Steps

### Phase 1: Schema Layer (Week 1)

**Files to Create/Modify:**
- `packages/spec/src/evidence.ts` — New file with `Evidence`, `EvidenceVerificationEvent`, `VerificationTimestamp` classes
- `packages/spec/src/index.ts` — Export new types; keep `EvidenceDocumentSchema` for backward compatibility (deprecated)

**Tasks:**
1. [ ] Implement `VerificationTimestamp` value object with `isStaleBy()`, `daysUntilReVerificationDue()` methods
2. [ ] Implement `EvidenceVerificationEvent` immutable class to record verification actions
3. [ ] Implement `Evidence` aggregate root with:
   - [ ] `create()` factory method
   - [ ] `isValid(today)` query
   - [ ] `status(today)` query
   - [ ] `reVerificationDueDate(warningDays)` query
   - [ ] `verify(verifier, confidence)` command
   - [ ] `reject(verifier, reason)` command
   - [ ] `recordConflict(auditor1, auditor2, reason)` command
   - [ ] `auditTrail()` query
4. [ ] Create Zod schemas for serialization/deserialization
5. [ ] Add unit tests for all methods

**Success Criteria:**
- 100% test coverage of Evidence aggregate
- All methods have clear, documented input/output
- Backward compatibility with EvidenceDocumentSchema (not used, just exportable)

---

### Phase 2: Engine Layer (Week 1–2)

**Files to Modify:**
- `packages/engine/src/index.ts` — Update evaluation logic to use Evidence aggregate

**Tasks:**
1. [ ] Create `EvidenceRepository` interface to load/save Evidence from product data
2. [ ] Update `evaluateRule()` to:
   - [ ] Load evidence as `Evidence` aggregate instances (not raw documents)
   - [ ] Call `evidence.status(today)` to get current status
   - [ ] Call `evidence.reVerificationDueDate()` to check if re-verification is overdue
3. [ ] Add new evaluation status: `"reVerificationDue"` (warning, not blocking)
4. [ ] Update `RuleEvaluation` type to include:
   - [ ] `reVerificationDueDate?: string` (ISO date)
   - [ ] `auditTrail?: EvidenceVerificationEvent[]` (optional, for detailed reports)
5. [ ] Create `ComplianceDecision` service that wraps evaluation and includes:
   - [ ] `decision: "compliant" | "nonCompliant" | "requiresReVerification"`
   - [ ] `justification: string` (why this decision)
   - [ ] `auditedBy: string` (who made the decision)
   - [ ] `timestamp: VerificationTimestamp`
6. [ ] Update tests to validate Evidence lifecycle behavior

**Success Criteria:**
- Evaluation correctly identifies stale evidence and marks as not-present
- Re-verification due dates are calculated and reported
- Audit trail is available in evaluation result

---

### Phase 3: Integration Layer (Week 2–3)

**Files to Modify:**
- `packages/example/sample-listing.json` — Update to include Evidence data
- `packages/vscode-extension/src/types.ts` — Add `EvidenceAuditTrail` type for UI
- `packages/vscode-extension/src/renderers/` — Add Evidence status rendering

**Tasks:**
1. [ ] Update `ListingInput` schema to support Evidence aggregate format:
   ```typescript
   product: {
     evidence_documents: {
       document_key: "eu_doc_lvd",
       name: "LVD Declaration",
       ttl_days: 1095, // 3 years
       verified_on: "2024-02-24T00:00:00Z",
       verification_events: [
         { decision: "verified", timestamp: "2024-02-24T00:00:00Z", verifier: "system", confidence: "high" }
       ]
     }
   }
   ```
2. [ ] Create migration script to convert old `EvidenceDocument` format → new `Evidence` format
3. [ ] Update demo-ci test to validate Evidence lifecycle
4. [ ] Update VS Code extension to display:
   - [ ] Current evidence status (present/stale/expired/conflicted)
   - [ ] Days until re-verification is due
   - [ ] Audit trail (clickable to see verification history)
5. [ ] Add E2E test: "Evidence that expires in 30 days shows re-verification warning"

**Success Criteria:**
- Old fixture format still loads (migration script works)
- New fixture format shows Evidence status in evaluation UI
- Re-verification warnings appear in demo

---

### Phase 4: Validation & Documentation (Week 3)

**Files to Create/Modify:**
- `docs/evidence-lifecycle.md` — New documentation
- `planning/evidence-aggregate-adr.md` — Architecture decision record

**Tasks:**
1. [ ] Write architectural decision record explaining:
   - [ ] Why Evidence is an aggregate (not a value object)
   - [ ] Why we record verification events (audit trail requirement)
   - [ ] Why re-verification is a separate concern from expiry
2. [ ] Update [DOMAIN_MODEL_INDEX.md](../DOMAIN_MODEL_INDEX.md) to reflect:
   - [ ] Evidence now has lifecycle behavior
   - [ ] Domain richness improves
   - [ ] Audit trail enabled
3. [ ] Add troubleshooting guide:
   - [ ] How to resolve evidence conflicts
   - [ ] How to manually re-verify evidence
   - [ ] How to read audit trails
4. [ ] Run full test suite + demo
5. [ ] Update README if domain score improves

**Success Criteria:**
- Architecture is documented and defensible
- Team understands why Evidence is structured this way
- No regressions in engine tests

---

## Detailed Design Decisions

### Decision 1: Evidence As Aggregate Root

**Question:** Should Evidence be an aggregate (root + children) or a value object?

**Answer:** **Aggregate Root.**

**Reasoning:**
- Evidence has identity (document_key).
- Evidence has a mutable lifecycle (verified → re-verify-due → expired → re-verified).
- Evidence enforces invariants across state transitions (can't be "verified" and "conflicted" simultaneously).
- Multiple actors (verifiers, auditors, automated systems) interact with Evidence over time.

**Alternative Rejected:** Making Evidence a value object would mean creating a new instance on every state transition. This makes audit trails and conflict tracking impossible.

---

### Decision 2: Verification Events as Immutable Domain Events

**Question:** How should we record "who verified what when"?

**Answer:** **Immutable `EvidenceVerificationEvent` instances appended to an event log.**

**Reasoning:**
- Immutability ensures audit trail integrity (can't be tampered with).
- Event sourcing pattern allows us to replay history and debug decisions.
- Each event captures: decision (verified/rejected/conflicted), verifier identity, timestamp, confidence, reason.
- Scaling: If we need to integrate with external audit systems (e.g., Sentry, datadog), events are the source of truth.

**Alternative Rejected:** Storing only `last_verified_at` + `status`. This loses context about who verified, why, and if there were conflicts.

---

### Decision 3: TTL Days vs Absolute Expiry Date

**Question:** Should Evidence store a TTL (time-to-live in days) or an absolute expiry date?

**Answer:** **TTL (days).**

**Reasoning:**
- Compliance rules often specify "valid for 3 years" (TTL).
- TTL is immutable; expiry date changes with time.
- TTL allows rules to be authored by compliance experts ("every RED cert is valid for 3 years").
- Expiry date is computed on-demand: `expiryDate = verificationDate + ttlDays`.

**Alternative Rejected:** Storing absolute expiry date means updating the date every time something else changes. Plus, if a seller re-verifies, the expiry date shifts.

---

### Decision 4: Re-Verification Warning vs Hard Block

**Question:** When re-verification is due, should it block compliance or just warn?

**Answer:** **Warn (non-blocking), but make it visible.**

**Reasoning:**
- Regulatory grace periods exist. A cert valid until 2029-02-24 doesn't become invalid on 2029-01-24.
- But sellers should know re-verification is due so they can plan.
- New evaluation status: `"reVerificationDue"` (not "blocking" but flagged).
- Compliance teams can set `requiresReVerificationDue: true` when stricter rules apply.

**Alternative Rejected:** Hard-blocking immediately makes the system too strict and penalizes planning.

---

### Decision 5: Conflict Resolution

**Question:** If two auditors disagree on evidence validity, what happens?

**Answer:** **Record the conflict; require human override.**

**Reasoning:**
- Some evidence is ambiguous (e.g., test report from unfamiliar lab).
- Two verifiers might disagree on whether it's sufficient.
- System should flag this; not silently pick the optimistic or pessimistic view.
- Escalate to a compliance expert for final call.

**Implementation:**
```typescript
if (conflicts exist in last 30 days) {
  status = "conflicted"
  blocking = true
  message = "Two auditors disagree on this evidence. Requires manual override."
}
```

---

## Backward Compatibility

**Plan:**

1. **Old Format Support:** During Phase 3 integration, we'll accept both:
   ```typescript
   // Old format (deprecated)
   { document_key, status, last_verified_at }
   
   // New format (preferred)
   { document_key, ttl_days, verified_on, verification_events: [...] }
   ```

2. **Migration Script:** Convert old → new format:
   - If old format has `status = "stale"`, assume rejection event.
   - If old format has `status = "present"`, assume single verification event.
   - If `last_verified_at` is missing, assume never verified.

3. **Deprecation Timeline:**
   - v1: Support both formats.
   - v2 (2027-Q2): Old format deprecated; log warnings.
   - v3 (2027-Q4): Old format removed.

---

## Testing Strategy

### Unit Tests (Evidence Aggregate)

```typescript
describe("Evidence", () => {
  describe("create", () => {
    test("should create evidence with initial "verified" event", () => {
      const ev = Evidence.create("eu_doc_lvd", "LVD Declaration", 1095);
      expect(ev.status()).toBe("present");
      expect(ev.auditTrail()).toHaveLength(1);
    });
  });

  describe("isValid", () => {
    test("should be valid within TTL", () => {
      const ev = Evidence.create("...", "...", 365);
      const today = addDays(ev.verifiedOn, 100);
      expect(ev.isValid(today)).toBe(true);
    });

    test("should be invalid after TTL", () => {
      const ev = Evidence.create("...", "...", 365);
      const today = addDays(ev.verifiedOn, 400);
      expect(ev.isValid(today)).toBe(false);
    });
  });

  describe("reVerificationDueDate", () => {
    test("should calculate due date 90 days before expiry", () => {
      const ev = Evidence.create("...", "...", 365);
      const due = ev.reVerificationDueDate(90);
      expect(due).toEqual(addDays(ev.verifiedOn, 275)); // 365 - 90
    });
  });

  describe("verify", () => {
    test("should add verification event", () => {
      const ev = Evidence.create("...", "...", 365);
      ev.verify("auditor-1", "high");
      expect(ev.auditTrail()).toHaveLength(2); // initial + re-verification
    });

    test("should not verify if recent conflict exists", () => {
      const ev = Evidence.create("...", "...", 365);
      ev.recordConflict("a1", "a2", "ambiguous");
      ev.verify("a1", "high");
      expect(ev.status()).toBe("conflicted"); // remains conflicted
    });
  });

  describe("recordConflict", () => {
    test("should set status to conflicted", () => {
      const ev = Evidence.create("...", "...", 365);
      ev.recordConflict("a1", "a2", "ambiguous test report");
      expect(ev.status()).toBe("conflicted");
    });
  });
});
```

### Integration Tests (Engine)

```typescript
describe("evaluateListingAgainstRuleCatalog with Evidence", () => {
  test("should mark evidence as stale if expired", () => {
    const listing = {
      product: {
        evidence_documents: [
          {
            document_key: "eu_doc_lvd",
            verified_on: "2020-01-01", // 6+ years ago
            ttl_days: 1095 // 3 years
          }
        ]
      }
    };
    const result = evaluateListingAgainstRuleCatalog(listing, rules, applicability);
    expect(result.result?.evaluations[0].status).toBe("stale");
  });

  test("should warn when re-verification is due within 90 days", () => {
    const listing = {
      product: {
        evidence_documents: [
          {
            document_key: "eu_doc_lvd",
            verified_on: "2024-06-01",
            ttl_days: 365 // expires 2025-06-01
          }
        ]
      }
    };
    const result = evaluateListingAgainstRuleCatalog(listing, rules, applicability, {
      today: "2025-03-15" // 90 days before expiry
    });
    expect(result.result?.evaluations[0].status).toBe("reVerificationDue");
  });

  test("should block if evidence is conflicted", () => {
    const listing = {
      product: {
        evidence_documents: [
          {
            document_key: "eu_doc_lvd",
            verification_events: [
              { decision: "conflicted", reason: "auditors disagree" }
            ]
          }
        ]
      }
    };
    const result = evaluateListingAgainstRuleCatalog(listing, rules, applicability);
    expect(result.result?.evaluations[0].blocking).toBe(true);
  });
});
```

---

## Rollout Plan

### Internal Validation (Week 3)
- [ ] Full test suite passes
- [ ] Demo works with new Evidence format
- [ ] Team review & sign-off

### Beta (Week 4 planned)
- [ ] Deploy to staging
- [ ] Migrate existing demo data
- [ ] Run compliance checks on real products (if available)

### Production (Month 2)
- [ ] Feature flag: `useEvidenceAggregateLifecycle: true/false`
- [ ] Gradual rollout: 10% → 50% → 100%
- [ ] Monitor: Do evaluations produce the same results with old vs new code?

### Deprecation (Month 3+)
- [ ] Announce old format deprecation
- [ ] Provide migration guide
- [ ] Remove old format in v3

---

## Success Metrics

1. **Correctness:** Stale evidence is no longer marked "present" in evaluations.
2. **Visibility:** Re-verification due dates appear in compliance reports.
3. **Auditability:** Every verification decision can be traced to a person and time.
4. **Team Understanding:** Team can explain *why* Evidence is an aggregate (demonstrates DDD value).
5. **Domain Maturity:** DOMAIN_MODEL_INDEX score improves from 3/10 to 5/10+.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Backward compatibility breaks integrations | Implement migration script; dual-format support during v1 |
| Date/timezone bugs in re-verification logic | Use UTC everywhere; extensive unit tests; review all date math |
| Conflict resolution is too strict; blocks valid evidence | Start with "warn" (non-blocking); adjust confidence thresholds |
| Custom rules reference old EvidenceDocument format | Provide adapter layer; document breaking change in CHANGELOG |

---

## Next Steps

1. **Review & Approval:** Share this plan with the team; get sign-off on design decisions.
2. **Week 1:** Implement Phase 1 (schema layer).
3. **Week 2:** Implement Phase 2 (engine layer) + start Phase 3.
4. **Week 3:** Finish Phase 3 + validation + docs.
5. **Week 4:** Beta + feedback; iterate if needed.

---
