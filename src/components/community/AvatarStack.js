/**
 * AvatarStack (communities revamp 2026-09-10: `docs/communities-revamp-
 * 2026-09-10/21-PHASE1-SPEC.md` section 1, "AvatarStack").
 *
 * Overlapping `ProfileAvatarMark`s (offset `-spacing.sm`), each ringed
 * `background` 2 dp so they read as a stack rather than one avatar sitting
 * on another; a trailing "+N" in `caption` `textMuted` when `people` runs
 * past `max`. "Nothing interactive; the row is the target" (spec): the
 * whole stack is hidden from the accessibility tree so a screen reader
 * does not stop on every avatar, matching the row's own composed label
 * carrying everything worth announcing.
 *
 * Rules obeyed (section 1 preamble; `docs/rules/styling.md`): function
 * component, `useTheme`, tokens only, `StyleSheet.create` at the bottom.
 * No amber anywhere in this file (pinned by `rows.amber.guard.test.js`,
 * zero `c.primary` uses: presence, not respect or a PR, is all this
 * renders). Never imports `../../lib/database` (privacy guard, section
 * 6d).
 *
 * `stackWidth` is exported so a caller that needs to inset something past
 * the stack (`CohortRow`/`GroupRow`'s hairline divider) can compute the
 * exact rendered width instead of guessing a fixed offset.
 *
 * Props:
 *   people  array of profile cards ({ user_id, avatar_preset,
 *           display_name, handle }), most-relevant first (the caller
 *           decides: those who trained today, or the first members)
 *   size    each avatar's diameter (default 24)
 *   max     how many avatars to draw before collapsing the rest into "+N"
 *           (default 3)
 */

import { View, Text, StyleSheet } from 'react-native';
import ProfileAvatarMark from '../ProfileAvatarMark';
import { spacing, type, colors } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

/**
 * The pixel width a stack of `count` avatars (capped at `max`, each
 * `size` wide, overlapping by `spacing.sm`) actually renders at. Does not
 * account for the "+N" label's own width, which is small and variable;
 * callers using this for a divider inset accept that imprecision.
 *
 * @param {number} count
 * @param {number} [size]
 * @param {number} [max]
 * @returns {number}
 */
export function stackWidth(count, size = 24, max = 3) {
  const n = Math.max(0, Math.min(Number(count) || 0, max));
  if (n === 0) return 0;
  return size + (n - 1) * (size - spacing.sm);
}

export default function AvatarStack({ people, size = 24, max = 3 }) {
  const t = useTheme();
  const list = Array.isArray(people) ? people : [];
  const shown = list.slice(0, max);
  const extra = list.length - shown.length;

  return (
    <View
      style={styles.row}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {shown.map((person, i) => (
        <View
          key={person?.user_id ?? i}
          style={i > 0 && { marginLeft: -spacing.sm }}
        >
          <ProfileAvatarMark
            presetKey={person?.avatar_preset}
            displayName={person?.display_name || person?.handle}
            size={size}
            style={{ borderColor: t.colors.background }}
          />
        </View>
      ))}
      {extra > 0 ? (
        <Text style={[styles.extra, { color: t.colors.textMuted }]}>{`+${extra}`}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  extra: { ...type.caption, color: colors.textMuted, marginLeft: spacing.xs },
});
