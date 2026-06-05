import type { SupabaseClient } from '@supabase/supabase-js';
import {
  VOLUME_LANDMARKS,
  MUSCLE_DISPLAY_NAMES,
  MUSCLE_ORDER,
  SECONDARY_CONTRIBUTION,
  getVolumeStatus,
  type Landmarks,
  type VolumeStatus,
} from '../volume';
import { libraryById, estimatedOneRepMax, type ResolvedExercise } from '../exerciseLibrary';
import { ewma, weeklyRate } from '../stats';
import { TABLES } from '../tables';

type Client = SupabaseClient;

interface WorkingSet {
  exercise_id: string;
  weight: number | null;
  actual_reps: number | null;
  t: number; // workout day, epoch ms
}

// Resolve the user's custom (non-library) exercises from the cloud `exercises`
// row, since those carry random ids the bundled library does not have.
async function customExercises(supabase: Client, userId: string): Promise<Map<string, ResolvedExercise>> {
  const m = new Map<string, ResolvedExercise>();
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, primary_muscle, secondary_muscles')
    .eq('user_id', userId);
  if (error) return m;
  for (const e of (data ?? []) as Array<Record<string, unknown>>) {
    let secondary: string[] = [];
    const raw = e.secondary_muscles;
    if (typeof raw === 'string') {
      try {
        secondary = JSON.parse(raw) as string[];
      } catch {
        secondary = raw.split(',').map((s) => s.trim()).filter(Boolean);
      }
    } else if (Array.isArray(raw)) {
      secondary = raw as string[];
    }
    m.set(String(e.id), {
      id: String(e.id),
      name: String(e.name ?? 'Exercise'),
      primary: String(e.primary_muscle ?? ''),
      secondary,
    });
  }
  return m;
}

// Completed workouts in the window plus their working sets, each tagged with the
// workout's day (ended_at, falling back to started_at).
async function fetchWorkingSets(supabase: Client, userId: string, sinceISO: string): Promise<WorkingSet[]> {
  const { data: workouts, error: wErr } = await supabase
    .from(TABLES.workouts)
    .select('id, started_at, ended_at, is_completed')
    .eq('user_id', userId)
    .gte('started_at', sinceISO)
    .limit(2000);
  if (wErr) throw wErr;
  const completed = (workouts ?? []).filter((w: Record<string, unknown>) => w.is_completed);
  if (completed.length === 0) return [];
  const dayById = new Map<string, number>();
  for (const w of completed as Array<Record<string, unknown>>) {
    const iso = (w.ended_at as string) ?? (w.started_at as string) ?? null;
    dayById.set(String(w.id), iso ? Date.parse(iso) : NaN);
  }
  const ids = [...dayById.keys()];

  const { data: sets, error: sErr } = await supabase
    .from(TABLES.workoutSets)
    .select('workout_id, exercise_id, set_type, actual_reps, weight')
    .eq('user_id', userId)
    .in('workout_id', ids)
    .limit(20000);
  if (sErr) throw sErr;

  return (sets ?? [])
    .filter((s: Record<string, unknown>) => s.set_type !== 'warmup')
    .map((s: Record<string, unknown>) => ({
      exercise_id: String(s.exercise_id),
      weight: (s.weight as number) ?? null,
      actual_reps: (s.actual_reps as number) ?? null,
      t: dayById.get(String(s.workout_id)) ?? NaN,
    }));
}

export interface MuscleVolume {
  muscle: string;
  name: string;
  sets: number;
  landmarks: Landmarks;
  status: VolumeStatus;
}

// Weekly working-set volume per muscle: primary at 1.0, each secondary at 0.5,
// exactly as the app. Used by the heatmap with the recalibrated bands.
export async function getMuscleVolume(
  supabase: Client,
  userId: string,
  sinceISO: string,
): Promise<MuscleVolume[]> {
  const [sets, custom] = await Promise.all([
    fetchWorkingSets(supabase, userId, sinceISO),
    customExercises(supabase, userId),
  ]);
  const lib = libraryById();
  const totals: Record<string, number> = {};
  const add = (m: string, n: number) => {
    if (!m) return;
    totals[m] = (totals[m] ?? 0) + n;
  };
  for (const s of sets) {
    const ex = lib.get(s.exercise_id) ?? custom.get(s.exercise_id);
    if (!ex) continue;
    add(ex.primary, 1);
    for (const sec of ex.secondary) add(sec, SECONDARY_CONTRIBUTION);
  }
  return MUSCLE_ORDER.map((muscle) => {
    const sets = Math.round((totals[muscle] ?? 0) * 10) / 10;
    return {
      muscle,
      name: MUSCLE_DISPLAY_NAMES[muscle] ?? muscle,
      sets,
      landmarks: VOLUME_LANDMARKS[muscle]!,
      status: getVolumeStatus(sets, muscle),
    };
  });
}

