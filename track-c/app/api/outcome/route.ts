import { auth } from "@clerk/nextjs/server";
import { storeOutcome } from "@/lib/store";
import { z } from "zod";

export const runtime = "nodejs";

const OutcomeSchema = z.object({
  diagnosisId: z.string().uuid(),
  didWhat: z.string().min(1),
  matchedPrediction: z.boolean(),
});

export async function POST(request: Request) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const token = await getToken();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = OutcomeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid outcome payload.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const outcome = await storeOutcome(
      parsed.data.diagnosisId,
      parsed.data.didWhat,
      parsed.data.matchedPrediction,
      token,
    );
    return Response.json({ success: true, outcome });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
