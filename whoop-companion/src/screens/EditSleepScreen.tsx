import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, PrimaryButton, Screen, SecondaryButton, SectionLabel, SleepConfidenceStatus } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { dayKey, formatDuration, startOfDayMs } from '../util/time';
import { sleepNeedsMoreSync } from '../metrics/sleepSync';
import { sleepTrustTier } from '../metrics/sleepTrustWeight';
import {
  isManualSleepWindowDurationAllowed,
  MIN_MANUAL_SLEEP_WINDOW_MIN,
} from '../util/sleepWindow';

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
  const schedule = useStoreSelector(appStore, (s) => s.sleepSchedule);
  const metric = targetDay === today?.day ? today : recentDays.find((d) => d.day === targetDay) ?? null;
  const bedInit = hmFromTs(metric?.sleepStart ?? null, Math.floor(schedule.bedMin / 60), schedule.bedMin % 60);
  const wakeInit = hmFromTs(metric?.sleepEnd ?? null, Math.floor(schedule.wakeMin / 60), schedule.wakeMin % 60);
  const [bed, setBed] = useState(bedInit);
  const [wake, setWake] = useState(wakeInit);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewStart = tsFor(targetDay, bed.h, bed.m, bed.h >= 12);
  const previewEnd = tsFor(targetDay, wake.h, wake.m, false);
  const previewDurationMin = Math.round((previewEnd - previewStart) / 60000);
  const currentConfidence = metric?.sleepDetail?.confidence ?? null;
  const currentCoverage = metric?.sleepDetail?.coveragePct ?? null;
  const currentSignalMin = metric?.sleepDetail?.signalMin ?? null;
  const previewVerdict = sleepWindowPreview({
    durationMin: previewDurationMin,
    hasDetail: !!metric?.sleepDetail,
    confidence: currentConfidence,
    coveragePct: currentCoverage,
    signalMin: currentSignalMin,
  });

  const save = async () => {
    if (saving) return;
    const bedEvening = bed.h >= 12;
    const startTs = tsFor(targetDay, bed.h, bed.m, bedEvening);
    const endTs = tsFor(targetDay, wake.h, wake.m, false);
    if (!isManualSleepWindowDurationAllowed(startTs, endTs)) {
      setError(`Choose a sleep window between ${MIN_MANUAL_SLEEP_WINDOW_MIN} minutes and 30 hours, with wake time after bed time.`);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await appStore.setManualSleep(startTs, endTs, targetDay);
      setSaved(true);
      setTimeout(() => nav.back(), 700);
    } catch (cause) {
      setSaved(false);
      setError(cause instanceof Error ? cause.message : 'Could not apply the sleep window. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmClearManual = () => {
    Alert.alert(
      'Clear manual sleep window?',
      'Pulse will return this day to auto-detection from synced strap history. Sleep stages, performance, recovery and readiness may change.',
      [
        { text: 'Keep override', style: 'cancel' },
        {
          text: 'Clear override',
          style: 'destructive',
          onPress: () => {
            void appStore.clearManualSleep(targetDay);
            nav.back();
          },
        },
      ],
    );
  };

  return (
    <Screen title="Log / Adjust Sleep" onBack={nav.back} tint={colors.sleepTeal}>
      <Card>
        <Text style={styles.date}>{formatDayLabel(targetDay)}</Text>
        <Text style={styles.intro}>
          Set when you went to bed and woke up. Pulse rescans strap history over exactly this window;
          observed awake periods stay awake in the result, even for a long or fragmented night.
        </Text>
        {!metric?.sleepStart ? (
          <Text style={styles.suggestion}>
            {schedule.sampleCount
              ? `Suggested from ${schedule.sampleCount} reliable ${schedule.sampleCount === 1 ? 'night' : 'nights'}: `
              : 'No reliable timing history yet: '}
            {String(Math.floor(schedule.bedMin / 60)).padStart(2, '0')}:{String(schedule.bedMin % 60).padStart(2, '0')} - {String(Math.floor(schedule.wakeMin / 60)).padStart(2, '0')}:{String(schedule.wakeMin % 60).padStart(2, '0')}
          </Text>
        ) : null}
        <SleepConfidenceStatus
          confidence={confidenceStatusTier(metric?.sleepDetail ?? null)}
          reason={editConfidenceReason(metric?.sleepDetail ?? null)}
        />
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
        <Text style={[styles.previewValue, { color: isManualSleepWindowDurationAllowed(previewStart, previewEnd) ? colors.text : colors.danger }]}>
          {previewDurationMin > 0 ? formatDuration(previewDurationMin) : 'Wake must be after bed'}
        </Text>
        <Text style={styles.previewMeta}>
          {new Date(previewStart).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })} - {new Date(previewEnd).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
        </Text>
        <View style={[styles.verdictBox, { borderColor: previewVerdict.color, backgroundColor: previewVerdict.tint }]}>
          <View style={[styles.verdictBadge, { backgroundColor: previewVerdict.color }]}>
            <Text style={styles.verdictBadgeText}>{previewVerdict.badge}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.verdictTitle}>{previewVerdict.title}</Text>
            <Text style={styles.verdictBody}>{previewVerdict.body}</Text>
          </View>
        </View>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.applyNote}>
        {saved ? 'Applied successfully. Sleep, Recovery and Readiness are updating.' : 'Apply rescans this full window and keeps observed awake periods awake.'}
      </Text>
      <PrimaryButton title={saving ? 'Applying...' : saved ? 'Applied - updating' : 'Apply sleep window'} onPress={save} disabled={saving || saved} />
      <SecondaryButton title="Clear manual override (auto-detect)" onPress={confirmClearManual} disabled={saving} />
    </Screen>
  );
}

