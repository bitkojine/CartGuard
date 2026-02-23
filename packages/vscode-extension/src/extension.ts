import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as vscode from "vscode";

const readJsonFile = async (path: string): Promise<unknown> => {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as unknown;
};

const showcaseWriteToDisk = process.env.CARTGUARD_DEMO_WRITE_TO_DISK === "1";
const showcaseResultsDirName = "_cartguard_in_memory_showcase";

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

const openResult = async (
  title: string,
  payload: unknown,
  output: vscode.OutputChannel,
  workspaceRoot: string | undefined
): Promise<void> => {
  const text = JSON.stringify(payload, null, 2);
  output.appendLine(`[CartGuard] ${title}`);
  output.appendLine(text);
  output.show(true);

  if (showcaseWriteToDisk && workspaceRoot) {
    const dirPath = join(workspaceRoot, showcaseResultsDirName);
    await mkdir(dirPath, { recursive: true });
    const fileName = `${Date.now()}-${slugify(title)}.json`;
    const filePath = join(dirPath, fileName);
    await writeFile(filePath, `${text}\n`, "utf8");
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    await vscode.window.showTextDocument(doc, { preview: false });
    return;
  }

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

interface ActionNode {
  id: string;
  label: string;
  description: string;
  commandId: string;
}

interface DemoPaths {
  listingPath: string;
  rulesPath: string;
  applicabilityPath: string;
}

interface DemoControlState {
  stepIndex: number;
  done: boolean;
  title: string;
  decisions: Record<string, string>;
}

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
  evidenceType: "legal" | "marketplace" | "best_practice" | "unknown";
  checkId: string;
  inputArtifact: string;
  scenarioId?: string;
}

interface WorkflowProduct {
  id: string;
  name: string;
  archetype: string;
  status: string;
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
  products: WorkflowProduct[];
  scenarios: WorkflowScenario[];
  roleOutputs?: WorkflowRoleOutput[];
}

interface WorkflowRoleOutput {
  role: "Ops" | "Compliance" | "Engineering" | "Responsible Person";
  summary: string;
  fields: string[];
  actions: string[];
}

interface DecisionGate {
  gateId: string;
  checkId: string;
  context: string;
  businessTradeoff: string;
  options: string[];
  recommended: string;
}

interface SlideshowData {
  slides: DemoSlide[];
  decisionGates: DecisionGate[];
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

const resolveDemoPaths = (
  context: vscode.ExtensionContext,
  args?: ValidationCommandArgs
): DemoPaths => {
  if (
    typeof args?.listingPath === "string" &&
    typeof args?.rulesPath === "string" &&
    typeof args?.applicabilityPath === "string"
  ) {
    return {
      listingPath: args.listingPath,
      rulesPath: args.rulesPath,
      applicabilityPath: args.applicabilityPath
    };
  }

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceRoot) {
    return {
      listingPath:
        typeof args?.listingPath === "string"
          ? args.listingPath
          : join(workspaceRoot, "sample-listing.json"),
      rulesPath:
        typeof args?.rulesPath === "string"
          ? args.rulesPath
          : join(workspaceRoot, "rules.json"),
      applicabilityPath:
        typeof args?.applicabilityPath === "string"
          ? args.applicabilityPath
          : join(workspaceRoot, "applicability.json")
    };
  }

  return {
    listingPath:
      typeof args?.listingPath === "string"
        ? args.listingPath
        : join(context.extensionPath, "demo", "sample-listing.json"),
    rulesPath:
      typeof args?.rulesPath === "string"
        ? args.rulesPath
        : join(context.extensionPath, "demo", "rules.json"),
    applicabilityPath:
      typeof args?.applicabilityPath === "string"
        ? args.applicabilityPath
        : join(context.extensionPath, "demo", "applicability.json")
  };
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

const resolveWorkflowPath = (context: vscode.ExtensionContext): string => {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceRoot) {
    return join(workspaceRoot, "workflow-batch.json");
  }
  return join(context.extensionPath, "demo", "workflow-batch.json");
};

const resolveSlideshowPath = (context: vscode.ExtensionContext): string => {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceRoot) {
    return join(workspaceRoot, "slideshow.json");
  }
  return join(context.extensionPath, "demo", "slideshow.json");
};

