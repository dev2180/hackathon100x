import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import type { Intake } from "./schemas";
import type { DiagnosisResult } from "./pipeline";
import fs from "fs";
import path from "path";

const LOCAL_DATA_DIR = path.join(process.cwd(), ".data");
const LOCAL_DATA_FILE = path.join(LOCAL_DATA_DIR, "diagnoses.json");

function readLocalDiagnoses(): DiagnosisRow[] {
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_DATA_FILE)) {
      fs.writeFileSync(LOCAL_DATA_FILE, "[]", "utf8");
      return [];
    }
    const data = fs.readFileSync(LOCAL_DATA_FILE, "utf8");
    return JSON.parse(data) as DiagnosisRow[];
  } catch (err) {
    console.error("Failed to read local diagnoses:", err);
    return [];
  }
}

function writeLocalDiagnoses(diagnoses: DiagnosisRow[]) {
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(diagnoses, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write local diagnoses:", err);
  }
}

// Store module for Phase 2: uses Supabase Postgres with Clerk JWT authentication
// and Row-Level Security (RLS). ABSTAIN is a valid stored state, not an error.

export interface DiagnosisRow {
  id: string;
  user_id: string;
  intake_raw: Intake;
  model: string;
  prompt_version: string;
  taxonomy_version: string;
  raw_model_output: unknown;
  abstained: boolean;
  refused: boolean;
  evidence: string | null;
  bottleneck: string | null;
  prediction: string | null;
  created_at: string;
  outcome?: OutcomeRow[];
}

export interface OutcomeRow {
  id: string;
  diagnosis_id: string;
  did_what: string;
  matched_prediction: boolean;
  created_at: string;
}

// Create a Supabase client configured with the logged-in user's Clerk token
export async function getSupabaseClient() {
  const { getToken } = await auth();
  const token = await getToken({ template: "supabase" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or Anon Key is not set in environment variables.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    },
  });
}

export async function storeDiagnosis(
  intake: Intake,
  result: DiagnosisResult,
  userId: string,
): Promise<DiagnosisRow> {
  if (userId === "local") {
    const localList = readLocalDiagnoses();
    const newRow: DiagnosisRow = {
      id: crypto.randomUUID(),
      user_id: "local",
      intake_raw: intake,
      model: result.meta.model,
      prompt_version: result.meta.promptVersion,
      taxonomy_version: result.meta.taxonomyVersion,
      raw_model_output: result.rawModelOutput ?? null,
      abstained: result.status === "abstained",
      refused: result.status === "refused",
      evidence: result.evidence ?? null,
      bottleneck: result.bottleneck ?? null,
      prediction: result.prediction ?? null,
      created_at: new Date().toISOString(),
      outcome: [],
    };
    localList.push(newRow);
    writeLocalDiagnoses(localList);
    return newRow;
  }

  const supabase = await getSupabaseClient();

  // Ensure user profile exists (RLS allows inserting own profile)
  await supabase.from("profiles").upsert({ id: userId });

  const { data, error } = await supabase
    .from("diagnosis")
    .insert({
      user_id: userId,
      intake_raw: intake,
      model: result.meta.model,
      prompt_version: result.meta.promptVersion,
      taxonomy_version: result.meta.taxonomyVersion,
      raw_model_output: result.rawModelOutput ?? null,
      abstained: result.status === "abstained",
      refused: result.status === "refused",
      evidence: result.evidence ?? null,
      bottleneck: result.bottleneck ?? null,
      prediction: result.prediction ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to store diagnosis in Supabase: ${error.message}`);
  }

  return data as DiagnosisRow;
}

export async function fetchDiagnoses(userId?: string): Promise<DiagnosisRow[]> {
  const activeUserId = userId || "local";
  if (activeUserId === "local") {
    return readLocalDiagnoses().sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("diagnosis")
    .select("*, outcome(*)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching diagnoses:", error);
    return [];
  }

  return data as DiagnosisRow[];
}

export async function storeOutcome(
  diagnosisId: string,
  didWhat: string,
  matchedPrediction: boolean,
): Promise<OutcomeRow> {
  const localList = readLocalDiagnoses();
  const localDiag = localList.find((d) => d.id === diagnosisId);
  if (localDiag) {
    const newOutcome: OutcomeRow = {
      id: crypto.randomUUID(),
      diagnosis_id: diagnosisId,
      did_what: didWhat,
      matched_prediction: matchedPrediction,
      created_at: new Date().toISOString(),
    };
    if (!localDiag.outcome) {
      localDiag.outcome = [];
    }
    localDiag.outcome.push(newOutcome);
    writeLocalDiagnoses(localList);
    return newOutcome;
  }

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("outcome")
    .insert({
      diagnosis_id: diagnosisId,
      did_what: didWhat,
      matched_prediction: matchedPrediction,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to store outcome in Supabase: ${error.message}`);
  }

  return data as OutcomeRow;
}

export async function getRecentDiagnosisCount(userId?: string): Promise<number> {
  const activeUserId = userId || "local";
  if (activeUserId === "local") {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const localList = readLocalDiagnoses();
    return localList.filter(
      (d) => new Date(d.created_at).getTime() > oneDayAgo
    ).length;
  }

  const supabase = await getSupabaseClient();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { count, error } = await supabase
    .from("diagnosis")
    .select("*", { count: "exact", head: true })
    .gt("created_at", oneDayAgo);

  if (error) {
    console.error("Error checking rate limit:", error);
    return 0;
  }

  return count ?? 0;
}

