import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as vscode from "vscode";
import type { z } from "zod";
import { DemoManager } from "./demo-manager";
import { renderProcessHtml } from "./renderers/process-renderer";
import {
  type EvaluationBundle,
  type EvaluationPayload,
  type DemoControlState,
  type SlideshowData,
  workflowDataSchema,
  slideshowDataSchema,
} from "./types";
import type { DemoMode, DecisionGate, WorkflowData } from "./types";

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
  workflowPath?: string;
  slideshowPath?: string;
  demoMode?: "default" | "exec" | "champion";
}

interface DemoPaths {
  listingPath: string;
  rulesPath: string;
  applicabilityPath: string;
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

export const runEvaluation = async (
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

const resolveWorkflowPath = (
  context: vscode.ExtensionContext,
  args?: ValidationCommandArgs
): string => {
  if (typeof args?.workflowPath === "string") {
    return args.workflowPath;
  }
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceRoot) {
    return join(workspaceRoot, "workflow-batch.json");
  }
  return join(context.extensionPath, "demo", "workflow-batch.json");
};

const resolveSlideshowPath = (
  context: vscode.ExtensionContext,
  args?: ValidationCommandArgs
): string => {
  if (typeof args?.slideshowPath === "string") {
    return args.slideshowPath;
  }
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const demoMode = args?.demoMode ?? "default";
  const fileName =
    demoMode === "exec"
      ? "exec-slideshow.json"
      : demoMode === "champion"
        ? "champion-slideshow.json"
        : "slideshow.json";
  if (workspaceRoot) {
    return join(workspaceRoot, fileName);
  }
  return join(context.extensionPath, "demo", fileName);
};

interface ParseResult<T> {
  data?: T;
  error?: string;
}

const toPositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = parseInt(value ?? "", 10);
  return isNaN(parsed) || parsed < 0 ? fallback : parsed;
};

