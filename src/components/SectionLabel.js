import { Text, StyleSheet } from 'react-native';
import { colors, type } from '../styles/theme';

export default function SectionLabel({ children, style, tone = 'default' }) {
  return (
    <Text style={[styles.label, tone === 'muted' && styles.muted, tone === 'primary' && styles.primary, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: { ...type.overline, color: colors.textSecondary },
  muted: { color: colors.textMuted },
  primary: { color: colors.primary },
});
