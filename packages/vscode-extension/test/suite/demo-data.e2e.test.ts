import assert from "node:assert/strict";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";

import * as vscode from "vscode";

type EvidenceType = "legal" | "marketplace" | "best_practice" | "unknown";

interface DemoSlide {
  title: string;
  now: string;
  next: string;
  customerImpact: string;
  whatUserSees: string;
  whatUserClicks: string;
  cartGuardChecks: string;
  legalBasis: string;
  marketplacePolicy: string;
  cartguardRecommendation: string;
  ownerRole: string;
  fixAction: string;
  evidenceType: EvidenceType;
  checkId: string;
  inputArtifact: string;
  scenarioId?: string;
}

interface DecisionGate {
  gateId: string;
  checkId: string;
  context: string;
  businessTradeoff: string;
  options: string[];
  recommended: string;
}

interface WorkflowScenario {
  id: string;
  symptom: string;
  rootCause: string;
  firstOwner: string;
  businessImpact: string;
  missingEvidence: string[];
}

interface WorkflowData {
  products: Array<{ id: string; name: string; archetype: string; status: string }>;
  scenarios: WorkflowScenario[];
  roleOutputs?: Array<{
    role: string;
    summary: string;
    fields: string[];
    actions: string[];
  }>;
  pilotMetrics?: Record<string, number>;
}

const readJson = async (path: string): Promise<unknown> => {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as unknown;
};

const isString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

const validateSlides = (input: unknown): { slides: DemoSlide[]; gates: DecisionGate[] } => {
  assert.equal(typeof input, "object");
  assert.ok(input);
  const typed = input as { slides?: unknown; decisionGates?: unknown };
  assert.ok(Array.isArray(typed.slides), "slides must be an array");
  assert.ok(Array.isArray(typed.decisionGates), "decisionGates must be an array");

  const slides = typed.slides as unknown[];
  const gates = typed.decisionGates as unknown[];
  assert.ok(slides.length > 0, "slides must not be empty");

  const knownEvidenceTypes = new Set<EvidenceType>([
    "legal",
    "marketplace",
    "best_practice",
    "unknown"
  ]);
  for (const slide of slides) {
    assert.equal(typeof slide, "object");
    assert.ok(slide);
    const s = slide as Record<string, unknown>;
    assert.ok(isString(s.title));
    assert.ok(isString(s.now));
    assert.ok(isString(s.next));
    assert.ok(isString(s.customerImpact));
    assert.ok(isString(s.whatUserSees));
    assert.ok(isString(s.whatUserClicks));
    assert.ok(isString(s.cartGuardChecks));
    assert.ok(isString(s.legalBasis));
    assert.ok(isString(s.marketplacePolicy));
    assert.ok(isString(s.cartguardRecommendation));
    assert.ok(isString(s.ownerRole));
    assert.ok(isString(s.fixAction));
    assert.ok(isString(s.checkId));
    assert.ok(isString(s.inputArtifact));
    assert.ok(
      typeof s.evidenceType === "string" && knownEvidenceTypes.has(s.evidenceType as EvidenceType),
      "invalid evidenceType"
    );
    if ("scenarioId" in s) {
      assert.ok(typeof s.scenarioId === "string");
    }
  }

  for (const gate of gates) {
    assert.equal(typeof gate, "object");
    assert.ok(gate);
    const g = gate as Record<string, unknown>;
    assert.ok(isString(g.gateId));
    assert.ok(isString(g.checkId));
    assert.ok(isString(g.context));
    assert.ok(isString(g.businessTradeoff));
    assert.ok(Array.isArray(g.options), "gate options must be array");
    const options = g.options as unknown[];
    const optionStrings = options.filter((option): option is string => typeof option === "string");
    assert.equal(optionStrings.length, options.length, "all gate options must be strings");
    const recommended = g.recommended;
    assert.ok(isString(recommended));
    assert.ok(optionStrings.includes(recommended), "recommended must be in options");
  }

  return { slides: slides as DemoSlide[], gates: gates as DecisionGate[] };
};

const validateWorkflowData = (input: unknown): WorkflowData => {
  assert.equal(typeof input, "object");
  assert.ok(input);
  const typed = input as { products?: unknown; scenarios?: unknown };
  assert.ok(Array.isArray(typed.products), "products must be an array");
  assert.ok(Array.isArray(typed.scenarios), "scenarios must be an array");
  assert.ok((typed.products as unknown[]).length > 0, "products must not be empty");
  assert.ok((typed.scenarios as unknown[]).length > 0, "scenarios must not be empty");

  return input as WorkflowData;
};

suite("CartGuard Demo Data", () => {
  test("slideshow data files have valid structure", async () => {
    const extension = vscode.extensions.getExtension("cartguard.cartguard-vscode-extension");
    assert.ok(extension);
    const demoDir = resolve(extension.extensionPath, "demo");

    const [defaultData, execData, championData] = await Promise.all([
      readJson(resolve(demoDir, "slideshow.json")),
      readJson(resolve(demoDir, "exec-slideshow.json")),
      readJson(resolve(demoDir, "champion-slideshow.json"))
    ]);

    const defaultParsed = validateSlides(defaultData);
    const execParsed = validateSlides(execData);
    const championParsed = validateSlides(championData);

    assert.equal(defaultParsed.slides.length, 14);
    assert.equal(execParsed.slides.length, 5);
    assert.equal(championParsed.slides.length, 8);
  });

  test("workflow data has referenced scenarios and optional pilot metrics", async () => {
    const extension = vscode.extensions.getExtension("cartguard.cartguard-vscode-extension");
    assert.ok(extension);
    const workflowPath = resolve(extension.extensionPath, "demo", "workflow-batch.json");
    const workflow = validateWorkflowData(await readJson(workflowPath));

    const scenarioIds = new Set(workflow.scenarios.map((scenario) => scenario.id));
    const slides = validateSlides(await readJson(resolve(extension.extensionPath, "demo", "slideshow.json"))).slides;

    for (const slide of slides) {
      if (slide.scenarioId) {
        assert.ok(
          scenarioIds.has(slide.scenarioId),
          `slide scenarioId '${slide.scenarioId}' not found in workflow scenarios`
        );
      }
    }

    if (workflow.pilotMetrics) {
      const expectedKeys = [
        "baselineMissingDocRatePct",
        "currentMissingDocRatePct",
        "baselineReviewCycleDays",
        "currentReviewCycleDays",
        "baselineReworkLoopsPerListing",
        "currentReworkLoopsPerListing"
      ];
      for (const key of expectedKeys) {
        if (key in workflow.pilotMetrics) {
          assert.equal(typeof workflow.pilotMetrics[key], "number");
        }
      }
    }
  });
});
