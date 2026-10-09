/**
 * SessionHeader
 *
 * The session's name on the page under the toolbar (12-BUILD-SPEC sections 2
 * and 3, register D220), at the title role semibold: a label over the cards,
 * not a page heading (founder render verdict 2026-10-09). Nothing else: the
 * session note lives behind the toolbar's Notes tool and is not echoed here
 * (founder verdict 2026-10-09, D220 addendum 10: "it has no value during a
 * workout").
 *
 * Props
 *   name     the session title
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import useTheme from '../../../hooks/useTheme';
import { spacing } from '../../../styles/theme';

export default function SessionHeader({ name }) {
  const t = useTheme();
  const live = useMemo(() => ({
    // The session name is a label over the cards, not a page heading
    // (founder render verdict 2026-10-09: h2 was too big).
    title: { ...t.type.w(t.type.title, 'semibold'), color: t.colors.textPrimary },
  }), [t]);

  return (
    <View style={styles.wrap}>
      <Text style={live.title} numberOfLines={2} accessibilityRole="header">
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing.xs },
});
