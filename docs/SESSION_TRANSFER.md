# SESSION_TRANSFER.md
<!-- Self-contained context for a completely fresh AI session.
     Do not assume access to any previous conversation. -->

---

## PROJECT SUMMARY

**Name:** Track C — Diagnostic (codename: Move 2)  
**Type:** Next.js 16 web app + 6-stage AI pipeline  
**Location:** `hackathon100x/track-c/` on the user's machine  
**Purpose:** Given a mid-build AI builder's self-report (what they say is
hard vs. what they've actually done), return **one falsifiable bottleneck
with a kill-condition** — or refuse if out of scope, or abstain if evidence
is weak. Architecture is deliberately built to prevent horoscope-mode output.

The scientific prior is in `MOVE2_HYPOTHESIS.md` (repo root). All
architectural decisions are downstream of it.

---

## CURRENT STATUS

**Phase 1 is implemented. It has not yet been live-tested** because the
user has not placed an `ANTHROPIC_API_KEY` into `.env.local`.

What is done:
- Full 6-step deterministic pipeline with two Anthropic model calls
- All 11 unit tests passing (deterministic core only)
- Beautiful frontend: dark aurora theme, glassmorphism, framer-motion
- Local JSON file store at `track-c/.data/diagnoses.json`
- API route `POST /api/diagnose` fully wired

What is not done:
- Live API test with real key (blocked on user)
- Contract tests (mock Anthropic SDK) — 8 tests still to write
- Clerk authentication (Phase 2)
- Supabase storage (Phase 2)
- Rate limiting, outcome tracking (Phase 2)

**TypeScript build status:** The zod enum tuple fix was applied but a
final clean build confirmation was not captured. Run `npx tsc --noEmit`
in `track-c/` before touching any code.

---

## KEY DECISIONS

| Decision | What was decided | Why |
|---|---|---|
| Model | `claude-sonnet-4-6`, temp 0, thinking disabled | PRD mandates it; most deterministic on Sonnet |
| Output method | Tool-use forced schema, not "reply JSON" | Reliable structured output |
| Validation | zod on every model output at the boundary | If it doesn't parse, it abstains |
| Evidence check | Verbatim substring of intake — verified in code | Core anti-horoscope guard |
| Prediction | Template-assembled (`assemblePrediction()`), model never writes it | Deterministic framing |
| ABSTAIN | First-class outcome — stored, not an error | Wrong diagnosis > no diagnosis |
| Scope | Only mid-build + multi-stage AI products | Narrowness = discrimination power |
| Auth | Deferred to Phase 2 (Clerk) | Unblocks testing with just API key |
| Storage | Local JSON Phase 1, Supabase Phase 2 | Same field names, swap not rewrite |
| user_id | `text` (Clerk sub), NOT uuid | Supabase RLS with Clerk requires this |

---

## KNOWN ISSUES

1. **API key not set** — user must `cp .env.example .env.local` and paste key.
2. **TypeScript build unconfirmed** — run `npx tsc --noEmit` first.
3. **Contract tests missing** — 8 tests in `lib/pipeline.contract.test.ts` not yet written.
4. **`refused` field in store** — `DiagnosisRow` has `refused: boolean` but the PRD's Supabase schema doesn't list it. Reconcile before writing migration.
5. **Storage failure silent** — `storeDiagnosis().catch(() => {})` in `route.ts` swallows errors. Acceptable for Phase 1, must be fixed for Phase 2.
6. **`useReducedMotion` missing** — framer-motion animations don't respect `prefers-reduced-motion`.

---

## USER EXPECTATIONS

- **TDD discipline.** Every new code change must be preceded by a failing test.
  Write the test → confirm it's red → write minimum code → confirm green.
  Do not write implementation before tests.
- **Micro-task decomposition.** If a task feels large, it must be broken into
  smaller atomic units before starting. Each unit = one test + one minimal code change.
- **Beautiful frontend.** The user explicitly requested designer-quality UI.
  Do not regress the dark theme, aurora background, glassmorphism, or animations.
- **Phase 2 is deferred.** Do not implement Clerk or Supabase without explicit
  instruction. Do not over-build.
- **The taxonomy is a scoring bar.** Do not add labels without deliberate product
  decision. A label true of everyone is a horoscope.

---

## CRITICAL CONTEXT

