/**
 * bodyMetricsPolicy.js -- what the Body metrics screen may show, as one pure
 * rule (register D214 addendum 4; spec docs/audit/
 * progress-recovery-consistency-audit-2026-10-01/
 * 04-BODY-METRICS-AUDIT-AND-SPEC.md section 4: ED-A, ED-B, ED-C, ED-E).
 *
 * Before this, the screen answered the same state three ways: a chip and a
 * delta badge printed direction under an open flag, the rate line and the
 * maintenance card withheld under the flag but not under calm mode, and the
 * frame below the hero rendered before the flag read had returned. One
 * module now decides, and the screen reads it; no screen-local gate decides
 * anything.
 *
 * THE RULE, a withhold strengthened and never weakened (the D214 Q2
 * precedent; the founder may override, section 4 of the spec):
 *  - until BOTH reads have returned (the open ED-pattern flag and the raw
 *    wellbeing key) nothing below the header renders: a fail-open frame is
 *    never acceptable (ED-C); a failed read counts as open, or as calm;
 *  - under an open flag, or under calm mode after the person's "Continue",
 *    every direction word, rate, weekly comparison, the typical-swing line,
 *    the chart's takeaway, the maintenance figure, the intake line (ED-E),
 *    the recomposition card and the measurement change lines are withheld;
 *  - the person's own entries stay: the trend weight, the weigh-in history,
 *    the chart's line and dots, the latest measurements with their dates,
 *    and the actions to log and add (Q2: "the person's own weigh-ins stay").
 *
 * Calm mode is read through wellbeing.js's own `isCalm`, the one definition.
 * Pure: the reads happen in the screen, which passes their results here.
 */
import { isCalm } from './wellbeing';

/** The line in the verdict's place under calm mode (BM-17: a claim about what is kept, nothing more). */
export const BODY_METRICS_CALM_LINE = 'Your weigh-ins are kept here, ready when you want them.';
/** The line in the verdict's place under an open flag. */
export const BODY_METRICS_FLAG_LINE = 'Your weigh-ins are kept here.';

const SECTIONS = Object.freeze([
  'trendWeight', 'verdict', 'weekComparison', 'noiseLine', 'actions', 'chart', 'takeaway',
  'maintenance', 'intake', 'recomposition', 'measurements', 'measurementChange', 'history',
]);
/** The sections the person's own data keeps under a withhold. */
const OWN_DATA = new Set(['trendWeight', 'actions', 'chart', 'measurements', 'history']);

/**
 * @param {object} reads
 * @param {*} reads.edFlag  undefined until the open-flag read returns; then the
 *   flag row, null for none, or the 'read_failed' sentinel (open)
 * @param {*} reads.wellbeingMode  undefined until the raw key read returns;
 *   then 'calm' | 'normal' | 'unspecified' | 'read_failed' (calm)
 * @returns {{ ready: boolean, edFlagOpen: boolean, calm: boolean, withhold: boolean,
 *   line: ?string, show: Object<string, boolean> }}
 */
export function bodyMetricsPolicy({ edFlag, wellbeingMode } = {}) {
  const ready = edFlag !== undefined && wellbeingMode !== undefined;
  const edFlagOpen = ready && !!edFlag;
  const calm = ready && (isCalm(wellbeingMode) || wellbeingMode === 'read_failed');
  const withhold = !ready || edFlagOpen || calm;
  const show = {};
  for (const key of SECTIONS) show[key] = ready && (!withhold || OWN_DATA.has(key));
  let line = null;
  if (ready && edFlagOpen) line = BODY_METRICS_FLAG_LINE;
  else if (ready && calm) line = BODY_METRICS_CALM_LINE;
  return { ready, edFlagOpen, calm, withhold, line, show };
}

export const BODY_METRICS_SECTIONS = SECTIONS;
