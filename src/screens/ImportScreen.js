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

import { useState, useMemo } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import BackHeader from '../components/BackHeader';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { colors, fontSize, fontWeight, spacing, type, circle, letterSpacing } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import useAppStore from '../store/useAppStore';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Card from '../components/Card';
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
  // CP-10 batch G (2026-07-11): live theme (src/hooks/useTheme.js).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);

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
      setError('Could not read that file. Try again.');
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
        'Something went wrong writing the data. Nothing was saved.',
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
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title="Import history" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* The BackHeader title already reads "Import history"; the body copy
            below explains the flow rather than repeating a second heading. */}
        <Text maxFontSizeMultiplier={1.3} style={[styles.body, live.body]}>
          Import a workout-history CSV from Hevy or Strong. Sessions, sets, weights and reps all
          come across; unmatched exercises are created in your library so nothing is lost.
        </Text>

        {stage === 'idle' && (
          <>
            <View style={styles.sourcesBlock}>
              {SOURCES.map(src => (
                <Card key={src.key}>
                  <View style={styles.sourceHead}>
                    <Ionicons name="cloud-download-outline" size={18} color={t.colors.primary} />
                    <Text maxFontSizeMultiplier={1.3} style={[styles.sourceName, live.sourceName]}>{src.name}</Text>
                  </View>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.sourceText, live.sourceText]}>{src.instructions}</Text>
                </Card>
              ))}
            </View>

            <Button
              title="Pick CSV file"
              icon="document-attach-outline"
              onPress={handlePickFile}
              style={styles.primaryButton}
            />

            {error ? <Text maxFontSizeMultiplier={1.3} style={[styles.errorText, live.errorText]}>{error}</Text> : null}
          </>
        )}

        {stage === 'parsing' && (
          <View style={styles.workingBlock}>
            <ActivityIndicator color={t.colors.primary} />
            <Text maxFontSizeMultiplier={1.3} style={[styles.workingText, live.workingText]}>Reading your file…</Text>
          </View>
        )}

        {stage === 'preview' && analysis && (
          <>
            <Card style={styles.previewCard}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.previewSource, live.previewSource]}>{format === 'hevy' ? 'Hevy' : 'Strong'} export</Text>
              <View style={styles.statRow}>
                <Stat label="Sessions" value={analysis.workoutCount} />
                <Stat label="Sets" value={analysis.setCount} />
                <Stat label="Exercises" value={analysis.mappedCount + analysis.unmappedCount} />
              </View>

              <View style={styles.breakdownRow}>
                <BreakdownDot tone="success" />
                <Text maxFontSizeMultiplier={1.3} style={[styles.breakdownText, live.breakdownText]}>
                  {analysis.mappedCount} matched to existing exercises
                </Text>
              </View>
              {analysis.unmappedCount > 0 && (
                <View style={styles.breakdownRow}>
                  <BreakdownDot tone="warning" />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.breakdownText, live.breakdownText]}>
                    {analysis.unmappedCount} will be created as custom exercises
                  </Text>
                </View>
              )}
              {analysis.alreadyImported > 0 && (
                <View style={styles.breakdownRow}>
                  <BreakdownDot tone="muted" />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.breakdownText, live.breakdownText]}>
                    {analysis.alreadyImported} already in Volyume, will skip
                  </Text>
                </View>
              )}

              {analysis.unmappedCount > 0 && (
                <View style={[styles.unmappedBlock, live.unmappedBlock]}>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.unmappedHead, live.unmappedHead]}>New custom exercises</Text>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.unmappedText, live.unmappedText]}>
                    {analysis.unmappedNames.join(', ')}
                    {analysis.unmappedCount > analysis.unmappedNames.length
                      ? ` +${analysis.unmappedCount - analysis.unmappedNames.length} more`
                      : ''}
                  </Text>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.unmappedHint, live.unmappedHint]}>
                    You can edit muscle, equipment and notes later in Exercise Library.
                  </Text>
                </View>
              )}
            </Card>

            <Button
              title={`Import ${analysis.workoutCount} sessions`}
              icon="checkmark"
              onPress={handleConfirmImport}
              style={styles.primaryButton}
            />

            <Button
              title="Pick a different file"
              variant="secondary"
              onPress={reset}
              style={styles.secondaryButton}
            />
          </>
        )}

        {stage === 'importing' && (
          <View style={styles.workingBlock}>
            <ActivityIndicator color={t.colors.primary} />
            <Text maxFontSizeMultiplier={1.3} style={[styles.workingText, live.workingText]}>Bringing your history in…</Text>
            <Text maxFontSizeMultiplier={1.3} style={[styles.workingSub, live.workingSub]}>This usually takes a few seconds.</Text>
          </View>
        )}

        {stage === 'done' && result && (
          <>
            <Card padding="xl" style={[styles.doneCard, live.doneCard]}>
              <Ionicons name="checkmark-circle" size={32} color={t.colors.success} />
              <Text maxFontSizeMultiplier={1.3} style={[styles.doneTitle, live.doneTitle]}>Welcome to Volyume</Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.doneBody, live.doneBody]}>
                {result.workouts} sessions, {result.sets} sets and {result.exercisesCreated} new exercises
                are now in your library.{result.skipped > 0
                  ? ` Skipped ${result.skipped} that were already imported.`
                  : ''}
              </Text>
            </Card>
            <Button
              title="Done"
              onPress={() => navigation.goBack()}
              style={styles.primaryButton}
            />
            <Button
              title="Import another file"
              variant="secondary"
              onPress={reset}
              style={styles.secondaryButton}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// CP-10 batch G (2026-07-11): sibling function-component scope (not
