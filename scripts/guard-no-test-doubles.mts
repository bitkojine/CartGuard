import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, normalize } from "node:path";

interface BlockConfig {
  ignore?: string[];
  allow_files?: string[];
  patterns?: string[];
  disabled_patterns?: string[];
}

interface PatternRule {
  id: string;
  pattern: RegExp;
}

const CONFIG_PATH = ".testdouble-block.json";
const mode = process.argv.includes("--staged") ? "staged" : "all";

const defaultIgnore = ["node_modules/", "dist/", "build/", "coverage/"];
const targetExt = [".ts", ".tsx"];

const defaultRules: PatternRule[] = [
  { id: "jest.mock", pattern: /\bjest\.mock\s*\(/i },
  { id: "jest.fn", pattern: /\bjest\.fn\s*\(/i },
  { id: "jest.spyOn", pattern: /\bjest\.spyOn\s*\(/i },
  { id: "vi.mock", pattern: /\bvi\.mock\s*\(/i },
  { id: "vi.fn", pattern: /\bvi\.fn\s*\(/i },
  { id: "vi.spyOn", pattern: /\bvi\.spyOn\s*\(/i },
  { id: "sinon.member", pattern: /\bsinon\s*\.[A-Za-z_$][A-Za-z0-9_$]*/i },
  { id: "sinon.create", pattern: /\bsinon\.create\s*\(/i },
  { id: "sinon.stub", pattern: /\bsinon\.stub\s*\(/i },
  { id: "mockImplementation", pattern: /\bmockImplementation\s*\(/i },
  { id: "mockReturnValue", pattern: /\bmockReturnValue\s*\(/i },
  { id: "mockResolvedValue", pattern: /\bmockResolvedValue\s*\(/i },
  { id: "import @mock*", pattern: /\bimport\s+[^;]*@mock[\w/-]*/i },
  { id: "require @mock*", pattern: /\brequire\s*\(\s*['"]@mock[\w/-]*['"]\s*\)/i },
  { id: "import mock*", pattern: /\bimport\s+[^;]*['"][^'"]*mock[^'"]*['"]/i },
  { id: "require mock*", pattern: /\brequire\s*\(\s*['"][^'"]*mock[^'"]*['"]\s*\)/i },
  { id: "keyword mock", pattern: /\bmock\b/i },
  { id: "keyword stub", pattern: /\bstub\b/i },
  { id: "keyword fake", pattern: /\bfake\b/i },
  { id: "keyword spy", pattern: /\bspy\b/i }
];

const loadConfig = (): BlockConfig => {
  if (!existsSync(CONFIG_PATH)) {
    return {};
  }
  try {
    const parsed = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("config must be a JSON object");
    }
    return parsed as BlockConfig;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid JSON";
    console.error(`Failed to parse ${CONFIG_PATH}: ${detail}`);
    process.exit(1);
  }
};

const config = loadConfig();
const ignorePrefixes = [...defaultIgnore, ...(config.ignore || [])].map((p) => normalize(String(p)).replace(/\\/g, "/"));
const allowFiles = new Set((config.allow_files || []).map((p) => normalize(String(p)).replace(/\\/g, "/")));
const disabled = new Set((config.disabled_patterns || []).map((p) => String(p)));
const customRules = (config.patterns || []).map((source, i) => ({ id: `custom-${i + 1}`, pattern: new RegExp(source, "i") }));
const activeRules = [...defaultRules.filter((r) => !disabled.has(r.id)), ...customRules];

const listFiles = (staged: boolean): string[] => {
  const args = staged ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"] : ["ls-files", "-z"];
  const output = execFileSync("git", args, { encoding: "utf8" });
  return output.split("\0").filter(Boolean);
};

const isIgnored = (path: string): boolean => {
  const normalized = normalize(path).replace(/\\/g, "/");
  return ignorePrefixes.some((prefix) => normalized.startsWith(prefix));
};

const isTarget = (path: string): boolean => {
  const normalized = normalize(path).replace(/\\/g, "/");
  if (allowFiles.has(normalized)) {
    return false;
  }
  if (isIgnored(normalized)) {
    return false;
  }
  return targetExt.some((ext) => normalized.endsWith(ext));
};

const files = listFiles(mode === "staged").filter((file) => existsSync(file) && isTarget(file));

const findings: string[] = [];

for (const file of files) {
  const content = readFileSync(join(process.cwd(), file), "utf8");
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] || "";
    for (const rule of activeRules) {
      if (rule.pattern.test(line)) {
        findings.push(`${file}:${i + 1} (${rule.id}) ${line.trim()}`);
      }
    }
  }
}

if (findings.length > 0) {
  console.error("🚫 TEST DOUBLES DETECTED - COMMIT BLOCKED 🚫");
  console.error("");
  console.error("We do NOT use mocks, stubs, fakes, spies, or any test doubles.");
  console.error("");
  console.error("❓ ASK YOURSELF:");
  console.error("");
  console.error("Do I really need this test double?");
  console.error("");
  console.error("Am I being lazy instead of testing our REAL system?");
  console.error("");
  console.error("Can I test the actual code with real dependencies?");
  console.error("");
  console.error("✅ INSTEAD: Document in docs/why-i-wanted-test-doubles.md");
  console.error("Format:");
  console.error("");
  console.error("## [Date] Wanted to mock [X]");
  console.error("");
  console.error("### What I wanted to mock:");
  console.error("[Describe]");
  console.error("");
  console.error("### Why I thought I needed it:");
  console.error("[Explain]");
  console.error("");
  console.error("### Real solution implemented:");
  console.error("[What you actually did]");
  console.error("");
  console.error("Fix your tests to use REAL code, then retry commit.");
  console.error("");
  console.error("Detected matches:");
  for (const finding of findings) {
    console.error(` - ${finding}`);
  }
  process.exit(1);
}

const scopeLabel = mode === "staged" ? "staged files" : "tracked files";
console.log(`OK: no blocked test-double patterns found in ${scopeLabel}.`);
