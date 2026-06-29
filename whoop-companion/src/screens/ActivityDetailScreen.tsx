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

export function ActivityDetailScreen({ nav, id }: { nav: Nav; id: string }) {
  const cardio = useStoreSelector(appStore, (s) => s.cardio);
  const activity = cardio.find((c) => c.id === id) ?? null;
  const [zones, setZones] = useState<HrZone[]>([]);
  const [hr, setHr] = useState<number[]>([]);

  useEffect(() => {
    if (activity) void appStore.activityDetail(activity.startTs, activity.endTs).then((d) => { setZones(d.zones); setHr(d.hr); });
  }, [id]);

  if (!activity) {
    return (
      <Screen title="Activity" onBack={nav.back}>
        <Empty text="This activity is no longer available." />
      </Screen>
    );
  }

  const durMin = Math.round((activity.endTs - activity.startTs) / 60000);
  const elapsedSec = Math.round((activity.endTs - activity.startTs) / 1000);
  const zoneMax = Math.max(1, ...zones.map((z) => z.minutes));
  const date = new Date(activity.startTs).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  const remove = () =>
    Alert.alert('Delete activity', `Remove this ${activity.activity}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void appStore.removeCardio(activity.id); nav.back(); } },
    ]);

  return (
    <Screen title={activity.activity} onBack={nav.back} tint={colors.strainBlue}>
      <Card>
        <View style={styles.headRow}>
          <View>
            <Text style={styles.title}>{activity.activity}</Text>
            <Text style={styles.sub}>{date} · {formatClock(activity.startTs)}–{formatClock(activity.endTs)}</Text>
          </View>
          <Pressable hitSlop={10} onPress={remove}>
            <Ionicons name="trash-outline" size={20} color={colors.textTertiary} />
          </Pressable>
        </View>
        <View style={styles.statRow}>
          <Stat label="Duration" value={formatDuration(durMin)} />
          <Stat label="Strain" value={activity.strain != null ? activity.strain.toFixed(1) : '—'} color={colors.strainBlue} />
          <Stat label="Calories" value={activity.kcal ?? '—'} color={colors.recoveryYellow} />
        </View>
      </Card>

      <View style={styles.grid}>
        <Card style={styles.half}><Stat label="Avg HR" value={activity.avgHr ?? '—'} unit={activity.avgHr != null ? 'bpm' : undefined} color={colors.recoveryRed} /></Card>
        <Card style={styles.half}><Stat label="Distance" value={formatDistance(activity.distanceM)} color={colors.recoveryGreen} /></Card>
      </View>
      {activity.distanceM != null ? (
        <View style={styles.grid}>
          <Card style={styles.half}><Stat label="Pace" value={formatPace(activity.distanceM, elapsedSec)} /></Card>
          <Card style={styles.half}><Stat label="Avg speed" value={activity.distanceM > 0 ? (activity.distanceM / 1000 / (elapsedSec / 3600)).toFixed(1) : '—'} unit="km/h" /></Card>
        </View>
      ) : null}

      {activity.route && activity.route.length >= 2 ? (
        <>
          <SectionLabel>Route</SectionLabel>
          <Card style={{ alignItems: 'center' }}>
            <RouteTrace route={activity.route} />
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

      <SectionLabel>Time in heart-rate zones</SectionLabel>
      <Card>
        {zones.some((z) => z.minutes > 0) ? (
          zones.map((z, i) => (
            <Bar key={z.zone} label={`Z${z.zone}`} value={z.minutes / zoneMax} color={strainZoneColors[i] ?? colors.strainBlue} right={formatDuration(z.minutes)} />
          ))
        ) : (
          <Empty text="No heart-rate zone data for this activity." />
        )}
      </Card>
    </Screen>
  );
}

/** Self-scaling polyline of the GPS route (no map tiles / API key needed). */
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
});
