import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, "..");

test("sample-product.json has claims", async () => {
  const raw = await readFile(join(packageRoot, "sample-product.json"), "utf8");
  const data = JSON.parse(raw);

  assert.equal(Array.isArray(data.claims), true);
  assert.equal(data.claims.length > 0, true);
});
