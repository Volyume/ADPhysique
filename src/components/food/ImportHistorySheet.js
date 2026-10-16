import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '../Text';
import { fontSize, fontWeight, spacing, fontFamily } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import BottomSheet from '../BottomSheet';
import Button from '../Button';
import { logError } from '../../lib/errorLog';
import { summariseImport, summariseResult, problemLines } from '../../lib/food/importHistory';
import { writePlan } from '../../lib/food/importHistoryFlow';

/**
 * Import food history (D230 R21): one sheet, four moments.
 *   review   what the file holds, BEFORE anything is written ("Read 412 rows
 *            from 3 March to 14 October. 408 will be added. 4 could not be
 *            read."), then Cancel or Import. Cancel writes nothing.
 *   writing  the import in whole-day batches, with how far it has got.
 *   done     what was added ("408 added. 4 could not be read.").
 *   failed   a calm sentence; days already written stay, and importing the
 *            same file again leaves them alone.
 * What could not be read is listed by row on tap, in review and in done.
 * No food name or figure from the file goes into a log line.
 *
 * Props: visible, userId, plan (from planFromText), onClose.
 */
export default function ImportHistorySheet({ visible, userId, plan, onClose }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const [phase, setPhase] = useState('review');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [problem, setProblem] = useState(null);
  const [showReasons, setShowReasons] = useState(false);

  useEffect(() => {
    if (visible) {
      setPhase('review'); setProgress(0); setResult(null); setProblem(null); setShowReasons(false);
    }
  }, [visible, plan]);

  if (!plan) return null;
  const writing = phase === 'writing';
  const canImport = plan.addedRows > 0;
  const reasons = problemLines(plan.problems);
  const lines = phase === 'done' && result ? summariseResult(plan, result) : summariseImport(plan);

  function close() {
    if (writing) return; // the write runs to its end; the sheet stays to say so
    onClose?.();
  }

  async function handleImport() {
    if (writing || !canImport) return;
    setPhase('writing');
    setProblem(null);
    try {
      const out = await writePlan(userId, plan, { onProgress: (n) => setProgress(n) });
      setResult(out);
      setPhase('done');
    } catch (e) {
      const written = Number(e?.written) || 0;
      logError('ImportHistory.write', e, { stage: e?.stage ?? 'unknown', format: plan.format ?? null });
      setProblem(written > 0
        ? `${written} added before a problem stopped the import. Import the same file again and the days already added will be left as they are.`
        : 'Your food history was not added. Try again in a moment.');
      setPhase('failed');
    }
  }

  const showReasonToggle = reasons.length > 0 && (phase === 'review' || phase === 'done');

  return (
    <BottomSheet visible={visible} onClose={close} scroll accessibilityLabel="Import food history">
      <Text style={[styles.title, live.title]} accessibilityRole="header">Import food history</Text>
      {phase === 'failed' ? (
        <Text style={[styles.line, live.line]} accessibilityRole="alert" testID="import-history-problem">{problem}</Text>
      ) : (
        <View style={styles.lines} testID="import-history-lines">
          {lines.map((line) => (
            <Text key={line} style={[styles.line, live.line]}>{line}</Text>
          ))}
          {writing ? (
            <Text style={[styles.line, live.muted]} accessibilityLiveRegion="polite" testID="import-history-progress">
              {`Adding your history: ${progress} of ${plan.addedRows} so far.`}
            </Text>
          ) : null}
        </View>
      )}
      {showReasonToggle ? (
        <View style={styles.reasons}>
          <Button
            title={showReasons ? 'Hide what could not be read' : 'See what could not be read'}
            variant="tertiary"
            size="sm"
            fullWidth={false}
            onPress={() => setShowReasons((v) => !v)}
            accessibilityState={{ expanded: showReasons }}
            testID="import-history-reasons-toggle"
          />
          {showReasons ? reasons.map((line) => (
            <Text key={line} style={[styles.reason, live.muted]}>{line}</Text>
          )) : null}
        </View>
      ) : null}
      <View style={styles.actions}>
        {phase === 'review' && canImport ? (
          <>
            <Button title="Cancel" variant="secondary" onPress={close} fullWidth={false} style={styles.actionButton} testID="import-history-cancel" />
            <Button title="Import" onPress={handleImport} fullWidth={false} style={styles.actionButton} testID="import-history-import" />
          </>
        ) : null}
        {writing ? (
          <Button title="Importing" loading onPress={() => {}} fullWidth={false} style={styles.actionButton} testID="import-history-writing" />
        ) : null}
        {(phase === 'review' && !canImport) || phase === 'done' || phase === 'failed' ? (
          <Button
            title={phase === 'done' ? 'Done' : 'Close'}
            variant={phase === 'done' ? 'primary' : 'secondary'}
            onPress={close}
            fullWidth={false}
            style={styles.actionButton}
            testID="import-history-close"
          />
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.lg, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },
  lines: { gap: spacing.xs, marginTop: spacing.sm },
  line: { fontSize: fontSize.md },
  reasons: { gap: spacing.xs, marginTop: spacing.sm, alignItems: 'flex-start' },
  reason: { fontSize: fontSize.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  actionButton: { flex: 1 },
});

function buildLiveStyles(t) {
  return {
    title: { color: t.colors.textPrimary },
    line: { color: t.colors.textPrimary },
    muted: { color: t.colors.textMuted },
  };
}
