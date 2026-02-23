import assert from "node:assert/strict";
import test from "node:test";

import {
  ApplicabilityCatalogSchema,
  ListingInputSchema,
  ProductContentSchema,
  RuleCatalogSchema,
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

void test("RuleCatalogSchema accepts valid catalog rows", () => {
  const result = RuleCatalogSchema.safeParse({
    rules: [
      {
        rule_id: "AMZN-MYC-REQ-001",
        jurisdiction: "DE",
        channel: "AmazonDE",
        requirement_type: "marketplace",
        trigger: "Product appears in MYC with compliance requirements",
        required_evidence: ["Documents requested in MYC"],
        validation_checks: ["Entry exists in MYC"],
        submission_metadata: {
          path: "Seller Central -> Performance -> Account Health -> MYC",
          deadline: "unknown",
          enforcement_if_missed: "unknown"
        },
        source_url: "https://sellercentral.amazon.com/help/hub/reference/external/GUDCM66BHG6B4GXZ",
        source_type: "amazon_official",
        last_verified_at: "2026-02-23",
        confidence: "medium",
        unknown_reason: ""
      }
    ]
  });

  assert.equal(result.success, true);
});

void test("ApplicabilityCatalogSchema rejects invalid date", () => {
  const result = ApplicabilityCatalogSchema.safeParse({
    applicability_rules: [
      {
        rule_id: "APPL-RED-001",
        if: ["is_radio_equipment"],
        then_applies: ["RED_2014_53_EU"],
        then_not_applies: ["LVD_2014_35_EU_for_safety"],
        source_url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014L0053",
        confidence: "high",
        last_verified_at: "2026/02/23"
      }
    ]
  });

  assert.equal(result.success, false);
});

void test("ListingInputSchema accepts listing evidence payload", () => {
  const result = ListingInputSchema.safeParse({
    listing_id: "amz-de-001",
    product_id: "sku-123",
    product_version: "v1",
    product_archetype: "non-radio mains electronics",
    jurisdiction: "EU",
    channel: "AmazonDE",
    is_radio_equipment: false,
    voltage_ac: 230,
    evidence_documents: [
      {
        document_key: "eu_doc_lvd",
        document_name: "LVD declaration",
        status: "present",
        last_verified_at: "2026-02-23"
      }
    ]
  });

  assert.equal(result.success, true);
});

void test("RuleCatalogSchema defaults required_evidence_keys", () => {
  const result = RuleCatalogSchema.safeParse({
    rules: [
      {
        rule_id: "rule-1",
        jurisdiction: "EU",
        channel: "All",
        requirement_type: "legal",
        trigger: "x",
        required_evidence: ["evidence"],
        validation_checks: ["check"],
        submission_metadata: {
          path: "",
          deadline: "",
          enforcement_if_missed: ""
        },
        source_url: "https://example.com/rule",
        source_type: "eurlex",
        last_verified_at: "2026-02-23",
        confidence: "high",
        unknown_reason: ""
      }
    ]
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.success ? result.data.rules[0]?.required_evidence_keys : [], []);
});
