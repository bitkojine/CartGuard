import test from "node:test";
import assert from "node:assert";
import { escapeHtml, statusClass, evidenceTypeClass } from "../../src/renderers/webview-utils";

void test("webview-utils - escapeHtml: escapes special characters", () => {
    assert.strictEqual(escapeHtml("<script>alert('xss')</script>"), "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;");
    assert.strictEqual(escapeHtml("A & B"), "A &amp; B");
    assert.strictEqual(escapeHtml('"quoted"'), "&quot;quoted&quot;");
});

void test("webview-utils - escapeHtml: handles null and undefined", () => {
    assert.strictEqual(escapeHtml(null), "");
    assert.strictEqual(escapeHtml(undefined), "");
});

void test("webview-utils - escapeHtml: handles numbers and booleans", () => {
    assert.strictEqual(escapeHtml(123), "123");
    assert.strictEqual(escapeHtml(true), "true");
});

void test("webview-utils - statusClass: returns ok for positive statuses", () => {
    assert.strictEqual(statusClass("present"), "ok");
    assert.strictEqual(statusClass("ready"), "ok");
    assert.strictEqual(statusClass("pass"), "ok");
});

void test("webview-utils - statusClass: returns bad for negative statuses", () => {
    assert.strictEqual(statusClass("missing"), "bad");
    assert.strictEqual(statusClass("blocked"), "bad");
    assert.strictEqual(statusClass("fail"), "bad");
});

void test("webview-utils - statusClass: returns na for not applicable", () => {
    assert.strictEqual(statusClass("not_applicable"), "na");
});

void test("webview-utils - statusClass: returns unknown for others", () => {
    assert.strictEqual(statusClass("something_else"), "unknown");
});

void test("webview-utils - evidenceTypeClass: returns correct classes", () => {
    assert.strictEqual(evidenceTypeClass("legal"), "evidence-legal");
    assert.strictEqual(evidenceTypeClass("marketplace"), "evidence-marketplace");
    assert.strictEqual(evidenceTypeClass("unknown"), "evidence-best-practice");
});

