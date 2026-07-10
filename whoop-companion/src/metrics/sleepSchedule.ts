/**
 * Learns a practical sleep schedule from reliable locally-scored nights. Clock
 * times are deliberately derived only from nights with enough strap coverage;
 * a partial sync should never move someone's suggested bedtime.
 */
export type SleepScheduleSource = 'history' | 'last_sleep' | 'fallback';

export type SleepSchedule = {
  bedMin: number;
  wakeMin: number;
  durationMin: number;
  source: SleepScheduleSource;
  sampleCount: number;
  regularityMin: number | null;
};

type SleepDay = {
  sleepStart: number | null;
  sleepEnd: number | null;
  sleepMin: number | null;
  sleepDetail: {
    confidence?: 'high' | 'medium' | 'low' | null;
    coveragePct?: number | null;
    source?: string | null;
  } | null;
};

const DEFAULT_BED_MIN = 23 * 60;
const DEFAULT_WAKE_MIN = 7 * 60;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function clockMinute(ts: number): number {
  const date = new Date(ts);
  return date.getHours() * 60 + date.getMinutes();
}

function nightMinute(ts: number): number {
  const minute = clockMinute(ts);
  // Keep after-midnight bedtimes next to late-evening ones for the median.
  return minute < 12 * 60 ? minute + 1440 : minute;
}

function circularDistance(a: number, b: number): number {
  const direct = Math.abs(a - b) % 1440;
  return Math.min(direct, 1440 - direct);
}

export const FALLBACK_SLEEP_SCHEDULE: SleepSchedule = {
  bedMin: DEFAULT_BED_MIN,
  wakeMin: DEFAULT_WAKE_MIN,
  durationMin: 8 * 60,
  source: 'fallback',
  sampleCount: 0,
  regularityMin: null,
};

export function inferSleepSchedule(days: SleepDay[]): SleepSchedule {
  const usable = days
    .filter((day) => {
      const duration = day.sleepStart != null && day.sleepEnd != null ? (day.sleepEnd - day.sleepStart) / 60000 : 0;
      const confidence = day.sleepDetail?.confidence;
      const coverage = day.sleepDetail?.coveragePct ?? 0;
      const manuallyTimed = day.sleepDetail?.source === 'manual_hr' || day.sleepDetail?.source === 'manual_duration';
      return duration >= 180 && duration <= 12 * 60 && (
        manuallyTimed ||
        (day.sleepMin != null && (confidence === 'high' || confidence === 'medium') && coverage >= 70)
      );
    })
    .slice(0, 14);
  if (!usable.length) return FALLBACK_SLEEP_SCHEDULE;

  const beds = usable.map((day) => nightMinute(day.sleepStart as number));
  const wakes = usable.map((day) => clockMinute(day.sleepEnd as number));
  const durations = usable.map((day) => Math.round(((day.sleepEnd as number) - (day.sleepStart as number)) / 60000));
  const bedMedian = median(beds);
  const wakeMedian = median(wakes);
  const regularity = median([
    ...beds.map((minute) => circularDistance(minute % 1440, bedMedian % 1440)),
    ...wakes.map((minute) => circularDistance(minute, wakeMedian)),
  ]);

  return {
    bedMin: bedMedian % 1440,
    wakeMin: wakeMedian,
    durationMin: median(durations),
    source: usable.length >= 3 ? 'history' : 'last_sleep',
    sampleCount: usable.length,
    regularityMin: Math.round(regularity),
  };
}
