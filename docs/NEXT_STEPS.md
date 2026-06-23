# NEXT_STEPS.md (TDD Edition)
<!-- Every task is broken into atomic red→green→refactor cycles.
     No code is written before a failing test exists for it.
     Each micro-task is independently runnable. -->

---

## How to Read This Document

Each **micro-task** follows this structure:

```
MICRO-TASK [N]
  WHY: what problem this solves
  TEST FIRST: the exact test to write (red)
  CODE: the minimum change to make it green
  DONE WHEN: observable confirmation
  RISK: what can go wrong
```

Think before starting any group: "Is this already broken down small enough
that I can write one test and one code change?" If not, decompose further.

---

## Group 0: Verify Current State (No New Code)

These tasks produce no new code. They establish the true baseline before
anything else is touched.

---

### MICRO-TASK 0.1 — Confirm 11 unit tests still pass

**WHY:** Build integrity baseline before any changes.  
**TEST FIRST:** N/A — tests already exist. Run them.  
```bash
cd track-c && npm run test
```
**DONE WHEN:** Terminal shows `11 passed` with no failures or skips.  
**RISK:** A previous edit to `taxonomy.ts` or `schemas.ts` may have broken
the zod import chain. If tests fail, do not proceed — fix them first.

---

### MICRO-TASK 0.2 — Confirm TypeScript compiles clean

**WHY:** The zod enum fix was applied but the clean-build result was not
confirmed in the previous session.  
**TEST FIRST:** N/A — run the compiler.  
```bash
cd track-c && npx tsc --noEmit
```
**DONE WHEN:** Zero errors printed. Exit code 0.  
**RISK:** If errors exist, note the exact file + line. Fix one error at a
time — do not batch-edit. Re-run after each fix.

---

### MICRO-TASK 0.3 — Confirm `.data/diagnoses.json` is gitignored

**WHY:** Diagnoses contain user intake text. Must not land in the repo.  
**TEST FIRST:** N/A — check `.gitignore`.  
```bash
cd track-c && cat .gitignore | grep -i data
```
**DONE WHEN:** `.data/` or `*.json` (covering it) is listed in `.gitignore`.  
**RISK:** If not present, add `.data/` to `.gitignore` before the first real
API call creates the file.

---

## Group 1: First Live End-to-End Test

Prerequisite: Group 0 fully green.

---

### MICRO-TASK 1.1 — Create `.env.local` with API key

**WHY:** The Anthropic client throws immediately without the key.  
**TEST FIRST:** N/A — environment setup, not testable in vitest.  
```bash
cd track-c
cp .env.example .env.local
# Open .env.local and set: ANTHROPIC_API_KEY=sk-ant-YOUR_KEY
```
**DONE WHEN:** `cat .env.local` shows a non-placeholder key value.  
**RISK:** Key pasted with trailing whitespace or newline. Verify it starts
exactly with `sk-ant-`.

---

### MICRO-TASK 1.2 — Start dev server and reach the form

**WHY:** Confirm the Next.js app boots without runtime errors.  
**TEST FIRST:** N/A — visual check.  
```bash
cd track-c && npm run dev
# Open http://localhost:3000
```
**DONE WHEN:** The page loads. The aurora background renders. The intake
form is visible with all 6 fields.  
**RISK:** Port 3000 already in use → `npm run dev -- -p 3001`.

---

### MICRO-TASK 1.3 — Submit a scope-refused intake and verify refusal card

**WHY:** Confirm the deterministic scope gate works in the live server
before testing the probabilistic path.  
**TEST FIRST:** N/A — manual UI check.  
Submit with: `stage = "Just an idea"`, `multiStage = "No"`, fill other
fields with any text.  
**DONE WHEN:** "OUT OF SCOPE — NO DIAGNOSIS" card appears. No Anthropic
call is made (confirm: no network request to `api.anthropic.com` in
DevTools Network tab, or check server logs).  
**RISK:** If an error card appears instead of the refused card, there is
a zod parse error — check the browser console for the 400 response body.

---

### MICRO-TASK 1.4 — Submit a valid in-scope intake and verify diagnosis card

