/**
 * CohortRow (communities revamp 2026-09-10: `docs/communities-revamp-
 * 2026-09-10/21-PHASE1-SPEC.md` section 1, "CohortRow"; `20-BLUEPRINT.md`
 * section 9 rules 4 and 6, and the Hub's PEOPLE section).
 *
 * 64 dp: `AvatarStack` of `people` (those who trained today when known,
 * else the first members: the caller's choice, this row just draws
 * whatever it is given), title `bodyStrong`, `line` in `bodySm`
 * `textSecondary` ("4 trained today . 23 members" or "23 members"),
 * chevron. Hairline below, inset past the stack: `spacing.lg` (the row's
 * own left inset) plus the stack's actual rendered width
 * (`AvatarStack.stackWidth`, so the line lands correctly whether `people`
 * holds zero, one or the full three avatars) plus `spacing.md` (the gap
 * before the text column).
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
 */

import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableCard from '../PressableCard';
import AvatarStack, { stackWidth } from './AvatarStack';
import {
  spacing, type, colors, iconSize,
} from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

const STACK_SIZE = 24;
const STACK_MAX = 3;

export default function CohortRow({
  title, line, people, onPress,
}) {
  const t = useTheme();
  const inset = spacing.lg + stackWidth(Array.isArray(people) ? people.length : 0, STACK_SIZE, STACK_MAX) + spacing.md;

  return (
    <PressableCard
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, line].filter(Boolean).join('. ')}
    >
      <View style={styles.row}>
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
        <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
      </View>
      <View style={[styles.divider, { marginLeft: inset, backgroundColor: t.colors.border }]} />
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingHorizontal: spacing.lg, gap: spacing.md,
  },
  body: { flex: 1, gap: spacing.xxs },
  title: { ...type.bodyStrong, color: colors.textPrimary },
  line: { ...type.bodySm, color: colors.textSecondary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
