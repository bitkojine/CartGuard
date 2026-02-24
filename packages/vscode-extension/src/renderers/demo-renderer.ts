import type { DemoControlState, DemoSlide, DecisionGate, EvaluationBundle, WorkflowData, DemoMode, Product, Scenario, EvaluationSummary } from "../types";
import { fallbackSlideshowData } from "../types";
import { escapeHtml } from "./webview-utils";
import * as components from "./demo-renderer-components";

export const renderDemoHtml = (
  state: DemoControlState,
  slides: DemoSlide[],
  decisionGatesByCheckId: Map<string, DecisionGate>,
  listingPath: string,
  rulesPath: string,
  applicabilityPath: string,
  run: EvaluationBundle | undefined,
  workflowData: WorkflowData | undefined,
  demoMode: DemoMode,
  autoplayEnabled: boolean,
  autoplayStepMs: number
): string => {
  const activeSlides = slides.length > 0 ? slides : fallbackSlideshowData.slides;
  const slide = activeSlides[state.stepIndex] ?? activeSlides[0];

  if (!slide) return "<html><body>Critical Error: No Slides Found</body></html>";

  const isExecMode = demoMode === "exec";
  const gate = decisionGatesByCheckId.get(slide.checkId);
  const currentDecision = gate ? state.decisions[gate.gateId] : undefined;
  const decisionRequired = Boolean(gate && !currentDecision && !state.done);
  const nextSlide = state.stepIndex < activeSlides.length - 1 ? activeSlides[state.stepIndex + 1] : undefined;
  const scenario = slide.scenarioId ? workflowData?.scenarios.find((entry: Scenario) => entry.id === slide.scenarioId) : undefined;

  const {
    baselineMissingPct, currentMissingPct,
    readyProducts, atRiskProducts, blockedProducts
  } = calculateMetrics(run, workflowData);

  const decisionRows = Object.entries(state.decisions)
    .map(([gateId, decision]) => `<tr><td><code>${escapeHtml(gateId)}</code></td><td>${escapeHtml(decision)}</td></tr>`)
    .join("");

  const nextText = nextSlide ? nextSlide.title : "Demo completed.";
  const isFinalClick = !state.done && state.stepIndex === activeSlides.length - 2;
  const buttonLabel = state.done ? "Done" : isFinalClick ? "Continue (closes VSCode)" : "Continue";
  const buttonDisabled = state.done || decisionRequired ? "disabled" : "";

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>${components.renderStyles()}</style>
    </head>
    <body>
      <h1>CartGuard Demo Slideshow</h1>
      ${components.renderModeBanner(demoMode)}
      ${components.renderSlideHeader(slide, scenario, isExecMode)}
      ${components.renderMetadataGrid(slide)}
      ${scenario && !isExecMode ? components.renderScenarioBreakdown(scenario) : ""}
      ${workflowData?.products && !isExecMode ? components.renderBatchProducts(workflowData.products) : ""}
      ${workflowData?.roleOutputs && !isExecMode ? components.renderRoleCards(workflowData.roleOutputs) : ""}
      ${gate ? components.renderDecisionGate(gate, currentDecision, decisionRequired) : ""}
      ${decisionRows && !isExecMode ? `
      <div class="card">
        <h3>Gate Decisions</h3>
        <table>
          <thead><tr><th>Gate</th><th>Decision</th></tr></thead>
          <tbody>${decisionRows}</tbody>
        </table>
      </div>
      ` : ""}
      <div class="card">
        <h3>Inputs in this demo</h3>
        <div class="path">Listing: ${escapeHtml(listingPath)}</div>
        <div class="path">Rules: ${escapeHtml(rulesPath)}</div>
        <div class="path">Applicability: ${escapeHtml(applicabilityPath)}</div>
      </div>
      <div class="card controls">
        <button id="continue" ${buttonDisabled}>${escapeHtml(buttonLabel)}</button>
        <span>Next: ${escapeHtml(nextText)}</span>
      </div>
      ${workflowData ? components.renderMetricsSnapshot(
    baselineMissingPct, currentMissingPct,
    readyProducts, atRiskProducts, blockedProducts,
    workflowData.pilotMetrics?.baselineReviewCycleDays,
    workflowData.pilotMetrics?.currentReviewCycleDays,
    workflowData.pilotMetrics?.baselineReworkLoopsPerListing,
    workflowData.pilotMetrics?.currentReworkLoopsPerListing
  ) : ""}
      ${run?.evaluation.result?.summary ? components.renderEvaluationSnapshot(run.evaluation.result.summary, run.evaluation.result.evaluations) : ""}
      <script>
        const vscode = acquireVsCodeApi();
        const button = document.getElementById("continue");
        const autoplayEnabled = ${autoplayEnabled};
        const autoplayStepMs = ${autoplayStepMs};
        const autoplayRecommendedDecision = ${JSON.stringify(gate?.recommended ?? "")};
        if (button) {
          button.addEventListener("click", () => {
            vscode.postMessage({ type: "continue" });
          });
        }
        Array.from(document.querySelectorAll(".decision")).forEach((decisionButton) => {
          decisionButton.addEventListener("click", () => {
            const decision = decisionButton.getAttribute("data-decision");
            const gateId = ${JSON.stringify(gate?.gateId ?? "")};
            vscode.postMessage({ type: "gateDecision", decision, gateId });
          });
        });
        if (autoplayEnabled) {
          setTimeout(() => {
            const continueButton = document.getElementById("continue");
            if (continueButton && !continueButton.disabled) {
              continueButton.click();
              return;
            }
            const decisionButtons = Array.from(document.querySelectorAll(".decision"));
            if (decisionButtons.length === 0) return;
            const recommendedButton = decisionButtons.find((btn) => btn.getAttribute("data-decision") === autoplayRecommendedDecision);
            const targetButton = recommendedButton ?? decisionButtons[0];
            targetButton.click();
          }, autoplayStepMs);
        }
      </script>
    </body>
  </html>
  `;
};

const calculateMetrics = (run: EvaluationBundle | undefined, workflowData: WorkflowData | undefined) => {
  const products = workflowData?.products ?? [];
  const totalProducts = products.length;
  const blockedProducts = products.filter((p: Product) => p.status === "Blocked").length;
  const atRiskProducts = products.filter((p: Product) => p.status === "At Risk").length;
  const readyProducts = products.filter((p: Product) => p.status === "Ready").length;

  const summary: EvaluationSummary | undefined = run?.evaluation.result?.summary;
  const inferredBaselineMissingPct = totalProducts > 0 ? Math.round(((blockedProducts + atRiskProducts) / totalProducts) * 100) : 0;
  const inferredCurrentMissingPct = summary && summary.total_rules > 0 ? Math.round((summary.missing / summary.total_rules) * 100) : undefined;

  const baselineMissingPct = workflowData?.pilotMetrics?.baselineMissingDocRatePct ?? inferredBaselineMissingPct;
  const currentMissingPct = workflowData?.pilotMetrics?.currentMissingDocRatePct ?? inferredCurrentMissingPct ?? Math.max(baselineMissingPct - 8, 0);

  return {
    baselineMissingPct,
    currentMissingPct,
    readyProducts,
    atRiskProducts,
    blockedProducts
  };
};
