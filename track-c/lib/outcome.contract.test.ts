import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({
    userId: "user_test_123",
    getToken: vi.fn().mockResolvedValue("mock-supabase-token"),
  }),
}));

vi.mock("./store", () => ({
  fetchDiagnoses: vi.fn().mockResolvedValue([
    {
      id: "diag-1",
      user_id: "user_test_123",
      bottleneck: "flat_terrain",
      prediction: "Your wall is flat_terrain...",
      outcome: [],
    },
  ]),
  storeOutcome: vi.fn().mockResolvedValue({
    id: "outcome-1",
    diagnosis_id: "diag-1",
    did_what: "shipped code",
    matched_prediction: true,
  }),
}));

import { GET } from "../app/api/diagnose/history/route";
import { POST } from "../app/api/outcome/route";
import { fetchDiagnoses, storeOutcome } from "./store";

describe("GET /api/diagnose/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with the diagnoses history", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.diagnoses).toHaveLength(1);
    expect(body.diagnoses[0].id).toBe("diag-1");
    expect(fetchDiagnoses).toHaveBeenCalled();
  });
});

describe("POST /api/outcome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 on invalid payload", async () => {
    const req = new Request("http://localhost/api/outcome", {
      method: "POST",
      body: JSON.stringify({ diagnosisId: "not-a-uuid" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 and records outcome on valid payload", async () => {
    const uuid = "a8b792e3-294b-4b2a-8ef7-47b29a28bfa1";
    const req = new Request("http://localhost/api/outcome", {
      method: "POST",
      body: JSON.stringify({
        diagnosisId: uuid,
        didWhat: "shipped project",
        matchedPrediction: true,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.outcome.id).toBe("outcome-1");
    expect(storeOutcome).toHaveBeenCalledWith(uuid, "shipped project", true);
  });
});
