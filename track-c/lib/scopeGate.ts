import type { Intake } from "./schemas";

// Deterministic scope gate. Runs BEFORE any model call so out-of-scope intakes
// never reach the LLM. Scope: mid-build beginner with a multi-stage AI product.

export interface ScopeResult {
  inScope: boolean;
  reason: string;
}

export function scopeGate(intake: Intake): ScopeResult {
  if (intake.stage !== "mid_build") {
    return {
      inScope: false,
      reason:
        "This tool only diagnoses mid-build builders — people with something partly working. You selected a different stage, so there's no flattened terrain to read yet.",
    };
  }
  if (intake.multiStage !== "yes") {
    return {
      inScope: false,
      reason:
        "This tool only diagnoses multi-stage AI products. A single-step product doesn't have the stage-weighting problem this diagnosis is built to find.",
    };
  }
  return { inScope: true, reason: "In scope: mid-build, multi-stage AI product." };
}
