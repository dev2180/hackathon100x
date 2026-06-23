# PRD — Track C Diagnostic Tool

## One line
A web tool that reads a mid-build AI builder's intake and returns the ONE real bottleneck as a falsifiable prediction — or refuses. Architecture exists to stop it being a horoscope.

## Goal / non-goal
- **Goal:** grounded, falsifiable, single-bottleneck diagnosis + behavioral outcome tracking.
- **Non-goal:** general advice, multi-bottleneck output, autonomous agents, scale. Two users.

## Core principle
Shrink the model's job to the smallest cut: language → structure. Code judges by rules; AI only parses messy text. Less model freedom = less horoscope.

## Scope (who it serves)
Mid-build beginner with a multi-stage domain AI product. Out of scope → refuse.

---

## AI role (the only thing code can't do)
Two narrow single-shot LLM transforms. No loops, no tools-for-decisions, no memory.

- **Call 1 — Signal Extractor:** intake → `{loud_claim, actual_behavior, contradiction}`. Sees and separates. Does not diagnose.
- **Call 2 — Bottleneck Mapper (judgment point):** contradiction + closed taxonomy → `{bottleneck|"ABSTAIN", evidence_quote, x_prediction, y_kill}`.

Both: structured output via tool-use schema (not "reply JSON"), validate with zod, temperature 0, server-side only.

## Pipeline (6 steps)
```
INTAKE (det, fixed Qs)
 → SCOPE GATE (det rule; else REFUSE)
 → SIGNAL EXTRACT (Call 1)
 → BOTTLENECK MAP (Call 2; may ABSTAIN)   ← judgment
 → PREDICTION (det template + model X/Y)
 → STORE + LOG (det, per-user isolated)
```

## Anti-horoscope (enforced in code, not asked of model)
- Scope gate refuses out-of-scope before any model call.
- `evidence_quote` must be a verbatim substring of intake → else ABSTAIN.
- `bottleneck` must be in closed enum → else ABSTAIN.
- Kill-condition `y_kill` mandatory → else reject.
- Final sentence assembled by template code. Model never emits the user-facing line freeform.
- ABSTAIN is a valid stored state, not an error.

**Closed taxonomy (edit to Move 2):** `flat_terrain`, `fear_of_shipping`, `no_idea`, `motivation_only`, `outsourcing_judgment`.

**Prediction template:** `Your wall is [bottleneck]. You will next try [X]. If instead you do [Y], this diagnosis is wrong.`

---

## Data model (Supabase / Postgres, Clerk auth)
`user_id` is **text** (Clerk `sub`), not uuid. RLS matches `auth.jwt()->>'sub'`, never `auth.uid()`.

```
profiles(id text =auth.jwt()->>'sub', created_at)
diagnosis(
  id uuid PK,
  user_id text default auth.jwt()->>'sub',
  intake_raw jsonb,
  model text, prompt_version text, taxonomy_version text,
  raw_model_output text,          -- grounding/audit trace
  abstained bool,
  evidence text, bottleneck text, prediction text,   -- null if abstained
  created_at
)
outcome(
  id uuid PK,
  diagnosis_id uuid FK→diagnosis.id,   -- ★ load-bearing link
  did_what text, matched_prediction bool, created_at
)
```
RLS on all three: `for all to authenticated using ((auth.jwt()->>'sub') = user_id)` (outcome via its diagnosis's user). Two-user cross-read must return EMPTY.

## Stack
Next.js (App Router, TS) · Clerk auth (native Supabase third-party integration; JWT template is deprecated) · Supabase Postgres + RLS · Anthropic SDK (claude-sonnet-4-6, server-side) · framer-motion · follow frontend-design skill for taste.

## Guardrails (prod, scoped to 2 users — don't over-build)
- Query Supabase with the Clerk session token; service-role key never in the user request path (else RLS bypassed).
- DB queries in Next.js server layer, not Supabase Edge Functions (Clerk JWT friction there).
- Intake treated as data, not instructions (injection). Forced schema neuters most of it.
- Anthropic + service-role keys server-side only.
- Fail closed: timeout → 1 retry → ABSTAIN.
- Per-user rate limit on diagnosis runs.
- Log: prompt_version, taxonomy_version, model, tokens, latency, abstained, validation failures, raw_model_output.

## TDD (write tests first)
Unit (no tokens): scope gate refuses out-of-scope · evidence validator · enum validator · kill-condition present · template assembler.
Contract (mock SDK): pipeline handles valid / bad-enum / no-evidence / abstain shapes.
Eval (sampled, real model): discriminator — two different users → different bottlenecks; vague input → ABSTAIN.
RLS: user B cross-read of A's rows → empty (real Supabase, Clerk tokens).

## Definition of done
- All unit + contract tests green.
- Discriminator eval passes.
- Deployed live; two-user RLS test shows B's empty result.
- Every diagnosis row has cited evidence or is marked abstained.
- diagnosis→outcome link populated for the Move 5 sessions.
