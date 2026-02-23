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

const decisionGates: DecisionGate[] = [
  {
    gateId: "GATE_WIFI_BASIC",
    checkId: "decision_gate_wifi_basic",
    context: "Radio SKU missing RED-aligned evidence.",
    businessTradeoff: "Ship is fast but risky; hold avoids likely compliance rework.",
    options: ["ship", "hold", "escalate"],
    recommended: "hold"
  },
  {
    gateId: "GATE_MAINS_EU",
    checkId: "decision_gate_mains_eu",
    context: "Mains SKU missing DoC and local-language readiness.",
    businessTradeoff: "Shipping now saves time but creates high compliance risk.",
    options: ["ship", "hold", "escalate"],
    recommended: "hold"
  },
  {
    gateId: "GATE_RP_CONFLICT",
    checkId: "decision_gate_rp_conflict",
    context: "RP/importer identity mismatch across artifacts.",
    businessTradeoff: "Proceeding without alignment can break authority-response flow.",
    options: ["ship", "hold", "escalate"],
    recommended: "escalate"
  },
  {
    gateId: "GATE_FALSE_ALARM_OK",
    checkId: "decision_gate_false_alarm_ok",
    context: "Messy evidence appears valid after cross-check.",
    businessTradeoff: "Holding creates avoidable delay; shipping may be acceptable.",
    options: ["ship", "hold"],
    recommended: "ship"
  },
  {
    gateId: "GATE_UNKNOWN_SCOPE",
    checkId: "decision_gate_battery_unknown",
    context: "Applicability confidence is too low for automated decision.",
    businessTradeoff: "Escalation slows launch but avoids incorrect compliance claims.",
    options: ["ship", "hold", "escalate"],
    recommended: "escalate"
  }
];

const getGateForSlide = (slide: DemoSlide): DecisionGate | undefined =>
  decisionGates.find((entry) => entry.checkId === slide.checkId);