export interface LiftSeriesPoint {
  t: number;
  e1rm: number;
  topWeight: number;
}
export interface LiftProgress {
  id: string;
  name: string;
  series: LiftSeriesPoint[];
}

// Per-lift estimated-1RM and top-set weight, one point per training day.
export async function getLifts(supabase: Client, userId: string, sinceISO: string): Promise<LiftProgress[]> {
  const [sets, custom] = await Promise.all([
    fetchWorkingSets(supabase, userId, sinceISO),
    customExercises(supabase, userId),
  ]);
  const lib = libraryById();
  const byEx = new Map<string, { id: string; name: string; byDay: Map<number, { e1rm: number; topWeight: number }> }>();
  for (const s of sets) {
    if (!Number.isFinite(s.t) || !s.weight || !s.actual_reps) continue;
    const ex = lib.get(s.exercise_id) ?? custom.get(s.exercise_id);
    if (!ex) continue;
    const e1 = estimatedOneRepMax(s.weight, s.actual_reps);
    if (e1 <= 0) continue;
    let rec = byEx.get(ex.id);
    if (!rec) {
      rec = { id: ex.id, name: ex.name, byDay: new Map() };
      byEx.set(ex.id, rec);
    }
    const cur = rec.byDay.get(s.t) ?? { e1rm: 0, topWeight: 0 };
    if (e1 > cur.e1rm) cur.e1rm = e1;
    if (s.weight > cur.topWeight) cur.topWeight = s.weight;
    rec.byDay.set(s.t, cur);
  }
  return [...byEx.values()]
    .map((r) => ({
      id: r.id,
      name: r.name,
      series: [...r.byDay.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([t, v]) => ({ t, e1rm: Math.round(v.e1rm * 10) / 10, topWeight: v.topWeight })),
    }))
    .filter((l) => l.series.length >= 1)
    .sort((a, b) => b.series.length - a.series.length || a.name.localeCompare(b.name));
}

export interface PR {
  id: string;
  name: string;
  e1rm: number;
  t: number;
}

// Best estimated-1RM per lift in the window, sorted strongest first.
export async function getPRs(supabase: Client, userId: string, sinceISO: string): Promise<PR[]> {
  const lifts = await getLifts(supabase, userId, sinceISO);
  return lifts
    .map((l) => {
      let best = { e1rm: 0, t: NaN };
      for (const p of l.series) if (p.e1rm > best.e1rm) best = { e1rm: p.e1rm, t: p.t };
      return { id: l.id, name: l.name, e1rm: best.e1rm, t: best.t };
    })
    .filter((p) => p.e1rm > 0)
    .sort((a, b) => b.e1rm - a.e1rm);
}

export interface BodyTrend {
  raw: { t: number; v: number }[];
  ewma: { t: number; v: number }[];
  ratePerWeek: number | null;
}

// Morning-weight raw points + EWMA trend over the window.
export async function getBodyTrend(supabase: Client, userId: string, sinceISO: string): Promise<BodyTrend> {
  const { data, error } = await supabase
    .from(TABLES.morningWeights)
    .select('weight_kg, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', sinceISO)
    .order('logged_at', { ascending: true })
    .limit(2000);
  if (error) throw error;
  const pts = (data ?? [])
    .filter((r: Record<string, unknown>) => r.weight_kg != null && r.logged_at != null)
    .map((r: Record<string, unknown>) => ({ t: Date.parse(r.logged_at as string), v: r.weight_kg as number }));
  const smoothed = ewma(pts.map((p) => p.v));
  return {
    raw: pts,
    ewma: pts.map((p, i) => ({ t: p.t, v: smoothed[i] ?? p.v })),
    ratePerWeek: weeklyRate(pts),
  };
}
