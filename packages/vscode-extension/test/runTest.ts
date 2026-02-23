import { resolve } from "node:path";
import { mkdtempSync } from "node:fs";
import { readdir, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";

import { runTests } from "@vscode/test-electron";

const extensionDevelopmentPath = resolve(__dirname, "../..");
const extensionTestsPath = resolve(__dirname, "./suite/index.js");
const demoWorkspacePath = resolve(extensionDevelopmentPath, "demo");
const demoShowcaseDir = resolve(demoWorkspacePath, "_cartguard_in_memory_showcase");
const legacyShowcaseDir = resolve(demoWorkspacePath, "_cartguard_showcase_results");

const cleanupShowcaseArtifacts = async (): Promise<void> => {
  try {
    const entries = await readdir(demoShowcaseDir, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map((entry) => unlink(resolve(demoShowcaseDir, entry.name)))
    );
  } catch {
    return;
  }

  await rm(legacyShowcaseDir, { recursive: true, force: true });
};

const main = async (): Promise<void> => {
  const tempRoot = mkdtempSync(resolve(tmpdir(), "cartguard-vscode-test-"));
  const userDataDir = resolve(tempRoot, "user-data");
  const extensionsDir = resolve(tempRoot, "extensions");
  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        demoWorkspacePath,
        "--disable-extensions",
        `--user-data-dir=${userDataDir}`,
        `--extensions-dir=${extensionsDir}`
      ]
    });
  } finally {
    await cleanupShowcaseArtifacts();
    await rm(tempRoot, { recursive: true, force: true });
  }
};

void main();
