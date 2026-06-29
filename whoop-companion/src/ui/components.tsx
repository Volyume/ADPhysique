import { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { colors, radius, spacing, type } from './theme';

export function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[type.screenTitle, styles.title]}>{title}</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={[type.sectionLabel, styles.sectionLabel]}>{children}</Text>;
}

export function Stat({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>
        <Text style={{ color: color ?? colors.text }}>{value}</Text>
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.primaryBtnText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function SecondaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.secondaryBtn, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.secondaryBtnText}>{title}</Text>
    </TouchableOpacity>
  );
}

/** WHOOP-style progress ring. value 0..1. */
export function Ring({
  value,
  size = 180,
  stroke = 14,
  color,
  centerTop,
  centerMain,
  centerSub,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color: string;
  centerTop?: string;
  centerMain?: string;
  centerSub?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const dash = c * clamped;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surface} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        {centerTop ? <Text style={styles.ringTop}>{centerTop}</Text> : null}
        {centerMain ? <Text style={[styles.ringMain, { color }]}>{centerMain}</Text> : null}
        {centerSub ? <Text style={styles.ringSub}>{centerSub}</Text> : null}
      </View>
    </View>
  );
}

/** Horizontal bar (e.g. HR zones). value 0..1. */
export function Bar({ value, color, label, right }: { value: number; color: string; label: string; right?: string }) {
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.max(2, Math.min(100, value * 100))}%`, backgroundColor: color }]} />
      </View>
      {right ? <Text style={styles.barRight}>{right}</Text> : null}
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.screen, paddingBottom: 40 },
  title: { marginBottom: spacing.item },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.card,
    marginTop: spacing.item,
  },
  sectionLabel: { marginTop: spacing.section, marginBottom: spacing.sm },
  stat: { flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.text },
  statUnit: { fontSize: 12, color: colors.textSecondary, fontWeight: '400' },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  primaryBtn: {
    backgroundColor: colors.amber,
    borderRadius: radius.button,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.item,
  },
  primaryBtnText: { color: '#000000', fontSize: 15, fontWeight: '600' },
  secondaryBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.item,
  },
  secondaryBtnText: { color: colors.text, fontSize: 15, fontWeight: '500' },
  btnDisabled: { opacity: 0.4 },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringTop: { color: colors.textSecondary, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  ringMain: { fontSize: 48, fontWeight: '800' },
  ringSub: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  barLabel: { color: colors.textSecondary, fontSize: 12, width: 56 },
  barTrack: { flex: 1, height: 10, backgroundColor: colors.surface, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  barRight: { color: colors.textSecondary, fontSize: 12, width: 52, textAlign: 'right' },
  empty: { color: colors.textTertiary, fontSize: 13, marginTop: spacing.item, lineHeight: 18 },
});
