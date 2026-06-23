# PROJECT_STATE.md
<!-- Complete snapshot of the current project as of 2026-06-23. -->

---

## Project Description

**Name:** Track C — Diagnostic (codename: Move 2)  
**Repository:** `hackathon100x` (GitHub, `main` branch)  
**Location:** `hackathon100x/track-c/` (Next.js app)  
**Purpose:** A 6-stage pipeline that reads a mid-build AI builder's intake form
(claim vs actual behavior) and returns one falsifiable bottleneck — with a
kill-condition — or refuses / abstains.

---

## Current Architecture

```
INTAKE (deterministic fixed questions)
    │
    ▼
SCOPE GATE (deterministic rule check)
    │ fail → REFUSE (no diagnosis)
    │ pass ↓
SIGNAL EXTRACT (Anthropic call 1 — probabilistic, narrow)
    │ error/parse fail → ABSTAIN
    ▼
BOTTLENECK MAP (Anthropic call 2 — probabilistic, judgment point)
    │ ABSTAIN / validation fail → ABSTAIN
    ▼
PREDICTION ASSEMBLY (deterministic template)
    │
    ▼
STORE + LOG (deterministic, local JSON in Phase 1)
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.9 |
| Runtime | React | 19.2.4 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS v4 | ^4 |
| Animation | framer-motion | ^12.40.0 |
| AI SDK | @anthropic-ai/sdk | ^0.105.0 |
| Validation | zod | ^4.4.3 |
| Testing | vitest | ^4.1.9 |
| Node | Node.js | 22 |
| Storage (Ph.1) | Local JSON file | — |
| Storage (Ph.2) | Supabase + RLS | PLANNED |
| Auth (Ph.2) | Clerk | PLANNED |

---

## Directory Structure

```
hackathon100x/
├── .git/
├── .github/
├── MOVE2_HYPOTHESIS.md          ← scientific prior, committed before any code
├── README.md
├── index.html                   ← root placeholder
├── test.js                      ← root-level scratch test
├── docs/                        ← [created by archiver]
│   ├── AI_MEMORY.md
│   ├── PROJECT_STATE.md
│   ├── DECISIONS.md
│   ├── BUGS_AND_FIXES.md
│   ├── NEXT_STEPS.md
│   ├── ARCHITECTURE.md
│   └── SESSION_TRANSFER.md
└── track-c/                     ← Next.js application root
    ├── .env.example             ← template; user pastes key into .env.local
    ├── .gitignore
    ├── AGENTS.md                ← instructs AI agents about Next.js 16 breaking changes
    ├── CLAUDE.md
    ├── README.md
    ├── next.config.ts
    ├── postcss.config.mjs
    ├── tsconfig.json
    ├── vitest.config.ts
    ├── package.json
    ├── app/
    │   ├── favicon.ico
    │   ├── globals.css          ← Tailwind v4, design tokens, aurora, glass, field
    │   ├── layout.tsx           ← root layout, aurora background div
    │   ├── page.tsx             ← full client component: form + result display
    │   └── api/
    │       └── diagnose/
    │           └── route.ts     ← POST handler, Node runtime, pipeline orchestrator
    └── lib/
        ├── intake.ts            ← INTAKE_QUESTIONS constant (6 fixed questions)
        ├── taxonomy.ts          ← BOTTLENECKS enum + labels + walls + descriptions
        ├── schemas.ts           ← zod schemas + JSON tool schemas for both calls
        ├── scopeGate.ts         ← deterministic scope gate (step 2)
        ├── validators.ts        ← isEvidenceGrounded, isValidBottleneck, hasKillCondition
        ├── template.ts          ← assemblePrediction() — fixed 3-clause sentence
        ├── anthropic.ts         ← extractSignal() + mapBottleneck() Anthropic calls
        ├── pipeline.ts          ← runPipeline() orchestrates all 6 steps
        ├── store.ts             ← storeDiagnosis() writes to .data/diagnoses.json
        └── deterministic.test.ts ← 11 vitest unit tests (all passing)
