import * as vscode from "vscode";
import type { DemoManager } from "./demo-manager";
import { renderProcessHtml } from "./renderers/process-renderer";
import { type DemoControlState, type DemoMode, type DecisionGate } from "./types";
import {
    type ValidationCommandArgs,
    resolveDemoPaths,
    runEvaluation,
    resolveWorkflowPath,
    resolveSlideshowPath,
    parseWorkflowData,
    parseSlideshowData,
} from "./extension-logic";
import { readJsonFile, openResult, pickJsonFile } from "./utils";

export const registerCommands = (
    context: vscode.ExtensionContext,
    demoManager: DemoManager,
    output: vscode.OutputChannel,
    settings: {
        shouldCloseWindowOnDone: boolean;
    }
): vscode.Disposable[] => {
    return [
        vscode.commands.registerCommand(
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
        ),
        vscode.commands.registerCommand(
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
        ),
        vscode.commands.registerCommand(
            "cartguard.openProcessView",
            async (args?: ValidationCommandArgs): Promise<boolean> => {
                try {
                    const { listingPath, rulesPath, applicabilityPath } = resolveDemoPaths(context, args);
                    const payload = await runEvaluation(listingPath, rulesPath, applicabilityPath, output);

                    const panel = vscode.window.createWebviewPanel("cartguardProcess", "CartGuard Process Results", vscode.ViewColumn.One, {});

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
        ),
        vscode.commands.registerCommand(
            "cartguard.openDemoSlideshow",
            async (args?: ValidationCommandArgs): Promise<DemoControlState | null> => {
                const { listingPath, rulesPath, applicabilityPath } = resolveDemoPaths(context, args);
                const workflowPath = resolveWorkflowPath(context, args);
                const slideshowPath = resolveSlideshowPath(context, args);
                const requestedMode = args?.demoMode ?? "default";

                try {
                    const [workflowRaw, slideshowRaw] = await Promise.all([readJsonFile(workflowPath), readJsonFile(slideshowPath)]);

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

                    const panel = vscode.window.createWebviewPanel("cartguardDemo", `CartGuard Demo: ${requestedMode.toUpperCase()}`, vscode.ViewColumn.One, {
                        enableScripts: true,
                        retainContextWhenHidden: true
                    });

                    demoManager.setPanel(panel);
                    demoManager.updatePanel(listingPath, rulesPath, applicabilityPath);

                    panel.webview.onDidReceiveMessage(async (message: unknown) => {
                        if (message !== null && typeof message === "object" && "type" in message) {
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
                                if (newState?.done && settings.shouldCloseWindowOnDone) {
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
        ),
        vscode.commands.registerCommand(
            "cartguard.demoNextStep",
            async (args?: ValidationCommandArgs): Promise<DemoControlState | null> => {
                const { listingPath, rulesPath, applicabilityPath } = resolveDemoPaths(context, args);
                const state = await demoManager.advance(listingPath, rulesPath, applicabilityPath, true, (l, r, a, o) => runEvaluation(l, r, a, o));
                demoManager.updatePanel(listingPath, rulesPath, applicabilityPath);
                return state;
            }
        ),
        vscode.commands.registerCommand("cartguard.getDemoState", (): DemoControlState | null => demoManager.getState() ?? null),
        vscode.commands.registerCommand("cartguard.getDemoMode", (): DemoMode => demoManager.getMode()),
        vscode.commands.registerCommand("cartguard.openExecDemoSlideshow", async () => {
            return vscode.commands.executeCommand("cartguard.openDemoSlideshow", {
                demoMode: "exec"
            });
        }),
        vscode.commands.registerCommand("cartguard.openChampionDemoSlideshow", async () => {
            return vscode.commands.executeCommand("cartguard.openDemoSlideshow", {
                demoMode: "champion"
            });
        }),
        vscode.commands.registerCommand(
            "cartguard.reopenDemoSlideshow",
            async (): Promise<boolean> => {
                await vscode.commands.executeCommand("cartguard.openDemoSlideshow", {
                    demoMode: demoManager.getMode()
                });
                return true;
            }
        ),
        vscode.commands.registerCommand(
            "cartguard.reopenExecDemoSlideshow",
            async (): Promise<boolean> => {
                await vscode.commands.executeCommand("cartguard.openDemoSlideshow", {
                    demoMode: "exec"
                });
                return true;
            }
        ),
        vscode.commands.registerCommand(
            "cartguard.reopenChampionDemoSlideshow",
            async (): Promise<boolean> => {
                await vscode.commands.executeCommand("cartguard.openDemoSlideshow", {
                    demoMode: "champion"
                });
                return true;
            }
        )
    ];
};
