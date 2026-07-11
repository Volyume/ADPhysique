import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line, Polyline, Rect, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { colors, radius, spacing, type, fonts, sleepStageColors, tintedWash } from './theme';
import { formatClock } from '../util/time';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Page chrome. With `onBack` a back chevron + inline title is shown (detail
 * screens); otherwise the large screen title. `tint` paints a subtle WHOOP-style
 * gradient wash behind the header in the metric's colour.
 */
export function Screen({
  title,
  children,
  onBack,
  tint,
  right,
}: {
  title: string;
  children: ReactNode;
  onBack?: () => void;
  tint?: string;
  right?: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {tint ? (
        <LinearGradient colors={tintedWash(tint)} style={styles.wash} pointerEvents="none" />
      ) : null}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {onBack ? (
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.headerRight}>{right}</View>
          </View>
        ) : (
          <View style={styles.titleRow}>
            <Text style={[type.screenTitle, styles.title]}>{title}</Text>
            {right}
          </View>
        )}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={[type.sectionLabel, styles.sectionLabel]}>{children}</Text>
      {right}
    </View>
  );
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
  const empty = value === '—' || value === '-' || value === '' || value == null;
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>
        <Text style={{ color: empty ? colors.textTertiary : color ?? colors.text, fontFamily: fonts.bold }}>{empty ? '—' : value}</Text>
        {unit && !empty ? <Text style={styles.statUnit}> {unit}</Text> : null}
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
      activeOpacity={0.85}
    >
      <Text style={styles.primaryBtnText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82}>
        {title}
      </Text>
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
      activeOpacity={0.85}
    >
      <Text style={styles.secondaryBtnText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * WHOOP-style progress ring that animates its fill on mount (ease-out ~1s),
 * with a soft gradient stroke. value 0..1.
 */
export function Ring({
  value,
  size = 200,
  stroke = 16,
  color,
  centerTop,
  centerMain,
  centerSub,
  animate = true,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color: string;
  centerTop?: string;
  centerMain?: string;
  centerSub?: string;
  animate?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const progress = useRef(new Animated.Value(animate ? 0 : clamped)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: clamped,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clamped, progress]);

  const dashoffset = progress.interpolate({ inputRange: [0, 1], outputRange: [c, c - c] });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.65" />
            <Stop offset="1" stopColor={color} stopOpacity="1" />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surface} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dashoffset as unknown as number}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[styles.ringCenter, { maxWidth: size - stroke * 2 - 16 }]}>
        {centerTop ? <Text style={styles.ringTop} numberOfLines={2}>{centerTop}</Text> : null}
        {centerMain ? <Text style={[styles.ringMain, { color: isEmptyDisplay(centerMain) ? colors.textTertiary : color }]}>{centerMain}</Text> : null}
        {centerSub ? <Text style={styles.ringSub} numberOfLines={1}>{centerSub}</Text> : null}
      </View>
    </View>
  );
}

/** A number that counts up from 0 on mount — WHOOP's metric reveal. */
export function AnimatedNumber({
  value,
  decimals = 0,
  style,
  suffix = '',
}: {
  value: number;
  decimals?: number;
  style?: TextStyle;
  suffix?: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState('0');
  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setShown(v.toFixed(decimals)));
    Animated.timing(anim, {
      toValue: value,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [value, decimals, anim]);
  return <Text style={style}>{shown}{suffix}</Text>;
}

/** Horizontal bar (e.g. HR zones). value 0..1. */
export function Bar({ value, color, label, right }: { value: number; color: string; label: string; right?: string }) {
  const percent = Math.max(2, Math.min(100, value * 100));
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <AnimatedFill percent={percent} color={color} style={styles.barFill} />
      </View>
      {right ? <Text style={styles.barRight}>{right}</Text> : null}
    </View>
  );
}

