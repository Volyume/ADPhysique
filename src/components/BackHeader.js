/**
 * BackHeader
 *
 * The standard header for pushed / modal screens: a back chevron on the
 * left, the screen title, and an optional action on the right. Top-level
 * tab screens use ScreenHeader (title + Volyume wordmark) instead; this
 * is its sibling for everything you navigate INTO.
 *
 * Extracted to kill ~16 hand-rolled copies that had drifted apart (some
 * titles rendered at fontSize.lg/semibold, others at md/bold), which read
 * as an unfinished, templated app. One definition, one look.
 *
 * Props:
 *   title    string, required.
 *   onBack   optional; defaults to navigation.goBack().
 *   right    optional node rendered on the right (e.g. an add button). A
 *            fixed-width spacer is rendered when absent so the title stays
 *            optically centred against the back chevron.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fontSize, fontWeight, spacing } from '../styles/theme';

const HIT = { top: 12, bottom: 12, left: 12, right: 12 };

export default function BackHeader({ title, onBack, right }) {
  // useNavigation throws when rendered outside a navigation container
  // (e.g. some isolated mount tests). Guard it so the header degrades to
  // a no-op back rather than crashing the screen; real screens always
  // have a navigator, and an explicit onBack takes precedence anyway.
  let navigation = null;
  try { navigation = useNavigation(); } catch (_) { navigation = null; }
  const goBack = onBack ?? (() => navigation?.goBack?.());
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={goBack} hitSlop={HIT} accessibilityRole="button" accessibilityLabel="Go back">
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.right}>{right ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginHorizontal: spacing.sm,
  },
  // Matches the 24px back chevron so the title sits optically centred.
  right: { minWidth: 24, alignItems: 'flex-end' },
});
