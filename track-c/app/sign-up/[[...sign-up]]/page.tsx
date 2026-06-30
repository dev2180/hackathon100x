import { redirect } from "next/navigation";

// Auth is Phase 2 — redirect to the diagnose page for now.
export default function SignUpPage() {
  redirect("/diagnose");
}
