import {
  GeneratorSeedSchema,
  ProductContentSchema,
  type GeneratorSeed,
  type ProductContent
} from "@cartguard/spec";

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

export class MockContentGenerator implements ContentGenerator {
  generate(input: unknown): Promise<ProductContent> {
    const seedResult = GeneratorSeedSchema.safeParse(input);
    const seed: GeneratorSeed = seedResult.success ? seedResult.data : {};

    const generated = {
      productId: seed.productId ?? "generated-sku-001",
      title: seed.title ?? "Generated Product Title",
      description: seed.description ?? "AI-assisted product content with source-linked claims.",
      claims: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          statement: "Packaging uses 60% recycled cardboard",
          sourceUrl: seed.sourceUrl ?? "https://example.com/recycled-packaging-report",
          category: seed.category ?? "sustainability",
          confidence: 0.82,
          createdAt: seed.timestamp ?? "2026-02-24T00:00:00.000Z"
        }
      ]
    };

    return Promise.resolve(assertProductContent(generated));
  }
}

export const ensureGeneratedContent = (content: unknown): ProductContent =>
  assertProductContent(content);
