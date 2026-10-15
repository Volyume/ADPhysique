/**
 * ClipFramer: the share image's live preview when it has a clip (D229).
 * The clip plays, silent and looped inside its trim window, under the
 * card; it follows the fingers exactly as a photo does (useFramingGestures:
 * drag to move, pinch to resize, with the snap ticks), in the chosen look
 * at its strength, live, because the look is a colour matrix applied to
 * each frame. Over it lies the card itself, drawn by the one share renderer
 * with the picture left out (`omitPhoto`), so the clip is placed against
 * the real title, numbers and scrim. A tap pauses and resumes.
 *
 * The frames come from the parent's `useClipFrames` (so the trim bar and
 * the tone sampler share them). Rotation: Skia hands over the decoder's
 * unrotated frames, so the canvas turns them upright here; the cover box is
 * computed from the upright size the parent passes.
 *
 * A clip's smallest zoom is 1: it always fills the card (addendum 5, 12).
 */
import { useMemo, useCallback } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { Canvas, Image as SkiaImage, ColorMatrix, Group } from '@shopify/react-native-skia';
import { Ionicons } from '@expo/vector-icons';
import { radius, colors, withAlpha, circle, alpha } from '../../styles/theme';
import { touchTarget } from '../../styles/layout';
import { CARD_GROUND } from '../../lib/shareCard/drawShareCard';
import { lookMatrix } from '../../lib/shareCard/photoLooks';
import useFramingGestures, { framingActions } from './useFramingGestures';

/** How the decoder's frame is turned upright on a canvas of the cover
 * size. Pure: `{ transform, drawWidth, drawHeight }`. */
export function uprightDraw(rotation, cw, ch) {
  if (rotation === 90) return { transform: [{ translateX: cw }, { rotate: Math.PI / 2 }], drawWidth: ch, drawHeight: cw };
  if (rotation === 180) return { transform: [{ translateX: cw }, { translateY: ch }, { rotate: Math.PI }], drawWidth: cw, drawHeight: ch };
  if (rotation === 270) return { transform: [{ translateY: ch }, { rotate: (3 * Math.PI) / 2 }], drawWidth: ch, drawHeight: cw };
  return { transform: [], drawWidth: cw, drawHeight: ch };
}

export default function ClipFramer({
  clip,
  mediaWidth,
  mediaHeight,
  frameWidth,
  frameHeight,
  crop,
  lookKey = null,
  lookStrength = 0,
  overlayUri,
  paused = false,
  onTogglePause,
  onChange,
  blocksGesture = null,
}) {
  const framing = useFramingGestures({
    mediaWidth, mediaHeight, frameWidth, frameHeight, crop, onChange, blocksGesture, minZoom: 1,
  });
  const { cover, gesture, mediaStyle, nudge, centred } = framing;
  const cw = cover.w;
  const ch = cover.h;
  const fw = frameWidth;
  const fh = frameHeight;
  const rotation = clip?.meta?.rotation ?? 0;
  const draw = useMemo(() => uprightDraw(rotation, cw, ch), [rotation, cw, ch]);
  const matrix = useMemo(() => (lookKey ? lookMatrix(lookKey, lookStrength) : null), [lookKey, lookStrength]);

  const toggle = useCallback(() => { onTogglePause?.(); }, [onTogglePause]);
  const composed = useMemo(() => {
    const tap = Gesture.Tap().maxDuration(250).onEnd(() => {
      'worklet';
      runOnJS(toggle)();
    });
    // The drag and the pinch win; a plain tap, which moves nothing, pauses.
    return Gesture.Exclusive(gesture, tap);
  }, [gesture, toggle]);

  const guideStyle = useAnimatedStyle(() => ({ opacity: centred.value ? 1 : 0 }));

  return (
    <GestureDetector gesture={composed}>
      <View
        style={[styles.frame, { width: fw, height: fh }]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Your video on the share image"
        accessibilityHint="Drag to move your video. Pinch to make it bigger or smaller. Double tap to pause or play."
        accessibilityActions={[...framingActions('video'), { name: 'activate', label: paused ? 'Play' : 'Pause' }]}
        onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'activate' ? toggle() : nudge(e.nativeEvent.actionName))}
      >
        <Animated.View
          style={[styles.media, { width: cw, height: ch, left: (fw - cw) / 2, top: (fh - ch) / 2 }, mediaStyle]}
        >
          {clip?.ready ? (
            <Canvas style={{ width: cw, height: ch }}>
              <Group transform={draw.transform}>
                <SkiaImage image={clip.currentFrame} x={0} y={0} width={draw.drawWidth} height={draw.drawHeight} fit="fill">
                  {matrix ? <ColorMatrix matrix={matrix} /> : null}
                </SkiaImage>
              </Group>
            </Canvas>
          ) : null}
        </Animated.View>
        {overlayUri ? (
          <Image
            source={{ uri: overlayUri }}
            style={[StyleSheet.absoluteFill, { width: fw, height: fh }]}
            resizeMode="cover"
            pointerEvents="none"
          />
        ) : null}
        <Animated.View pointerEvents="none" style={[styles.guide, { left: fw / 2 - 0.5, height: fh }, guideStyle]} />
        {paused ? (
          <View pointerEvents="none" style={styles.playBadge}>
            <Ionicons name="play" size={28} color={colors.textPrimary} />
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // The card's own ground behind the clip, fixed whatever the app theme,
  // because it is part of the image being shared (drawShareCard CARD_GROUND).
  frame: { overflow: 'hidden', borderRadius: radius.lg, backgroundColor: CARD_GROUND },
  media: { position: 'absolute' },
  guide: { position: 'absolute', top: 0, width: 1, backgroundColor: colors.primary, opacity: 0 },
  // A full thumb across, the house half-alpha ground.
  playBadge: {
    position: 'absolute', alignSelf: 'center', top: '46%', width: touchTarget.minimum, height: touchTarget.minimum, borderRadius: circle(touchTarget.minimum),
    backgroundColor: withAlpha(CARD_GROUND, alpha.half), alignItems: 'center', justifyContent: 'center',
  },
});