**WHY:** The full pipeline end-to-end with a real model call.  
**TEST FIRST:** N/A — manual UI check.  

Use this exact intake:
```
Product:         An AI tutor that turns a syllabus into graded practice sets
Stage:           Mid-build — something partly works
Multi-stage:     Yes — multiple distinct stages
Stages:          1. data setup
                 2. agent orchestration
                 3. fine-tuned model
Loud claim:      I need to train a custom model before any of this is real
Actual behavior: Read papers on fine-tuning, rewrote the plan twice, didn't write any code
```
**DONE WHEN:** Either (a) diagnosis card appears with bottleneck chip,
serif prediction sentence, evidence quote, X panel, Y panel, meta strip —
OR (b) abstained card appears. Either is a valid outcome.  
**RISK (a):** Evidence quote is empty → validator triggered ABSTAIN (expected).  
**RISK (b):** Error card appears → inspect server terminal for the exception.  
**RISK (c):** 500 with "ANTHROPIC_API_KEY is not set" → Task 1.1 incomplete.

---

### MICRO-TASK 1.5 — Inspect `.data/diagnoses.json` for the stored row

**WHY:** Confirm the store step (Step 6) ran and persisted the diagnosis.  
**TEST FIRST:** N/A — file inspection.  
```bash
cat track-c/.data/diagnoses.json | python -m json.tool | head -60
```
**DONE WHEN:** File exists, contains at least one row, `created_at` is
recent, `intake_raw.product` matches what was submitted, `refused` or
`abstained` or `bottleneck` is populated appropriately.  
**RISK:** File missing → storage threw an error that was silently caught.
Check: does the `track-c/.data/` directory exist? Does the process have
write permission to it?

---

## Group 2: Contract Tests (Mock Anthropic SDK)

Prerequisite: Group 1 complete (confirms live system works).  
These tests use **no real API calls**. Each `it()` is an independent
atomic failing-test-first cycle.

**Before writing any test in this group:**
```bash
cd track-c && npm run test:watch
# Keep this running. Each new test should appear red before the fix.
```

---

### MICRO-TASK 2.1 — Set up vitest mock for `anthropic.ts`

**WHY:** All 8 contract tests need the mock. Create it once as a shared
fixture before writing any individual test.

**TEST FIRST:** Write a test file with the mock import and a single
placeholder test:

```typescript
// lib/pipeline.contract.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { runPipeline } from "./pipeline";

vi.mock("./anthropic", () => ({
  extractSignal: vi.fn(),
  mapBottleneck: vi.fn(),
  MODEL: "mock-model",
  PROMPT_VERSION: "test-v1",
}));

import { extractSignal, mapBottleneck } from "./anthropic";

describe("pipeline contract (mocked SDK)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("placeholder — remove once real tests are added", () => {
    expect(true).toBe(true);
  });
});
```

**DONE WHEN:** `npm run test` shows the new file with 1 passing placeholder.  
**RISK:** vitest path alias `@/lib/...` vs `./` — check `vitest.config.ts`.
If pipeline imports with `@/`, the mock path must also use `@/`.

---

### MICRO-TASK 2.2 — Contract test: out-of-scope input → refused, no model calls

**WHY:** Verify scope gate fires before any mock is reached.

**RED:** Add to `pipeline.contract.test.ts`:
```typescript
it("refuses non-mid-build without calling any model", async () => {
  const result = await runPipeline({
    product: "x", stage: "idea", multiStage: "yes",
    stages: "x", loudClaim: "x", actualBehavior: "x",
  });
  expect(result.status).toBe("refused");
  expect(extractSignal).not.toHaveBeenCalled();
  expect(mapBottleneck).not.toHaveBeenCalled();
});
```
Run → expect RED (function not yet called with those args, or test doesn't
exist yet).  
**GREEN:** No code change needed — scope gate already does this. Test
should go green immediately.  
**DONE WHEN:** Test passes without any code changes.  
**RISK:** If test is red after adding it, `scopeGate` has a bug — re-read
`scopeGate.ts`.

---

### MICRO-TASK 2.3 — Contract test: `extractSignal` returns null → abstained

