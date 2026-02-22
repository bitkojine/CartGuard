import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const typeScriptPattern = /\.(?:ts|mts|tsx|cts)$/i;
const explicitAnyPattern = /\bany\b/;
const ignorePaths = new Set<string>(["pnpm-lock.yaml"]);

const output = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8"
});

const files = output.split("\0").filter(Boolean);
const targetFiles = files.filter((file) => typeScriptPattern.test(file) && !ignorePaths.has(file));

const violations: Array<{ file: string; line: number; text: string }> = [];

for (const file of targetFiles) {
  const source = readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (explicitAnyPattern.test(line)) {
      violations.push({
        file,
        line: index + 1,
        text: line.trim()
      });
    }
  });
}

if (violations.length > 0) {
  console.error("Explicit 'any' usage is not allowed. Violations:");
  for (const violation of violations) {
    console.error(` - ${violation.file}:${violation.line} ${violation.text}`);
  }
  process.exit(1);
}

console.log("OK: no explicit 'any' usage found in tracked TypeScript files.");
