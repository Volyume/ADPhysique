/**
 * ClipPlayer: a workout video playing under its row in the videos sheet
 * (D229 fresh-eyes should-fix 15; rebuilt under addendum 17).
 *
 * The native video view (expo-av, already in the build for the rest
 * timer's sounds), muted, looping, sized to the video's own shape inside
 * `maxWidth`. No Skia view: the live Skia canvases crashed inside RNSkia's
 * redraw on iOS (Sentry VOLYUME-3M), so nothing on a video surface draws
 * through one any more. Tap to pause and play.
 */
import { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Text from '../Text';
import useTheme from '../../hooks/useTheme';
import { colors, radius, spacing, type } from '../../styles/theme';
import { logError } from '../../lib/errorLog';

let Video = null;
let ResizeMode = null;
try {
  const av = require('expo-av');
  Video = av.Video;
  ResizeMode = av.ResizeMode;
} catch (_e) { /* a build without expo-av shows the line below */ }

const PORTRAIT = 16 / 9;

export default function ClipPlayer({ uri, maxWidth }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const [paused, setPaused] = useState(false);
  const [ratio, setRatio] = useState(PORTRAIT);
  const ref = useRef(null);
  const width = Math.max(0, Number(maxWidth) || 0);
  const height = Math.round(width * ratio);

  if (!Video || !uri) {
    return <Text style={[styles.line, live.line]}>This video cannot be played on this device.</Text>;
  }
  return (
    <TouchableOpacity
      onPress={() => setPaused((p) => !p)}
      accessibilityRole="button"
      accessibilityLabel={paused ? 'Play the video' : 'Pause the video'}
      style={[styles.frame, live.frame, { width, height }]}
      testID="clip-player"
    >
      <Video
        ref={ref}
        source={{ uri }}
        style={{ width, height }}
        resizeMode={ResizeMode?.CONTAIN ?? 'contain'}
        shouldPlay={!paused}
        isLooping
        isMuted
        useNativeControls={false}
        onReadyForDisplay={(e) => {
          const w = Number(e?.naturalSize?.width) || 0;
          const h = Number(e?.naturalSize?.height) || 0;
          if (w > 0 && h > 0) setRatio(h / w);
        }}
        onError={(e) => { logError('ClipPlayer.play', new Error(String(e))); }}
      />
      {paused ? (
        <View style={styles.pausedBadge} pointerEvents="none">
          <Text style={[styles.pausedText, live.pausedText]}>Tap to play</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface2, marginTop: spacing.sm, alignSelf: 'center' },
  line: { ...type.bodySm, color: colors.textMuted, marginTop: spacing.sm },
  pausedBadge: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  pausedText: { ...type.bodyStrong, color: colors.textPrimary },
});

function buildLiveStyles(t) {
  return {
    frame: { backgroundColor: t.colors.surface2 },
    line: { ...t.type.bodySm, color: t.colors.textMuted },
    pausedText: { ...t.type.bodyStrong, color: t.colors.textPrimary },
  };
}
