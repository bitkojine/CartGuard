import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as vscode from "vscode";

const readJsonFile = async (path: string): Promise<unknown> => {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as unknown;
};

const openResult = async (
  title: string,
  payload: unknown,
  output: vscode.OutputChannel
): Promise<void> => {
  const text = JSON.stringify(payload, null, 2);
  output.appendLine(`[CartGuard] ${title}`);
  output.appendLine(text);
  output.show(true);
  const doc = await vscode.workspace.openTextDocument({
    content: text,
    language: "json"
  });
  await vscode.window.showTextDocument(doc, { preview: false });
};

const pickJsonFile = async (
  title: string
): Promise<string | undefined> => {
  const selected = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: { JSON: ["json"] },
    openLabel: title
  });

  return selected?.[0]?.fsPath;
};

interface ValidationCommandArgs {
  listingPath?: string;
  rulesPath?: string;
  applicabilityPath?: string;
}

interface DemoControlState {
  stepIndex: number;
  done: boolean;
  title: string;
}

interface DemoSlide {
  title: string;
  now: string;
  next: string;
  customerImpact: string;
}

interface RuleEvaluationRow {
  rule_id: string;
  status: string;
  blocking: boolean;
  message: string;
  requirement_type: string;
  source_type: string;
  confidence: string;
}

interface EvaluationSummary {
  total_rules: number;
  blocking_issues: number;
  missing: number;
  stale: number;
  mismatched: number;
  warnings: number;
  unknown: number;
  not_applicable: number;
  present: number;
}

interface EvaluationPayload {
  valid: boolean;
  errors: Array<{ code: string; message: string; path?: string }>;
  warnings: Array<{ code: string; message: string; path?: string }>;
  result?: {
    listing_id: string;
    evaluations: RuleEvaluationRow[];
    summary: EvaluationSummary;
  };
}

interface EvaluationBundle {
  evaluation: EvaluationPayload;
  listing: unknown;
  rules: unknown;
  applicability: unknown;
}

interface EngineModule {
  evaluateListingAgainstRuleCatalog: (
    listingInput: unknown,
    ruleCatalogInput: unknown,
    applicabilityCatalogInput: unknown
  ) => EvaluationPayload;
}

const importEngine = async (): Promise<EngineModule> => {
  const dynamicImport = new Function(
    "specifier",
    "return import(specifier);"
  ) as (specifier: string) => Promise<EngineModule>;
  return dynamicImport("@cartguard/engine");
};

const runEvaluation = async (
  listingPath: string,
  rulesPath: string,
  applicabilityPath: string,
  output: vscode.OutputChannel
): Promise<EvaluationBundle> => {
  const { evaluateListingAgainstRuleCatalog } = await importEngine();
  const [listing, rules, applicability] = await Promise.all([
    readJsonFile(listingPath),
    readJsonFile(rulesPath),
    readJsonFile(applicabilityPath)
  ]);

  const evaluation = evaluateListingAgainstRuleCatalog(listing, rules, applicability);
  output.appendLine("[CartGuard] Evaluation executed.");
  return { evaluation, listing, rules, applicability };
};

const escapeHtml = (value: unknown): string =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const statusClass = (status: string): string => {
  if (status === "present") {
    return "ok";
  }
  if (status === "not_applicable") {
    return "na";
  }
  if (status === "unknown") {
    return "unknown";
  }
  return "bad";
};

