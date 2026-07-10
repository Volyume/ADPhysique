import type { CardioRow, DailyMetricRow } from '../db/database';
import { sleepConsistency } from './sleepConsistency';
import { sleepTrustTier } from './sleepTrustWeight';
import { addDays, dayKey, startOfDayMs } from '../util/time';

export type WeeklyIntensity = {
  moderate: number;
  vigorous: number;
  total: number;
  goal: number;
};

export type WeeklyDay = {
  key: string;
  label: string;
  dateLabel: string;
  dayNumber: string;
  isToday: boolean;
  sleepMin: number | null;
  steps: number | null;
  activityCount: number;
  coverage: number;
};

export type WeeklyMetricKey = 'sleep' | 'consistency' | 'steps' | 'zones' | 'activities';
export type WeeklyMetricStatus = 'on-track' | 'building' | 'calibrating';

export type WeeklyMetric = {
  key: WeeklyMetricKey;
  title: string;
  current: number | null;
  goal: number | null;
  unit: string;
  progress: number;
  status: WeeklyMetricStatus;
  statusText: string;
  detail: string;
  color: string;
};

export type WeeklyRecommendation = {
  key: WeeklyMetricKey;
  title: string;
  body: string;
  action: string;
  icon: string;
};

export type WeeklyPlan = {
  weekStartMs: number;
  weekEndMs: number;
  daysElapsed: number;
  days: WeeklyDay[];
  metrics: WeeklyMetric[];
  recommendations: WeeklyRecommendation[];
  baselineDays: number;
  calibration: string | null;
};

