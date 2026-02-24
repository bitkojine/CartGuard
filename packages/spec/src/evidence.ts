import { z } from "zod";
import type { DocumentKey, ConfidenceLevel } from "./index.js";

export const EvidenceVerificationDecisionSchema = z.enum([
  "verified",
  "rejected",
  "conflicted"
]);

export type EvidenceVerificationDecision =
  z.infer<typeof EvidenceVerificationDecisionSchema>;

export class VerificationTimestamp {
  readonly utcDate: Date;

  constructor(date: Date, skipFutureCheck = false) {
    if (!skipFutureCheck && date > new Date()) {
      throw new Error("Cannot verify in future");
    }
    this.utcDate = new Date(date);
    this.utcDate.setUTCHours(0, 0, 0, 0);
  }

  isStaleBy(today: Date, ttlDays: number): boolean {
    const expiryDate = new Date(this.utcDate);
    expiryDate.setUTCDate(expiryDate.getUTCDate() + ttlDays);
    return today > expiryDate;
  }

  daysUntilReVerificationDue(
    ttlDays: number,
    warningDays: number = 90
  ): number {
    const reVerifyDate = new Date(this.utcDate);
    reVerifyDate.setUTCDate(reVerifyDate.getUTCDate() + (ttlDays - warningDays));

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const diffMs = reVerifyDate.getTime() - today.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  getExpiryDate(ttlDays: number): Date {
    const expiry = new Date(this.utcDate);
    expiry.setUTCDate(expiry.getUTCDate() + ttlDays);
    return expiry;
  }

  toISOString(): string {
    return this.utcDate.toISOString();
  }

  static fromISOString(iso: string): VerificationTimestamp {
    return new VerificationTimestamp(new Date(iso), true);
  }
}

export class EvidenceVerificationEvent {
  readonly id: string;
  readonly timestamp: VerificationTimestamp;
  readonly decision: EvidenceVerificationDecision;
  readonly verifier: string;
  readonly reason: string;
  readonly confidence: ConfidenceLevel;

  constructor(props: {
    id?: string;
    timestamp: VerificationTimestamp;
    decision: EvidenceVerificationDecision;
    verifier: string;
    reason: string;
    confidence: ConfidenceLevel;
  }) {
    this.id = props.id || `event-${Date.now()}-${Math.random()}`;
    this.timestamp = props.timestamp;
    this.decision = props.decision;
    this.verifier = props.verifier;
    this.reason = props.reason;
    this.confidence = props.confidence;
  }

  static create(props: {
    decision: EvidenceVerificationDecision;
    verifier: string;
    reason: string;
    confidence: ConfidenceLevel;
    timestamp?: Date;
  }): EvidenceVerificationEvent {
    return new EvidenceVerificationEvent({
      timestamp: new VerificationTimestamp(props.timestamp ?? new Date()),
      decision: props.decision,
      verifier: props.verifier,
      reason: props.reason,
      confidence: props.confidence
    });
  }
}

export type EvidenceStatus =
  | "present"
  | "stale"
  | "expired"
  | "conflicted"
  | "unverified";

export class Evidence {
  readonly documentKey: DocumentKey;
  readonly documentName: string;
  readonly ttlDays: number;
  private readonly events: EvidenceVerificationEvent[];

  constructor(props: {
    documentKey: DocumentKey;
    documentName: string;
    ttlDays: number;
    events: EvidenceVerificationEvent[];
  }) {
    this.documentKey = props.documentKey;
    this.documentName = props.documentName;
    this.ttlDays = props.ttlDays;
    this.events = [...props.events];

    if (this.events.length === 0) {
      throw new Error("Evidence must have at least one verification event");
    }
  }

  static create(props: {
    documentKey: DocumentKey;
    documentName: string;
    ttlDays: number;
    verifier?: string;
  }): Evidence {
    const initialEvent = EvidenceVerificationEvent.create({
      decision: "verified",
      verifier: props.verifier ?? "system",
      reason: "evidence_created",
      confidence: "high"
    });

    return new Evidence({
      documentKey: props.documentKey,
      documentName: props.documentName,
      ttlDays: props.ttlDays,
      events: [initialEvent]
    });
  }

  latestEvent(): EvidenceVerificationEvent {
    if (this.events.length === 0) {
      throw new Error("Evidence has no events");
    }
    const latest = this.events[this.events.length - 1];
    if (!latest) {
      throw new Error("Impossible: latest event is undefined");
    }
    return latest;
  }

  latestEventWithDecision(
    decision: EvidenceVerificationDecision
  ): EvidenceVerificationEvent | undefined {
    for (let i = this.events.length - 1; i >= 0; i--) {
      const event = this.events[i];
      if (event && event.decision === decision) {
        return event;
      }
    }
    return undefined;
  }

  isValid(today: Date = new Date()): boolean {
    if (this.events.length === 0) {
      return false;
    }

    const latestVerified = this.latestEventWithDecision("verified");
    if (!latestVerified) {
      return false;
    }

    return !latestVerified.timestamp.isStaleBy(today, this.ttlDays);
  }

