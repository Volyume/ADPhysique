/**
 * DemoCard
 *
 * Top-of-screen exercise demonstration. Shows a thumbnail immediately (from
 * disk cache), with an amber "How to perform" tap area; tapping plays the demo
 * loop silently. The dark card contains any lighter-background media so it
 * never bleeds into the #0D0D0D screen.
 *
 * States:
 *  - no demoUrl  -> render IllustrationCard fallback (the v1 state)
 *  - load error  -> silently fall through to IllustrationCard
 *  - loading     -> amber-pulse skeleton at card dimensions
 *
 * Media is animated WebP (or MP4 later) served from the EU Supabase Storage
 * bucket, cached memory-disk by expo-image for offline replay. No new
 * dependency: expo-image is already in the project.
 *
 * Voice: British English. Visuals: #0D0D0D/#F5A623 tokens only.
 */

import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha } from '../styles/theme';
import { Skeleton } from './Skeleton';
import IllustrationCard from './IllustrationCard';

export default function DemoCard({ exercise }) {
  const demoUrl = exercise?.demoUrl || null;
  const thumbUrl = exercise?.demoThumbnailUrl || null;
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);

  // No media (or it failed): the illustrated fallback stands alone.
  if (!demoUrl || errored) {
    return <IllustrationCard muscleLabel={exercise?.primaryMuscleLabel} />;
  }

  const source = playing ? demoUrl : (thumbUrl || demoUrl);

  return (
    <Pressable
      style={styles.card}
      onPress={() => { if (!playing) { setLoading(true); setPlaying(true); } }}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Demonstration playing' : 'How to perform'}
    >
      <Image
        style={styles.media}
        source={source}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={150}
        onLoadStart={() => playing && setLoading(true)}
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setErrored(true); }}
      />
      {loading ? (
        <View style={styles.overlayCenter} pointerEvents="none">
          <Skeleton width="100%" height="100%" r={radius.lg} style={styles.skeleton} />
        </View>
      ) : null}
      {!playing ? (
        <View style={styles.playOverlay} pointerEvents="none">
          <Ionicons name="play" size={18} color={colors.background} />
          <Text style={styles.playLabel}>How to perform</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.25),
    minHeight: 180,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  media: { width: '100%', height: 220 },
  overlayCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  skeleton: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  playOverlay: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  playLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.background },
});