```

---

## Components

### Frontend (`app/page.tsx`) — Client Component

- **Header:** eyebrow label, H1 with gradient italic span, subtitle, pipeline
  step strip (6 chips with → separators)
- **Form:** Renders all `INTAKE_QUESTIONS` dynamically. Grid layout (1-col mobile,
  2-col desktop). textareas are full-width. Selects use `.field` + custom arrow.
  Submit button has loading spinner + disabled state.
- **ResultShell:** Animated `<motion.section>` with spring physics, 3 tone
  variants (accent/muted/warm), exit animation
- **Result states rendered:**
  - `error` — network/API error, warm border
  - `refused` — out-of-scope, muted, plain text
  - `abstained` — no taxonomy fit, muted, explains why abstaining is correct
  - `diagnosed` — bottleneck chip, serif prediction sentence, evidence quote,
    wrong-move panel (warm), kill-condition panel (accent-2), meta strip
- **Meta strip:** model name, prompt version, taxonomy version

### Design System

| Token | Value |
|---|---|
| `--bg` | `#07070c` |
| `--bg-soft` | `#0d0d16` |
| `--fg` | `#e7e7ef` |
| `--muted` | `#9a9ab0` |
| `--line` | `#1d1d2b` |
| `--accent` | `#8b8bff` (indigo) |
| `--accent-2` | `#4fd6e6` (cyan) |
| `--warm` | `#f2b25c` (amber) |
| `--font-serif` | Georgia / Times New Roman |
| `--font-mono` | ui-monospace / SF Mono / Cascadia Code / Menlo |

- `.aurora` — CSS-only fixed mesh background (two radial blobs, z-index -1)
- `.glass` — glassmorphism card (gradient + backdrop-blur + border)
- `.field` — unified input/textarea/select style

---

## APIs

### `POST /api/diagnose`

**Runtime:** Node.js (explicit `export const runtime = "nodejs"`)  
**Input:** JSON body matching `IntakeSchema`

```typescript
{
  product: string          // what they're building
  stage: "idea" | "planning" | "mid_build" | "launched"
  multiStage: "yes" | "no"
  stages: string           // free text, list of stages
  loudClaim: string        // what they SAY is hard
  actualBehavior: string   // what they've ACTUALLY done
}
```

**Output:** `DiagnosisResult` JSON

```typescript
{
  status: "refused" | "abstained" | "diagnosed"
  reason?: string           // present on refused
  abstainReason?: string    // present on abstained
  bottleneck?: Bottleneck   // present on diagnosed
  bottleneckLabel?: string  // human label, present on diagnosed
  prediction?: string       // assembled sentence, present on diagnosed
  evidence?: string         // verbatim quote, present on diagnosed
  xPrediction?: string      // wrong move, present on diagnosed
  yKill?: string            // kill-condition, present on diagnosed
  meta: { model, promptVersion, taxonomyVersion }
  rawModelOutput?: unknown  // audit trace
}
```

**Error responses:**
- `400` — invalid JSON or failed zod parse
- `500` — pipeline exception (message forwarded)

---

## Database / Storage

### Phase 1 — Local JSON

**File:** `track-c/.data/diagnoses.json` (created on first run)

**Row shape `DiagnosisRow`:**
```typescript
{
  id: string               // randomUUID()
  user_id: string          // "local" in Phase 1
  intake_raw: Intake       // full form submission
  model: string
  prompt_version: string
  taxonomy_version: string
  raw_model_output: unknown
  abstained: boolean
  refused: boolean
  evidence: string | null
  bottleneck: string | null
  prediction: string | null
  created_at: string       // ISO 8601
}
```

### Phase 2 — Supabase (PLANNED)
- Same schema as above → Postgres table `diagnosis`
- Row-level security on `user_id = auth.uid()`
- `user_id` populated from Clerk JWT sub claim

---

## External Services

| Service | Phase | Purpose | Status |
|---|---|---|---|
| Anthropic API | 1 | Signal Extract + Bottleneck Map | Active (awaiting key) |
| Clerk | 2 | Authentication + JWT | Planned |
| Supabase | 2 | Postgres + RLS storage | Planned |

---

## Authentication Flow

**Phase 1:** None. All requests treated as `user_id = "local"`.  
**Phase 2 (PLANNED):** Clerk session → JWT → sub claim → user_id in store →
Supabase RLS enforces per-user row access.