function editConfidenceReason(detail: {
  confidence?: 'high' | 'medium' | 'low' | null;
  coveragePct?: number | null;
  signalMin?: number | null;
} | null): string {
  if (!detail) return 'No overnight record is available for this window yet.';
  if (detail.confidence === 'high' && !sleepNeedsMoreSync(detail)) return 'The overnight record is strong enough to use.';
  if (detail.confidence === 'medium') return 'The result is usable, but more detail may refine it.';
  return 'Use timing with care while overnight capture remains incomplete.';
}

function confidenceStatusTier(detail: {
  confidence?: 'high' | 'medium' | 'low' | null;
  coveragePct?: number | null;
  signalMin?: number | null;
} | null): 'high' | 'medium' | 'low' | null {
  const tier = sleepTrustTier(detail);
  return tier === 'none' ? null : tier;
}

function sleepWindowPreview(input: {
  durationMin: number;
  hasDetail: boolean;
  confidence: 'high' | 'medium' | 'low' | null;
  coveragePct: number | null;
  signalMin: number | null;
}): { badge: string; title: string; body: string; color: string; tint: string } {
  if (input.durationMin <= 0) {
    return {
      badge: 'TIME',
      title: 'Wake time must follow bed time',
      body: 'Choose a wake time on the selected morning after the previous-evening bedtime.',
      color: colors.recoveryRed,
      tint: `${colors.recoveryRed}12`,
    };
  }
  if (input.durationMin < 180) {
    return {
      badge: 'SHORT',
      title: 'Very short sleep window',
      body: 'This may be a nap or missed partial sleep. It can be saved, but recovery may stay limited.',
      color: colors.recoveryYellow,
      tint: `${colors.recoveryYellow}14`,
    };
  }
  if (input.durationMin > 11 * 60) {
    return {
      badge: 'LONG',
      title: 'Full window will be rescanned',
      body: 'Observed awake periods remain awake, so this can capture a fragmented night without counting wake as sleep.',
      color: colors.recoveryYellow,
      tint: `${colors.recoveryYellow}14`,
    };
  }
  if (!input.hasDetail) {
    return {
      badge: 'DATA',
      title: 'Timing will save before detailed confidence exists',
      body: 'The app will rescan this exact window using available strap history; observed awake periods remain awake.',
      color: colors.strainBlue,
      tint: `${colors.strainBlue}16`,
    };
  }
  const source = { confidence: input.confidence, coveragePct: input.coveragePct, signalMin: input.signalMin };
  const needsMoreSync = sleepNeedsMoreSync(source);
  if (sleepTrustTier(source) === 'low' || needsMoreSync) {
    return {
      badge: 'DATA',
      title: needsMoreSync ? 'Partial overnight capture' : 'Data confidence is still limited',
      body: needsMoreSync
        ? 'Adjusting the window can fix timing, but recovery should stay cautious with insufficient decoded coverage.'
        : 'Adjusting the window can fix timing. Compare it with how the night felt before trusting recovery.',
      color: colors.recoveryYellow,
      tint: `${colors.recoveryYellow}14`,
    };
  }
  return {
    badge: 'GOOD',
    title: 'Window looks reasonable',
    body: 'Applying rescans this exact window; observed awake periods remain awake in stages and recovery.',
    color: colors.recoveryGreen,
    tint: `${colors.recoveryGreen}12`,
  };
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
  suggestion: { color: colors.sleepTeal, fontSize: 12, lineHeight: 18, marginTop: 10, fontFamily: fonts.textSemibold },
  applyNote: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 10, fontFamily: fonts.text },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time: { color: colors.text, fontSize: 34, fontFamily: fonts.black },
  previewLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 4, fontFamily: fonts.textBold },
  previewValue: { fontSize: 28, fontFamily: fonts.black },
  previewMeta: { color: colors.textSecondary, fontSize: 13, marginTop: 3, fontFamily: fonts.text },
  verdictBox: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 14 },
  verdictBadge: { width: 48, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  verdictBadgeText: { color: '#000', fontSize: 10, fontFamily: fonts.black },
  verdictTitle: { color: colors.text, fontSize: 14, fontFamily: fonts.textBold },
  verdictBody: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 2, fontFamily: fonts.text },
  stepperWrap: { alignItems: 'center' },
  stepperLabel: { color: colors.textTertiary, fontSize: 11, marginBottom: 6, fontFamily: fonts.text },
  stepperRow: { flexDirection: 'row', gap: 8 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18, marginBottom: 10, fontFamily: fonts.textSemibold },
});
