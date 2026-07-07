import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, PrimaryButton, Screen, SecondaryButton, SectionLabel, Stat } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav, Route } from '../ui/navigation';
import { formatDuration } from '../util/time';
import { kvGet, kvSet } from '../db/database';
import { sleepTrustTier } from '../metrics/sleepTrustWeight';

function fmtClock(minOfDay: number): string {
  const m = ((minOfDay % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function nextWakeTimestamp(wakeMin: number, now = Date.now()): number {
  const d = new Date(now);
  d.setHours(Math.floor(wakeMin / 60), wakeMin % 60, 0, 0);
  if (d.getTime() <= now + 30 * 1000) d.setDate(d.getDate() + 1);
  return d.getTime();
}
function relativeMin(targetTs: number, now = Date.now()): number {
  return Math.max(0, Math.round((targetTs - now) / 60000));
}
function formatAlarmDate(ts: number | null): string {
  if (!ts) return 'None set';
  return new Date(ts).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}
function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? null;
}
function displayPct(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

const MODES: Array<{ key: number; name: string; pct: string; desc: string }> = [
  { key: 0.7, name: 'Get By', pct: '70%', desc: 'Minimum to function' },
  { key: 0.85, name: 'Perform', pct: '85%', desc: 'Balance sleep with performance' },
  { key: 1.0, name: 'Peak', pct: '100%', desc: 'Fully optimise recovery' },
];
const SMART_WINDOWS = [0, 15, 30, 45] as const;
type GoalMode = (typeof MODES)[number];

export function SleepCoachScreen({ nav }: { nav: Nav }) {
  const need = useStoreSelector(appStore, (s) => s.sleepNeed);
  const goal = useStoreSelector(appStore, (s) => s.sleepGoal);
  const lastSleep = useStoreSelector(appStore, (s) => s.lastSleep);
  const sleepPerformance = useStoreSelector(appStore, (s) => s.sleepPerformance);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);
  const readiness = useStoreSelector(appStore, (s) => s.trainingReadiness);
  const today = useStoreSelector(appStore, (s) => s.today);
  const status = useStoreSelector(appStore, (s) => s.status);
  const keepAlive = useStoreSelector(appStore, (s) => s.backgroundKeepAlive);
  const keepAliveRunning = useStoreSelector(appStore, (s) => s.backgroundKeepAliveRunning);
  const strapAlarm = useStoreSelector(appStore, (s) => s.strapAlarm);
  const [alarmBusy, setAlarmBusy] = useState<'set' | 'disable' | null>(null);

  const neededMin = need?.neededMin ?? 480;
  const targetMin = Math.round(neededMin * goal);

  // Sleep Planner (per WHOOP's published model): the recommended TIME IN BED to
  // hit your goal accounts for your typical sleep efficiency; the suggested
  // bedtime is your wake time minus that. Wake time is user-set and persisted.
  const [wakeMin, setWakeMin] = useState(7 * 60); // default 07:00
  const [smartWindowMin, setSmartWindowMin] = useState(30);
  useEffect(() => {
    void kvGet('wakeTime').then((v) => {
      const n = v ? Number(v) : NaN;
      if (Number.isFinite(n)) setWakeMin(n);
    });
    void kvGet('smartWakeWindowMin').then((v) => {
      const n = v ? Number(v) : NaN;
      if (SMART_WINDOWS.includes(n as (typeof SMART_WINDOWS)[number])) setSmartWindowMin(n);
    });
  }, []);
  const setWake = (m: number) => {
    const next = ((m % 1440) + 1440) % 1440;
    setWakeMin(next);
    void kvSet('wakeTime', String(next));
  };
  const setSmartWindow = (m: number) => {
    setSmartWindowMin(m);
    void kvSet('smartWakeWindowMin', String(m));
  };
  const effSamples = recentDays
    .map((d) => d.sleepDetail?.efficiency)
    .filter((v): v is number => v != null && v > 0);
  const expectedEff = (median(effSamples) ?? 85) / 100; // fraction, fallback 85%
  const tibNeededMin = Math.round(targetMin / Math.max(0.5, expectedEff));
  const bedMin = wakeMin - tibNeededMin;
  const smartStartMin = wakeMin - smartWindowMin;
  const nextWakeTs = nextWakeTimestamp(wakeMin);
  const plannedBedTs = nextWakeTs - tibNeededMin * 60000;
  const bedCountdownMin = relativeMin(plannedBedTs);
  const wakeCountdownMin = relativeMin(nextWakeTs);
  const inSleepWindow = Date.now() >= plannedBedTs;
  const connected = status === 'connected';
  const lastSleepTrust = sleepTrustTier(today?.sleepDetail);
  const lastSleepPerformancePct = displayPct(
    sleepPerformance?.score ?? today?.sleepDetail?.performance ?? (lastSleep?.performance != null ? lastSleep.performance * 100 : null),
  );
  const alarmArmed = strapAlarm.enabled || strapAlarm.pendingWrite === 'set';
  const alarmMatchesWakeTarget =
    alarmArmed &&
    strapAlarm.wakeTs != null &&
    strapAlarm.wakeTs > Date.now() + 30 * 1000 &&
    Math.abs(strapAlarm.wakeTs - nextWakeTs) <= 2 * 60 * 1000;
  const recommendation = goalRecommendation({
    readinessScore: readiness?.score ?? null,
    recovery: today?.recovery ?? null,
    sleepDebtMin: need?.debtMin ?? 0,
    lastSleep,
    lastSleepTrusted: lastSleepTrust === 'high' || lastSleepTrust === 'medium',
    currentGoal: goal,
  });
  const alarmMeta =
    alarmArmed && !alarmMatchesWakeTarget
      ? `Needs update for ${fmtClock(wakeMin)}`
      : strapAlarm.pendingWrite === 'set'
        ? `Queued for ${formatAlarmDate(strapAlarm.wakeTs)}`
        : strapAlarm.pendingWrite === 'disable'
          ? 'Disable queued for next connection'
          : strapAlarm.enabled
            ? `Set for ${formatAlarmDate(strapAlarm.wakeTs)}`
            : 'Off on this app';
  const alarmActionTitle = alarmMatchesWakeTarget
    ? `${connected ? 'Re-arm' : 'Queue'} latest alarm for ${fmtClock(wakeMin)}`
    : `${connected ? 'Set' : 'Queue'} latest alarm for ${fmtClock(wakeMin)}`;
  const checklist = tonightChecklist({
    connected,
    keepAlive,
    keepAliveRunning,
    alarmArmed,
    alarmMatchesWakeTarget,
    wakeMin,
    targetMin,
    tibNeededMin,
    sleepDebtMin: need?.debtMin ?? 0,
    inSleepWindow,
  });

  const setWakeAlarm = async () => {
    if (alarmBusy) return;
    setAlarmBusy('set');
    try {
      const result = await appStore.setStrapWakeAlarm(nextWakeTs);
      Alert.alert(
        result === 'sent' ? 'Wake alarm set' : 'Wake alarm queued',
        result === 'sent'
          ? `The strap wake alarm is set for ${formatAlarmDate(nextWakeTs)}.`
          : `Pulse will set the strap wake alarm for ${formatAlarmDate(nextWakeTs)} when it reconnects.`,
      );
    } catch (e) {
      Alert.alert('Could not set wake alarm', String(e));
    } finally {
      setAlarmBusy(null);
    }
  };

  const disableWakeAlarm = async () => {
    if (alarmBusy) return;
    setAlarmBusy('disable');
    try {
      const result = await appStore.disableStrapAlarm();
      Alert.alert(
        result === 'sent' ? 'Wake alarm disabled' : 'Wake alarm queued',
        result === 'sent'
          ? 'The strap alarm disable command was sent.'
          : 'Pulse will disable the strap alarm automatically when it reconnects.',
      );
    } catch (e) {
      Alert.alert('Could not disable wake alarm', String(e));
    } finally {
      setAlarmBusy(null);
    }
  };

  const rows = need
    ? [
        { label: 'Baseline', min: need.baselineMin, color: colors.sleepTeal },
        { label: 'Recent Strain', min: need.strainMin, color: colors.strainBlue },
        { label: 'Sleep Debt', min: need.debtMin, color: colors.recoveryYellow },
        { label: 'Recent Naps', min: -need.napMin, color: colors.textTertiary },
      ]
    : [];

  return (
    <Screen title="Sleep Coach" onBack={nav.back} tint={colors.sleepTeal}>
      <Card>
        <Text style={styles.bigLabel}>SLEEP NEEDED</Text>
        <Text style={styles.bigValue}>{formatDuration(neededMin)}</Text>
        <Text style={styles.bigSub}>
          Recommended for your goal: {formatDuration(targetMin)} ({MODES.find((m) => m.key === goal)?.pct})
        </Text>
      </Card>

      <SectionLabel>Recommended tonight</SectionLabel>
      <Card>
        <View style={styles.recommendHead}>
          <View style={[styles.recommendBadge, { backgroundColor: recommendation.color }]}>
            <Text style={styles.recommendBadgeText}>{recommendation.mode.pct}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.recommendTitle}>{recommendation.mode.name}</Text>
            <Text style={styles.recommendBody}>{recommendation.reason}</Text>
          </View>
        </View>
        <View style={styles.recommendStats}>
          <Stat label="Readiness" value={readiness?.score ?? '-'} color={readyColor(readiness?.score)} />
          <Stat label="Recovery" value={today?.recovery != null ? `${today.recovery}%` : '-'} color={readyColor(today?.recovery)} />
          <Stat label="Sleep trust" value={lastSleepTrust === 'none' ? '-' : lastSleepTrust} color={trustColor(lastSleepTrust)} />
          <Stat label="Debt" value={formatDuration(need?.debtMin ?? 0)} color={(need?.debtMin ?? 0) >= 60 ? colors.recoveryYellow : colors.sleepTeal} />
        </View>
        {recommendation.mode.key !== goal ? (
          <SecondaryButton title={`Apply ${recommendation.mode.pct} ${recommendation.mode.name}`} onPress={() => void appStore.setSleepGoal(recommendation.mode.key)} />
        ) : (
          <Text style={styles.recommendMeta}>Your current goal already matches tonight's signal.</Text>
        )}
      </Card>

      <SectionLabel>Choose your sleep goal</SectionLabel>
      <Card style={{ paddingVertical: 4 }}>
        {MODES.map((m, i) => (
          <Pressable
            key={m.key}
            onPress={() => void appStore.setSleepGoal(m.key)}
            style={[styles.modeRow, i < MODES.length - 1 && styles.modeBorder]}
          >
            <View style={[styles.radio, goal === m.key && styles.radioOn]}>
              {goal === m.key ? <View style={styles.radioDot} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeName}>
                {m.pct} · {m.name}
              </Text>
              <Text style={styles.modeDesc}>{m.desc}</Text>
            </View>
            <Text style={styles.modeHours}>{formatDuration(Math.round(neededMin * m.key))}</Text>
          </Pressable>
        ))}
      </Card>

      <SectionLabel>Tonight readiness</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        {checklist.map((item, i) => (
          <ReadinessRow
            key={item.label}
            item={item}
            last={i === checklist.length - 1}
            onPress={item.route ? () => nav.navigate(item.route!) : undefined}
          />
        ))}
      </Card>

      <SectionLabel>Sleep planner</SectionLabel>
      <Card>
        <View style={styles.planRow}>
          <View style={styles.planCell}>
            <Text style={styles.planValue}>{fmtClock(bedMin)}</Text>
            <Text style={styles.planLabel}>SUGGESTED TIME TO BED</Text>
          </View>
          <View style={styles.planCell}>
            <Text style={styles.planValue}>{formatDuration(tibNeededMin)}</Text>
            <Text style={styles.planLabel}>RECOMMENDED TIME IN BED</Text>
          </View>
        </View>
        <View style={styles.wakeRow}>
          <Text style={styles.wakeLabel}>Wake-up time</Text>
          <View style={styles.stepper}>
            <Pressable hitSlop={10} onPress={() => setWake(wakeMin - 15)} style={styles.stepBtn}>
              <Text style={styles.stepTxt}>−</Text>
            </Pressable>
            <Text style={styles.wakeValue}>{fmtClock(wakeMin)}</Text>
            <Pressable hitSlop={10} onPress={() => setWake(wakeMin + 15)} style={styles.stepBtn}>
              <Text style={styles.stepTxt}>+</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.planNote}>
          To reach {MODES.find((m) => m.key === goal)?.pct} of your sleep need ({formatDuration(targetMin)} asleep),
          allowing for your typical {Math.round(expectedEff * 100)}% efficiency.
        </Text>
        <View style={styles.tonightRow}>
          <View style={[styles.tonightDot, { backgroundColor: inSleepWindow ? colors.recoveryYellow : colors.sleepTeal }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tonightTitle}>{inSleepWindow ? 'Sleep window is open' : `Bed in ${formatDuration(bedCountdownMin)}`}</Text>
            <Text style={styles.tonightMeta}>
              {inSleepWindow
                ? `${formatDuration(wakeCountdownMin)} until planned wake at ${fmtClock(wakeMin)}`
                : `Suggested bed ${fmtClock(bedMin)} for ${formatDuration(tibNeededMin)} in bed`}
            </Text>
          </View>
        </View>
      </Card>

      <SectionLabel>Wake alarm</SectionLabel>
      <Card>
        <View style={styles.alarmRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.alarmTitle}>Wake window</Text>
            <Text style={styles.alarmMeta}>{alarmMeta}</Text>
          </View>
          <Text style={styles.alarmTime}>{fmtClock(wakeMin)}</Text>
        </View>
        <View style={styles.smartSummary}>
          <Text style={styles.smartText}>
            {smartWindowMin > 0
              ? `${fmtClock(smartStartMin)}-${fmtClock(wakeMin)} window; strap fallback at latest wake time.`
              : `Fixed wake alarm at ${fmtClock(wakeMin)}.`}
          </Text>
        </View>
        <View style={styles.windowChips}>
          {SMART_WINDOWS.map((m) => (
            <Pressable key={m} onPress={() => setSmartWindow(m)} style={[styles.windowChip, smartWindowMin === m && styles.windowChipOn]}>
              <Text style={[styles.windowText, smartWindowMin === m && styles.windowTextOn]}>{m === 0 ? 'Fixed' : `${m}m`}</Text>
            </Pressable>
          ))}
        </View>
        <PrimaryButton
          title={alarmBusy === 'set' ? (connected ? 'Setting...' : 'Queueing...') : alarmActionTitle}
          onPress={() => void setWakeAlarm()}
          disabled={!!alarmBusy}
        />
        <SecondaryButton
          title={alarmBusy === 'disable' ? 'Disabling...' : connected ? 'Disable strap alarm' : 'Queue disable alarm'}
          onPress={() => void disableWakeAlarm()}
          disabled={!!alarmBusy}
        />
        <Text style={styles.planNote}>
          Pulse stores the wake window locally and arms the strap at the latest wake time so you still have a
          reliable haptic fallback if the phone is asleep or disconnected.
        </Text>
      </Card>

      <SectionLabel>How sleep need is calculated</SectionLabel>
      <Card>
        {need ? (
          <>
            {rows.map((r) => (
              <View key={r.label} style={styles.breakRow}>
                <View style={[styles.swatch, { backgroundColor: r.color }]} />
                <Text style={styles.breakLabel}>{r.label}</Text>
                <Text style={styles.breakVal}>
                  {r.min >= 0 ? '+' : '−'}
                  {formatDuration(Math.abs(r.min))}
                </Text>
              </View>
            ))}
            <View style={[styles.breakRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Sleep Needed</Text>
              <Text style={styles.totalVal}>{formatDuration(neededMin)}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.blurb}>
            Your sleep need starts from a personal baseline (~8 h), then adds time for recent strain
            and accrued sleep debt, minus credit for naps. Wear the strap overnight to populate it.
          </Text>
        )}
      </Card>

      {lastSleep ? (
        <>
          <SectionLabel>Last night</SectionLabel>
          <Card>
            <View style={styles.breakRow}>
              <Text style={styles.breakLabel}>Asleep</Text>
              <Text style={styles.breakVal}>{formatDuration(lastSleep.asleepMin)}</Text>
            </View>
            <View style={styles.breakRow}>
              <Text style={styles.breakLabel}>Sleep performance</Text>
              <Text style={styles.breakVal}>
                {lastSleepPerformancePct != null ? `${lastSleepPerformancePct}%` : '—'}
              </Text>
            </View>
            <View style={styles.breakRow}>
              <Text style={styles.breakLabel}>Efficiency</Text>
              <Text style={styles.breakVal}>{Math.round(lastSleep.efficiency * 100)}%</Text>
            </View>
          </Card>
        </>
      ) : null}

      <Text style={styles.alarmNote}>
        Keep background sync protection on for the best chance of updating the strap before your wake window.
      </Text>
    </Screen>
  );
}

function readyColor(value: number | null | undefined): string {
  if (value == null) return colors.textTertiary;
  if (value >= 70) return colors.recoveryGreen;
  if (value >= 50) return colors.recoveryYellow;
  return colors.recoveryRed;
}

function trustColor(tier: ReturnType<typeof sleepTrustTier>): string {
  if (tier === 'high') return colors.recoveryGreen;
  if (tier === 'medium') return colors.recoveryYellow;
  if (tier === 'low') return colors.recoveryRed;
  return colors.textTertiary;
}

function modeFor(key: number): GoalMode {
  return MODES.find((m) => m.key === key) ?? MODES[1]!;
}

function goalRecommendation(input: {
  readinessScore: number | null;
  recovery: number | null;
  sleepDebtMin: number;
  lastSleep: ReturnType<typeof appStore.getState>['lastSleep'];
  lastSleepTrusted: boolean;
  currentGoal: number;
}): { mode: GoalMode; reason: string; color: string } {
  const shortfallMin = input.lastSleep && input.lastSleepTrusted
    ? Math.max(0, (input.lastSleep.neededMin || 480) - input.lastSleep.asleepMin)
    : 0;

  if (input.lastSleep && !input.lastSleepTrusted) {
    return {
      mode: modeFor(Math.max(input.currentGoal, 0.85)),
      reason: 'Last night is low-confidence, so keep a steady target and let auto sync finish before changing the plan from that result.',
      color: colors.recoveryYellow,
    };
  }

  if (input.sleepDebtMin >= 90 || shortfallMin >= 90 || (input.recovery != null && input.recovery < 34)) {
    return {
      mode: modeFor(1.0),
      reason: `Recovery needs priority: ${formatDuration(input.sleepDebtMin)} debt and ${formatDuration(shortfallMin)} shortfall from the last scored night.`,
      color: colors.recoveryYellow,
    };
  }

  if ((input.readinessScore != null && input.readinessScore < 50) || input.sleepDebtMin >= 45 || shortfallMin >= 45) {
    return {
      mode: modeFor(0.85),
      reason: 'Aim for enough sleep to stabilise recovery without forcing an unrealistic full catch-up night.',
      color: colors.sleepTeal,
    };
  }

  if (input.readinessScore != null && input.readinessScore >= 75 && input.sleepDebtMin < 30 && shortfallMin < 30) {
    return {
      mode: modeFor(0.7),
      reason: 'Signals are strong and debt is low, so a lighter target is reasonable if tomorrow demands flexibility.',
      color: colors.recoveryGreen,
    };
  }

  return {
    mode: modeFor(input.currentGoal),
    reason: 'Your current target is a good fit for tonight based on available readiness, recovery and sleep debt.',
    color: colors.sleepTeal,
  };
}

type ChecklistItem = {
  label: string;
  detail: string;
  state: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route?: Route;
};

function tonightChecklist(input: {
  connected: boolean;
  keepAlive: boolean;
  keepAliveRunning: boolean;
  alarmArmed: boolean;
  alarmMatchesWakeTarget: boolean;
  wakeMin: number;
  targetMin: number;
  tibNeededMin: number;
  sleepDebtMin: number;
  inSleepWindow: boolean;
}): ChecklistItem[] {
  return [
    {
      label: 'Strap sync',
      detail: input.connected
        ? 'Connected now; stored history can backfill after wake.'
        : 'Connect before bed or after waking so stored history can drain.',
      state: input.connected ? 'Ready' : 'Connect',
      icon: input.connected ? 'bluetooth' : 'bluetooth-outline',
      color: input.connected ? colors.recoveryGreen : colors.strainBlue,
      route: { name: 'device' },
    },
    {
      label: 'Background sync',
      detail: input.keepAliveRunning
        ? 'Protection service is running for long history drains.'
        : input.keepAlive
          ? 'Protection is enabled but needs Android permission before it can keep syncing.'
          : 'Turn this on if overnight syncs stall when the phone sleeps.',
      state: input.keepAliveRunning ? 'Running' : input.keepAlive ? 'Permit' : 'Off',
      icon: input.keepAliveRunning ? 'shield-checkmark' : 'shield-outline',
      color: input.keepAliveRunning ? colors.recoveryGreen : colors.recoveryYellow,
      route: { name: 'device' },
    },
    {
      label: 'Wake alarm',
      detail: input.alarmMatchesWakeTarget
        ? `Strap haptic fallback matches the ${fmtClock(input.wakeMin)} wake target.`
        : input.alarmArmed
          ? `A strap alarm exists, but it does not match the current ${fmtClock(input.wakeMin)} wake target.`
        : 'Set a strap alarm if you want a reliable haptic fallback.',
      state: input.alarmMatchesWakeTarget ? 'Ready' : input.alarmArmed ? 'Update' : 'Set',
      icon: input.alarmMatchesWakeTarget ? 'alarm' : 'alarm-outline',
      color: input.alarmMatchesWakeTarget ? colors.sleepTeal : colors.recoveryYellow,
    },
    {
      label: 'Sleep target',
      detail: input.inSleepWindow
        ? `Sleep window is open; target is ${formatDuration(input.targetMin)} asleep.`
        : `${formatDuration(input.tibNeededMin)} in bed aims for ${formatDuration(input.targetMin)} asleep.`,
      state: input.sleepDebtMin >= 60 ? 'Debt' : 'Set',
      icon: input.sleepDebtMin >= 60 ? 'moon' : 'checkmark-circle',
      color: input.sleepDebtMin >= 60 ? colors.recoveryYellow : colors.recoveryGreen,
    },
  ];
}

function ReadinessRow({ item, last, onPress }: { item: ChecklistItem; last: boolean; onPress?: () => void }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.readyRow, !last && styles.readyBorder, pressed && styles.pressed]}>
      <View style={[styles.readyIcon, { backgroundColor: `${item.color}22` }]}>
        <Ionicons name={item.icon} size={18} color={item.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.readyLabel}>{item.label}</Text>
        <Text style={styles.readyDetail}>{item.detail}</Text>
      </View>
      <Text style={[styles.readyState, { color: item.color }]}>{item.state}</Text>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bigLabel: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.textBold, letterSpacing: 1.4 },
  bigValue: { color: colors.sleepTeal, fontSize: 44, fontFamily: fonts.black, marginTop: 6 },
  bigSub: { color: colors.textTertiary, fontSize: 13, marginTop: 2, fontFamily: fonts.text },
  recommendHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recommendBadge: { width: 54, height: 54, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  recommendBadgeText: { color: '#000', fontSize: 15, fontFamily: fonts.black },
  recommendTitle: { color: colors.text, fontSize: 18, fontFamily: fonts.textBold },
  recommendBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4, fontFamily: fonts.text },
  recommendStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 10 },
  recommendMeta: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 10, fontFamily: fonts.text },
  modeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  modeBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textTertiary, marginRight: 14, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.sleepTeal },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.sleepTeal },
  modeName: { color: colors.text, fontSize: 15, fontFamily: fonts.textBold },
  modeDesc: { color: colors.textTertiary, fontSize: 12, marginTop: 2, fontFamily: fonts.text },
  modeHours: { color: colors.textSecondary, fontSize: 14, fontFamily: fonts.bold },
  readyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  readyBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  readyIcon: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  readyLabel: { color: colors.text, fontSize: 14, fontFamily: fonts.textBold },
  readyDetail: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 2, fontFamily: fonts.text },
  readyState: { fontSize: 12, fontFamily: fonts.textBold },
  pressed: { opacity: 0.65 },
  breakRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  swatch: { width: 10, height: 10, borderRadius: 3, marginRight: 10 },
  breakLabel: { color: colors.textSecondary, fontSize: 14, flex: 1, fontFamily: fonts.text },
  breakVal: { color: colors.text, fontSize: 14, fontFamily: fonts.bold },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4, paddingTop: 12 },
  totalLabel: { color: colors.text, fontSize: 15, flex: 1, fontFamily: fonts.textBold },
  totalVal: { color: colors.sleepTeal, fontSize: 16, fontFamily: fonts.black },
  blurb: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: fonts.text },
  alarmNote: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 16, fontFamily: fonts.text },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  planCell: { flex: 1, alignItems: 'center' },
  planValue: { color: colors.sleepTeal, fontSize: 28, fontFamily: fonts.black },
  planLabel: { color: colors.textTertiary, fontSize: 10, fontFamily: fonts.textBold, letterSpacing: 1, marginTop: 4, textAlign: 'center' },
  wakeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  wakeLabel: { color: colors.textSecondary, fontSize: 14, fontFamily: fonts.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  stepTxt: { color: colors.text, fontSize: 20, fontFamily: fonts.bold },
  wakeValue: { color: colors.text, fontSize: 18, fontFamily: fonts.bold, minWidth: 56, textAlign: 'center' },
  tonightRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  tonightDot: { width: 10, height: 10, borderRadius: 5 },
  tonightTitle: { color: colors.text, fontSize: 14, fontFamily: fonts.textBold },
  tonightMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2, fontFamily: fonts.text },
  alarmRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  alarmTitle: { color: colors.text, fontSize: 15, fontFamily: fonts.textBold },
  alarmMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2, fontFamily: fonts.text },
  alarmTime: { color: colors.sleepTeal, fontSize: 24, fontFamily: fonts.black },
  planNote: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 12, fontFamily: fonts.text },
  smartSummary: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginBottom: 12 },
  smartText: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, fontFamily: fonts.textSemibold },
  windowChips: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  windowChip: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.surface },
  windowChipOn: { backgroundColor: colors.white, borderColor: colors.white },
  windowText: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.textBold },
  windowTextOn: { color: '#000' },
});
