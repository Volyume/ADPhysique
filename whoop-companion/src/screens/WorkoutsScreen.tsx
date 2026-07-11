import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Empty, PrimaryButton, Screen, SectionLabel } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { formatDistance } from '../sensors/location';
import { formatDuration } from '../util/time';
import type { CardioRow } from '../db/database';
import {
  PRESET_WORKOUTS,
  StructuredWorkout,
  buildIntervalWorkout,
  isValidStructuredWorkout,
  totalDurationSec,
} from '../data/structuredWorkouts';

function fmtDur(sec: number): string {
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}

export function WorkoutsScreen({ nav }: { nav: Nav }) {
  const cardio = useStoreSelector(appStore, (s) => s.cardio);
  const recentWorkouts = [...cardio]
    .filter((activity) => activity.source !== 'nap')
    .sort((a, b) => b.startTs - a.startTs)
    .slice(0, 8);
  const [saved, setSaved] = useState<StructuredWorkout[]>([]);
  // Builder state.
  const [warmup, setWarmup] = useState(10);
  const [workMin, setWorkMin] = useState(4);
  const [workZone, setWorkZone] = useState(4);
  const [restMin, setRestMin] = useState(3);
  const [repeats, setRepeats] = useState(4);
  const [cooldown, setCooldown] = useState(5);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [templateWarning, setTemplateWarning] = useState<string | null>(null);

  const refresh = () => {
    void appStore.listWorkoutTemplates()
      .then((templates) => {
        const stored = Array.isArray(templates) ? templates : [];
        const valid = stored.filter(isValidStructuredWorkout);
        setSaved(valid);
        setTemplateWarning(valid.length === stored.length ? null : 'Some saved workouts were invalid and were hidden.');
      })
      .catch(() => {
        setSaved([]);
        setTemplateWarning('Saved workouts could not be loaded.');
      });
  };
  useEffect(refresh, []);

  const start = async (w: StructuredWorkout) => {
    if (!isValidStructuredWorkout(w)) {
      setTemplateWarning('This workout template is invalid and cannot be started.');
      return;
    }
    if (startingId) return;
    setStartingId(w.id);
    try {
      await appStore.startPlannedSession(w);
      nav.back();
      nav.navigate({ name: 'liveSession' });
    } finally {
      setStartingId(null);
    }
  };

  const buildAndStart = (alsoSave: boolean) => {
    const id = `w_${warmup}_${workMin}_${workZone}_${restMin}_${repeats}_${cooldown}`;
    const w = buildIntervalWorkout({
      id,
      name: `${repeats} × ${workMin}′ Z${workZone}`,
      activity: 'Running',
      warmupMin: warmup,
      workMin,
      workZone,
      restMin,
      restZone: 1,
      repeats,
      cooldownMin: cooldown,
    });
    if (alsoSave) {
      void appStore.saveWorkoutTemplate(w).then(refresh);
    } else {
      void start(w);
    }
  };

  return (
    <Screen title="Workouts" onBack={nav.back} tint={colors.strainBlue}>
      <SectionLabel>Presets</SectionLabel>
      {PRESET_WORKOUTS.map((w) => (
        <WorkoutCard key={w.id} w={w} onStart={() => void start(w)} starting={startingId === w.id} disabled={!!startingId} />
      ))}

      {saved.length > 0 ? (
        <>
          <SectionLabel>Your workouts</SectionLabel>
          {saved.map((w) => (
            <WorkoutCard key={w.id} w={w} onStart={() => void start(w)} onDelete={() => void appStore.deleteWorkoutTemplate(w.id).then(refresh)} starting={startingId === w.id} disabled={!!startingId} />
          ))}
        </>
      ) : null}
      {templateWarning ? <Text style={styles.warning}>{templateWarning}</Text> : null}

      <SectionLabel>Build an interval workout</SectionLabel>
      <Card>
        <Stepper label="Warm-up (min)" value={warmup} setValue={setWarmup} step={1} min={0} max={30} />
        <Stepper label="Work (min)" value={workMin} setValue={setWorkMin} step={1} min={1} max={60} />
        <Stepper label="Work HRR zone" value={workZone} setValue={setWorkZone} step={1} min={1} max={5} />
        <Stepper label="Recover (min)" value={restMin} setValue={setRestMin} step={1} min={0} max={30} />
        <Stepper label="Repeats" value={repeats} setValue={setRepeats} step={1} min={1} max={20} />
        <Stepper label="Cool-down (min)" value={cooldown} setValue={setCooldown} step={1} min={0} max={30} last />
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton title={startingId ? 'Starting' : 'Start now'} onPress={() => buildAndStart(false)} disabled={!!startingId} />
          </View>
          <View style={{ flex: 1 }}>
            <Pressable onPress={() => buildAndStart(true)} disabled={!!startingId} style={[styles.saveBtn, startingId && styles.disabled]}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Card>

      <Empty text="Structured workouts guide you step-by-step in the live session, buzzing on each interval change. Target zones use HRR (Karvonen): Z1–Z5." />
      <SectionLabel>Recent workouts</SectionLabel>
      {recentWorkouts.length > 0 ? (
        <Card>
          {recentWorkouts.map((activity, index) => (
            <RecentWorkoutRow
              key={activity.id}
              activity={activity}
              onPress={() => nav.navigate({ name: 'activity', id: activity.id })}
              last={index === recentWorkouts.length - 1}
            />
          ))}
        </Card>
      ) : (
        <Card>
          <Empty text="No non-nap workouts are available to review yet." />
        </Card>
      )}

    </Screen>
  );
}

