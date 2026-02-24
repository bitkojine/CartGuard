import type * as vscode from "vscode";
import { renderDemoHtml } from "./renderers/demo-renderer";
import { DemoLogic } from "./demo-logic";
import { type EvaluationBundle, type DemoControlState, type DemoSlide, type DecisionGate, type WorkflowData, type DemoMode } from "./types";

export class DemoManager {
    private demoPanel: vscode.WebviewPanel | undefined;
    private workflowData: WorkflowData | undefined;
    private currentMode: DemoMode = "default";
    private readonly logic: DemoLogic;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly output: vscode.OutputChannel,
        private readonly autoplayEnabled: boolean,
        private readonly autoplayStepMs: number
    ) {
        this.logic = new DemoLogic();
    }

    public setPanel(panel: vscode.WebviewPanel) {
        this.demoPanel = panel;
        panel.onDidDispose(() => {
            this.demoPanel = undefined;
            this.logic.reset();
        });
    }

    public getPanel(): vscode.WebviewPanel | undefined {
        return this.demoPanel;
    }

    public setState(state: DemoControlState | undefined) {
        this.logic.setState(state);
    }

    public getState(): DemoControlState | undefined {
        return this.logic.getState();
    }

    public setWorkflowData(data: WorkflowData | undefined) {
        this.workflowData = data;
    }

    public setSlideshow(slides: DemoSlide[], gates: Map<string, DecisionGate>) {
        this.logic.setSlideshow(slides, gates);
    }

    public setMode(mode: DemoMode) {
        this.currentMode = mode;
    }

    public getMode(): DemoMode {
        return this.currentMode;
    }

    public setRun(run: EvaluationBundle | undefined) {
        this.logic.setRun(run);
    }

    public updatePanel(
        listingPath: string,
        rulesPath: string,
        applicabilityPath: string
    ): void {
        const state = this.logic.getState();
        if (!this.demoPanel || !state) {
            return;
        }

        this.demoPanel.webview.html = renderDemoHtml(
            state,
            this.logic.getSlides(),
            this.logic.getGates(),
            listingPath,
            rulesPath,
            applicabilityPath,
            this.logic.getRun(),
            this.workflowData,
            this.currentMode,
            this.autoplayEnabled,
            this.autoplayStepMs
        );
    }

    public async advance(
        listingPath: string,
        rulesPath: string,
        applicabilityPath: string,
        autoDecideGate: boolean,
        runEvaluationFn: (l: string, r: string, a: string, o: vscode.OutputChannel) => Promise<EvaluationBundle>
    ): Promise<DemoControlState> {
        return this.logic.advance(autoDecideGate, () =>
            runEvaluationFn(listingPath, rulesPath, applicabilityPath, this.output)
        );
    }

    public reset() {
        this.logic.reset();
    }
}
