import assert from "node:assert/strict";
import { resolve } from "node:path";

import * as vscode from "vscode";

const stepMs = Number(process.env.CARTGUARD_E2E_STEP_MS ?? "0");
const holdOpenMs = Number(process.env.CARTGUARD_E2E_HOLD_OPEN_MS ?? "0");
const manualContinue = process.env.CARTGUARD_E2E_MANUAL_CONTINUE === "1";
const holdChunkMs = 30000;

const pause = async (ms: number): Promise<void> => {
  if (ms <= 0) {
    return;
  }

  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
};

const waitForEditor = async (): Promise<vscode.TextEditor | undefined> => {
  for (let i = 0; i < 40; i += 1) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      return editor;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }

  return undefined;
};

suite("CartGuard Extension E2E", () => {
  setup(async () => {
    await pause(stepMs);
  });

  suiteTeardown(async () => {
    if (holdOpenMs > 0) {
      console.log(`[CartGuard E2E] Holding Extension Development Host open for ${holdOpenMs}ms.`);
      let remaining = holdOpenMs;
      while (remaining > 0) {
        const chunk = Math.min(holdChunkMs, remaining);
        await pause(chunk);
        remaining -= chunk;
      }
    }
  });

  test("run demo command renders JSON result document", async () => {
    console.log("[CartGuard E2E] Step 1: Run demo command.");
    const valid = await vscode.commands.executeCommand("cartguard.runDemo");
    assert.equal(typeof valid, "boolean");
    await pause(stepMs);

    const editor = await waitForEditor();
    assert.ok(editor);
    assert.equal(editor.document.languageId, "json");
    assert.match(editor.document.getText(), /"listing_id":\s*"demo-amz-de-001"/);
  });

  test("validate command can run non-interactively with file args", async () => {
    const extension = vscode.extensions.getExtension("cartguard.cartguard-vscode-extension");
    assert.ok(extension);
    const root = extension.extensionPath;

    const listingPath = resolve(root, "demo", "sample-listing.json");
    const rulesPath = resolve(root, "demo", "rules.json");
    const applicabilityPath = resolve(root, "demo", "applicability.json");

    console.log("[CartGuard E2E] Step 2: Validate JSON files via command arguments.");
    const valid = await vscode.commands.executeCommand("cartguard.validateJsonFiles", {
      listingPath,
      rulesPath,
      applicabilityPath
    });
    assert.equal(typeof valid, "boolean");
    await pause(stepMs);

    const editor = await waitForEditor();
    assert.ok(editor);
    assert.equal(editor.document.languageId, "json");
    assert.match(editor.document.getText(), /"summary"\s*:/);
  });

  test("process view command opens a visualization panel", async () => {
    console.log("[CartGuard E2E] Step 3: Open process visualization webview.");
    const valid = await vscode.commands.executeCommand("cartguard.openProcessView");
    assert.equal(typeof valid, "boolean");
    await pause(stepMs);
  });

  test("slideshow demo advances step-by-step", async () => {
    console.log("[CartGuard E2E] Step 4: Open slideshow demo.");
    const opened = await vscode.commands.executeCommand("cartguard.openDemoSlideshow");
    assert.equal(typeof opened, "object");
    await pause(stepMs);

    if (manualContinue) {
      console.log("[CartGuard E2E] Manual continue mode enabled. Waiting for user clicks in slideshow.");
      return;
    }

    let state = { stepIndex: 0, done: false };
    for (let i = 1; i <= 10; i += 1) {
      console.log(`[CartGuard E2E] Slide advance: ${i - 1} -> ${i}.`);
      const next = await vscode.commands.executeCommand("cartguard.demoNextStep");
      state = next as { stepIndex: number; done: boolean };
      assert.equal(state.stepIndex, i);
      await pause(stepMs);
    }

    assert.equal(state.done, true);
  });
});