const demoSlides: DemoSlide[] = [
  {
    title: "Step 1 of 4: Load Customer Compliance Context",
    now: "Load the listing, rule catalog, and applicability catalog that represent the customer's launch scenario.",
    next: "Map which legal and marketplace rules apply to this specific listing.",
    customerImpact: "Teams start from one shared input set, avoiding fragmented spreadsheets and guesswork."
  },
  {
    title: "Step 2 of 4: Resolve Applicable Rules",
    now: "Apply RED/LVD/EMC applicability logic so only relevant rules are evaluated.",
    next: "Run deterministic evidence checks against the applicable rules.",
    customerImpact: "Reduces false blockers by ignoring rules that do not apply to this product context."
  },
  {
    title: "Step 3 of 4: Evaluate Evidence",
    now: "Check required evidence keys and status fields to classify each rule outcome as present, missing, stale, mismatched, unknown, or not applicable.",
    next: "Summarize blockers and warnings into a clear action plan.",
    customerImpact: "Catches missing or stale documents before listing submission, which lowers delay risk."
  },
  {
    title: "Step 4 of 4: Deliver Action Plan",
    now: "Present blockers, warnings, and next actions in operator language for ops/compliance/developers.",
    next: "Rerun after document updates to prove readiness improvements.",
    customerImpact: "Shortens review loops and gives customer teams deterministic proof for launch decisions."
  }
];

