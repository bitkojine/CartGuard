import { escapeHtml, statusClass, evidenceTypeClass } from "./webview-utils";
import type { DemoSlide, DecisionGate, Product, Scenario, EvaluationResultRow, RoleOutput, DemoMode, EvaluationSummary } from "../types";

export const renderStyles = (): string => `
  :root {
    color-scheme: light dark;
    --bg: var(--vscode-editor-background);
    --fg: var(--vscode-editor-foreground);
    --muted: var(--vscode-descriptionForeground);
    --card-bg: color-mix(in oklab, var(--bg) 94%, var(--fg) 6%);
    --border: color-mix(in oklab, var(--fg) 22%, transparent);
    --button-bg: color-mix(in oklab, var(--bg) 84%, var(--fg) 16%);
    --button-hover: color-mix(in oklab, var(--bg) 72%, var(--fg) 28%);
    --exec-accent: #005cc5;
    --champion-accent: #0e7c3a;
    --ok: #1f8f4e;
    --bad: #b42318;
    --na: #667085;
    --unknown: #b26b00;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
    margin: 0;
    padding: 16px;
    background: var(--bg);
    color: var(--fg);
  }
  h1, h2, h3 { margin: 0 0 12px 0; }
  .card { border: 1px solid var(--border); background: var(--card-bg); border-radius: 12px; padding: 12px; margin-bottom: 12px; }
  .mode-banner { border-left: 4px solid var(--na); }
  .mode-banner.exec { border-left-color: var(--exec-accent); }
  .mode-banner.champion { border-left-color: var(--champion-accent); }
  .label { font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
  .value { margin-top: 6px; line-height: 1.4; }
  .path { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; margin: 4px 0; word-break: break-all; }
  .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
  .pill { display: inline-block; border-radius: 999px; padding: 2px 8px; font-size: 12px; font-weight: 600; border: 1px solid currentColor; }
  .ok { color: var(--ok); }
  .bad { color: var(--bad); }
  .na { color: var(--na); }
  .unknown { color: var(--unknown); }
  .controls { display: flex; gap: 8px; align-items: center; }
  button { border-radius: 10px; padding: 8px 12px; border: 1px solid var(--border); background: var(--button-bg); color: var(--fg); font-weight: 600; cursor: pointer; }
  button:hover:enabled { background: var(--button-hover); }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; padding: 8px 6px; font-size: 12px; }
`;

export const renderModeBanner = (demoMode: DemoMode): string => {
    const isExec = demoMode === "exec";
    const isChampion = demoMode === "champion";
    return `
    <div class="card mode-banner ${escapeHtml(demoMode)}">
      <h3>Mode: ${isExec ? "Executive Briefing" : isChampion ? "Champion Workflow" : "Default Walkthrough"}</h3>
      <div class="value">${isExec ? "Outcome-first flow: blocker -> decision -> pilot close." : isChampion ? "Operational deep dive: triage -> gates -> handoff." : "Full storyline walkthrough."}</div>
    </div>
  `;
};

export const renderSlideHeader = (slide: DemoSlide, scenario?: Scenario, isExec?: boolean): string => `
  <div class="card">
    <h2>${escapeHtml(slide.title)}</h2>
    <div class="label">Symptom</div>
    <div class="value">${escapeHtml(scenario?.symptom ?? slide.whatUserSees)}</div>
    <div class="label" style="margin-top:10px;">What we are doing now</div>
    <div class="value">${escapeHtml(slide.now)}</div>
    <div class="label" style="margin-top:10px;">How this helps customers</div>
    <div class="value">${escapeHtml(slide.customerImpact)}</div>
    ${isExec ? "" : `
    <div class="label" style="margin-top:10px;">What we do next</div>
    <div class="value">${escapeHtml(slide.next)}</div>
    <div class="label" style="margin-top:10px;">What user sees</div>
    <div class="value">${escapeHtml(slide.whatUserSees)}</div>
    <div class="label" style="margin-top:10px;">What user clicks</div>
    <div class="value">${escapeHtml(slide.whatUserClicks)}</div>
    <div class="label" style="margin-top:10px;">CartGuard check</div>
    <div class="value">${escapeHtml(slide.cartGuardChecks)}</div>
    <div class="label" style="margin-top:10px;">Legal</div>
    <div class="value">${escapeHtml(slide.legalBasis)}</div>
    <div class="label" style="margin-top:10px;">Marketplace</div>
    <div class="value">${escapeHtml(slide.marketplacePolicy)}</div>
    `}
    <div class="label" style="margin-top:10px;">CartGuard recommendation</div>
    <div class="value">${escapeHtml(slide.cartguardRecommendation)}</div>
    <div class="label" style="margin-top:10px;">Fix now</div>
    <div class="value">${escapeHtml(slide.fixAction)}</div>
  </div>
`;

export const renderMetadataGrid = (slide: DemoSlide): string => `
  <div class="card">
    <h3>Step Metadata</h3>
    <div class="meta-grid">
      <div><strong>Role</strong><div>${escapeHtml(slide.ownerRole)}</div></div>
      <div><strong>Check ID</strong><div><code>${escapeHtml(slide.checkId)}</code></div></div>
      <div><strong>Evidence Type</strong><div><span class="pill ${evidenceTypeClass(slide.evidenceType)}">${escapeHtml(slide.evidenceType)}</span></div></div>
      <div><strong>Input Artifact</strong><div>${escapeHtml(slide.inputArtifact)}</div></div>
    </div>
    ${slide.evidenceType === "marketplace" ? `<div class="value" style="margin-top:10px;">Marketplace risk is CartGuard heuristic guidance, not an Amazon decision.</div>` : ""}
  </div>
`;

