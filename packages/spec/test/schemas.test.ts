import assert from "node:assert/strict";
import test from "node:test";

import {
  ProductContentSchema,
  ValidationPolicySchema
} from "../src/index.js";

void test("ProductContentSchema rejects empty claims array", () => {
  const result = ProductContentSchema.safeParse({
    productId: "sku-1",
    title: "Title",
    description: "Description",
    claims: []
  });

  assert.equal(result.success, false);
});

void test("ProductContentSchema rejects duplicate claims", () => {
  const result = ProductContentSchema.safeParse({
    productId: "sku-1",
    title: "Reusable bottle",
    description: "A reusable bottle",
    claims: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        statement: "Made from 70% recycled steel",
        sourceUrl: "https://example.com/spec-sheet",
        category: "sustainability",
        confidence: 0.9,
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        statement: "Made from 70% recycled steel",
        sourceUrl: "https://example.com/spec-sheet",
        category: "sustainability",
        confidence: 0.8,
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ]
  });

  assert.equal(result.success, false);
});

void test("ValidationPolicySchema enforces confidence bounds", () => {
  const result = ValidationPolicySchema.safeParse({
    minConfidence: 1.2,
    allowedCategories: ["general"],
    requireSourceForCategories: ["general"],
    maxClaimsPerProduct: 3
  });

  assert.equal(result.success, false);
});
