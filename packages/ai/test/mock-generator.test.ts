import assert from "node:assert/strict";
import test from "node:test";

import { MockContentGenerator } from "../src/index.js";

void test("MockContentGenerator returns ProductContent-compatible payload", async () => {
  const generator = new MockContentGenerator();
  const product = await generator.generate({ productId: "sku-ai-1" });

  assert.equal(product.productId, "sku-ai-1");
  assert.equal(product.claims.length > 0, true);
});
