# Evidence Aggregate Design

## Overview

The Evidence aggregate is a domain-driven design implementation for managing document evidence throughout its lifecycle. It replaces the anemic EvidenceDocument schema with a behavioral aggregate root that enforces business invariants.

## Architecture

### Aggregate Root: Evidence

The Evidence class is the aggregate root that manages the lifetime of a document as evidence.

**Responsibilities:**
- Create evidence with initial verification
- Record verification decisions (verify, reject, record conflicts)
- Track audit trail as immutable event history
- Provide domain queries (status, validity, re-verification due date)
- Enforce invariants (no future timestamps, no verification with unresolved conflicts)

**Key Design Decisions:**
1. **Immutable Command Pattern**: All commands (verify, reject, recordConflict) return new Evidence instances. This prevents accidental mutation and makes state changes explicit.
2. **Event Sourcing**: All changes are captured as EvidenceVerificationEvent objects in an immutable audit trail.
3. **UTC-only Dates**: All date calculations use UTC internally to avoid timezone bugs in compliance audits.
4. **No Future Timestamps**: VerificationTimestamp rejects future dates in constructor to prevent logical inconsistencies.

### Value Objects

**VerificationTimestamp**
- Wraps UTC Date with validation (no future dates)
- Provides domain methods:
  - `isStaleBy(today, ttlDays)`: Returns true if evidence is stale
  - `daysUntilReVerificationDue(ttlDays, warningDays)`: Calculates days before re-verification warning
  - `getExpiryDate(ttlDays)`: Calculates expiry date based on TTL
  - Serializes as ISO string for JSON

**EvidenceVerificationEvent**
- Immutable domain event capturing verification decision
- Properties: id, timestamp, decision (verified|rejected|conflicted), verifier, reason (optional), confidence (optional)
- Acts as domain event for event sourcing pattern

### Status Values

Evidence status is calculated based on latest event and timestamps:
- `"unverified"`: No verification events yet
- `"present"`: Verified, not yet stale
- `"stale"`: Verified but past re-verification warning date
- `"expired"`: Past TTL expiry date
- `"conflicted"`: Conflicting verifications in recent history

### Invariants

1. **No Future Dates**: VerificationTimestamp constructor throws if date is in future
2. **Conflict Blocking**: Cannot verify evidence while it has unresolved conflicts (events from last 30 days with "conflicted" decision)
3. **Immutable Audit Trail**: Events array is frozen (Object.freeze) to prevent accidental mutations

## Usage Examples

### Create New Evidence
```typescript
const evidence = Evidence.create({
  documentKey: "eu_doc_lvd",
  documentName: "LVD Declaration",
  ttlDays: 1095  // 3 years
});
```

### Record Verification
```typescript
const verified = evidence.verify("auditor-1", "high");
// Returns new Evidence instance with verification event added
```

### Record Rejection
```typescript
const rejected = evidence.reject("auditor-1", "incomplete_pages");
// Returns new Evidence instance with rejection event added
```

### Record Conflict
```typescript
const conflicted = evidence.recordConflict("auditor-1", "auditor-2", "signature_validity");
// Returns new Evidence instance with conflict event added
// Later verify() attempts will fail until conflict is resolved
```

### Query Status
```typescript
evidence.status(new Date())  // "present"|"stale"|"expired"|"conflicted"|"unverified"
evidence.isValid(new Date())  // true if status is "present"
evidence.reVerificationDueDate(90)  // Date when re-verification is due (90 days before expiry)
evidence.isReVerificationDue(today)  // true if re-verification check is overdue
evidence.auditTrail()  // readonly EvidenceVerificationEvent[] - immutable history
```

## Serialization

The Evidence aggregate includes serialization support for persistence.

**Serialize to JSON:**
```typescript
const json = serializeEvidence(evidence);
// Returns JSON with documentKey, documentName, ttlDays, events array
```

**Deserialize from JSON:**
```typescript
const restored = deserializeEvidence(jsonData);
// Validates structure with Zod, restores immutable aggregate
```

## Testing Strategy

The test suite covers:
1. **VerificationTimestamp** (4 tests): Future date validation, stale detection, expiry date calculation, re-verification days
2. **EvidenceVerificationEvent** (2 tests): Event creation with explicit and implicit timestamps
3. **Evidence Aggregate** (15 tests): Factory, validity checks, status calculation, re-verification detection, command immutability, conflict handling, audit trail integrity
4. **Serialization** (2 tests): Roundtrip serialization and audit trail preservation
5. **Regression** (9 tests): Existing schema tests still passing

All tests use absolute dates (2024-01-01 baseline) to avoid flakiness from execution timestamp drift.

## Next Phase: Engine Integration

The engine layer (Phase 2) will:
1. Update evaluateRule() to call evidence.status(today) instead of checking raw properties
2. Add evidence.isReVerificationDue(today) check → emit "reVerificationDue" status
3. Include auditTrail() in evaluation results for transparency
4. Create ComplianceDecision service wrapping evaluation with who/when/why metadata

See planning/evidence-lifecycle-aggregate.md for the full 3-week roadmap.
