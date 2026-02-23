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
}

interface DemoSlide {
  title: string;
  now: string;
  next: string;
  customerImpact: string;
  whatUserSees: string;
  cartGuardChecks: string;
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

const demoSlides: DemoSlide[] = [
  {
    title: "Step 1 of 11: Dashboard - Today's Launch Batch",
    now: "Show the launch batch with three draft SKUs and current readiness status.",
    next: "Open the blocked mains charger item and explain the failure symptom first.",
    customerImpact: "Ops immediately sees what is ready versus what is at risk before Amazon review.",
    whatUserSees:
      "Batch list with status chips: Ready, At Risk, Blocked across mains charger, battery gadget, and Wi-Fi camera.",
    cartGuardChecks:
      "Batch preflight aggregation across required evidence presence and mismatch signals.",
    ownerRole: "Ops",
    fixAction: "Prioritize blocked SKUs before submission.",
    evidenceType: "best_practice",
    checkId: "batch_overview",
    inputArtifact: "workflow-batch.json products[]"
  },
  {
    title: "Step 2 of 11: Mains Charger Missing DoC",
    now: "Open the blocked mains charger and surface the blocker symptom from an operator perspective.",
    next: "Show exactly why LVD requires an EU Declaration of Conformity for this product.",
    customerImpact: "Avoids last-minute listing delays caused by missing mandatory artifacts.",
    whatUserSees:
      "SKU detail where DoC slot is empty while other files are present.",
    cartGuardChecks:
      "LVD scope check and declaration presence check for mains-powered equipment.",
    ownerRole: "Compliance",
    fixAction: "Attach a valid DoC for the exact model before listing submission.",
    evidenceType: "legal",
    checkId: "check_lvd_doc_presence",
    inputArtifact: "sample-listing.json + rules.json",
    scenarioId: "missing_doc_mains"
  },
  {
    title: "Step 3 of 11: Why LVD Applies",
    now: "Explain directive applicability and required evidence in plain operator language.",
    next: "Move to the battery non-radio SKU to show version mismatch risk.",
    customerImpact: "Builds trust that checks map to explicit legal conditions, not black-box scoring.",
    whatUserSees:
      "Directive mapping note: mains voltage in LVD scope, DoC required before market placement.",
    cartGuardChecks:
      "Voltage-driven applicability mapping plus mandatory artifact expectation.",
    ownerRole: "Compliance",
    fixAction: "Collect DoC with correct model, manufacturer identity, and referenced standards.",
    evidenceType: "legal",
    checkId: "explain_lvd_scope",
    inputArtifact: "sample-listing.json voltage fields"
  },
  {
    title: "Step 4 of 11: Battery Gadget Version Drift",
    now: "Show a realistic case where a test report is present but tied to an older hardware revision.",
    next: "Open the mismatch details so teams can act without back-and-forth.",
    customerImpact: "Catches hidden evidence drift that usually appears only during late review.",
    whatUserSees:
      "Battery SKU marked At Risk with a report tagged as older revision evidence.",
    cartGuardChecks:
      "EMC applicability plus report-to-product revision consistency checks.",
    ownerRole: "Compliance",
    fixAction: "Request updated report or re-test for current hardware revision.",
    evidenceType: "best_practice",
    checkId: "check_emc_version_alignment",
    inputArtifact: "workflow-batch.json scenario version_mismatch",
    scenarioId: "version_mismatch_battery"
  },
  {
    title: "Step 5 of 11: Version Mismatch Detail",
    now: "Show side-by-side evidence mismatch between listed revision and tested revision.",
    next: "Switch to the radio-enabled Wi-Fi camera scenario.",
    customerImpact: "Reduces review loops by giving engineering and supplier teams exact correction targets.",
    whatUserSees:
      "Model revision delta with highlighted fields from listing and evidence.",
    cartGuardChecks:
      "Critical identifier comparison across listing, report metadata, and rule expectations.",
    ownerRole: "Engineering",
    fixAction: "Update feed metadata and attach evidence for the shipped revision.",
    evidenceType: "best_practice",
    checkId: "show_version_diff",
    inputArtifact: "workflow-batch.json product version fields",
    scenarioId: "version_mismatch_battery"
  },
  {
    title: "Step 6 of 11: Wi-Fi Camera Wrong Directive",
    now: "Show the radio product where listing attributes imply RED but evidence references only LVD/EMC.",
    next: "Explain directive logic for radio equipment and expected RED evidence.",
    customerImpact: "Prevents severe classification errors that lead to hard listing blocks.",
    whatUserSees:
      "Wi-Fi camera with radio capability fields set, but DoC lacking RED reference.",
    cartGuardChecks:
      "Radio capability detection against directive applicability rules.",
    ownerRole: "Compliance",
    fixAction: "Replace documentation set with RED-aligned DoC and tests.",
    evidenceType: "legal",
    checkId: "check_red_applicability",
    inputArtifact: "sample-listing.json radio attributes",
    scenarioId: "wrong_directive_radio"
  },
  {
    title: "Step 7 of 11: Directive Mapping Proof",
    now: "Display decision logic: radio equipment routes to RED obligations.",
    next: "Run language checks for Germany-focused launch readiness.",
    customerImpact: "Answers compliance skepticism with deterministic, explainable logic.",
    whatUserSees:
      "Rule trace showing why RED, not standalone LVD/EMC, governs this case.",
    cartGuardChecks:
      "Applicability rule trace with legal source category tagging.",
    ownerRole: "Compliance",
    fixAction: "Use directive mapping trace as internal approval evidence.",
    evidenceType: "legal",
    checkId: "show_directive_mapping",
    inputArtifact: "applicability.json"
  },
  {
    title: "Step 8 of 11: German Instructions Check",
    now: "Show missing German-language manuals for Germany target marketplace.",
    next: "Check traceability and Responsible Person consistency across artifacts.",
    customerImpact: "Avoids preventable consumer-facing and compliance escalations post-launch.",
    whatUserSees:
      "Manual language matrix with red flags on English-only instructions for DE launch.",
    cartGuardChecks:
      "Destination-country language requirement and manual presence checks.",
    ownerRole: "Ops",
    fixAction: "Attach German manuals and safety instructions before approval.",
    evidenceType: "legal",
    checkId: "check_manual_language",
    inputArtifact: "workflow-batch.json manuals list",
    scenarioId: "manual_language_de"
  },
  {
    title: "Step 9 of 11: RP and Label Consistency",
    now: "Show mismatch between Responsible Person/importer fields across label, DoC, and listing records.",
    next: "Summarize likely Amazon readiness risk from current evidence set.",
    customerImpact: "Reduces authority-response risk and avoids identity confusion across teams.",
    whatUserSees:
      "Entity mismatch panel for manufacturer/importer/RP identities.",
    cartGuardChecks:
      "Cross-artifact traceability consistency checks.",
    ownerRole: "Responsible Person",
    fixAction: "Align label artwork, DoC entity data, and account metadata.",
    evidenceType: "legal",
    checkId: "check_traceability_consistency",
    inputArtifact: "workflow-batch.json RP fields",
    scenarioId: "rp_identity_mismatch"
  },
  {
    title: "Step 10 of 13: False Alarm Avoided",
    now: "Show a messy document bundle that still passes because identifiers and scope align.",
    next: "Move to a gray-area case where the correct result is UNKNOWN and human review.",
    customerImpact: "Builds trust that CartGuard does not over-block noisy but valid evidence.",
    whatUserSees:
      "Complex SKU with multiple files marked as pass and rationale trace.",
    cartGuardChecks:
      "Cross-document consistency checks confirm no critical mismatch.",
    ownerRole: "Compliance",
    fixAction: "Proceed with submission and keep evidence links attached.",
    evidenceType: "best_practice",
    checkId: "false_alarm_avoided",
    inputArtifact: "workflow-batch.json scenario false_alarm_pass",
    scenarioId: "false_alarm_pass"
  },
  {
    title: "Step 11 of 13: Unknown - Escalate to Human Review",
    now: "Present a borderline scope case where automation cannot safely decide applicability.",
    next: "Show Amazon readiness with clear heuristic labels and non-deterministic disclaimer.",
    customerImpact: "Prevents overconfident automation and keeps compliance ownership where required.",
    whatUserSees:
      "Issue state marked UNKNOWN with escalation owner and reason.",
    cartGuardChecks:
      "Scope confidence below threshold routes case to manual compliance review.",
    ownerRole: "Compliance",
    fixAction: "Escalate with context package and wait for directive decision.",
    evidenceType: "unknown",
    checkId: "unknown_scope_escalation",
    inputArtifact: "workflow-batch.json scenario unknown_scope",
    scenarioId: "unknown_scope"
  },
  {
    title: "Step 12 of 13: Amazon Readiness Summary",
    now: "Present SKU-level readiness and likely documentation-request risk before submission.",
    next: "Close with KPI impact and role-specific output cards.",
    customerImpact: "Ops gets a clear submit-or-fix decision instead of surprise dashboard escalations.",
    whatUserSees:
      "Readiness board with likely compliance request risk labels per SKU plus disclaimer.",
    cartGuardChecks:
      "Heuristic mapping from legal evidence gaps to marketplace-risk signal.",
    ownerRole: "Ops",
    fixAction: "Submit only green SKUs; route red SKUs to compliance action queue.",
    evidenceType: "marketplace",
    checkId: "summarize_amazon_risk",
    inputArtifact: "evaluation summary + workflow scenarios"
  },
  {
    title: "Step 13 of 13: Before vs After KPI Impact",
    now: "Show illustrative improvements in blocker rate, review time, and rework loops.",
    next: "End demo and close VSCode host.",
    customerImpact: "Connects compliance preflight work directly to launch velocity and reliability.",
    whatUserSees:
      "Illustrative KPI deltas for internal workflow improvement and role-specific outputs.",
    cartGuardChecks:
      "No legal determination; internal operational analytics and trend framing.",
    ownerRole: "Ops",
    fixAction: "Adopt preflight checks as mandatory gate before listing submission.",
    evidenceType: "best_practice",
    checkId: "show_internal_kpis",
    inputArtifact: "internal trend metrics"
  }
];

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
    cartGuardChecks: "",
    ownerRole: "Ops",
    fixAction: "",
    evidenceType: "best_practice",
    checkId: "unknown",
    inputArtifact: "unknown"
  };
  const slide = demoSlides[state.stepIndex] ?? demoSlides[0] ?? fallbackSlide;
  const nextSlide =
    state.stepIndex < demoSlides.length - 1 ? demoSlides[state.stepIndex + 1] : undefined;
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

  const nextText = nextSlide ? nextSlide.title : "Demo completed.";
  const isFinalClick = !state.done && state.stepIndex === demoSlides.length - 2;
  const buttonLabel = state.done
    ? "Done"
    : isFinalClick
      ? "Continue (closes VSCode)"
      : "Continue";
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
        <div class="label" style="margin-top:10px;">CartGuard check</div>
        <div class="value">${escapeHtml(slide.cartGuardChecks)}</div>
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
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const actionsProvider = new CartGuardActionsProvider();
  let demoPanel: vscode.WebviewPanel | undefined;
  let demoState: DemoControlState | undefined;
  let demoRun: EvaluationBundle | undefined;
  let workflowData: WorkflowData | undefined;

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
        const workflowPath = resolveWorkflowPath(context);
        try {
          const parsed = parseWorkflowData(await readJsonFile(workflowPath));
          workflowData = parsed;
        } catch {
          workflowData = undefined;
        }
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
          workflowData = undefined;
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
      const { listingPath, rulesPath, applicabilityPath } = resolveDemoPaths(context, args);

      if (!demoPanel || !demoState) {
        await vscode.commands.executeCommand("cartguard.openDemoSlideshow", args);
      }

      const state = await advanceDemo(listingPath, rulesPath, applicabilityPath);
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
