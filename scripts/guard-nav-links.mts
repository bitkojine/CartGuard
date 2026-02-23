import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const docsDir = "docs";
const stylesPath = join(docsDir, "styles.css");
const opsRequiredPages = [
  "./index.html",
  "./beachhead.html",
  "./paid-pilots.html",
  "./crm-setup.html",
  "./roadmap.html",
  "./research.html",
  "./technical.html",
  "./careers.html"
];
const opsPages = [...opsRequiredPages, "./404.html"];
const salesPages = [
  "./sales.html",
  "./sales-problem.html",
  "./sales-solution.html",
  "./sales-proof.html",
  "./sales-pilot.html"
];
const allRequiredPages = [...opsRequiredPages, ...salesPages];

for (const page of allRequiredPages) {
  const relative = page.replace("./", "");
  const fullPath = join(docsDir, relative);
  if (!existsSync(fullPath)) {
    console.error(`Required page is missing: ${fullPath}`);
    process.exit(1);
  }
}

const htmlFiles = readdirSync(docsDir).filter((file) => file.endsWith(".html"));
const violations: string[] = [];

if (!existsSync(stylesPath)) {
  violations.push(`${stylesPath}: missing styles.css`);
} else {
  const styles = readFileSync(stylesPath, "utf8");
  const topNavRule = styles.match(/\.top-nav\s*\{[\s\S]*?\}/);
  if (!topNavRule) {
    violations.push(`${stylesPath}: missing .top-nav CSS rule`);
  } else {
    const rule = topNavRule[0];
    if (!/position:\s*fixed\s*;/.test(rule)) {
      violations.push(`${stylesPath}: .top-nav must use position: fixed`);
    }
    if (/display:\s*none\s*;/.test(rule)) {
      violations.push(`${stylesPath}: .top-nav must not be hidden`);
    }
  }

  const mobileMarker = "@media (max-width: 680px)";
  const mobileStart = styles.indexOf(mobileMarker);
  if (mobileStart === -1) {
    violations.push(`${stylesPath}: missing @media (max-width: 680px) block for mobile nav behavior`);
  } else {
    const nextMediaStart = styles.indexOf("@media", mobileStart + mobileMarker.length);
    const mobileBlock =
      nextMediaStart === -1 ? styles.slice(mobileStart) : styles.slice(mobileStart, nextMediaStart);
    if (!mobileBlock.includes(".top-nav {")) {
      violations.push(`${stylesPath}: missing .top-nav override inside mobile media block`);
    } else {
      if (!mobileBlock.includes("position: static;")) {
        violations.push(`${stylesPath}: mobile .top-nav must use position: static`);
      }
    }
  }
}

for (const file of htmlFiles) {
  const fullPath = join(docsDir, file);
  const content = readFileSync(fullPath, "utf8");
  const normalizedFile = `./${file}`;

  const navMatch = content.match(/<nav class="top-nav"[\s\S]*?<\/nav>/);
  if (!navMatch) {
    violations.push(`${fullPath}: missing <nav class="top-nav"> block`);
    continue;
  }

  const navContent = navMatch[0];
  const expectedPages = opsPages.includes(normalizedFile) ? opsRequiredPages : salesPages;
  const expectedHomeHref = opsPages.includes(normalizedFile) ? "./index.html" : "./sales.html";
  const homePattern = new RegExp(`href="${expectedHomeHref.replace(".", "\\.")}"[^>]*>\\s*Home\\s*<`);
  if (!homePattern.test(navContent)) {
    violations.push(`${fullPath}: nav must include explicit Home link to ${expectedHomeHref}`);
  }

  for (const page of expectedPages) {
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