function WorkoutCard({ w, onStart, onDelete, starting, disabled }: { w: StructuredWorkout; onStart: () => void; onDelete?: () => void; starting?: boolean; disabled?: boolean }) {
  const work = w.steps.filter((s) => s.kind === 'work').length;
  return (
    <Card>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{w.name}</Text>
          <Text style={styles.meta}>
            {fmtDur(totalDurationSec(w))} · {w.steps.length} steps · {work} work interval{work === 1 ? '' : 's'}
          </Text>
        </View>
        {onDelete ? (
          <Pressable hitSlop={10} onPress={onDelete} style={{ marginRight: 14 }}>
            <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
          </Pressable>
        ) : null}
        <Pressable onPress={onStart} disabled={disabled} style={[styles.startBtn, disabled && styles.disabled]}>
          <Ionicons name="play" size={16} color="#000" />
          <Text style={styles.startText}>{starting ? 'Starting' : 'Start'}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function Stepper({ label, value, setValue, step, min, max, last }: { label: string; value: number; setValue: (n: number) => void; step: number; min: number; max: number; last?: boolean }) {
  return (
    <View style={[styles.stepRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable hitSlop={8} onPress={() => setValue(Math.max(min, value - step))} style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable hitSlop={8} onPress={() => setValue(Math.min(max, value + step))} style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RecentWorkoutRow({ activity, onPress, last }: { activity: CardioRow; onPress: () => void; last: boolean }) {
  const durationMin = Math.round(activity.activeDurationMin ?? (activity.endTs - activity.startTs) / 60000);
  const summary = [
    activity.strain != null ? `Strain ${activity.strain.toFixed(1)}` : null,
    activity.stepSource === 'band' && activity.steps != null ? `${activity.steps.toLocaleString()} steps` : null,
    activity.distanceM != null ? formatDistance(activity.distanceM) : null,
  ].filter(Boolean).join(' | ');

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.recentRow, !last && styles.recentRowBorder, pressed && styles.pressed]}>
      <View style={styles.recentMain}>
        <Text style={styles.recentActivity} numberOfLines={1}>{activity.activity}</Text>
        <Text style={styles.recentMeta} numberOfLines={1}>
          {new Date(activity.startTs).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          {' | '}{formatDuration(durationMin)}
        </Text>
      </View>
      {summary ? <Text style={styles.recentSummary} numberOfLines={2}>{summary}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { color: colors.text, fontSize: 16, fontFamily: fonts.textBold },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 3, fontFamily: fonts.text },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  startText: { color: '#000', fontSize: 13, fontFamily: fonts.textBold },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  stepLabel: { color: colors.text, fontSize: 14, fontFamily: fonts.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  stepBtnText: { color: colors.text, fontSize: 18, fontFamily: fonts.bold },
  stepValue: { color: colors.text, fontSize: 16, fontFamily: fonts.bold, minWidth: 28, textAlign: 'center' },
  saveBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.surface },
  saveText: { color: colors.text, fontSize: 15, fontFamily: fonts.textBold },
  warning: { color: colors.recoveryYellow, fontSize: 12, lineHeight: 17, marginTop: 10, fontFamily: fonts.text },
  disabled: { opacity: 0.55 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  recentRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  recentMain: { flex: 1, minWidth: 120 },
  recentActivity: { color: colors.text, fontSize: 15, fontFamily: fonts.textBold },
  recentMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 3, fontFamily: fonts.text },
  recentSummary: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, maxWidth: '48%', textAlign: 'right', fontFamily: fonts.text },
  pressed: { opacity: 0.7 },
});
