/**
 * RespectAllRow (communities revamp 2026-09-10: `docs/communities-
 * revamp-2026-09-10/23-PHASE3-SPEC.md` section 5; `20-BLUEPRINT.md`
 * section 5, CR-06).
 *
 * A tertiary row at the foot of a roster (cohort page, group page):
 * "Respect everyone who trained today". One tap calls
 * `community_respect_all` for the given scope; the row then shows
 * "Respect given to N people" and disables itself, device-recorded so it
 * stays disabled until the next UK-local day even across a remount. No
 * row at all when nobody on this roster trained today (`hasTrainedToday`
 * is the caller's own read of its roster, not a second network call).
 *
 * Rules obeyed (`docs/rules/styling.md`): tokens only, `useTheme`,
 * `StyleSheet.create` at the bottom, effective target 48 dp,
 * `accessibilityRole="button"` + a label that speaks the row's own
 * state, no amber (this row is quiet, never a committing action).
 *
 * Props:
 *   scope            one of `community_respect_all`'s scopes
 *   scopeKey         the scope's key, or null/omitted where none applies
 *   hasTrainedToday  whether anyone on the caller's own roster trained
 *                     today; the row renders nothing when false
 */

import { useEffect, useState } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { spacing, type, colors } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { lastRespectGivenState, recordRespectGiven, respectAll } from '../../lib/community/respect';
import { todayLocalKey } from '../../lib/dayKey';

export default function RespectAllRow({ scope, scopeKey = null, hasTrainedToday, style }) {
  const t = useTheme();
  const [ready, setReady] = useState(false);
  const [given, setGiven] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const state = await lastRespectGivenState(scope, scopeKey);
      if (!alive) return;
      setGiven(state && state.day === todayLocalKey() ? Number(state.given) || 0 : null);
      setReady(true);
    })();
    return () => { alive = false; };
  }, [scope, scopeKey]);

  if (!ready || !hasTrainedToday) return null;

  const disabled = given != null || busy;

  async function press() {
    if (disabled) return;
    setBusy(true);
    try {
      const out = await respectAll({ scope, scopeKey });
      await recordRespectGiven(scope, scopeKey, todayLocalKey(), out.given);
      setGiven(out.given);
    } catch (_e) {
      // A failed bulk Respect is not worth interrupting anyone for: the
      // row simply stays enabled to try again.
    } finally {
      setBusy(false);
    }
  }

  const label = given != null
    ? `Respect given to ${given} ${given === 1 ? 'person' : 'people'}`
    : (busy ? 'Sending respect' : 'Respect everyone who trained today');

  return (
    <Pressable
      onPress={press}
      disabled={disabled}
      style={[styles.row, style]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
    >
      <Text style={[styles.label, { ...t.type.label, color: given != null ? t.colors.textMuted : t.colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 48, justifyContent: 'center', paddingVertical: spacing.sm },
  label: { ...type.label, color: colors.textSecondary },
});