type WeeklyPlanInput = {
  now?: number;
  today: DailyMetricRow | null;
  recentDays: DailyMetricRow[];
  cardio: CardioRow[];
  intensity: WeeklyIntensity | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;

/** Build a read-only plan from the local 30-day snapshot and this week's dates. */
export function buildWeeklyPlan(input: WeeklyPlanInput): WeeklyPlan {
  const now = input.now ?? Date.now();
  const todayKey = dayKey(now);
  const todayStart = startOfDayMs(now);
  const weekStartMs = mondayStart(now);
  const weekEndMs = addDays(weekStartMs, WEEK_DAYS);
  const daysElapsed = Math.min(WEEK_DAYS, Math.max(1, localDayOrdinal(todayStart) - localDayOrdinal(weekStartMs) + 1));

  const history = uniqueDays([...input.recentDays, input.today]);
  const byDay = new Map<string, DailyMetricRow>(history.map((day) => [day.day, day] as const));
  const activitiesByDay = countActivities(input.cardio);
  const days = Array.from({ length: WEEK_DAYS }, (_, index) => {
    const dateMs = addDays(weekStartMs, index);
    const key = dayKey(dateMs);
    const metric = byDay.get(key);
    const activityCount = activitiesByDay.get(key) ?? 0;
    const coverage = [metric?.sleepMin != null, metric?.steps != null, activityCount > 0].filter(Boolean).length / 3;
    const date = new Date(dateMs);
    return {
      key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2),
      dateLabel: date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
      dayNumber: String(date.getDate()),
      isToday: key === todayKey,
      sleepMin: metric?.sleepMin ?? null,
      steps: metric?.steps ?? null,
      activityCount,
      coverage,
    };
  });

  const sleepValues = history.filter(trustedSleep).map((day) => day.sleepMin as number);
  const sleepNeedValues = history
    .filter(trustedSleep)
    .map((day) => day.sleepDetail?.needMin)
    .filter((value): value is number => value != null && Number.isFinite(value) && value >= 240 && value <= 720);
  const stepValues = history.filter((day) => day.steps != null).map((day) => day.steps as number);
  const sleepWindows = history
    .filter((day) => trustedSleep(day) && day.sleepStart != null && day.sleepEnd != null)
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((day) => ({ startTs: day.sleepStart as number, endTs: day.sleepEnd as number }));
  const weekSleepWindows = days
    .map((day) => byDay.get(day.key))
    .filter((day): day is DailyMetricRow => day != null && trustedSleep(day) && day.sleepStart != null && day.sleepEnd != null)
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((day) => ({ startTs: day.sleepStart as number, endTs: day.sleepEnd as number }));
  const consistency = weekSleepWindows.length >= 3 ? sleepConsistency(weekSleepWindows)?.score ?? null : null;
  const activityValues = Array.from(activitiesByDay.values());
  const sleepGoalMin = sleepNeedValues.length >= 3
    ? roundTo(safeMedian(sleepNeedValues), 15)
    : sleepValues.length
      ? roundTo(safeMedian(sleepValues), 15)
      : 480;
  const stepGoal = stepValues.length ? roundTo(safeMedian(stepValues), 500) : 7000;
  const activityGoal = activityValues.length ? Math.max(1, Math.round((sum(activityValues) / 30) * 7)) : null;
  const zoneGoal = input.intensity?.goal ?? 150;

  const sleepCurrent = sum(days.map((day) => day.sleepMin).filter((value): value is number => value != null));
  const stepsCurrent = sum(days.map((day) => day.steps).filter((value): value is number => value != null));
  const activityCurrent = sum(days.map((day) => day.activityCount));
  const hasIntensity = input.intensity != null;
  const metrics: WeeklyMetric[] = [
    metric({
      key: 'sleep',
      title: 'Sleep duration',
      current: sleepCurrent,
      goal: sleepGoalMin * WEEK_DAYS,
      unit: 'min',
      detail: `${formatMinutes(sleepGoalMin)} nightly need`,
      color: '#7ba1bb',
      calibrated: sleepValues.length >= 3,
      calibrationText: 'Need 3 trusted nights',
      progressDays: daysElapsed,
    }),
    metric({
      key: 'consistency',
      title: 'Sleep consistency',
      current: consistency,
      goal: 80,
      unit: '%',
      detail: `${weekSleepWindows.length} trusted nights this week`,
      color: '#00f19f',
      calibrated: sleepWindows.length >= 3,
      calibrationText: 'Need 3 timed nights',
      progressDays: daysElapsed,
    }),
    metric({
      key: 'steps',
      title: 'Steps',
      current: stepsCurrent,
      goal: stepGoal * WEEK_DAYS,
      unit: 'steps',
      detail: `${stepGoal.toLocaleString()} daily baseline`,
      color: '#43cb00',
      calibrated: stepValues.length >= 5,
      calibrationText: 'Need 5 synced days',
      progressDays: daysElapsed,
    }),
    metric({
      key: 'zones',
      title: 'Moderate / vigorous',
      current: hasIntensity ? input.intensity!.total : null,
      goal: zoneGoal,
      unit: 'weighted min',
      detail: hasIntensity ? `M ${input.intensity!.moderate} - V ${input.intensity!.vigorous} (vigorous x2)` : 'Waiting for HR zone data',
      color: '#0093e7',
      calibrated: hasIntensity,
      calibrationText: 'Sync HR zone data',
      progressDays: daysElapsed,
    }),
    metric({
      key: 'activities',
      title: 'Activity count',
      current: activityCurrent,
      goal: activityGoal,
      unit: 'activities',
      detail: activityGoal != null ? `${activityGoal} logged activities is your 30-day pace` : 'Log activities to set a personal pace',
      color: '#ffde00',
      calibrated: activityValues.length >= 5,
      calibrationText: 'Need 5 logged days',
      progressDays: daysElapsed,
    }),
  ];

  const calibration = calibrationMessage({ sleepValues, stepValues, activityValues, hasIntensity });
  return {
    weekStartMs,
    weekEndMs,
    daysElapsed,
    days,
    metrics,
    recommendations: recommendations(metrics, daysElapsed),
    baselineDays: history.length,
    calibration,
  };
}

function metric(input: {
  key: WeeklyMetricKey;
  title: string;
  current: number | null;
  goal: number | null;
  unit: string;
  detail: string;
  color: string;
  calibrated: boolean;
  calibrationText: string;
  progressDays: number;
}): WeeklyMetric {
  const { current, goal } = input;
  const progress = current != null && goal != null && goal > 0 ? Math.min(1, current / goal) : 0;
  const expected = current != null && goal != null ? (goal * input.progressDays) / WEEK_DAYS : 0;
  const status: WeeklyMetricStatus = !input.calibrated ? 'calibrating' : current == null || goal == null ? 'calibrating' : current >= expected * 0.9 ? 'on-track' : 'building';
  return {
    key: input.key,
    title: input.title,
    current,
    goal,
    unit: input.unit,
    progress,
    status,
    statusText: status === 'calibrating' ? input.calibrationText : status === 'on-track' ? 'On track' : 'Build this week',
    detail: input.detail,
    color: input.color,
  };
}