function AnimatedFill({
  percent,
  color,
  style,
  duration = 700,
}: {
  percent: number;
  color: string;
  style: ViewStyle;
  duration?: number;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const animated = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animated, {
      toValue: clamped,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animated, clamped, duration]);
  const width = animated.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return <Animated.View style={[style, { width, backgroundColor: color }]} />;
}

export function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

export function SleepConfidenceStatus({
  confidence,
  reason,
  onDetails,
  detailsLabel = 'Details',
}: {
  confidence: 'high' | 'medium' | 'low' | null | undefined;
  reason?: string;
  onDetails?: () => void;
  detailsLabel?: string;
}) {
  const good = confidence === 'high';
  const unavailable = confidence == null;
  const color = good ? colors.recoveryGreen : unavailable ? colors.textTertiary : colors.recoveryYellow;
  const label = good ? 'Good' : unavailable ? 'Unavailable' : 'Limited';
  const defaultReason = good
    ? 'The overnight record is strong enough to use.'
    : unavailable
      ? 'Sleep confidence is unavailable until an overnight record is available.'
      : confidence === 'medium'
        ? 'The result is usable, but more detail may refine it.'
        : 'Use timing with care until the overnight record is complete.';

  return (
    <View style={styles.confidenceStatus}>
      <View style={[styles.confidenceDot, { backgroundColor: color }]} />
      <View style={styles.confidenceCopy}>
        <Text style={[styles.confidenceLabel, { color }]}>{label}</Text>
        <Text style={styles.confidenceReason}>{reason ?? defaultReason}</Text>
      </View>
      {onDetails ? (
        <Pressable onPress={onDetails} hitSlop={8} style={({ pressed }) => [styles.confidenceAction, pressed && styles.pressed]}>
          <Text style={styles.confidenceActionText}>{detailsLabel}</Text>
          <Ionicons name="chevron-forward" size={15} color={colors.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export type TonightPlan = {
  targetMinutes: number;
  timeInBedMinutes: number;
  bedMinute: number;
  wakeMinute: number;
  expectedEfficiencyPercent: number;
};

/** Shared planner math for Sleep, Recovery and Sleep Coach. */
export function calculateTonightPlan(input: {
  neededMinutes: number;
  goal: number;
  wakeMinute: number;
  planningWindowMinutes: number;
  expectedEfficiencyPercent: number;
}): TonightPlan {
  const targetMinutes = Math.round(Math.max(0, input.neededMinutes) * input.goal);
  const expectedEfficiencyPercent = Number.isFinite(input.expectedEfficiencyPercent) ? input.expectedEfficiencyPercent : 85;
  const efficiency = Math.max(0.5, expectedEfficiencyPercent / 100);
  const timeInBedMinutes = Math.round(targetMinutes / efficiency);
  return {
    targetMinutes,
    timeInBedMinutes,
    bedMinute: input.wakeMinute - input.planningWindowMinutes - timeInBedMinutes,
    wakeMinute: input.wakeMinute,
    expectedEfficiencyPercent,
  };
}

export function tonightEfficiencyPercent(efficiencies: number[]): number {
  const usable = efficiencies.filter((value) => Number.isFinite(value) && value > 0);
  if (!usable.length) return 85;
  usable.sort((a, b) => a - b);
  return usable[Math.floor(usable.length / 2)] ?? 85;
}

export function parsePinnedWakeMinute(raw: string | null, pinnedRaw: string | null): number | null {
  const minute = raw == null ? NaN : Number(raw);
  if (!Number.isFinite(minute) || minute < 0 || minute >= 1440) return null;
  return pinnedRaw === '1' || pinnedRaw == null ? minute : null;
}

export function parsePlanningWindowMinute(raw: string | null): number {
  const minute = raw == null ? NaN : Number(raw);
  return minute === 0 || minute === 15 || minute === 30 || minute === 45 ? minute : 30;
}

export function TonightBand({
  targetMinutes,
  bedMinute,
  wakeMinute,
  onPress,
}: {
  targetMinutes: number;
  bedMinute: number;
  wakeMinute: number;
  onPress: () => void;
}) {
  return (
    <View style={styles.tonightBand}>
      <View style={styles.tonightCopy}>
        <Text style={styles.tonightLabel}>Tonight</Text>
        <Text style={styles.tonightPlan}>
          <Text style={styles.tonightStrong}>{formatDurationMinute(targetMinutes)} target</Text>
          {` · bed ${formatClockMinute(bedMinute)} · wake ${formatClockMinute(wakeMinute)}`}
        </Text>
      </View>
      <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.tonightAction, pressed && styles.pressed]}>
        <Text style={styles.tonightActionText}>Sleep Coach</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.sleepTeal} />
      </Pressable>
    </View>
  );
}

function formatClockMinute(minute: number): string {
  const normalized = ((Math.round(minute) % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function formatDurationMinute(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return hours > 0 ? `${hours}h${remainder ? ` ${remainder}m` : ''}` : `${remainder}m`;
}

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
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, fraction));
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: clamped,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clamped, progress]);
  const dashoffset = progress.interpolate({ inputRange: [0, 1], outputRange: [c, c - c] });
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={dialStyles.wrap}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surface} strokeWidth={stroke} fill="none" />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={dashoffset as unknown as number}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={dialStyles.center}>
          <Text style={[dialStyles.main, { color: isEmptyDisplay(main) ? colors.textTertiary : color }]}>{main}</Text>
        </View>
      </View>
      <Text style={dialStyles.label}>{label}</Text>
      {sub ? <Text style={dialStyles.sub}>{sub}</Text> : null}
    </TouchableOpacity>
  );
}