const parseWorkflowData = (input: unknown): WorkflowData | undefined => {
  if (typeof input !== "object" || input === null) {
    return undefined;
  }

  if (!("products" in input) || !("scenarios" in input)) {
    return undefined;
  }

  const productsRaw = (input as { products: unknown }).products;
  const scenariosRaw = (input as { scenarios: unknown }).scenarios;
  if (!Array.isArray(productsRaw) || !Array.isArray(scenariosRaw)) {
    return undefined;
  }

  const products: WorkflowProduct[] = productsRaw
    .filter(
      (entry): entry is { id: string; name: string; archetype: string; status: string } =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as { id?: unknown }).id === "string" &&
        typeof (entry as { name?: unknown }).name === "string" &&
        typeof (entry as { archetype?: unknown }).archetype === "string" &&
        typeof (entry as { status?: unknown }).status === "string"
    )
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      archetype: entry.archetype,
      status: entry.status
    }));

  const scenarios: WorkflowScenario[] = scenariosRaw
    .filter(
      (
        entry
      ): entry is {
        id: string;
        symptom: string;
        rootCause: string;
        firstOwner: string;
        businessImpact: string;
        missingEvidence: string[];
      } =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as { id?: unknown }).id === "string" &&
        typeof (entry as { symptom?: unknown }).symptom === "string" &&
        typeof (entry as { rootCause?: unknown }).rootCause === "string" &&
        typeof (entry as { firstOwner?: unknown }).firstOwner === "string" &&
        typeof (entry as { businessImpact?: unknown }).businessImpact === "string" &&
        Array.isArray((entry as { missingEvidence?: unknown }).missingEvidence)
    )
    .map((entry) => ({
      id: entry.id,
      symptom: entry.symptom,
      rootCause: entry.rootCause,
      firstOwner: entry.firstOwner,
      businessImpact: entry.businessImpact,
      missingEvidence: entry.missingEvidence
    }));

  const roleOutputsRaw =
    "roleOutputs" in input ? (input as { roleOutputs?: unknown }).roleOutputs : undefined;
  const roleOutputs: WorkflowRoleOutput[] | undefined = Array.isArray(roleOutputsRaw)
    ? roleOutputsRaw
        .filter(
          (entry): entry is WorkflowRoleOutput => {
            if (typeof entry !== "object" || entry === null) {
              return false;
            }
            const role = (entry as { role?: unknown }).role;
            return (
              role === "Ops" ||
              role === "Compliance" ||
              role === "Engineering" ||
              role === "Responsible Person"
            );
          }
        )
        .map((entry) => {
          const typed = entry as {
            role: WorkflowRoleOutput["role"];
            summary?: unknown;
            fields?: unknown;
            actions?: unknown;
          };
          return {
            role: typed.role,
            summary: typeof typed.summary === "string" ? typed.summary : "",
            fields: Array.isArray(typed.fields) ? typed.fields.filter((v) => typeof v === "string") : [],
            actions: Array.isArray(typed.actions)
              ? typed.actions.filter((v) => typeof v === "string")
              : []
          };
        })
    : undefined;

  if (roleOutputs) {
    return { products, scenarios, roleOutputs };
  }
  return { products, scenarios };
};

