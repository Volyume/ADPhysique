/**
 * CohortRow (communities revamp 2026-09-10: `docs/communities-revamp-
 * 2026-09-10/21-PHASE1-SPEC.md` section 1, "CohortRow"; `20-BLUEPRINT.md`
 * section 9 rules 4 and 6, and the Hub's PEOPLE section).
 *
 * 64 dp: `AvatarStack` of `people` (those who trained today when known,
 * else the first members: the caller's choice, this row just draws
 * whatever it is given), title `bodyStrong`, `line` in `bodySm`
 * `textSecondary` ("4 trained today . 23 members" or "23 members"),
 * chevron, then the house divider: a `borderSubtle` hairline spanning the
 * row (its inset used to vary with the number of sample avatars, so two
 * neighbouring cohort rows drew their lines at different left edges). The
 * row carries NO gutter of its own: its page already pads by `spacing.lg`,
 * and a row that padded itself again put this row's avatars at 32 while
 * the eyebrow above it sat at 16 (founder defect 2026-09-14).
 *
 * Rules obeyed (section 1 preamble; `docs/rules/styling.md`): function
 * component, `useTheme`, tokens only, `StyleSheet.create` at the bottom,
 * effective target 48 dp via the shared `PressableCard` primitive (spring
 * press feedback, blueprint rule 10), `accessibilityRole` + a composed
 * label. No amber in this file: zero `c.primary` uses (pinned by
 * `rows.amber.guard.test.js`; a cohort row carries no ring, no Respect,
 * no PR of its own). Never imports `../../lib/database` (privacy guard,
 * section 6d).
 *
 * Props:
 *   title    the cohort's label ("Your gym", a style name, ...)
 *   line     the count line, already composed by the caller ("4 trained
 *             today . 23 members" or "23 members" when trained-today is
 *             not yet known for this cohort, section 5)
 *   people   profile cards for `AvatarStack` (see its own props)
 *   onPress  opens the cohort page
 *   unread   optional chat unread count (D221 3b), a figure in `num('label')`
 *            before the chevron; nothing when 0 or absent
 */

import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableCard from '../PressableCard';
import AvatarStack from './AvatarStack';
import {
  spacing, type, colors, iconSize,
} from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

const STACK_SIZE = 24;
const STACK_MAX = 3;

export default function CohortRow({
  title, line, people, onPress, onPressWithLayout, inBand = false, unread = 0, trailing,
}) {
  const t = useTheme();
  const label = [title, line, Number(unread) > 0 ? `${Number(unread)} unread` : null].filter(Boolean).join('. ');
  const unreadCount = Number(unread) > 0 ? Number(unread) : 0;
  return (
    <PressableCard
      onPress={onPress}
      onPressWithLayout={onPressWithLayout}
      disabled={!onPress && !onPressWithLayout}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessible={trailing ? false : undefined}
    >
      <View style={[styles.row, inBand && styles.inBand]}>
        <View
          style={styles.group}
          accessible={trailing ? true : undefined}
          accessibilityRole={trailing ? (onPress || onPressWithLayout ? 'button' : 'text') : undefined}
          accessibilityLabel={trailing ? label : undefined}
        >
        <AvatarStack people={people} size={STACK_SIZE} max={STACK_MAX} />
        <View style={styles.body}>
          <Text style={[styles.title, { color: t.colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          {line ? (
            <Text style={[styles.line, { color: t.colors.textSecondary }]} numberOfLines={1}>
              {line}
            </Text>
          ) : null}
        </View>
        {unreadCount ? (
          <Text style={[t.type.num('label'), { color: t.colors.textPrimary }]}>
            {unreadCount > 99 ? '99+' : String(unreadCount)}
          </Text>
        ) : null}
        </View>
        {trailing === undefined ? (
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
        ) : trailing}
      </View>
      <View style={[styles.divider, { backgroundColor: t.colors.borderSubtle }]} />
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', minHeight: 64, gap: spacing.md,
  },
  // D221 ruling 7 / law V1: the row's own content carries the gutter (default off).
  inBand: { paddingHorizontal: spacing.lg },
  group: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: spacing.xxs },
  title: { ...type.bodyStrong, color: colors.textPrimary },
  line: { ...type.bodySm, color: colors.textSecondary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle },
});
