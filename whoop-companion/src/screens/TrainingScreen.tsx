import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Empty, Screen, SectionLabel, Stat, WeeklyBars } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { hrMaxFor } from '../metrics/strain';
import { formatRaceTime, racePredictions, trainingLoad, vo2maxEstimate, vo2maxLabel } from '../metrics/training';
import { formatDistance, formatPace } from '../sensors/location';
import { formatDuration } from '../util/time';

const STATUS_COLOR: Record<string, string> = {
  Productive: colors.recoveryGreen,
  Peaking: colors.recoveryGreen,
  Maintaining: colors.sleepTeal,
  Recovery: colors.sleepTeal,
  Detraining: colors.textSecondary,
  Unproductive: '#FFA722',
  Overreaching: '#FFA722',
  Strained: colors.recoveryRed,
};

export function TrainingScreen({ nav }: { nav: Nav }) {
  const cardio = useStoreSelector(appStore, (s) => s.cardio);
  const profile = useStoreSelector(appStore, (s) => s.profile);
  const today = useStoreSelector(appStore, (s) => s.today);

  const now = Date.now();
  const restingHr = profile.restingHr || today?.rhr || 60;
  const vo2 = vo2maxEstimate(hrMaxFor(profile), restingHr);
  const vo2Lbl = vo2 != null ? vo2maxLabel(vo2, profile.ageYears, profile.sex) : null;
  const races = racePredictions(vo2);

  const trimps = cardio
    .filter((c) => c.trimp != null)
    .map((c) => ({ ts: c.startTs, trimp: c.trimp as number }));
  const load = trainingLoad(trimps, now);
  const statusColor = STATUS_COLOR[load.status] ?? colors.textSecondary;

  // Weekly training load for the last 6 weeks.
  const DAY = 86400000;
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const end = now - i * 7 * DAY;
    const start = end - 7 * DAY;
    const sum = trimps.filter((t) => t.ts > start && t.ts <= end).reduce((a, t) => a + t.trimp, 0);
    return { label: i === 0 ? 'This' : `−${i}w`, value: Math.round(sum), display: `${Math.round(sum)}`, color: colors.strainBlue };
  }).reverse();

  const recent = cardio.slice(0, 8);

  const [intensity, setIntensity] = useState<{ moderate: number; vigorous: number; total: number; goal: number } | null>(null);
  useEffect(() => {
    void appStore.weeklyIntensity().then(setIntensity);
  }, [cardio.length]);

  // Personal records from logged activities.
  const pr = useMemo(() => {
    const withDur = cardio.map((c) => ({ ...c, durSec: (c.endTs - c.startTs) / 1000 }));
    const longestDist = withDur.filter((c) => c.distanceM != null).sort((a, b) => (b.distanceM ?? 0) - (a.distanceM ?? 0))[0];
    const longestDur = [...withDur].sort((a, b) => b.durSec - a.durSec)[0];
    const hardest = withDur.filter((c) => c.strain != null).sort((a, b) => (b.strain ?? 0) - (a.strain ?? 0))[0];
    const paced = withDur.filter((c) => c.distanceM != null && c.distanceM >= 1000);
    const fastest = paced.sort((a, b) => a.durSec / (a.distanceM as number) - b.durSec / (b.distanceM as number))[0];
    return { longestDist, longestDur, hardest, fastest };
  }, [cardio]);

  return (
    <Screen title="Training Status" onBack={nav.back} tint={colors.strainBlue}>
      <Card>
        <View style={styles.statusHead}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{load.status}</Text>
        </View>
        <Text style={styles.statusDetail}>{load.statusDetail}</Text>
      </Card>

      <SectionLabel>Fitness</SectionLabel>
      <Card>
        <View style={styles.statRow}>
          <Stat label={vo2Lbl ? `VO₂max · ${vo2Lbl}` : 'VO₂max'} value={vo2 ?? '—'} unit={vo2 != null ? 'ml/kg/min' : undefined} color={colors.recoveryGreen} />
        </View>
        <Text style={styles.note}>
          Estimated from your max and resting heart rate (Uth 2004). Set an accurate resting/max HR
          and weight on the Device screen to improve it.
        </Text>
      </Card>

      {races ? (
        <>
          <SectionLabel>Race predictor</SectionLabel>
          <Card>
            <View style={styles.statRow}>
              {races.map((r) => (
                <View key={r.label} style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={styles.raceTime}>{formatRaceTime(r.seconds)}</Text>
                  <Text style={styles.raceLabel}>{r.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.note}>
              Estimated finish times from your VO₂max (ACSM velocity model). They improve as your
              fitness estimate sharpens with an accurate max/resting HR.
            </Text>
          </Card>
        </>
      ) : null}

      <SectionLabel>Training load</SectionLabel>
      <Card>
        <View style={styles.statRow}>
          <Stat label="Acute (7d)" value={load.acute} color={colors.strainBlue} />
          <Stat label="Chronic (weekly)" value={load.chronic} />
          <Stat label="Load ratio" value={load.acwr != null ? load.acwr.toFixed(2) : '—'} color={statusColor} />
        </View>
        <Text style={styles.note}>
          The acute:chronic load ratio (Gabbett). 0.8–1.3 is the optimal range; above ~1.5 signals
          overreaching. Built from each activity's heart-rate training load (TRIMP).
        </Text>
      </Card>

      <SectionLabel>Weekly load</SectionLabel>
      <Card>
        {weeks.some((w) => w.value > 0) ? <WeeklyBars data={weeks} /> : <Empty text="Log activities to build your weekly training load." />}
      </Card>

      <SectionLabel>Intensity minutes</SectionLabel>
      <Card>
        <View style={styles.statRow}>
          <Stat label="Moderate" value={intensity?.moderate ?? '—'} color={colors.recoveryGreen} />
          <Stat label="Vigorous (×2)" value={intensity?.vigorous ?? '—'} color={colors.strainBlue} />
          <Stat label="This week" value={intensity ? `${intensity.total}/${intensity.goal}` : '—'} color={colors.recoveryYellow} />
        </View>
        {intensity ? (
          <View style={styles.imTrack}>
            <View style={[styles.imFill, { width: `${Math.min(100, (intensity.total / intensity.goal) * 100)}%` }]} />
          </View>
        ) : null}
        <Text style={styles.note}>
          The WHO recommends 150 intensity minutes a week — moderate (HR zones 2–3) counts once,
          vigorous (zones 4–5) counts double. Measured from your heart rate across the last 7 days.
        </Text>
      </Card>

      <SectionLabel>Personal records</SectionLabel>
      <Card>
        {cardio.length === 0 ? (
          <Empty text="Your bests appear here as you log activities." />
        ) : (
          <>
            <PrRow label="Longest distance" value={pr.longestDist?.distanceM != null ? formatDistance(pr.longestDist.distanceM) : '—'} sub={pr.longestDist?.activity} />
            <PrRow label="Longest activity" value={pr.longestDur ? formatDuration(Math.round(pr.longestDur.durSec / 60)) : '—'} sub={pr.longestDur?.activity} />
            <PrRow
              label="Fastest pace"
              value={pr.fastest?.distanceM != null ? formatPace(pr.fastest.distanceM, pr.fastest.durSec) : '—'}
              sub={pr.fastest?.activity}
            />
            <PrRow label="Highest strain" value={pr.hardest?.strain != null ? pr.hardest.strain.toFixed(1) : '—'} sub={pr.hardest?.activity} last />
          </>
        )}
      </Card>

      <SectionLabel>Recent activities</SectionLabel>
      <Card>
        {recent.length === 0 ? (
          <Empty text="No activities logged yet." />
        ) : (
          recent.map((c) => (
            <Pressable key={c.id} style={styles.actRow} onPress={() => nav.navigate({ name: 'activity', id: c.id })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.actName}>{c.activity}</Text>
                <Text style={styles.actMeta}>
                  {new Date(c.startTs).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ·{' '}
                  {formatDuration(Math.round((c.endTs - c.startTs) / 60000))}
                  {c.strain != null ? ` · strain ${c.strain.toFixed(1)}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Pressable>
          ))
        )}
      </Card>

      <Text style={styles.disclaimer}>
        Training Status, VO₂max and load are faithful approximations of Garmin/Firstbeat's models,
        computed on-device from heart rate — estimates, not Garmin-exact numbers.
      </Text>
    </Screen>
  );
}

function PrRow({ label, value, sub, last }: { label: string; value: string; sub?: string; last?: boolean }) {
  return (
    <View style={[styles.prRow, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.prLabel}>{label}</Text>
        {sub ? <Text style={styles.prSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.prValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontSize: 22, fontFamily: fonts.black },
  statusDetail: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8, fontFamily: fonts.text },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  note: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 12, fontFamily: fonts.text },
  actRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  actName: { color: colors.text, fontSize: 15, fontFamily: fonts.textSemibold },
  actMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2, fontFamily: fonts.text },
  disclaimer: { color: colors.textTertiary, fontSize: 11, lineHeight: 16, marginTop: 16, fontFamily: fonts.text },
  raceTime: { color: colors.text, fontSize: 18, fontFamily: fonts.black },
  raceLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 3, fontFamily: fonts.textBold },
  imTrack: { height: 10, backgroundColor: colors.surface, borderRadius: 5, overflow: 'hidden', marginTop: 12 },
  imFill: { height: 10, borderRadius: 5, backgroundColor: colors.recoveryGreen },
  prRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  prLabel: { color: colors.text, fontSize: 14, fontFamily: fonts.textSemibold },
  prSub: { color: colors.textTertiary, fontSize: 12, marginTop: 1, fontFamily: fonts.text },
  prValue: { color: colors.text, fontSize: 16, fontFamily: fonts.bold },
});