function recommendations(metrics: WeeklyMetric[], daysElapsed: number): WeeklyRecommendation[] {
  const byKey = new Map<WeeklyMetricKey, WeeklyMetric>(metrics.map((item) => [item.key, item] as const));
  const candidates: WeeklyRecommendation[] = [];
  const sleep = byKey.get('sleep');
  const consistency = byKey.get('consistency');
  const zones = byKey.get('zones');
  const steps = byKey.get('steps');
  const activities = byKey.get('activities');

  if (sleep?.status === 'building') {
    candidates.push({ key: 'sleep', title: 'Protect tonight\'s sleep window', body: 'Your sleep total is below the pace set by your 30-day baseline.', action: 'Open Sleep Coach', icon: 'moon' });
  } else if (consistency?.status === 'building') {
    candidates.push({ key: 'consistency', title: 'Keep your sleep times close', body: 'Bed and wake timing is drifting from the consistency target.', action: 'Open Sleep Coach', icon: 'moon' });
  }
  if (zones?.status === 'building') {
    candidates.push({ key: 'zones', title: 'Add a measured aerobic block', body: 'A moderate session would bring zone minutes closer to this week\'s pace.', action: 'Start a workout', icon: 'flash' });
  }
  if (steps?.status === 'building') {
    candidates.push({ key: 'steps', title: 'Use a short walk to close the gap', body: 'Steps are trailing the personal daily baseline from your local history.', action: 'View step trend', icon: 'footsteps' });
  }
  if (activities?.status === 'building') {
    candidates.push({ key: 'activities', title: 'Put one activity on the calendar', body: 'Your logged activity pace is light versus the 30-day pattern.', action: 'Start a workout', icon: 'add-circle' });
  }
  if (!candidates.length) {
    candidates.push({ key: 'sleep', title: 'Keep the rhythm steady', body: `The plan is on pace after ${daysElapsed} day${daysElapsed === 1 ? '' : 's'} of this week. Repeat the basics tonight.`, action: 'Open Sleep Coach', icon: 'moon' });
  }
  return candidates.slice(0, 3);
}

function calibrationMessage(input: { sleepValues: number[]; stepValues: number[]; activityValues: number[]; hasIntensity: boolean }): string | null {
  const needs: string[] = [];
  if (input.sleepValues.length < 3) needs.push('3 trusted sleep nights');
  if (input.stepValues.length < 5) needs.push('5 synced step days');
  if (input.activityValues.length < 5) needs.push('5 logged activity days');
  if (!input.hasIntensity) needs.push('one HR zone sync');
  return needs.length ? `Calibrating: ${needs.join(', ')} will sharpen this plan.` : null;
}

function uniqueDays(days: Array<DailyMetricRow | null>): DailyMetricRow[] {
  const map = new Map<string, DailyMetricRow>();
  for (const day of days) if (day) map.set(day.day, day);
  return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
}

function countActivities(cardio: CardioRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const activity of cardio) {
    if (activity.source === 'nap' || activity.endTs <= activity.startTs) continue;
    const key = dayKey(activity.startTs);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function trustedSleep(day: DailyMetricRow): boolean {
  const tier = sleepTrustTier(day.sleepDetail);
  return day.sleepMin != null && (tier === 'high' || tier === 'medium');
}

function localDayOrdinal(ms: number): number {
  const date = new Date(ms);
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

function mondayStart(ms: number): number {
  const start = startOfDayMs(ms);
  const day = new Date(start).getDay();
  const offset = day === 0 ? 6 : day - 1;
  const monday = new Date(start);
  monday.setDate(monday.getDate() - offset);
  return monday.getTime();
}

function safeMedian(values: number[]): number {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function roundTo(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}
