/**
 * ClipPlayer - a saved video, played silently in the videos sheet
 * (D229 addendum 5 ruling 3: recorded videos stay viewable and deletable in
 * the workout's history in every state; the fresh-eyes review of 2026-10-15
 * found the sheet listed them with no way to watch one).
 *
 * The same frames and the same framer the share screen uses (useClipFrames,
 * ClipFramer), with no card over them and the frame sized to the video's own
 * upright shape, so the whole video is seen ("contain"). It loops, starts
 * playing at once (paused under Reduce Motion, as on the share screen), and a
 * tap pauses or plays it. Nothing is decoded until a row asks for it.
 */
import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import ClipFramer from '../share/ClipFramer';
import useClipFrames from '../../lib/shareVideo/useClipFrames';
import useAppStore from '../../store/useAppStore';
import { spacing } from '../../styles/theme';

// The player's height; its width follows the video's own shape.
const PLAYER_H = 240;
const FALLBACK_RATIO = 9 / 16;

export default function ClipPlayer({ uri, maxWidth }) {
  const reduceMotion = useAppStore((s) => !!s.accessibility?.reduceMotion);
  const [paused, setPaused] = useState(reduceMotion);
  const frames = useClipFrames(uri || null, { startMs: 0, endMs: null, paused });
  const size = useMemo(() => {
    const w = Number(frames.meta?.width) || 0;
    const h = Number(frames.meta?.height) || 0;
    const ratio = w > 0 && h > 0 ? w / h : FALLBACK_RATIO;
    let height = PLAYER_H;
    let width = Math.round(height * ratio);
    const cap = Number(maxWidth) || 0;
    if (cap > 0 && width > cap) { width = cap; height = Math.round(cap / ratio); }
    return { width, height, mediaWidth: w > 0 ? w : 1080, mediaHeight: h > 0 ? h : 1920 };
  }, [frames.meta, maxWidth]);

  return (
    <View style={styles.wrap} testID="clip-player">
      <ClipFramer
        clip={frames}
        mediaWidth={size.mediaWidth}
        mediaHeight={size.mediaHeight}
        frameWidth={size.width}
        frameHeight={size.height}
        crop={null}
        overlayUri={null}
        paused={paused}
        onTogglePause={() => setPaused((p) => !p)}
        onChange={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.sm },
});
