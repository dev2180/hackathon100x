// lib/route.contract.test.ts
// Tests for app/api/diagnose/route.ts in isolation.
// Mocks pipeline, store, and Clerk auth — no real API calls.
// Node 22 provides the global Request/Response — no polyfill needed.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Clerk auth — must come before route import.
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({
    userId: "user_test_123",
    getToken: vi.fn().mockResolvedValue("mock-supabase-token"),
  }),
}));


// Mock pipeline + store BEFORE importing route.
vi.mock("../app/api/diagnose/route", async (importOriginal) => {
  return await importOriginal();
});

vi.mock("./pipeline", () => ({
  runPipeline: vi.fn(),
}));

vi.mock("./store", () => ({
  storeDiagnosis: vi.fn().mockResolvedValue({}),
  getRecentDiagnosisCount: vi.fn().mockResolvedValue(0),
}));


import { POST } from "../app/api/diagnose/route";
import { runPipeline } from "./pipeline";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/diagnose", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validBody = {
  product: "AI tutor",
  stage: "mid_build",
  multiStage: "yes",
  stages: "1. setup\n2. agents",
  loudClaim: "I need to train a model",
  actualBehavior: "read papers, no code",
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// MICRO-TASK 3.1 — malformed JSON → 400
// ---------------------------------------------------------------------------

describe("route — input validation", () => {
  it("returns 400 on malformed JSON body", async () => {
    const req = makeRequest("not json{{{}}}");
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON body.");
  });

  // MICRO-TASK 3.2 — missing required field → 400 with issues
  it("returns 400 with zod issues when required fields are missing", async () => {
    const req = makeRequest({ stage: "mid_build", multiStage: "yes" }); // missing product, loudClaim, actualBehavior
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid intake.");
    expect(body.issues).toBeDefined();
  });

  it("returns 400 when stage is not a valid enum value", async () => {
    const req = makeRequest({ ...validBody, stage: "dreaming" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when multiStage is not a valid enum value", async () => {
    const req = makeRequest({ ...validBody, multiStage: "maybe" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Route — pipeline pass-through
// ---------------------------------------------------------------------------

describe("route — pipeline delegation", () => {
  it("returns 200 with the pipeline result on valid input", async () => {
    const mockResult = {
      status: "refused" as const,
      reason: "out of scope",
      meta: { model: "m", promptVersion: "v", taxonomyVersion: "t" },
    };
    vi.mocked(runPipeline).mockResolvedValue(mockResult);

    const req = makeRequest(validBody);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("refused");
    expect(body.reason).toBe("out of scope");
  });

  it("returns 500 when the pipeline throws", async () => {
    vi.mocked(runPipeline).mockRejectedValue(new Error("Anthropic timeout"));

    const req = makeRequest(validBody);
    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Anthropic timeout");
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const { getRecentDiagnosisCount } = await import("./store");
    vi.mocked(getRecentDiagnosisCount).mockResolvedValue(10);

    const req = makeRequest(validBody);
    const res = await POST(req);

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("Rate limit exceeded");
  });
});

