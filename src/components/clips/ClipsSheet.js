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
 * from the summary reads "After the workout, 0:12". Each has a "Play" button
 * that plays the video, silently, under its row (ClipPlayer: the same frames
 * the share screen draws; fresh-eyes review 2026-10-15), and a "Delete"
 * button that asks once ("Delete this video?") before the store removes the
 * file and the row at once. The sheet explains nothing beyond that: the
 * privacy line is said once, in the primer, and nowhere else. NO thumbnails:
 * a row of text names what is on the phone, and the video is decoded only
 * when its Play is tapped.
 *
 * Built from named house parts only: BottomSheet, Card, Text, Button, Toast,
 * the house alert.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { format } from 'date-fns';
import Text from '../Text';
import BottomSheet from '../BottomSheet';
import Card from '../Card';
import Button from '../Button';
import { useToast } from '../Toast';
import { appAlert } from '../AppAlert';
import useTheme from '../../hooks/useTheme';
import { colors, spacing, type } from '../../styles/theme';
import { logError } from '../../lib/errorLog';
import { listClipsForWorkout, deleteClip } from '../../lib/clips/store';
import {
  CLIP_STRINGS,
  clipDisplayName,
  clipRowTitle,
} from '../../lib/clips/rules';

// The player decodes video through Skia and the worklet runtime: required
// only when a row is played, so the sheet (and the screens that list it)
// keep a light import graph, as HistoryClipsRow does for its body.
function LazyClipPlayer(props) {
  // eslint-disable-next-line global-require
  const ClipPlayer = require('./ClipPlayer').default;
  return <ClipPlayer {...props} />;
}

function secondsSpoken(ms) {
  const s = Math.round(Math.max(0, Number(ms) || 0) / 1000);
  return `${s} ${s === 1 ? 'second' : 'seconds'}`;
}

// `notice` is an optional line shown above the list, used when the sheet opens
// INSTEAD of the camera because the workout is full (CLIP_STRINGS.full).
// `playOnOpenId` (D229 addendum 13, "Watch" on the saved toast): the video
// to start playing as soon as the sheet opens, when it is in the list.
export default function ClipsSheet({ visible, onClose, userId, workoutId, onChanged, notice = null, playOnOpenId = null }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const toast = useToast();
  const [clips, setClips] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState(null);
  // The one video playing under its row, if any.
  const [playingId, setPlayingId] = useState(null);
  const { width: windowWidth } = useWindowDimensions();
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    try {
      const rows = await listClipsForWorkout(userId, workoutId);
      if (aliveRef.current) { setClips(rows); setLoaded(true); }
      return rows;
    } catch (e) {
      logError('ClipsSheet.load', e, { workoutId });
      if (aliveRef.current) { setClips([]); setLoaded(true); }
      return [];
    }
  }, [userId, workoutId]);

  useEffect(() => {
    if (!visible) return;
    load().then((rows) => {
      // "Watch": the named video plays the moment the sheet opens, if it is
      // still there (an Undo may have removed it in the meantime).
      if (playOnOpenId && aliveRef.current && rows.some((c) => c.id === playOnOpenId)) {
        setPlayingId(playOnOpenId);
      }
    });
  }, [visible, load, playOnOpenId]);

  // One plain question before a person's own video goes (the house confirms
  // before deleting a progress photo too).
  function askDelete(clip) {
    if (busyId) return;
    appAlert(CLIP_STRINGS.deleteConfirmTitle, CLIP_STRINGS.deleteConfirmBody, [
      { text: CLIP_STRINGS.deleteConfirmKeep, style: 'cancel' },
      { text: CLIP_STRINGS.deleteLabel, style: 'destructive', onPress: () => { handleDelete(clip); } },
    ]);
  }

  async function handleDelete(clip) {
    if (busyId) return;
    if (playingId === clip.id) setPlayingId(null);
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
            const playing = playingId === clip.id;
            return (
              <View key={clip.id} style={[i > 0 && styles.rowDivided, i > 0 && live.rowDivided]}>
                <View style={styles.row}>
                  <View
                    style={styles.rowText}
                    accessible
                    accessibilityLabel={`${name}, ${secondsSpoken(clip.durationMs)}, recorded ${when}`}
                  >
                    <Text style={[styles.name, live.name]} numberOfLines={2}>{title}</Text>
                    <Text style={[styles.when, live.when]}>{when}</Text>
                  </View>
                  <Button
                    icon={playing ? 'stop-outline' : 'play-outline'}
                    title=""
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    disabled={!!busyId}
                    onPress={() => setPlayingId(playing ? null : clip.id)}
                    accessibilityLabel={`${playing ? CLIP_STRINGS.playStopA11y : CLIP_STRINGS.playA11y}, ${name}`}
                  />
                  <Button
                    title={CLIP_STRINGS.deleteLabel}
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    loading={busyId === clip.id}
                    disabled={!!busyId}
                    onPress={() => askDelete(clip)}
                    accessibilityLabel={`Delete video, ${name}, ${secondsSpoken(clip.durationMs)}`}
                  />
                </View>
                {playing ? <LazyClipPlayer uri={clip.uri} maxWidth={windowWidth - 2 * spacing.xl} /> : null}
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
