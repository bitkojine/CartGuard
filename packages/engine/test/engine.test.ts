import assert from "node:assert/strict";
import test from "node:test";

import { validateProductContent } from "../src/index.js";

const baseContent = {
  productId: "sku-123",
  title: "Eco Bottle",
  description: "Reusable bottle",
  claims: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      statement: "Made from recycled metal",
      sourceUrl: "https://example.com/source-1",
      category: "sustainability",
      confidence: 0.9,
      createdAt: "2026-01-20T12:00:00.000Z"
    }
  ]
} as const;

const basePolicy = {
  minConfidence: 0.8,
  allowedCategories: ["sustainability", "general"],
  requireSourceForCategories: ["sustainability"],
  maxClaimsPerProduct: 2
} as const;

test("fails when claim confidence is below policy threshold", () => {
  const result = validateProductContent(
    {
      ...baseContent,
      claims: [
        {
          ...baseContent.claims[0],
          confidence: 0.2
        }
      ]
    },
    basePolicy
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.errors.some((error) => error.code === "POLICY_MIN_CONFIDENCE"),
    true
  );
});

test("fails when category is not allowed by policy", () => {
  const result = validateProductContent(
    {
      ...baseContent,
      claims: [
        {
          ...baseContent.claims[0],
          category: "health"
        }
      ]
    },
    basePolicy
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.errors.some((error) => error.code === "POLICY_CATEGORY_NOT_ALLOWED"),
    true
  );
});

test("fails when claims exceed policy max", () => {
  const result = validateProductContent(
    {
      ...baseContent,
      claims: [
        baseContent.claims[0],
        {
          ...baseContent.claims[0],
          id: "22222222-2222-4222-8222-222222222222",
          statement: "Third-party lab tested"
        },
        {
          ...baseContent.claims[0],
          id: "33333333-3333-4333-8333-333333333333",
          statement: "Lifetime durability warranty"
        }
      ]
    },
    basePolicy
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.errors.some((error) => error.code === "POLICY_MAX_CLAIMS_EXCEEDED"),
    true
  );
});

test("returns schema errors for duplicate claims", () => {
  const result = validateProductContent(
    {
      ...baseContent,
      claims: [
        baseContent.claims[0],
        {
          ...baseContent.claims[0],
          id: "44444444-4444-4444-8444-444444444444"
        }
      ]
    },
    basePolicy
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.errors.some((error) => error.code.startsWith("SCHEMA_PRODUCT")),
    true
  );
});
