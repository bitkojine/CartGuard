import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const docsDir = "docs";
const htmlFiles = readdirSync(docsDir).filter((file) => file.endsWith(".html"));
const violations: string[] = [];

for (const file of htmlFiles) {
  const fullPath = join(docsDir, file);
  const content = readFileSync(fullPath, "utf8");

  if (!/id="css-hard-refresh"/.test(content)) {
    violations.push(`${fullPath}: missing css hard refresh button`);
  }

  if (!/id="css-refresh-script"/.test(content)) {
    violations.push(`${fullPath}: missing css refresh script block`);
  }

  if (!/const applyStampToStylesheets = \(stamp\) =>/.test(content)) {
    violations.push(`${fullPath}: css refresh script must define stylesheet stamp applier`);
  }

  if (!/document\.getElementById\("css-hard-refresh"\)/.test(content)) {
    violations.push(`${fullPath}: css refresh script must select button by id`);
  }

  if (!/querySelectorAll\('link\[rel="stylesheet"\]'\)/.test(content)) {
    violations.push(`${fullPath}: css refresh script must target stylesheet links`);
  }

  if (!/searchParams\.set\("css_refresh",\s*stamp\)/.test(content)) {
    violations.push(`${fullPath}: css refresh script must set css_refresh cache-buster`);
  }

  if (!/window\.location\.replace\(nextUrl\.toString\(\)\)/.test(content)) {
    violations.push(`${fullPath}: css refresh script must force page reload with cache-buster url`);
  }

  if (!/button\.addEventListener\("click",\s*refreshCss\)/.test(content)) {
    violations.push(`${fullPath}: css refresh script must wire click handler`);
  }
}

if (violations.length > 0) {
  console.error("CSS refresh guard failed:");
  for (const violation of violations) {
    console.error(` - ${violation}`);
  }
  process.exit(1);
}

console.log("OK: css refresh button and script are present and valid on all pages.");
