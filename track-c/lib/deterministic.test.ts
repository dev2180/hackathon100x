import { describe, it, expect } from "vitest";
import { scopeGate } from "./scopeGate";
import {
  isEvidenceGrounded,
  isValidBottleneck,
  hasKillCondition,
} from "./validators";
import { assemblePrediction } from "./template";
import type { Intake } from "./schemas";

const baseIntake: Intake = {
  product: "an AI tutor that turns a syllabus into graded practice sets",
  stage: "mid_build",
  multiStage: "yes",
  stages: "1. data setup\n2. agent orchestration\n3. fine-tuned model",
  loudClaim: "I need to train a custom model before any of this is real",
  actualBehavior: "read papers, rewrote the plan twice, didn't write any code",
};

describe("scope gate", () => {
  it("passes a mid-build, multi-stage builder", () => {
    expect(scopeGate(baseIntake).inScope).toBe(true);
  });

  it("refuses when not mid-build", () => {
    expect(scopeGate({ ...baseIntake, stage: "idea" }).inScope).toBe(false);
    expect(scopeGate({ ...baseIntake, stage: "launched" }).inScope).toBe(false);
  });

  it("refuses when not multi-stage", () => {
    expect(scopeGate({ ...baseIntake, multiStage: "no" }).inScope).toBe(false);
  });
});

describe("evidence validator", () => {
  it("accepts a verbatim substring of the intake", () => {
    expect(isEvidenceGrounded("train a custom model", baseIntake)).toBe(true);
  });

  it("accepts despite whitespace/case differences", () => {
    expect(isEvidenceGrounded("Train A Custom   Model", baseIntake)).toBe(true);
  });

  it("rejects a quote not present in the intake", () => {
    expect(isEvidenceGrounded("I am terrified of launching", baseIntake)).toBe(false);
  });

  it("rejects an empty quote", () => {
    expect(isEvidenceGrounded("", baseIntake)).toBe(false);
  });
});

describe("enum validator", () => {
  it("accepts a taxonomy member", () => {
    expect(isValidBottleneck("flat_terrain")).toBe(true);
  });

  it("rejects ABSTAIN and anything off-taxonomy", () => {
    expect(isValidBottleneck("ABSTAIN")).toBe(false);
    expect(isValidBottleneck("perfectionism")).toBe(false);
  });
});

describe("kill-condition presence", () => {
  it("requires a non-empty y_kill", () => {
    expect(hasKillCondition("ship a rough version to one user")).toBe(true);
    expect(hasKillCondition("   ")).toBe(false);
    expect(hasKillCondition("")).toBe(false);
  });
});

describe("template assembler", () => {
  it("produces the fixed three-clause sentence", () => {
    const s = assemblePrediction("flat terrain", "learn the hardest stage first", "ship stage 1 today");
    expect(s).toBe(
      "Your wall is flat terrain. You will next try learn the hardest stage first. If instead you do ship stage 1 today, this diagnosis is wrong.",
    );
  });
});
