import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const docsDir = "docs";
const stylesPath = join(docsDir, "styles.css");
const opsPages = [
  "ops/index.html",
  "ops/beachhead.html",
  "ops/paid-pilots.html",
  "ops/crm-setup.html",
  "ops/roadmap.html",
  "ops/research.html",
  "ops/technical.html",
  "ops/careers.html",
  "404.html"
];
const violations: string[] = [];

if (!existsSync(stylesPath)) {
  violations.push(`${stylesPath}: missing styles.css`);
} else {
  const styles = readFileSync(stylesPath, "utf8");
  if (!/\.warning-banner\s*\{[\s\S]*?border:\s*2px\s+solid\s+#b21f44;[\s\S]*?\}/.test(styles)) {
    violations.push(`${stylesPath}: .warning-banner must define required border style`);
  }
  if (!/\.warning-banner\s*\{[\s\S]*?background:\s*#fff1f4;[\s\S]*?\}/.test(styles)) {
    violations.push(`${stylesPath}: .warning-banner must define required background style`);
  }
}

for (const file of opsPages) {
  const fullPath = join(docsDir, file);
  const content = readFileSync(fullPath, "utf8");

  if (!/<section class="warning-banner" aria-label="Brutal priority warning">/.test(content)) {
    violations.push(`${fullPath}: missing brutal warning banner`);
    continue;
  }

  if (!/<\/nav>\s*<section class="warning-banner"/.test(content)) {
    violations.push(`${fullPath}: warning banner must be placed directly after nav`);
  }

  if (!/Priority 1: prove repeatable pilot-to-paid conversion\./.test(content)) {
    violations.push(`${fullPath}: missing Priority 1 message`);
  }

  if (!/Priority 2: secure budget-owner buy-in early in every pilot\./.test(content)) {
    violations.push(`${fullPath}: missing Priority 2 message`);
  }
}

if (violations.length > 0) {
  console.error("Brutal warning banner guard failed:");
  for (const violation of violations) {
    console.error(` - ${violation}`);
  }
  process.exit(1);
}

console.log("OK: brutal warning banner is present and consistent on all pages.");
