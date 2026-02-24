import { join } from "node:path";
import * as vscode from "vscode";
import type { z } from "zod";
import {
    type EvaluationBundle,
    type EvaluationPayload,
    type SlideshowData,
    workflowDataSchema,
    slideshowDataSchema,
} from "./types";
import type { WorkflowData } from "./types";
import { readJsonFile } from "./utils";

export interface ValidationCommandArgs {
    listingPath?: string;
    rulesPath?: string;
    applicabilityPath?: string;
    workflowPath?: string;
    slideshowPath?: string;
    demoMode?: "default" | "exec" | "champion";
}

export interface DemoPaths {
    listingPath: string;
    rulesPath: string;
    applicabilityPath: string;
}

export interface EngineModule {
    evaluateListingAgainstRuleCatalog: (
        listingInput: unknown,
        ruleCatalogInput: unknown,
        applicabilityCatalogInput: unknown
    ) => EvaluationPayload;
}

export const importEngine = async (): Promise<EngineModule> => {
    const dynamicImport = new Function(
        "specifier",
        "return import(specifier);"
    ) as (specifier: string) => Promise<EngineModule>;
    return dynamicImport("@cartguard/engine");
};

export const resolveDemoPaths = (
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

export const resolveWorkflowPath = (
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

export const resolveSlideshowPath = (
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

export interface ParseResult<T> {
    data?: T;
    error?: string;
}

export const toPositiveInt = (value: string | undefined, fallback: number): number => {
    const parsed = parseInt(value ?? "", 10);
    return isNaN(parsed) || parsed < 0 ? fallback : parsed;
};

export const zodErrorMessage = (error: z.ZodError): string =>
    error.issues
        .slice(0, 6)
        .map((issue: z.ZodIssue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
        .join(" | ");

export const parseWorkflowData = (input: unknown): ParseResult<WorkflowData> => {
    const result = workflowDataSchema.safeParse(input);
    return result.success
        ? { data: result.data }
        : { error: zodErrorMessage(result.error) };
};

export const parseSlideshowData = (input: unknown): ParseResult<SlideshowData> => {
    const result = slideshowDataSchema.safeParse(input);
    return result.success
        ? { data: result.data }
        : { error: zodErrorMessage(result.error) };
};
