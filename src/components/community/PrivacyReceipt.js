/**
 * PrivacyReceipt (blueprint sections 2, 6)
 *
 * The promise the whole feature rests on: nothing about the body, food,
 * scans, injuries, coaching or check-ins ever enters Community.
 *
 * It is shown before anyone joins (the hub hero and the Join screen) and
 * again on the Community privacy screen, so the promise is readable
 * before the decision and after it.
 *
 * Lead visual review 2026-09-06, ruling V9: composes `Card surface="surface2"
 * radius="md" padding="md"`. Compact by default: a `shield-checkmark-outline`
 * glyph in amber, one `caption` line, and a `tertiary` sm "What is shared"
 * that expands the full "Others can see" / "Never shared" columns in
 * place. Nothing in the list is removed; it is only collapsed until asked
 * for. On a narrow width the expanded columns stack rather than truncate.
 */

import { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Card from '../Card';
import Button from '../Button';
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
    <Card surface="surface2" radius="md" padding="md" style={styles.card}>
      <View style={styles.compact}>
        <Ionicons name="shield-checkmark-outline" size={iconSize.md} color={t.colors.primary} />
        <Text style={[styles.line, { ...t.type.caption, color: t.colors.textPrimary }]}>
          {PRIVACY_RECEIPT_LINE}
        </Text>
      </View>
      {!expanded ? (
        <Button
          variant="tertiary"
          size="sm"
          fullWidth={false}
          title="What is shared"
          onPress={() => setExpanded(true)}
          accessibilityLabel="What is shared. Expands the full list."
        />
      ) : (
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
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  compact: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  line: { ...type.caption, color: colors.textPrimary, flex: 1 },
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
