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
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';

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

/** A tappable WHOOP-style metric dial for the overview — a doorway to detail. */
export function Dial({
  label,
  main,
  sub,
  color,
  fraction,
  onPress,
  size = 104,
}: {
  label: string;
  main: string;
  sub?: string;
  color: string;
  fraction: number;
  onPress?: () => void;
  size?: number;
}) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, fraction));
  const dash = c * clamped;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={dialStyles.wrap}>
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
        <View style={dialStyles.center}>
          <Text style={[dialStyles.main, { color }]}>{main}</Text>
        </View>
      </View>
      <Text style={dialStyles.label}>{label}</Text>
      {sub ? <Text style={dialStyles.sub}>{sub}</Text> : null}
    </TouchableOpacity>
  );
}

const STAGE_COLOR: Record<string, string> = {
  awake: colors.textTertiary,
  rem: '#6D28D9',
  light: colors.sleepTeal,
  deep: '#1E40AF',
};
const STAGE_LANE: Record<string, number> = { awake: 0, rem: 1, light: 2, deep: 3 };

/** WHOOP-style sleep hypnogram: stage segments across the night, by lane. */
export function Hypnogram({ segments }: { segments: Array<{ stage: string; minutes: number }> }) {
  const total = segments.reduce((a, b) => a + b.minutes, 0) || 1;
  const W = 1000;
  const laneH = 18;
  const gap = 5;
  const H = 4 * laneH + 3 * gap;
  let x = 0;
  const rects = segments.map((s, i) => {
    const w = (s.minutes / total) * W;
    const lane = STAGE_LANE[s.stage] ?? 2;
    const rx = x;
    x += w;
    return (
      <Rect
        key={i}
        x={rx}
        y={lane * (laneH + gap)}
        width={Math.max(1, w)}
        height={laneH}
        rx={3}
        fill={STAGE_COLOR[s.stage] ?? colors.sleepTeal}
      />
    );
  });
  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {rects}
      </Svg>
    </View>
  );
}

/** WHOOP-style strain curve building over the day (0–21). */
export function StrainCurve({
  points,
  color = colors.strainBlue,
}: {
  points: Array<{ tsMs: number; strain: number }>;
  color?: string;
}) {
  if (points.length < 2) {
    return <Empty text="No strain yet today — it builds as your heart rate rises through the day." />;
  }
  const W = 1000;
  const H = 200;
  const n = points.length;
  const pts = points
    .map((p, i) => `${(i / (n - 1)) * W},${H - (Math.min(21, p.strain) / 21) * H}`)
    .join(' ');
  return (
    <Svg width="100%" height={130} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <Line x1={0} y1={H - 1} x2={W} y2={H - 1} stroke={colors.border} strokeWidth={2} />
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

const dialStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  main: { fontSize: 22, fontWeight: '800' },
  label: { color: colors.textSecondary, fontSize: 12, marginTop: 6, fontWeight: '600' },
  sub: { color: colors.textTertiary, fontSize: 11, marginTop: 1 },
});

/** WHOOP Poor / Sufficient / Optimal band for a 0–100 contributor. */
export function band(percent: number | null): string {
  if (percent == null) return colors.textTertiary;
  if (percent >= 85) return colors.recoveryGreen; // Optimal
  if (percent >= 50) return colors.textSecondary; // Sufficient
  return colors.amber; // Poor
}

/** A WHOOP-style contributor row: label, progress bar (banded), right value. */
export function ContributorRow({
  label,
  percent,
  value,
}: {
  label: string;
  percent: number | null;
  value?: string;
}) {
  const c = band(percent);
  return (
    <View style={contribStyles.row}>
      <View style={contribStyles.head}>
        <Text style={contribStyles.label}>{label}</Text>
        <Text style={[contribStyles.value, { color: c }]}>
          {value ?? (percent != null ? `${Math.round(percent)}%` : '—')}
        </Text>
      </View>
      <View style={contribStyles.track}>
        <View
          style={[
            contribStyles.fill,
            { width: `${Math.max(0, Math.min(100, percent ?? 0))}%`, backgroundColor: c },
          ]}
        />
      </View>
    </View>
  );
}

