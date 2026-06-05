import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '../tables';

type Client = SupabaseClient;

export interface CoachAdjustment {
  signal?: string;
  note?: string | null;
  change?: number;
  target?: number;
  type?: string;
}

export interface CoachReview {
  weekStart: number; // epoch ms
  weekLabel: string | null;
  confidence: string | null;
  trend: { rateLabel?: string; deltaLabel?: string; onTarget?: boolean } | null;
  whatWorking: string[];
  adjustments: {
    training: CoachAdjustment | null;
    calories: CoachAdjustment | null;
    steps: CoachAdjustment | null;
    cardio: CoachAdjustment | null;
  };
  whyThisWeek: string | null;
  deloadSuggested: boolean;
  deloadNote: string | null;
  dietBreakSuggested: boolean;
  dietBreakNote: string | null;
  cardioFlag: string | null;
  cardioAcknowledgement: string | null;
}

function asAdjustment(v: unknown): CoachAdjustment | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  return {
    signal: typeof o.signal === 'string' ? o.signal : undefined,
    note: typeof o.note === 'string' ? o.note : null,
    change: typeof o.change === 'number' ? o.change : undefined,
    target: typeof o.target === 'number' ? o.target : undefined,
    type: typeof o.type === 'string' ? o.type : undefined,
  };
}

function parseReview(weekStart: number, json: string | null): CoachReview {
  let p: Record<string, unknown> = {};
  if (json) {
    try {
      p = JSON.parse(json) as Record<string, unknown>;
    } catch {
      p = {};
    }
  }
  const adj = (p.adjustments ?? {}) as Record<string, unknown>;
  const trend = (p.trend ?? null) as CoachReview['trend'];
  return {
    weekStart,
    weekLabel: typeof p.weekLabel === 'string' ? p.weekLabel : null,
    confidence: typeof p.confidence === 'string' ? p.confidence : null,
    trend,
    whatWorking: Array.isArray(p.whatWorking) ? (p.whatWorking as string[]) : [],
    adjustments: {
      training: asAdjustment(adj.training),
      calories: asAdjustment(adj.calories),
      steps: asAdjustment(adj.steps),
      cardio: asAdjustment(adj.cardio),
    },
    whyThisWeek:
      (typeof p.whyThisWeek === 'string' && p.whyThisWeek) ||
      (typeof p.whyThis === 'string' && p.whyThis) ||
      (typeof p.why_this === 'string' && p.why_this) ||
      null,
    deloadSuggested: !!p.deloadSuggested,
    deloadNote: typeof p.deloadNote === 'string' ? p.deloadNote : null,
    dietBreakSuggested: !!p.dietBreakSuggested,
    dietBreakNote: typeof p.dietBreakNote === 'string' ? p.dietBreakNote : null,
    cardioFlag: typeof p.cardioFlag === 'string' ? p.cardioFlag : null,
    cardioAcknowledgement: typeof p.cardioAcknowledgement === 'string' ? p.cardioAcknowledgement : null,
  };
}

// The Precision Coaching decision history, newest first. Each weekly review is
// parsed from coach_outputs.output_json (the top-level columns are minimal).
export async function getCoachingHistory(
  supabase: Client,
  userId: string,
  limit = 52,
): Promise<CoachReview[]> {
  const { data, error } = await supabase
    .from(TABLES.coachOutputs)
    .select('week_start, output_json')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) =>
    parseReview(Number(r.week_start), (r.output_json as string) ?? null),
  );
}
