import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';

// FieldError (D146, 2026-09-04): the one inline "this box needs something"
// line, shared by TextField, Dropdown and any screen that lays a message
// under a SegmentedControl. Icon plus text, so the state never relies on
// colour alone (Material's colour-blind rule); announced politely when it
// appears. Calm wording is the caller's job: say what to enter, never what
// they did wrong.
export default function FieldError({ message, style }) {
  const t = useTheme();
  if (!message) return null;
  return (
    <View style={[styles.row, style]} accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle" size={14} color={t.colors.error} importantForAccessibility="no" />
      <Text style={[styles.text, { ...t.type.caption, color: t.colors.error }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  text: { ...type.caption, color: colors.error, flex: 1 },
});
