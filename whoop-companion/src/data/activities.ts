/**
 * Unified activity catalogue — the single source of truth for selectable
 * activities across the app (live-workout picker, manual log, GPS gating and
 * strain coaching). Coverage mirrors the Garmin/WHOOP standard activity set,
 * grouped into categories, each tagged with:
 *   - gps:    does it use phone GPS (distance/route)?  (WHOOP SportDto.has_gps)
 *   - strain: cardio | muscular | noncardio  (drives Strain coaching copy)
 *   - icon:   Ionicons glyph
 */

import type { Ionicons } from '@expo/vector-icons';

export type StrainCategory = 'cardio' | 'muscular' | 'noncardio';
export type ActivityType = {
  name: string;
  category: string;
  gps: boolean;
  strain: StrainCategory;
  icon: keyof typeof Ionicons.glyphMap;
};

const C = 'cardio' as const;
const M = 'muscular' as const;
const N = 'noncardio' as const;

export const ACTIVITY_CATALOGUE: ActivityType[] = [
  // Running
  { name: 'Running', category: 'Running', gps: true, strain: C, icon: 'walk' },
  { name: 'Treadmill', category: 'Running', gps: false, strain: C, icon: 'walk' },
  { name: 'Trail Running', category: 'Running', gps: true, strain: C, icon: 'trail-sign' },
  { name: 'Track Running', category: 'Running', gps: true, strain: C, icon: 'walk' },
  { name: 'Ultra Run', category: 'Running', gps: true, strain: C, icon: 'walk' },
  // Cycling
  { name: 'Cycling', category: 'Cycling', gps: true, strain: C, icon: 'bicycle' },
  { name: 'Indoor Cycling', category: 'Cycling', gps: false, strain: C, icon: 'bicycle' },
  { name: 'Spin', category: 'Cycling', gps: false, strain: C, icon: 'bicycle' },
  { name: 'Mountain Biking', category: 'Cycling', gps: true, strain: C, icon: 'bicycle' },
  { name: 'Gravel Cycling', category: 'Cycling', gps: true, strain: C, icon: 'bicycle' },
  { name: 'eBiking', category: 'Cycling', gps: true, strain: C, icon: 'bicycle' },
  // Swimming
  { name: 'Pool Swim', category: 'Swimming', gps: false, strain: C, icon: 'water' },
  { name: 'Open Water Swim', category: 'Swimming', gps: true, strain: C, icon: 'water' },
  // Walking & Hiking
  { name: 'Walking', category: 'Walking & Hiking', gps: true, strain: N, icon: 'walk' },
  { name: 'Hiking', category: 'Walking & Hiking', gps: true, strain: C, icon: 'trail-sign' },
  { name: 'Rucking', category: 'Walking & Hiking', gps: true, strain: C, icon: 'trail-sign' },
  // Gym & Fitness
  { name: 'Strength Training', category: 'Gym & Fitness', gps: false, strain: M, icon: 'barbell' },
  { name: 'Weightlifting', category: 'Gym & Fitness', gps: false, strain: M, icon: 'barbell' },
  { name: 'Powerlifting', category: 'Gym & Fitness', gps: false, strain: M, icon: 'barbell' },
  { name: 'Functional Fitness', category: 'Gym & Fitness', gps: false, strain: M, icon: 'barbell' },
  { name: 'CrossFit', category: 'Gym & Fitness', gps: false, strain: M, icon: 'barbell' },
  { name: 'Bodyweight', category: 'Gym & Fitness', gps: false, strain: M, icon: 'body' },
  { name: 'Core', category: 'Gym & Fitness', gps: false, strain: M, icon: 'body' },
  { name: 'HIIT', category: 'Gym & Fitness', gps: false, strain: C, icon: 'flash' },
  // Cardio
  { name: 'Elliptical', category: 'Cardio', gps: false, strain: C, icon: 'fitness' },
  { name: 'Stair Stepper', category: 'Cardio', gps: false, strain: C, icon: 'fitness' },
  { name: 'Rowing', category: 'Cardio', gps: false, strain: C, icon: 'fitness' },
  { name: 'Jump Rope', category: 'Cardio', gps: false, strain: C, icon: 'fitness' },
  { name: 'Cardio', category: 'Cardio', gps: false, strain: C, icon: 'fitness' },
  // Mind & Body
  { name: 'Yoga', category: 'Mind & Body', gps: false, strain: N, icon: 'leaf' },
  { name: 'Pilates', category: 'Mind & Body', gps: false, strain: N, icon: 'leaf' },
  { name: 'Stretching', category: 'Mind & Body', gps: false, strain: N, icon: 'leaf' },
  { name: 'Meditation', category: 'Mind & Body', gps: false, strain: N, icon: 'leaf' },
  { name: 'Breathwork', category: 'Mind & Body', gps: false, strain: N, icon: 'leaf' },
  // Team Sports
  { name: 'Football', category: 'Team Sports', gps: true, strain: C, icon: 'football' },
  { name: 'Soccer', category: 'Team Sports', gps: true, strain: C, icon: 'football' },
  { name: 'Basketball', category: 'Team Sports', gps: false, strain: C, icon: 'basketball' },
  { name: 'Rugby', category: 'Team Sports', gps: true, strain: C, icon: 'american-football' },
  { name: 'Hockey', category: 'Team Sports', gps: false, strain: C, icon: 'fitness' },
  { name: 'Volleyball', category: 'Team Sports', gps: false, strain: C, icon: 'fitness' },
  // Racquet Sports
  { name: 'Tennis', category: 'Racquet Sports', gps: false, strain: C, icon: 'tennisball' },
  { name: 'Padel', category: 'Racquet Sports', gps: false, strain: C, icon: 'tennisball' },
  { name: 'Squash', category: 'Racquet Sports', gps: false, strain: C, icon: 'tennisball' },
  { name: 'Badminton', category: 'Racquet Sports', gps: false, strain: C, icon: 'tennisball' },
  { name: 'Pickleball', category: 'Racquet Sports', gps: false, strain: C, icon: 'tennisball' },
  // Outdoor
  { name: 'Golf', category: 'Outdoor', gps: true, strain: N, icon: 'golf' },
  { name: 'Rock Climbing', category: 'Outdoor', gps: false, strain: M, icon: 'trail-sign' },
  { name: 'Skiing', category: 'Outdoor', gps: true, strain: C, icon: 'snow' },
  { name: 'Snowboarding', category: 'Outdoor', gps: true, strain: C, icon: 'snow' },
  { name: 'Skating', category: 'Outdoor', gps: true, strain: C, icon: 'fitness' },
  // Water Sports
  { name: 'Kayaking', category: 'Water Sports', gps: true, strain: C, icon: 'boat' },
  { name: 'Paddleboarding', category: 'Water Sports', gps: true, strain: C, icon: 'boat' },
  { name: 'Surfing', category: 'Water Sports', gps: false, strain: C, icon: 'water' },
  // Combat
  { name: 'Boxing', category: 'Combat', gps: false, strain: C, icon: 'fitness' },
  { name: 'Martial Arts', category: 'Combat', gps: false, strain: C, icon: 'fitness' },
  // Other
  { name: 'Other', category: 'Other', gps: false, strain: C, icon: 'ellipsis-horizontal' },
];