export const renderScenarioBreakdown = (scenario: Scenario): string => `
  <div class="card">
    <h3>Scenario Breakdown</h3>
    <div class="label">Root cause</div>
    <div class="value">${escapeHtml(scenario.rootCause)}</div>
    <div class="label" style="margin-top:10px;">Who sees it first</div>
    <div class="value">${escapeHtml(scenario.firstOwner)}</div>
    <div class="label" style="margin-top:10px;">Business impact</div>
    <div class="value">${escapeHtml(scenario.businessImpact)}</div>
    <div class="label" style="margin-top:10px;">Missing or mismatched evidence</div>
    <div class="value">${escapeHtml(scenario.missingEvidence.join(", "))}</div>
  </div>
`;

export const renderBatchProducts = (products: Product[]): string => {
    const productRows = products.map((product: Product) => `
    <tr>
      <td><code>${escapeHtml(product.id)}</code></td>
      <td>${escapeHtml(product.name)}</td>
      <td>${escapeHtml(product.archetype)}</td>
      <td><span class="pill ${product.status === "Ready" ? "ok" : product.status === "Blocked" ? "bad" : "unknown"}">${escapeHtml(product.status)}</span></td>
    </tr>
  `).join("");
    return `
    <div class="card">
      <h3>Batch Products</h3>
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Archetype</th><th>Status</th></tr></thead>
        <tbody>${productRows}</tbody>
      </table>
    </div>
  `;
};

export const renderRoleCards = (roleOutputs: RoleOutput[]): string => {
    const cards = roleOutputs.map((roleOutput: RoleOutput) => `
    <div class="card">
      <h3>${escapeHtml(roleOutput.role)} Output</h3>
      <div class="value">${escapeHtml(roleOutput.summary)}</div>
      <div class="label" style="margin-top:10px;">Fields</div>
      <div class="value">${escapeHtml(roleOutput.fields.join(", "))}</div>
      <div class="label" style="margin-top:10px;">Actions</div>
      <div class="value">${escapeHtml(roleOutput.actions.join(" | "))}</div>
    </div>
  `).join("");
    return `<div class="grid">${cards}</div>`;
};

export const renderDecisionGate = (gate: DecisionGate, currentDecision?: string, decisionRequired?: boolean): string => `
  <div class="card">
    <h3>Decision Gate: ${escapeHtml(gate.gateId)}</h3>
    <div class="label">Context</div>
    <div class="value">${escapeHtml(gate.context)}</div>
    <div class="label" style="margin-top:10px;">Business tradeoff</div>
    <div class="value">${escapeHtml(gate.businessTradeoff)}</div>
    <div class="label" style="margin-top:10px;">Recommended</div>
    <div class="value">${escapeHtml(gate.recommended)}</div>
    <div class="controls" style="margin-top:10px;">
      ${gate.options.map((option) => `<button class="decision" data-decision="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join("")}
      <span>Selected: ${escapeHtml(currentDecision ?? "none")}</span>
    </div>
    ${decisionRequired ? `<div class="value" style="margin-top:10px;">Select a decision before continuing.</div>` : ""}
  </div>
`;

export const renderMetricsSnapshot = (
    baselineMissingPct: number,
    currentMissingPct: number,
    readyProducts: number,
    atRiskProducts: number,
    blockedProducts: number,
    baselineReviewCycleDays?: number,
    currentReviewCycleDays?: number,
    baselineReworkLoopsPerListing?: number,
    currentReworkLoopsPerListing?: number
): string => `
  <div class="card">
    <h3>Pilot Metrics Snapshot</h3>
    <div class="grid">
      <div><strong>Missing-doc rate</strong><div>${baselineMissingPct}% -> ${currentMissingPct}%</div></div>
      <div><strong>Review cycle (days)</strong><div>${baselineReviewCycleDays !== undefined && currentReviewCycleDays !== undefined ? `${baselineReviewCycleDays} -> ${currentReviewCycleDays}` : "Track during pilot"}</div></div>
      <div><strong>Rework loops/listing</strong><div>${baselineReworkLoopsPerListing !== undefined && currentReworkLoopsPerListing !== undefined ? `${baselineReworkLoopsPerListing} -> ${currentReworkLoopsPerListing}` : "Track during pilot"}</div></div>
      <div><strong>Batch status mix</strong><div>Ready ${readyProducts} / At Risk ${atRiskProducts} / Blocked ${blockedProducts}</div></div>
    </div>
  </div>
`;

export const renderEvaluationSnapshot = (summary: EvaluationSummary, evaluations: EvaluationResultRow[]): string => {
    const rows = evaluations
        .slice(0, 10)
        .map((row: EvaluationResultRow) => `
      <tr>
        <td><code>${escapeHtml(row.rule_id)}</code></td>
        <td><span class="pill ${statusClass(row.status)}">${escapeHtml(row.status)}</span></td>
        <td>${row.blocking ? "Yes" : "No"}</td>
        <td>${escapeHtml(row.message)}</td>
      </tr>
    `).join("");
    return `
    <div class="card">
      <h3>Current Evaluation Snapshot</h3>
      <div class="grid">
        <div><strong>Total</strong><div>${summary.total_rules}</div></div>
        <div><strong>Blocking</strong><div>${summary.blocking_issues}</div></div>
        <div><strong>Missing</strong><div>${summary.missing}</div></div>
        <div><strong>Warnings</strong><div>${summary.warnings}</div></div>
        <div><strong>Unknown</strong><div>${summary.unknown}</div></div>
        <div><strong>Present</strong><div>${summary.present}</div></div>
      </div>
      <table>
        <thead><tr><th>Rule</th><th>Status</th><th>Blocking</th><th>Message</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
};
