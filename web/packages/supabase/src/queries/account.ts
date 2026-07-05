import type { SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient;
const PROFILE_TZ = 'Europe/London';

export interface AccountProfile {
  firstName: string | null;
  units: string | null;
  trainingFocus: string | null;
  dietPreference: string | null;
  primaryEquipment: string | null;
  barWeight: number | null;
  sex: string | null;
  age: number | null;
  heightCm: number | null;
  experienceLevel: string | null;
  primaryGoal: string | null;
  tier: string | null;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function parseDateOfBirthKey(dob: string | null): { year: number; month: number; day: number } | null {
  if (!dob) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

function londonDateParts(now: Date): { year: number; month: number; day: number } | null {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: PROFILE_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

export function ageYearsFromDateOfBirth(dob: string | null, now: Date = new Date()): number | null {
  const birth = parseDateOfBirthKey(dob);
  const today = londonDateParts(now);
  if (!birth || !today) return null;
  let age = today.year - birth.year;
  const birthdayPassed = today.month > birth.month || (today.month === birth.month && today.day >= birth.day);
  if (!birthdayPassed) age -= 1;
  return age > 0 && age < 130 ? age : null;
}

// Profile + body profile + the server-managed subscription tier. Read only:
// tier is never written from the web (Play Billing webhook + RPC own it).
export async function getAccountProfile(supabase: Client, userId: string): Promise<AccountProfile> {
  const [profileRes, bodyRes] = await Promise.all([
    supabase
      .from('users_profile')
      .select('first_name, units, training_focus, diet_preference, primary_equipment, bar_weight, tier')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('user_body_profile')
      .select('sex, date_of_birth, height_cm, experience_level, primary_goal')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const p = (profileRes.data ?? {}) as Record<string, unknown>;
  const b = (bodyRes.data ?? {}) as Record<string, unknown>;

  return {
    firstName: (p.first_name as string) ?? null,
    units: (p.units as string) ?? null,
    trainingFocus: (p.training_focus as string) ?? null,
    dietPreference: (p.diet_preference as string) ?? null,
    primaryEquipment: (p.primary_equipment as string) ?? null,
    barWeight: (p.bar_weight as number) ?? null,
    tier: (p.tier as string) ?? null,
    sex: (b.sex as string) ?? null,
    age: ageYearsFromDateOfBirth((b.date_of_birth as string) ?? null),
    heightCm: (b.height_cm as number) ?? null,
    experienceLevel: (b.experience_level as string) ?? null,
    primaryGoal: (b.primary_goal as string) ?? null,
  };
}
