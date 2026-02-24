import assert from "node:assert/strict";
import { addDays } from "date-fns";
import test from "node:test";

import {
  Evidence,
  EvidenceVerificationEvent,
  VerificationTimestamp,
  deserializeEvidence,
  serializeEvidence,
  type DocumentKey
} from "../src/index.js";

const testDocKey = "eu_doc_lvd" as unknown as DocumentKey;

void test("VerificationTimestamp", () => {
  void test("should not accept future dates", () => {
    const tomorrow = addDays(new Date(), 1);
    assert.throws(() => new VerificationTimestamp(tomorrow));
  });

  void test("should calculate isStaleBy correctly", () => {
    const verifiedDate = new Date("2024-01-01T00:00:00Z");
    const ts = new VerificationTimestamp(verifiedDate);

    const beforeExpiry = new Date("2024-06-01T00:00:00Z");
    assert.equal(ts.isStaleBy(beforeExpiry, 365), false);

    const afterExpiry = new Date("2025-02-01T00:00:00Z");
    assert.equal(ts.isStaleBy(afterExpiry, 365), true);
  });

  void test("should return expiry date correctly", () => {
    const verifiedDate = new Date("2024-01-01T00:00:00Z");
    const ts = new VerificationTimestamp(verifiedDate);

    const expiry = ts.getExpiryDate(365);
    
    const expectedExpiry = new Date("2024-01-01T00:00:00Z");
    expectedExpiry.setUTCDate(expectedExpiry.getUTCDate() + 365);
    
    assert.equal(expiry.getUTCFullYear(), expectedExpiry.getUTCFullYear());
    assert.equal(expiry.getUTCMonth(), expectedExpiry.getUTCMonth());
    assert.equal(expiry.getUTCDate(), expectedExpiry.getUTCDate());
  });

  void test("should calculate days until re-verification correctly", () => {
    const verifiedDate = addDays(new Date(), -730);
    const ts = new VerificationTimestamp(verifiedDate);

    const daysLeft = ts.daysUntilReVerificationDue(365, 90);
    
    assert(daysLeft < 0, "Should be due for re-verification (negative days)");
  });
});

void test("EvidenceVerificationEvent", () => {
  void test("should create event with generated ID", () => {
    const event = EvidenceVerificationEvent.create({
      decision: "verified",
      verifier: "auditor-1",
      reason: "initial_verification",
      confidence: "high"
    });

    assert(event.id);
    assert.equal(event.decision, "verified");
    assert.equal(event.verifier, "auditor-1");
  });

  void test("should accept custom timestamp", () => {
    const customDate = new Date("2024-01-01");
    const event = EvidenceVerificationEvent.create({
      decision: "verified",
      verifier: "auditor-1",
      reason: "test",
      confidence: "high",
      timestamp: customDate
    });

    assert.equal(event.timestamp.utcDate.getUTCFullYear(), 2024);
  });
});

