import type * as vscode from "vscode";
import { renderDemoHtml } from "./renderers/demo-renderer";
import { fallbackSlideshowData } from "./extension";
import type { EvaluationBundle, DemoControlState, DemoSlide, DecisionGate, WorkflowData, DemoMode } from "./types";

export class DemoManager {
    private demoPanel: vscode.WebviewPanel | undefined;
    private demoState: DemoControlState | undefined;
    private demoRun: EvaluationBundle | undefined;
    private workflowData: WorkflowData | undefined;
    private currentMode: DemoMode = "default";
    private slideshowSlides: DemoSlide[] = fallbackSlideshowData.slides;
    private decisionGatesByCheckId = new Map<string, DecisionGate>();

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly output: vscode.OutputChannel,
        private readonly autoplayEnabled: boolean,
        private readonly autoplayStepMs: number
    ) { }

    public setPanel(panel: vscode.WebviewPanel) {
        this.demoPanel = panel;
        panel.onDidDispose(() => {
            this.demoPanel = undefined;
            this.demoState = undefined;
            this.demoRun = undefined;
        });
    }

    public getPanel(): vscode.WebviewPanel | undefined {
        return this.demoPanel;
    }

    public setState(state: DemoControlState | undefined) {
        this.demoState = state;
    }

    public getState(): DemoControlState | undefined {
        return this.demoState;
    }

    public setWorkflowData(data: WorkflowData | undefined) {
        this.workflowData = data;
    }

    public setSlideshow(slides: DemoSlide[], gates: Map<string, DecisionGate>) {
        this.slideshowSlides = slides;
        this.decisionGatesByCheckId = gates;
    }

    public setMode(mode: DemoMode) {
        this.currentMode = mode;
    }

    public getMode(): DemoMode {
        return this.currentMode;
    }

    public setRun(run: EvaluationBundle | undefined) {
        this.demoRun = run;
    }

    public updatePanel(
        listingPath: string,
        rulesPath: string,
        applicabilityPath: string
    ): void {
        if (!this.demoPanel || !this.demoState) {
            return;
        }

        this.demoPanel.webview.html = renderDemoHtml(
            this.demoState,
            this.slideshowSlides,
            this.decisionGatesByCheckId,
            listingPath,
            rulesPath,
            applicabilityPath,
            this.demoRun,
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
        const activeSlides = this.slideshowSlides.length > 0 ? this.slideshowSlides : fallbackSlideshowData.slides;

        if (!this.demoState) {
            this.demoState = {
                stepIndex: 0,
                done: false,
                title: activeSlides[0]?.title ?? "Step 1",
                decisions: {}
            };
            return this.demoState;
        }

        if (this.demoState.done) {
            return this.demoState;
        }

        const currentSlide = activeSlides[this.demoState.stepIndex] ?? activeSlides[0];
        if (currentSlide) {
            const gate = this.decisionGatesByCheckId.get(currentSlide.checkId);
            if (gate && !this.demoState.decisions[gate.gateId]) {
                if (!autoDecideGate) {
                    return this.demoState;
                }
                this.demoState = {
                    ...this.demoState,
                    decisions: {
                        ...this.demoState.decisions,
                        [gate.gateId]: gate.recommended
                    }
                };
            }
        }

        const nextIndex = Math.min(this.demoState.stepIndex + 1, activeSlides.length - 1);
        this.demoState = {
            stepIndex: nextIndex,
            done: nextIndex === activeSlides.length - 1,
            title: activeSlides[nextIndex]?.title ?? "Step",
            decisions: this.demoState.decisions
        };

        if (nextIndex >= 2 && !this.demoRun) {
            this.demoRun = await runEvaluationFn(listingPath, rulesPath, applicabilityPath, this.output);
        }

        return this.demoState;
    }

    public reset() {
        this.demoState = undefined;
        this.demoRun = undefined;
    }
}
