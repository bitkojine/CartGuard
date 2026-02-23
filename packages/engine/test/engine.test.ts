import assert from "node:assert/strict";
import test from "node:test";

import {
  validateApplicabilityCatalog,
  validateProductContent,
  validateRuleCatalog
} from "../src/index.js";

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

void test("fails when claim confidence is below policy threshold", () => {
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

void test("fails when category is not allowed by policy", () => {
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

void test("fails when claims exceed policy max", () => {
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

void test("returns schema errors for duplicate claims", () => {
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

void test("validates rule catalog payloads", () => {
  const result = validateRuleCatalog({
    rules: [
      {
        rule_id: "LVD-DOC-DECL-003",
        jurisdiction: "EU",
        channel: "All",
        requirement_type: "legal",
        trigger: "Equipment in LVD scope is placed on the market",
        required_evidence: ["EU declaration of conformity"],
        validation_checks: ["Declaration exists"],
        submission_metadata: {
          path: "",
          deadline: "",
          enforcement_if_missed: ""
        },
        source_url: "https://www.legislation.gov.uk/eudr/2014/35/chapter/3",
        source_type: "eurlex",
        last_verified_at: "2026-02-23",
        confidence: "high",
        unknown_reason: ""
      }
    ]
  });

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

void test("rejects malformed applicability catalog payloads", () => {
  const result = validateApplicabilityCatalog({
    applicability_rules: [
      {
        rule_id: "APPL-RED-001",
        if: [],
        then_applies: ["RED_2014_53_EU"],
        then_not_applies: ["LVD_2014_35_EU_for_safety"],
        source_url: "https://www.legislation.gov.uk/eudr/2014/53/body",
        confidence: "high",
        last_verified_at: "2026-02-23"
      }
    ]
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.length > 0, true);
});
