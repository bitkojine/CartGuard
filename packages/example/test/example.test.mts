import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, "..");

void test("sample-product.json has claims", async () => {
  const raw = await readFile(join(packageRoot, "sample-product.json"), "utf8");
  const parsed = JSON.parse(raw) as { claims?: unknown };
  const claims = parsed.claims;

  assert.equal(Array.isArray(claims), true);
  assert.equal((claims as unknown[]).length > 0, true);
});
