import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '../tables';
import { fetchCustomExercises, resolveExercise } from './exerciseResolve';

type Client = SupabaseClient;

export interface PlanExercise {
  id: string;
  name: string;
  primary: string;
  sets: number;
  repMin: number;
  repMax: number;
}

export interface PlanDay {
  id: string;
  name: string;
  splitType: string | null;
  exercises: PlanExercise[];
}

export interface ActivePlan {
  programmeName: string;
  description: string | null;
  mesocycle: {
    name: string | null;
    weekOf: number | null;
    totalWeeks: number | null;
    deloadWeek: number | null;
    focus: string | null;
  } | null;
  days: PlanDay[];
}

function truthy(v: unknown): boolean {
  return v === true || v === 1;
}

// Current week within a mesocycle from its start date, capped at the duration.
function weekOf(startDate: string | null, totalWeeks: number | null): number | null {
  if (!startDate) return null;
  const start = Date.parse(startDate);
  if (!Number.isFinite(start)) return null;
  const weeks = Math.floor((Date.now() - start) / (7 * 86_400_000)) + 1;
  if (weeks < 1) return 1;
  if (totalWeeks && weeks > totalWeeks) return totalWeeks;
  return weeks;
}

// The user's active plan: the active programme, its training days (routines)
// each with their exercises, plus the active mesocycle for week/deload context.
// View only; logging stays on mobile.
export async function getActivePlan(supabase: Client, userId: string): Promise<ActivePlan | null> {
  const { data: routineRows, error: rErr } = await supabase
    .from(TABLES.routines)
    .select('id, name, split_type, programme_id, is_active, is_library, is_sample, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(100);
  if (rErr) throw rErr;

  const active = (routineRows ?? []).filter(
    (r: Record<string, unknown>) => truthy(r.is_active) && !truthy(r.is_library) && !truthy(r.is_sample),
  ) as Array<Record<string, unknown>>;
  if (active.length === 0) return null;

  const programmeId = (active.find((r) => r.programme_id)?.programme_id as string) ?? null;
  let programmeName = 'Your plan';
  let description: string | null = null;
  let dayRows = active;

  if (programmeId) {
    const { data: prog } = await supabase
      .from(TABLES.programmes)
      .select('name, description')
      .eq('id', programmeId)
      .maybeSingle();
    if (prog) {
      programmeName = String((prog as Record<string, unknown>).name ?? 'Your plan');
      description = ((prog as Record<string, unknown>).description as string) ?? null;
    }
    dayRows = active.filter((r) => r.programme_id === programmeId);
  }

  const dayIds = dayRows.map((d) => String(d.id));
  const [{ data: reRows }, custom] = await Promise.all([
    supabase
      .from(TABLES.routineExercises)
      .select('routine_id, exercise_id, order_in_routine, recommended_sets, recommended_reps_min, recommended_reps_max')
      .in('routine_id', dayIds)
      .limit(4000),
    fetchCustomExercises(supabase, userId),
  ]);

  type OrderedExercise = PlanExercise & { order: number };
  const byRoutine = new Map<string, OrderedExercise[]>();
  for (const re of (reRows ?? []) as Array<Record<string, unknown>>) {
    const ex = resolveExercise(String(re.exercise_id), custom);
    const list = byRoutine.get(String(re.routine_id)) ?? [];
    list.push({
      id: String(re.exercise_id),
      name: ex?.name ?? 'Exercise',
      primary: ex?.primary ?? '',
      sets: (re.recommended_sets as number) ?? 3,
      repMin: (re.recommended_reps_min as number) ?? 0,
      repMax: (re.recommended_reps_max as number) ?? 0,
      order: (re.order_in_routine as number) ?? 0,
    });
    byRoutine.set(String(re.routine_id), list);
  }

  const days: PlanDay[] = dayRows.map((d) => {
    const exercises = (byRoutine.get(String(d.id)) ?? [])
      .sort((a, b) => a.order - b.order)
      .map(({ order, ...e }) => {
        void order;
        return e;
      });
    return {
      id: String(d.id),
      name: String(d.name ?? 'Day'),
      splitType: (d.split_type as string) ?? null,
      exercises,
    };
  });

  let mesocycle: ActivePlan['mesocycle'] = null;
  const { data: mesoRows } = await supabase
    .from(TABLES.mesocycles)
    .select('name, start_date, duration_weeks, deload_week, focus, is_active, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(20);
  const activeMeso = (mesoRows ?? []).find((m: Record<string, unknown>) => truthy(m.is_active)) as
    | Record<string, unknown>
    | undefined;
  if (activeMeso) {
    const totalWeeks = (activeMeso.duration_weeks as number) ?? null;
    mesocycle = {
      name: (activeMeso.name as string) ?? null,
      totalWeeks,
      weekOf: weekOf((activeMeso.start_date as string) ?? null, totalWeeks),
      deloadWeek: (activeMeso.deload_week as number) ?? null,
      focus: (activeMeso.focus as string) ?? null,
    };
  }

  return { programmeName, description, mesocycle, days };
}
