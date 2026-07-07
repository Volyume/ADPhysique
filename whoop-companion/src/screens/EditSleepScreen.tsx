import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, PrimaryButton, Screen, SecondaryButton, SectionLabel } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { dayKey, formatDuration, startOfDayMs } from '../util/time';

function hmFromTs(ts: number | null, fallbackH: number, fallbackM: number): { h: number; m: number } {
  if (ts == null) return { h: fallbackH, m: fallbackM };
  const d = new Date(ts);
  return { h: d.getHours(), m: d.getMinutes() };
}

/** Build a timestamp for a bed/wake clock time relative to the selected sleep day.
 * Evening times (>= 12:00) are treated as the previous night; morning times as that day. */
function tsFor(day: string, h: number, m: number, evening: boolean): number {
  const sod = dayStartFromKey(day);
  const mins = h * 60 + m;
  return evening ? sod - (1440 - mins) * 60000 : sod + mins * 60000;
}

function dayStartFromKey(day: string): number {
  return startOfDayMs(Date.parse(`${day}T00:00:00`));
}

function formatDayLabel(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function EditSleepScreen({ nav, day }: { nav: Nav; day?: string }) {
  const targetDay = day ?? dayKey(Date.now());
  const today = useStoreSelector(appStore, (s) => s.today);
  const recentDays = useStoreSelector(appStore, (s) => s.recentDays);
  const metric = targetDay === today?.day ? today : recentDays.find((d) => d.day === targetDay) ?? null;
  const bedInit = hmFromTs(metric?.sleepStart ?? null, 23, 0);
  const wakeInit = hmFromTs(metric?.sleepEnd ?? null, 7, 0);
  const [bed, setBed] = useState(bedInit);
  const [wake, setWake] = useState(wakeInit);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewStart = tsFor(targetDay, bed.h, bed.m, bed.h >= 12);
  const previewEnd = tsFor(targetDay, wake.h, wake.m, false);
  const previewDurationMin = Math.round((previewEnd - previewStart) / 60000);
  const currentConfidence = metric?.sleepDetail?.confidence ?? null;
  const currentCoverage = metric?.sleepDetail?.coveragePct ?? null;
  const currentSignalMin = metric?.sleepDetail?.signalMin ?? null;

  const save = () => {
    const bedEvening = bed.h >= 12;
    const startTs = tsFor(targetDay, bed.h, bed.m, bedEvening);
    const endTs = tsFor(targetDay, wake.h, wake.m, false);
    const durationMin = Math.round((endTs - startTs) / 60000);
    if (durationMin < 20 || durationMin > 18 * 60) {
      setError('Choose a sleep window between 20 minutes and 18 hours, with wake time after bed time.');
      return;
    }
    setError(null);
    void appStore.setManualSleep(startTs, endTs, targetDay);
    setSaved(true);
    setTimeout(() => nav.back(), 700);
  };

  return (
    <Screen title="Log / Adjust Sleep" onBack={nav.back} tint={colors.sleepTeal}>
      <Card>
        <Text style={styles.date}>{formatDayLabel(targetDay)}</Text>
        <Text style={styles.intro}>
          Set when you went to bed and woke up. Pulse re-detects your sleep stages and recovery from
          the strap’s heart rate over exactly that window — useful if a night was missed or detected
          with the wrong times.
        </Text>
        {metric?.sleepDetail ? (
          <View style={styles.qualityRow}>
            <QualityPill label="Confidence" value={currentConfidence ?? '-'} color={confidenceColor(currentConfidence)} />
            <QualityPill label="Coverage" value={currentCoverage != null ? `${currentCoverage}%` : '-'} color={coverageColor(currentCoverage)} />
            <QualityPill label="Signal" value={currentSignalMin != null ? `${currentSignalMin}m` : '-'} color={colors.sleepTeal} />
          </View>
        ) : null}
      </Card>

      <SectionLabel>Bed time (previous evening)</SectionLabel>
      <Card>
        <TimePicker value={bed} onChange={setBed} />
      </Card>

      <SectionLabel>Wake time ({formatDayLabel(targetDay)})</SectionLabel>
      <Card>
        <TimePicker value={wake} onChange={setWake} />
      </Card>

      <Card>
        <Text style={styles.previewLabel}>Preview</Text>
        <Text style={[styles.previewValue, { color: previewDurationMin >= 20 && previewDurationMin <= 18 * 60 ? colors.text : colors.danger }]}>
          {previewDurationMin > 0 ? formatDuration(previewDurationMin) : 'Wake must be after bed'}
        </Text>
        <Text style={styles.previewMeta}>
          {new Date(previewStart).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })} - {new Date(previewEnd).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton title={saved ? 'Saved - re-detecting' : 'Save & re-detect'} onPress={save} />
      <SecondaryButton title="Clear manual override (auto-detect)" onPress={() => { void appStore.clearManualSleep(targetDay); nav.back(); }} />
    </Screen>
  );
}

