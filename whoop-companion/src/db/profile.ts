/** User profile (age/sex/resting HR/max HR) — needed for strain + zones. */

import { kvGet, kvSet } from './database';
import type { UserProfile } from '../metrics/strain';

const KEY = 'profile';

export const DEFAULT_PROFILE: UserProfile = {
  ageYears: 35,
  sex: 'male',
  restingHr: 55,
};

export async function loadProfile(): Promise<UserProfile> {
  const raw = await kvGet(KEY);
  if (!raw) return DEFAULT_PROFILE;
  try {
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<UserProfile>) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(p: UserProfile): Promise<void> {
  await kvSet(KEY, JSON.stringify(p));
}