const parseSlideshowData = (input: unknown): SlideshowData | undefined => {
  if (typeof input !== "object" || input === null) {
    return undefined;
  }

  if (!("slides" in input) || !("decisionGates" in input)) {
    return undefined;
  }

  const slidesRaw = (input as { slides: unknown }).slides;
  const decisionGatesRaw = (input as { decisionGates: unknown }).decisionGates;
  if (!Array.isArray(slidesRaw) || !Array.isArray(decisionGatesRaw)) {
    return undefined;
  }

  const slides = slidesRaw.filter(
    (entry): entry is DemoSlide =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as { title?: unknown }).title === "string" &&
      typeof (entry as { now?: unknown }).now === "string" &&
      typeof (entry as { next?: unknown }).next === "string" &&
      typeof (entry as { customerImpact?: unknown }).customerImpact === "string" &&
      typeof (entry as { whatUserSees?: unknown }).whatUserSees === "string" &&
      typeof (entry as { whatUserClicks?: unknown }).whatUserClicks === "string" &&
      typeof (entry as { cartGuardChecks?: unknown }).cartGuardChecks === "string" &&
      typeof (entry as { legalBasis?: unknown }).legalBasis === "string" &&
      typeof (entry as { marketplacePolicy?: unknown }).marketplacePolicy === "string" &&
      typeof (entry as { cartguardRecommendation?: unknown }).cartguardRecommendation === "string" &&
      typeof (entry as { ownerRole?: unknown }).ownerRole === "string" &&
      typeof (entry as { fixAction?: unknown }).fixAction === "string" &&
      ((entry as { evidenceType?: unknown }).evidenceType === "legal" ||
        (entry as { evidenceType?: unknown }).evidenceType === "marketplace" ||
        (entry as { evidenceType?: unknown }).evidenceType === "best_practice" ||
        (entry as { evidenceType?: unknown }).evidenceType === "unknown") &&
      typeof (entry as { checkId?: unknown }).checkId === "string" &&
      typeof (entry as { inputArtifact?: unknown }).inputArtifact === "string" &&
      ("scenarioId" in entry ? typeof (entry as { scenarioId?: unknown }).scenarioId === "string" : true)
  );

  const decisionGates = decisionGatesRaw.filter(
    (entry): entry is DecisionGate =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as { gateId?: unknown }).gateId === "string" &&
      typeof (entry as { checkId?: unknown }).checkId === "string" &&
      typeof (entry as { context?: unknown }).context === "string" &&
      typeof (entry as { businessTradeoff?: unknown }).businessTradeoff === "string" &&
      Array.isArray((entry as { options?: unknown }).options) &&
      (entry as { options: unknown[] }).options.every((option) => typeof option === "string") &&
      typeof (entry as { recommended?: unknown }).recommended === "string"
  );

  if (slides.length === 0) {
    return undefined;
  }

  return { slides, decisionGates };
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

const evidenceTypeClass = (evidenceType: DemoSlide["evidenceType"]): string => {
  if (evidenceType === "legal") {
    return "bad";
  }
  if (evidenceType === "marketplace") {
    return "unknown";
  }
  if (evidenceType === "unknown") {
    return "na";
  }
  return "ok";
};

const fallbackSlideshowData: SlideshowData = {
  decisionGates: [],
  slides: [
    {
      title: "Step 1 of 1: Slideshow Data Missing",
      now: "Load slideshow data from demo/slideshow.json.",
      next: "Close the demo after acknowledging the missing data.",
      customerImpact: "Prevents silent failures when demo data files are broken.",
      whatUserSees: "A single fallback slide indicating slideshow data could not be loaded.",
      whatUserClicks: "Continue",
      cartGuardChecks: "No compliance checks in fallback mode.",
      legalBasis: "None.",
      marketplacePolicy: "None.",
      cartguardRecommendation: "Fix demo/slideshow.json and rerun the demo.",
      ownerRole: "Ops",
      fixAction: "Restore valid slideshow.json file.",
      evidenceType: "unknown",
      checkId: "fallback_slideshow",
      inputArtifact: "slideshow.json"
    }
  ]
};

const actionNodes: ActionNode[] = [
  {
    id: "reopen-slideshow",
    label: "Reopen Slideshow Demo",
    description: "Open the Continue flow again",
    commandId: "cartguard.reopenDemoSlideshow"
  },
  {
    id: "continue-slideshow",
    label: "Continue Slideshow",
    description: "Advance to the next demo slide",
    commandId: "cartguard.demoNextStep"
  }
];

class CartGuardActionsProvider implements vscode.TreeDataProvider<ActionNode> {
  getTreeItem(element: ActionNode): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.id = element.id;
    item.description = element.description;
    item.command = {
      command: element.commandId,
      title: element.label
    };
    return item;
  }

  getChildren(element?: ActionNode): ActionNode[] {
    if (element) {
      return [];
    }
    return actionNodes;
  }
}

