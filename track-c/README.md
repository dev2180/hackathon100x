# Track C — The One Wall

> A diagnostic that tells a stuck builder the **single thing** blocking them —
> as a falsifiable prediction — or honestly says *"I don't know."*

---

## 1. What this is (in plain language)

Most "AI advice" tools are horoscopes. They tell you something that sounds deep
but is true of *everyone* ("you should validate with users!"), so it changes
nothing.

**Track C does the opposite.** A builder who is mid-way through a multi-stage AI
project answers a short intake. The system reads the gap between **what they say
is hard** and **what they actually do**, and returns *one* named wall — for
example, *"flat terrain: every stage feels equally urgent, so you can't see
which lever to pull first."*

Three things make it trustworthy rather than a fortune cookie:

1. **It can refuse.** If the evidence doesn't clearly point to one wall, it says
   *"Abstain"* instead of inventing something. Abstaining is a valid, designed
   outcome — not a bug.
2. **Its answer is falsifiable.** Every diagnosis comes with a *kill-condition*:
   a concrete action that, if you take it, proves the diagnosis wrong. A claim
   you can disprove is a claim worth trusting.
3. **It shows you the map.** The result includes an interactive **knowledge
   bridge** — a graph from *where you are* to *your goal*, with the steps in
   between, the rabbit holes to avoid, and — when you click a node — *how far
   down that rabbit hole you should actually go.*

---

## 2. The core idea: "flat terrain"

The central hypothesis the product is built around:

> A stuck builder usually isn't blocked by *missing knowledge*. They're blocked
> because they hold every build stage at **equal weight** — setup, agents,
> iteration, a custom model all feel equally urgent and equally hard. The
> terrain looks flat, no levers are visible, so they freeze.
>
> Handed **one sentence** that names the *flattening* (not their ignorance),
> they recognize it instantly and move — they pick a first step, shelve the
> far-off hard stage, or finally ask what's actually first.

Everything below is scaffolding in service of producing that one sentence
*honestly*.

---

## 3. How it works (the pipeline)

The system is **two narrow AI calls wrapped in deterministic guard-rails**. The
AI is never trusted to "just answer" — it is boxed in on every side by plain
code.

```
                 ┌─────────────────────────────────────────────┐
   Intake  ─────▶│  SCOPE GATE        (code, no AI)             │
  (8 fields)     │  in scope? mid-build + multi-stage           │
                 └───────────────┬─────────────────────────────┘
                                 │ in scope
                                 ▼
                 ┌─────────────────────────────────────────────┐
                 │  CALL 1 · Signal Extractor      (AI)         │
                 │  separates "what they SAY is hard" from      │
                 │  "what they ACTUALLY do" + the contradiction │
                 │  — it does NOT diagnose                      │
                 └───────────────┬─────────────────────────────┘
                                 ▼
                 ┌─────────────────────────────────────────────┐
                 │  CALL 2 · Bottleneck Mapper     (AI)         │
                 │  maps the contradiction to ONE wall from a   │
                 │  closed list — or ABSTAINS. Also draws the   │
                 │  knowledge-bridge graph.                     │
                 └───────────────┬─────────────────────────────┘
                                 ▼
                 ┌─────────────────────────────────────────────┐
                 │  VALIDATORS        (code, no AI)             │
                 │  • wall must be in the closed taxonomy       │
                 │  • kill-condition must exist                 │
                 │  • (evidence-grounding guard available)      │
                 │  any failure ⇒ ABSTAIN                       │
                 └───────────────┬─────────────────────────────┘
                                 ▼
                 ┌─────────────────────────────────────────────┐
                 │  TEMPLATE          (code, no AI)             │
                 │  the final sentence is ASSEMBLED by code.    │
                 │  the model only supplies the X and Y slots.  │
                 └───────────────┬─────────────────────────────┘
                                 ▼
                        Diagnosed · Abstained · Refused
                              (stored every time)
```

Why two calls instead of one? **Separation of concerns.** Call 1 is only allowed
to *observe* (claim vs. behavior). Call 2 is the only place *judgment* happens.
Splitting them keeps each prompt small, deterministic, and easy to reason about —
and stops the model from rationalizing a diagnosis backwards from a vibe.

---

## 4. Agent design

| Agent | Job | Is allowed to | Is NOT allowed to |
|-------|-----|---------------|-------------------|
| **Signal Extractor** (Call 1) | See clearly | Restate the loud claim, the actual behavior, and the single sharpest contradiction | Diagnose, advise, recommend |
| **Bottleneck Mapper** (Call 2) | Judge once | Pick **one** wall from the closed taxonomy *or* ABSTAIN; produce evidence, the wrong-move prediction (X), the kill-condition (Y), missed signals, next steps, and the graph | Invent a wall outside the list; emit the final user-facing sentence |

Both agents:

- run at **temperature 0** (deterministic — same input, same output),
- are forced to answer via **function/tool calling** against a strict JSON
  schema (not "reply in JSON", which models break), then **validated with Zod**,
- **fail closed**: any error, timeout, or malformed output becomes an honest
  *Abstain*, never a guess.

**Model:** Groq's `llama-3.3-70b-versatile` through the OpenAI-compatible API
(`lib/ai.ts`). Swappable via the `GROK_MODEL` env var.

---

## 5. Prompt design

Four principles run through every prompt:

