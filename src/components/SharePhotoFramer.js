/**
 * SharePhotoFramer — the share image's live preview when it has a photo:
 * the photo moves and resizes under your fingers, right on the card.
 *
 * Founder orders 2026-09-26: "when adding a photo id like people to be able
 * to crop the photo or even move the alignment so that it shows best in the
 * background ... if I can move it up down left or right it will show
 * better", then "People can use camera or My Photo. Both should be
 * adjustable in position and size on the render and final share in the most
 * elegant way."
 *
 * So there is no separate editing step. The preview frame is the card's own
 * shape; the photo sits under it and follows the athlete's fingers (drag to
 * move, pinch to resize, both on the UI thread). Pinching out stops where the
 * photo covers the card; pinching in goes down to where the whole photo fits,
 * on the card's own ground. Over the photo lies the card itself, drawn by the
 * one share renderer with the photo left out (`omitPhoto`), so the athlete
 * places the photo against the real title, numbers and scrim. As a gesture
 * ends, the position is handed up as the renderer's resolution-free framing
 * ({ zoom, cx, cy }, lib/shareCard/photoFraming.js), which the export then
 * draws exactly.
 *
 * The page around the preview scrolls, so a drag that starts on the photo
 * must never scroll the page: the gestures block the page's scroll gesture
 * (`blocksGesture`, RNGH's own coordination, not a timing trick), and a drag
 * that starts anywhere else scrolls as normal.
 *
 * Screen readers get the same control as actions on the frame: zoom in or
 * out, and move the photo up, down, left or right.
 */
import { useCallback, useEffect, useMemo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { radius } from '../styles/theme';
import { CARD_GROUND } from '../lib/shareCard/drawShareCard';
import {
  MAX_PHOTO_ZOOM, coverSize, minZoomFor, clampOffset, clampZoom, transformFromCrop, cropFromTransform,
} from '../lib/shareCard/photoFraming';

// The photo layer, driven on the UI thread (the ProgressPhotoViewer idiom).
const AnimatedImage = Animated.createAnimatedComponent(Image);

// Worklet-safe twin of photoFraming.clampOffset, for the gesture callbacks
// (a plain helper called from a worklet is a fatal error on the new
// architecture: VOLYUME-2A, ProgressPhotoViewer).
function clampAxis(value, size, frame, zoom) {
  'worklet';
  const m = Math.abs(size * zoom - frame) / 2;
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
  blocksGesture = null,
}) {
  const cover = useMemo(
    () => coverSize(photoWidth, photoHeight, frameWidth, frameHeight),
    [photoWidth, photoHeight, frameWidth, frameHeight],
  );
  const cw = cover.w;
  const ch = cover.h;
  const fw = frameWidth;
  const fh = frameHeight;
  const minZoom = useMemo(
    () => minZoomFor(photoWidth, photoHeight, fw, fh),
    [photoWidth, photoHeight, fw, fh],
  );
  const maxZoom = MAX_PHOTO_ZOOM;

  const zoom = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedZoom = useSharedValue(1);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  // Start from the framing the card already has, and follow it when it
  // changes from outside (Reset, a new photo, or a format with a new shape).
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
    let pinch = Gesture.Pinch()
      .onStart(() => {
        'worklet';
        savedZoom.value = zoom.value;
      })
      .onUpdate((e) => {
        'worklet';
        const z = Math.min(maxZoom, Math.max(minZoom, savedZoom.value * e.scale));
        zoom.value = z;
        // Re-clamp as the size changes, so resizing can never leave a gap
        // at an edge or carry the photo off the card.
        tx.value = clampAxis(tx.value, cw, fw, z);
        ty.value = clampAxis(ty.value, ch, fh, z);
      })
      .onEnd(() => {
        'worklet';
        runOnJS(commit)(zoom.value, tx.value, ty.value);
      });
    let pan = Gesture.Pan()
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
    if (blocksGesture) {
      pinch = pinch.blocksExternalGesture(blocksGesture);
      pan = pan.blocksExternalGesture(blocksGesture);
    }
    return Gesture.Simultaneous(pinch, pan);
  }, [commit, blocksGesture, cw, ch, fw, fh, minZoom, maxZoom, zoom, tx, ty, savedZoom, savedTx, savedTy]);

  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: zoom.value }],
  }));

  // The accessible route to the same control: a tenth of the frame per move,
  // a quarter step per zoom.
  const nudge = useCallback((action) => {
    let z = zoom.value;
    let x = tx.value;
    let y = ty.value;
    if (action === 'increment') z = clampZoom(z + 0.25, minZoom);
    else if (action === 'decrement') z = clampZoom(z - 0.25, minZoom);
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
  }, [zoom, tx, ty, cw, ch, fw, fh, minZoom, commit]);

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[styles.frame, { width: fw, height: fh }]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Your photo on the share image"
        accessibilityHint="Drag to move your photo. Pinch to make it bigger or smaller."
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
  );
}

const styles = StyleSheet.create({
  // The card's own ground behind the photo, fixed whatever the app theme,
  // because it is part of the image being shared (drawShareCard CARD_GROUND).
  frame: { overflow: 'hidden', borderRadius: radius.lg, backgroundColor: CARD_GROUND },
  photo: { position: 'absolute' },
});
