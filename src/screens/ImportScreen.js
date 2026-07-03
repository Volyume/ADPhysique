/**
 * ImportScreen
 *
 * Pick a CSV exported from Hevy or Strong, preview what will land in
 * Volyume, confirm. One-shot flow, there's no edit-mapping UI in
 * this iteration; unmatched exercises become custom exercises that
 * the user can edit in the library later.
 *
 * The heavy lifting is in src/lib/importExternal.js; this file is
 * pure presentation.
 */

import { useState } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { colors, fontSize, fontWeight, spacing, radius, type, circle } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import { useToast } from '../components/Toast';
import PressableCard from '../components/PressableCard';
import {
  parseCSV, detectFormat, parseHevy, parseStrong,
  analyzeImport, runImport,
} from '../lib/importExternal';
import { logError, logInfo } from '../lib/errorLog';

const SOURCES = [
  {
    key: 'hevy',
    name: 'Hevy',
    instructions:
      'In Hevy: Profile → Settings → Export Data → Workout history (CSV). The downloaded file is what you pick here.',
  },
  {
    key: 'strong',
    name: 'Strong',
    instructions:
      'In Strong: Profile → Settings → Export Strong Data. The downloaded file is what you pick here.',
  },
];

export default function ImportScreen({ navigation }) {
  const user = useAppStore(s => s.user);
  const toast = useToast();

  const [stage, setStage] = useState('idle');
  // 'idle' → user hasn't picked a file yet
  // 'parsing' → CSV being read & analysed
  // 'preview' → analysis ready, awaiting confirm
  // 'importing' → writing to SQLite
  // 'done' → success state

  const [parsed, setParsed] = useState(null);     // { workouts, exerciseNames }
  const [analysis, setAnalysis] = useState(null); // see analyzeImport
  const [format, setFormat] = useState(null);     // 'hevy' | 'strong'
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);     // counts from runImport

  async function handlePickFile() {
    setError(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        // CSV is the only supported input. Setting type:'text/csv'
        // hides JSON / images on the Android picker, which keeps the
        // happy path obvious for users with a cluttered Downloads.
        type: ['text/csv', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });
      if (picked?.canceled) return;
      const uri = picked?.assets?.[0]?.uri || picked?.uri;
      if (!uri) {
        setError('Could not read that file. Try again.');
        return;
      }

      setStage('parsing');
      const text = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const rows = parseCSV(text);
      const fmt = detectFormat(rows);
      if (fmt === 'unknown') {
        setStage('idle');
        setError(
          "This doesn't look like a Hevy or Strong export. Make sure you picked the workout-history CSV, not a backup or summary file.",
        );
        return;
      }
      setFormat(fmt);
      const p = fmt === 'hevy' ? parseHevy(rows) : parseStrong(rows);
      if (!p.workouts.length) {
        setStage('idle');
        setError('No workouts found in that file. It may be empty or in a different layout than expected.');
        return;
      }
      setParsed(p);
      const a = await analyzeImport(user?.id, p);
      setAnalysis(a);
      setStage('preview');
    } catch (e) {
      setStage('idle');
      logError('ImportScreen.handlePickFile', e);
      setError(e?.message ?? 'Could not read that file.');
    }
  }

  async function handleConfirmImport() {
    if (!parsed || !analysis || !user?.id) return;
    setStage('importing');
    try {
      const res = await runImport(user.id, parsed, analysis);
      logInfo('Import.complete', `${format}: ${res.workouts}w/${res.sets}s/${res.exercisesCreated}new`);
      setResult(res);
      setStage('done');
      toast.show(`Imported ${res.workouts} sessions`, { variant: 'success' });
      // Kick the just-imported rows up to the cloud immediately so the
      // user's freshly-imported Hevy / Strong history shows on any
      // other device they sign into. Without this the user could
      // re-open the app, see no data on a sibling device, and assume
      // the import failed. Fire-and-forget, failures surface in the
      // debug log via the existing sync warnings.
      try {
        // eslint-disable-next-line global-require
        const { bulkUploadLocalData } = require('../lib/sync');
        bulkUploadLocalData(user.id, user.id).catch(() => {});
      } catch (_) { /* tolerate */ }
    } catch (e) {
      logError('ImportScreen.runImport', e);
      setStage('preview');
      appAlert(
        'Import failed',
        e?.message ?? 'Something went wrong writing the data. Nothing was saved.',
      );
    }
  }

  function reset() {
    setStage('idle');
    setParsed(null);
    setAnalysis(null);
    setFormat(null);
    setError(null);
    setResult(null);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1} accessibilityRole="header">Bring your history</Text>
        <Text style={styles.body}>
          Import a workout-history CSV from Hevy or Strong. Sessions, sets, weights and reps all
          come across; unmatched exercises are created in your library so nothing is lost.
        </Text>

        {stage === 'idle' && (
          <>
            <View style={styles.sourcesBlock}>
              {SOURCES.map(src => (
                <View key={src.key} style={styles.sourceCard}>
                  <View style={styles.sourceHead}>
                    <Ionicons name="cloud-download-outline" size={18} color={colors.primary} />
                    <Text style={styles.sourceName}>{src.name}</Text>
                  </View>
                  <Text style={styles.sourceText}>{src.instructions}</Text>
                </View>
              ))}
            </View>

            <PressableCard onPress={handlePickFile} style={styles.primaryCta}>
              <Ionicons name="document-attach-outline" size={20} color={colors.onPrimary} />
              <Text style={styles.primaryCtaText}>Pick CSV file</Text>
            </PressableCard>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </>
        )}

        {stage === 'parsing' && (
          <View style={styles.workingBlock}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.workingText}>Reading your file…</Text>
          </View>
        )}

        {stage === 'preview' && analysis && (
          <>
            <View style={styles.previewCard}>
              <Text style={styles.previewSource}>{format === 'hevy' ? 'Hevy' : 'Strong'} export</Text>
              <View style={styles.statRow}>
                <Stat label="Sessions" value={analysis.workoutCount} />
                <Stat label="Sets" value={analysis.setCount} />
                <Stat label="Exercises" value={analysis.mappedCount + analysis.unmappedCount} />
              </View>

              <View style={styles.breakdownRow}>
                <BreakdownDot tone="success" />
                <Text style={styles.breakdownText}>
                  {analysis.mappedCount} matched to existing exercises
                </Text>
              </View>
              {analysis.unmappedCount > 0 && (
                <View style={styles.breakdownRow}>
                  <BreakdownDot tone="warning" />
                  <Text style={styles.breakdownText}>
                    {analysis.unmappedCount} will be created as custom exercises
                  </Text>
                </View>
              )}
              {analysis.alreadyImported > 0 && (
                <View style={styles.breakdownRow}>
                  <BreakdownDot tone="muted" />
                  <Text style={styles.breakdownText}>
                    {analysis.alreadyImported} already in Volyume, will skip
                  </Text>
                </View>
              )}

              {analysis.unmappedCount > 0 && (
                <View style={styles.unmappedBlock}>
                  <Text style={styles.unmappedHead}>New custom exercises</Text>
                  <Text style={styles.unmappedText}>
                    {analysis.unmappedNames.join(', ')}
                    {analysis.unmappedCount > analysis.unmappedNames.length
                      ? ` +${analysis.unmappedCount - analysis.unmappedNames.length} more`
                      : ''}
                  </Text>
                  <Text style={styles.unmappedHint}>
                    You can edit muscle, equipment and notes later in Exercise Library.
                  </Text>
                </View>
              )}
            </View>

            <PressableCard onPress={handleConfirmImport} style={styles.primaryCta}>
              <Ionicons name="checkmark" size={20} color={colors.onPrimary} />
              <Text style={styles.primaryCtaText}>Import {analysis.workoutCount} sessions</Text>
            </PressableCard>

            <PressableCard onPress={reset} style={styles.secondaryCta}>
              <Text style={styles.secondaryCtaText}>Pick a different file</Text>
            </PressableCard>
          </>
        )}

        {stage === 'importing' && (
          <View style={styles.workingBlock}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.workingText}>Bringing your history in…</Text>
            <Text style={styles.workingSub}>This usually takes a few seconds.</Text>
          </View>
        )}

        {stage === 'done' && result && (
          <>
            <View style={styles.doneCard}>
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
              <Text style={styles.doneTitle}>Welcome to Volyume</Text>
              <Text style={styles.doneBody}>
                {result.workouts} sessions, {result.sets} sets and {result.exercisesCreated} new exercises
                are now in your library.{result.skipped > 0
                  ? ` Skipped ${result.skipped} that were already imported.`
                  : ''}
              </Text>
            </View>
            <PressableCard onPress={() => navigation.goBack()} style={styles.primaryCta}>
              <Text style={styles.primaryCtaText}>Done</Text>
            </PressableCard>
            <PressableCard onPress={reset} style={styles.secondaryCta}>
              <Text style={styles.secondaryCtaText}>Import another file</Text>
            </PressableCard>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{Number(value || 0).toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function BreakdownDot({ tone }) {
  const map = {
    success: colors.success,
    warning: colors.warning,
    muted: colors.textMuted,
  };
  return <View style={[styles.dot, { backgroundColor: map[tone] || colors.textMuted }]} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  h1: {
    ...type.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  body: {
    ...type.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },

  sourcesBlock: { gap: spacing.md, marginBottom: spacing.xl },
  sourceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  sourceHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sourceName: {
    ...type.bodyStrong,
    color: colors.textPrimary,
  },
  sourceText: {
    ...type.bodySm,
    color: colors.textSecondary,
  },

  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
  },
  primaryCtaText: {
    ...type.bodyStrong,
    color: colors.onPrimary,
  },
  secondaryCta: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryCtaText: {
    ...type.label,
    color: colors.textSecondary,
  },

  errorText: {
    ...type.bodySm,
    marginTop: spacing.lg,
    color: colors.error,
  },

  workingBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  workingText: {
    ...type.bodyStrong,
    color: colors.textPrimary,
  },
  workingSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  previewSource: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: {
    ...type.num('h2'),
    color: colors.textPrimary,
  },
  statLabel: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },

  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  breakdownText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  dot: { width: 8, height: 8, borderRadius: circle(8) },

  unmappedBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  unmappedHead: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unmappedText: {
    ...type.bodySm,
    color: colors.textSecondary,
  },
  unmappedHint: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },

  doneCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.success,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  doneTitle: {
    ...type.title,
    color: colors.textPrimary,
  },
  doneBody: {
    ...type.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
