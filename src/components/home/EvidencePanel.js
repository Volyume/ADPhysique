/**
 * EvidencePanel — Campaign 26 (founder device order 2026-08-17).
 *
 * The restored since-check-in evidence pane: the CoachDailyBrief runway's
 * chrome (quiet surface card, caption title, countdown line, tick rows)
 * carrying the view-model from src/lib/home/evidencePanel.js - which is
 * where every content decision lives (this component renders whatever it
 * is handed and knows nothing about coaching-readiness maths, matching
 * TodayLine's split). The morning weight, once logged, renders as one of
 * these quiet rows rather than its own bordered card with a green pill.
 *
 * One tap target: the whole pane opens the You tab's readiness surface,
 * where the full ledger and trend detail already live.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, radius, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

function EvidencePanel({ panel, onPress, testID }) {
  const t = useTheme();
  if (!panel) return null;
  const live = buildLiveStyles(t);

  return (
    <TouchableOpacity
      style={[styles.wrap, live.wrap]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={[
        panel.title,
        panel.countdown,
        ...panel.rows.map((r) => r.label),
      ].filter(Boolean).join('. ')}
      testID={testID}
    >
      {/* Founder order 2026-08-17: no coach-voiced title. When a real
          check-in exists the pane titles itself "Since your check-in";
          otherwise the countdown IS the header line. */}
      {panel.title ? (
        <>
          <View style={styles.headerRow}>
            <Text style={[styles.title, live.title]}>{panel.title}</Text>
            <Ionicons name="chevron-forward" size={14} color={t.colors.textMuted} />
          </View>
          {panel.countdown ? (
            <Text style={[styles.countdown, live.countdown]}>{panel.countdown}</Text>
          ) : null}
        </>
      ) : (
        <View style={styles.headerRow}>
          <Text style={[styles.countdown, live.countdown]}>{panel.countdown}</Text>
          <Ionicons name="chevron-forward" size={14} color={t.colors.textMuted} />
        </View>
      )}
      {panel.rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <Ionicons
            name={row.done ? 'checkmark-circle' : 'ellipse-outline'}
            size={14}
            color={row.done ? t.colors.success : t.colors.textMuted}
          />
          <Text style={[styles.rowText, live.rowText, row.done && [styles.rowTextDone, live.rowTextDone]]}>
            {row.label}
          </Text>
        </View>
      ))}
    </TouchableOpacity>
  );
}

export default React.memo(EvidencePanel);

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: { ...type.caption, color: colors.textMuted },
  countdown: { ...type.bodySm, color: colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rowText: { ...type.bodySm, color: colors.textSecondary, flex: 1, minWidth: 0 },
  rowTextDone: { color: colors.textPrimary },
});

// Live-theme twins for the colour/type-bearing keys only, at identical rest
// values (the CP-10 convention CoachDailyBrief used).
function buildLiveStyles(t) {
  return {
    wrap: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    title: { ...t.type.caption, color: t.colors.textMuted },
    countdown: { ...t.type.bodySm, color: t.colors.textSecondary },
    rowText: { ...t.type.bodySm, color: t.colors.textSecondary },
    rowTextDone: { color: t.colors.textPrimary },
  };
}
