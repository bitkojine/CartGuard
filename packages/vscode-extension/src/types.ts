import { z } from "zod";

export const evidenceTypeSchema = z.enum(["legal", "marketplace", "best_practice", "unknown"]);

export const demoSlideSchema = z.object({
    title: z.string().min(1),
    now: z.string().min(1),
    next: z.string().min(1),
    customerImpact: z.string().min(1),
    whatUserSees: z.string().min(1),
    whatUserClicks: z.string().min(1),
    cartGuardChecks: z.string().min(1),
    legalBasis: z.string().min(1),
    marketplacePolicy: z.string().min(1),
    cartguardRecommendation: z.string().min(1),
    ownerRole: z.string().min(1),
    fixAction: z.string().min(1),
    evidenceType: evidenceTypeSchema,
    checkId: z.string().min(1),
    inputArtifact: z.string().min(1),
    scenarioId: z.string().min(1).optional()
});

export type DemoSlide = z.infer<typeof demoSlideSchema>;

export const workflowProductSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    archetype: z.string().min(1),
    status: z.string().min(1)
});

export type Product = z.infer<typeof workflowProductSchema>;

export const workflowScenarioSchema = z.object({
    id: z.string().min(1),
    symptom: z.string().min(1),
    rootCause: z.string().min(1),
    firstOwner: z.string().min(1),
    businessImpact: z.string().min(1),
    missingEvidence: z.array(z.string().min(1))
});

export type Scenario = z.infer<typeof workflowScenarioSchema>;

export const workflowRoleOutputSchema = z.object({
    role: z.string().min(1),
    summary: z.string().min(1),
    fields: z.array(z.string().min(1)),
    actions: z.array(z.string().min(1))
});

export type RoleOutput = z.infer<typeof workflowRoleOutputSchema>;

export const workflowPilotMetricsSchema = z.object({
    baselineMissingDocRatePct: z.number().min(0).max(100),
    currentMissingDocRatePct: z.number().min(0).max(100),
    baselineReviewCycleDays: z.number().optional(),
    currentReviewCycleDays: z.number().optional(),
    baselineReworkLoopsPerListing: z.number().optional(),
    currentReworkLoopsPerListing: z.number().optional()
});

export const workflowDataSchema = z.object({
    products: z.array(workflowProductSchema),
    scenarios: z.array(workflowScenarioSchema),
    roleOutputs: z.array(workflowRoleOutputSchema).optional(),
    pilotMetrics: workflowPilotMetricsSchema.optional()
});

export type WorkflowData = z.infer<typeof workflowDataSchema>;

export const decisionGateSchema = z
    .object({
        gateId: z.string().min(1),
        checkId: z.string().min(1),
        context: z.string().min(1),
        businessTradeoff: z.string().min(1),
        options: z.array(z.string().min(1)).min(1),
        recommended: z.string().min(1)
    });

export type DecisionGate = z.infer<typeof decisionGateSchema>;

export const slideshowDataSchema = z.object({
    slides: z.array(demoSlideSchema).min(1),
    decisionGates: z.array(decisionGateSchema)
});

export type SlideshowData = z.infer<typeof slideshowDataSchema>;

export interface DemoControlState {
    stepIndex: number;
    done: boolean;
    title: string;
    decisions: Record<string, string>;
}

export type DemoMode = "default" | "exec" | "champion";

export interface RuleEvaluationRow {
    rule_id: string;
    status: string;
    blocking: boolean;
    message: string;
    requirement_type: string;
    source_type: string;
    confidence: string;
}

export type EvaluationResultRow = RuleEvaluationRow;

export interface EvaluationSummary {
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

export interface EvaluationPayload {
    valid: boolean;
    errors: Array<{ code: string; message: string; path?: string }>;
    warnings: Array<{ code: string; message: string; path?: string }>;
    result?: {
        listing_id: string;
        evaluations: RuleEvaluationRow[];
        summary: EvaluationSummary;
    };
}

export interface EvaluationBundle {
    evaluation: EvaluationPayload;
    listing: unknown;
    rules: unknown;
    applicability: unknown;
}
