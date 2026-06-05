import type { SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient;

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

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const t = Date.parse(dob);
  if (!Number.isFinite(t)) return null;
  const years = (Date.now() - t) / (365.25 * 86_400_000);
  return years > 0 && years < 130 ? Math.floor(years) : null;
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
    age: ageFromDob((b.date_of_birth as string) ?? null),
    heightCm: (b.height_cm as number) ?? null,
    experienceLevel: (b.experience_level as string) ?? null,
    primaryGoal: (b.primary_goal as string) ?? null,
  };
}