export function BandLegend() {
  return (
    <View style={contribStyles.legend}>
      <LegendDot color={colors.amber} label="Poor" />
      <LegendDot color={colors.textSecondary} label="Sufficient" />
      <LegendDot color={colors.recoveryGreen} label="Optimal" />
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={contribStyles.legendItem}>
      <View style={[contribStyles.legendDot, { backgroundColor: color }]} />
      <Text style={contribStyles.legendLabel}>{label}</Text>
    </View>
  );
}

/** Generic overnight line chart (e.g. heart rate across the night). */
export function LineChart({
  values,
  color = colors.sleepTeal,
  height = 120,
  leftLabel,
  rightLabel,
}: {
  values: number[];
  color?: string;
  height?: number;
  leftLabel?: string;
  rightLabel?: string;
}) {
  if (values.length < 2) {
    return <Empty text="No overnight signal recorded for this window." />;
  }
  const W = 1000;
  const H = 200;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * H}`)
    .join(' ');
  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Polyline points={pts} fill="none" stroke={color} strokeWidth={4} strokeLinejoin="round" />
      </Svg>
      {leftLabel || rightLabel ? (
        <View style={contribStyles.axis}>
          <Text style={contribStyles.axisLabel}>{leftLabel}</Text>
          <Text style={contribStyles.axisLabel}>{rightLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * WHOOP contributor row: label on the left; today's value with a coloured
 * up/down arrow on the right; the 30-day comparison value beneath it.
 * `betterWhenLower` flips the arrow colour (green = favourable).
 */
export function MetricRow({
  label,
  display,
  current,
  prior,
  unit,
  betterWhenLower = false,
}: {
  label: string;
  display?: string;
  current: number | null;
  prior: number | null;
  unit?: string;
  betterWhenLower?: boolean;
}) {
  const dir = current != null && prior != null ? (current > prior ? 'up' : current < prior ? 'down' : 'flat') : null;
  const favourable = dir == null || dir === 'flat' ? null : (dir === 'down') === betterWhenLower;
  const arrowColor = favourable == null ? colors.textTertiary : favourable ? colors.recoveryGreen : colors.amber;
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '';
  const u = unit ?? '';
  return (
    <View style={metricStyles.row}>
      <Text style={metricStyles.label}>{label}</Text>
      <View style={{ alignItems: 'flex-end' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={metricStyles.value}>{display ?? (current != null ? `${current}${u}` : '—')}</Text>
          {arrow ? <Text style={[metricStyles.arrow, { color: arrowColor }]}> {arrow}</Text> : null}
        </View>
        {prior != null ? <Text style={metricStyles.prior}>{`${prior}${u}`}</Text> : null}
      </View>
    </View>
  );
}

/** WHOOP weekly bar chart (e.g. recovery %, strain, steps) with value labels. */
export function WeeklyBars({
  data,
  height = 170,
}: {
  data: Array<{ label: string; value: number | null; display?: string; color?: string }>;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value ?? 0));
  const barArea = height - 44;
  return (
    <View style={[weeklyStyles.wrap, { height }]}>
      {data.map((d, i) => (
        <View key={i} style={weeklyStyles.col}>
          <Text style={weeklyStyles.val}>{d.display ?? (d.value != null ? `${d.value}` : '')}</Text>
          <View
            style={[
              weeklyStyles.bar,
              { height: Math.max(2, ((d.value ?? 0) / max) * barArea), backgroundColor: d.color ?? colors.strainBlue },
            ]}
          />
          <Text style={weeklyStyles.day}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

const metricStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },
  value: { color: colors.text, fontSize: 20, fontWeight: '700' },
  arrow: { fontSize: 12 },
  prior: { color: colors.textTertiary, fontSize: 12, marginTop: 1 },
});

const weeklyStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end' },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  val: { color: colors.textSecondary, fontSize: 11, marginBottom: 4, fontWeight: '600' },
  bar: { width: 16, borderRadius: 3 },
  day: { color: colors.textTertiary, fontSize: 10, marginTop: 6 },
});

const contribStyles = StyleSheet.create({
  row: { marginVertical: 8 },
  head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  value: { fontSize: 16, fontWeight: '700' },
  track: { height: 8, backgroundColor: colors.surface, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  legend: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  legendLabel: { color: colors.textSecondary, fontSize: 11 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axisLabel: { color: colors.textTertiary, fontSize: 11 },
});
