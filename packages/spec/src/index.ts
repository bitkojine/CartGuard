import { z } from "zod";

export const ClaimCategoryValues = [
  "sustainability",
  "health",
  "pricing",
  "general"
] as const;

export const ClaimCategorySchema = z.enum(ClaimCategoryValues);

export type ClaimCategory = z.infer<typeof ClaimCategorySchema>;

export const ClaimSchema = z.object({
  id: z.string().uuid(),
  statement: z.string().min(1),
  sourceUrl: z.string().url(),
  category: ClaimCategorySchema,
  confidence: z.number().min(0).max(1),
  createdAt: z.string().datetime()
});

export type Claim = z.infer<typeof ClaimSchema>;

const ProductContentSchemaBase = z.object({
  productId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  claims: z.array(ClaimSchema).min(1)
});

export const ProductContentSchema = ProductContentSchemaBase.superRefine(
  (content, ctx) => {
    const seen = new Set<string>();

    for (const [index, claim] of content.claims.entries()) {
      const key = [
        claim.statement.trim().toLowerCase(),
        claim.sourceUrl.trim().toLowerCase(),
        claim.category
      ].join("|");

      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate claim detected",
          path: ["claims", index]
        });
      } else {
        seen.add(key);
      }
    }
  }
);

export type ProductContent = z.infer<typeof ProductContentSchema>;

export const ValidationPolicySchema = z.object({
  minConfidence: z.number().min(0).max(1),
  allowedCategories: z.array(ClaimCategorySchema),
  requireSourceForCategories: z.array(ClaimCategorySchema),
  maxClaimsPerProduct: z.number().int().positive()
});

export type ValidationPolicy = z.infer<typeof ValidationPolicySchema>;

export const RequirementTypeValues = ["legal", "marketplace", "best_practice"] as const;

export const RequirementTypeSchema = z.enum(RequirementTypeValues);

export type RequirementType = z.infer<typeof RequirementTypeSchema>;

export const SourceTypeValues = [
  "eurlex",
  "eu_official",
  "national_authority",
  "amazon_official",
  "secondary"
] as const;

export const SourceTypeSchema = z.enum(SourceTypeValues);

export type SourceType = z.infer<typeof SourceTypeSchema>;

export const ConfidenceLevelValues = ["high", "medium", "low"] as const;

export const ConfidenceLevelSchema = z.enum(ConfidenceLevelValues);

export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export const ValidationStatusValues = [
  "missing",
  "present",
  "stale",
  "mismatched",
  "not_applicable",
  "unknown"
] as const;

export const ValidationStatusSchema = z.enum(ValidationStatusValues);

export type ValidationStatus = z.infer<typeof ValidationStatusSchema>;

export const SubmissionMetadataSchema = z.object({
  path: z.string(),
  deadline: z.string(),
  enforcement_if_missed: z.string()
});

export type SubmissionMetadata = z.infer<typeof SubmissionMetadataSchema>;

export const RuleRecordSchema = z.object({
  rule_id: z.string().min(1),
  jurisdiction: z.string().min(1),
  channel: z.string().min(1),
  requirement_type: RequirementTypeSchema,
  trigger: z.string().min(1),
  required_evidence: z.array(z.string().min(1)).min(1),
  validation_checks: z.array(z.string().min(1)).min(1),
  submission_metadata: SubmissionMetadataSchema,
  source_url: z.string().url(),
  source_type: SourceTypeSchema,
  last_verified_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  confidence: ConfidenceLevelSchema,
  unknown_reason: z.string()
});

export type RuleRecord = z.infer<typeof RuleRecordSchema>;

export const RuleCatalogSchema = z.object({
  rules: z.array(RuleRecordSchema).min(1)
});

export type RuleCatalog = z.infer<typeof RuleCatalogSchema>;

export const ApplicabilityRuleSchema = z.object({
  rule_id: z.string().min(1),
  if: z.array(z.string().min(1)).min(1),
  then_applies: z.array(z.string().min(1)),
  then_not_applies: z.array(z.string().min(1)),
  source_url: z.string().url(),
  confidence: ConfidenceLevelSchema,
  last_verified_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export type ApplicabilityRule = z.infer<typeof ApplicabilityRuleSchema>;

export const ApplicabilityCatalogSchema = z.object({
  applicability_rules: z.array(ApplicabilityRuleSchema).min(1)
});

export type ApplicabilityCatalog = z.infer<typeof ApplicabilityCatalogSchema>;
