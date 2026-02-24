import test from "node:test";
import assert from "node:assert";
import { DemoLogic } from "../../src/demo-logic";
import type { DemoSlide, DecisionGate, EvaluationBundle } from "../../src/types";

void test("DemoLogic - initialization: returns undefined state initially", () => {
    const logic = new DemoLogic([], new Map());
    assert.strictEqual(logic.getState(), undefined);
});

void test("DemoLogic - initialization: initializes state on first advance", async () => {
    const slides: DemoSlide[] = [{ title: "First Slide" } as DemoSlide];
    const logic = new DemoLogic(slides, new Map());

    const reqRun = () => Promise.resolve({} as unknown as EvaluationBundle);
    const state = await logic.advance(false, reqRun);

    assert.strictEqual(state.stepIndex, 0);
    assert.strictEqual(state.title, "First Slide");
    assert.strictEqual(state.done, false);
});

void test("DemoLogic - advancement: advances step by step", async () => {
    const slides: DemoSlide[] = [
        { title: "S1" } as DemoSlide,
        { title: "S2" } as DemoSlide,
        { title: "S3" } as DemoSlide
    ];
    const logic = new DemoLogic(slides, new Map());
    const reqRun = () => Promise.resolve({} as unknown as EvaluationBundle);

    await logic.advance(false, reqRun);
    assert.strictEqual(logic.getState()?.stepIndex, 0);

    await logic.advance(false, reqRun);
    assert.strictEqual(logic.getState()?.stepIndex, 1);

    await logic.advance(false, reqRun);
    assert.strictEqual(logic.getState()?.stepIndex, 2);
    assert.strictEqual(logic.getState()?.done, true);
});

void test("DemoLogic - advancement: handles autoDecision on gates", async () => {
    const slides: DemoSlide[] = [
        { title: "S1", checkId: "g1" } as DemoSlide,
        { title: "S2", checkId: "none" } as DemoSlide
    ];
    const gates = new Map<string, DecisionGate>();
    gates.set("g1", { gateId: "gate_1", recommended: "Accept" } as DecisionGate);

    const logic = new DemoLogic(slides, gates);
    const reqRun = () => Promise.resolve({} as unknown as EvaluationBundle);

    await logic.advance(false, reqRun);

    await logic.advance(true, reqRun);
    const state = logic.getState();
    assert.strictEqual(state?.decisions["gate_1"], "Accept");
});