### The 6-step pipeline (never reorder)
```
1. INTAKE         — deterministic fixed questions
2. SCOPE GATE     — deterministic rule; out-of-scope → REFUSE (no model call)
3. SIGNAL EXTRACT — Anthropic Call 1 (claim vs behavior)
4. BOTTLENECK MAP — Anthropic Call 2 (closed taxonomy or ABSTAIN)
5. PREDICTION     — deterministic template assembly
6. STORE + LOG    — deterministic, per-user isolated
```

### The closed bottleneck taxonomy (move2-v1)
```
flat_terrain         — every stage feels equally urgent, no lever visible
fear_of_shipping     — has something workable, keeps deferring real users
no_idea              — nothing concrete being built yet
motivation_only      — energy unattached to a specific next action
outsourcing_judgment — trying to delegate the actual product decisions
```
Model picks one or returns `ABSTAIN`. Code verifies. Model cannot invent labels.

### The prediction template (never change without a decision)
```
"Your wall is [wall]. You will next try [X]. If instead you do [Y], this diagnosis is wrong."
```
`wall` = `BOTTLENECK_WALL[bottleneck]` (looked up from taxonomy, deterministic).  
`X` = `x_prediction` (model-supplied wrong move).  
`Y` = `y_kill` (model-supplied kill-condition, mandatory).

### Anti-horoscope guards (enforced in code, not in prompting)
```typescript
isValidBottleneck(map.bottleneck)       // must be in closed enum
isEvidenceGrounded(map.evidence_quote)  // must be verbatim substring of intake
hasKillCondition(map.y_kill)            // must be non-empty
```
Any guard failing → ABSTAIN. All three are in `lib/validators.ts`.

### Next.js 16 warning
This is Next.js 16.2.9 — it has breaking changes from training data. Route
handlers use standard Web `Request`/`Response`. The `AGENTS.md` file in
`track-c/` warns: "Read the relevant guide in `node_modules/next/dist/docs/`
before writing any code."

### Tailwind v4 convention
Uses `@import "tailwindcss"` in CSS. The `@theme inline {}` block sets custom
tokens. There is NO `tailwind.config.js`. The postcss plugin is
`@tailwindcss/postcss`, not `tailwindcss`. v3 patterns will break the build.

---

## IMMEDIATE NEXT TASK

**Run the verification baseline before touching any code.**

```bash
cd track-c

# 1. Confirm unit tests still pass
npm run test
# Expected: 11 passed

# 2. Confirm TypeScript is clean
npx tsc --noEmit
# Expected: no errors

# 3. Confirm .data/ is gitignored
cat .gitignore | grep -i data
# Expected: .data/ listed

# 4. Set up API key (user must provide the value)
cp .env.example .env.local
# Edit .env.local: ANTHROPIC_API_KEY=sk-ant-YOUR_KEY

# 5. Start dev server and run first live diagnosis
npm run dev
# Open http://localhost:3000
# Submit: stage=mid_build, multiStage=yes, fill other fields
# Expected: diagnosis or abstain card (not error card)
```

**After the baseline is green, the next code task is writing contract tests.**
See `docs/NEXT_STEPS.md` Group 2 for the exact test code (8 micro-tasks,
each a single `it()` block, TDD order: red → green → next).

---

## FILE MAP (quick reference)

| File | Purpose |
|---|---|
| `MOVE2_HYPOTHESIS.md` | Scientific prior — read this first |
| `PRD.md` | Product requirements — authoritative spec |
| `docs/DECISIONS.md` | Every architectural decision with rationale |
| `docs/BUGS_AND_FIXES.md` | Known issues and their status |
| `docs/NEXT_STEPS.md` | TDD micro-task queue (Groups 0–5) |
| `docs/ARCHITECTURE.md` | Full technical architecture |
| `track-c/lib/taxonomy.ts` | Closed bottleneck enum — do not widen carelessly |
| `track-c/lib/pipeline.ts` | 6-step orchestrator |
| `track-c/lib/anthropic.ts` | Two model calls (extractSignal, mapBottleneck) |
| `track-c/lib/validators.ts` | Three deterministic anti-horoscope guards |
| `track-c/lib/template.ts` | assemblePrediction() — never emit freeform |
| `track-c/lib/store.ts` | Phase 1 JSON store (mirrors Supabase schema) |
| `track-c/app/page.tsx` | Full frontend — form + result display |
| `track-c/app/api/diagnose/route.ts` | POST handler |
| `track-c/lib/deterministic.test.ts` | 11 unit tests (all passing) |
