import type { SupabaseClient } from '@supabase/supabase-js';
import {
  TABLES,
  type MorningWeightRow,
  type NutritionTargetRow,
  type DailyIntakeRollupRow,
  type WorkoutRow,
  type CoachOutputRow,
  type CoachOutputPayload,
} from '../tables';
import { ewma, weeklyRate } from '../stats';

export interface WeightSummary {
  latestKg: number | null;
  ratePerWeek: number | null;
  series: number[]; // EWMA-smoothed, for the hero sparkline
}

export interface PlanSummary {
  name: string | null;
  weekOf: number | null;
  totalWeeks: number | null;
  phase: string | null;
}

export interface ThisWeekSummary {
  sessionsDone: number;
  lastSessionName: string | null;
  volumeSeries: number[];
}

export interface CoachingSummary {
  headline: string | null;
  whyThis: string | null;
  weekStart: number | null;
}

export interface NutritionSummary {
  kcal: number | null;
  kcalTarget: number | null;
  protein: number | null;
  proteinTarget: number | null;
}

export interface DashboardData {
  weight: WeightSummary | null;
  plan: PlanSummary | null;
  thisWeek: ThisWeekSummary | null;
  coaching: CoachingSummary | null;
  nutrition: NutritionSummary | null;
  // Names of the sections whose read failed, so the UI can show a quiet
  // "couldn't load" on just that strip rather than blanking the page.
  failed: string[];
}

type Client = SupabaseClient;

interface DashboardArgs {
  todayKey: string; // local UK day-key YYYY-MM-DD
  weekStartISO: string; // local week start (Monday) as ISO
}

async function loadWeight(supabase: Client, userId: string): Promise<WeightSummary | null> {
  const { data, error } = await supabase
    .from(TABLES.morningWeights)
    .select('weight_kg, logged_at')
    .eq('user_id', userId)
    .order('logged_at', { ascending: true })
    .limit(120);
  if (error) throw error;
  const rows = (data ?? []) as Pick<MorningWeightRow, 'weight_kg' | 'logged_at'>[];
  const points = rows
    .filter((r) => r.weight_kg != null && r.logged_at != null)
    .map((r) => ({ t: Date.parse(r.logged_at as string), v: r.weight_kg as number }));
  if (points.length === 0) return { latestKg: null, ratePerWeek: null, series: [] };
  const series = ewma(points.map((p) => p.v));
  return {
    latestKg: points[points.length - 1]!.v,
    ratePerWeek: weeklyRate(points),
    series: series.slice(-30),
  };
}

async function loadPlan(supabase: Client, userId: string): Promise<PlanSummary | null> {
  // Most recently updated programme is treated as active. Columns vary across
  // the schema, so read defensively and only surface what is present.
  const { data, error } = await supabase
    .from(TABLES.programmes)
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  const p = (data ?? [])[0] as Record<string, unknown> | undefined;
  if (!p) return null;
  const str = (k: string) => (typeof p[k] === 'string' ? (p[k] as string) : null);
  const num = (k: string) => (typeof p[k] === 'number' ? (p[k] as number) : null);
  return {
    name: str('name') ?? str('title'),
    weekOf: num('current_week') ?? num('week'),
    totalWeeks: num('total_weeks') ?? num('weeks'),
    phase: str('phase') ?? str('goal_phase'),
  };
}

async function loadThisWeek(
  supabase: Client,
  userId: string,
  weekStartISO: string,
): Promise<ThisWeekSummary> {
  const { data, error } = await supabase
    .from(TABLES.workouts)
    .select('name, started_at, is_completed, total_volume')
    .eq('user_id', userId)
    .gte('started_at', weekStartISO)
    .order('started_at', { ascending: true })
    .limit(50);
  if (error) throw error;
  const rows = (data ?? []) as Pick<
    WorkoutRow,
    'name' | 'started_at' | 'is_completed' | 'total_volume'
  >[];
  const done = rows.filter((r) => r.is_completed);
  return {
    sessionsDone: done.length,
    lastSessionName: done.length ? (done[done.length - 1]!.name ?? null) : null,
    volumeSeries: rows.map((r) => r.total_volume ?? 0),
  };
}

async function loadCoaching(supabase: Client, userId: string): Promise<CoachingSummary | null> {
  const { data, error } = await supabase
    .from(TABLES.coachOutputs)
    .select('week_start, output_json')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(1);
  if (error) throw error;
  const row = (data ?? [])[0] as Pick<CoachOutputRow, 'week_start' | 'output_json'> | undefined;
  if (!row) return null;
  let payload: CoachOutputPayload = {};
  if (row.output_json) {
    try {
      payload = JSON.parse(row.output_json) as CoachOutputPayload;
    } catch {
      payload = {};
    }
  }
  const whyThis = payload.whyThis ?? payload.why_this ?? null;
  return {
    headline: payload.headline ?? null,
    whyThis: whyThis ?? null,
    weekStart: row.week_start ?? null,
  };
}

async function loadNutrition(
  supabase: Client,
  userId: string,
  todayKey: string,
): Promise<NutritionSummary> {
  const [rollupRes, targetRes] = await Promise.all([
    supabase
      .from(TABLES.dailyIntakeRollups)
      .select('kcal_total, protein_g')
      .eq('user_id', userId)
      .eq('entry_date', todayKey)
      .maybeSingle(),
    supabase
      .from(TABLES.nutritionTargets)
      .select('target_kcal, protein_g')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);
  if (targetRes.error) throw targetRes.error;
  // The rollup cloud shape is unconfirmed; a failure there is non-fatal.
  const rollup = (rollupRes.data ?? null) as Pick<
    DailyIntakeRollupRow,
    'kcal_total' | 'protein_g'
  > | null;
  const target = (targetRes.data ?? null) as Pick<
    NutritionTargetRow,
    'target_kcal' | 'protein_g'
  > | null;
  return {
    kcal: rollup?.kcal_total ?? null,
    kcalTarget: target?.target_kcal ?? null,
    protein: rollup?.protein_g ?? null,
    proteinTarget: target?.protein_g ?? null,
  };
}

// Loads every dashboard strip in parallel, isolating failures so one broken
// section never blanks the page (it is listed in `failed` instead).
export async function getDashboardData(
  supabase: Client,
  userId: string,
  { todayKey, weekStartISO }: DashboardArgs,
): Promise<DashboardData> {
  const [weight, plan, thisWeek, coaching, nutrition] = await Promise.allSettled([
    loadWeight(supabase, userId),
    loadPlan(supabase, userId),
    loadThisWeek(supabase, userId, weekStartISO),
    loadCoaching(supabase, userId),
    loadNutrition(supabase, userId, todayKey),
  ]);

  const failed: string[] = [];
  const take = <T>(res: PromiseSettledResult<T>, name: string): T | null => {
    if (res.status === 'fulfilled') return res.value;
    failed.push(name);
    return null;
  };

  return {
    weight: take(weight, 'weight'),
    plan: take(plan, 'plan'),
    thisWeek: take(thisWeek, 'thisWeek'),
    coaching: take(coaching, 'coaching'),
    nutrition: take(nutrition, 'nutrition'),
    failed,
  };
}
