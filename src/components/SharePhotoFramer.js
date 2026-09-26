/**
 * SharePhotoFramer — move and zoom the photo behind a share image.
 *
 * Founder order 2026-09-26: "when adding a photo id like people to be able to
 * crop the photo or even move the alignment so that it shows best in the
 * background. For example it just sticks it one size in the middle it might
 * not show my biceps if I can move it up down left or right it will show
 * better."
 *
 * The frame is the card's own shape at preview size. The photo sits under it
 * at its cover size and follows the athlete's fingers (drag to move, pinch to
 * zoom, both on the UI thread), always covering the frame. Over the photo
 * lies the card itself, drawn by the one share renderer with the photo left
 * out (`omitPhoto`), so the athlete lines the photo up against the real title,
 * numbers and scrim rather than against a guess. When a gesture ends, the
 * position is handed up as the renderer's resolution-free framing
 * ({ zoom, cx, cy }, lib/shareCard/photoFraming.js), which the preview and
 * the export then draw exactly.
 *
 * Screen readers get the same control as actions on the frame: zoom in or
 * out, and move the photo up, down, left or right.
 */
import { useCallback, useEffect, useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import Button from './Button';
import useTheme from '../hooks/useTheme';
import { colors, spacing, radius, type } from '../styles/theme';
import {
  MAX_PHOTO_ZOOM, coverSize, clampOffset, clampZoom, transformFromCrop, cropFromTransform, isCentreCrop,
} from '../lib/shareCard/photoFraming';

// The photo layer, driven on the UI thread (the ProgressPhotoViewer idiom).
const AnimatedImage = Animated.createAnimatedComponent(Image);

// Worklet-safe twin of photoFraming.clampOffset, for the gesture callbacks
// (a plain helper called from a worklet is a fatal error on the new
// architecture: VOLYUME-2A, ProgressPhotoViewer).
function clampAxis(value, size, frame, zoom) {
  'worklet';
  const m = Math.max(0, (size * zoom - frame) / 2);
  return Math.min(m, Math.max(-m, value));
}

export default function SharePhotoFramer({
  photoUri,
  photoWidth,
  photoHeight,
  frameWidth,
  frameHeight,
  crop,
  overlayUri,
  onChange,
  onDone,
}) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const cover = useMemo(
    () => coverSize(photoWidth, photoHeight, frameWidth, frameHeight),
    [photoWidth, photoHeight, frameWidth, frameHeight],
  );
  const cw = cover.w;
  const ch = cover.h;
  const fw = frameWidth;
  const fh = frameHeight;
  const maxZoom = MAX_PHOTO_ZOOM;

  const zoom = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedZoom = useSharedValue(1);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  // Start from the framing the card already has (and follow it if the format
  // changes the frame's shape while this is open).
  useEffect(() => {
    const start = transformFromCrop(photoWidth, photoHeight, fw, fh, crop);
    zoom.value = start.zoom;
    tx.value = start.tx;
    ty.value = start.ty;
  }, [crop, photoWidth, photoHeight, fw, fh, zoom, tx, ty]);

  const commit = useCallback((z, x, y) => {
    onChange?.(cropFromTransform(photoWidth, photoHeight, fw, fh, { zoom: z, tx: x, ty: y }));
  }, [onChange, photoWidth, photoHeight, fw, fh]);

  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onStart(() => {
        'worklet';
        savedZoom.value = zoom.value;
      })
      .onUpdate((e) => {
        'worklet';
        const z = Math.min(maxZoom, Math.max(1, savedZoom.value * e.scale));
        zoom.value = z;
        // Re-clamp as the scale changes, so zooming out can never leave an
        // edge of the photo inside the frame.
        tx.value = clampAxis(tx.value, cw, fw, z);
        ty.value = clampAxis(ty.value, ch, fh, z);
      })
      .onEnd(() => {
        'worklet';
        runOnJS(commit)(zoom.value, tx.value, ty.value);
      });
    const pan = Gesture.Pan()
      .onStart(() => {
        'worklet';
        savedTx.value = tx.value;
        savedTy.value = ty.value;
      })
      .onUpdate((e) => {
        'worklet';
        tx.value = clampAxis(savedTx.value + e.translationX, cw, fw, zoom.value);
        ty.value = clampAxis(savedTy.value + e.translationY, ch, fh, zoom.value);
      })
      .onEnd(() => {
        'worklet';
        runOnJS(commit)(zoom.value, tx.value, ty.value);
      });
    return Gesture.Simultaneous(pinch, pan);
  }, [commit, cw, ch, fw, fh, maxZoom, zoom, tx, ty, savedZoom, savedTx, savedTy]);

  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: zoom.value }],
  }));

  // The accessible route to the same control: a tenth of the frame per move,
  // a quarter step per zoom.
  const nudge = useCallback((action) => {
    let z = zoom.value;
    let x = tx.value;
    let y = ty.value;
    if (action === 'increment') z = clampZoom(z + 0.25);
    else if (action === 'decrement') z = clampZoom(z - 0.25);
    else if (action === 'moveUp') y -= fh * 0.1;
    else if (action === 'moveDown') y += fh * 0.1;
    else if (action === 'moveLeft') x -= fw * 0.1;
    else if (action === 'moveRight') x += fw * 0.1;
    else return;
    x = clampOffset(x, cw, fw, z);
    y = clampOffset(y, ch, fh, z);
    zoom.value = z;
    tx.value = x;
    ty.value = y;
    commit(z, x, y);
  }, [zoom, tx, ty, cw, ch, fw, fh, commit]);

  const reset = useCallback(() => {
    zoom.value = 1;
    tx.value = 0;
    ty.value = 0;
    commit(1, 0, 0);
  }, [zoom, tx, ty, commit]);

  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={gesture}>
        <View
          style={[styles.frame, live.frame, { width: fw, height: fh }]}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Photo position"
          accessibilityHint="Drag to move your photo. Pinch to zoom."
          accessibilityActions={[
            { name: 'increment', label: 'Zoom in' },
            { name: 'decrement', label: 'Zoom out' },
            { name: 'moveUp', label: 'Move photo up' },
            { name: 'moveDown', label: 'Move photo down' },
            { name: 'moveLeft', label: 'Move photo left' },
            { name: 'moveRight', label: 'Move photo right' },
          ]}
          onAccessibilityAction={(e) => nudge(e.nativeEvent.actionName)}
        >
          <AnimatedImage
            source={{ uri: photoUri }}
            style={[
              styles.photo,
              { width: cw, height: ch, left: (fw - cw) / 2, top: (fh - ch) / 2 },
              photoStyle,
            ]}
            resizeMode="cover"
          />
          {overlayUri ? (
            <Image
              source={{ uri: overlayUri }}
              style={[StyleSheet.absoluteFill, { width: fw, height: fh }]}
              resizeMode="cover"
              pointerEvents="none"
            />
          ) : null}
        </View>
      </GestureDetector>
      <Text style={[styles.hint, live.hint]}>Drag to move your photo. Pinch to zoom in or out.</Text>
      <View style={styles.actions}>
        <Button
          title="Reset"
          variant="secondary"
          size="sm"
          fullWidth={false}
          onPress={reset}
          disabled={isCentreCrop(crop)}
          accessibilityLabel="Reset the photo to the centre"
        />
        <Button
          title="Done"
          size="sm"
          fullWidth={false}
          onPress={onDone}
          accessibilityLabel="Done moving the photo"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md },
  frame: {
    overflow: 'hidden', borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  photo: { position: 'absolute' },
  hint: { ...type.captionTight, color: colors.textMuted, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm },
});

function buildLiveStyles(t) {
  return {
    frame: { backgroundColor: t.colors.surface },
    hint: { ...t.type.captionTight, color: t.colors.textMuted },
  };
}
