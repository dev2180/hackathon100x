import { auth } from "@clerk/nextjs/server";
import { IntakeSchema } from "@/lib/schemas";
import { runPipeline } from "@/lib/pipeline";
import { storeDiagnosis, getRecentDiagnosisCount } from "@/lib/store";

// Uses the Grok SDK + Supabase (Phase 2) — must run on Node.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId } = await auth();
  const activeUserId = userId || "local";

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = IntakeSchema.safeParse(body);
  if (!parsed.success) {
    console.error("Zod Validation Failed:", JSON.stringify(parsed.error.flatten(), null, 2));
    return Response.json(
      { error: "Invalid intake.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Rate Limiting Guard — max 10 runs per 24 hours per user
  try {
    const recentCount = await getRecentDiagnosisCount(activeUserId);
    if (recentCount >= 10) {
      return Response.json(
        { error: "Rate limit exceeded. You can only run up to 10 diagnoses per 24 hours." },
        { status: 429 },
      );
    }
  } catch (err) {
    console.error("Rate limiting check failed:", err);
    // Fail open on rate limiting check errors so database issues don't completely block service
  }

  try {
    const result = await runPipeline(parsed.data);
    // STORE + LOG (step 6) — persist every run, including refuse/abstain.
    await storeDiagnosis(parsed.data, result, activeUserId);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pipeline error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