---

## Data Flow

```
Browser form
  │ POST /api/diagnose (JSON)
  ▼
route.ts
  │ zod parse (IntakeSchema)
  │ fail → 400
  ▼
runPipeline(intake)
  │
  ├─ scopeGate(intake)        [deterministic]
  │    └─ not inScope → { status: "refused" }
  │
  ├─ extractSignal(intake)    [Anthropic call 1]
  │    └─ null → { status: "abstained" }
  │
  ├─ mapBottleneck(intake, signal) [Anthropic call 2]
  │    └─ null → { status: "abstained" }
  │    └─ ABSTAIN → { status: "abstained" }
  │    └─ validation fails → { status: "abstained" }
  │
  └─ assemblePrediction(wall, x, y) [deterministic]
       └─ { status: "diagnosed", ... }
  │
storeDiagnosis(intake, result) [fire-and-forget, silent on error]
  │
Response.json(result)
  │
Browser renders result card
```

---

## Taxonomy (Closed Enum)

| Key | Label | Wall Phrase |
|---|---|---|
| `flat_terrain` | Flat terrain | every build stage feels equally urgent and hard, so you can't see which lever to pull first |
| `fear_of_shipping` | Fear of shipping | the work is ready enough but putting it in front of someone real keeps getting deferred |
| `no_idea` | No idea | there is no concrete thing being built yet, only the intention to build |
| `motivation_only` | Motivation only | the energy is there but it isn't attached to a specific next action |
| `outsourcing_judgment` | Outsourcing judgment | you're trying to hand off the decisions that are the actual product, not just the labor |

Model can also return `ABSTAIN` (not a Bottleneck type; handled in pipeline guard).

---

## Deployment Setup

**Phase 1:** Local `npm run dev` (Next.js dev server).  
No deployment target confirmed. `.data/` directory is excluded from git via
`.gitignore`.

**Phase 2 (PLANNED):** [UNKNOWN] — Vercel likely given Next.js stack.

---

## Feature Implementation Status

| Feature | Status | Notes |
|---|---|---|
| Intake form (6 fixed questions) | ✅ Completed | All fields rendered dynamically from INTAKE_QUESTIONS |
| Scope gate | ✅ Completed | mid_build + multiStage === "yes" required; tested |
| Signal Extractor (Call 1) | ✅ Completed | Anthropic tool-use, zod-validated, fail-closed |
| Bottleneck Mapper (Call 2) | ✅ Completed | Anthropic tool-use, closed taxonomy, ABSTAIN supported |
| Post-call validators | ✅ Completed | 3 guards: enum, verbatim evidence, kill-condition |
| Prediction template assembler | ✅ Completed | Fixed 3-clause sentence, code-assembled |
| API route `/api/diagnose` | ✅ Completed | POST, Node runtime, zod parse, pipeline call |
| Local JSON store | ✅ Completed | `.data/diagnoses.json`, append-only |
| Result display (diagnosed) | ✅ Completed | Bottleneck chip, serif sentence, evidence, X/Y panels, meta |
| Result display (refused) | ✅ Completed | Muted card, scope reason |
| Result display (abstained) | ✅ Completed | Muted card, abstain reason, explanation |
| Result display (error) | ✅ Completed | Warm card, error string |
| Unit tests (deterministic core) | ✅ Completed | 11/11 passing |
| Frontend animations | ✅ Completed | framer-motion entry, spring exit, AnimatePresence |
| Dark theme + aurora background | ✅ Completed | CSS-only, design tokens set |
| ANTHROPIC_API_KEY wiring | ⚠️ Partial | Code ready; key not yet placed by user in .env.local |
| Clerk authentication | ❌ Planned | Phase 2 |
| Supabase storage | ❌ Planned | Phase 2 |
| Rate limiting | ❌ Planned | Phase 2 |
| Outcome tracking / feedback | ❌ Planned | Phase 2 |
| TypeScript typecheck (clean build) | ⚠️ Unknown | Last recorded state: typecheck run to catch zod enum tuple error; fix was applied but final clean run not confirmed |
