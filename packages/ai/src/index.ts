import { ProductContentSchema, type ProductContent } from "@cartguard/spec";

/** Contract for content generation adapters. */
export interface ContentGenerator {
  generate(input: unknown): Promise<ProductContent>;
}

const assertProductContent = (data: unknown): ProductContent => {
  const parsed = ProductContentSchema.safeParse(data);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Generated content failed ProductContentSchema validation: ${message}`);
  }

  return parsed.data;
};

/**
 * Deterministic mock generator for development, demos, and tests.
 * Real LLM/RAG adapters should implement the same ContentGenerator contract.
 */
export class MockContentGenerator implements ContentGenerator {
  generate(input: unknown): Promise<ProductContent> {
    const seed = input as {
      productId?: string;
      title?: string;
      description?: string;
      sourceUrl?: string;
      category?: "sustainability" | "health" | "pricing" | "general";
    };

    const generated = {
      productId: seed.productId ?? "generated-sku-001",
      title: seed.title ?? "Generated Product Title",
      description:
        seed.description ??
        "AI-assisted product content with source-linked claims.",
      claims: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          statement: "Packaging uses 60% recycled cardboard",
          sourceUrl: seed.sourceUrl ?? "https://example.com/recycled-packaging-report",
          category: seed.category ?? "sustainability",
          confidence: 0.82,
          createdAt: new Date().toISOString()
        }
      ]
    };

    return Promise.resolve(assertProductContent(generated));
  }
}

/** Validate arbitrary generated payloads against ProductContentSchema. */
export const ensureGeneratedContent = (content: unknown): ProductContent =>
  assertProductContent(content);
