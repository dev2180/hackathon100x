// lib/eval.test.ts
// Real-model evaluation runner. Checks quality, discrimination, and abstaining.
// Run this with `npx vitest run lib/eval.test.ts` after setting a valid GROK_API_KEY in .env.local

import { describe, it, expect } from "vitest";
import { runPipeline } from "./pipeline";
import fs from "fs";
import path from "path";

// Load .env.local manually
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value.trim();
      }
    }
  }
} catch (e) {
  console.error("Error loading .env.local manually:", e);
}

const FLAT_TERRAIN_INTAKE = {
  product: "AI tutor that turns a syllabus into graded practice sets",
  stage: "mid_build" as const,
  multiStage: "yes" as const,
  experience: "3 years frontend, first time building with LLMs",
  expertise: "React and UX; never trained a model or built an agent",
  stages: "1. data setup\n2. agent orchestration\n3. fine-tuned model",
  loudClaim: "I need to train a custom model before any of this is real and useful.",
  actualBehavior: "read papers on fine-tuning, rewrote the plan twice, didn't write any code.",
  userFeedback: "showed prototype to two friends last month, they said it was cool but didn't come back.",
  manualWorkaround: "teachers are copying syllabus into ChatGPT and pasting questions manually.",
};

const FEAR_OF_SHIPPING_INTAKE = {
  product: "AI code generator for database schemas",
  stage: "mid_build" as const,
  multiStage: "yes" as const,
  experience: "experienced Python developer, several shipped tools",
  expertise: "backend and CLIs; comfortable with parsers, new to user-facing launches",
  stages: "1. parser\n2. schema generator\n3. web dashboard",
  loudClaim: "I need to rewrite the generator in Rust to optimize speed before anyone uses it.",
  actualBehavior: "finished the parser and generator in Python, works fine, but haven't given access to anyone.",
  userFeedback: "showed a friend the CLI output, they said it looked useful but I haven't given them access.",
  manualWorkaround: "developers are writing schema migrations by hand in SQL.",
};

const VAGUE_INTAKE = {
  product: "Some AI thing",
  stage: "mid_build" as const,
  multiStage: "yes" as const,
  experience: "not sure",
  expertise: "not sure",
  stages: "not sure yet",
  loudClaim: "everything is hard",
  actualBehavior: "thinking about it",
  userFeedback: "haven't shown it to anyone",
  manualWorkaround: "not sure",
};

describe("Grok AI Model Evaluation (Real Calls)", () => {
  it("discriminates flat_terrain bottleneck for builder stuck in research", async () => {
    if (!process.env.GROK_API_KEY || process.env.GROK_API_KEY.includes("YOUR_GROK_API_KEY")) {
      console.warn("Skipping real eval: GROK_API_KEY not set in .env.local");
      return;
    }

    console.log("Running real eval: Flat Terrain...");
    const result = await runPipeline(FLAT_TERRAIN_INTAKE);
    console.log("Result:", result);

    expect(result.status).toBe("diagnosed");
    expect(result.bottleneck).toBe("flat_terrain");
    expect(result.evidence).toBeTruthy();
    expect(result.prediction).toContain("flat terrain");
    expect(result.xPrediction).toBeTruthy();
    expect(result.yKill).toBeTruthy();
  });

  it("discriminates fear_of_shipping for builder optimizing instead of launching", async () => {
    if (!process.env.GROK_API_KEY || process.env.GROK_API_KEY.includes("YOUR_GROK_API_KEY")) {
      return;
    }

    console.log("Running real eval: Fear of Shipping...");
    const result = await runPipeline(FEAR_OF_SHIPPING_INTAKE);
    console.log("Result:", result);

    expect(result.status).toBe("diagnosed");
    expect(result.bottleneck).toBe("fear_of_shipping");
    expect(result.evidence).toBeTruthy();
    expect(result.xPrediction).toBeTruthy();
    expect(result.yKill).toBeTruthy();
  });

  it("abstains on vague or garbage intakes", async () => {
    if (!process.env.GROK_API_KEY || process.env.GROK_API_KEY.includes("YOUR_GROK_API_KEY")) {
      return;
    }

    console.log("Running real eval: Vague Input...");
    const result = await runPipeline(VAGUE_INTAKE);
    console.log("Result:", result);

    expect(result.status).toBe("abstained");
  });
});
