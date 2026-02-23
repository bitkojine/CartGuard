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
