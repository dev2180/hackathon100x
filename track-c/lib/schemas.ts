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
  graph: z.object({
    nodes: z.array(z.object({
      id: z.string(),
      label: z.string(),
      description: z.string(),
      type: z.enum(["current", "step", "goal", "dead"]),
    })).min(3).max(9),
    edges: z.array(z.object({
      from: z.string(),
      to: z.string(),
      type: z.enum(["path", "dead-end"]),
    })).min(2).max(12),
  }),
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
    graph: {
      type: "object",
      description: "A directed node-edge journey map. The main path goes current→step→...→goal. Dead-end branches show wrong moves the builder will instinctively try.",
      properties: {
        nodes: {
          type: "array",
          minItems: 3,
          maxItems: 9,
          description: "All nodes. Must include exactly one 'current' and one 'goal'. Include 2-3 'step' nodes on the main path. Include 1-3 'dead' nodes for the wrong moves this builder will likely attempt — these branch off main path nodes.",
          items: {
            type: "object",
            properties: {
              id:          { type: "string", description: "Unique snake_case ID, e.g. 'step_1', 'dead_1'." },
              label:       { type: "string", description: "Short label, max 5 words." },
              description: { type: "string", description: "One sentence. For 'dead' nodes: explain exactly why this path leads nowhere for this builder specifically." },
              type:        { type: "string", enum: ["current", "step", "goal", "dead"] },
            },
            required: ["id", "label", "description", "type"],
            additionalProperties: false,
          },
        },
        edges: {
          type: "array",
          minItems: 2,
          maxItems: 12,
          description: "Directed edges. Use type='path' for the correct route (current→steps→goal). Use type='dead-end' for branches from a main-path node to a 'dead' node.",
          items: {
            type: "object",
            properties: {
              from: { type: "string", description: "Source node id." },
              to:   { type: "string", description: "Target node id." },
              type: { type: "string", enum: ["path", "dead-end"] },
            },
            required: ["from", "to", "type"],
            additionalProperties: false,
          },
        },
      },
      required: ["nodes", "edges"],
      additionalProperties: false,
    },
  },
  required: ["bottleneck", "evidence_quote", "x_prediction", "y_kill", "analogy", "missed_signals", "next_steps", "graph"],
  additionalProperties: false,
};