export const ACTIVITY_CATEGORIES: string[] = ACTIVITY_CATALOGUE.reduce<string[]>((acc, a) => {
  if (!acc.includes(a.category)) acc.push(a.category);
  return acc;
}, []);

const BY_NAME = new Map(ACTIVITY_CATALOGUE.map((a) => [a.name.toLowerCase(), a]));

// Keyword fallback for legacy/short labels ("Run", "Cycle", "Strength", …).
const KEYWORDS: Array<[string[], Pick<ActivityType, 'gps' | 'strain'>]> = [
  [['run', 'jog'], { gps: true, strain: 'cardio' }],
  [['cycl', 'bike', 'spin'], { gps: true, strain: 'cardio' }],
  [['ruck'], { gps: true, strain: 'cardio' }],
  [['walk'], { gps: true, strain: 'noncardio' }],
  [['hik'], { gps: true, strain: 'cardio' }],
  [['strength', 'lift', 'weight', 'crossfit', 'functional', 'powerlif'], { gps: false, strain: 'muscular' }],
  [['yoga', 'pilates', 'stretch', 'meditat', 'breath'], { gps: false, strain: 'noncardio' }],
];

export function findActivity(name: string): ActivityType | undefined {
  return BY_NAME.get(name.toLowerCase());
}

export function activityGps(name: string): boolean {
  const a = findActivity(name);
  if (a) return a.gps;
  const l = name.toLowerCase();
  for (const [keys, v] of KEYWORDS) if (keys.some((k) => l.includes(k))) return v.gps;
  return false;
}

export function activityUsesSteps(name: string): boolean {
  const l = name.toLowerCase();
  if (/(cycl|bike|spin|swim|row|kayak|paddle|surf|yoga|pilates|stretch|meditat|breath|strength|lift|barbell|boxing|martial)/.test(l)) {
    return false;
  }
  return /(run|walk|hik|ruck|golf|football|soccer|rugby|basketball|tennis|padel|squash|badminton|pickleball|volleyball|hockey|skating|ski)/.test(l);
}

export function activityStrainCategory(name: string): StrainCategory {
  const a = findActivity(name);
  if (a) return a.strain;
  const l = name.toLowerCase();
  for (const [keys, v] of KEYWORDS) if (keys.some((k) => l.includes(k))) return v.strain;
  return 'cardio';
}
