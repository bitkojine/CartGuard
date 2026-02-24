import { type DemoControlState, type DemoSlide, type DecisionGate, type EvaluationBundle, fallbackSlideshowData } from "./types";

export class DemoLogic {
    private state: DemoControlState | undefined;
    private runResult: EvaluationBundle | undefined;

    constructor(
        private slides: DemoSlide[] = fallbackSlideshowData.slides,
        private gates: Map<string, DecisionGate> = new Map()
    ) { }

    public getSlides(): DemoSlide[] {
        return this.slides;
    }

    public getGates(): Map<string, DecisionGate> {
        return this.gates;
    }

    public setSlideshow(slides: DemoSlide[], gates: Map<string, DecisionGate>) {
        this.slides = slides;
        this.gates = gates;
    }

    public setState(state: DemoControlState | undefined) {
        this.state = state;
    }

    public getState(): DemoControlState | undefined {
        return this.state;
    }

    public setRun(run: EvaluationBundle | undefined) {
        this.runResult = run;
    }

    public getRun(): EvaluationBundle | undefined {
        return this.runResult;
    }

    public async advance(
        autoDecideGate: boolean,
        onRequireRun: () => Promise<EvaluationBundle>
    ): Promise<DemoControlState> {
        const activeSlides = this.slides.length > 0 ? this.slides : fallbackSlideshowData.slides;

        if (!this.state) {
            this.state = {
                stepIndex: 0,
                done: false,
                title: activeSlides[0]?.title ?? "Step 1",
                decisions: {}
            };
            return this.state;
        }

        if (this.state.done) {
            return this.state;
        }

        const currentSlide = activeSlides[this.state.stepIndex] ?? activeSlides[0];
        if (currentSlide) {
            const gate = this.gates.get(currentSlide.checkId);
            if (gate && !this.state.decisions[gate.gateId]) {
                if (!autoDecideGate) {
                    return this.state;
                }
                this.state = {
                    ...this.state,
                    decisions: {
                        ...this.state.decisions,
                        [gate.gateId]: gate.recommended
                    }
                };
            }
        }

        const nextIndex = Math.min(this.state.stepIndex + 1, activeSlides.length - 1);
        this.state = {
            stepIndex: nextIndex,
            done: nextIndex === activeSlides.length - 1,
            title: activeSlides[nextIndex]?.title ?? "Step",
            decisions: this.state.decisions
        };

        if (nextIndex >= 2 && !this.runResult) {
            this.runResult = await onRequireRun();
        }

        return this.state;
    }

    public reset() {
        this.state = undefined;
        this.runResult = undefined;
    }
}
