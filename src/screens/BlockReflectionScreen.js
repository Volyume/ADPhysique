import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import { getBlockReflectionData } from '../lib/database';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function fmtDate(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function StatBlock({ icon, value, label }) {
  return (
    <View style={styles.statBlock}>
      <Ionicons name={icon} size={20} color={colors.primary} style={styles.statIcon} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function buildNarrative(data) {
  const { meso, totalSessions, totalSets, tonnage, tonnageDelta, topExercise } = data;
  const name = meso?.name ?? 'this block';
  const weeks = meso?.plannedWeeks ?? meso?.planned_weeks ?? '';
  const lines = [];

  if (totalSessions > 0) {
    lines.push(`You completed ${totalSessions} session${totalSessions !== 1 ? 's' : ''} across ${weeks ? `${weeks}-week` : 'the'} block.`);
  }

  if (totalSets > 0) {
    lines.push(`That's ${totalSets.toLocaleString('en-GB')} working sets and ${tonnage.toLocaleString('en-GB')} kg of total volume.`);
  }

  if (tonnageDelta !== null) {
    if (tonnageDelta > 5) {
      lines.push(`Your weekly volume climbed ${tonnageDelta}% from the first to the last week. That's progression doing its job.`);
    } else if (tonnageDelta < -5) {
      lines.push(`Volume was lower in the final week than the first. If that was a planned lighter week, that's exactly right.`);
    } else {
      lines.push(`Volume was consistent across the block. Steady work adds up.`);
    }
  }

  if (topExercise) {
    lines.push(`${topExercise} was your most-logged exercise this block.`);
  }

  if (lines.length === 0) {
    lines.push(`Block "${name}" is complete.`);
  }

  return lines;
}

export default function BlockReflectionScreen({ navigation, route }) {
  const { mesocycleId } = route.params ?? {};
  const { user } = useAppStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !mesocycleId) { setLoading(false); return; }
    getBlockReflectionData(user.id, mesocycleId)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const narrative = data ? buildNarrative(data) : [];

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
        <Text style={styles.headerTitle}>Block summary</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && <Text style={styles.loadingText}>Loading…</Text>}

        {!loading && !data && (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No data found</Text>
            <Text style={styles.emptyBody}>This block doesn't have any logged sessions yet.</Text>
          </View>
        )}

        {data && (
          <>
            <View style={styles.blockTitle}>
              <Text style={styles.blockName}>{data.meso?.name ?? 'Training Block'}</Text>
              {data.startDate ? (
                <Text style={styles.blockDates}>
                  {fmtDate(data.startDate)}
                  {data.endDate ? ` – ${fmtDate(data.endDate)}` : ''}
                </Text>
              ) : null}
            </View>

            <View style={styles.statsRow}>
              <StatBlock icon="barbell-outline" value={String(data.totalSessions)} label="Sessions" />
              <StatBlock icon="layers-outline" value={data.totalSets.toLocaleString('en-GB')} label="Sets" />
              <StatBlock
                icon="trending-up-outline"
                value={`${data.tonnage.toLocaleString('en-GB')} kg`}
                label="Total volume"
              />
            </View>

            <View style={styles.narrativeCard}>
              {narrative.map((line, i) => (
                <Text key={i} style={styles.narrativeLine}>{line}</Text>
              ))}
            </View>

            {data.meso?.plannedWeeks ? (
              <View style={styles.infoRow}>
                <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
                <Text style={styles.infoText}>
                  {data.meso.plannedWeeks}-week block
                  {data.meso.blockType ? ` · ${data.meso.blockType}` : ''}
                </Text>
              </View>
            ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: fontSize.md, fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  headerSpacer: { width: 36 },

  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },

  loadingText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingTop: spacing.xl },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.xl, alignItems: 'center', gap: spacing.md,
  },
  emptyTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  emptyBody: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  blockTitle: { gap: spacing.xs },
  blockName: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.textPrimary },
  blockDates: { fontSize: fontSize.sm, color: colors.textMuted },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  statBlock: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.xs,
  },
  statIcon: { marginBottom: 2 },
  statValue: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.textPrimary },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted },

  narrativeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, gap: spacing.md,
  },
  narrativeLine: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 23 },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs,
  },
  infoText: { fontSize: fontSize.xs, color: colors.textMuted },

  doneBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.lg, alignItems: 'center',
    marginTop: spacing.sm,
  },
  doneBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary },
});
