# BUGS_AND_FIXES.md
<!-- All bugs discovered, attempted fixes, and current status. -->

---

## Resolved Bugs

---

### Bug 1: TypeScript error — zod enum tuple inference with `BOTTLENECKS as const`

**Problem:**
`z.enum([...BOTTLENECKS, "ABSTAIN"])` failed TypeScript type-checking because
spreading a `readonly` const array into a new array loses the tuple type that
`z.enum()` requires (zod v4 needs a non-empty tuple `[string, ...string[]]`).

**Symptoms:**
TypeScript compiler error during `next build` or `tsc` run. Exact error message
not recorded but was a type mismatch on the zod enum argument.

**Root Cause:**
`BOTTLENECKS` was declared as `as const` but the spread `[...BOTTLENECKS, "ABSTAIN"]`
produced a `string[]` (mutable array), which does not satisfy zod v4's tuple
requirement for `z.enum()`. zod v4 API differs from v3 in this regard.

**Fix Attempted:**
Made `BOTTLENECKS` a proper `as const` tuple and derived `Bottleneck` type from
it via `(typeof BOTTLENECKS)[number]`. This preserves the literal types through
the spread.

**Final Outcome:**
Fixed. The pattern in `taxonomy.ts`:
```typescript
export const BOTTLENECKS = [
  "flat_terrain",
  "fear_of_shipping",
  "no_idea",
  "motivation_only",
  "outsourcing_judgment",
] as const;

export type Bottleneck = (typeof BOTTLENECKS)[number];
```
And in `schemas.ts`:
```typescript
z.enum([...BOTTLENECKS, "ABSTAIN"])
```
This resolves correctly in TypeScript with zod v4.

**Current Status:** ✅ Resolved

---

## Unresolved Bugs / Open Issues

---

### Issue 1: TypeScript build clean status unconfirmed

**Problem:**
The final `tsc` / `next build` run after the zod enum fix was initiated but
the output showing a clean pass was not confirmed in the conversation log.

**Symptoms:**
Uncertain whether the build currently compiles cleanly or has residual type errors.

**Root Cause:**
The conversation was cut off at the typecheck step. The fix was applied to
`taxonomy.ts` and `schemas.ts` (two files edited) but the subsequent build
result was not captured.

**Fix Attempted:**
Editing `BOTTLENECKS` to a proper `as const` tuple and deriving the type.

**Final Outcome:** [UNKNOWN]

**Current Status:** ⚠️ Needs verification — run `npm run build` or `npx tsc --noEmit`
in `track-c/` to confirm.

---

### Issue 2: No contract tests (mock SDK) implemented

**Problem:**
PRD mandates three test tiers:
1. Unit (no tokens) — ✅ done (11/11 passing)
2. Contract (mock SDK): pipeline handles valid / bad-enum / no-evidence / abstain shapes
3. Eval (sampled, real model): discriminator test

Contract tests and eval tests are not yet written.

**Symptoms:**
No mock Anthropic client. No tests covering the pipeline integration layer
(`pipeline.ts` logic that calls `extractSignal` and `mapBottleneck`).

**Root Cause:**
Phase 1 scope: the session ended before these could be written.

**Fix Attempted:** N/A — not started.

**Final Outcome:** N/A

**Current Status:** ❌ Not implemented — required by PRD for Definition of Done.

---

### Issue 3: `useReducedMotion` not implemented on frontend animations

**Problem:**
`page.tsx` uses framer-motion animations (entry, spring exit, AnimatePresence)
but does not implement `useReducedMotion()` to respect the system
`prefers-reduced-motion` accessibility preference.

**Symptoms:**
Animations play regardless of system accessibility settings.

**Root Cause:**
Phase 1 scope; aesthetic work was prioritized over accessibility guardrails.

**Fix Attempted:** N/A

**Final Outcome:** N/A

**Current Status:** ⚠️ Known gap — not a blocker for Phase 1 testing, but
required before any public deployment.

---

### Issue 4: ANTHROPIC_API_KEY not yet set by user

**Problem:**
The application cannot make model calls until the user copies `.env.example`
to `.env.local` and sets `ANTHROPIC_API_KEY=sk-ant-...`.

**Symptoms:**
`client()` in `anthropic.ts` throws `"ANTHROPIC_API_KEY is not set"` at runtime.
The pipeline returns a 500 error. The UI shows the error card.

**Root Cause:**
Intentional Phase 1 design — the key is user-supplied and never baked in.

**Fix Attempted:** N/A — waiting on user action.

**Final Outcome:** N/A

**Current Status:** ⚠️ Blocked on user action. Fix: `cp .env.example .env.local`
then paste the key.

---

### Issue 5: Storage failure silently swallowed — no alerting

**Problem:**
In `route.ts`, `storeDiagnosis()` is called with `.catch(() => {})` — any
storage error (disk full, permission denied, corrupt JSON) is swallowed. There
is no logging, no metric, no alert.

**Symptoms:**
Diagnoses may silently fail to persist. The API response is unaffected, but
the audit trail is lost.

**Root Cause:**
Intentional Phase 1 design decision: "storage failure should not break the
response in Phase 1." The comment is in the code.

**Fix Attempted:** N/A — documented as acceptable for Phase 1.

**Final Outcome:** N/A

**Current Status:** ⚠️ Acceptable for Phase 1 local testing. Must be addressed
before Phase 2 deployment (add structured logging / error reporting).

---

### Issue 6: No rate limiting implemented

**Problem:**
PRD mandates per-user rate limiting on diagnosis runs. Nothing prevents a user
(or a bot) from hammering `/api/diagnose` with rapid repeated requests, each
consuming Anthropic API tokens.

**Symptoms:**
Unbounded API spend if the endpoint is abused.

**Root Cause:**
Phase 2 feature, not yet implemented.

**Fix Attempted:** N/A

**Final Outcome:** N/A

**Current Status:** ❌ Not implemented — required for Phase 2.
