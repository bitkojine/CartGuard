import { readFile, writeFile } from "node:fs/promises";

import { MockContentGenerator } from "@cartguard/ai";
import { validateProductContent, type ValidationResult } from "@cartguard/engine";

interface ValidateOptions {
  productPath: string;
  policyPath: string;
  json: boolean;
}

interface GenerateOptions {
  inputPath: string;
  outputPath: string;
}

const usage = `CartGuard CLI

Usage:
  cartguard validate <product.json> --policy <policy.json> [--json]
  cartguard generate <input.json> --out <output.json>
`;

const readJson = async (filePath: string): Promise<unknown> => {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as unknown;
};

const renderValidation = (result: ValidationResult, asJson: boolean): string => {
  if (asJson) {
    return JSON.stringify(result, null, 2);
  }

  const lines: string[] = [
    `valid: ${result.valid}`,
    `errors: ${result.errors.length}`,
    `warnings: ${result.warnings.length}`
  ];

  for (const error of result.errors) {
    lines.push(`ERROR ${error.code}${error.path ? ` (${error.path})` : ""}: ${error.message}`);
  }

  for (const warning of result.warnings) {
    lines.push(
      `WARN ${warning.code}${warning.path ? ` (${warning.path})` : ""}: ${warning.message}`
    );
  }

  return lines.join("\n");
};

const parseValidateArgs = (args: string[]): ValidateOptions => {
  const json = args.includes("--json");
  const filtered = args.filter((arg) => arg !== "--json");

  const productPath = filtered[0];
  const policyFlagIndex = filtered.indexOf("--policy");
  const policyPath = policyFlagIndex >= 0 ? filtered[policyFlagIndex + 1] : undefined;

  if (!productPath || !policyPath) {
    throw new Error("validate requires <product.json> and --policy <policy.json>");
  }

  return { productPath, policyPath, json };
};

const parseGenerateArgs = (args: string[]): GenerateOptions => {
  const inputPath = args[0];
  const outFlagIndex = args.indexOf("--out");
  const outputPath = outFlagIndex >= 0 ? args[outFlagIndex + 1] : undefined;

  if (!inputPath || !outputPath) {
    throw new Error("generate requires <input.json> and --out <output.json>");
  }

  return { inputPath, outputPath };
};

const runValidate = async (args: string[]): Promise<number> => {
  const options = parseValidateArgs(args);

  const [product, policy] = await Promise.all([
    readJson(options.productPath),
    readJson(options.policyPath)
  ]);

  const result = validateProductContent(product, policy);
  console.log(renderValidation(result, options.json));

  return result.valid ? 0 : 1;
};

const runGenerate = async (args: string[]): Promise<number> => {
  const options = parseGenerateArgs(args);

  const input = await readJson(options.inputPath);
  const generator = new MockContentGenerator();
  const generated = await generator.generate(input);

  await writeFile(options.outputPath, `${JSON.stringify(generated, null, 2)}\n`, "utf8");
  console.log(`Generated content written to ${options.outputPath}`);

  return 0;
};

export const runCli = async (argv: string[]): Promise<number> => {
  const [command, ...args] = argv;

  if (!command || command === "--help" || command === "-h") {
    console.log(usage);
    return 0;
  }

  if (command === "validate") {
    return runValidate(args);
  }

  if (command === "generate") {
    return runGenerate(args);
  }

  console.error(`Unknown command '${command}'.\n\n${usage}`);
  return 1;
};
