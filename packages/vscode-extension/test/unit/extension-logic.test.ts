import test from "node:test";
import assert from "node:assert";
import { resolveDemoPaths, resolveWorkflowPath, resolveSlideshowPath, toPositiveInt } from "../../src/extension-logic";

void test("extension-logic - resolveDemoPaths: returns args if fully provided", () => {
    const args = {
        listingPath: "/a/listing.json",
        rulesPath: "/a/rules.json",
        applicabilityPath: "/a/app.json"
    };
    const result = resolveDemoPaths("/ext", args);
    assert.deepStrictEqual(result, args);
});

void test("extension-logic - resolveDemoPaths: falls back to extension path demo folder if args missing", () => {
    const result = resolveDemoPaths("/ext");
    assert.strictEqual(result.listingPath.replace(/\\/g, "/"), "/ext/demo/sample-listing.json");
    assert.strictEqual(result.rulesPath.replace(/\\/g, "/"), "/ext/demo/rules.json");
    assert.strictEqual(result.applicabilityPath.replace(/\\/g, "/"), "/ext/demo/applicability.json");
});

void test("extension-logic - resolveWorkflowPath: prefers args path", () => {
    const result = resolveWorkflowPath("/ext", "/ws", { workflowPath: "/arg/wf.json" });
    assert.strictEqual(result, "/arg/wf.json");
});

void test("extension-logic - resolveWorkflowPath: prefers workspace root over extension path", () => {
    const result = resolveWorkflowPath("/ext", "/ws");
    assert.strictEqual(result.replace(/\\/g, "/"), "/ws/workflow-batch.json");
});

void test("extension-logic - resolveWorkflowPath: falls back to extension path if no workspace", () => {
    const result = resolveWorkflowPath("/ext", undefined);
    assert.strictEqual(result.replace(/\\/g, "/"), "/ext/demo/workflow-batch.json");
});

void test("extension-logic - resolveSlideshowPath: prefers args path", () => {
    const result = resolveSlideshowPath("/ext", "/ws", { slideshowPath: "/arg/ss.json" });
    assert.strictEqual(result, "/arg/ss.json");
});

void test("extension-logic - resolveSlideshowPath: picks filename based on demoMode", () => {
    const resultExec = resolveSlideshowPath("/ext", "/ws", { demoMode: "exec" });
    assert.strictEqual(resultExec.replace(/\\/g, "/"), "/ws/exec-slideshow.json");

    const resultChampion = resolveSlideshowPath("/ext", "/ws", { demoMode: "champion" });
    assert.strictEqual(resultChampion.replace(/\\/g, "/"), "/ws/champion-slideshow.json");

    const resultDefault = resolveSlideshowPath("/ext", "/ws");
    assert.strictEqual(resultDefault.replace(/\\/g, "/"), "/ws/slideshow.json");
});

void test("extension-logic - toPositiveInt: parses valid ints", () => {
    assert.strictEqual(toPositiveInt("100", 10), 100);
    assert.strictEqual(toPositiveInt("0", 10), 0);
});

void test("extension-logic - toPositiveInt: falls back for invalid or negative ints", () => {
    assert.strictEqual(toPositiveInt("-5", 10), 10);
    assert.strictEqual(toPositiveInt("avc", 10), 10);
    assert.strictEqual(toPositiveInt(undefined, 10), 10);
});
