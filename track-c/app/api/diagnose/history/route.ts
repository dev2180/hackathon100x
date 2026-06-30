import { auth } from "@clerk/nextjs/server";
import { fetchDiagnoses } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
    const token = await getToken();
    const diagnoses = await fetchDiagnoses(userId, token);
    return Response.json({ diagnoses });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