  /**
   * Get current status for reporting.
   */
  status(today: Date = new Date()): EvidenceStatus {
    const latest = this.latestEvent();

    if (latest.decision === "conflicted") {
      return "conflicted";
    }

    if (latest.decision === "rejected") {
      return "stale";
    }

    if (latest.decision === "verified") {
      if (this.isValid(today)) {
        return "present";
      }
      return "expired";
    }

    return "unverified";
  }

  reVerificationDueDate(warningDays: number = 90): Date {
    const latestVerified = this.latestEventWithDecision("verified");
    if (!latestVerified) {
      return new Date(); // Due immediately
    }

    const reVerifyDate = new Date(latestVerified.timestamp.utcDate);
    reVerifyDate.setUTCDate(
      reVerifyDate.getUTCDate() + (this.ttlDays - warningDays)
    );
    return reVerifyDate;
  }

  expiryDate(): Date {
    const latestVerified = this.latestEventWithDecision("verified");
    if (!latestVerified) {
      return new Date(); // Already expired conceptually
    }
    return latestVerified.timestamp.getExpiryDate(this.ttlDays);
  }

  isReVerificationDue(today: Date = new Date()): boolean {
    const dueDate = this.reVerificationDueDate();
    return today >= dueDate;
  }

  hasRecentConflicts(): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    return this.events.some(
      (e) =>
        e.decision === "conflicted" &&
        e.timestamp.utcDate >= thirtyDaysAgo
    );
  }

  verify(verifier: string, confidence: ConfidenceLevel = "high"): Evidence {
    if (this.hasRecentConflicts()) {
      throw new Error(
        "Cannot verify evidence with unresolved recent conflicts"
      );
    }

    const newEvent = EvidenceVerificationEvent.create({
      decision: "verified",
      verifier,
      reason: "re_verified",
      confidence
    });

    return new Evidence({
      documentKey: this.documentKey,
      documentName: this.documentName,
      ttlDays: this.ttlDays,
      events: [...this.events, newEvent]
    });
  }

  reject(verifier: string, reason: string): Evidence {
    const newEvent = EvidenceVerificationEvent.create({
      decision: "rejected",
      verifier,
      reason,
      confidence: "high"
    });

    return new Evidence({
      documentKey: this.documentKey,
      documentName: this.documentName,
      ttlDays: this.ttlDays,
      events: [...this.events, newEvent]
    });
  }

  recordConflict(
    auditor1: string,
    auditor2: string,
    reason: string
  ): Evidence {
    const newEvent = EvidenceVerificationEvent.create({
      decision: "conflicted",
      verifier: `${auditor1}+${auditor2}`,
      reason,
      confidence: "low"
    });

    return new Evidence({
      documentKey: this.documentKey,
      documentName: this.documentName,
      ttlDays: this.ttlDays,
      events: [...this.events, newEvent]
    });
  }

  auditTrail(): readonly EvidenceVerificationEvent[] {
    return Object.freeze([...this.events]);
  }

  firstVerifiedAt(): Date | undefined {
    const firstVerified = this.events.find((e) => e.decision === "verified");
    return firstVerified?.timestamp.utcDate;
  }
}

export const VerificationTimestampSchema = z
  .string()
  .datetime()
  .transform((s) => VerificationTimestamp.fromISOString(s));

export const EvidenceVerificationEventSchema = z.object({
  id: z.string().optional(),
  timestamp: z.string().datetime(),
  decision: EvidenceVerificationDecisionSchema,
  verifier: z.string().min(1),
  reason: z.string().min(1),
  confidence: z.enum(["high", "medium", "low"])
});

export type SerializedEvidenceVerificationEvent = z.infer<
  typeof EvidenceVerificationEventSchema
>;

export const EvidenceSchema = z.object({
  document_key: z.string().min(1).brand("DocumentKey"),
  document_name: z.string().min(1),
  ttl_days: z.number().int().positive(),
  verification_events: z.array(EvidenceVerificationEventSchema).min(1)
});

export type SerializedEvidence = z.infer<typeof EvidenceSchema>;

export function deserializeEvidence(
  data: SerializedEvidence
): Evidence {
  const events = data.verification_events.map(
    (e): EvidenceVerificationEvent => {
      const eventProps: {
        id?: string;
        timestamp: VerificationTimestamp;
        decision: EvidenceVerificationDecision;
        verifier: string;
        reason: string;
        confidence: ConfidenceLevel;
      } = {
        timestamp: VerificationTimestamp.fromISOString(e.timestamp),
        decision: e.decision,
        verifier: e.verifier,
        reason: e.reason,
        confidence: e.confidence
      };
      
      if (e.id) {
        eventProps.id = e.id;
      }
      
      return new EvidenceVerificationEvent(eventProps);
    }
  );

  return new Evidence({
    documentKey: data.document_key as unknown as DocumentKey,
    documentName: data.document_name,
    ttlDays: data.ttl_days,
    events
  });
}

export function serializeEvidence(evidence: Evidence): SerializedEvidence {
  return {
    document_key: evidence.documentKey,
    document_name: evidence.documentName,
    ttl_days: evidence.ttlDays,
    verification_events: evidence.auditTrail().map((e) => ({
      id: e.id,
      timestamp: e.timestamp.toISOString(),
      decision: e.decision,
      verifier: e.verifier,
      reason: e.reason,
      confidence: e.confidence
    }))
  };
}
