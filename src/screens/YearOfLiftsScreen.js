import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import { getYearOfLiftsData } from '../lib/database';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function fmtDate(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function StatCard({ icon, value, label }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function buildHeadline(data) {
  const { totalSessions, tonnage, topMonth, avgSessionsPerWeek } = data;
  if (totalSessions === 0) return 'No sessions logged in this period yet.';
  const parts = [];
  parts.push(`${totalSessions} session${totalSessions !== 1 ? 's' : ''} logged.`);
  if (tonnage > 0) {
    parts.push(`${tonnage.toLocaleString('en-GB')} kg moved.`);
  }
  if (topMonth) {
    parts.push(`${topMonth} was your busiest month.`);
  }
  if (avgSessionsPerWeek >= 3) {
    parts.push("That's consistent work.");
  }
  return parts.join(' ');
}

export default function YearOfLiftsScreen({ navigation, route }) {
  const { yearMs } = route.params ?? {};
  const { user } = useAppStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    getYearOfLiftsData(user.id, yearMs)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your year of lifts</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && <Text style={styles.loadingText}>Loading…</Text>}

        {!loading && data && (
          <>
            <View style={styles.periodRow}>
              <Text style={styles.periodText}>
                {fmtDate(data.yearStart)} – {fmtDate(data.yearEnd)}
              </Text>
            </View>

            {data.totalSessions === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="barbell-outline" size={36} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No sessions yet</Text>
                <Text style={styles.emptyBody}>
                  Come back here after you've logged a year's worth of training.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.headlineCard}>
                  <Text style={styles.headlineText}>{buildHeadline(data)}</Text>
                </View>

                <View style={styles.statsGrid}>
                  <StatCard
                    icon="barbell-outline"
                    value={String(data.totalSessions)}
                    label="Sessions"
                  />
                  <StatCard
                    icon="layers-outline"
                    value={data.totalSets.toLocaleString('en-GB')}
                    label="Sets"
                  />
                  <StatCard
                    icon="trending-up-outline"
                    value={`${data.tonnage.toLocaleString('en-GB')} kg`}
                    label="Total volume"
                  />
                  <StatCard
                    icon="calendar-outline"
                    value={String(data.avgSessionsPerWeek)}
                    label="Avg / week"
                  />
                </View>

                {data.topExercises.length > 0 && (
                  <View style={styles.topCard}>
                    <Text style={styles.topCardTitle}>Most-trained exercises</Text>
                    {data.topExercises.map((ex, i) => (
                      <View key={i} style={styles.topRow}>
                        <Text style={styles.topRank}>{i + 1}</Text>
                        <Text style={styles.topName}>{ex.name}</Text>
                        <Text style={styles.topSets}>{ex.sets.toLocaleString('en-GB')} sets</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}

        <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary,
  },
  headerSpacer: { width: 36 },

  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },

  loadingText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingTop: spacing.xl },

  periodRow: { alignItems: 'center' },
  periodText: { fontSize: fontSize.xs, color: colors.textMuted },

  emptyCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.xl, alignItems: 'center', gap: spacing.md,
  },
  emptyTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  emptyBody: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  headlineCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl, padding: spacing.xl,
  },
  headlineText: {
    fontSize: fontSize.xl, fontWeight: fontWeight.bold,
    color: colors.background, lineHeight: 30,
  },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
  },
  statCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, gap: spacing.xs,
    alignItems: 'center',
  },
  statValue: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.textPrimary },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted },

  topCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, gap: spacing.md,
  },
  topCardTitle: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
    color: colors.textMuted, letterSpacing: 0.2,
    marginBottom: spacing.xs,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  topRank: {
    width: 24, fontSize: fontSize.lg, fontWeight: fontWeight.black,
    color: colors.primary, textAlign: 'center',
  },
  topName: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary, fontWeight: fontWeight.semibold },
  topSets: { fontSize: fontSize.sm, color: colors.textMuted },

  doneBtn: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.sm,
  },
  doneBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary },
});
