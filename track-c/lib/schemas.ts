import { z } from "zod";
import { BOTTLENECKS } from "./taxonomy";

// Intake — validated at the API boundary. Treated as data, never instructions.
export const IntakeSchema = z.object({
  product: z.string().min(1, "Describe what you're building."),
  stage: z.enum(["idea", "planning", "mid_build", "launched"]),
  multiStage: z.enum(["yes", "no"]),
  stages: z.string().default(""),
  loudClaim: z.string().min(1, "Tell us what you say is hard."),
  actualBehavior: z.string().min(1, "Tell us what you've actually done."),
  userFeedback: z.string().min(1, "Tell us what potential users did when they saw it."),
  manualWorkaround: z.string().min(1, "Describe the manual workaround people use today."),
});
export type Intake = z.infer<typeof IntakeSchema>;

// Call 1 — Signal Extractor output. Sees and separates; does not diagnose.
export const SignalSchema = z.object({
  loud_claim: z.string().min(1),
  actual_behavior: z.string().min(1),
  contradiction: z.string().min(1),
});
export type Signal = z.infer<typeof SignalSchema>;

// Call 2 — Bottleneck Mapper output (the judgment point). May ABSTAIN.
export const BottleneckMapSchema = z.object({
  bottleneck: z.enum([...BOTTLENECKS, "ABSTAIN"]),
  evidence_quote: z.string(),
  x_prediction: z.string(),
  y_kill: z.string(),
  analogy: z.string().min(1, "Provide a detailed analogy comparing their build state to a real-world scenario."),
  missed_signals: z.array(z.string()).min(1).max(3),
  next_steps: z.array(z.string()).min(2).max(4),
});
export type BottleneckMap = z.infer<typeof BottleneckMapSchema>;

// JSON Schemas for the tool-use forced-output calls (kept in sync with the zod above).
export const SIGNAL_TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    loud_claim: {
      type: "string",
      description: "What the builder SAYS is the hard part, paraphrased tightly.",
    },
    actual_behavior: {
      type: "string",
      description: "What the builder has ACTUALLY done and not done, paraphrased tightly.",
    },
    contradiction: {
      type: "string",
      description:
        "The single sharpest contradiction between the claim and the behavior. One sentence.",
    },
  },
  required: ["loud_claim", "actual_behavior", "contradiction"],
  additionalProperties: false,
};

export const BOTTLENECK_TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    bottleneck: {
      type: "string",
      enum: [...BOTTLENECKS, "ABSTAIN"],
      description:
        "Exactly one bottleneck from the closed taxonomy, or ABSTAIN if none is clearly supported by the evidence.",
    },
    evidence_quote: {
      type: "string",
      description:
        "A verbatim substring copied character-for-character from the intake text. Empty string only if ABSTAIN.",
    },
    x_prediction: {
      type: "string",
      description:
        "The wrong move this person will instinctively try next, given the bottleneck.",
    },
    y_kill: {
      type: "string",
      description:
        "The concrete action that, if they did it instead, would prove this diagnosis wrong. Mandatory.",
    },
    analogy: {
      type: "string",
      description:
        "A detailed real-world analogy with clear structural separation showing why their current path is stuck.",
    },
    missed_signals: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 3,
      description:
        "1-3 specific things the builder said or implied that reveal the bottleneck but that they likely didn't recognize as significant. Each item should start with a brief quote or paraphrase from their intake, followed by what it actually signals.",
    },
    next_steps: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 4,
      description:
        "2-4 concrete, sequenced actions that directly address this specific bottleneck. Each step must be specific to their intake — not generic advice. Start each step with an action verb.",
    },
  },
  required: ["bottleneck", "evidence_quote", "x_prediction", "y_kill", "analogy", "missed_signals", "next_steps"],
  additionalProperties: false,
};
