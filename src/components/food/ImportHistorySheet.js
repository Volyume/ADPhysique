import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '../Text';
import { fontSize, fontWeight, spacing, fontFamily } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import BottomSheet from '../BottomSheet';
import Button from '../Button';
import { useToast } from '../Toast';
import { logError } from '../../lib/errorLog';
import { summariseImport } from '../../lib/food/importHistory';
import { writePlan } from '../../lib/food/importHistoryFlow';

/**
 * Import food history: the summary, shown BEFORE anything is written (D230
 * R21). "Add them" writes the custom foods, then the entries in batches of 200
 * whole days; "Not now" writes nothing. A failure shows a calm sentence and
 * stops; batches already written stay, and the sentence says so.
 *
 * Props: visible, userId, plan (from planFromText), onClose.
 */
export default function ImportHistorySheet({ visible, userId, plan, onClose }) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  useEffect(() => {
    if (visible) { setBusy(false); setProblem(null); }
  }, [visible]);

  if (!plan) return null;
  const lines = summariseImport(plan);
  const canAdd = plan.addedRows > 0;

  async function handleAdd() {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await writePlan(userId, plan);
      toast.show('Your food history is in.', { variant: 'success' });
      onClose?.();
    } catch (e) {
      const written = Number(e?.written) || 0;
      logError('ImportHistorySheet.write', e, { written, total: plan.addedRows });
      setBusy(false);
      setProblem(written > 0
        ? 'Some of it was added before the problem. Try the file again and the days already added will be left alone.'
        : 'Your food history was not added. Try the file again in a moment.');
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Import food history">
      <Text style={[styles.title, live.title]} accessibilityRole="header">Import food history</Text>
      <View style={styles.lines}>
        {lines.map((line) => (
          <Text key={line} style={[styles.line, live.line]}>{line}</Text>
        ))}
      </View>
      {problem ? (
        <Text style={[styles.line, live.problem]} accessibilityRole="alert">{problem}</Text>
      ) : null}
      <View style={styles.actions}>
        <Button
          title={canAdd ? 'Not now' : 'Close'}
          variant="secondary"
          onPress={onClose}
          disabled={busy}
          fullWidth={false}
          style={styles.actionButton}
        />
        {canAdd ? (
          <Button
            title="Add them"
            onPress={handleAdd}
            loading={busy}
            fullWidth={false}
            style={styles.actionButton}
          />
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.lg, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold },
  lines: { gap: spacing.xs },
  line: { fontSize: fontSize.md },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  actionButton: { flex: 1 },
});

function buildLiveStyles(t) {
  return {
    title: { color: t.colors.textPrimary },
    line: { color: t.colors.textPrimary },
    problem: { color: t.colors.textMuted },
  };
}
