import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha, alpha, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Card from './Card';

// Extracted from HomeScreen.js (behaviour-preserving decomposition).
//
// Last session (D3, design audit 03): demoted to one slim row. Same
// tap-through to history, same Repeat action, same stats, compressed to a
// label line, a one-line name and an inline meta line instead of a
// card-sized sibling to the hero.
//
// `relativeDay` is computed by the caller (getRelativeDay(lastSession.startedAt))
// so this component stays a pure renderer of already-derived data.
function HomeLastSessionCard({ lastSession, lastSessionTonnage, relativeDay, onOpenHistory, onRepeat }) {
  // CP-10 stage 3 (theming batch 2): live theme, same append-after pattern
  // as batch 1. `styles` stays frozen; `live` carries the colour-bearing
  // keys only.
  const t = useTheme();
  const live = {
    lastSessionLabel: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    lastSessionMeta: { ...t.type.caption, color: t.colors.textMuted },
    lastSessionName: { ...t.type.label, color: t.colors.textPrimary },
    repeatBtn: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, alpha.edge) },
    repeatBtnText: { fontSize: t.fontSize.xs, color: t.colors.primary },
  };
  const meta = [
    lastSession.durationMinutes ? `${lastSession.durationMinutes}m` : null,
    lastSession.setCount ? `${lastSession.setCount} sets` : null,
    lastSession.totalVolume
      ? `${Math.round(lastSession.totalVolume).toLocaleString('en-GB')} kg`
      : lastSessionTonnage
        ? `${Math.round(lastSessionTonnage).toLocaleString('en-GB')} kg`
        : null,
  ].filter(Boolean).join(' - ');

  return (
    <Card
      style={styles.lastSessionCard}
      onPress={onOpenHistory}
      padding="none"
      accessibilityLabel="Open workout history"
    >
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text style={[styles.lastSessionLabel, live.lastSessionLabel]}>
          Last session - {relativeDay}
        </Text>
        <Text style={[styles.lastSessionName, live.lastSessionName]} numberOfLines={1}>
          {/* Prefer the plan-day name (routineName, e.g. "Day 2: Back Width
              & Thickness"). The workout's own `name` is overwritten at
              finish with an exercise-derived summary ("Cable & Iso-Lateral"),
              so it is only the right label for a blank session with no
              routine. */}
          {lastSession.routineName || lastSession.name || 'Session'}
        </Text>
        {meta ? (
          <Text style={[styles.lastSessionMeta, live.lastSessionMeta]} numberOfLines={1}>{meta}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.repeatBtn, live.repeatBtn]}
        onPress={e => { e.stopPropagation(); onRepeat(); }}
        activeOpacity={0.75}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Repeat last session"
      >
        <Ionicons name="refresh-outline" size={13} color={t.colors.primary} />
        <Text style={[styles.repeatBtnText, live.repeatBtnText]}>Repeat</Text>
      </TouchableOpacity>
    </Card>
  );
}

export default React.memo(HomeLastSessionCard);

const styles = StyleSheet.create({
  // Last session (D3: one slim row, not a card-sized sibling to the hero)
  lastSessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  lastSessionLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  lastSessionMeta: {
    ...type.caption, color: colors.textMuted,
  },
  repeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, alpha.edge),
  },
  repeatBtnText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  lastSessionName: {
    ...type.label, color: colors.textPrimary,
  },
});
