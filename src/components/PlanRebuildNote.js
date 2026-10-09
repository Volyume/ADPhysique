/**
 * PlanRebuildNote - the one-time "what changed" note after a plan is rebuilt
 * (D219 lane C1b; founder Q1 = A, design section 8: "Under A and B the person
 * sees a one-time note of what changed and why").
 *
 * Self-contained: it reads the note the rebuild wrote (planRebuild.
 * getPlanRebuildNote, a local record, never synced) and renders nothing at all
 * when there is none, so a screen holds a single line and no logic. The person
 * dismisses it with one button; dismissal is final (the note is kept, marked,
 * so the same rebuild never writes it again). It describes: the lines come from
 * the pure composer (planRebuildNote.js, D204, British English, no instruction).
 * `reloadKey` is anything that changes when the screen has just loaded a plan
 * (the active plan's id), so a note written by a rebuild that ran during the
 * load appears without a remount.
 */
import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from './Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, type, radius } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Card from './Card';
import Button from './Button';
import { getPlanRebuildNote, dismissPlanRebuildNote } from '../lib/planRebuild';

export default function PlanRebuildNote({ userId, reloadKey = null }) {
  const t = useTheme();
  const [note, setNote] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!userId) {
      setNote(null);
      return undefined;
    }
    getPlanRebuildNote(userId)
      .then((found) => { if (alive) setNote(found); })
      .catch(() => { if (alive) setNote(null); }); // best-effort: no note is the safe answer
    return () => { alive = false; };
  }, [userId, reloadKey]);

  const dismiss = useCallback(() => {
    setNote(null);
    dismissPlanRebuildNote(userId).catch(() => {}); // best-effort: the card is gone for this view either way
  }, [userId]);

  if (!note) return null;
  return (
    <Card style={styles.card} accessibilityLabel={`${note.title}. ${note.subtitle}.`}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: t.colors.primaryBg }]}>
          <Ionicons name="information-circle-outline" size={20} color={t.colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: t.colors.textPrimary }]}>{note.title}</Text>
          <Text style={[styles.subtitle, { color: t.colors.textSecondary }]}>{note.subtitle}</Text>
        </View>
      </View>
      <View style={styles.lines}>
        {note.lines.map((line) => (
          <Text key={line.id} style={[styles.line, { color: t.colors.textSecondary }]}>{line.text}</Text>
        ))}
      </View>
      <Button
        title="Got it"
        variant="secondary"
        onPress={dismiss}
        fullWidth={false}
        style={styles.action}
        accessibilityLabel="Got it. Hides this note for good."
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  copy: { flex: 1, minWidth: 0, gap: spacing.xs },
  title: { ...type.h3 },
  subtitle: { ...type.bodySm },
  lines: { gap: spacing.sm, marginTop: spacing.md },
  line: { ...type.bodySm },
  action: { marginTop: spacing.md, alignSelf: 'flex-start' },
});
