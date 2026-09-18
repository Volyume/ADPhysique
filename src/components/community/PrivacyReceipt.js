/**
 * PrivacyReceipt (D192 finish spec: `docs/design-redesign-2026-09-14/
 * 40-FINISH-SPEC.md` section 5 item 9, "day zero as one line per
 * section"; re-cut 2026-09-18)
 *
 * The promise the whole feature rests on: nothing about the body, food,
 * scans, injuries, coaching or check-ins ever enters Community.
 *
 * It is shown before anyone joins (the hub hero and the Join screen) and
 * again on the Community privacy screen, so the promise is readable
 * before the decision and after it.
 *
 * D192 re-cut (was: lead visual review 2026-09-06 ruling V9's
 * `Card surface="surface2"` plus a separate `tertiary` "What is shared"
 * Button). The card fill, border and radius are gone: this is now a
 * hairline-bounded row group -- one hairline above, one below, no fill,
 * no radius, no border (finish spec section 4 rule 3, "Row") -- collapsed
 * by default to a single 56 dp row: the shield glyph, `PRIVACY_RECEIPT_
 * LINE`, a chevron. The row itself IS the disclosure now; there is no
 * separate button. Tapping it expands the same two "Others can see" /
 * "Never shared" columns as before, unchanged, beneath the row.
 *
 * Every string in `SHOWN`, `NEVER` and `PRIVACY_RECEIPT_LINE` is the GDPR
 * receipt and stays byte for byte identical through this and every
 * future visual pass.
 */

import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import SectionLabel from '../SectionLabel';
import {
  colors, spacing, type, iconSize, withAlpha, alpha,
} from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

// Fixed copy (blueprint section 2 and docs/community-safety/
// COMMUNITY-RULES.md). It is the notice recorded against
// COMMUNITY_RULES_VERSION, so it changes only with a version bump.
// The two discovery lines (blueprint 70 sections 3 and 12; SD-22, SD-31):
// the training profile is on the "Others can see" side because it can be
// shared, and the right-hand column answers the question a band invites
// ("does this say where I am?") before anyone has to ask it.
const SHOWN = [
  'Your handle and name',
  'Styles, goal, gym and area you type',
  'Sessions you choose to share',
  'Stories you post',
  'Training profile: only the bands you choose',
];
const NEVER = [
  'Bodyweight or body data',
  'Food and nutrition',
  'Progress Scan and photos',
  'Injuries, coaching, check-ins',
  'Where you are now, or exact times',
];

/** The one-line compact promise, shown before anyone asks for the list. */
export const PRIVACY_RECEIPT_LINE = 'Nothing about your body, food or coaching is ever shared.';

// Layout breakpoint (not a design token), same threshold and reason as
// PartnerPrivacyReceipt: below this the columns stack so no line truncates.
const STACK_BELOW = 360;

export default function PrivacyReceipt() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const stack = width < STACK_BELOW;
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.group, { borderTopColor: t.colors.borderSubtle, borderBottomColor: t.colors.borderSubtle }]}>
      <TouchableOpacity
        style={styles.row}
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel="What is shared. Expands the full list."
        accessibilityState={{ expanded }}
      >
        <Ionicons name="shield-checkmark-outline" size={iconSize.md} color={t.colors.textSecondary} />
        <Text style={[styles.line, { ...t.type.bodySm, color: t.colors.textPrimary }]}>
          {PRIVACY_RECEIPT_LINE}
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={iconSize.sm} color={t.colors.textMuted} />
      </TouchableOpacity>
      {expanded ? (
        <View style={[styles.columns, stack && styles.columnsStack]}>
          <View style={styles.col}>
            <SectionLabel>Others can see</SectionLabel>
            {SHOWN.map((line) => (
              <Text key={line} style={[styles.itemLine, { ...t.type.bodySm, color: t.colors.textPrimary }]}>
                {line}
              </Text>
            ))}
          </View>

          {stack
            ? <View style={[styles.ruleH, { backgroundColor: withAlpha(t.colors.border, alpha.strong) }]} />
            : <View style={[styles.ruleV, { backgroundColor: withAlpha(t.colors.border, alpha.strong) }]} />}

          <View style={styles.col}>
            <SectionLabel>Never shared</SectionLabel>
            {NEVER.map((line) => (
              <View key={line} style={styles.neverRow}>
                <Ionicons
                  name="lock-closed-outline"
                  size={iconSize.sm}
                  color={t.colors.textSecondary}
                  style={styles.lockIcon}
                />
                <Text style={[styles.neverLine, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
                  {line}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    borderBottomColor: colors.borderSubtle,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  line: { ...type.bodySm, color: colors.textPrimary, flex: 1 },
  columns: { flexDirection: 'row', alignItems: 'flex-start' },
  columnsStack: { flexDirection: 'column' },
  col: { flex: 1, gap: spacing.xs },
  ruleV: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: spacing.md,
    backgroundColor: colors.border,
  },
  ruleH: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
    backgroundColor: colors.border,
  },
  itemLine: { ...type.bodySm, color: colors.textPrimary },
  neverRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  lockIcon: { marginTop: spacing.xxs },
  neverLine: { ...type.bodySm, color: colors.textSecondary, flex: 1 },
});
