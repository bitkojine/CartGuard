import type { ZodError } from "zod";
import {
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
  type ValidationPolicy
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

const toPath = (path: (string | number)[]): string | undefined =>
  path.length > 0 ? path.map((segment) => String(segment)).join(".") : undefined;

const fromZodError = (
  error: ZodError,
  codePrefix: "SCHEMA_PRODUCT" | "SCHEMA_POLICY"
): ValidationIssue[] =>
  error.issues.map((issue) => {
    const path = toPath(issue.path);
    return path
      ? {
          code: `${codePrefix}_${issue.code.toUpperCase()}`,
          message: issue.message,
          path
        }
      : {
          code: `${codePrefix}_${issue.code.toUpperCase()}`,
          message: issue.message
        };
  });

const enforcePolicy = (
  content: ProductContent,
  policy: ValidationPolicy
): ValidationResult => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (content.claims.length > policy.maxClaimsPerProduct) {
    errors.push({
      code: "POLICY_MAX_CLAIMS_EXCEEDED",
      message: `Claim count ${content.claims.length} exceeds maxClaimsPerProduct ${policy.maxClaimsPerProduct}`,
      path: "claims"
    });
  }

  const allowed = new Set(policy.allowedCategories);
  const requiredSource = new Set(policy.requireSourceForCategories);

  for (const [index, claim] of content.claims.entries()) {
    if (!allowed.has(claim.category)) {
      errors.push({
        code: "POLICY_CATEGORY_NOT_ALLOWED",
        message: `Category '${claim.category}' is not allowed by policy`,
        path: `claims.${index}.category`
      });
    }

    if (claim.confidence < policy.minConfidence) {
      errors.push({
        code: "POLICY_MIN_CONFIDENCE",
        message: `Confidence ${claim.confidence} is below minConfidence ${policy.minConfidence}`,
        path: `claims.${index}.confidence`
      });
    }

    if (requiredSource.has(claim.category) && claim.sourceUrl.trim().length === 0) {
      errors.push({
        code: "POLICY_SOURCE_REQUIRED",
        message: `Category '${claim.category}' requires a sourceUrl`,
        path: `claims.${index}.sourceUrl`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

export const validateProductContent = (
  contentInput: unknown,
  policyInput: unknown
): ValidationResult => {
  const content = ProductContentSchema.safeParse(contentInput);
  if (!content.success) {
    const errors = fromZodError(content.error, "SCHEMA_PRODUCT");
    return { valid: false, errors, warnings: [] };
  }

  const policy = ValidationPolicySchema.safeParse(policyInput);
  if (!policy.success) {
    const errors = fromZodError(policy.error, "SCHEMA_POLICY");
    return { valid: false, errors, warnings: [] };
  }

  return enforcePolicy(content.data, policy.data);
};

export const validateRuleCatalog = (
  catalogInput: unknown
): ValidationResult & { catalog?: RuleCatalog } => {
  const parsed = RuleCatalogSchema.safeParse(catalogInput);
  if (!parsed.success) {
    const errors = fromZodError(parsed.error, "SCHEMA_PRODUCT");
    return { valid: false, errors, warnings: [] };
  }

  return { valid: true, errors: [], warnings: [], catalog: parsed.data };
};

export const validateApplicabilityCatalog = (
  catalogInput: unknown
): ValidationResult & { catalog?: ApplicabilityCatalog } => {
  const parsed = ApplicabilityCatalogSchema.safeParse(catalogInput);
  if (!parsed.success) {
    const errors = fromZodError(parsed.error, "SCHEMA_POLICY");
    return { valid: false, errors, warnings: [] };
  }

  return { valid: true, errors: [], warnings: [], catalog: parsed.data };
};

type ApplicabilityState = "applicable" | "not_applicable" | "unknown";

const normalize = (value: string): string => value.trim().toLowerCase();

const tokenValue = (listing: ListingInput, token: string): boolean | undefined => {
  if (token === "equipment_intentionally_emits_or_receives_radio_waves_for_radio_communication_or_radiodetermination") {
    return listing.is_radio_equipment;
  }

  if (token === "equipment_not_excluded_under_RED_Article1_or_Annex") {
    return !listing.is_red_excluded;
  }

  if (token === "equipment_not_radio_equipment_under_RED") {
    return !listing.is_radio_equipment;
  }

  if (token === "equipment_designed_voltage_between_50_and_1000_V_AC_or_between_75_and_1500_V_DC") {
    const ac = typeof listing.voltage_ac === "number" && listing.voltage_ac >= 50 && listing.voltage_ac <= 1000;
    const dc = typeof listing.voltage_dc === "number" && listing.voltage_dc >= 75 && listing.voltage_dc <= 1500;
    return ac || dc;
  }

  if (token === "equipment_not_listed_in_LVD_Annex_II_exclusions") {
    return !listing.is_lvd_annex_ii_excluded;
  }

  if (token === "equipment_meets_definition_of_equipment_in_EMC_Article2") {
    return listing.is_emc_equipment;
  }

  if (token === "equipment_liable_to_generate_electromagnetic_disturbance_or_performance_liable_to_be_affected") {
    return listing.is_emc_relevant;
  }

  if (token === "equipment_radio_equipment_under_RED") {
    return listing.is_radio_equipment;
  }

  return undefined;
};

const getApplicabilityState = (
  ruleId: string,
  listing: ListingInput,
  applicability: ApplicabilityCatalog
): ApplicabilityState => {
  const scoped = applicability.applicability_rules.filter((entry) => entry.rule_id === ruleId);
  if (scoped.length === 0) {
    return "applicable";
  }

  let hasUnknown = false;
  let hasMatchApply = false;

  for (const entry of scoped) {
    let allTrue = true;
    let unknown = false;

    for (const token of entry.if) {
      const value = tokenValue(listing, token);
      if (typeof value === "undefined") {
        unknown = true;
      } else if (!value) {
        allTrue = false;
      }
    }

    if (allTrue && !unknown) {
      if (entry.then_not_applies.length > 0 && entry.then_applies.length === 0) {
        return "not_applicable";
      }

      if (entry.then_applies.length > 0) {
        hasMatchApply = true;
      }
    } else if (unknown) {
      hasUnknown = true;
    }
  }

  if (hasMatchApply) {
    return "applicable";
  }

  if (hasUnknown) {
    return "unknown";
  }

  return "not_applicable";
};

const legalBlockable = (rule: RuleRecord): boolean => {
  if (rule.requirement_type !== "legal") {
    return false;
  }

  if (rule.confidence === "low") {
    return false;
  }

  return (
    rule.source_type === "eurlex" ||
    rule.source_type === "eu_official" ||
    rule.source_type === "national_authority"
  );
};

const evaluateRule = (
  listing: ListingInput,
  rule: RuleRecord,
  applicability: ApplicabilityCatalog
): ListingEvaluationResult["evaluations"][number] => {
  const appState = getApplicabilityState(rule.rule_id, listing, applicability);
  if (appState === "not_applicable") {
    return {
      rule_id: rule.rule_id,
      status: "not_applicable",
      blocking: false,
      message: "Rule is not applicable for this listing context.",
      requirement_type: rule.requirement_type,
      source_type: rule.source_type,
      confidence: rule.confidence
    };
  }

  if (appState === "unknown") {
    return {
      rule_id: rule.rule_id,
      status: "unknown",
      blocking: false,
      message: "Rule applicability could not be determined from listing input.",
      requirement_type: rule.requirement_type,
      source_type: rule.source_type,
      confidence: rule.confidence
    };
  }

  if (rule.required_evidence_keys.length === 0) {
    return {
      rule_id: rule.rule_id,
      status: "unknown",
      blocking: false,
      message: "Rule has no machine-readable required_evidence_keys.",
      requirement_type: rule.requirement_type,
      source_type: rule.source_type,
      confidence: rule.confidence
    };
  }

  const byKey = new Map(
    listing.evidence_documents.map((doc) => [normalize(doc.document_key), doc])
  );
  const missingKeys = rule.required_evidence_keys.filter(
    (key) => !byKey.has(normalize(key))
  );

  if (missingKeys.length > 0) {
    return {
      rule_id: rule.rule_id,
      status: "missing",
      blocking: legalBlockable(rule),
      message: `Missing evidence keys: ${missingKeys.join(", ")}`,
      requirement_type: rule.requirement_type,
      source_type: rule.source_type,
      confidence: rule.confidence
    };
  }

  const scopedDocs = rule.required_evidence_keys
    .map((key) => byKey.get(normalize(key)))
    .filter((doc): doc is NonNullable<typeof doc> => typeof doc !== "undefined");

  if (scopedDocs.some((doc) => doc.status === "stale")) {
    return {
      rule_id: rule.rule_id,
      status: "stale",
      blocking: legalBlockable(rule),
      message: "One or more required evidence documents are marked stale.",
      requirement_type: rule.requirement_type,
      source_type: rule.source_type,
      confidence: rule.confidence
    };
  }

  if (scopedDocs.some((doc) => doc.status === "mismatched")) {
    return {
      rule_id: rule.rule_id,
      status: "mismatched",
      blocking: legalBlockable(rule),
      message: "One or more required evidence documents are mismatched.",
      requirement_type: rule.requirement_type,
      source_type: rule.source_type,
      confidence: rule.confidence
    };
  }

  if (scopedDocs.some((doc) => typeof doc.last_verified_at !== "string")) {
    return {
      rule_id: rule.rule_id,
      status: "unknown",
      blocking: false,
      message: "At least one required evidence document has no last_verified_at date.",
      requirement_type: rule.requirement_type,
      source_type: rule.source_type,
      confidence: rule.confidence
    };
  }

  return {
    rule_id: rule.rule_id,
    status: "present",
    blocking: false,
    message: "All required evidence documents are present.",
    requirement_type: rule.requirement_type,
    source_type: rule.source_type,
    confidence: rule.confidence
  };
};

export const evaluateListingAgainstRuleCatalog = (
  listingInput: unknown,
  ruleCatalogInput: unknown,
  applicabilityCatalogInput: unknown
): ValidationResult & { result?: ListingEvaluationResult } => {
  const listing = ListingInputSchema.safeParse(listingInput);
  if (!listing.success) {
    const errors = fromZodError(listing.error, "SCHEMA_PRODUCT");
    return { valid: false, errors, warnings: [] };
  }

  const rules = RuleCatalogSchema.safeParse(ruleCatalogInput);
  if (!rules.success) {
    const errors = fromZodError(rules.error, "SCHEMA_POLICY");
    return { valid: false, errors, warnings: [] };
  }

  const applicability = ApplicabilityCatalogSchema.safeParse(applicabilityCatalogInput);
  if (!applicability.success) {
    const errors = fromZodError(applicability.error, "SCHEMA_POLICY");
    return { valid: false, errors, warnings: [] };
  }

  const evaluations = rules.data.rules.map((rule) =>
    evaluateRule(listing.data, rule, applicability.data)
  );
  const blockingIssues = evaluations.filter((row) => row.blocking);
  const warningsFromRows = evaluations.filter(
    (row) => row.status === "unknown" || (row.status !== "present" && !row.blocking)
  );

  const result: ListingEvaluationResult = {
    listing_id: listing.data.listing_id,
    evaluations,
    summary: {
      total_rules: evaluations.length,
      blocking_issues: blockingIssues.length,
      missing: evaluations.filter((row) => row.status === "missing").length,
      stale: evaluations.filter((row) => row.status === "stale").length,
      mismatched: evaluations.filter((row) => row.status === "mismatched").length,
      warnings: warningsFromRows.length,
      unknown: evaluations.filter((row) => row.status === "unknown").length,
      not_applicable: evaluations.filter((row) => row.status === "not_applicable").length,
      present: evaluations.filter((row) => row.status === "present").length
    }
  };

  const errors: ValidationIssue[] = blockingIssues.map((row) => ({
    code: "RULE_BLOCKING",
    message: row.message,
    path: row.rule_id
  }));
  const warnings: ValidationIssue[] = warningsFromRows.map((row) => ({
    code: row.status === "unknown" ? "RULE_UNKNOWN" : "RULE_WARNING",
    message: row.message,
    path: row.rule_id
  }));

  return {
    valid: blockingIssues.length === 0,
    errors,
    warnings,
    result
  };
};
