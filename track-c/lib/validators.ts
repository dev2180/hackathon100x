import type { Intake } from "./schemas";
import { BOTTLENECKS, type Bottleneck } from "./taxonomy";

// Deterministic guards applied AFTER Call 2. Each is an anti-horoscope check
// enforced in code, never asked of the model.

// Concatenate the free-text intake fields into one haystack for evidence checks.
export function intakeHaystack(intake: Intake): string {
  return [intake.product, intake.stages, intake.loudClaim, intake.actualBehavior]
    .filter(Boolean)
    .join("\n");
}

// Collapse runs of whitespace and lowercase, so an otherwise-verbatim quote
// isn't rejected over a stray space or newline.
function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

// evidence_quote must be a verbatim substring of the intake → else ABSTAIN.
export function isEvidenceGrounded(quote: string, intake: Intake): boolean {
  if (!quote || !quote.trim()) return false;
  const hay = normalize(intakeHaystack(intake));
  return hay.includes(normalize(quote));
}

// bottleneck must be in the closed enum → else ABSTAIN.
export function isValidBottleneck(value: string): value is Bottleneck {
  return (BOTTLENECKS as readonly string[]).includes(value);
}

// kill-condition is mandatory → else reject.
export function hasKillCondition(yKill: string): boolean {
  return Boolean(yKill && yKill.trim());
}
