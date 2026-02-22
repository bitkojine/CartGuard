import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const bannedPattern = /\.(?:js|mjs|cjs)$/i;
const allowedPaths = new Set<string>();

const output = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8"
});

const files = output.split("\0").filter(Boolean);
const bannedFiles = files.filter(
  (file) => existsSync(file) && bannedPattern.test(file) && !allowedPaths.has(file)
);

if (bannedFiles.length > 0) {
  console.error("Blocked file extensions detected (.js/.mjs/.cjs):");
  for (const file of bannedFiles) {
    console.error(` - ${file}`);
  }
  process.exit(1);
}

console.log("OK: no tracked .js/.mjs/.cjs files found.");