function TimePicker({ value, onChange }: { value: { h: number; m: number }; onChange: (v: { h: number; m: number }) => void }) {
  const adjust = (dh: number, dm: number) => {
    let total = ((value.h * 60 + value.m + dh * 60 + dm) % 1440 + 1440) % 1440;
    onChange({ h: Math.floor(total / 60), m: total % 60 });
  };
  const label = `${String(value.h).padStart(2, '0')}:${String(value.m).padStart(2, '0')}`;
  return (
    <View style={styles.picker}>
      <Stepper label="Hour" onMinus={() => adjust(-1, 0)} onPlus={() => adjust(1, 0)} />
      <Text style={styles.time}>{label}</Text>
      <Stepper label="Min" onMinus={() => adjust(0, -15)} onPlus={() => adjust(0, 15)} />
    </View>
  );
}

function QualityPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.qualityPill}>
      <Text style={[styles.qualityValue, { color }]}>{value}</Text>
      <Text style={styles.qualityLabel}>{label}</Text>
    </View>
  );
}

function confidenceColor(confidence: 'high' | 'medium' | 'low' | null): string {
  if (confidence === 'high') return colors.recoveryGreen;
  if (confidence === 'medium') return colors.recoveryYellow;
  return colors.recoveryRed;
}

function coverageColor(coveragePct: number | null): string {
  if (coveragePct == null) return colors.textTertiary;
  if (coveragePct >= 80) return colors.recoveryGreen;
  if (coveragePct >= 60) return colors.recoveryYellow;
  return colors.recoveryRed;
}

function Stepper({ label, onMinus, onPlus }: { label: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepperWrap}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable onPress={onMinus} style={styles.stepBtn}><Ionicons name="remove" size={20} color={colors.text} /></Pressable>
        <Pressable onPress={onPlus} style={styles.stepBtn}><Ionicons name="add" size={20} color={colors.text} /></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  date: { color: colors.text, fontSize: 18, marginBottom: 6, fontFamily: fonts.textBold },
  intro: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: fonts.text },
  qualityRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  qualityPill: { flex: 1, alignItems: 'center' },
  qualityValue: { fontSize: 17, fontFamily: fonts.black },
  qualityLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 2, fontFamily: fonts.text },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time: { color: colors.text, fontSize: 34, fontFamily: fonts.black },
  previewLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 4, fontFamily: fonts.textBold },
  previewValue: { fontSize: 28, fontFamily: fonts.black },
  previewMeta: { color: colors.textSecondary, fontSize: 13, marginTop: 3, fontFamily: fonts.text },
  stepperWrap: { alignItems: 'center' },
  stepperLabel: { color: colors.textTertiary, fontSize: 11, marginBottom: 6, fontFamily: fonts.text },
  stepperRow: { flexDirection: 'row', gap: 8 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18, marginBottom: 10, fontFamily: fonts.textSemibold },
});
