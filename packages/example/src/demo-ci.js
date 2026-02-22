import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, "..");
const repoRoot = join(packageRoot, "..", "..");
const cliEntry = join(repoRoot, "packages", "cli", "dist", "src", "bin", "cartguard.js");

const run = (args) => {
  const result = spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: packageRoot,
    stdio: "inherit"
  });

  return result.status ?? 1;
};

const generatedPath = join(packageRoot, "generated-product.json");

const generateCode = run([
  "generate",
  join(packageRoot, "sample-input.json"),
  "--out",
  generatedPath
]);

if (generateCode !== 0) {
  process.exit(generateCode);
}

const validateCode = run([
  "validate",
  generatedPath,
  "--policy",
  join(packageRoot, "strict-policy.json"),
  "--json"
]);

if (validateCode !== 0) {
  console.error("CI gate failed: generated content did not satisfy strict policy.");
  process.exit(1);
}

console.log("CI gate passed.");