void test("Evidence aggregate", () => {
  void test("should create with initial verified event", () => {
    const ev = Evidence.create({
      documentKey: testDocKey,
      documentName: "LVD Declaration",
      ttlDays: 1095
    });

    assert.equal(ev.status(), "present");
    assert.equal(ev.auditTrail().length, 1);
    assert.equal(ev.auditTrail()[0]!.decision, "verified");
  });

  void test("should be valid within TTL", () => {
    const ev = Evidence.create({
      documentKey: testDocKey,
      documentName: "LVD Declaration",
      ttlDays: 365
    });

    const today = addDays(new Date(ev.firstVerifiedAt()!), 100);
    assert.equal(ev.isValid(today), true);
  });

  void test("should be invalid after TTL", () => {
    const ev = Evidence.create({
      documentKey: testDocKey,
      documentName: "LVD Declaration",
      ttlDays: 365
    });

    const today = addDays(new Date(ev.firstVerifiedAt()!), 400);
    assert.equal(ev.isValid(today), false);
  });

  void test("should report correct status when expired", () => {
    const ev = Evidence.create({
      documentKey: testDocKey,
      documentName: "LVD Declaration",
      ttlDays: 365
    });

    const today = addDays(new Date(ev.firstVerifiedAt()!), 400);
    assert.equal(ev.status(today), "expired");
  });

  void test("should calculate reVerificationDueDate correctly", () => {
    const ev = Evidence.create({
      documentKey: testDocKey,
      documentName: "LVD Declaration",
      ttlDays: 365
    });

    const dueDate = ev.reVerificationDueDate(90);
    const firstVerified = new Date(ev.firstVerifiedAt()!);
    const expectedDue = addDays(firstVerified, 275);

    assert.equal(dueDate.getUTCDate(), expectedDue.getUTCDate());
    assert.equal(dueDate.getUTCMonth(), expectedDue.getUTCMonth());
  });

  void test("should detect when reVerification is due", () => {
    const ev = Evidence.create({
      documentKey: testDocKey,
      documentName: "LVD Declaration",
      ttlDays: 365
    });

    const dueDate = ev.reVerificationDueDate(90);
    const afterDue = addDays(dueDate, 1);

    assert.equal(ev.isReVerificationDue(afterDue), true);
  });

  void test("should allow verify command", () => {
    const ev = Evidence.create({
      documentKey: testDocKey,
      documentName: "LVD Declaration",
      ttlDays: 365
    });

    const updated = ev.verify("auditor-2", "high");

    assert.equal(updated.auditTrail().length, 2);
    assert.equal(updated.auditTrail()[1]!.decision, "verified");
    assert.equal(updated.auditTrail()[1]!.verifier, "auditor-2");
  });

  void test("should prevent verify if recent conflicts exist", () => {
    const ev = Evidence.create({
      documentKey: testDocKey,
      documentName: "LVD Declaration",
      ttlDays: 365
    });

    const conflicted = ev.recordConflict("a1", "a2", "ambiguous");
    assert.throws(() => conflicted.verify("a1", "high"));
  });

  void test("should allow reject command", () => {
    const ev = Evidence.create({
      documentKey: testDocKey,
      documentName: "LVD Declaration",
      ttlDays: 365
    });

    const rejected = ev.reject("auditor-1", "invalid_signature");

    assert.equal(rejected.auditTrail().length, 2);
    assert.equal(rejected.auditTrail()[1]!.decision, "rejected");
    assert.equal(rejected.status(), "stale");
  });

  void test("should allow recordConflict command", () => {
    const ev = Evidence.create({
      documentKey: testDocKey,
      documentName: "LVD Declaration",
      ttlDays: 365
    });

    const conflicted = ev.recordConflict("a1", "a2", "test report from unfamiliar lab");

    assert.equal(conflicted.auditTrail().length, 2);
    assert.equal(conflicted.auditTrail()[1]!.decision, "conflicted");
    assert.equal(conflicted.status(), "conflicted");
  });

  void test("should detect recent conflicts", () => {
    const ev = Evidence.create({
      documentKey: testDocKey,
      documentName: "LVD Declaration",
      ttlDays: 365
    });

    const conflicted = ev.recordConflict("a1", "a2", "test");
    assert.equal(conflicted.hasRecentConflicts(), true);
  });

  void test("should not detect old conflicts (>30 days)", () => {
    const oldDate = addDays(new Date(), -40);
    const oldEvent = EvidenceVerificationEvent.create({
      decision: "conflicted",
      verifier: "a1+a2",
      reason: "old conflict",
      confidence: "low",
      timestamp: oldDate
    });

    const ev = Evidence.create({
      documentKey: testDocKey,
      documentName: "LVD Declaration",
      ttlDays: 365
    });

    const initialEvent = ev.auditTrail()[0];
    if (!initialEvent) {
      throw new Error("Expected initial event");
    }

    const withOldConflict = new Evidence({
      documentKey: ev.documentKey,
      documentName: ev.documentName,
      ttlDays: ev.ttlDays,
      events: [initialEvent, oldEvent]
    });

    assert.equal(withOldConflict.hasRecentConflicts(), false);
  });

  void test("should return expiry date", () => {
    const ev = Evidence.create({
      documentKey: testDocKey,
      documentName: "LVD Declaration",
      ttlDays: 365
    });

    const expiry = ev.expiryDate();
    assert(expiry instanceof Date);
    assert(expiry.getTime() > new Date().getTime());
  });
});

void test("Serialization roundtrip", () => {
  void test("should serialize and deserialize Evidence", () => {
    const original = Evidence.create({
      documentKey: testDocKey,
      documentName: "LVD Declaration",
      ttlDays: 1095
    });

    const serialized = serializeEvidence(original);
    const deserialized = deserializeEvidence(serialized);

    assert.equal(deserialized.documentKey, original.documentKey);
    assert.equal(deserialized.documentName, original.documentName);
    assert.equal(deserialized.ttlDays, original.ttlDays);
    assert.equal(deserialized.status(), original.status());
    assert.equal(
      deserialized.auditTrail().length,
      original.auditTrail().length
    );
  });

  void test("should preserve audit trail through serialization", () => {
    const original = Evidence.create({
      documentKey: testDocKey,
      documentName: "LVD Declaration",
      ttlDays: 1095
    })
      .verify("auditor-1", "high")
      .verify("auditor-2", "medium");

    const serialized = serializeEvidence(original);
    const deserialized = deserializeEvidence(serialized);

    assert.equal(deserialized.auditTrail().length, 3);
    assert.equal(deserialized.auditTrail()[1]!.verifier, "auditor-1");
    assert.equal(deserialized.auditTrail()[2]!.verifier, "auditor-2");
  });
});
