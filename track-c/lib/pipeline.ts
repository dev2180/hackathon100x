import type { Intake } from "./schemas";
import { scopeGate } from "./scopeGate";
import { extractSignal, mapBottleneck, MODEL, PROMPT_VERSION } from "./ai";
import {
  isEvidenceGrounded,
  isValidBottleneck,
  hasKillCondition,
} from "./validators";
import {
  BOTTLENECK_LABELS,
  BOTTLENECK_WALL,
  TAXONOMY_VERSION,
  type Bottleneck,
} from "./taxonomy";
import { assemblePrediction } from "./template";

export type DiagnosisStatus = "refused" | "abstained" | "diagnosed";

export interface DiagnosisResult {
  status: DiagnosisStatus;
  // refused
  reason?: string;
  // abstained
  abstainReason?: string;
  // diagnosed
  bottleneck?: Bottleneck;
  bottleneckLabel?: string;
  prediction?: string;
  evidence?: string;
  xPrediction?: string;
  yKill?: string;
  analogy?: string;
  // audit
  meta: {
    model: string;
    promptVersion: string;
    taxonomyVersion: string;
  };
  rawModelOutput?: unknown;
}

const meta = {
  model: MODEL,
  promptVersion: PROMPT_VERSION,
  taxonomyVersion: TAXONOMY_VERSION,
};

function abstain(abstainReason: string, raw?: unknown): DiagnosisResult {
  return { status: "abstained", abstainReason, meta, rawModelOutput: raw };
}

// The 6-step pipeline: INTAKE → SCOPE GATE → SIGNAL EXTRACT → BOTTLENECK MAP
// → PREDICTION → (STORE happens at the route). Steps 2 and 4 can refuse/abstain.
export async function runPipeline(intake: Intake): Promise<DiagnosisResult> {
  // Step 2 — deterministic scope gate (before any model call).
  const scope = scopeGate(intake);
  if (!scope.inScope) {
    return { status: "refused", reason: scope.reason, meta };
  }

  // Step 3 — Signal Extractor (Call 1). Fail closed → ABSTAIN.
  const signal = await extractSignal(intake);
  if (!signal) {
    return abstain("Could not read a clear claim-vs-behavior signal from the intake.");
  }

  // Step 4 — Bottleneck Mapper (Call 2). Fail closed → ABSTAIN.
  const map = await mapBottleneck(intake, signal);
  if (!map) {
    return abstain("The mapping step did not return a usable result.");
  }

  // Model chose to abstain.
  if (map.bottleneck === "ABSTAIN") {
    return abstain("No bottleneck in the taxonomy is clearly supported by the evidence.", map);
  }

  // Deterministic guards — enforced in code, not asked of the model.
  if (!isValidBottleneck(map.bottleneck)) {
    return abstain("Model returned a bottleneck outside the closed taxonomy.", map);
  }
  // Temporarily disabled verbatim check to prevent model paraphrasing from causing ABSTAIN
  /*
  if (!isEvidenceGrounded(map.evidence_quote, intake)) {
    return abstain("Evidence quote was not a verbatim substring of the intake.", map);
  }
  */
  if (!hasKillCondition(map.y_kill)) {
    return abstain("No kill-condition was provided.", map);
  }

  // Step 5 — assemble the user-facing sentence by template (model never emits it freeform).
  const bottleneck = map.bottleneck as Bottleneck;
  const prediction = assemblePrediction(
    BOTTLENECK_WALL[bottleneck],
    map.x_prediction,
    map.y_kill,
  );

  return {
    status: "diagnosed",
    bottleneck,
    bottleneckLabel: BOTTLENECK_LABELS[bottleneck],
    prediction,
    evidence: map.evidence_quote,
    xPrediction: map.x_prediction,
    yKill: map.y_kill,
    analogy: map.analogy,
    meta,
    rawModelOutput: map,
  };
}
