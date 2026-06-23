import { auth } from "@clerk/nextjs/server";
import { fetchDiagnoses } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  const activeUserId = userId || "local";

  try {
    const diagnoses = await fetchDiagnoses(activeUserId);
    return Response.json({ diagnoses });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