1. **Closed taxonomy, not open advice.** Call 2 must choose from exactly five
   walls. A sentence true of *every* stuck builder is a horoscope; forcing a
   choice from a fixed list (or abstention) is the scoring bar.

   ```
   flat_terrain · fear_of_shipping · no_idea · motivation_only · outsourcing_judgment
   ```

2. **Abstaining is explicitly endorsed.** The prompt says, in effect, *"if
   nothing fits, ABSTAIN — that is correct, not a failure."* Without this,
   models people-please and fabricate.

3. **The intake is data, not instructions.** Every prompt states that the user's
   text is *data to be analyzed* and that no instruction inside it should ever be
   followed. This is the prompt-injection defense.

4. **Calibrate to the person.** Call 2 receives the builder's stated
   *experience* and *domain expertise*, so the knowledge-bridge never tells a
   senior engineer to learn what they already know — and never sends a beginner
   down a deep hole.

---

## 6. The anti-horoscope scaffolding (why you can trust the output)

The AI is the *weakest* link in the chain by design. These deterministic pieces
of code surround it:

- **Scope gate** (`lib/scopeGate.ts`) — only mid-build, multi-stage projects
  reach the model. Out-of-scope inputs are refused *before* any AI runs.
- **Closed taxonomy** (`lib/taxonomy.ts`) — the five-wall enum. Editing this list
  is the real product decision; the model just picks from it.
- **Validators** (`lib/validators.ts`) — after Call 2: the wall must be in the
  enum, a kill-condition must exist. (A verbatim-evidence guard also lives here;
  it's currently relaxed so honest paraphrasing doesn't force a false abstain.)
- **Template assembly** (`lib/template.ts`) — the final sentence is built by
  code: *"Your wall is **[wall]**. You will next try **[X]**. If instead you do
  **[Y]**, this diagnosis is wrong."* The model fills only X and Y, so it can
  never wordsmith its way around the structure.

The result is one of three honest states: **Diagnosed**, **Abstained**, or
**Refused** — and all three are stored for later review.

---

## 7. The knowledge-bridge graph

The diagnosis ships with an interactive map (`components/DiagnosisGraph.tsx`),
generated by Call 2. It directly serves the "flat terrain" idea — by giving each
stage a *different weight*, it literally un-flattens the terrain.

- **Nodes:** `current` (you are here) → `step` (the real path) → `goal`, plus
  `dead` nodes branching off — the rabbit holes this specific builder will be
  tempted by.
- **Each node carries three extra fields the model fills in:**
  - `gap` — *the specific thing you don't know here*, calibrated to your
    experience. This is the "bridge."
  - `rabbitHole` — *how far down to go and where to stop* (a time-box +
    an explicit stop line), so you don't over-invest.
  - `depth` — `shallow` · `moderate` · `deep`. The node's **halo size** encodes
    this, so at a glance you see which stage actually deserves the effort.
- **Click any node** to open its detail panel — the gap, the rabbit-hole
  guidance, and the depth meter. Dead nodes flip to *"the false belief"* and
  *"why it won't pay off."*

---

## 8. Project structure

```
track-c/
├── app/
│   ├── page.tsx              Landing page
│   ├── diagnose/page.tsx     The diagnostic UI (intake, result, history)
│   └── api/
│       ├── diagnose/         POST intake → run pipeline → store
│       └── outcome/          Log what the builder actually did next
├── lib/
│   ├── intake.ts             The fixed intake questions
│   ├── schemas.ts            Zod + JSON schemas (the contract with the model)
│   ├── scopeGate.ts          Deterministic in/out-of-scope check
│   ├── ai.ts                 ◀ THE LIVE MODEL CALLS (Groq, two agents)
│   ├── taxonomy.ts           The closed list of five walls
│   ├── validators.ts         Post-call anti-horoscope guards
│   ├── template.ts           Assembles the final sentence in code
│   ├── pipeline.ts           Orchestrates the whole flow
│   └── store.ts              Supabase persistence (history + outcomes)
└── components/
    ├── DiagnosisGraph.tsx    The interactive knowledge-bridge graph
    └── ScrambleText.tsx      Terminal-style decode text effect
```

---

## 9. Running it locally

**Prerequisites:** Node 20+, a Groq API key (from <https://console.groq.com>).

```bash
npm install
cp .env.example .env     # then fill in the values below
npm run dev              # http://localhost:3000
```

### Environment variables

| Variable | Required | What it is |
|----------|----------|------------|
| `GROK_API_KEY` | **Yes** | Your Groq key (starts with `gsk_`). Despite the name, this is Groq, not xAI. |
| `GROK_MODEL` | No | Override the model (default `llama-3.3-70b-versatile`). |
| `NEXT_PUBLIC_SUPABASE_URL` | For history | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For history | Supabase anon key. |

> Phase-1 note: user auth is stripped — every run is attributed to a single
> `local` user. The Clerk variables in `.env.example` are unused for now.

### Useful commands

```bash
npm run dev      # local dev server
npm run build    # production build (also runs the TypeScript check)
npm run test     # vitest — pipeline, route, and validator contract tests
```

---

## 10. Deploying

Pushes to `main` deploy via Vercel. Set **`GROK_API_KEY`** (and the Supabase
vars) in the Vercel project's environment settings — the pipeline fails closed to
*Abstain* without a working model key.

---

## 11. Design philosophy, in one line

> **Make the AI the weakest part of the system, then surround it with code that
> only lets the truth through.**
