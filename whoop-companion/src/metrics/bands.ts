/**
 * Oura-style four-tier banding for 0–100 contributor sub-scores: Optimal / Good /
 * Fair / Pay attention (thresholds 85 / 70 / 60, per Oura's education copy). This
 * is a PRESENTATION layer for contributor rows only — it does NOT change the
 * recovery score's own green/yellow/red banding (recoveryColor in theme.ts),
 * which stays at WHOOP's 67/34 so the headline number keeps its meaning.
 */

import { colors } from '../ui/theme';

export type Tier = { label: string; color: string };

const OPTIMAL = '#43cb00';
const GOOD = '#9bd64a';
const FAIR = '#ffde00';
const PAY_ATTENTION = '#ff6422';

export function fourTier(score: number | null | undefined): Tier {
  if (score == null) return { label: '—', color: colors.textTertiary };
  if (score >= 85) return { label: 'Optimal', color: OPTIMAL };
  if (score >= 70) return { label: 'Good', color: GOOD };
  if (score >= 60) return { label: 'Fair', color: FAIR };
  return { label: 'Pay attention', color: PAY_ATTENTION };
}
