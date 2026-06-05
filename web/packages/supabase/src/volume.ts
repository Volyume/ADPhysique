// Volume landmarks + status, ported from the mobile app's algorithms.js (kept in
// sync by hand; the values here match VOLUME_LANDMARKS after the 2026-06-05
// recalibration). Weekly working-set landmarks per muscle:
//   mev = minimum effective volume, mav = maximum adaptive volume,
//   mrv = maximum recoverable volume.
// Secondary (synergist) muscles are credited at 0.5 of a set, exactly as the
// app's calculateWeeklyVolume does.

export interface Landmarks {
  mv: number;
  mev: number;
  mav: number;
  mrv: number;
}

export const VOLUME_LANDMARKS: Record<string, Landmarks> = {
  chest: { mv: 4, mev: 6, mav: 14, mrv: 22 },
  back: { mv: 8, mev: 10, mav: 16, mrv: 25 },
  front_delts: { mv: 0, mev: 0, mav: 8, mrv: 14 },
  side_delts: { mv: 0, mev: 8, mav: 16, mrv: 26 },
  rear_delts: { mv: 0, mev: 6, mav: 16, mrv: 24 },
  biceps: { mv: 5, mev: 6, mav: 14, mrv: 22 },
  triceps: { mv: 4, mev: 6, mav: 14, mrv: 22 },
  forearms: { mv: 2, mev: 4, mav: 16, mrv: 22 },
  quads: { mv: 6, mev: 8, mav: 14, mrv: 20 },
  hamstrings: { mv: 4, mev: 6, mav: 14, mrv: 20 },
  glutes: { mv: 0, mev: 4, mav: 14, mrv: 22 },
  adductors: { mv: 0, mev: 0, mav: 10, mrv: 14 },
  calves: { mv: 6, mev: 8, mav: 14, mrv: 20 },
  abs: { mv: 0, mev: 4, mav: 16, mrv: 25 },
  traps: { mv: 0, mev: 4, mav: 14, mrv: 24 },
  neck: { mv: 0, mev: 2, mav: 8, mrv: 12 },
  tibialis: { mv: 0, mev: 2, mav: 8, mrv: 12 },
};

export const MUSCLE_DISPLAY_NAMES: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  front_delts: 'Front delts',
  side_delts: 'Side delts',
  rear_delts: 'Rear delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  adductors: 'Adductors',
  calves: 'Calves',
  abs: 'Abs',
  traps: 'Traps',
  neck: 'Neck',
  tibialis: 'Tibialis',
};

// Display order for the heatmap, grouped roughly head to toe like the app.
export const MUSCLE_ORDER: string[] = [
  'chest',
  'back',
  'front_delts',
  'side_delts',
  'rear_delts',
  'biceps',
  'triceps',
  'forearms',
  'traps',
  'abs',
  'quads',
  'hamstrings',
  'glutes',
  'adductors',
  'calves',
  'tibialis',
  'neck',
];

export const SECONDARY_CONTRIBUTION = 0.5;

export type VolumeStatus = 'unknown' | 'below' | 'minimum' | 'optimal' | 'near_mrv' | 'over_mrv';

// Ported verbatim from algorithms.js getVolumeStatus (status only).
export function getVolumeStatus(workingSets: number, muscle: string): VolumeStatus {
  const landmarks = VOLUME_LANDMARKS[muscle];
  if (!landmarks) return 'unknown';
  const { mev, mav, mrv } = landmarks;
  if (!Number.isFinite(workingSets) || workingSets <= 0) return 'below';
  if (workingSets < mev) return 'below';
  if (mev > 0 && workingSets <= mev + 2) return 'minimum';
  if (workingSets <= mav) return 'optimal';
  if (workingSets <= mrv) return 'near_mrv';
  return 'over_mrv';
}

// CSS variable colour for a status, matching the mobile volume band palette.
export function volumeStatusColorVar(status: VolumeStatus): string {
  switch (status) {
    case 'optimal':
      return 'var(--c-success)';
    case 'minimum':
    case 'near_mrv':
      return 'var(--c-warning)';
    case 'over_mrv':
      return 'var(--c-error)';
    default:
      return 'var(--c-textMuted)';
  }
}
