/**
 * StatusStrip (D43 S2)
 *
 * Replaces the old collapsed "N notes" accordion (U-A-1) with a horizontal
 * row of CONTENT-LABELLED chips -- Deload, Superset, Coach note, Starter
 * session, Target met -- so the session's WHY is glanceable by name, never
 * hidden behind a count. Each chip tap-expands to reveal the same content
 * ActiveWorkoutScreen used to render inline in the notes rail (same copy,
 * same actions); tapping again collapses it. An empty `items` array renders
 * nothing (no strip at all), same "no notes = no rail" guarantee as before.
 *
 * `items`: [{ key, label, icon, iconColor, content }] -- `content` is the
 * existing ReactNode ActiveWorkoutScreen already builds for that note (the
 * banner/handlers are untouched; only the collapsed/expanded shell moves).
 */
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { workoutLoggerSize } from '../../styles/layout';

export default function StatusStrip({ items }) {
  const t = useTheme();
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());

  if (!items || items.length === 0) return null;

  function toggle(key) {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <View style={styles.container} testID="volyume-status-strip">
      <View style={styles.chipRow}>
        {items.map(item => {
          const expanded = expandedKeys.has(item.key);
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.chip, { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle }, expanded && { borderColor: item.iconColor || t.colors.primary }]}
              onPress={() => toggle(item.key)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${item.label}, tap to ${expanded ? 'collapse' : 'expand'}`}
            >
              {item.icon && <Ionicons name={item.icon} size={14} color={item.iconColor || t.colors.textSecondary} />}
              <Text style={[styles.chipText, { color: t.colors.textPrimary }]}>{item.label}</Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color={t.colors.textMuted} />
            </TouchableOpacity>
          );
        })}
      </View>
      {items.filter(item => expandedKeys.has(item.key)).map(item => (
        <View key={`expanded-${item.key}`} style={styles.expandedItem}>{item.content}</View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    minHeight: workoutLoggerSize.primaryActionMinHeight,
  },
  chipText: { ...type.label },
  expandedItem: { gap: spacing.sm },
});
