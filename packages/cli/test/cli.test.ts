import assert from "node:assert/strict";
import test from "node:test";

import { runCli } from "../src/index.js";

test("runCli returns failure for unknown command", async () => {
  const code = await runCli(["unknown"]);
  assert.equal(code, 1);
});