// prop-drilled `live`/`t` from ImportScreen), so its own useTheme() call is
// cleaner than threading two extra props through. Same shared
// buildLiveStyles(t) as the parent screen (CardioTrend precedent).
function Stat({ label, value }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  return (
    <View style={styles.stat}>
      <Text maxFontSizeMultiplier={1.3} style={[styles.statValue, live.statValue]}>{Number(value || 0).toLocaleString()}</Text>
      <Text maxFontSizeMultiplier={1.3} style={[styles.statLabel, live.statLabel]}>{label}</Text>
    </View>
  );
}

// CP-10 batch G (2026-07-11): sibling function-component scope, own
// useTheme() call (same reasoning as Stat above). The tone -> colour map is
// a plain UI indicator (success/warning/muted dot), not a valence mapping
// under founder review, so it converts on the buildLevelStyle(t, level)
// plumbing precedent (DebugLogScreen, batch F): wording/logic byte-identical.
function BreakdownDot({ tone }) {
  const t = useTheme();
  const map = {
    success: t.colors.success,
    warning: t.colors.warning,
    muted: t.colors.textMuted,
  };
  return <View style={[styles.dot, { backgroundColor: map[tone] || t.colors.textMuted }]} />;
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
  // sourceCard was backgroundColor colors.surface, borderRadius radius.lg,
  // borderWidth 1, borderColor colors.border, padding spacing.lg, i.e. Card's
  // defaults exactly, so it's now the bare <Card> with no style needed.
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

  primaryButton: { marginTop: spacing.lg },
  secondaryButton: { marginTop: spacing.sm },

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

  // backgroundColor/borderRadius/border/padding now come from Card's defaults
  // (surface, radius.lg, 1px colors.border, spacing.lg); only the spacing
  // below the card stays local.
  previewCard: {
    marginBottom: spacing.md,
  },
  // B-5 uppercase consolidation: this eyebrow caption already matched
  // type.overline's fontSize/letterSpacing/textTransform token-for-token
  // and carried no fontWeight override, so folding it into the shared
  // convention is a like-for-like swap (only fontFamily now resolves via
  // the named role instead of the implicit default).
  previewSource: {
    ...type.overline,
    color: colors.textMuted,
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
    letterSpacing: letterSpacing.overline,
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

  // backgroundColor/borderRadius/padding now come from Card (surface,
  // radius.lg, padding="xl"); borderColor stays explicit (a solid success
  // border, not Card's translucent tone tint).
  doneCard: {
    borderWidth: 1,
    borderColor: colors.success,
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

// CP-10 batch G (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/gap/padding/width/borderWidth, no token) are correctly
// omitted -- there is nothing to unfreeze for them. Same pattern as
// ConsistencyScreen.js's buildLiveStyles (batch F).
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    h1: { ...t.type.h2, color: t.colors.textPrimary },
    body: { ...t.type.bodySm, color: t.colors.textSecondary },
    sourceName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    sourceText: { ...t.type.bodySm, color: t.colors.textSecondary },
    errorText: { ...t.type.bodySm, color: t.colors.error },
    workingText: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    workingSub: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    previewSource: { ...t.type.overline, color: t.colors.textMuted },
    statValue: { ...t.type.num('h2'), color: t.colors.textPrimary },
    statLabel: { ...t.type.caption, color: t.colors.textMuted },
    breakdownText: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    unmappedBlock: { borderTopColor: t.colors.border },
    unmappedHead: { fontSize: t.fontSize.xs, color: t.colors.textPrimary },
    unmappedText: { ...t.type.bodySm, color: t.colors.textSecondary },
    unmappedHint: { ...t.type.caption, color: t.colors.textMuted },
    doneCard: { borderColor: t.colors.success },
    doneTitle: { ...t.type.title, color: t.colors.textPrimary },
    doneBody: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}
