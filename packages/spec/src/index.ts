import { z } from "zod";

/** Allowed claim categories in CartGuard product content. */
export const ClaimCategoryValues = [
  "sustainability",
  "health",
  "pricing",
  "general"
] as const;

/** Schema for claim category values. */
export const ClaimCategorySchema = z.enum(ClaimCategoryValues);

/** Type for claim category values. */
export type ClaimCategory = z.infer<typeof ClaimCategorySchema>;

/** Schema for a single source-linked product claim. */
export const ClaimSchema = z.object({
  id: z.string().uuid(),
  statement: z.string().min(1),
  sourceUrl: z.string().url(),
  category: ClaimCategorySchema,
  confidence: z.number().min(0).max(1),
  createdAt: z.string().datetime()
});

/** Type for a single source-linked product claim. */
export type Claim = z.infer<typeof ClaimSchema>;

const ProductContentSchemaBase = z.object({
  productId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  claims: z.array(ClaimSchema).min(1)
});

/**
 * Product content payload with schema-level integrity checks.
 * Duplicate claims are rejected by normalized statement + source URL + category.
 */
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

/** Type for product content payload. */
export type ProductContent = z.infer<typeof ProductContentSchema>;

/** Schema for policy objects that drive validation behavior. */
export const ValidationPolicySchema = z.object({
  minConfidence: z.number().min(0).max(1),
  allowedCategories: z.array(ClaimCategorySchema),
  requireSourceForCategories: z.array(ClaimCategorySchema),
  maxClaimsPerProduct: z.number().int().positive()
});

/** Type for validation policy objects. */
export type ValidationPolicy = z.infer<typeof ValidationPolicySchema>;