const demoSlides: DemoSlide[] = [
  {
    title: "Step 1 of 14: Morning Shock - MYC Backlog",
    now: "Start from an operator symptom: urgent compliance requests and launch pressure.",
    next: "Open batch triage to prioritize high-risk SKUs before submission.",
    customerImpact: "Matches what teams actually see first: pressure from marketplace requests, not clean data.",
    whatUserSees:
      "MYC-style pressure panel plus launch batch summary with high/medium/low risk tags.",
    whatUserClicks: "Open in CartGuard - Today's launch batch",
    cartGuardChecks:
      "Batch import and preflight index across listing attributes, documents, and directive scope hints.",
    legalBasis: "No direct legal determination at this step.",
    marketplacePolicy:
      "Amazon states missing compliance documentation can remove listings and affect Account Health.",
    cartguardRecommendation:
      "Run preflight before responding to external requests so fixes happen upstream.",
    ownerRole: "Ops",
    fixAction: "Prioritize blocked SKUs before submission.",
    evidenceType: "marketplace",
    checkId: "myc_inbound_alert",
    inputArtifact: "workflow-batch.json products[]"
  },
  {
    title: "Step 2 of 14: Batch Triage by Risk",
    now: "Sort by risk and move to the highest-risk SKU first.",
    next: "Open Wi-Fi Basic and explain why radio scope causes hard blockers.",
    customerImpact: "Compresses triage time when teams have many SKUs and no clear queue.",
    whatUserSees:
      "Batch table with risk, archetype, and missing-evidence counts.",
    whatUserClicks: "Sort by Risk, then open Wi-Fi Camera Basic",
    cartGuardChecks:
      "Directive applicability preview (radio/mains/battery) plus evidence presence counts.",
    legalBasis: "Scope logic uses RED/LVD/EMC applicability definitions.",
    marketplacePolicy: "No marketplace decision at this step.",
    cartguardRecommendation:
      "Work high-risk SKUs first; defer medium-risk informational issues.",
    ownerRole: "Compliance",
    fixAction: "Open highest-risk SKU and begin evidence drilldown.",
    evidenceType: "best_practice",
    checkId: "batch_overview",
    inputArtifact: "workflow-batch.json products[]"
  },
  {
    title: "Step 3 of 14: Wi-Fi Basic - RED Gap",
    now: "Show a radio product with evidence that references only LVD/EMC.",
    next: "Drill into DoC fields and highlight missing RED alignment.",
    customerImpact: "Catches severe classification mistakes before launch day.",
    whatUserSees:
      "Wi-Fi fields enabled, but DoC directives list excludes RED.",
    whatUserClicks: "Why is this high risk?",
    cartGuardChecks:
      "Radio-feature detection and directive-set comparison in DoC metadata.",
    legalBasis:
      "Radio equipment falls under RED; required evidence must align with RED obligations.",
    marketplacePolicy:
      "Missing required evidence increases the risk of additional marketplace requests.",
    cartguardRecommendation:
      "Treat as blocked until RED-aligned evidence is attached.",
    ownerRole: "Compliance",
    fixAction: "Request RED DoC and radio test evidence from supplier.",
    evidenceType: "legal",
    checkId: "check_red_applicability",
    inputArtifact: "sample-listing.json + rules.json",
    scenarioId: "wrong_directive_radio"
  },
  {
    title: "Step 4 of 14: Wi-Fi Basic - DoC Drilldown",
    now: "Parse DoC fields to expose missing directive references and weak traceability.",
    next: "Check labels/manuals for Germany launch readiness.",
    customerImpact: "Gives compliance managers field-level reasons, not generic fail labels.",
    whatUserSees:
      "Parsed DoC view showing directives, model ID, issuer, and date.",
    whatUserClicks: "Compare against RED DoC reference structure",
    cartGuardChecks:
      "DoC structure and content checks against expected RED-oriented fields.",
    legalBasis:
      "RED requires a DoC and technical documentation that support conformity assessment.",
    marketplacePolicy: "No marketplace policy decision at this step.",
    cartguardRecommendation:
      "Replace generic template DoC with model-specific RED-aligned DoC.",
    ownerRole: "Compliance",
    fixAction: "Update DoC and include applicable radio standards.",
    evidenceType: "legal",
    checkId: "check_red_doc_content",
    inputArtifact: "workflow-batch.json documents"
  },
  {
    title: "Step 5 of 14: Wi-Fi Basic - Labels and Manual",
    now: "Show missing EU traceability fields and language gaps for Germany.",
    next: "Take a ship/hold/escalate decision under launch pressure.",
    customerImpact: "Makes RP and compliance concerns concrete and actionable.",
    whatUserSees:
      "CN-only label identity and English-only manual for DE target.",
    whatUserClicks: "Check legal minimums",
    cartGuardChecks:
      "Traceability field checks and target-country instruction language checks.",
    legalBasis:
      "Manufacturer/importer identification and local-language instructions must accompany product placement.",
    marketplacePolicy:
      "Missing evidence can trigger additional requests and listing impact.",
    cartguardRecommendation:
      "Do not proceed until EU traceability and language gaps are resolved.",
    ownerRole: "Responsible Person",
    fixAction: "Update labels and attach German instructions.",
    evidenceType: "legal",
    checkId: "check_manual_language",
    inputArtifact: "workflow-batch.json labels/manuals",
    scenarioId: "manual_language_de"
  },
  {
    title: "Step 6 of 14: Decision Gate - Wi-Fi Basic",
    now: "Force a business decision with explicit tradeoff and recommendation.",
    next: "Move to the mains charger case.",
    customerImpact: "Shows CartGuard supports accountable decisions, not passive checklists.",
    whatUserSees:
      "Gate dialog with ship / hold / escalate options and recommended decision.",
    whatUserClicks: "Select Hold, then continue",
    cartGuardChecks:
      "Compiles unresolved critical gaps into one decision context.",
    legalBasis: "Critical RED and traceability prerequisites remain unresolved.",
    marketplacePolicy:
      "Marketplace consequences are possible; CartGuard labels this as risk, not certainty.",
    cartguardRecommendation:
      "Strongly recommend HOLD and record rationale for audit trail.",
    ownerRole: "Compliance",
    fixAction: "Record decision and assign corrective actions to supplier and localization owners.",
    evidenceType: "best_practice",
    checkId: "decision_gate_wifi_basic",
    inputArtifact: "workflow-batch.json scenario wrong_directive_radio",
    scenarioId: "wrong_directive_radio"
  },
  {
    title: "Step 7 of 14: Mains EU Charger - Missing DoC",
    now: "Open a classic blocker: in-scope mains product with no DoC attached.",
    next: "Take decision gate for mains SKU.",
    customerImpact: "Prevents avoidable late-stage fire drills before submission.",
    whatUserSees:
      "230V SKU with missing DoC and incomplete language readiness.",
    whatUserClicks: "Why is this blocked?",
    cartGuardChecks:
      "LVD scope and mandatory declaration presence checks for mains equipment.",
    legalBasis:
      "In-scope electrical equipment requires documented conformity evidence before market placement.",
    marketplacePolicy:
      "Incomplete documents increase risk of downstream compliance requests.",
    cartguardRecommendation:
      "Block submission until model-specific DoC is present.",
    ownerRole: "Compliance",
    fixAction: "Obtain valid DoC and complete document bundle.",
    evidenceType: "legal",
    checkId: "check_lvd_doc_presence",
    inputArtifact: "sample-listing.json + rules.json",
    scenarioId: "missing_doc_mains"
  },
  {
    title: "Step 8 of 14: Decision Gate - Mains Charger",
    now: "Force ship/hold/escalate decision for mains blocker.",
    next: "Move to battery revision drift where answer is not binary.",
    customerImpact: "Demonstrates that decisions are explicit and auditable.",
    whatUserSees:
      "Gate with recommendation to hold until DoC and language coverage are complete.",
    whatUserClicks: "Select Hold, then continue",
    cartGuardChecks:
      "Summarizes unresolved mains-scope blockers into one decision point.",
    legalBasis: "Mains conformity evidence is incomplete.",
    marketplacePolicy:
      "Potential request/removal risk exists if submitted with missing evidence.",
    cartguardRecommendation:
      "Strong HOLD recommendation; proceed only after evidence update.",
    ownerRole: "Compliance",
    fixAction: "Record gate decision and assign remediation tasks.",
    evidenceType: "best_practice",
    checkId: "decision_gate_mains_eu",
    inputArtifact: "workflow-batch.json scenario missing_doc_mains",
    scenarioId: "missing_doc_mains"
  },
  {
    title: "Step 9 of 14: Battery Rev A - Ambiguous Version Drift",
    now: "Show a gray-area case with old evidence and planned hardware revision change.",
    next: "Take an UNKNOWN escalation gate instead of pretending certainty.",
    customerImpact: "Builds trust by handling ambiguity with escalation, not false confidence.",
    whatUserSees:
      "Rev A test evidence and Rev C production intent shown side-by-side.",
    whatUserClicks: "Compare versions",
    cartGuardChecks:
      "Version and metadata diff across report, listing, and planned BOM fields.",
    legalBasis:
      "Technical documentation must represent product as placed on market; coverage unclear here.",
    marketplacePolicy: "No direct marketplace rule at this step.",
    cartguardRecommendation:
      "Mark UNKNOWN and escalate to compliance/RP for human decision.",
    ownerRole: "Compliance",
    fixAction: "Escalate with context package and hold automated pass/fail outcome.",
    evidenceType: "unknown",
    checkId: "unknown_scope_escalation",
    inputArtifact: "workflow-batch.json scenario unknown_scope",
    scenarioId: "unknown_scope"
  },
  {
    title: "Step 10 of 14: Decision Gate - Battery UNKNOWN",
    now: "Require decision for ambiguous evidence scope.",
    next: "Show a complex but valid case to prove over-block prevention.",
    customerImpact: "Shows governance maturity in gray areas.",
    whatUserSees:
      "Gate with explicit UNKNOWN rationale and escalation recommendation.",
    whatUserClicks: "Select Escalate, then continue",
    cartGuardChecks:
      "Prevents auto-pass/auto-fail when evidence confidence is below threshold.",
    legalBasis: "Scope confidence insufficient for automated determination.",
    marketplacePolicy: "No direct marketplace rule at this step.",
    cartguardRecommendation:
      "Escalate and wait for human compliance decision.",
    ownerRole: "Compliance",
    fixAction: "Route case to senior compliance or RP with artifacts attached.",
    evidenceType: "unknown",
    checkId: "decision_gate_battery_unknown",
    inputArtifact: "workflow-batch.json scenario unknown_scope",
    scenarioId: "unknown_scope"
  },
  {
    title: "Step 11 of 14: False Alarm Avoided",
    now: "Show a messy document bundle that still passes because identifiers and scope align.",
    next: "Move to RP/importer consistency checks across systems.",
    customerImpact: "Builds trust that CartGuard does not over-block noisy but valid evidence.",
    whatUserSees:
      "Complex SKU with multiple files marked as pass and rationale trace.",
    whatUserClicks: "Run full consistency check",
    cartGuardChecks:
      "Cross-document consistency checks confirm no critical mismatch.",
    legalBasis: "No blocker found against mandatory artifact and identity checks.",
    marketplacePolicy: "No direct marketplace policy decision at this step.",
    cartguardRecommendation:
      "Proceed with submission while preserving evidence links for auditability.",
    ownerRole: "Compliance",
    fixAction: "Proceed with submission and keep evidence links attached.",
    evidenceType: "best_practice",
    checkId: "decision_gate_false_alarm_ok",
    inputArtifact: "workflow-batch.json scenario false_alarm_pass",
    scenarioId: "false_alarm_pass"
  },
  {
    title: "Step 12 of 14: RP/Importer Traceability Snapshot",
    now: "Show identity consistency and traceability across DoC, labels, and account fields.",
    next: "Export role-specific packets for operational handoff.",
    customerImpact: "Improves authority-response readiness and reduces ownership confusion.",
    whatUserSees:
      "RP/importer mismatch matrix with conflict highlights.",
    whatUserClicks: "Generate RP traceability packet",
    cartGuardChecks:
      "Cross-artifact identity and traceability field consistency checks.",
    legalBasis:
      "Traceability obligations require coherent manufacturer/importer identity across artifacts.",
    marketplacePolicy: "No direct marketplace policy decision at this step.",
    cartguardRecommendation:
      "Resolve identity conflicts before listing submission.",
    ownerRole: "Responsible Person",
    fixAction: "Align labels, DoC, and account metadata.",
    evidenceType: "legal",
    checkId: "decision_gate_rp_conflict",
    inputArtifact: "workflow-batch.json scenario rp_identity_mismatch",
    scenarioId: "rp_identity_mismatch"
  },
  {
    title: "Step 13 of 14: Role-Specific Export Packets",
    now: "Generate separate outputs for Ops, Compliance, Engineering, and RP.",
    next: "Finish with Amazon-risk framing and final disclaimer.",
    customerImpact: "Turns findings into immediate work queues instead of generic reports.",
    whatUserSees:
      "Export actions for Ops queue, legal-gap packet, engineering diff, and RP packet.",
    whatUserClicks: "Export Ops and Compliance packets",
    cartGuardChecks:
      "Maps each issue to role ownership and action-oriented output fields.",
    legalBasis: "Legal references remain attached per issue in Compliance packet.",
    marketplacePolicy: "No direct marketplace policy decision at this step.",
    cartguardRecommendation:
      "Use role outputs as daily handoff artifacts across teams.",
    ownerRole: "All",
    fixAction: "Distribute role packets and track closure in launch board.",
    evidenceType: "best_practice",
    checkId: "export_role_outputs",
    inputArtifact: "workflow-batch.json roleOutputs"
  },
  {
    title: "Step 14 of 14: Amazon Risk View + Disclaimer",
    now: "Show pre-submission risk levels with explicit non-prediction wording.",
    next: "End demo and close VSCode host.",
    customerImpact: "Links preflight quality to fewer surprise requests without overclaiming platform behavior.",
    whatUserSees:
      "SKU risk table with statement that risk is heuristic and not an Amazon decision.",
    whatUserClicks: "Continue to close VSCode",
    cartGuardChecks:
      "Heuristic risk mapping from unresolved evidence gaps and scenario severity.",
    legalBasis: "No legal determination at this final summary step.",
    marketplacePolicy:
      "Amazon guidance says missing documentation can lead to listing removal and Account Health impact.",
    cartguardRecommendation:
      "Treat this as a preflight risk signal; do not treat it as platform prediction.",
    ownerRole: "Ops",
    fixAction: "Submit only green SKUs and track unresolved gates to closure.",
    evidenceType: "marketplace",
    checkId: "summarize_amazon_risk",
    inputArtifact: "evaluation summary + workflow scenarios"
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
  const slide = demoSlides[state.stepIndex] ?? demoSlides[0] ?? fallbackSlide;
  const gate = getGateForSlide(slide);
  const currentDecision = gate ? state.decisions[gate.gateId] : undefined;
  const decisionRequired = Boolean(gate && !currentDecision && !state.done);
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
  const isFinalClick = !state.done && state.stepIndex === demoSlides.length - 2;
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
    applicabilityPath: string,
    autoDecideGate: boolean
  ): Promise<DemoControlState> => {
    if (!demoState) {
      demoState = {
        stepIndex: 0,
        done: false,
        title: demoSlides[0]?.title ?? "Step 1",
        decisions: {}
      };
      return demoState;
    }

    if (demoState.done) {
      return demoState;
    }

    const currentSlide = demoSlides[demoState.stepIndex] ?? demoSlides[0];
    if (currentSlide) {
      const gate = getGateForSlide(currentSlide);
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

    const nextIndex = Math.min(demoState.stepIndex + 1, demoSlides.length - 1);
    demoState = {
      stepIndex: nextIndex,
      done: nextIndex === demoSlides.length - 1,
      title: demoSlides[nextIndex]?.title ?? "Step",
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
          title: demoSlides[0]?.title ?? "Step 1",
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
                ? demoSlides[demoState.stepIndex] ?? demoSlides[0]
                : undefined;
              const gate = currentSlide ? getGateForSlide(currentSlide) : undefined;
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