**WHY:** Verify the "fail closed" path when Call 1 produces no output.

**RED:**
```typescript
it("abstains when extractSignal returns null", async () => {
  vi.mocked(extractSignal).mockResolvedValue(null);
  const result = await runPipeline({
    product: "x", stage: "mid_build", multiStage: "yes",
    stages: "x", loudClaim: "x", actualBehavior: "x",
  });
  expect(result.status).toBe("abstained");
  expect(mapBottleneck).not.toHaveBeenCalled();
});
```
Run → RED first, then:  
**GREEN:** No code change needed — `pipeline.ts` already does this.  
**DONE WHEN:** Test green. `mapBottleneck` was never called (verified by mock).

---

### MICRO-TASK 2.4 — Contract test: `mapBottleneck` returns null → abstained

**WHY:** Verify the "fail closed" path when Call 2 produces no output.

**RED:**
```typescript
it("abstains when mapBottleneck returns null", async () => {
  vi.mocked(extractSignal).mockResolvedValue({
    loud_claim: "x", actual_behavior: "y", contradiction: "z",
  });
  vi.mocked(mapBottleneck).mockResolvedValue(null);
  const result = await runPipeline({
    product: "x", stage: "mid_build", multiStage: "yes",
    stages: "x", loudClaim: "x", actualBehavior: "x",
  });
  expect(result.status).toBe("abstained");
});
```
Run → RED. No code change → GREEN.

---

### MICRO-TASK 2.5 — Contract test: model returns `bottleneck: "ABSTAIN"` → abstained

**WHY:** Verify the model's own ABSTAIN signal is respected.

**RED:**
```typescript
it("abstains when model returns ABSTAIN", async () => {
  vi.mocked(extractSignal).mockResolvedValue({
    loud_claim: "x", actual_behavior: "y", contradiction: "z",
  });
  vi.mocked(mapBottleneck).mockResolvedValue({
    bottleneck: "ABSTAIN",
    evidence_quote: "",
    x_prediction: "",
    y_kill: "",
  });
  const result = await runPipeline({
    product: "x", stage: "mid_build", multiStage: "yes",
    stages: "x", loudClaim: "x", actualBehavior: "x",
  });
  expect(result.status).toBe("abstained");
});
```
Run → RED. No code change → GREEN.

---

### MICRO-TASK 2.6 — Contract test: model returns bottleneck outside taxonomy → abstained

**WHY:** Verify the `isValidBottleneck` guard triggers correctly.

**RED:**
```typescript
it("abstains when bottleneck is outside the closed taxonomy", async () => {
  vi.mocked(extractSignal).mockResolvedValue({
    loud_claim: "x", actual_behavior: "y", contradiction: "z",
  });
  vi.mocked(mapBottleneck).mockResolvedValue({
    bottleneck: "perfectionism" as any,
    evidence_quote: "x",
    x_prediction: "x",
    y_kill: "do something",
  });
  const result = await runPipeline({
    product: "x", stage: "mid_build", multiStage: "yes",
    stages: "x", loudClaim: "x", actualBehavior: "x",
  });
  expect(result.status).toBe("abstained");
});
```

---

### MICRO-TASK 2.7 — Contract test: evidence quote not verbatim → abstained

**WHY:** Verify the `isEvidenceGrounded` validator triggers.

**RED:**
```typescript
it("abstains when evidence_quote is not a verbatim substring of intake", async () => {
  vi.mocked(extractSignal).mockResolvedValue({
    loud_claim: "x", actual_behavior: "y", contradiction: "z",
  });
  vi.mocked(mapBottleneck).mockResolvedValue({
    bottleneck: "flat_terrain",
    evidence_quote: "this phrase does not appear anywhere in intake",
    x_prediction: "go learn the hardest stage",
    y_kill: "ship one stage this week",
  });
  const result = await runPipeline({
    product: "my product", stage: "mid_build", multiStage: "yes",
    stages: "stage 1, stage 2", loudClaim: "it is hard", actualBehavior: "I read papers",
  });
  expect(result.status).toBe("abstained");
});
```

---

