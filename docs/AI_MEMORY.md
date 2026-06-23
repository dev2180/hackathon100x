# AI_MEMORY.md
<!-- Long-term project knowledge. Survives all session boundaries. -->

---

## Project Vision

Build a deterministic-first, AI-assisted diagnostic tool for mid-build beginners
working on multi-stage domain AI products. The tool identifies the single real
bottleneck blocking progress — or refuses to diagnose — rather than producing
warm, horoscope-like affirmations that feel accurate but predict nothing.

The product is called **Track C — Diagnostic** (internal codename: Move 2).

---

## Core Goals

1. Return one falsifiable bottleneck per run, with a kill-condition, or refuse.
2. Never produce a horoscope: a sentence true of every stuck builder is worthless.
3. Architecture enforces those properties in code, not in prompting.
4. Narrow scope = honest scope. The tool only works for: mid-build, multi-stage AI
   product builders. All other inputs are refused at the gate — no diagnosis.
5. ABSTAIN is a valid, first-class outcome. Not an error. Not a fallback. A correct
   response when evidence can't carry a confident mapping.

---

## Product Philosophy

- **Determinism first.** Every input point and output point is fixed. The model
  only gets two narrow probabilistic windows (Signal Extract + Bottleneck Map).
- **Closed taxonomy.** The set of possible bottlenecks is an enum. The model picks
  from it or abstains. It cannot invent a new label.
- **Verbatim evidence.** The model must copy a character-for-character substring
  from the intake as the evidence quote. The code verifies this, not the model.
- **Template-assembled output.** The user-facing prediction sentence is assembled
  by code: `"Your wall is X. You will next try Y. If instead you do Z, this
  diagnosis is wrong."` The model never emits this sentence freeform.
- **Fail closed.** Any exception, parse failure, or zod mismatch during the model
  calls falls through to ABSTAIN. The system never surfaces a half-validated
  diagnosis.
- **Per-user isolation.** Every diagnosis is stored with a user_id. Phase 1 uses
  "local"; Phase 2 replaces that with Clerk sub claims.

---

## User Preferences (Discovered During Development)

- Wants the frontend to be **exceptionally beautiful** — "like a designer."
- Wants the build broken into **smaller chunks** with clear milestones.
- API key (Anthropic) will be pasted into `.env.local` manually — not baked in.
- Phase 1 (testable core, no auth, local JSON store) is the immediate target.
- Phase 2 (Clerk auth, Supabase + RLS, rate limiting) is deferred.
- The hypothesis doc (`MOVE2_HYPOTHESIS.md`) was committed to `main` before any
  code, deliberately timestamped as the scientific prior.

---

## Architectural Principles

1. **Deterministic wrapper around a probabilistic core.** Steps 1, 2, 5, 6 are
   pure functions. Steps 3 and 4 are the only model-touching steps.
2. **Scope gate runs before any LLM call.** Out-of-scope intakes never reach
   the Anthropic API.
3. **Two single-shot transforms, not a conversation.** Signal Extract is call 1
   (separates claim vs behavior). Bottleneck Map is call 2 (picks taxonomy or
   abstains). Neither call has memory of the other beyond the structured output
   piped between them.
4. **Tool-use forced output.** Both model calls use `tool_choice: { type: "tool",
   name: "..." }` so the model is forced to populate the schema. Raw text
   responses are discarded.
5. **Zod validation at every boundary.** Tool output is parsed with zod before
   any downstream use. If it doesn't parse, the call returns null → ABSTAIN.
6. **Three post-call deterministic guards (validators.ts):**
   - `isValidBottleneck`: enum membership check
   - `isEvidenceGrounded`: verbatim substring check
   - `hasKillCondition`: non-empty string check
7. **Storage mirrors the future Supabase schema.** The Phase 1 local JSON file
   uses the same field names as the intended Phase 2 `diagnosis` table so
   migration is a swap, not a rewrite.
8. **Node runtime explicitly declared on the API route** (`export const runtime =
   "nodejs"`) because fs + Anthropic SDK require Node, not Edge.

---

## Technical Constraints

- Node 22 (confirmed during scaffold)
- Next.js 16.2.9 — explicitly flagged as having breaking changes from training
  data; AGENTS.md instructs AI to read the bundled docs before writing route code
