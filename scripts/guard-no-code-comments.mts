import { execSync } from "node:child_process";
import ts from "typescript";

type Violation = {
  file: string;
  line: number;
  column: number;
  kind: "single-line" | "multi-line";
};

const listTrackedTypeScriptFiles = (): string[] => {
  const output = execSync("git ls-files", { encoding: "utf8" }).trim();
  if (output.length === 0) return [];

  const files = output
    .split("\n")
    .map((file) => file.trim())
    .filter((file) => file.length > 0);

  return files.filter((file) => {
    if (!(file.endsWith(".ts") || file.endsWith(".mts"))) return false;
    if (file.startsWith("packages/")) return true;
    if (file.startsWith("scripts/")) return true;
    return false;
  });
};

const findCommentViolations = (file: string): Violation[] => {
  const sourceText = ts.sys.readFile(file, "utf8");
  if (!sourceText) return [];

  const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, sourceText);
  const violations: Violation[] = [];

  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      const position = scanner.getTokenPos();
      const tokenText = scanner.getTokenText();
      if (
        token === ts.SyntaxKind.SingleLineCommentTrivia &&
        tokenText.startsWith("//") &&
        position > 0 &&
        sourceText[position - 1] === ":"
      ) {
        token = scanner.scan();
        continue;
      }
      const location = sourceFile.getLineAndCharacterOfPosition(position);
      violations.push({
        file,
        line: location.line + 1,
        column: location.character + 1,
        kind: token === ts.SyntaxKind.SingleLineCommentTrivia ? "single-line" : "multi-line"
      });
    }
    token = scanner.scan();
  }

  return violations;
};

const files = listTrackedTypeScriptFiles();
const violations = files.flatMap((file) => findCommentViolations(file));

if (violations.length > 0) {
  console.error("Comment policy violation: comments are not allowed in code/test files.");
  console.error("Move rationale and implementation notes into docs/ instead.");
  console.error("Reference: docs/no-code-comments-policy.md");
  for (const violation of violations) {
    console.error(
      ` - ${violation.file}:${violation.line}:${violation.column} (${violation.kind})`
    );
  }
  process.exit(1);
}

console.log("OK: no comments found in tracked TypeScript code/test files.");
