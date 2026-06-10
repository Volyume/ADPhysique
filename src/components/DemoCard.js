/**
 * DemoCard
 *
 * Top-of-sheet exercise demonstration. Four states, in priority order:
 *  1. `localVideo` (bundled MP4 clip) -> a silent, auto-looping video. This is
 *     the premium offline path: licensed MoveKit clips ship in the APK and play
 *     with no network.
 *  2. `localFrames` (bundled start/end stills) -> an in-app start↔end loop.
 *     The offline, public-domain STAND-IN for exercises without a clip yet.
 *  3. `exercise.demoUrl` -> real self-hosted media via expo-image (the eventual
 *     streamed path; animated-WebP slots in here with no other change).
 *  4. none -> IllustrationCard fallback (never a broken/"missing" state).
 *
 * Reduce-Motion aware: when on, the loop does NOT auto-play — it shows the start
 * frame with a control to step to the end position. A visible play/pause control
 * is always present (WCAG 2.2.2). Voice: British English. #0D0D0D/#F5A623 tokens.
 */

import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Asset } from 'expo-asset';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha } from '../styles/theme';
import { Skeleton } from './Skeleton';
import IllustrationCard from './IllustrationCard';
import useAppStore from '../store/useAppStore';

function VideoLoop({ source, muscleLabel }) {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const [playing, setPlaying] = useState(!reduceMotion);
  // Bundled videos must be extracted to a real file:// path before ExoPlayer /
  // AVPlayer can read them in a release build — a raw require() resolves to a
  // packaged-asset URI that plays in dev but not in production. expo-asset's
  // downloadAsync copies it out to a playable localUri (cached, still offline).
  const [uri, setUri] = useState(null);
  useEffect(() => {
    let alive = true;
    const asset = Asset.fromModule(source);
    asset.downloadAsync()
      .then(() => { if (alive) setUri(asset.localUri || asset.uri); })
      .catch(() => {});
    return () => { alive = false; };
  }, [source]);

  const player = useVideoPlayer(uri ? { uri } : '', p => {
    p.loop = true;
    p.muted = true; // silent by design — gym etiquette, no audio track needed
    if (!reduceMotion) p.play();
  });

  const onPress = () => {
    setPlaying(p => {
      const next = !p;
      if (next) player.play();
      else player.pause();
      return next;
    });
  };

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${muscleLabel ? muscleLabel + ' ' : ''}demonstration, ${playing ? 'tap to pause' : 'tap to play'}`}
    >
      <VideoView
        style={styles.media}
        player={player}
        contentFit="contain"
        nativeControls={false}
        pointerEvents="none"
      />
      <View style={styles.controlPill} pointerEvents="none">
        <Ionicons name={playing ? 'pause' : 'play'} size={14} color={colors.background} />
        <Text style={styles.controlText}>{playing ? 'Playing' : 'Play'}</Text>
      </View>
      <Text style={styles.caption}>Reference demo</Text>
    </Pressable>
  );
}

function FrameLoop({ frames, muscleLabel }) {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const [playing, setPlaying] = useState(!reduceMotion);
  const [showEnd, setShowEnd] = useState(false); // for the reduce-motion manual step
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion || !playing) return undefined;
    // Cross-dissolve start<->end on an interval (timing only — no
    // sequence/loop/delay, so it stays robust across environments).
    let toEnd = true;
    const tick = () => {
      Animated.timing(fade, { toValue: toEnd ? 1 : 0, duration: 600, useNativeDriver: true }).start();
      toEnd = !toEnd;
    };
    tick();
    const id = setInterval(tick, 1200);
    return () => clearInterval(id);
  }, [playing, reduceMotion, fade]);

  const onPress = () => {
    if (reduceMotion) { setShowEnd(e => !e); return; }
    setPlaying(p => !p);
  };

  const endOpacity = reduceMotion ? (showEnd ? 1 : 0) : fade;

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${muscleLabel ? muscleLabel + ' ' : ''}demonstration, ${reduceMotion ? 'tap to step through' : (playing ? 'tap to pause' : 'tap to play')}`}
    >
      <Image style={styles.media} source={frames[0]} contentFit="contain" cachePolicy="memory-disk" />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: endOpacity }]} pointerEvents="none">
        <Image style={styles.media} source={frames[1]} contentFit="contain" cachePolicy="memory-disk" />
      </Animated.View>

      <View style={styles.controlPill} pointerEvents="none">
        <Ionicons
          name={reduceMotion ? 'swap-horizontal' : (playing ? 'pause' : 'play')}
          size={14}
          color={colors.background}
        />
        <Text style={styles.controlText}>
          {reduceMotion ? 'Step' : (playing ? 'Playing' : 'Play')}
        </Text>
      </View>
      <Text style={styles.caption}>Reference demo · public domain</Text>
    </Pressable>
  );
}

export default function DemoCard({ exercise, localFrames, localVideo }) {
  const demoUrl = exercise?.demoUrl || null;
  const thumbUrl = exercise?.demoThumbnailUrl || null;
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);

  // 1) Bundled premium MP4 clip (highest priority — the licensed offline path).
  if (localVideo && !demoUrl) {
    return <VideoLoop source={localVideo} muscleLabel={exercise?.primaryMuscleLabel} />;
  }

  // 2) Bundled public-domain stand-in loop (for lifts without a clip yet).
  if (localFrames && localFrames.length >= 2 && !demoUrl) {
    return <FrameLoop frames={localFrames} muscleLabel={exercise?.primaryMuscleLabel} />;
  }

  // 2) Real self-hosted media. 3) Illustrated fallback.
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
  controlPill: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
  },
  controlText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.background },
  caption: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.sm,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