const renderDemoHtml = (
  state: DemoControlState,
  slides: DemoSlide[],
  decisionGatesByCheckId: Map<string, DecisionGate>,
  listingPath: string,
  rulesPath: string,
  applicabilityPath: string,
  run: EvaluationBundle | undefined,
  workflowData: WorkflowData | undefined
): string => {
  const fallbackSlide: DemoSlide = {
    title: "Step",
    now: "",
    next: "",
    customerImpact: "",
    whatUserSees: "",
    whatUserClicks: "",
    cartGuardChecks: "",
    legalBasis: "",
    marketplacePolicy: "",
    cartguardRecommendation: "",
    ownerRole: "Ops",
    fixAction: "",
    evidenceType: "best_practice",
    checkId: "unknown",
    inputArtifact: "unknown"
  };
  const activeSlides = slides.length > 0 ? slides : fallbackSlideshowData.slides;
  const slide = activeSlides[state.stepIndex] ?? activeSlides[0] ?? fallbackSlide;
  const gate = decisionGatesByCheckId.get(slide.checkId);
  const currentDecision = gate ? state.decisions[gate.gateId] : undefined;
  const decisionRequired = Boolean(gate && !currentDecision && !state.done);
  const nextSlide =
    state.stepIndex < activeSlides.length - 1 ? activeSlides[state.stepIndex + 1] : undefined;
  const summary = run?.evaluation.result?.summary;
  const scenario = slide.scenarioId
    ? workflowData?.scenarios.find((entry) => entry.id === slide.scenarioId)
    : undefined;
  const productRows =
    workflowData?.products
      .map(
        (product) => `
          <tr>
            <td><code>${escapeHtml(product.id)}</code></td>
            <td>${escapeHtml(product.name)}</td>
            <td>${escapeHtml(product.archetype)}</td>
            <td><span class="pill ${product.status === "Ready" ? "ok" : product.status === "Blocked" ? "bad" : "unknown"}">${escapeHtml(product.status)}</span></td>
          </tr>
        `
      )
      .join("") ?? "";
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
  const roleCards =
    workflowData?.roleOutputs
      ?.map(
        (roleOutput) => `
          <div class="card">
            <h3>${escapeHtml(roleOutput.role)} Output</h3>
            <div class="value">${escapeHtml(roleOutput.summary)}</div>
            <div class="label" style="margin-top:10px;">Fields</div>
            <div class="value">${escapeHtml(roleOutput.fields.join(", "))}</div>
            <div class="label" style="margin-top:10px;">Actions</div>
            <div class="value">${escapeHtml(roleOutput.actions.join(" | "))}</div>
          </div>
        `
      )
      .join("") ?? "";
  const decisionRows = Object.entries(state.decisions)
    .map(
      ([gateId, decision]) => `
      <tr>
        <td><code>${escapeHtml(gateId)}</code></td>
        <td>${escapeHtml(decision)}</td>
      </tr>
    `
    )
    .join("");

  const nextText = nextSlide ? nextSlide.title : "Demo completed.";
  const isFinalClick = !state.done && state.stepIndex === activeSlides.length - 2;
  const buttonLabel = state.done
    ? "Done"
    : isFinalClick
      ? "Continue (closes VSCode)"
      : "Continue";
  const buttonDisabled = state.done || decisionRequired ? "disabled" : "";

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
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 8px;
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
        <div class="label">Symptom</div>
        <div class="value">${escapeHtml(scenario?.symptom ?? slide.whatUserSees)}</div>
        <div class="label" style="margin-top:10px;">What we are doing now</div>
        <div class="value">${escapeHtml(slide.now)}</div>
        <div class="label" style="margin-top:10px;">What we do next</div>
        <div class="value">${escapeHtml(slide.next)}</div>
        <div class="label" style="margin-top:10px;">How this helps customers</div>
        <div class="value">${escapeHtml(slide.customerImpact)}</div>
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
        <div class="label" style="margin-top:10px;">CartGuard recommendation</div>
        <div class="value">${escapeHtml(slide.cartguardRecommendation)}</div>
        <div class="label" style="margin-top:10px;">Fix now</div>
        <div class="value">${escapeHtml(slide.fixAction)}</div>
      </div>
      <div class="card">
        <h3>Step Metadata</h3>
        <div class="meta-grid">
          <div><strong>Role</strong><div>${escapeHtml(slide.ownerRole)}</div></div>
          <div><strong>Check ID</strong><div><code>${escapeHtml(slide.checkId)}</code></div></div>
          <div><strong>Evidence Type</strong><div><span class="pill ${evidenceTypeClass(slide.evidenceType)}">${escapeHtml(slide.evidenceType)}</span></div></div>
          <div><strong>Input Artifact</strong><div>${escapeHtml(slide.inputArtifact)}</div></div>
        </div>
        ${
          slide.evidenceType === "marketplace"
            ? `<div class="value" style="margin-top:10px;">Marketplace risk is CartGuard heuristic guidance, not an Amazon decision.</div>`
            : ""
        }
      </div>
      ${
        scenario
          ? `
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
      `
          : ""
      }
      ${
        productRows
          ? `
      <div class="card">
        <h3>Batch Products</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Archetype</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${productRows}</tbody>
        </table>
      </div>
      `
          : ""
      }
      ${
        roleCards
          ? `
      <div class="grid">${roleCards}</div>
      `
          : ""
      }
      ${
        gate
          ? `
      <div class="card">
        <h3>Decision Gate: ${escapeHtml(gate.gateId)}</h3>
        <div class="label">Context</div>
        <div class="value">${escapeHtml(gate.context)}</div>
        <div class="label" style="margin-top:10px;">Business tradeoff</div>
        <div class="value">${escapeHtml(gate.businessTradeoff)}</div>
        <div class="label" style="margin-top:10px;">Recommended</div>
        <div class="value">${escapeHtml(gate.recommended)}</div>
        <div class="controls" style="margin-top:10px;">
          ${gate.options
            .map(
              (option) =>
                `<button class="decision" data-decision="${escapeHtml(option)}">${escapeHtml(option)}</button>`
            )
            .join("")}
          <span>Selected: ${escapeHtml(currentDecision ?? "none")}</span>
        </div>
        ${
          decisionRequired
            ? `<div class="value" style="margin-top:10px;">Select a decision before continuing.</div>`
            : ""
        }
      </div>
      `
          : ""
      }
      ${
        decisionRows
          ? `
      <div class="card">
        <h3>Gate Decisions</h3>
        <table>
          <thead>
            <tr>
              <th>Gate</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>${decisionRows}</tbody>
        </table>
      </div>
      `
          : ""
      }
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
        Array.from(document.querySelectorAll(".decision")).forEach((decisionButton) => {
          decisionButton.addEventListener("click", () => {
            const decision = decisionButton.getAttribute("data-decision");
            vscode.postMessage({ type: "gateDecision", decision });
          });
        });
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
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const actionsProvider = new CartGuardActionsProvider();
  let demoPanel: vscode.WebviewPanel | undefined;
  let demoState: DemoControlState | undefined;
  let demoRun: EvaluationBundle | undefined;
  let workflowData: WorkflowData | undefined;
  let slideshowSlides: DemoSlide[] = fallbackSlideshowData.slides;
  let decisionGatesByCheckId = new Map<string, DecisionGate>();

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
      slideshowSlides,
      decisionGatesByCheckId,
      listingPath,
      rulesPath,
      applicabilityPath,
      demoRun,
      workflowData
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
    applicabilityPath: string,
    autoDecideGate: boolean
  ): Promise<DemoControlState> => {
    const activeSlides = slideshowSlides.length > 0 ? slideshowSlides : fallbackSlideshowData.slides;
    if (!demoState) {
      demoState = {
        stepIndex: 0,
        done: false,
        title: activeSlides[0]?.title ?? "Step 1",
        decisions: {}
      };
      return demoState;
    }

    if (demoState.done) {
      return demoState;
    }

    const currentSlide = activeSlides[demoState.stepIndex] ?? activeSlides[0];
    if (currentSlide) {
      const gate = decisionGatesByCheckId.get(currentSlide.checkId);
      if (gate && !demoState.decisions[gate.gateId]) {
        if (!autoDecideGate) {
          return demoState;
        }
        demoState = {
          ...demoState,
          decisions: {
            ...demoState.decisions,
            [gate.gateId]: gate.recommended
          }
        };
      }
    }

    const nextIndex = Math.min(demoState.stepIndex + 1, activeSlides.length - 1);
    demoState = {
      stepIndex: nextIndex,
      done: nextIndex === activeSlides.length - 1,
      title: activeSlides[nextIndex]?.title ?? "Step",
      decisions: demoState.decisions
    };

    if (nextIndex >= 2 && !demoRun) {
      demoRun = await runEvaluation(listingPath, rulesPath, applicabilityPath, output);
    }

    return demoState;
  };

  const runDemo = vscode.commands.registerCommand("cartguard.runDemo", async () => {
    try {
      const { listingPath, rulesPath, applicabilityPath } = resolveDemoPaths(context);

      const run = await runEvaluation(
        listingPath,
        rulesPath,
        applicabilityPath,
        output
      );
      await openResult("Demo result", run.evaluation, output, workspaceRoot);
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
        await openResult("Validation result", run.evaluation, output, workspaceRoot);
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
        const { listingPath, rulesPath, applicabilityPath } = resolveDemoPaths(context, args);

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
    async (args?: ValidationCommandArgs) => {
      try {
        const { listingPath, rulesPath, applicabilityPath } = resolveDemoPaths(context, args);

        demoRun = undefined;
        workflowData = undefined;
        slideshowSlides = fallbackSlideshowData.slides;
        decisionGatesByCheckId = new Map();
        const workflowPath = resolveWorkflowPath(context);
        const slideshowPath = resolveSlideshowPath(context);
        try {
          const parsed = parseWorkflowData(await readJsonFile(workflowPath));
          workflowData = parsed;
        } catch {
          workflowData = undefined;
        }
        try {
          const parsed = parseSlideshowData(await readJsonFile(slideshowPath));
          if (parsed) {
            slideshowSlides = parsed.slides;
            decisionGatesByCheckId = new Map(
              parsed.decisionGates.map((gate) => [gate.checkId, gate])
            );
          }
        } catch {
          slideshowSlides = fallbackSlideshowData.slides;
          decisionGatesByCheckId = new Map();
        }
        demoState = {
          stepIndex: 0,
          done: false,
          title: slideshowSlides[0]?.title ?? "Step 1",
          decisions: {}
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
          workflowData = undefined;
          slideshowSlides = fallbackSlideshowData.slides;
          decisionGatesByCheckId = new Map();
        });

        demoPanel.webview.onDidReceiveMessage(async (message: unknown) => {
          if (
            typeof message === "object" &&
            message !== null &&
            "type" in message
          ) {
            const typedMessage = message as { type?: unknown; decision?: unknown };
            if (typedMessage.type === "gateDecision" && typeof typedMessage.decision === "string") {
              const currentSlide = demoState
                ? slideshowSlides[demoState.stepIndex] ?? slideshowSlides[0]
                : undefined;
              const gate = currentSlide
                ? decisionGatesByCheckId.get(currentSlide.checkId)
                : undefined;
              if (gate && demoState) {
                demoState = {
                  ...demoState,
                  decisions: {
                    ...demoState.decisions,
                    [gate.gateId]: typedMessage.decision
                  }
                };
                updateDemoPanel(listingPath, rulesPath, applicabilityPath);
              }
              return;
            }
            if (typedMessage.type === "continue") {
              await advanceDemo(listingPath, rulesPath, applicabilityPath, false);
              updateDemoPanel(listingPath, rulesPath, applicabilityPath);
              await closeDemoIfDone();
            }
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
      const { listingPath, rulesPath, applicabilityPath } = resolveDemoPaths(context, args);

      if (!demoPanel || !demoState) {
        await vscode.commands.executeCommand("cartguard.openDemoSlideshow", args);
      }

      const state = await advanceDemo(listingPath, rulesPath, applicabilityPath, true);
      updateDemoPanel(listingPath, rulesPath, applicabilityPath);
      await closeDemoIfDone();
      return state;
    }
  );

  const reopenDemoSlideshow = vscode.commands.registerCommand(
    "cartguard.reopenDemoSlideshow",
    async () => {
      await vscode.commands.executeCommand("cartguard.openDemoSlideshow");
      return true;
    }
  );

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("cartguardActionsView", actionsProvider),
    runDemo,
    validateJsonFiles,
    openProcessView,
    openDemoSlideshow,
    demoNextStep,
    reopenDemoSlideshow,
    output
  );
};

export const deactivate = (): void => {};
