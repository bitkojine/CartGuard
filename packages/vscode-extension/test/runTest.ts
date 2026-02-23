import { resolve } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

import { runTests } from "@vscode/test-electron";

const extensionDevelopmentPath = resolve(__dirname, "../..");
const extensionTestsPath = resolve(__dirname, "./suite/index.js");

const main = async (): Promise<void> => {
  const tempRoot = mkdtempSync(resolve(tmpdir(), "cartguard-vscode-test-"));
  const userDataDir = resolve(tempRoot, "user-data");
  const extensionsDir = resolve(tempRoot, "extensions");
  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [
      "--disable-extensions",
      `--user-data-dir=${userDataDir}`,
      `--extensions-dir=${extensionsDir}`
    ]
  });
};

void main();
