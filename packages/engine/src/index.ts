import type { ZodError } from "zod";
import {
  ComplianceTokens,
  ApplicabilityCatalogSchema,
  ListingInputSchema,
  ProductContentSchema,
  RuleCatalogSchema,
  ValidationPolicySchema,
  type ApplicabilityCatalog,
  type ListingEvaluationResult,
  type ListingInput,
  type ProductContent,
  type RuleCatalog,
  type RuleRecord,
  type ValidationPolicy,
  Evidence,
  EvidenceVerificationEvent,
  deserializeEvidence,
  serializeEvidence,
  type EvidenceDocument,
  type SerializedEvidence
} from "@cartguard/spec";

export interface ValidationIssue {
  code: string;
  message: string;
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export {
  Evidence,
  EvidenceVerificationEvent,
  deserializeEvidence,
  serializeEvidence,
  type SerializedEvidence,
  type SerializedEvidenceVerificationEvent,
  EvidenceSchema,
  EvidenceVerificationEventSchema,
  EvidenceVerificationDecisionSchema,
  type EvidenceVerificationDecision
} from "@cartguard/spec";

export interface EvidenceRepository {
  loadEvidence(documentKey: string, listing: ListingInput): Evidence | null;
  saveEvidence(evidence: Evidence, listing: ListingInput): void;
}

const DEFAULT_TTL_DAYS: Record<string, number> = {
  "eu_doc_lvd": 1095,
  "eu_doc_emc": 1095,
  "eu_doc_red": 1095,
  "default": 365
};

function getTtlDays(documentKey: string): number {
  const value = DEFAULT_TTL_DAYS[documentKey];
  return value ?? 365;
}

function migrateEvidenceDocument(doc: EvidenceDocument): Evidence {
  if ("ttl_days" in doc && doc.verification_events.length > 0) {
    try {
      const serialized = doc as unknown as SerializedEvidence;
      return deserializeEvidence({
        document_key: serialized.document_key,
        document_name: serialized.document_name,
        ttl_days: serialized.ttl_days,
        verification_events: serialized.verification_events
      });
    } catch (error) {
      console.warn(`Failed to deserialize new format evidence for ${doc.document_key}:`, error);
    }
  }

  const ttlDays = getTtlDays(doc.document_key);
  const events: EvidenceVerificationEvent[] = [];

  if (doc.last_verified_at) {
    let decision: "verified" | "rejected" | "conflicted" = "verified";
    if (doc.status === "stale" || doc.status === "mismatched") {
      decision = "rejected";
    } else if (doc.status === "conflicted") {
      decision = "conflicted";
    }
    
    events.push(EvidenceVerificationEvent.create({
      decision,
      verifier: "system",
      reason: "migrated_from_legacy",
      confidence: "high",
      timestamp: new Date(doc.last_verified_at)
    }));
  } else {
    events.push(EvidenceVerificationEvent.create({
      decision: "verified",
      verifier: "system", 
      reason: "legacy_no_verification_date",
      confidence: "low",
      timestamp: new Date("2000-01-01")
    }));
  }

  return new Evidence({
    documentKey: doc.document_key,
    documentName: doc.document_name,
    ttlDays,
    events
  });
}

class DefaultEvidenceRepository implements EvidenceRepository {
  loadEvidence(documentKey: string, listing: ListingInput): Evidence | null {
    const doc = listing.product.evidence_documents.find(d => 
      d.document_key.toLowerCase() === documentKey.toLowerCase()
    );
    
    if (!doc) return null;
    
    try {
      return migrateEvidenceDocument(doc);
    } catch (error) {
      console.warn(`Failed to load evidence for ${documentKey}:`, error);
      return null;
    }
  }

