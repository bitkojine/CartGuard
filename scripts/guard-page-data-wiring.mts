import { readFileSync } from "node:fs";
import { join } from "node:path";

const docsDir = "docs";
const researchPage = join(docsDir, "ops/research.html");
const proofPage = join(docsDir, "sales/proof.html");
const careersPage = join(docsDir, "ops/careers.html");

const violations: string[] = [];

const readPage = (path: string): string => readFileSync(path, "utf8");

const expectPattern = (content: string, pattern: RegExp, file: string, message: string): void => {
  if (!pattern.test(content)) {
    violations.push(`${file}: ${message}`);
  }
};

const rejectPattern = (content: string, pattern: RegExp, file: string, message: string): void => {
  if (pattern.test(content)) {
    violations.push(`${file}: ${message}`);
  }
};

const research = readPage(researchPage);
expectPattern(research, /const DATA_ROOT = '\/CartGuard\/assets\/research';/, researchPage, "must use absolute research asset root");
expectPattern(research, /fetchJson\(`\$\{DATA_ROOT\}\/prompts\.json`/, researchPage, "must load prompts from research assets");
expectPattern(research, /fetchJson\(`\$\{DATA_ROOT\}\/index\.json`/, researchPage, "must load index from research assets");
expectPattern(research, /fetchJson\(`\$\{DATA_ROOT\}\/docs\.json`/, researchPage, "must load docs from research assets");
expectPattern(research, /fetchJson\(`\$\{DATA_ROOT\}\/facts\.json`/, researchPage, "must load facts from research assets");
expectPattern(research, /id="facts-table-body"/, researchPage, "must render fact database table body");
expectPattern(research, /friendlyError\(/, researchPage, "must include friendly empty/error fallback helper");
expectPattern(research, /card\.id = entryAnchor;/, researchPage, "must add research entry anchors for deep links");
rejectPattern(research, /fetch\('\.\/assets\/research\//, researchPage, "must not use relative ./assets/research paths");
rejectPattern(research, /fetch\("\.\/assets\/research\//, researchPage, "must not use relative ./assets/research paths");

const proof = readPage(proofPage);
expectPattern(proof, /const DATA_ROOT = '\/CartGuard\/assets\/research';/, proofPage, "must use absolute research asset root");
expectPattern(proof, /fetchJson\(`\$\{DATA_ROOT\}\/facts\.json`/, proofPage, "must load stage-safe signals from facts.json");
expectPattern(proof, /fetchJson\(`\$\{DATA_ROOT\}\/pilots\.json`/, proofPage, "must load pilot outcomes from pilots.json");
expectPattern(proof, /id="signals-table-body"/, proofPage, "must render stage-safe signals table body");
expectPattern(proof, /id="pilots-table-body"/, proofPage, "must render pilot outcomes table body");
expectPattern(proof, /\/CartGuard\/ops\/research\.html#entry-\$\{fact\.research_entry_id\}/, proofPage, "must link stage-safe rows to research entry anchors");
expectPattern(proof, /\/CartGuard\/ops\/research\.html#entry-\$\{pilot\.research_entry_id\}/, proofPage, "must link pilot rows to research entry anchors");

const careers = readPage(careersPage);
expectPattern(careers, /const ROLES_PATH = '\/CartGuard\/assets\/careers\/roles\.json';/, careersPage, "must load roles from careers data source");
expectPattern(careers, /id="roles-updated"/, careersPage, "must include dynamic roles status element");
expectPattern(careers, /id="roles-list"/, careersPage, "must include dynamic role list container");
expectPattern(careers, /fetch\(ROLES_PATH, \{ cache: 'no-store' \}\)/, careersPage, "must fetch roles with no-store cache policy");
expectPattern(careers, /button\.addEventListener\('click', \(\) => renderRole\(role\)\);/, careersPage, "must wire role selection interactions");
expectPattern(careers, /renderRole\(roles\[0\]\);/, careersPage, "must render first role by default");

if (violations.length > 0) {
  console.error("Page data wiring guard failed:");
  for (const violation of violations) {
    console.error(` - ${violation}`);
  }
  process.exit(1);
}

console.log("OK: research/proof/careers data wiring checks passed.");
