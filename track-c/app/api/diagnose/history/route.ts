import { fetchDiagnoses } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const diagnoses = await fetchDiagnoses("local");
    return Response.json({ diagnoses });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
