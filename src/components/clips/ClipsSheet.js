/**
 * ClipsSheet - a workout's clips, listed so one can be deleted (D229 addendum
 * 5, rulings 3 and 6).
 *
 * Used in two places:
 *   - the exercise More sheet's "Record a clip" row and the summary row, when
 *     the workout already holds three clips: the row opens THIS instead of the
 *     camera, so nothing is ever replaced silently and the person chooses
 *     which clip to delete;
 *   - the workout history's "Clips" row, in every state (calm mode and an open
 *     ED flag included): viewing and deleting your own clips is never withheld.
 *
 * Each row reads "Bench press, set 3, 0:12" (the exercise, the set it was
 * recorded for, the length) with the time it was recorded under it; a clip made
 * from the summary reads "After the workout, 0:12". Each has a "Delete"
 * secondary button. The sheet explains nothing beyond that: the privacy line is
 * said once, in the primer, and nowhere else. There are NO thumbnails: no frame-extraction
 * package is installed, and a row of text is honest about what is on the
 * phone. Deleting removes the file and the row at once (the store does both).
 *
 * Built from named house parts only: BottomSheet, Card, Text, Button, Toast.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import Text from '../Text';
import BottomSheet from '../BottomSheet';
import Card from '../Card';
import Button from '../Button';
import { useToast } from '../Toast';
import useTheme from '../../hooks/useTheme';
import { colors, spacing, type } from '../../styles/theme';
import { logError } from '../../lib/errorLog';
import { listClipsForWorkout, deleteClip } from '../../lib/clips/store';
import {
  CLIP_STRINGS,
  clipDisplayName,
  clipRowTitle,
} from '../../lib/clips/rules';

function secondsSpoken(ms) {
  const s = Math.round(Math.max(0, Number(ms) || 0) / 1000);
  return `${s} ${s === 1 ? 'second' : 'seconds'}`;
}

// `notice` is an optional line shown above the list, used when the sheet opens
// INSTEAD of the camera because the workout is full (CLIP_STRINGS.full).
export default function ClipsSheet({ visible, onClose, userId, workoutId, onChanged, notice = null }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const toast = useToast();
  const [clips, setClips] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    try {
      const rows = await listClipsForWorkout(userId, workoutId);
      if (aliveRef.current) { setClips(rows); setLoaded(true); }
    } catch (e) {
      logError('ClipsSheet.load', e, { workoutId });
      if (aliveRef.current) { setClips([]); setLoaded(true); }
    }
  }, [userId, workoutId]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  async function handleDelete(clip) {
    if (busyId) return;
    setBusyId(clip.id);
    try {
      await deleteClip(clip.id);
      toast.show(CLIP_STRINGS.deleted);
      await load();
      onChanged?.();
    } catch (e) {
      logError('ClipsSheet.delete', e, { clipId: clip.id });
      toast.show(CLIP_STRINGS.deleteFailed, { variant: 'error' });
    } finally {
      if (aliveRef.current) setBusyId(null);
    }
  }

  return (
    <BottomSheet
      visible={!!visible}
      onClose={onClose}
      accessibilityLabel={CLIP_STRINGS.sheetTitle}
    >
      <Text style={[styles.title, live.title]}>{CLIP_STRINGS.sheetTitle}</Text>
      {notice ? <Text style={[styles.notice, live.notice]}>{notice}</Text> : null}
      {loaded && clips.length === 0 ? (
        <Text style={[styles.empty, live.empty]}>{CLIP_STRINGS.sheetEmpty}</Text>
      ) : (
        <Card padding="md">
          {clips.map((clip, i) => {
            const name = clipDisplayName(clip);
            const title = clipRowTitle(clip);
            const when = format(new Date(clip.createdAt), 'HH:mm');
            return (
              <View
                key={clip.id}
                style={[styles.row, i > 0 && styles.rowDivided, i > 0 && live.rowDivided]}
              >
                <View
                  style={styles.rowText}
                  accessible
                  accessibilityLabel={`${name}, ${secondsSpoken(clip.durationMs)}, recorded ${when}`}
                >
                  <Text style={[styles.name, live.name]} numberOfLines={2}>{title}</Text>
                  <Text style={[styles.when, live.when]}>{when}</Text>
                </View>
                <Button
                  title={CLIP_STRINGS.deleteLabel}
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  loading={busyId === clip.id}
                  disabled={!!busyId}
                  onPress={() => handleDelete(clip)}
                  accessibilityLabel={`Delete video, ${name}, ${secondsSpoken(clip.durationMs)}`}
                />
              </View>
            );
          })}
        </Card>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, color: colors.textPrimary },
  notice: { ...type.bodySm, color: colors.textPrimary },
  empty: { ...type.bodySm, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSubtle },
  rowText: { flex: 1 },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  when: { ...type.num('label'), color: colors.textMuted, marginTop: spacing.xxs },
});

// Frozen styles above, live colour and type mirrors here (the CP-10 pattern).
function buildLiveStyles(t) {
  return {
    title: { ...t.type.title, color: t.colors.textPrimary },
    notice: { ...t.type.bodySm, color: t.colors.textPrimary },
    empty: { ...t.type.bodySm, color: t.colors.textMuted },
    rowDivided: { borderTopColor: t.colors.borderSubtle },
    name: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    when: { ...t.type.num('label'), color: t.colors.textMuted },
  };
}
