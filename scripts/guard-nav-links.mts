import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const docsDir = "docs";
const requiredPages = [
  "./index.html",
  "./beachhead.html",
  "./paid-pilots.html",
  "./crm-setup.html",
  "./roadmap.html",
  "./research.html",
  "./technical.html"
];

for (const page of requiredPages) {
  const relative = page.replace("./", "");
  const fullPath = join(docsDir, relative);
  if (!existsSync(fullPath)) {
    console.error(`Required page is missing: ${fullPath}`);
    process.exit(1);
  }
}

const htmlFiles = readdirSync(docsDir).filter((file) => file.endsWith(".html"));
const violations: string[] = [];

for (const file of htmlFiles) {
  const fullPath = join(docsDir, file);
  const content = readFileSync(fullPath, "utf8");

  const navMatch = content.match(/<nav class="top-nav"[\s\S]*?<\/nav>/);
  if (!navMatch) {
    violations.push(`${fullPath}: missing <nav class="top-nav"> block`);
    continue;
  }

  const navContent = navMatch[0];
  for (const page of requiredPages) {
    const linkPattern = new RegExp(`href="${page.replace(".", "\\.")}"`);
    if (!linkPattern.test(navContent)) {
      violations.push(`${fullPath}: missing nav link ${page}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Navigation integrity check failed:");
  for (const violation of violations) {
    console.error(` - ${violation}`);
  }
  process.exit(1);
}

console.log("OK: all pages include complete top-nav links.");
