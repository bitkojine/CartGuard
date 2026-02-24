import test from "node:test";
import assert from "node:assert";
import { slugify } from "../../src/pure";

void test("utils - slugify: converts to lowercase and replaces non-alphanumeric with dash", () => {
    assert.strictEqual(slugify("Hello World!"), "hello-world");
    assert.strictEqual(slugify("Demo & Evaluation 123"), "demo-evaluation-123");
});

void test("utils - slugify: removes leading and trailing dashes", () => {
    assert.strictEqual(slugify("!Hello World!"), "hello-world");
});

void test("utils - slugify: truncates to 48 characters", () => {
    const longString = "This is a very long string that should be truncated to exactly forty eight characters";
    assert.strictEqual(slugify(longString).length, 48);
    assert.strictEqual(slugify(longString), "this-is-a-very-long-string-that-should-be-trunca");
});
