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

const removeWithRetries = async (path: string): Promise<void> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await rm(path, { recursive: true, force: true });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));
    }
  }
  if (lastError) {
    const message =
      lastError instanceof Error
        ? lastError.message
        : typeof lastError === "string"
          ? lastError
          : "unknown error";
    throw new Error(`Failed to remove test temp directory ${path}: ${message}`);
  }
};

const main = async (): Promise<void> => {
  const tempRoot = mkdtempSync(resolve(tmpdir(), "cartguard-vscode-test-"));
  const userDataDir = resolve(tempRoot, "user-data");
  const extensionsDir = resolve(tempRoot, "extensions");
  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      extensionTestsEnv: {
        ...process.env,
        CARTGUARD_DEMO_CLOSE_WINDOW: process.env.CARTGUARD_DEMO_CLOSE_WINDOW ?? "0",
        ELECTRON_DISABLE_GPU: process.env.ELECTRON_DISABLE_GPU ?? "1",
        LIBGL_ALWAYS_SOFTWARE: process.env.LIBGL_ALWAYS_SOFTWARE ?? "1"
      },
      launchArgs: [
        demoWorkspacePath,
        "--disable-gpu",
        "--disable-dev-shm-usage",
        `--user-data-dir=${userDataDir}`,
        `--extensions-dir=${extensionsDir}`
      ]
    });
  } finally {
    await cleanupShowcaseArtifacts();
    await removeWithRetries(tempRoot);
  }
};

void main();