const renderDemoHtml = (
  state: DemoControlState,
  listingPath: string,
  rulesPath: string,
  applicabilityPath: string,
  run: EvaluationBundle | undefined
): string => {
  const slide = demoSlides[state.stepIndex] ?? demoSlides[0] ?? {
    title: "Step",
    now: "",
    next: "",
    customerImpact: ""
  };
  const nextSlide =
    state.stepIndex < demoSlides.length - 1 ? demoSlides[state.stepIndex + 1] : undefined;
  const summary = run?.evaluation.result?.summary;
  const rows =
    run?.evaluation.result?.evaluations
      .slice(0, 10)
      .map(
        (row) => `
          <tr>
            <td><code>${escapeHtml(row.rule_id)}</code></td>
            <td><span class="pill ${statusClass(row.status)}">${escapeHtml(row.status)}</span></td>
            <td>${row.blocking ? "Yes" : "No"}</td>
            <td>${escapeHtml(row.message)}</td>
          </tr>
        `
      )
      .join("") ?? "";

  const nextText = nextSlide ? nextSlide.title : "Demo completed.";
  const buttonLabel = state.done ? "Done" : "Continue";
  const buttonDisabled = state.done ? "disabled" : "";

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        :root {
          color-scheme: light dark;
          --ok: #1f8f4e;
          --bad: #b42318;
          --na: #667085;
          --unknown: #b26b00;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
          margin: 0;
          padding: 16px;
        }
        h1, h2, h3 {
          margin: 0 0 12px 0;
        }
        .card {
          border: 1px solid color-mix(in oklab, currentColor 25%, transparent);
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 12px;
        }
        .label {
          font-size: 12px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          opacity: 0.8;
        }
        .value {
          margin-top: 6px;
          line-height: 1.4;
        }
        .path {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 11px;
          margin: 4px 0;
          word-break: break-all;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 10px;
        }
        .pill {
          display: inline-block;
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid currentColor;
        }
        .ok { color: var(--ok); }
        .bad { color: var(--bad); }
        .na { color: var(--na); }
        .unknown { color: var(--unknown); }
        .controls {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        button {
          border-radius: 10px;
          padding: 8px 12px;
          border: 1px solid color-mix(in oklab, currentColor 20%, transparent);
          font-weight: 600;
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        th, td {
          border-bottom: 1px solid color-mix(in oklab, currentColor 20%, transparent);
          text-align: left;
          vertical-align: top;
          padding: 8px 6px;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <h1>CartGuard Demo Slideshow</h1>
      <div class="card">
        <h2>${escapeHtml(slide.title)}</h2>
        <div class="label">What we are doing now</div>
        <div class="value">${escapeHtml(slide.now)}</div>
        <div class="label" style="margin-top:10px;">What we do next</div>
        <div class="value">${escapeHtml(slide.next)}</div>
        <div class="label" style="margin-top:10px;">How this helps customers</div>
        <div class="value">${escapeHtml(slide.customerImpact)}</div>
      </div>
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
      ${
        summary
          ? `
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
          <thead>
            <tr>
              <th>Rule</th>
              <th>Status</th>
              <th>Blocking</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      `
          : ""
      }
      <script>
        const vscode = acquireVsCodeApi();
        const button = document.getElementById("continue");
        if (button) {
          button.addEventListener("click", () => {
            vscode.postMessage({ type: "continue" });
          });
        }
      </script>
    </body>
  </html>
  `;
};

const renderProcessHtml = (
  title: string,
  listingPath: string,
  rulesPath: string,
  applicabilityPath: string,
  payload: EvaluationPayload
): string => {
  const summary = payload.result?.summary;
  const evaluations = payload.result?.evaluations ?? [];
  const rows = evaluations
    .map(
      (row) => `
      <tr>
        <td><code>${escapeHtml(row.rule_id)}</code></td>
        <td><span class="pill ${statusClass(row.status)}">${escapeHtml(row.status)}</span></td>
        <td>${row.blocking ? "Yes" : "No"}</td>
        <td>${escapeHtml(row.requirement_type)}</td>
        <td>${escapeHtml(row.confidence)}</td>
        <td>${escapeHtml(row.message)}</td>
      </tr>
    `
    )
    .join("");

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        :root {
          color-scheme: light dark;
          --ok: #1f8f4e;
          --bad: #b42318;
          --na: #667085;
          --unknown: #b26b00;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
          margin: 0;
          padding: 16px;
        }
        h1, h2 {
          margin: 0 0 12px 0;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
          margin-bottom: 16px;
        }
        .card {
          border: 1px solid color-mix(in oklab, currentColor 25%, transparent);
          border-radius: 10px;
          padding: 10px;
        }
        .path {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 12px;
          margin: 4px 0;
          word-break: break-all;
        }
        .pill {
          display: inline-block;
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid currentColor;
        }
        .ok { color: var(--ok); }
        .bad { color: var(--bad); }
        .na { color: var(--na); }
        .unknown { color: var(--unknown); }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        th, td {
          border-bottom: 1px solid color-mix(in oklab, currentColor 20%, transparent);
          text-align: left;
          vertical-align: top;
          padding: 8px 6px;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(title)}</h1>
      <p>
        <span class="pill ${payload.valid ? "ok" : "bad"}">${payload.valid ? "No blocking issues" : "Blocking issues found"}</span>
      </p>
      <div class="card">
        <h2>Inputs</h2>
        <div class="path">Listing: ${escapeHtml(listingPath)}</div>
        <div class="path">Rules: ${escapeHtml(rulesPath)}</div>
        <div class="path">Applicability: ${escapeHtml(applicabilityPath)}</div>
      </div>
      <h2>Process Summary</h2>
      <div class="grid">
        <div class="card"><strong>Total rules</strong><div>${summary?.total_rules ?? 0}</div></div>
        <div class="card"><strong>Blocking</strong><div>${summary?.blocking_issues ?? 0}</div></div>
        <div class="card"><strong>Missing</strong><div>${summary?.missing ?? 0}</div></div>
        <div class="card"><strong>Stale</strong><div>${summary?.stale ?? 0}</div></div>
        <div class="card"><strong>Mismatched</strong><div>${summary?.mismatched ?? 0}</div></div>
        <div class="card"><strong>Warnings</strong><div>${summary?.warnings ?? 0}</div></div>
        <div class="card"><strong>Unknown</strong><div>${summary?.unknown ?? 0}</div></div>
        <div class="card"><strong>Not applicable</strong><div>${summary?.not_applicable ?? 0}</div></div>
        <div class="card"><strong>Present</strong><div>${summary?.present ?? 0}</div></div>
      </div>
      <h2>Rule Outcomes</h2>
      <table>
        <thead>
          <tr>
            <th>Rule</th>
            <th>Status</th>
            <th>Blocking</th>
            <th>Type</th>
            <th>Confidence</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </body>
  </html>
  `;
};

export const activate = (context: vscode.ExtensionContext): void => {
  const output = vscode.window.createOutputChannel("CartGuard");
  let demoPanel: vscode.WebviewPanel | undefined;
  let demoState: DemoControlState | undefined;
  let demoRun: EvaluationBundle | undefined;

  const updateDemoPanel = (
    listingPath: string,
    rulesPath: string,
    applicabilityPath: string
  ): void => {
    if (!demoPanel || !demoState) {
      return;
    }

    demoPanel.webview.html = renderDemoHtml(
      demoState,
      listingPath,
      rulesPath,
      applicabilityPath,
      demoRun
    );
  };

  const closeDemoIfDone = async (): Promise<void> => {
    if (!demoState?.done) {
      return;
    }

    if (demoPanel) {
      demoPanel.dispose();
    }
    await vscode.commands.executeCommand("workbench.action.closeWindow");
  };

  const advanceDemo = async (
    listingPath: string,
    rulesPath: string,
    applicabilityPath: string
  ): Promise<DemoControlState> => {
    if (!demoState) {
      demoState = {
        stepIndex: 0,
        done: false,
        title: demoSlides[0]?.title ?? "Step 1"
      };
      return demoState;
    }

    if (demoState.done) {
      return demoState;
    }

    const nextIndex = Math.min(demoState.stepIndex + 1, demoSlides.length - 1);
    demoState = {
      stepIndex: nextIndex,
      done: nextIndex === demoSlides.length - 1,
      title: demoSlides[nextIndex]?.title ?? "Step"
    };

    if (nextIndex >= 2 && !demoRun) {
      demoRun = await runEvaluation(listingPath, rulesPath, applicabilityPath, output);
    }

    return demoState;
  };

  const runDemo = vscode.commands.registerCommand("cartguard.runDemo", async () => {
    try {
      const listingPath = join(context.extensionPath, "demo", "sample-listing.json");
      const rulesPath = join(context.extensionPath, "demo", "rules.json");
      const applicabilityPath = join(context.extensionPath, "demo", "applicability.json");

      const run = await runEvaluation(
        listingPath,
        rulesPath,
        applicabilityPath,
        output
      );
      await openResult("Demo result", run.evaluation, output);
      const valid = run.evaluation.valid;

      if (valid) {
        void vscode.window.showInformationMessage("CartGuard demo passed with no blocking issues.");
      } else {
        void vscode.window.showWarningMessage("CartGuard demo found blocking issues.");
      }
      return valid;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`[CartGuard] Demo error: ${message}`);
      void vscode.window.showErrorMessage(`CartGuard demo failed: ${message}`);
      throw error;
    }
  });

  const validateJsonFiles = vscode.commands.registerCommand(
    "cartguard.validateJsonFiles",
    async (args?: ValidationCommandArgs) => {
      try {
        const listingPath =
          typeof args?.listingPath === "string"
            ? args.listingPath
            : await pickJsonFile("Select listing JSON");
        if (!listingPath) {
          return;
        }

        const rulesPath =
          typeof args?.rulesPath === "string"
            ? args.rulesPath
            : await pickJsonFile("Select rules JSON");
        if (!rulesPath) {
          return;
        }

        const applicabilityPath =
          typeof args?.applicabilityPath === "string"
            ? args.applicabilityPath
            : await pickJsonFile("Select applicability JSON");
        if (!applicabilityPath) {
          return;
        }

        const run = await runEvaluation(
          listingPath,
          rulesPath,
          applicabilityPath,
          output
        );
        await openResult("Validation result", run.evaluation, output);
        const valid = run.evaluation.valid;

        if (valid) {
          void vscode.window.showInformationMessage("CartGuard validation passed with no blocking issues.");
        } else {
          void vscode.window.showWarningMessage("CartGuard validation found blocking issues.");
        }
        return valid;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        output.appendLine(`[CartGuard] Validation error: ${message}`);
        void vscode.window.showErrorMessage(`CartGuard validation failed: ${message}`);
        throw error;
      }
    }
  );

  const openProcessView = vscode.commands.registerCommand(
    "cartguard.openProcessView",
    async (args?: ValidationCommandArgs) => {
      try {
        const listingPath =
          typeof args?.listingPath === "string"
            ? args.listingPath
            : join(context.extensionPath, "demo", "sample-listing.json");
        const rulesPath =
          typeof args?.rulesPath === "string"
            ? args.rulesPath
            : join(context.extensionPath, "demo", "rules.json");
        const applicabilityPath =
          typeof args?.applicabilityPath === "string"
            ? args.applicabilityPath
            : join(context.extensionPath, "demo", "applicability.json");

        const run = await runEvaluation(
          listingPath,
          rulesPath,
          applicabilityPath,
          output
        );

        const panel = vscode.window.createWebviewPanel(
          "cartguardProcessView",
          "CartGuard Process View",
          vscode.ViewColumn.Active,
          {
            enableScripts: false
          }
        );

        panel.webview.html = renderProcessHtml(
          "CartGuard Compliance Process",
          listingPath,
          rulesPath,
          applicabilityPath,
          run.evaluation
        );
        return run.evaluation.valid;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        output.appendLine(`[CartGuard] Process view error: ${message}`);
        void vscode.window.showErrorMessage(`CartGuard process view failed: ${message}`);
        throw error;
      }
    }
  );

  const openDemoSlideshow = vscode.commands.registerCommand(
    "cartguard.openDemoSlideshow",
    (args?: ValidationCommandArgs) => {
      try {
        const listingPath =
          typeof args?.listingPath === "string"
            ? args.listingPath
            : join(context.extensionPath, "demo", "sample-listing.json");
        const rulesPath =
          typeof args?.rulesPath === "string"
            ? args.rulesPath
            : join(context.extensionPath, "demo", "rules.json");
        const applicabilityPath =
          typeof args?.applicabilityPath === "string"
            ? args.applicabilityPath
            : join(context.extensionPath, "demo", "applicability.json");

        demoRun = undefined;
        demoState = {
          stepIndex: 0,
          done: false,
          title: demoSlides[0]?.title ?? "Step 1"
        };

        demoPanel = vscode.window.createWebviewPanel(
          "cartguardDemoSlideshow",
          "CartGuard Slideshow Demo",
          vscode.ViewColumn.Active,
          {
            enableScripts: true
          }
        );

        demoPanel.onDidDispose(() => {
          demoPanel = undefined;
          demoState = undefined;
          demoRun = undefined;
        });

        demoPanel.webview.onDidReceiveMessage(async (message: unknown) => {
          if (
            typeof message === "object" &&
            message !== null &&
            "type" in message &&
            (message as { type?: unknown }).type === "continue"
          ) {
            await advanceDemo(listingPath, rulesPath, applicabilityPath);
            updateDemoPanel(listingPath, rulesPath, applicabilityPath);
            await closeDemoIfDone();
          }
        });

        updateDemoPanel(listingPath, rulesPath, applicabilityPath);
        return demoState;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        output.appendLine(`[CartGuard] Slideshow error: ${message}`);
        void vscode.window.showErrorMessage(`CartGuard slideshow failed: ${message}`);
        throw error;
      }
    }
  );

  const demoNextStep = vscode.commands.registerCommand(
    "cartguard.demoNextStep",
    async (args?: ValidationCommandArgs) => {
      const listingPath =
        typeof args?.listingPath === "string"
          ? args.listingPath
          : join(context.extensionPath, "demo", "sample-listing.json");
      const rulesPath =
        typeof args?.rulesPath === "string"
          ? args.rulesPath
          : join(context.extensionPath, "demo", "rules.json");
      const applicabilityPath =
        typeof args?.applicabilityPath === "string"
          ? args.applicabilityPath
          : join(context.extensionPath, "demo", "applicability.json");

      if (!demoPanel || !demoState) {
        await vscode.commands.executeCommand("cartguard.openDemoSlideshow", args);
      }

      const state = await advanceDemo(listingPath, rulesPath, applicabilityPath);
      updateDemoPanel(listingPath, rulesPath, applicabilityPath);
      await closeDemoIfDone();
      return state;
    }
  );

  context.subscriptions.push(
    runDemo,
    validateJsonFiles,
    openProcessView,
    openDemoSlideshow,
    demoNextStep,
    output
  );
};

export const deactivate = (): void => {};