const STAGE_COLOR: Record<string, string> = {
  awake: sleepStageColors.awake,
  rem: sleepStageColors.rem,
  light: sleepStageColors.light,
  deep: sleepStageColors.deep,
};
const STAGE_LANE: Record<string, number> = { awake: 0, rem: 1, light: 2, deep: 3 };

/** WHOOP-style sleep hypnogram: stage segments across the night, by lane. */
export function Hypnogram({
  segments,
  showLabels = false,
  startTs,
  endTs,
}: {
  segments: Array<{ stage: string; minutes: number }>;
  showLabels?: boolean;
  startTs?: number;
  endTs?: number;
}) {
  const total = segments.reduce((a, b) => a + b.minutes, 0) || 1;
  const cleanSegments = segments.filter((s) => s.minutes > 0);
  const signature = cleanSegments.map((s) => `${s.stage}:${s.minutes}`).join('|');
  const reveal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [signature, reveal]);
  if (!cleanSegments.length) return null;

  const rows = ['awake', 'rem', 'light', 'deep'] as const;
  const rowLabels: Record<(typeof rows)[number], string> = {
    awake: 'Awake',
    rem: 'REM',
    light: 'Light',
    deep: 'Deep',
  };
  const W = 1000;
  const laneH = 18;
  const gap = 5;
  const H = 4 * laneH + 3 * gap;
  let x = 0;
  const rects = cleanSegments.map((s, i) => {
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
        fill={STAGE_COLOR[s.stage] ?? sleepStageColors.light}
      />
    );
  });
  const translateY = reveal.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  const showTimeAxis = startTs != null && endTs != null && endTs > startTs;
  const midTs = showTimeAxis ? startTs + (endTs - startTs) / 2 : null;
  return (
    <Animated.View style={[hypnogramStyles.wrap, { opacity: reveal, transform: [{ translateY }] }]}>
      <View style={hypnogramStyles.plotRow}>
        {showLabels ? (
          <View style={[hypnogramStyles.labels, { height: H }]}>
            {rows.map((stage) => (
              <Text key={stage} style={hypnogramStyles.label}>
                {rowLabels[stage]}
              </Text>
            ))}
          </View>
        ) : null}
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={hypnogramStyles.chart}>
          {rows.map((stage) => (
            <Rect
              key={`lane-${stage}`}
              x={0}
              y={(STAGE_LANE[stage] ?? 0) * (laneH + gap) + laneH / 2}
              width={W}
              height={1}
              fill={colors.border}
            />
          ))}
          {rects}
        </Svg>
      </View>
      {showTimeAxis && midTs != null ? (
        <View style={hypnogramStyles.axisRow}>
          {showLabels ? <View style={hypnogramStyles.axisSpacer} /> : null}
          <View style={hypnogramStyles.axis}>
            <Text style={hypnogramStyles.axisLabel}>{formatClock(startTs)}</Text>
            <Text style={hypnogramStyles.axisLabel}>{formatClock(midTs)}</Text>
            <Text style={hypnogramStyles.axisLabel}>{formatClock(endTs)}</Text>
          </View>
        </View>
      ) : null}
    </Animated.View>
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

/** WHOOP Poor / Sufficient / Optimal band for a 0–100 contributor. */
export function band(percent: number | null): string {
  if (percent == null) return colors.textTertiary;
  if (percent >= 85) return colors.recoveryGreen; // Optimal
  if (percent >= 50) return colors.recoveryYellow; // Sufficient
  return colors.recoveryRed; // Poor
}

function isEmptyDisplay(value: string): boolean {
  return value === '—' || value === '-';
}

/** A WHOOP-style contributor row: label, progress bar (banded), right value. */
export function ContributorRow({
  label,
  percent,
  value,
  onPress,
  color,
}: {
  label: string;
  percent: number | null;
  value?: string;
  onPress?: () => void;
  color?: string;
}) {
  const c = color ?? band(percent);
  const body = (
    <View style={contribStyles.row}>
      <View style={contribStyles.head}>
        <Text style={contribStyles.label}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[contribStyles.value, { color: c }]}>
            {value ?? (percent != null ? `${Math.round(percent)}%` : '—')}
          </Text>
          {onPress ? <Ionicons name="chevron-forward" size={15} color={colors.textTertiary} style={{ marginLeft: 4 }} /> : null}
        </View>
      </View>
      <View style={contribStyles.track}>
        <AnimatedFill percent={percent ?? 0} color={c} style={contribStyles.fill} />
      </View>
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

export function BandLegend() {
  return (
    <View style={contribStyles.legend}>
      <LegendDot color={colors.recoveryRed} label="Poor" />
      <LegendDot color={colors.recoveryYellow} label="Sufficient" />
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
  fill = false,
}: {
  values: number[];
  color?: string;
  height?: number;
  leftLabel?: string;
  rightLabel?: string;
  fill?: boolean;
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
  const area = `0,${H} ${pts} ${W},${H}`;
  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.35" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        {fill ? <Polyline points={area} fill="url(#areaGrad)" stroke="none" /> : null}
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
 * Oura-style deviation chart: values plotted against a shaded "typical range"
 * band (baseline ± sd) with a grey baseline line, so you read deviation from
 * normal rather than absolute numbers. Last point is marked.
 */
export function BaselineChart({
  values,
  baseline,
  sd,
  color = colors.recoveryGreen,
  height = 140,
}: {
  values: number[];
  baseline: number;
  sd: number;
  color?: string;
  height?: number;
}) {
  if (values.length < 2) {
    return <Empty text="Not enough history yet for a baseline trend." />;
  }
  const W = 1000;
  const H = 200;
  const all = [...values, baseline - sd, baseline + sd];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const y = (v: number) => H - ((v - min) / range) * H;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${y(v)}`).join(' ');
  const bandTop = y(baseline + sd);
  const bandH = Math.max(2, y(baseline - sd) - y(baseline + sd));
  const lastX = W;
  const lastY = y(values[values.length - 1] as number);
  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Rect x={0} y={bandTop} width={W} height={bandH} fill="#9aa6ad" fillOpacity={0.12} />
        <Line x1={0} y1={y(baseline)} x2={W} y2={y(baseline)} stroke="#727778" strokeWidth={2} strokeDasharray="8 8" />
        <Polyline points={pts} fill="none" stroke={color} strokeWidth={4} strokeLinejoin="round" />
        <Circle cx={lastX} cy={lastY} r={9} fill={color} />
      </Svg>
      <View style={contribStyles.axis}>
        <Text style={contribStyles.axisLabel}>typical range shaded · baseline dashed</Text>
        <Text style={contribStyles.axisLabel}>now</Text>
      </View>
    </View>
  );
}

/**
 * WHOOP contributor row: label on the left; today's value with a coloured
 * up/down arrow on the right; the 30-day comparison value beneath it.
 */
export function MetricRow({
  label,
  display,
  current,
  prior,
  unit,
  betterWhenLower = false,
  onPress,
}: {
  label: string;
  display?: string;
  current: number | null;
  prior: number | null;
  unit?: string;
  betterWhenLower?: boolean;
  onPress?: () => void;
}) {
  const dir = current != null && prior != null ? (current > prior ? 'up' : current < prior ? 'down' : 'flat') : null;
  const favourable = dir == null || dir === 'flat' ? null : (dir === 'down') === betterWhenLower;
  const arrowColor = favourable == null ? colors.textTertiary : favourable ? colors.recoveryGreen : colors.recoveryRed;
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '';
  const u = unit ?? '';
  const body = (
    <View style={metricStyles.row}>
      <Text style={metricStyles.label}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={metricStyles.value}>{display ?? (current != null ? `${current}${u}` : '—')}</Text>
            {arrow ? <Text style={[metricStyles.arrow, { color: arrowColor }]}> {arrow}</Text> : null}
          </View>
          {prior != null ? <Text style={metricStyles.prior}>{`${prior}${u}`}</Text> : null}
        </View>
        {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginLeft: 8 }} /> : null}
      </View>
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

/** WHOOP weekly bar chart with value labels. */
export function WeeklyBars({
  data,
  height = 170,
}: {
  data: Array<{
    label: string;
    value: number | null;
    display?: string;
    color?: string;
    confidence?: 'high' | 'medium' | 'low' | null;
    dimmed?: boolean;
  }>;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value ?? 0));
  const hasConfidence = data.some((d) => d.confidence === 'medium' || d.confidence === 'low' || d.dimmed);
  const barArea = height - (hasConfidence ? 52 : 44);
  return (
    <View style={[weeklyStyles.wrap, { height }]}>
      {data.map((d, i) => {
        const barOpacity = d.dimmed || d.confidence === 'low' ? 0.38 : d.confidence === 'medium' ? 0.64 : 1;
        const dotColor = d.confidence === 'low' ? colors.recoveryRed : d.confidence === 'medium' ? colors.recoveryYellow : 'transparent';
        return (
          <View key={i} style={weeklyStyles.col}>
            <Text style={[weeklyStyles.val, barOpacity < 1 && weeklyStyles.dimText]}>{d.display ?? (d.value != null ? `${d.value}` : '')}</Text>
            {hasConfidence ? <View style={[weeklyStyles.qualityDot, { backgroundColor: dotColor }]} /> : null}
            <AnimatedWeeklyBar
              height={Math.max(2, ((d.value ?? 0) / max) * barArea)}
              color={d.color ?? colors.strainBlue}
              delay={i * 35}
              opacity={barOpacity}
            />
            <Text style={weeklyStyles.day}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function AnimatedWeeklyBar({ height, color, delay, opacity }: { height: number; color: string; delay: number; opacity?: number }) {
  const animated = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animated, {
      toValue: height,
      duration: 650,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animated, delay, height]);
  return <Animated.View style={[weeklyStyles.bar, { height: animated, backgroundColor: color, opacity: opacity ?? 1 }]} />;
}

/** A tappable navigation row: icon + label, optional value, chevron. */
export function NavRow({
  label,
  value,
  icon,
  iconColor,
  onPress,
  last,
}: {
  label: string;
  value?: string;
  icon?: string;
  iconColor?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [navRowStyles.row, last && navRowStyles.last, pressed && styles.pressed]}>
      {icon ? (
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={iconColor ?? colors.textSecondary} style={navRowStyles.icon} />
      ) : null}
      <Text style={navRowStyles.label}>{label}</Text>
      <View style={{ flex: 1 }} />
      {value ? <Text style={navRowStyles.value}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} style={{ marginLeft: 6 }} />
    </Pressable>
  );
}

/** A tappable summary tile (icon, title, big value, chevron) for the home grid. */
export function Tile({
  title,
  value,
  sub,
  icon,
  color,
  onPress,
  style,
}: {
  title: string;
  value: string;
  sub?: string;
  icon?: string;
  color?: string;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, tileStyles.tile, style, pressed && styles.pressed]}>
      <View style={tileStyles.head}>
        {icon ? <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={color ?? colors.textSecondary} /> : null}
        <Text style={tileStyles.title}>{title}</Text>
        <View style={{ flex: 1 }} />
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
      <Text style={[tileStyles.value, { color: value === '—' ? colors.textTertiary : color ?? colors.text }]}>{value}</Text>
      {sub ? <Text style={tileStyles.sub}>{sub}</Text> : null}
    </Pressable>
  );
}

/** Floating action button — WHOOP's "+" for logging. */
export function FAB({ onPress, icon = 'add' }: { onPress: () => void; icon?: string }) {
  return (
    <TouchableOpacity style={fabStyles.fab} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={30} color="#000" />
    </TouchableOpacity>
  );
}

/** Small coloured pill / chip. */
export function Pill({ text, color = colors.surface, textColor = colors.text }: { text: string; color?: string; textColor?: string }) {
  return (
    <View style={[pillStyles.pill, { backgroundColor: color }]}>
      <Text style={[pillStyles.text, { color: textColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  scroll: { padding: spacing.screen, paddingBottom: 48 },
  title: { marginBottom: spacing.item },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.item, minHeight: 32 },
  backBtn: { marginLeft: -6, marginRight: 2 },
  headerTitle: { flex: 1, color: colors.text, fontSize: 18, fontFamily: fonts.textBold },
  headerRight: { minWidth: 24, alignItems: 'flex-end' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.card,
    marginTop: spacing.item,
  },
  pressed: { opacity: 0.6 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.section, marginBottom: spacing.sm },
  sectionLabel: {},
  stat: { flex: 1 },
  statValue: { fontSize: 24, color: colors.text },
  statUnit: { fontSize: 12, color: colors.textSecondary, fontFamily: fonts.text },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontFamily: fonts.text },
  primaryBtn: {
    backgroundColor: colors.white,
    borderRadius: radius.button,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.item,
  },
  primaryBtnText: { color: '#000000', fontSize: 14, fontFamily: fonts.textBold, letterSpacing: 0.5, textAlign: 'center', textTransform: 'uppercase' },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.item,
  },
  secondaryBtnText: { color: colors.text, fontSize: 14, fontFamily: fonts.textSemibold, letterSpacing: 0.5, textAlign: 'center', textTransform: 'uppercase' },
  btnDisabled: { opacity: 0.4 },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringTop: { color: colors.textSecondary, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: fonts.textBold },
  ringMain: { fontSize: 54, fontFamily: fonts.black },
  ringSub: { color: colors.textSecondary, fontSize: 13, marginTop: 2, fontFamily: fonts.text },
  barRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  barLabel: { color: colors.textSecondary, fontSize: 12, width: 56, fontFamily: fonts.text },
  barTrack: { flex: 1, height: 10, backgroundColor: colors.surface, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  barRight: { color: colors.textSecondary, fontSize: 12, width: 60, textAlign: 'right', fontFamily: fonts.text },
  empty: { color: colors.textTertiary, fontSize: 13, marginTop: spacing.item, lineHeight: 18, fontFamily: fonts.text },
  confidenceStatus: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: spacing.item, paddingVertical: 10, paddingHorizontal: 2 },
  confidenceDot: { width: 9, height: 9, borderRadius: 5 },
  confidenceCopy: { flex: 1 },
  confidenceLabel: { fontSize: 13, fontFamily: fonts.textBold },
  confidenceReason: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 1, fontFamily: fonts.text },
  confidenceAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  confidenceActionText: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.textSemibold },
  tonightBand: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 11, marginTop: spacing.item },
  tonightCopy: { flex: 1 },
  tonightLabel: { color: colors.sleepTeal, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontFamily: fonts.textBold },
  tonightPlan: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 2, fontFamily: fonts.text },
  tonightStrong: { color: colors.text, fontFamily: fonts.textBold },
  tonightAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  tonightActionText: { color: colors.sleepTeal, fontSize: 12, fontFamily: fonts.textBold },
});

const dialStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  main: { fontSize: 22, fontFamily: fonts.black },
  label: { color: colors.textSecondary, fontSize: 12, marginTop: 6, fontFamily: fonts.textBold },
  sub: { color: colors.textTertiary, fontSize: 11, marginTop: 1, fontFamily: fonts.text },
});

const hypnogramStyles = StyleSheet.create({
  wrap: { marginTop: 16 },
  plotRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  labels: { width: 42, justifyContent: 'space-between' },
  label: { color: colors.textTertiary, fontSize: 10, fontFamily: fonts.textBold },
  chart: { flex: 1 },
  axisRow: { flexDirection: 'row', marginTop: 7 },
  axisSpacer: { width: 50 },
  axis: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { color: colors.textTertiary, fontSize: 10, fontFamily: fonts.text },
});

const metricStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { color: colors.text, fontSize: 14, fontFamily: fonts.textSemibold, letterSpacing: 0.3 },
  value: { color: colors.text, fontSize: 20, fontFamily: fonts.bold },
  arrow: { fontSize: 12 },
  prior: { color: colors.textTertiary, fontSize: 12, marginTop: 1, fontFamily: fonts.text },
});

const weeklyStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end' },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  val: { color: colors.textSecondary, fontSize: 11, marginBottom: 4, fontFamily: fonts.medium },
  dimText: { color: colors.textTertiary },
  qualityDot: { width: 5, height: 5, borderRadius: 2.5, marginBottom: 5 },
  bar: { width: 18, borderRadius: 4 },
  day: { color: colors.textTertiary, fontSize: 10, marginTop: 6, fontFamily: fonts.text },
});

const contribStyles = StyleSheet.create({
  row: { marginVertical: 8 },
  head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' },
  label: { color: colors.text, fontSize: 14, fontFamily: fonts.textSemibold },
  value: { fontSize: 16, fontFamily: fonts.bold },
  track: { height: 8, backgroundColor: colors.surface, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  legend: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  legendLabel: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.text },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axisLabel: { color: colors.textTertiary, fontSize: 11, fontFamily: fonts.text },
});

const navRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  last: { borderBottomWidth: 0 },
  icon: { marginRight: 12, width: 22, textAlign: 'center' },
  label: { color: colors.text, fontSize: 15, fontFamily: fonts.textSemibold },
  value: { color: colors.textSecondary, fontSize: 14, fontFamily: fonts.text },
});

const tileStyles = StyleSheet.create({
  tile: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.textBold, letterSpacing: 1, textTransform: 'uppercase' },
  value: { fontSize: 22, fontFamily: fonts.bold, marginTop: 10 },
  sub: { color: colors.textTertiary, fontSize: 12, marginTop: 2, fontFamily: fonts.text },
});

const fabStyles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});

const pillStyles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontFamily: fonts.textBold, letterSpacing: 0.5 },
});
