import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Bar, Card, Empty, LineChart, Screen, SectionLabel, Stat } from '../ui/components';
import { colors, fonts, strainZoneColors } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { formatDistance, formatPace } from '../sensors/location';
import { formatClock, formatDuration } from '../util/time';
import type { HrZone } from '../metrics/strain';
import { recoveryTimeHours, trainingEffect } from '../metrics/training';
import { parseNapDetail } from '../metrics/naps';
import { stepSourceLabel } from '../ui/activityFormat';

export function ActivityDetailScreen({ nav, id }: { nav: Nav; id: string }) {
  const cardio = useStoreSelector(appStore, (s) => s.cardio);
  const activity = cardio.find((c) => c.id === id) ?? null;
  const [zones, setZones] = useState<HrZone[]>([]);
  const [hr, setHr] = useState<number[]>([]);

  useEffect(() => {
    if (activity) {
      void appStore.activityDetail(activity.startTs, activity.endTs).then((d) => {
        setZones(d.zones);
        setHr(d.hr);
      });
    }
  }, [id]);

  if (!activity) {
    return (
      <Screen title="Activity" onBack={nav.back}>
        <Empty text="This activity is no longer available." />
      </Screen>
    );
  }

  const isNap = activity.source === 'nap';
  const nap = isNap ? parseNapDetail(activity.notes) : null;
  const durMin = Math.round((activity.endTs - activity.startTs) / 60000);
  const elapsedSec = Math.round((activity.endTs - activity.startTs) / 1000);
  const zoneMax = Math.max(1, ...zones.map((z) => z.minutes));
  const te = !isNap && zones.some((z) => z.minutes > 0) ? trainingEffect(zones) : null;
  const recoveryHrs = te ? recoveryTimeHours(te) : null;
  const date = new Date(activity.startTs).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const tint = isNap ? colors.sleepTeal : colors.strainBlue;
  const quality = activityQuality({
    source: activity.source,
    hrSamples: hr.length,
    hasAvgHr: activity.avgHr != null,
    hasStrain: activity.strain != null,
    hasRoute: !!activity.route?.length,
    hasSteps: activity.steps != null,
    isNap,
  });

  const remove = () =>
    Alert.alert('Delete activity', `Remove this ${activity.activity}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void appStore.removeCardio(activity.id);
          nav.back();
        },
      },
    ]);

  return (
    <Screen title={activity.activity} onBack={nav.back} tint={tint}>
      <Card>
        <View style={styles.headRow}>
          <View>
            <Text style={styles.title}>{activity.activity}</Text>
            <Text style={styles.sub}>
              {date} - {formatClock(activity.startTs)}-{formatClock(activity.endTs)}
            </Text>
          </View>
          <Pressable hitSlop={10} onPress={remove}>
            <Ionicons name="trash-outline" size={20} color={colors.textTertiary} />
          </Pressable>
        </View>
        <View style={styles.statRow}>
          <Stat label="Duration" value={formatDuration(durMin)} />
          {isNap ? (
            <>
              <Stat label="Asleep" value={nap ? formatDuration(nap.asleepMin) : '-'} color={colors.sleepTeal} />
              <Stat label="Efficiency" value={nap ? `${nap.efficiency}%` : '-'} color={colors.sleepTeal} />
            </>
          ) : (
            <>
              <Stat label="Strain" value={activity.strain != null ? activity.strain.toFixed(1) : '-'} color={colors.strainBlue} />
              <Stat label="Calories" value={activity.kcal ?? '-'} color={colors.recoveryYellow} />
            </>
          )}
        </View>
      </Card>

      <SectionLabel>Recording quality</SectionLabel>
      <Card>
        <View style={styles.qualityHead}>
          <View style={[styles.qualityBadge, { backgroundColor: quality.color }]}>
            <Text style={styles.qualityBadgeText}>{quality.badge}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.qualityTitle}>{quality.title}</Text>
            <Text style={styles.qualityBody}>{quality.body}</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <Stat label="Source" value={quality.sourceLabel} color={quality.color} />
          <Stat label="HR samples" value={hr.length || '-'} />
          <Stat label="Completeness" value={quality.completeness} color={quality.color} />
        </View>
      </Card>

      {isNap ? (
        <>
          <View style={styles.grid}>
            <Card style={styles.half}>
              <Stat label="Restorative" value={nap ? formatDuration(nap.restorativeMin) : '-'} color={colors.sleepTeal} />
            </Card>
            <Card style={styles.half}>
              <Stat label="HR coverage" value={nap ? `${nap.coveragePct}%` : '-'} color={colors.sleepTeal} />
            </Card>
          </View>
          <View style={styles.grid}>
            <Card style={styles.half}>
              <Stat label="Avg HR" value={activity.avgHr ?? '-'} unit={activity.avgHr != null ? 'bpm' : undefined} color={colors.recoveryRed} />
            </Card>
            <Card style={styles.half}>
              <Stat label="Source" value={nap?.autoDetected ? 'auto-detected' : 'timer'} />
            </Card>
          </View>
        </>
      ) : (
        <>
          <View style={styles.grid}>
            <Card style={styles.half}>
              <Stat label="Avg HR" value={activity.avgHr ?? '-'} unit={activity.avgHr != null ? 'bpm' : undefined} color={colors.recoveryRed} />
            </Card>
            <Card style={styles.half}>
              <Stat label="Distance" value={formatDistance(activity.distanceM)} color={colors.recoveryGreen} />
            </Card>
          </View>
          <View style={styles.grid}>
            <Card style={styles.half}>
              <Stat label="Max HR" value={activity.maxHr ?? '-'} unit={activity.maxHr != null ? 'bpm' : undefined} color={colors.recoveryRed} />
            </Card>
            <Card style={styles.half}>
              <Stat label="Steps" value={activity.steps != null ? activity.steps.toLocaleString() : '-'} color={colors.recoveryGreen} />
            </Card>
          </View>
          <View style={styles.grid}>
            <Card style={styles.half}>
              <Stat label="Cadence" value={activity.cadenceSpm ?? '-'} unit={activity.cadenceSpm != null ? 'spm' : undefined} />
            </Card>
            <Card style={styles.half}>
              <Stat label="Step source" value={activity.steps != null ? stepSourceLabel(activity.stepSource) : '-'} />
            </Card>
          </View>
          <View style={styles.grid}>
            <Card style={styles.half}>
              <Stat label="Laps" value={activity.lapCount ?? '-'} />
            </Card>
            <Card style={styles.half}>
              <Stat label="Step trust" value={activity.stepSource === 'band' ? 'calibrated' : activity.stepSource === 'phone' ? 'pedometer' : activity.stepSource === 'manual' ? 'entered' : '-'} />
            </Card>
          </View>
        </>
      )}

      {!isNap && activity.distanceM != null ? (
        <View style={styles.grid}>
          <Card style={styles.half}>
            <Stat label="Pace" value={formatPace(activity.distanceM, elapsedSec)} />
          </Card>
          <Card style={styles.half}>
            <Stat
              label="Avg speed"
              value={activity.distanceM > 0 ? (activity.distanceM / 1000 / (elapsedSec / 3600)).toFixed(1) : '-'}
              unit="km/h"
            />
          </Card>
        </View>
      ) : null}

      {!isNap && activity.route && activity.route.length >= 2 ? (
        <>
          <SectionLabel>Route</SectionLabel>
          <Card style={{ alignItems: 'center' }}>
            <RouteTrace route={activity.route} />
          </Card>
        </>
      ) : null}

      {te ? (
        <>
          <SectionLabel>Training effect</SectionLabel>
          <Card>
            <View style={styles.statRow}>
              <Stat label={`Aerobic - ${te.aerobicLabel}`} value={te.aerobic.toFixed(1)} color={colors.strainBlue} />
              <Stat label={`Anaerobic - ${te.anaerobicLabel}`} value={te.anaerobic.toFixed(1)} color={colors.recoveryRed} />
              <Stat label="Recovery time" value={recoveryHrs != null ? `${recoveryHrs}h` : '-'} color={colors.recoveryYellow} />
            </View>
            <Text style={styles.teNote}>
              Training Effect (0-5) and recovery time are estimated from your heart-rate response.
            </Text>
          </Card>
        </>
      ) : null}

      <SectionLabel>Heart rate</SectionLabel>
      <Card>
        {hr.length > 1 ? (
          <LineChart values={hr} color={colors.recoveryRed} leftLabel={formatClock(activity.startTs)} rightLabel={formatClock(activity.endTs)} />
        ) : (
          <Empty text="No heart-rate samples were stored for this activity window." />
        )}
      </Card>

      {!isNap ? (
        <>
          <SectionLabel>Time in heart-rate zones</SectionLabel>
          <Card>
            {zones.some((z) => z.minutes > 0) ? (
              zones.map((z, i) => (
                <Bar
                  key={z.zone}
                  label={`Z${z.zone}`}
                  value={z.minutes / zoneMax}
                  color={strainZoneColors[i] ?? colors.strainBlue}
                  right={formatDuration(z.minutes)}
                />
              ))
            ) : (
              <Empty text="No heart-rate zone data for this activity." />
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function activityQuality(input: {
  source: string;
  hrSamples: number;
  hasAvgHr: boolean;
  hasStrain: boolean;
  hasRoute: boolean;
  hasSteps: boolean;
  isNap: boolean;
}): {
  badge: string;
  title: string;
  body: string;
  sourceLabel: string;
  completeness: string;
  color: string;
} {
  const sourceLabel =
    input.source === 'live' ? 'live' : input.source === 'manual' ? 'manual' : input.source === 'auto' ? 'auto' : input.source;

  if (input.isNap) {
    return {
      badge: input.hrSamples > 0 || input.hasAvgHr ? 'NAP' : 'TIME',
      title: input.hrSamples > 0 || input.hasAvgHr ? 'Nap has usable HR context' : 'Nap is mostly time-based',
      body: input.hrSamples > 0 || input.hasAvgHr
        ? 'Nap duration and available heart-rate signal can contribute to sleep-need credit.'
        : 'This nap is saved from timing; sleep-need credit is estimated from duration.',
      sourceLabel,
      completeness: input.hrSamples > 0 || input.hasAvgHr ? 'usable' : 'limited',
      color: input.hrSamples > 0 || input.hasAvgHr ? colors.sleepTeal : colors.recoveryYellow,
    };
  }

  if (input.source === 'manual' && !input.hasAvgHr) {
    return {
      badge: 'TIME',
      title: 'Manual log without heart rate',
      body: 'Duration and optional steps/distance are saved, but strain, calories and training effect need real HR data.',
      sourceLabel,
      completeness: 'limited',
      color: colors.recoveryYellow,
    };
  }

  if (!input.hasStrain && input.hrSamples < 5 && !input.hasAvgHr) {
    return {
      badge: 'HR',
      title: 'Heart-rate signal is missing',
      body: 'The activity is stored, but training load and recovery impact are incomplete without HR.',
      sourceLabel,
      completeness: 'limited',
      color: colors.recoveryYellow,
    };
  }

  const extras = [input.hasRoute ? 'route' : null, input.hasSteps ? 'steps' : null].filter(Boolean).join(' + ');
  return {
    badge: 'GOOD',
    title: 'Recording looks usable',
    body: extras ? `Heart-rate based strain is present, with ${extras} captured for extra context.` : 'Heart-rate based strain is present for training load and recovery context.',
    sourceLabel,
    completeness: 'good',
    color: colors.recoveryGreen,
  };
}

function RouteTrace({ route }: { route: Array<{ lat: number; lng: number }> }) {
  const W = 320;
  const H = 180;
  const pad = 14;
  const lats = route.map((p) => p.lat);
  const lngs = route.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const span = Math.max(1e-6, maxLat - minLat, maxLng - minLng);
  const pts = route
    .map((p) => {
      const x = pad + ((p.lng - minLng) / span) * (W - 2 * pad);
      const y = H - pad - ((p.lat - minLat) / span) * (H - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Polyline points={pts} fill="none" stroke={colors.recoveryGreen} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  title: { color: colors.text, fontSize: 20, fontFamily: fonts.black },
  sub: { color: colors.textSecondary, fontSize: 13, marginTop: 2, fontFamily: fonts.text },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  teNote: { color: colors.textTertiary, fontSize: 11, lineHeight: 16, marginTop: 12, fontFamily: fonts.text },
  qualityHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  qualityBadge: { width: 50, height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  qualityBadgeText: { color: '#000', fontSize: 10, fontFamily: fonts.black },
  qualityTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.textBold },
  qualityBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3, fontFamily: fonts.text },
});