- React 19.2.4
- TypeScript strict mode
- Tailwind v4 (uses `@import "tailwindcss"` + `@theme inline {}`, NOT
  `tailwind.config.js` or the old `tailwindcss` postcss plugin)
- `framer-motion` v12 — `AnimatePresence`, `motion`, spring physics
- `@anthropic-ai/sdk` ^0.105.0
- `zod` ^4.4.3 (note: zod v4 API differs slightly from v3)
- `vitest` ^4.1.9 for unit tests
- ANTHROPIC_API_KEY loaded from `.env.local` — server-side only, never exposed
  to the client bundle
- Temperature 0 + `thinking: { type: "disabled" }` on both model calls
  (deterministic settings on Sonnet 4.6)

---

## Design Decisions

- **Model:** `claude-sonnet-4-6` as default, env-overridable via
  `ANTHROPIC_MODEL`. Chosen deliberately for the 2-user test scope in the PRD.
- **Max tokens:** 1024 per call (sufficient for structured tool output).
- **Timeout:** 20 000 ms per call; maxRetries: 1 then fail closed.
- **BOTTLENECKS tuple as const:** enables type derivation
  (`(typeof BOTTLENECKS)[number]`) without a separate type declaration.
- **Zod v4 tuple trick:** `z.enum([...BOTTLENECKS, "ABSTAIN"])` requires the
  spread to produce the right tuple type — this caused an initial type error that
  was fixed by making `BOTTLENECKS` a proper `as const` array.
- **No network fonts in layout.tsx** — system + serif stack for reliability
  offline and during testing.
- **Aurora mesh background** — CSS-only, fixed, z-index -1, no JS.
- **Glassmorphism form card** — `.glass` utility class, backdrop-filter blur.
- **Dark theme only** — locked `--bg: #07070c` throughout, no light mode.
- **Color palette:** accent `#8b8bff` (indigo), accent-2 `#4fd6e6` (cyan),
  warm `#f2b25c` (amber for wrong-move display).

---

## Lessons Learned

- Zod v4 enum from a `readonly` const array requires care with tuple inference.
  The fix: declare `BOTTLENECKS as const`, derive `Bottleneck` from it, then
  spread into `z.enum()`.
- Next.js 16.x route handlers use standard Web `Request` / `Response` (not
  `NextRequest` / `NextResponse`). The AGENTS.md warning about breaking changes
  is real.
- `thinking: { type: "disabled" }` is a valid param on `claude-sonnet-4-6` for
  suppressing extended thinking; it must be set explicitly to guarantee
  deterministic temperature-0 behavior.
- Storage failure in Phase 1 is silently swallowed (`.catch(() => {})`) so it
  never breaks the API response. This is intentional and documented.
- 11/11 deterministic unit tests passed before any model call was written — TDD
  approach on the deterministic core is the right order.

---

## Patterns Repeatedly Mentioned

- "Horoscope vs diagnosis" — the central quality bar for every output
- "Closed taxonomy" — the model cannot invent labels
- "Fail closed" — any ambiguity resolves to ABSTAIN, never to a guess
- "Verbatim evidence" — the code checks this, not the model
- "Kill-condition" — every valid diagnosis must include a falsifying action
- "Two narrow probabilistic windows" — the model's authority is explicitly bounded

---

## Things Future AIs Must Never Forget

1. **Do not widen the taxonomy without a deliberate product decision.** Adding
   labels dilutes the discrimination power. A label true of everyone is a horoscope.
2. **Do not let the model emit the prediction sentence freeform.** It must always
   go through `assemblePrediction()` in `template.ts`.
3. **Do not remove the verbatim evidence check.** It is the primary anti-
   hallucination guard.
4. **Do not replace ABSTAIN with a guess.** ABSTAIN is correct. A forced diagnosis
   with weak evidence is worse than no diagnosis.
5. **Scope gate must run before any API call.** Never reorder steps 1-6.
6. **The store schema mirrors the future Supabase `diagnosis` table.** If you
   change `DiagnosisRow`, update the migration plan too.
7. **The hypothesis doc is the scientific prior.** All architectural decisions
   are downstream of `MOVE2_HYPOTHESIS.md`.
8. **Phase 2 features (Clerk, Supabase, rate limiting) are not started.** Do not
   implement them without explicit user instruction.
