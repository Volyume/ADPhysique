import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { appStore } from '../state/appStore';
import { Card, Empty, PrimaryButton, Screen, SectionLabel } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';
import {
  PRESET_WORKOUTS,
  StructuredWorkout,
  buildIntervalWorkout,
  totalDurationSec,
} from '../data/structuredWorkouts';

function fmtDur(sec: number): string {
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}

export function WorkoutsScreen({ nav }: { nav: Nav }) {
  const [saved, setSaved] = useState<StructuredWorkout[]>([]);
  // Builder state.
  const [warmup, setWarmup] = useState(10);
  const [workMin, setWorkMin] = useState(4);
  const [workZone, setWorkZone] = useState(4);
  const [restMin, setRestMin] = useState(3);
  const [repeats, setRepeats] = useState(4);
  const [cooldown, setCooldown] = useState(5);

  const refresh = () => void appStore.listWorkoutTemplates().then(setSaved);
  useEffect(refresh, []);

  const start = (w: StructuredWorkout) => {
    appStore.startPlannedSession(w);
    nav.back();
    nav.navigate({ name: 'liveSession' });
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
      start(w);
    }
  };

  return (
    <Screen title="Workouts" onBack={nav.back} tint={colors.strainBlue}>
      <SectionLabel>Presets</SectionLabel>
      {PRESET_WORKOUTS.map((w) => (
        <WorkoutCard key={w.id} w={w} onStart={() => start(w)} />
      ))}

      {saved.length > 0 ? (
        <>
          <SectionLabel>Your workouts</SectionLabel>
          {saved.map((w) => (
            <WorkoutCard key={w.id} w={w} onStart={() => start(w)} onDelete={() => void appStore.deleteWorkoutTemplate(w.id).then(refresh)} />
          ))}
        </>
      ) : null}

      <SectionLabel>Build an interval workout</SectionLabel>
      <Card>
        <Stepper label="Warm-up (min)" value={warmup} setValue={setWarmup} step={1} min={0} max={30} />
        <Stepper label="Work (min)" value={workMin} setValue={setWorkMin} step={1} min={1} max={60} />
        <Stepper label="Work zone" value={workZone} setValue={setWorkZone} step={1} min={1} max={5} />
        <Stepper label="Recover (min)" value={restMin} setValue={setRestMin} step={1} min={0} max={30} />
        <Stepper label="Repeats" value={repeats} setValue={setRepeats} step={1} min={1} max={20} />
        <Stepper label="Cool-down (min)" value={cooldown} setValue={setCooldown} step={1} min={0} max={30} last />
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton title="Start now" onPress={() => buildAndStart(false)} />
          </View>
          <View style={{ flex: 1 }}>
            <Pressable onPress={() => buildAndStart(true)} style={styles.saveBtn}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Card>

      <Empty text="Structured workouts guide you step-by-step in the live session, buzzing on each interval change. Target zones are by % of your max heart rate." />
    </Screen>
  );
}

function WorkoutCard({ w, onStart, onDelete }: { w: StructuredWorkout; onStart: () => void; onDelete?: () => void }) {
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
        <Pressable onPress={onStart} style={styles.startBtn}>
          <Ionicons name="play" size={16} color="#000" />
          <Text style={styles.startText}>Start</Text>
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
});