const zodErrorMessage = (error: z.ZodError): string =>
  error.issues
    .slice(0, 6)
    .map((issue: z.ZodIssue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join(" | ");

const parseWorkflowData = (input: unknown): ParseResult<WorkflowData> => {
  const result = workflowDataSchema.safeParse(input);
  return result.success
    ? { data: result.data }
    : { error: zodErrorMessage(result.error) };
};

const parseSlideshowData = (input: unknown): ParseResult<SlideshowData> => {
  const result = slideshowDataSchema.safeParse(input);
  return result.success
    ? { data: result.data }
    : { error: zodErrorMessage(result.error) };
};

export const fallbackSlideshowData: SlideshowData = {
  decisionGates: [],
  slides: [
    {
      title: "Step 1 of 1: Slideshow Data Missing",
      now: "Load slideshow data from demo/slideshow.json.",
      next: "Complete setup.",
      customerImpact: "Ensures valid demonstration sequence.",
      whatUserSees: "This fallback step.",
      whatUserClicks: "Next or Continue.",
      cartGuardChecks: "None (System Level).",
      legalBasis: "Operational integrity.",
      marketplacePolicy: "Content clarity.",
      cartguardRecommendation: "Verify file presence.",
      ownerRole: "Ops",
      fixAction: "Restore valid slideshow.json file.",
      evidenceType: "unknown",
      checkId: "fallback_slideshow",
      inputArtifact: "slideshow.json"
    }
  ]
};

export const activate = (context: vscode.ExtensionContext): void => {
  const output = vscode.window.createOutputChannel("CartGuard");
  const shouldCloseWindowOnDone = process.env.CARTGUARD_DEMO_CLOSE_WINDOW !== "0";
  const autoplayEnabled = process.env.CARTGUARD_DEMO_AUTOPLAY === "1";
  const autoplayStepMs = toPositiveInt(process.env.CARTGUARD_DEMO_AUTOPLAY_STEP_MS, 3000);

  const demoManager = new DemoManager(context, output, autoplayEnabled, autoplayStepMs);

  const runDemo = vscode.commands.registerCommand(
    "cartguard.runDemo",
    async (args?: ValidationCommandArgs): Promise<boolean> => {
      try {
        const { listingPath, rulesPath, applicabilityPath } = resolveDemoPaths(context, args);
        const payload = await runEvaluation(listingPath, rulesPath, applicabilityPath, output);
        await openResult("Demo Evaluation Result", payload, output, vscode.workspace.workspaceFolders?.[0]?.uri.fsPath);
        return true;
      } catch (err) {
        output.appendLine(`[CartGuard] Error running demo: ${String(err)}`);
        return false;
      }
    }
  );

  const validateJsonFiles = vscode.commands.registerCommand(
    "cartguard.validateJsonFiles",
    async (args?: ValidationCommandArgs): Promise<boolean> => {
      try {
        let listingPath: string | undefined;
        let rulesPath: string | undefined;
        let applicabilityPath: string | undefined;

        if (args?.listingPath && args?.rulesPath && args?.applicabilityPath) {
          listingPath = args.listingPath;
          rulesPath = args.rulesPath;
          applicabilityPath = args.applicabilityPath;
        } else {
          listingPath = await pickJsonFile("Select Listing JSON");
          if (!listingPath) return false;
          rulesPath = await pickJsonFile("Select Rules JSON");
          if (!rulesPath) return false;
          applicabilityPath = await pickJsonFile("Select Applicability JSON");
          if (!applicabilityPath) return false;
        }

        const payload = await runEvaluation(listingPath, rulesPath, applicabilityPath, output);
        await openResult("Manual Evaluation Result", payload, output, vscode.workspace.workspaceFolders?.[0]?.uri.fsPath);
        return true;
      } catch (err) {
        output.appendLine(`[CartGuard] Error validating files: ${String(err)}`);
        return false;
      }
    }
  );

  const openProcessView = vscode.commands.registerCommand(
    "cartguard.openProcessView",
    async (args?: ValidationCommandArgs): Promise<boolean> => {
      try {
        const { listingPath, rulesPath, applicabilityPath } = resolveDemoPaths(context, args);
        const payload = await runEvaluation(listingPath, rulesPath, applicabilityPath, output);

        const panel = vscode.window.createWebviewPanel(
          "cartguardProcess",
          "CartGuard Process Results",
          vscode.ViewColumn.One,
          {}
        );

        panel.webview.html = renderProcessHtml(
          "CartGuard Verification Process",
          listingPath,
          rulesPath,
          applicabilityPath,
          payload.evaluation
        );
        return true;
      } catch (err) {
        output.appendLine(`[CartGuard] Error opening process view: ${String(err)}`);
        return false;
      }
    }
  );

  const openDemoSlideshow = vscode.commands.registerCommand(
    "cartguard.openDemoSlideshow",
    async (args?: ValidationCommandArgs): Promise<DemoControlState | null> => {
      const { listingPath, rulesPath, applicabilityPath } = resolveDemoPaths(context, args);
      const workflowPath = resolveWorkflowPath(context, args);
      const slideshowPath = resolveSlideshowPath(context, args);
      const requestedMode = args?.demoMode ?? "default";

      try {
        const [workflowRaw, slideshowRaw] = await Promise.all([
          readJsonFile(workflowPath),
          readJsonFile(slideshowPath)
        ]);

        const workflowResult = parseWorkflowData(workflowRaw);
        const slideshowResult = parseSlideshowData(slideshowRaw);

        if (workflowResult.error || slideshowResult.error) {
          vscode.window.showErrorMessage(`Data Error: ${workflowResult.error || slideshowResult.error}`);
          return null;
        }

        demoManager.setMode(requestedMode);
        demoManager.setRun(undefined);
        demoManager.setWorkflowData(workflowResult.data);

        const slides = slideshowResult.data?.slides ?? [];
        const gates = new Map<string, DecisionGate>();
        slideshowResult.data?.decisionGates.forEach((gate: DecisionGate) => {
          gates.set(gate.checkId, gate);
        });
        demoManager.setSlideshow(slides, gates);

        const state: DemoControlState = {
          stepIndex: 0,
          done: false,
          title: slides[0]?.title ?? "Step 1",
          decisions: {}
        };
        demoManager.setState(state);

        const panel = vscode.window.createWebviewPanel(
          "cartguardDemo",
          `CartGuard Demo: ${requestedMode.toUpperCase()}`,
          vscode.ViewColumn.Beside,
          { enableScripts: true, retainContextWhenHidden: true }
        );

        demoManager.setPanel(panel);
        demoManager.updatePanel(listingPath, rulesPath, applicabilityPath);

        panel.webview.onDidReceiveMessage(async (message: unknown) => {
          if (
            message !== null &&
            typeof message === "object" &&
            "type" in message
          ) {
            const typedMessage = message as { type?: unknown; decision?: unknown; gateId?: unknown };
            if (typedMessage.type === "gateDecision" && typeof typedMessage.decision === "string") {
              const currentState = demoManager.getState();
              if (currentState) {
                const newState: DemoControlState = {
                  ...currentState,
                  decisions: {
                    ...currentState.decisions,
                    [typedMessage.gateId as string]: typedMessage.decision
                  }
                };
                demoManager.setState(newState);
                demoManager.updatePanel(listingPath, rulesPath, applicabilityPath);
              }
              return;
            }
            if (typedMessage.type === "continue") {
              await demoManager.advance(listingPath, rulesPath, applicabilityPath, false, (l, r, a, o) => runEvaluation(l, r, a, o));
              demoManager.updatePanel(listingPath, rulesPath, applicabilityPath);
              const newState = demoManager.getState();
              if (newState?.done && shouldCloseWindowOnDone) {
                setTimeout(() => {
                  panel.dispose();
                }, 800);
              }
              return;
            }
          }
        });
        return state;
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to start demo: ${err instanceof Error ? err.message : String(err)}`);
        return null;
      }
    }
  );

  const demoNextStep = vscode.commands.registerCommand(
    "cartguard.demoNextStep",
    async (args?: ValidationCommandArgs): Promise<DemoControlState | null> => {
      const { listingPath, rulesPath, applicabilityPath } = resolveDemoPaths(context, args);
      const state = await demoManager.advance(listingPath, rulesPath, applicabilityPath, true, (l, r, a, o) => runEvaluation(l, r, a, o));
      demoManager.updatePanel(listingPath, rulesPath, applicabilityPath);
      return state;
    }
  );

  const getDemoState = vscode.commands.registerCommand(
    "cartguard.getDemoState",
    (): DemoControlState | null => demoManager.getState() ?? null
  );

  const getDemoMode = vscode.commands.registerCommand(
    "cartguard.getDemoMode",
    (): DemoMode => demoManager.getMode()
  );

  const openExecDemoSlideshow = vscode.commands.registerCommand(
    "cartguard.openExecDemoSlideshow",
    async () => {
      return vscode.commands.executeCommand("cartguard.openDemoSlideshow", {
        demoMode: "exec"
      });
    }
  );

  const openChampionDemoSlideshow = vscode.commands.registerCommand(
    "cartguard.openChampionDemoSlideshow",
    async () => {
      return vscode.commands.executeCommand("cartguard.openDemoSlideshow", {
        demoMode: "champion"
      });
    }
  );

  const reopenDemoSlideshow = vscode.commands.registerCommand(
    "cartguard.reopenDemoSlideshow",
    async (): Promise<boolean> => {
      await vscode.commands.executeCommand("cartguard.openDemoSlideshow", {
        demoMode: demoManager.getMode()
      });
      return true;
    }
  );

  const reopenExecDemoSlideshow = vscode.commands.registerCommand(
    "cartguard.reopenExecDemoSlideshow",
    async (): Promise<boolean> => {
      await vscode.commands.executeCommand("cartguard.openDemoSlideshow", {
        demoMode: "exec"
      });
      return true;
    }
  );

  const reopenChampionDemoSlideshow = vscode.commands.registerCommand(
    "cartguard.reopenChampionDemoSlideshow",
    async (): Promise<boolean> => {
      await vscode.commands.executeCommand("cartguard.openDemoSlideshow", {
        demoMode: "champion"
      });
      return true;
    }
  );

  context.subscriptions.push(
    runDemo,
    validateJsonFiles,
    openProcessView,
    openDemoSlideshow,
    demoNextStep,
    getDemoState,
    getDemoMode,
    openExecDemoSlideshow,
    openChampionDemoSlideshow,
    reopenDemoSlideshow,
    reopenExecDemoSlideshow,
    reopenChampionDemoSlideshow
  );
};