### MICRO-TASK 2.8 — Contract test: empty y_kill → abstained

**WHY:** Verify `hasKillCondition` guard fires on empty string.

**RED:**
```typescript
it("abstains when y_kill is empty", async () => {
  vi.mocked(extractSignal).mockResolvedValue({
    loud_claim: "it is hard", actual_behavior: "I read papers", contradiction: "z",
  });
  vi.mocked(mapBottleneck).mockResolvedValue({
    bottleneck: "flat_terrain",
    evidence_quote: "it is hard",  // verbatim from loudClaim
    x_prediction: "learn more",
    y_kill: "   ",  // whitespace only — should fail
  });
  const result = await runPipeline({
    product: "my product", stage: "mid_build", multiStage: "yes",
    stages: "stage 1", loudClaim: "it is hard", actualBehavior: "I read papers",
  });
  expect(result.status).toBe("abstained");
});
```

---

### MICRO-TASK 2.9 — Contract test: valid end-to-end → diagnosed with correct shape

**WHY:** Verify the happy path returns the right fields with the assembled
prediction sentence.

**RED:**
```typescript
it("returns diagnosed with assembled prediction on valid input", async () => {
  vi.mocked(extractSignal).mockResolvedValue({
    loud_claim: "I need to train a custom model",
    actual_behavior: "read papers, rewrote plan",
    contradiction: "claims model is the block but has done no code",
  });
  vi.mocked(mapBottleneck).mockResolvedValue({
    bottleneck: "flat_terrain",
    evidence_quote: "I need to train a custom model",  // verbatim from loudClaim
    x_prediction: "go learn the hardest stage first",
    y_kill: "ship stage 1 to one real user this week",
  });
  const intake = {
    product: "AI tutor", stage: "mid_build" as const, multiStage: "yes" as const,
    stages: "stage 1, stage 2",
    loudClaim: "I need to train a custom model",
    actualBehavior: "read papers, rewrote plan",
  };
  const result = await runPipeline(intake);

  expect(result.status).toBe("diagnosed");
  expect(result.bottleneck).toBe("flat_terrain");
  expect(result.bottleneckLabel).toBe("Flat terrain");
  expect(result.prediction).toContain("Your wall is");
  expect(result.prediction).toContain("flat terrain");
  expect(result.prediction).toContain("If instead you do");
  expect(result.prediction).toContain("this diagnosis is wrong");
  expect(result.evidence).toBe("I need to train a custom model");
  expect(result.yKill).toBe("ship stage 1 to one real user this week");
  expect(result.meta.model).toBe("mock-model");
});
```

**DONE WHEN:** All 9 contract tests green. Delete the placeholder from 2.1.  
**Total test count after Group 2:** 11 (unit) + 8 (contract) = 19.

---

## Group 3: API Route Tests (Supertest or fetch mock)

Prerequisite: Group 2 complete.  
These test `route.ts` in isolation — not the pipeline logic (already covered).

---

### MICRO-TASK 3.1 — Route test: malformed JSON body → 400

**WHY:** Confirm the JSON parse guard in `route.ts` fires.

**TEST FIRST:**
```typescript
// app/api/diagnose/route.test.ts
import { POST } from "./route";

it("returns 400 on invalid JSON", async () => {
  const req = new Request("http://localhost/api/diagnose", {
    method: "POST",
    body: "not json{{{",
    headers: { "Content-Type": "application/json" },
  });
  const res = await POST(req);
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error).toBe("Invalid JSON body.");
});
```

**RISK:** Next.js 16 route handler test imports may require a polyfill or
special vitest environment. Check `vitest.config.ts` for `environment: "node"`.

---

### MICRO-TASK 3.2 — Route test: missing required field → 400 with zod issues

**WHY:** Confirm zod parse guard returns 400 with `issues` field.

**TEST FIRST:**
```typescript
it("returns 400 with zod issues on missing product", async () => {
  const req = new Request("http://localhost/api/diagnose", {
    method: "POST",
    body: JSON.stringify({ stage: "mid_build", multiStage: "yes" }),
    headers: { "Content-Type": "application/json" },
  });
  const res = await POST(req);
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.issues).toBeDefined();
});
```