  saveEvidence(_evidence: Evidence, _listing: ListingInput): void {
    const serialized = serializeEvidence(_evidence);
    console.debug(`Evidence saved for ${_evidence.documentKey}:`, serialized);
  }
}

const toPath = (path: (string | number)[]): string | undefined =>
  path.length > 0 ? path.map((segment) => String(segment)).join(".") : undefined;

const fromZodError = (error: ZodError, prefix: string): ValidationIssue[] =>
  error.issues.map((i) => {
    const p = toPath(i.path);
    const issue: ValidationIssue = { code: `${prefix}_${i.code.toUpperCase()}`, message: i.message };
    if (p) issue.path = p;
    return issue;
  });

const enforcePolicy = (content: ProductContent, policy: ValidationPolicy): ValidationResult => {
  const errors: ValidationIssue[] = [];
  const allowed = new Set(policy.allowedCategories);
  const requiredSource = new Set(policy.requireSourceForCategories);

  content.claims.forEach((claim, index) => {
    if (!allowed.has(claim.category)) {
      errors.push({ code: "POLICY_CATEGORY_NOT_ALLOWED", message: `Category '${claim.category}' not allowed`, path: `claims.${index}.category` });
    }
    if (claim.confidence < policy.minConfidence) {
      errors.push({ code: "POLICY_MIN_CONFIDENCE", message: `Confidence ${claim.confidence} too low`, path: `claims.${index}.confidence` });
    }
    if (requiredSource.has(claim.category) && claim.sourceUrl.trim().length === 0) {
      errors.push({ code: "POLICY_SOURCE_REQUIRED", message: `Category '${claim.category}' requires sourceUrl`, path: `claims.${index}.sourceUrl` });
    }
  });

  if (content.claims.length > policy.maxClaimsPerProduct) {
    errors.push({ code: "POLICY_MAX_CLAIMS_EXCEEDED", message: `Count ${content.claims.length} exceeds limit`, path: "claims" });
  }
  return { valid: errors.length === 0, errors, warnings: [] };
};

export const validateProductContent = (contentInput: unknown, policyInput: unknown): ValidationResult => {
  const c = ProductContentSchema.safeParse(contentInput);
  if (!c.success) return { valid: false, errors: fromZodError(c.error, "SCHEMA_PRODUCT"), warnings: [] };
  const p = ValidationPolicySchema.safeParse(policyInput);
  if (!p.success) return { valid: false, errors: fromZodError(p.error, "SCHEMA_POLICY"), warnings: [] };
  return enforcePolicy(c.data, p.data);
};

export const validateRuleCatalog = (c: unknown): ValidationResult & { catalog?: RuleCatalog } => {
  const p = RuleCatalogSchema.safeParse(c);
  if (!p.success) return { valid: false, errors: fromZodError(p.error, "SCHEMA_PRODUCT"), warnings: [] };
  return { valid: true, errors: [], warnings: [], catalog: p.data };
};

export const validateApplicabilityCatalog = (c: unknown): ValidationResult & { catalog?: ApplicabilityCatalog } => {
  const p = ApplicabilityCatalogSchema.safeParse(c);
  if (!p.success) return { valid: false, errors: fromZodError(p.error, "SCHEMA_POLICY"), warnings: [] };
  return { valid: true, errors: [], warnings: [], catalog: p.data };
};

const tokenValue = (l: ListingInput, t: string): boolean | undefined => {
  if (t === ComplianceTokens.RED_RADIO_INTENTIONAL) return l.product.is_radio_equipment;
  if (t === ComplianceTokens.RED_NOT_EXCLUDED) return !l.product.is_red_excluded;
  if (t === ComplianceTokens.RED_NOT_RADIO) return !l.product.is_radio_equipment;
  if (t === ComplianceTokens.LVD_VOLTAGE_MATCH) {
    const ac = typeof l.product.voltage_ac === "number" && l.product.voltage_ac >= 50 && l.product.voltage_ac <= 1000;
    const dc = typeof l.product.voltage_dc === "number" && l.product.voltage_dc >= 75 && l.product.voltage_dc <= 1500;
    return ac || dc;
  }
  if (t === ComplianceTokens.LVD_NOT_EXCLUDED) return !l.product.is_lvd_annex_ii_excluded;
  if (t === ComplianceTokens.EMC_MEETS_DEF) return l.product.is_emc_equipment;
  if (t === ComplianceTokens.EMC_LIABLE_DISTURBANCE) return l.product.is_emc_relevant;
  if (t === ComplianceTokens.RED_RADIO_EQUIPMENT) return l.product.is_radio_equipment;
  return undefined;
};

const getApplicabilityState = (ruleId: string, l: ListingInput, a: ApplicabilityCatalog): "applicable" | "not_applicable" | "unknown" => {
  const scoped = a.applicability_rules.filter((entry) => entry.rule_id === ruleId);
  if (scoped.length === 0) return "applicable";
  let hasUnknown = false, hasMatchApply = false;
  for (const entry of scoped) {
    let allTrue = true, unknown = false;
    for (const t of entry.if) {
      const v = tokenValue(l, t);
      if (typeof v === "undefined") unknown = true; else if (!v) allTrue = false;
    }
    if (allTrue && !unknown) {
      if (entry.then_not_applies.length > 0 && entry.then_applies.length === 0) return "not_applicable";
      if (entry.then_applies.length > 0) hasMatchApply = true;
    } else if (unknown) hasUnknown = true;
  }
  return hasMatchApply ? "applicable" : (hasUnknown ? "unknown" : "not_applicable");
};

const blockable = (r: RuleRecord): boolean =>
  r.requirement_type === "legal" && r.confidence !== "low" && ["eurlex", "eu_official", "national_authority"].includes(r.source_type);

const evaluateRule = (listing: ListingInput, rule: RuleRecord, applicability: ApplicabilityCatalog, repository: EvidenceRepository = new DefaultEvidenceRepository()): ListingEvaluationResult["evaluations"][number] => {
  const state = getApplicabilityState(rule.rule_id, listing, applicability);
  const base = { rule_id: rule.rule_id, requirement_type: rule.requirement_type, source_type: rule.source_type, confidence: rule.confidence };
  if (state === "not_applicable") return { ...base, status: "not_applicable", blocking: false, message: "Not applicable." };
  if (state === "unknown") return { ...base, status: "unknown", blocking: false, message: "Applicability unknown." };

  if (rule.required_evidence_keys.length === 0) return { ...base, status: "unknown", blocking: false, message: "No evidence keys." };
  
  const evidences: Evidence[] = [];
  const missing: string[] = [];
  
  for (const key of rule.required_evidence_keys) {
    const evidence = repository.loadEvidence(key, listing);
    if (evidence) {
      evidences.push(evidence);
    } else {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) return { ...base, status: "missing", blocking: blockable(rule), message: `Missing keys: ${missing.join(", ")}` };

  const today = new Date();
  
  const conflictedEvidence = evidences.find(ev => ev.status(today) === "conflicted");
  if (conflictedEvidence) {
    return { 
      ...base, 
      status: "conflicted", 
      blocking: blockable(rule), 
      message: `Evidence conflicted: ${conflictedEvidence.documentKey}`,
      auditTrail: conflictedEvidence.auditTrail().map(event => ({
        id: event.id,
        timestamp: event.timestamp.toISOString(),
        decision: event.decision,
        verifier: event.verifier,
        reason: event.reason,
        confidence: event.confidence
      }))
    };
  }

  const rejectedEvidence = evidences.find(ev => ev.status(today) === "stale");
  if (rejectedEvidence) {
    return {
      ...base,
      status: "stale",
      blocking: blockable(rule),
      message: `Evidence rejected: ${rejectedEvidence.documentKey}`,
      auditTrail: rejectedEvidence.auditTrail().map(event => ({
        id: event.id,
        timestamp: event.timestamp.toISOString(),
        decision: event.decision,
        verifier: event.verifier,
        reason: event.reason,
        confidence: event.confidence
      }))
    };
  }

  const expiredEvidence = evidences.find(ev => ev.status(today) === "expired");
  if (expiredEvidence) {
    return {
      ...base,
      status: "expired",
      blocking: blockable(rule),
      message: `Evidence expired: ${expiredEvidence.documentKey}`,
      auditTrail: expiredEvidence.auditTrail().map(event => ({
        id: event.id,
        timestamp: event.timestamp.toISOString(),
        decision: event.decision,
        verifier: event.verifier,
        reason: event.reason,
        confidence: event.confidence
      }))
    };
  }

  const reVerificationDueEvidence = evidences.find(ev => ev.isReVerificationDue(today));
  if (reVerificationDueEvidence) {
    const daysUntilExpiry = Math.ceil(reVerificationDueEvidence.expiryDate().getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return {
      ...base,
      status: "reVerificationDue",
      blocking: false,
      message: `Re-verification due: ${reVerificationDueEvidence.documentKey} (expires in ${Math.floor(daysUntilExpiry)} days)`,
      reVerificationDueDate: reVerificationDueEvidence.reVerificationDueDate().toISOString(),
      auditTrail: reVerificationDueEvidence.auditTrail().map(event => ({
        id: event.id,
        timestamp: event.timestamp.toISOString(),
        decision: event.decision,
        verifier: event.verifier,
        reason: event.reason,
        confidence: event.confidence
      }))
    };
  }

  return {
    ...base, 
    status: "present", 
    blocking: false, 
    message: "OK.",
    auditTrail: evidences.flatMap(ev => ev.auditTrail().map(event => ({
      id: event.id,
      timestamp: event.timestamp.toISOString(),
      decision: event.decision,
      verifier: event.verifier,
      reason: event.reason,
      confidence: event.confidence
    })))
  };
};

export const evaluateListingAgainstRuleCatalog = (
  li: unknown, 
  ri: unknown, 
  ai: unknown,
  repository: EvidenceRepository = new DefaultEvidenceRepository()
): ValidationResult & { result?: ListingEvaluationResult } => {
  const l = ListingInputSchema.safeParse(li);
  if (!l.success) return { valid: false, errors: fromZodError(l.error, "SCHEMA_PRODUCT"), warnings: [] };
  const r = RuleCatalogSchema.safeParse(ri);
  if (!r.success) return { valid: false, errors: fromZodError(r.error, "SCHEMA_POLICY"), warnings: [] };
  const a = ApplicabilityCatalogSchema.safeParse(ai);
  if (!a.success) return { valid: false, errors: fromZodError(a.error, "SCHEMA_POLICY"), warnings: [] };

  const evals = r.data.rules.map((rule) => evaluateRule(l.data, rule, a.data, repository));
  const blocking = evals.filter((row) => row.blocking);
  const warnRows = evals.filter((row) => row.status === "unknown" || (row.status !== "present" && !row.blocking));

  const res: ListingEvaluationResult = {
    listing_id: l.data.listing_id, evaluations: evals,
    summary: {
      total_rules: evals.length, blocking_issues: blocking.length,
      missing: evals.filter((r) => r.status === "missing").length,
      stale: evals.filter((r) => r.status === "stale").length,
      mismatched: evals.filter((r) => r.status === "mismatched").length,
      warnings: warnRows.length, unknown: evals.filter((r) => r.status === "unknown").length,
      not_applicable: evals.filter((r) => r.status === "not_applicable").length,
      present: evals.filter((r) => r.status === "present").length,
      conflicted: evals.filter((r) => r.status === "conflicted").length,
      expired: evals.filter((r) => r.status === "expired").length,
      reVerificationDue: evals.filter((r) => r.status === "reVerificationDue").length
    }
  };

  return {
    valid: blocking.length === 0,
    errors: blocking.map((r) => ({ code: "RULE_BLOCKING", message: r.message, path: r.rule_id })),
    warnings: warnRows.map((r) => ({ code: r.status === "unknown" ? "RULE_UNKNOWN" : "RULE_WARNING", message: r.message, path: r.rule_id })),
    result: res
  };
};
