/**
 * ProgressPhotoImage (launch accessibility audit, AX-13).
 *
 * The single real-photo image primitive for progress-photo surfaces. On iOS
 * Smart Invert, a real photograph should stay photographic while the
 * surrounding UI chrome is free to invert; RN's Image exposes
 * `accessibilityIgnoresInvertColors` for exactly that, but only four
 * production sites were setting it (the audit's AX-13 finding). Rather than
 * repeat the flag at every call site, this component wraps expo-image's
 * `Image` and ALWAYS sets it, so no future real-photo render can omit it by
 * accident.
 *
 * Presentation only: it changes nothing about what is rendered, the photo's
 * source, cropping, EXIF handling, or any share-artefact behaviour. It is a
 * thin pass-through -- every prop (source, style, contentFit, recyclingKey,
 * transition, onError, accessibilityLabel, accessible, etc.) forwards
 * straight to expo-image's Image unchanged; only
 * `accessibilityIgnoresInvertColors` is forced to true regardless of what is
 * passed in, so it can never be silently dropped by a future edit.
 *
 * Ref is forwarded so callers that need the underlying node (e.g. wrapping in
 * Animated.createAnimatedComponent, as ProgressPhotoViewer's hero-morph
 * overlay does) keep working unchanged.
 *
 * This is for REAL photographs only (progress photos, comparisons,
 * thumbnails, capture previews). Decorative UI art, icons and generated
 * share-card chrome should keep using expo-image's Image directly so they
 * stay eligible for Smart Invert.
 */
import { forwardRef } from 'react';
import { Image } from 'expo-image';

const ProgressPhotoImage = forwardRef(function ProgressPhotoImage(props, ref) {
  return <Image ref={ref} {...props} accessibilityIgnoresInvertColors />;
});

export default ProgressPhotoImage;