---

## Group 4: Phase 2 — Authentication (Clerk)

> ⚠️ Do not start this group until Group 1–3 are fully green and the
> user has provided Clerk credentials.

Each micro-task in this group follows the same red→green pattern but
verification is through the live dev server, not vitest (Clerk requires
real tokens).

---

### MICRO-TASK 4.1 — Install Clerk and confirm app still boots

```bash
npm install @clerk/nextjs
# Add to .env.local:
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
# CLERK_SECRET_KEY=sk_test_...
npm run dev
```
**DONE WHEN:** App still loads at localhost:3000. No import errors.  
**No new code yet** — just confirm the install doesn't break anything.

---

### MICRO-TASK 4.2 — Wrap layout with ClerkProvider

**TEST FIRST (manual):** Before wrapping, note current behaviour (no auth).  
**CODE:** Edit `app/layout.tsx`:
```typescript
import { ClerkProvider } from "@clerk/nextjs";
// wrap children with <ClerkProvider>
```
**DONE WHEN:** App still loads. No TypeScript errors. Clerk session cookie
appears in browser DevTools after a page load.

---

### MICRO-TASK 4.3 — Extract `userId` from Clerk in route handler

**TEST FIRST:** Write an integration test (manual, no vitest) — hit the
endpoint while signed out and verify 401, then signed in and verify 200.  
**CODE:** In `route.ts`, add:
```typescript
import { auth } from "@clerk/nextjs/server";
const { userId } = await auth();
if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
```
Pass `userId` to `storeDiagnosis()`.  
**DONE WHEN:** Unauthenticated requests return 401. Authenticated requests
proceed. `.data/diagnoses.json` stores real user_id instead of `"local"`.

---

## Group 5: Phase 2 — Supabase Storage

> Do not start until Group 4 is complete.

---

### MICRO-TASK 5.1 — Create Supabase project and run schema migration

**DONE WHEN:** `diagnosis` table exists in Supabase with all columns
matching the PRD schema. RLS policies applied.  
**Critical:** `user_id` is `text`, NOT `uuid`. RLS uses
`auth.jwt()->>'sub'`, NOT `auth.uid()`.

---

### MICRO-TASK 5.2 — Rewrite `store.ts` to use Supabase client

**TEST FIRST:** Write a test that mocks the Supabase client and verifies
`storeDiagnosis()` calls `.from("diagnosis").insert()` with the right
shape.  
**CODE:** Replace `fs.writeFile` with `supabase.from("diagnosis").insert(row)`.  
**DONE WHEN:** Mock test green. Live: row appears in Supabase table after
a real diagnosis run.

---

### MICRO-TASK 5.3 — RLS smoke test: user B cannot read user A's rows

**TEST FIRST:** This cannot be a vitest test — it requires two real Clerk
tokens and a real Supabase instance.  
**Manual procedure:**
1. Sign in as User A, run a diagnosis → row created in `diagnosis` table
2. Sign in as User B (different Clerk account)
3. Directly query Supabase with User B's Clerk token
4. Expect: zero rows returned

**DONE WHEN:** User B query returns empty result set.  
**RISK:** If User B can see User A's rows, the RLS policy is wrong. Check
that the policy uses `auth.jwt()->>'sub'` not `auth.uid()` and that Clerk's
JWT contains the `sub` claim in the format Supabase expects.

---

## Scoring Bar (PRD Definition of Done)

Track these explicitly. Do not declare Phase 2 done until all are green.

| # | Criterion | Status |
|---|---|---|
| 1 | All unit + contract tests green | ⏳ Unit ✅, contract ❌ not written |
| 2 | Discriminator eval: two different users → two different bottlenecks | ❌ |
| 3 | Deployed live | ❌ |
| 4 | Two-user RLS test: User B's read → empty | ❌ |
| 5 | Every diagnosis row has cited evidence OR is marked abstained | ⏳ enforced in code, not yet verified on real data |
| 6 | `diagnosis→outcome` link populated for Move 5 sessions | ❌ outcome table not yet built |
