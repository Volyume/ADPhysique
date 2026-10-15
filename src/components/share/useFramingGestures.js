/**
 * useFramingGestures: the drag-and-pinch placement every share preview uses
 * (the photo framer since 2026-09-26, the clip framer under D229), as one
 * hook so the two can never feel different.
 *
 * The media (a photo or a clip) sits centred under the card at its cover
 * size and follows the fingers on the UI thread: drag to move, pinch to
 * resize. Resizing re-clamps the offset so a gap can never open at an
 * edge; the smallest zoom is the caller's (the photo's contain fit, or 1
 * for a clip, which always fills the card, D229 addendum 5 item 12). As a
 * gesture ends the placement is handed up as the renderer's own
 * resolution-free framing ({ zoom, cx, cy }, lib/shareCard/photoFraming.js).
 *
 * Snaps (D229, the UX research's P3): one haptic tick when the media's
 * centre meets the card's centre, when the zoom reaches fill (1) and when
 * it reaches the smallest zoom; `centred` is a shared value the caller can
 * draw a guide line from while the centres are together.
 *
 * Screen readers get the same control as actions on the frame.
 */
import { useCallback, useEffect, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import {
  MAX_PHOTO_ZOOM, coverSize, minZoomFor, clampOffset, clampZoom, transformFromCrop, cropFromTransform,
} from '../../lib/shareCard/photoFraming';
import { selection } from '../../lib/haptics';

// Worklet-safe twin of photoFraming.clampOffset, for the gesture callbacks
// (a plain helper called from a worklet is a fatal error on the new
// architecture: VOLYUME-2A, ProgressPhotoViewer).
function clampAxis(value, size, frame, zoom) {
  'worklet';
  const m = Math.abs(size * zoom - frame) / 2;
  return Math.min(m, Math.max(-m, value));
}

// Within this many points the centres count as together.
const CENTRE_SNAP_PT = 6;
const ZOOM_SNAP = 0.03;

function tick() {
  selection();
}

/**
 * @param {{mediaWidth: number, mediaHeight: number, frameWidth: number,
 *   frameHeight: number, crop: object, onChange: Function,
 *   blocksGesture?: object, minZoom?: number, maxZoom?: number,
 *   snaps?: boolean}} input `minZoom` defaults to the media's contain fit;
 *   pass 1 for a clip.
 */
export default function useFramingGestures({
  mediaWidth, mediaHeight, frameWidth, frameHeight, crop, onChange,
  blocksGesture = null, minZoom: minZoomIn = null, maxZoom = MAX_PHOTO_ZOOM, snaps = true,
}) {
  const cover = useMemo(
    () => coverSize(mediaWidth, mediaHeight, frameWidth, frameHeight),
    [mediaWidth, mediaHeight, frameWidth, frameHeight],
  );
  const cw = cover.w;
  const ch = cover.h;
  const fw = frameWidth;
  const fh = frameHeight;
  const minZoom = useMemo(
    () => (minZoomIn == null ? minZoomFor(mediaWidth, mediaHeight, fw, fh) : minZoomIn),
    [minZoomIn, mediaWidth, mediaHeight, fw, fh],
  );

  const zoom = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedZoom = useSharedValue(1);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const centred = useSharedValue(false);
  const zoomSnapped = useSharedValue(0); // 0 none, 1 fill, 2 fit

  // Start from the framing the card already has, and follow it when it
  // changes from outside (Reset, a new photo, or a format with a new shape).
  useEffect(() => {
    const start = transformFromCrop(mediaWidth, mediaHeight, fw, fh, crop);
    zoom.value = Math.max(minZoom, start.zoom);
    tx.value = clampOffset(start.tx, cw, fw, zoom.value);
    ty.value = clampOffset(start.ty, ch, fh, zoom.value);
  }, [crop, mediaWidth, mediaHeight, fw, fh, cw, ch, minZoom, zoom, tx, ty]);

  const commit = useCallback((z, x, y) => {
    onChange?.(cropFromTransform(mediaWidth, mediaHeight, fw, fh, { zoom: z, tx: x, ty: y }));
  }, [onChange, mediaWidth, mediaHeight, fw, fh]);

  const gesture = useMemo(() => {
    let pinch = Gesture.Pinch()
      .onStart(() => {
        'worklet';
        savedZoom.value = zoom.value;
      })
      .onUpdate((e) => {
        'worklet';
        let z = Math.min(maxZoom, Math.max(minZoom, savedZoom.value * e.scale));
        if (snaps) {
          // Fill and fit each hold the zoom for a moment and tick once.
          if (Math.abs(z - 1) < ZOOM_SNAP && minZoom < 1 - ZOOM_SNAP) {
            z = 1;
            if (zoomSnapped.value !== 1) { zoomSnapped.value = 1; runOnJS(tick)(); }
          } else if (Math.abs(z - minZoom) < ZOOM_SNAP && minZoom < 1 - ZOOM_SNAP) {
            z = minZoom;
            if (zoomSnapped.value !== 2) { zoomSnapped.value = 2; runOnJS(tick)(); }
          } else {
            zoomSnapped.value = 0;
          }
        }
        zoom.value = z;
        // Re-clamp as the size changes, so resizing can never leave a gap
        // at an edge or carry the media off the card.
        tx.value = clampAxis(tx.value, cw, fw, z);
        ty.value = clampAxis(ty.value, ch, fh, z);
      })
      .onEnd(() => {
        'worklet';
        zoomSnapped.value = 0;
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
        let x = clampAxis(savedTx.value + e.translationX, cw, fw, zoom.value);
        let y = clampAxis(savedTy.value + e.translationY, ch, fh, zoom.value);
        if (snaps) {
          const near = Math.abs(x) < CENTRE_SNAP_PT && Math.abs(y) < CENTRE_SNAP_PT;
          if (near) {
            x = 0; y = 0;
            if (!centred.value) { centred.value = true; runOnJS(tick)(); }
          } else if (centred.value) {
            centred.value = false;
          }
        }
        tx.value = x;
        ty.value = y;
      })
      .onEnd(() => {
        'worklet';
        centred.value = false;
        runOnJS(commit)(zoom.value, tx.value, ty.value);
      });
    if (blocksGesture) {
      pinch = pinch.blocksExternalGesture(blocksGesture);
      pan = pan.blocksExternalGesture(blocksGesture);
    }
    return Gesture.Simultaneous(pinch, pan);
  }, [commit, blocksGesture, cw, ch, fw, fh, minZoom, maxZoom, snaps, zoom, tx, ty, savedZoom, savedTx, savedTy, centred, zoomSnapped]);

  const mediaStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: zoom.value }],
  }));

  // The accessible route to the same control: a tenth of the frame per move,
  // a quarter step per zoom.
  const nudge = useCallback((action) => {
    let z = zoom.value;
    let x = tx.value;
    let y = ty.value;
    if (action === 'increment') z = Math.min(maxZoom, clampZoom(z + 0.25, minZoom));
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
  }, [zoom, tx, ty, cw, ch, fw, fh, minZoom, maxZoom, commit]);

  return { gesture, mediaStyle, nudge, cover, centred, minZoom, maxZoom };
}

/** The accessibility actions the framers expose, with the media named. */
export function framingActions(noun) {
  return [
    { name: 'increment', label: 'Zoom in' },
    { name: 'decrement', label: 'Zoom out' },
    { name: 'moveUp', label: `Move ${noun} up` },
    { name: 'moveDown', label: `Move ${noun} down` },
    { name: 'moveLeft', label: `Move ${noun} left` },
    { name: 'moveRight', label: `Move ${noun} right` },
  ];
}
