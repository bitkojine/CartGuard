import type { ZodError } from "zod";
import {
  ApplicabilityCatalogSchema,
  ProductContentSchema,
  RuleCatalogSchema,
  ValidationPolicySchema,
  type ApplicabilityCatalog,
  type ProductContent,
  type RuleCatalog,
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
