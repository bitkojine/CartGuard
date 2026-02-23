import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const docsDir = "docs";
const stylesPath = join(docsDir, "styles.css");
const opsAllPages = [
  "ops/index.html",
  "ops/beachhead.html",
  "ops/paid-pilots.html",
  "ops/crm-setup.html",
  "ops/roadmap.html",
  "ops/research.html",
  "ops/technical.html",
  "ops/careers.html"
];
const opsNavPages = [
  "/CartGuard/ops/",
  "/CartGuard/ops/beachhead.html",
  "/CartGuard/ops/paid-pilots.html",
  "/CartGuard/ops/research.html",
  "/CartGuard/ops/technical.html",
  "/CartGuard/ops/careers.html",
  "/CartGuard/sales/"
];
const opsPages = [...opsAllPages, "404.html"];
const salesPages = [
  "sales/index.html",
  "sales/problem.html",
  "sales/solution.html",
  "sales/proof.html",
  "sales/pilot.html"
];
const salesNavPages = [
  "/CartGuard/sales/",
  "/CartGuard/sales/problem.html",
  "/CartGuard/sales/solution.html",
  "/CartGuard/sales/proof.html",
  "/CartGuard/sales/pilot.html",
  "/CartGuard/ops/"
];
const allRequiredPages = [...opsAllPages, ...salesPages];

const walkHtmlFiles = (baseDir: string): string[] => {
  const files: string[] = [];
  const walk = (relativeDir: string): void => {
    const directory = join(baseDir, relativeDir);
    const entries = readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      const nextRelative = relativeDir ? join(relativeDir, entry.name) : entry.name;
      if (entry.isDirectory()) {
        walk(nextRelative);
      } else if (entry.isFile() && nextRelative.endsWith(".html")) {
        files.push(nextRelative);
      }
    }
  };
  walk("");
  return files;
};

for (const page of allRequiredPages) {
  const fullPath = join(docsDir, page);
  if (!existsSync(fullPath)) {
    console.error(`Required page is missing: ${fullPath}`);
    process.exit(1);
  }
}

const htmlFiles = walkHtmlFiles(docsDir);
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
  const normalizedFile = file;

  const navMatch = content.match(/<nav class="top-nav"[\s\S]*?<\/nav>/);
  if (!navMatch) {
    if (normalizedFile !== "index.html") {
      violations.push(`${fullPath}: missing <nav class="top-nav"> block`);
    }
    continue;
  }

  const navContent = navMatch[0];
  const isOpsPage = opsPages.includes(normalizedFile);
  const expectedPages = isOpsPage ? opsNavPages : salesNavPages;
  const expectedHomeHref = isOpsPage ? "/CartGuard/ops/" : "/CartGuard/sales/";
  const homePattern = new RegExp(`href="${expectedHomeHref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>\\s*Home\\s*<`);
  if (!homePattern.test(navContent)) {
    violations.push(`${fullPath}: nav must include explicit Home link to ${expectedHomeHref}`);
  }

  for (const page of expectedPages) {
    const linkPattern = new RegExp(`href="${page.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`);
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
