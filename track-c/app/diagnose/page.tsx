// app/diagnose/page.tsx
// Protected diagnostic form page — requires Clerk auth.
// Handles diagnosis intake, history listing, and outcome logging.

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { INTAKE_QUESTIONS, type IntakeFieldId } from "@/lib/intake";
import type { DiagnosisResult } from "@/lib/pipeline";
import type { DiagnosisRow } from "@/lib/store";
import { playSuccessSplash, playWastedSplash, playBackCancel } from "@/lib/audio";

type FormState = Record<IntakeFieldId, string>;

const DEFAULTS: FormState = {
  product: "",
  stage: "mid_build",
  multiStage: "yes",
  stages: "",
  loudClaim: "",
  actualBehavior: "",
  userFeedback: "",
  manualWorkaround: "",
};

const PIPELINE = [
  "Intake",
  "Scope gate",
  "Signal extract",
  "Bottleneck map",
  "Prediction",
  "Store",
];

export default function DiagnosePage() {
  const [activeTab, setActiveTab] = useState<"diagnose" | "history">("diagnose");
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [splash, setSplash] = useState<{
    type: "success" | "abstain" | "refused" | "failed";
    title: string;
    prediction?: string;
    evidence?: string;
  } | null>(null);

  // History state
  const [history, setHistory] = useState<DiagnosisRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Outcome state
  const [loggingOutcomeId, setLoggingOutcomeId] = useState<string | null>(null);
  const [didWhat, setDidWhat] = useState("");
  const [matchedPrediction, setMatchedPrediction] = useState<boolean>(true);
  const [submittingOutcome, setSubmittingOutcome] = useState(false);

  // HUD stats calculations
  const runsInLast24h = history.filter((item) => {
    const created = new Date(item.created_at).getTime();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return created > oneDayAgo;
  }).length;
  const healthPercentage = Math.max(0, 100 - runsInLast24h * 10);

  const set = (id: IntakeFieldId, v: string) =>
    setForm((f) => ({ ...f, [id]: v }));

  async function loadHistory() {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await fetch("/api/diagnose/history");
      const data = await res.json();
      if (!res.ok) {
        setHistoryError(data.error ?? "Failed to load history.");
      } else {
        setHistory(data.diagnoses ?? []);
      }
    } catch {
      setHistoryError("Network error — failed to load history.");
    } finally {
      setLoadingHistory(false);
    }
  }

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data?.error ?? "Something went wrong.";
        setError(errMsg);
        setSplash({
          type: "failed",
          title: "DIAGNOSIS FAILED",
          prediction: errMsg,
        });
        playWastedSplash();
      } else {
        setResult(data as DiagnosisResult);
        loadHistory(); // Refresh history list in background
        if (data.status === "diagnosed") {
          setSplash({
            type: "success",
            title: "DIAGNOSIS COMPLETE",
            prediction: data.prediction,
            evidence: data.evidence,
          });
          playSuccessSplash();
        } else if (data.status === "abstained") {
          setSplash({
            type: "abstain",
            title: "ABSTAINED",
            prediction: data.abstainReason,
          });
          playWastedSplash();
        } else if (data.status === "refused") {
          setSplash({
            type: "refused",
            title: "OUT OF SCOPE",
            prediction: data.reason,
          });
          playWastedSplash();
        }
      }
    } catch {
      const errMsg = "Network error — is the server running?";
      setError(errMsg);
      setSplash({
        type: "failed",
        title: "DIAGNOSIS FAILED",
        prediction: errMsg,
      });
      playWastedSplash();
    } finally {
      setLoading(false);
    }
  }

  async function submitOutcome(diagnosisId: string) {
    if (!didWhat.trim()) return;
    setSubmittingOutcome(true);
    try {
      const res = await fetch("/api/outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosisId,
          didWhat,
          matchedPrediction,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Failed to save outcome.");
      } else {
        setDidWhat("");
        setLoggingOutcomeId(null);
        loadHistory(); // Refresh history to show the logged outcome
      }
    } catch {
      alert("Network error — failed to save outcome.");
    } finally {
      setSubmittingOutcome(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between">
          <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.3em] text-muted">
            TRACK&nbsp;C · DIAGNOSTIC
          </p>
          <div className="flex items-center gap-3">
            <span className="font-[family-name:var(--font-mono)] text-[9px] tracking-widest text-muted/40 uppercase">GUEST</span>
          </div>
        </div>

        <h1 className="mt-4 font-sans font-black text-5xl leading-[1.05] tracking-wide sm:text-6xl uppercase">
          Find the{" "}
          <span className="text-[#5fa324] italic">
            one wall.
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-[14px] leading-relaxed text-muted uppercase font-semibold">
          For the mid-build builder with a multi-stage AI product. It reads what
          you <em>say</em> is hard against what you&apos;ve <em>actually</em>{" "}
          done, and returns a single falsifiable bottleneck — with a
          kill-condition — or it refuses. Architecture exists to stop it being a
          horoscope.
        </p>

        <div className="mt-6 flex flex-wrap gap-1.5">
          {PIPELINE.map((step, i) => (
            <span
              key={step}
              className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider text-muted/70 uppercase"
            >
              {step}
              {i < PIPELINE.length - 1 && (
                <span className="px-1.5 text-accent/50">→</span>
              )}
            </span>
          ))}
        </div>
      </motion.header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mt-10 mb-8 border-b border-line pb-2">
        <button
          onClick={() => setActiveTab("diagnose")}
          className={`px-5 py-3 font-[family-name:var(--font-mono)] text-xs font-bold tracking-widest transition-all duration-100 uppercase rounded-none ${
            activeTab === "diagnose"
              ? "bg-[#5fa324] text-black border border-[#5fa324]"
              : "bg-black/60 text-muted hover:bg-[#5fa324] hover:text-black border border-line"
          }`}
        >
          NEW DIAGNOSIS
        </button>
        <button
          onClick={() => {
            setActiveTab("history");
            loadHistory();
          }}
          className={`px-5 py-3 font-[family-name:var(--font-mono)] text-xs font-bold tracking-widest transition-all duration-100 uppercase rounded-none ${
            activeTab === "history"
              ? "bg-[#5fa324] text-black border border-[#5fa324]"
              : "bg-black/60 text-muted hover:bg-[#5fa324] hover:text-black border border-line"
          }`}
        >
          HISTORY &amp; OUTCOMES {history.length > 0 && `(${history.length})`}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* NEW DIAGNOSIS TAB */}
        {activeTab === "diagnose" && (
          <motion.div
            key="diagnose-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            {/* Form */}
            <form onSubmit={submit} className="glass rounded-none p-6 sm:p-8">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {INTAKE_QUESTIONS.map((q, i) => {
                  const fullWidth =
                    q.type === "textarea" || q.id === "product" || q.id === "stages";
                  return (
                    <div key={q.id} className={fullWidth ? "sm:col-span-2" : ""}>
                      <label htmlFor={q.id} className="block text-sm font-medium text-fg">
                        {q.label}
                      </label>
                      {q.hint ? (
                        <p className="mt-0.5 mb-2 text-xs text-muted">{q.hint}</p>
                      ) : (
                        <div className="mb-2" />
                      )}

                      {q.type === "select" ? (
                        <select
                          id={q.id}
                          className="field"
                          value={form[q.id]}
                          onChange={(e) => set(q.id, e.target.value)}
                        >
                          {q.options!.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : q.type === "textarea" ? (
                        <textarea
                          id={q.id}
                          className="field"
                          placeholder={q.placeholder}
                          value={form[q.id]}
                          onChange={(e) => set(q.id, e.target.value)}
                        />
                      ) : (
                        <input
                          id={q.id}
                          className="field"
                          placeholder={q.placeholder}
                          value={form[q.id]}
                          onChange={(e) => set(q.id, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group mt-7 flex w-full items-center justify-center gap-2 rounded-none bg-[#5fa324] px-6 py-3.5 text-xs font-bold text-black uppercase tracking-widest transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
              >
                {loading ? (
                  <>
                    <Spinner /> Diagnosing…
                  </>
                ) : (
                  <>Run diagnosis</>
                )}
              </button>
            </form>

            {/* Current Result Display */}
            <AnimatePresence mode="wait">
              {error && (
                <ResultShell tone="warm">
                  <p className="font-[family-name:var(--font-mono)] text-xs tracking-widest text-warm">
                    ERROR
                  </p>
                  <p className="mt-3 text-lg">{error}</p>
                </ResultShell>
              )}

              {result?.status === "refused" && (
                <ResultShell tone="muted">
                  <p className="font-[family-name:var(--font-mono)] text-xs tracking-widest text-muted">
                    OUT OF SCOPE — NO DIAGNOSIS
                  </p>
                  <p className="mt-3 text-lg leading-relaxed">{result.reason}</p>
                </ResultShell>
              )}

              {result?.status === "abstained" && (
                <ResultShell tone="muted">
                  <p className="font-[family-name:var(--font-mono)] text-xs tracking-widest text-muted">
                    ABSTAINED
                  </p>
                  <p className="mt-3 text-lg leading-relaxed">
                    {result.abstainReason}
                  </p>
                  <p className="mt-4 text-sm text-muted">
                    Abstaining is a valid outcome, not an error. A diagnosis the
                    evidence can&apos;t carry would be a horoscope.
                  </p>
                  <Meta meta={result.meta} />
                </ResultShell>
              )}

              {result?.status === "diagnosed" && (
                <ResultShell tone="accent">
                  <div className="flex items-center gap-3">
                    <span className="rounded-none border border-accent/40 bg-accent/10 px-3 py-1 font-[family-name:var(--font-mono)] text-[10px] font-bold tracking-wider text-accent uppercase">
                      {result.bottleneckLabel}
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-xs tracking-widest text-muted">
                      DIAGNOSIS
                    </span>
                  </div>

                  <p className="mt-5 font-sans font-bold text-2xl leading-snug sm:text-[28px] uppercase">
                    {result.prediction}
                  </p>

                  <div className="mt-6 rounded-none border border-line border-l-2 border-l-accent bg-white/[0.02] p-4">
                    <p className="font-[family-name:var(--font-mono)] text-[9px] tracking-widest text-muted uppercase font-bold">
                      GROUNDED IN YOUR WORDS
                    </p>
                    <p className="mt-2 text-sm italic text-fg/90">
                      &ldquo;{result.evidence}&rdquo;
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-none border border-line p-4 border-t-2 border-t-warm">
                      <p className="font-[family-name:var(--font-mono)] text-[9px] tracking-widest text-warm uppercase font-bold">
                        THE WRONG MOVE (X)
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-fg/90 uppercase font-medium">
                        {result.xPrediction}
                      </p>
                    </div>
                    <div className="rounded-none border border-line p-4 border-t-2 border-t-accent-2">
                      <p className="font-[family-name:var(--font-mono)] text-[9px] tracking-widest text-accent-2 uppercase font-bold">
                        KILL-CONDITION (Y)
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-fg/90 uppercase font-medium">
                        {result.yKill}
                      </p>
                    </div>
                  </div>

                  {result.analogy && (
                    <div className="mt-5 rounded-none border border-accent-2/30 border-l-4 border-l-accent-2 bg-accent-2/[0.04] p-5">
                      <p className="font-[family-name:var(--font-mono)] text-[9px] tracking-widest text-accent-2 uppercase font-bold mb-3">
                        ANALOGICAL DIAGNOSIS
                      </p>
                      <p className="text-sm leading-relaxed text-fg/90 italic">
                        {result.analogy}
                      </p>
                    </div>
                  )}

                  <Meta meta={result.meta} />
                </ResultShell>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <motion.div
            key="history-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {loadingHistory && history.length === 0 && (
              <div className="flex justify-center py-12">
                <Spinner />
                <span className="ml-3 font-[family-name:var(--font-mono)] text-xs text-muted">
                  Loading history…
                </span>
              </div>
            )}

            {historyError && (
              <div className="glass rounded-none border border-warm/30 p-6 text-center text-warm">
                {historyError}
              </div>
            )}

            {!loadingHistory && history.length === 0 && (
              <div className="glass rounded-none p-8 text-center text-muted">
                <p>No historical diagnoses found.</p>
                <p className="mt-2 text-xs">Run a new diagnosis to see it here.</p>
              </div>
            )}

            {history.map((item, idx) => {
              const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <motion.div
                  key={item.id}
                  className="glass rounded-none p-6 sm:p-8"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.05 }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      {item.refused ? (
                        <span className="rounded-none border border-line bg-white/[0.02] px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] tracking-wider text-muted uppercase font-bold">
                          REFUSED
                        </span>
                      ) : item.abstained ? (
                        <span className="rounded-none border border-line bg-white/[0.02] px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] tracking-wider text-muted uppercase font-bold">
                          ABSTAINED
                        </span>
                      ) : (
                        <span className="rounded-none border border-accent/40 bg-accent/10 px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] tracking-wider text-accent uppercase font-bold">
                          {item.bottleneck?.replace("_", " ")}
                        </span>
                      )}
                      <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest text-muted/60">
                        {dateStr}
                      </span>
                    </div>
                  </div>

                  {item.refused && (
                    <p className="text-sm text-muted">
                      Diagnosis refused: Input was determined to be out of scope.
                    </p>
                  )}

                  {item.abstained && (
                    <div>
                      <p className="text-sm text-muted">
                        Diagnosis abstained: Grounding evidence was insufficient to map to a closed-taxonomy bottleneck.
                      </p>
                    </div>
                  )}

                  {!item.refused && !item.abstained && (
                    <div className="space-y-4">
                      <p className="font-[family-name:var(--font-serif)] text-xl leading-snug sm:text-2xl">
                        {item.prediction}
                      </p>

                      <div className="rounded-none border border-line bg-white/[0.01] p-3 text-xs">
                        <span className="font-[family-name:var(--font-mono)] text-[9px] tracking-widest text-muted block mb-1 uppercase font-bold">
                          GROUNDED EVIDENCE
                        </span>
                        <span className="italic text-fg/80">&ldquo;{item.evidence}&rdquo;</span>
                      </div>

                      {/* Outcome display or logging */}
                      {item.outcome && item.outcome.length > 0 ? (
                        <div className="mt-4 border-t border-line/50 pt-4 bg-white/[0.01] p-4 rounded-none border border-line border-l-4 border-l-accent">
                          <p className="font-[family-name:var(--font-mono)] text-[9px] tracking-widest text-accent-2 block mb-1 uppercase font-bold">
                            LOGGED BEHAVIORAL OUTCOME
                          </p>
                          <p className="text-sm italic text-fg/90">&ldquo;{item.outcome[0].did_what}&rdquo;</p>
                          <p className="mt-2 text-xs uppercase font-bold tracking-wider">
                            {item.outcome[0].matched_prediction ? (
                              <span className="text-warm">
                                ⚠ Fell into Predicted Wrong Move (X)
                              </span>
                            ) : (
                              <span className="text-[#5fa324]">
                                ✓ Executed Kill-Condition Action (Y) (Diagnosis disproven)
                              </span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-4 border-t border-line/50 pt-4">
                          {loggingOutcomeId === item.id ? (
                            <div className="space-y-4 bg-white/[0.01] p-4 rounded-none border border-line/80">
                              <h4 className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest text-accent">
                                LOG BEHAVIORAL OUTCOME
                              </h4>
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs text-muted mb-1">
                                    What did you actually do next? (your actions)
                                  </label>
                                  <textarea
                                    className="field text-sm"
                                    placeholder="e.g. Spent the week designing data pipelines instead of fine-tuning..."
                                    value={didWhat}
                                    onChange={(e) => setDidWhat(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-muted mb-1.5">
                                    Which path did you execute?
                                  </label>
                                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                      <input
                                        type="radio"
                                        name={`path-${item.id}`}
                                        checked={matchedPrediction === true}
                                        onChange={() => setMatchedPrediction(true)}
                                      />
                                      Predicted Wrong Move (X)
                                    </label>
                                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                      <input
                                        type="radio"
                                        name={`path-${item.id}`}
                                        checked={matchedPrediction === false}
                                        onChange={() => setMatchedPrediction(false)}
                                      />
                                      Kill-Condition Action (Y) (Diagnosis disproven)
                                    </label>
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <button
                                    type="button"
                                    disabled={submittingOutcome}
                                    onClick={() => submitOutcome(item.id)}
                                    className="rounded-none bg-[#5fa324] hover:bg-white hover:text-black px-4 py-2 text-xs font-bold text-black uppercase tracking-wider transition-all duration-100 disabled:opacity-60"
                                  >
                                    {submittingOutcome ? "Saving..." : "Save Outcome"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLoggingOutcomeId(null);
                                      setDidWhat("");
                                    }}
                                    className="rounded-none border border-line text-muted hover:bg-red-600 hover:text-white text-xs font-bold px-4 py-2 transition-all duration-100 uppercase"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setLoggingOutcomeId(item.id);
                                setMatchedPrediction(true);
                              }}
                              className="rounded-none border border-accent/40 bg-accent/10 hover:bg-[#5fa324] hover:text-black text-accent text-xs font-bold px-4 py-2 transition-all duration-100 uppercase tracking-widest"
                            >
                              Log behavioral outcome →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-20 text-center font-[family-name:var(--font-mono)] text-[10px] tracking-wider text-muted/40">
        PHASE 2 · SUPABASE · CLERK AUTH · CLOSED TAXONOMY
      </footer>

      {/* ── GTA V Heads-Up Display (HUD) Status Bars ───────────────────── */}
      <div className="fixed bottom-6 left-6 z-40 hidden md:flex flex-col gap-2 bg-black/80 border border-line p-3.5 font-mono text-[9px] tracking-widest text-white/50 w-60">
        <div className="flex justify-between items-center mb-1 border-b border-line pb-1.5">
          <span className="font-bold text-white">HUD STATUS PANEL</span>
          <span className="text-accent font-bold">ONLINE</span>
        </div>
        
        {/* Health Bar (Rate Limit Runs Remaining) */}
        <div className="space-y-1">
          <div className="flex justify-between text-[8px] font-bold text-white/70">
            <span>LIMIT RATIO (HEALTH)</span>
            <span className="text-[#5fa324]">{10 - runsInLast24h} / 10 RUNS</span>
          </div>
          <div className="w-full h-2 bg-neutral-900 border border-neutral-800">
            <div 
              className="h-full bg-[#5fa324] transition-all duration-500 ease-out"
              style={{ width: `${healthPercentage}%` }}
            />
          </div>
        </div>

        {/* Armor Bar (Database Connection Status) */}
        <div className="space-y-1">
          <div className="flex justify-between text-[8px] font-bold text-white/70">
            <span>DATABASE SYNC (ARMOR)</span>
            <span className="text-[#1f83b4]">{historyError ? "OFFLINE" : "CONNECTED"}</span>
          </div>
          <div className="w-full h-2 bg-neutral-900 border border-neutral-800">
            <div 
              className={`h-full bg-[#1f83b4] transition-all duration-500 ease-out ${historyError ? "w-0" : "w-full"}`}
            />
          </div>
        </div>

        {/* Special Ability Bar (Groq AI Status) */}
        <div className="space-y-1">
          <div className="flex justify-between text-[8px] font-bold text-white/70">
            <span>AI CO-PROCESSOR (ABILITY)</span>
            <span className="text-[#f0c243]">ACTIVE</span>
          </div>
          <div className="w-full h-2 bg-neutral-900 border border-neutral-800">
            <div className="h-full bg-[#f0c243] w-full" />
          </div>
        </div>
      </div>

      {/* ── GTA V Cinematic Widescreen Overlay ───────────────────────── */}
      <AnimatePresence>
        {splash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 pointer-events-auto"
            onClick={() => {
              playBackCancel();
              setSplash(null);
            }}
          >
            {/* Cinematic Horizontal Bars */}
            <motion.div 
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              exit={{ scaleY: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="w-full bg-[#0a0a0acc] border-y border-line py-16 flex flex-col items-center justify-center text-center origin-center px-6 relative"
            >
              {/* Banner Title */}
              <motion.h2
                initial={{ scale: 3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.5, ease: "backOut" }}
                className={`font-sans font-black italic tracking-wider text-6xl md:text-8xl select-none uppercase ${
                  splash.type === "success" 
                    ? "text-[#5fa324] drop-shadow-[0_4px_10px_rgba(95,163,36,0.3)]" 
                    : splash.type === "abstain" || splash.type === "refused"
                      ? "text-[#f0c243] drop-shadow-[0_4px_10px_rgba(240,194,67,0.3)]"
                      : "text-red-600 drop-shadow-[0_4px_10px_rgba(220,38,38,0.3)]"
                }`}
              >
                {splash.title}
              </motion.h2>

              {/* Prediction / Reason Text */}
              {splash.prediction && (
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="mt-6 max-w-3xl text-lg md:text-2xl font-light text-white font-serif leading-relaxed"
                >
                  &ldquo;{splash.prediction}&rdquo;
                </motion.p>
              )}

              {/* Verbatim Grounded Evidence */}
              {splash.evidence && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.75, duration: 0.4 }}
                  className="mt-6 border border-line bg-black/40 p-4 max-w-xl text-center"
                >
                  <span className="font-mono text-[9px] tracking-widest text-muted block mb-1">
                    GROUNDED EVIDENCE
                  </span>
                  <span className="text-sm italic text-[#5fa324]">&ldquo;{splash.evidence}&rdquo;</span>
                </motion.div>
              )}

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="mt-8 font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase animate-pulse cursor-pointer"
              >
                CLICK ANYWHERE TO CLOSE
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function ResultShell({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "accent" | "muted" | "warm";
}) {
  const ring =
    tone === "accent"
      ? "border-accent/30"
      : tone === "warm"
        ? "border-warm/30"
        : "border-line";
  return (
    <motion.section
      className={`glass mt-8 rounded-none border p-6 sm:p-8 ${ring}`}
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
    >
      {children}
    </motion.section>
  );
}

function Meta({ meta }: { meta: DiagnosisResult["meta"] }) {
  return (
    <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-4 font-[family-name:var(--font-mono)] text-[10px] tracking-wider text-muted/60">
      <span>model: {meta.model}</span>
      <span>prompt: {meta.promptVersion}</span>
      <span>taxonomy: {meta.taxonomyVersion}</span>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}
