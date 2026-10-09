/**
 * SessionHeader
 *
 * The session's name on the page under the toolbar (12-BUILD-SPEC sections 2
 * and 3, register D220), at the title role semibold: a label over the cards,
 * not a page heading (founder render verdict 2026-10-09), with the session's
 * elapsed time at the end of the same line (SessionClock, secondary ink): the
 * clock belongs to the session it measures, not to the toolbar (founder
 * verdict 2026-10-09, D220 addendum 12). Nothing else: the session note lives
 * behind the toolbar's Notes tool and is not echoed here (addendum 10: "it
 * has no value during a workout").
 *
 * Props
 *   name       the session title
 *   startTime  epoch ms the session started (the store's workoutStartTime);
 *              without it no clock renders
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import useTheme from '../../../hooks/useTheme';
import { spacing } from '../../../styles/theme';
import SessionClock from './SessionClock';

export default function SessionHeader({ name, startTime }) {
  const t = useTheme();
  const live = useMemo(() => ({
    // The session name is a label over the cards, not a page heading
    // (founder render verdict 2026-10-09: h2 was too big).
    title: { ...t.type.w(t.type.title, 'semibold'), color: t.colors.textPrimary },
  }), [t]);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, live.title]} numberOfLines={2} accessibilityRole="header">
        {name}
      </Text>
      {startTime ? <SessionClock startTime={startTime} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: { flex: 1, minWidth: 0 },
});
