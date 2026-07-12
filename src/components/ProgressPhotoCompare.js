/**
 * ProgressPhotoCompare (progress-photos upgrade B2).
 *
 * A self-contained, calm comparison surface for a user's own progress photos.
 * It owns selection AND comparison: a pose filter, a dated thumbnail ribbon,
 * two quick actions, and THREE switchable comparison modes:
 *   1. Side by side  the calm DEFAULT (older-left / newer-right, dated).
 *   2. Slider        an in-house reveal on reanimated + gesture-handler; the
 *                    handle is an adjustable a11y control, static under
 *                    Reduce Motion.
 *   3. Overlay       an aligned onion-skin blend of the two photos on Skia,
 *                    with an adjustable opacity control.
 *
 * ED-SAFETY COPY CONTRACT (pinned, identical to the legacy inline compare
 * modal, A1 section 3). The ONLY words this surface renders about the body are
 * neutral labels plus dates: "Earlier" / "Later" and the date. It must never
 * contain: before, after, change, gained, lost, weight, kg, lbs, cm, delta,
 * leaner, bigger, smaller, a percent sign, or an em dash. The colocated test
 * asserts this ban with the same regex across every mode and the selection bar.
 *
 * SELF-GUARD. Comparison is one of the high-risk surfaces the shared
 * suppression gate withholds. `usePhotoSuppression()` is read here and, when
 * true (calm mode OR an open ED-pattern flag OR a fail-closed read error), the
 * whole comparison is replaced by a calm neutral placeholder. The integrator
 * gates entry too; this is a deliberate double-guard, fail closed.
 *
 * Photos never leave the device. This component reads only local files and the
 * local metadata map; it performs no network or sync work.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withTiming, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Canvas, Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors, spacing, radius, type, iconSize, motion, withAlpha,
} from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { logError } from '../lib/errorLog';
import { getPhotoMetaMap } from '../lib/progressPhotoMeta';
import usePhotoSuppression from '../hooks/usePhotoSuppression';
import useAppStore from '../store/useAppStore';
import { formatProgressPhotoDay } from '../lib/progressPhotoDates';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const THUMB = 56;
const HANDLE = 34;

// The pose filter chips. 'all' shows every photo; the others narrow to a pose
// so comparisons stay like-for-like. Labels are function-neutral.
const POSES = [
  { key: 'all', label: 'All' },
  { key: 'front', label: 'Front' },
  { key: 'side', label: 'Side' },
  { key: 'back', label: 'Back' },
];
const POSE_LABEL = { front: 'Front', side: 'Side', back: 'Back' };

const MODES = [
  { key: 'sideBySide', label: 'Side by side', icon: 'copy-outline' },
  { key: 'slider', label: 'Slider', icon: 'swap-horizontal-outline' },
  { key: 'overlay', label: 'Overlay', icon: 'layers-outline' },
];

// A small segmented control shared by the pose filter and the mode switch.
// Selection is announced via accessibilityState.selected; copy is token-styled.
function Segmented({ options, value, onChange, groupLabel }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  return (
    <View style={styles.segmented} accessibilityLabel={groupLabel}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.segment, live.segment, active && [styles.segmentActive, live.segmentActive]]}
            onPress={() => onChange(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
          >
            {opt.icon ? (
              <Ionicons
                name={opt.icon}
                size={iconSize.sm}
                color={active ? t.colors.onPrimary : t.colors.textMuted}
              />
            ) : null}
            <Text style={[styles.segmentText, live.segmentText, active && [styles.segmentTextActive, live.segmentTextActive]]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// A dated pane: one bounded, resize-decoded image with its neutral label and
// date. Shared by the side-by-side mode. `role` is 'Earlier' or 'Later'.
function Pane({ item, role, w, h, failed, onError, reduceMotion }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  return (
    <View style={styles.pane}>
      {failed ? (
        <View style={[styles.paneImage, live.paneImage, styles.fallback, live.fallback, { width: w, height: h }]}>
          <Text style={[styles.fallbackText, live.fallbackText]}>Could not load this photo.</Text>
        </View>
      ) : (
        <Image
          source={{ uri: item.uri }}
          style={[styles.paneImage, live.paneImage, { width: w, height: h }]}
          contentFit="contain"
          recyclingKey={item.name}
          transition={reduceMotion ? 0 : motion.state}
          accessible
          accessibilityLabel={`${role} photo, ${formatProgressPhotoDay(item.takenAt)}`}
          onError={onError}
        />
      )}
      <Text style={[styles.paneRole, live.paneRole]}>{role}</Text>
      <Text style={[styles.paneDate, live.paneDate]}>{formatProgressPhotoDay(item.takenAt)}</Text>
    </View>
  );
}

// The before/after SLIDER, relabelled neutrally. Bottom layer is the later
// photo; a clip wrapper reveals the earlier photo from the left, its width
// driven by a reanimated shared value so the handle tracks the finger on the
// UI thread. The handle is the adjustable a11y control (increment/decrement in
// ~10% steps). Reduce Motion drops the eased step to an instant jump.
function CompareSlider({
  earlier, later, w, h, reduceMotion, failed, onError,
}) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const divider = useSharedValue(w / 2);
  const [pct, setPct] = useState(50);

  const clipStyle = useAnimatedStyle(() => ({ width: divider.value }));
  const handleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: divider.value - HANDLE / 2 }] }));

  const pan = Gesture.Pan().onUpdate((e) => {
    const x = Math.max(0, Math.min(w, e.x));
    divider.value = x;
    runOnJS(setPct)(Math.round((x / w) * 100));
  });

  function moveTo(nextPct) {
    const clamped = Math.max(0, Math.min(100, nextPct));
    setPct(clamped);
    const x = (clamped / 100) * w;
    // Reduce Motion: jump, no easing. Otherwise a short micro-ease.
    divider.value = reduceMotion ? x : withTiming(x, { duration: motion.micro });
  }

  function onAction(e) {
    const name = e?.nativeEvent?.actionName;
    if (name === 'increment') moveTo(pct + 10);
    else if (name === 'decrement') moveTo(pct - 10);
  }

  return (
    <View style={styles.stage}>
      <View style={[styles.frame, live.frame, { width: w, height: h }]}>
        {failed.later ? (
          <View style={[styles.fallback, live.fallback, { width: w, height: h }]}>
            <Text style={[styles.fallbackText, live.fallbackText]}>Could not load this photo.</Text>
          </View>
        ) : (
          <Image
            source={{ uri: later.uri }}
            style={{ width: w, height: h }}
            contentFit="contain"
            recyclingKey={later.name}
            transition={reduceMotion ? 0 : motion.state}
            accessible
            accessibilityLabel={`Later photo, ${formatProgressPhotoDay(later.takenAt)}`}
            onError={() => onError(later)}
          />
        )}
        <Reanimated.View style={[styles.clip, clipStyle]} pointerEvents="none">
          {failed.earlier ? (
            <View style={[styles.fallback, live.fallback, { width: w, height: h }]}>
              <Text style={[styles.fallbackText, live.fallbackText]}>Could not load this photo.</Text>
            </View>
          ) : (
            <Image
              source={{ uri: earlier.uri }}
              style={{ width: w, height: h }}
              contentFit="contain"
              recyclingKey={earlier.name}
              transition={reduceMotion ? 0 : motion.state}
              accessible
              accessibilityLabel={`Earlier photo, ${formatProgressPhotoDay(earlier.takenAt)}`}
              onError={() => onError(earlier)}
            />
          )}
        </Reanimated.View>

        <GestureDetector gesture={pan}>
          <Reanimated.View
            style={[styles.handle, handleStyle]}
            accessibilityRole="adjustable"
            accessibilityLabel="Reveal slider"
            accessibilityValue={{ min: 0, max: 100, now: pct }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={onAction}
          >
            <View style={[styles.handleLine, live.handleLine]} />
            <View style={[styles.handleGrip, live.handleGrip]}>
              <Ionicons name="code-outline" size={iconSize.sm} color={t.colors.onPrimary} />
            </View>
          </Reanimated.View>
        </GestureDetector>
      </View>

      <View style={styles.ends}>
        <View style={styles.endBlock}>
          <Text style={[styles.paneRole, live.paneRole]}>Earlier</Text>
          <Text style={[styles.paneDate, live.paneDate]}>{formatProgressPhotoDay(earlier.takenAt)}</Text>
        </View>
        <View style={[styles.endBlock, styles.endRight]}>
          <Text style={[styles.paneRole, live.paneRole]}>Later</Text>
          <Text style={[styles.paneDate, live.paneDate]}>{formatProgressPhotoDay(later.takenAt)}</Text>
        </View>
      </View>
    </View>
  );
}

// The aligned onion-skin OVERLAY on Skia: the earlier photo underneath, the
// later photo blended on top at an adjustable opacity, so the two line up. The
// opacity control is an adjustable a11y track (a drag on device, increment /
// decrement for switch and screen-reader users).
function CompareOverlay({
  earlier, later, w, h,
}) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const earlierImg = useImage(earlier.uri);
  const laterImg = useImage(later.uri);
  const [pct, setPct] = useState(60);

  const trackW = w;
  const pan = Gesture.Pan().onUpdate((e) => {
    const v = Math.max(0, Math.min(100, Math.round((e.x / trackW) * 100)));
    runOnJS(setPct)(v);
  });

  function step(delta) {
    setPct((p) => Math.max(0, Math.min(100, p + delta)));
  }
  function onAction(e) {
    const name = e?.nativeEvent?.actionName;
    if (name === 'increment') step(10);
    else if (name === 'decrement') step(-10);
  }

  return (
    <View style={styles.stage}>
      <View style={[styles.frame, live.frame, { width: w, height: h }]}>
        <Canvas style={{ width: w, height: h }}>
          {earlierImg ? (
            <SkiaImage image={earlierImg} x={0} y={0} width={w} height={h} fit="contain" />
          ) : null}
          {laterImg ? (
            <SkiaImage
              image={laterImg}
              x={0}
              y={0}
              width={w}
              height={h}
              fit="contain"
              opacity={pct / 100}
            />
          ) : null}
        </Canvas>
      </View>

      <View
        style={styles.trackWrap}
        accessibilityRole="adjustable"
        accessibilityLabel="Overlay opacity"
        accessibilityValue={{ min: 0, max: 100, now: pct }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAction}
      >
        <GestureDetector gesture={pan}>
          <View style={[styles.track, live.track]}>
            <View style={[styles.trackFill, live.trackFill, { width: `${pct}%` }]} />
            <View style={[styles.trackThumb, live.trackThumb, { left: `${pct}%` }]} />
          </View>
        </GestureDetector>
      </View>

      <View style={styles.ends}>
        <View style={styles.endBlock}>
          <Text style={[styles.paneRole, live.paneRole]}>Earlier</Text>
          <Text style={[styles.paneDate, live.paneDate]}>{formatProgressPhotoDay(earlier.takenAt)}</Text>
        </View>
        <View style={[styles.endBlock, styles.endRight]}>
          <Text style={[styles.paneRole, live.paneRole]}>Later</Text>
          <Text style={[styles.paneDate, live.paneDate]}>{formatProgressPhotoDay(later.takenAt)}</Text>
        </View>
      </View>
      {/* The overlay has no auto-crossfade at all (a flicker would read as a
          "reveal"), so it is inherently static and needs no Reduce-Motion
          branch: the opacity only moves on a deliberate user action. */}
    </View>
  );
}

function seededPairFor(initialName, enriched, fallback) {
  if (!initialName || enriched.length < 2) return fallback;
  const seed = enriched.find((p) => p.name === initialName);
  if (!seed) return fallback;
  const byDate = [...enriched].sort((a, b) => a.takenAt - b.takenAt);
  const samePose = seed.pose ? byDate.filter((p) => p.pose === seed.pose) : byDate;
  const pool = (samePose.length >= 2 ? samePose : byDate).filter((p) => p.name !== seed.name);
  if (pool.length < 1) return fallback;
  const earlier = pool.filter((p) => p.takenAt <= seed.takenAt).pop();
  const later = pool.find((p) => p.takenAt > seed.takenAt);
  const partner = earlier || later;
  return partner ? [seed.name, partner.name] : fallback;
}

export default function ProgressPhotoCompare({ photos, onClose, initialName = null }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const suppressed = usePhotoSuppression();
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  const insets = useSafeAreaInsets();

  const [metaMap, setMetaMap] = useState(null);
  const [poseFilter, setPoseFilter] = useState('all');
  const [mode, setMode] = useState('sideBySide');
  const [selected, setSelected] = useState([]); // photo names, tap order, max two
  const [failed, setFailed] = useState({});
  const userId = useAppStore((s) => s.user?.id);

  // Load the local metadata map (takenAt, pose) for the given photos. Never
  // throws; a read failure falls back to filename-derived dates.
  useEffect(() => {
    let alive = true;
    const names = (photos || []).map((p) => p.name);
    (async () => {
      const map = await getPhotoMetaMap(names, userId);
      if (alive) setMetaMap(map);
    })();
    return () => { alive = false; };
  }, [photos, userId]);

  // Enrich each photo with its effective takenAt (meta, else the filename ts)
  // and pose. A missing meta map resolves to the same values as today.
  const enriched = useMemo(() => (photos || []).map((p) => {
    const m = metaMap ? metaMap[p.name] : null;
    const takenAt = Number.isFinite(m && m.takenAt) ? m.takenAt : p.ts;
    return { name: p.name, uri: p.uri, ts: p.ts, takenAt, pose: (m && m.pose) || null };
  }), [photos, metaMap]);

  // The current pose scope, sorted oldest-first for stable ordering.
  const scoped = useMemo(() => {
    const list = poseFilter === 'all' ? enriched : enriched.filter((p) => p.pose === poseFilter);
    return [...list].sort((a, b) => a.takenAt - b.takenAt);
  }, [enriched, poseFilter]);

  // Pose-aware default pair: prefer the latest photo's own pose when it has a
  // partner, else the earliest and latest overall.
  const defaultPair = useMemo(() => {
    if (enriched.length < 2) return [];
    const asc = [...enriched].sort((a, b) => a.takenAt - b.takenAt);
    const latest = asc[asc.length - 1];
    const samePose = latest.pose ? asc.filter((p) => p.pose === latest.pose) : asc;
    const pool = samePose.length >= 2 ? samePose : asc;
    const fallback = [pool[0].name, pool[pool.length - 1].name];
    return seededPairFor(initialName, enriched, fallback);
  }, [enriched, initialName]);

  // Seed the selection once a valid default is known, and never leave the
  // selection pointing at a photo that has gone away.
  useEffect(() => {
    setSelected((prev) => {
      const live = prev.filter((n) => enriched.some((e) => e.name === n));
      if (live.length === 2) return live;
      return defaultPair;
    });
  }, [defaultPair, enriched]);

  // The chosen pair, always oldest-left / newest-right whatever the tap order.
  const pair = useMemo(() => selected
    .map((n) => enriched.find((e) => e.name === n))
    .filter(Boolean)
    .sort((a, b) => a.takenAt - b.takenAt), [selected, enriched]);
  const ready = pair.length === 2;
  const setupStatus = useMemo(() => {
    if (!ready) return null;
    const [earlier, later] = pair;
    if (earlier.pose && later.pose && earlier.pose === later.pose) {
      const poseLabel = POSE_LABEL[earlier.pose] || 'Matched';
      return {
        icon: 'checkmark-circle-outline',
        title: 'Pose match',
        body: `${poseLabel} photos on both dates. Alignment is easier to read.`,
      };
    }
    if (earlier.pose && later.pose && earlier.pose !== later.pose) {
      return {
        icon: 'alert-circle-outline',
        title: 'Pose differs',
        body: 'Treat this pair as context only. Pick the same pose for a clearer review.',
      };
    }
    return {
      icon: 'information-circle-outline',
      title: 'Setup note',
      body: 'Add pose labels to future photos for cleaner visual reviews.',
    };
  }, [pair, ready]);

  // A neutral time-relative quick action: the latest photo paired with the one
  // nearest to four weeks earlier, its real gap surfaced in the label.
  const weeksBack = useMemo(() => {
    if (scoped.length < 2) return null;
    const latest = scoped[scoped.length - 1];
    const target = latest.takenAt - 4 * WEEK_MS;
    let best = scoped[0];
    for (const p of scoped) {
      if (p.name === latest.name) continue;
      if (Math.abs(p.takenAt - target) < Math.abs(best.takenAt - target)) best = p;
    }
    const n = Math.max(1, Math.round((latest.takenAt - best.takenAt) / WEEK_MS));
    return { latestName: latest.name, backName: best.name, n };
  }, [scoped]);

  function toggleSelect(name) {
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length < 2) return [...prev, name];
      return [prev[1], name];
    });
  }

  function pickEarliestLatest() {
    if (scoped.length < 2) return;
    setSelected([scoped[0].name, scoped[scoped.length - 1].name]);
  }
  function pickWeeksBack() {
    if (!weeksBack) return;
    setSelected([weeksBack.backName, weeksBack.latestName]);
  }

  function onImageError(item) {
    logError('ProgressPhotoCompare.load', new Error('Compare photo failed to load'), { name: item.name });
    setFailed((prev) => ({ ...prev, [item.name]: true }));
  }

  const win = useWindowDimensions();
  // Bounded decode: two half-width panes for side-by-side, one single frame for
  // the slider and overlay. Every dimension is an explicit number kept inside
  // the window, and expo-image decodes each photo to that same bounded size.
  const paneW = (win.width - spacing.lg * 2 - spacing.sm) / 2;
  const paneH = Math.min(Math.round(paneW * (4 / 3)), Math.round(win.height * 0.5));
  const frameW = win.width - spacing.lg * 2;
  const frameH = Math.min(Math.round(frameW * (5 / 4)), Math.round(win.height * 0.5));

  // SELF-GUARD (fail closed). Comparison is a suppressed surface: under calm
  // mode or an open ED-pattern flag (or a failed read), show a calm neutral
  // placeholder instead of any comparison. Hooks above always run first.
  if (suppressed) {
    return (
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, live.title]}>Compare Progress Photos</Text>
            <Text style={[styles.subtitle, live.subtitle]}>Dates and poses only. Files stay on this device.</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close compare"
          >
            <Ionicons name="close" size={26} color={t.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.placeholder}>
          <Ionicons name="leaf-outline" size={32} color={t.colors.textMuted} />
          <Text style={[styles.placeholderText, live.placeholderText]}>Comparison is hidden for now.</Text>
          <Text style={[styles.placeholderSub, live.placeholderSub]}>Your photos stay private to this device.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const earlier = ready ? pair[0] : null;
  const later = ready ? pair[1] : null;

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, live.title]}>Compare Progress Photos</Text>
          <Text style={[styles.subtitle, live.subtitle]}>Dates and poses only. Files stay on this device.</Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close compare"
        >
          <Ionicons name="close" size={26} color={t.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(spacing.xxxl, insets.bottom + spacing.lg) },
        ]}
        showsVerticalScrollIndicator
        testID="progress-photo-compare-scroll"
      >
        <Segmented
          options={POSES}
          value={poseFilter}
          onChange={setPoseFilter}
          groupLabel="Filter by pose"
        />

        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quick, live.quick]}
            onPress={pickEarliestLatest}
            disabled={scoped.length < 2}
            accessibilityRole="button"
            accessibilityState={{ disabled: scoped.length < 2 }}
            accessibilityLabel="Earliest and latest"
          >
            <Text style={[styles.quickText, live.quickText]}>Earliest and latest</Text>
          </TouchableOpacity>
          {weeksBack ? (
            <TouchableOpacity
              style={[styles.quick, live.quick]}
              onPress={pickWeeksBack}
              accessibilityRole="button"
              accessibilityLabel={`Latest and ${weeksBack.n} week${weeksBack.n === 1 ? '' : 's'} back`}
            >
              <Text style={[styles.quickText, live.quickText]}>
                {`Latest and ${weeksBack.n} week${weeksBack.n === 1 ? '' : 's'} back`}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {!ready ? (
          <View style={styles.placeholder}>
            <Ionicons name="images-outline" size={32} color={t.colors.textMuted} />
            <Text style={[styles.placeholderText, live.placeholderText]}>Two photos are needed to compare.</Text>
          </View>
        ) : (
          <View style={styles.body}>
            {setupStatus ? (
              <View
                style={[styles.setupStatus, live.setupStatus]}
                accessibilityLabel={`Compare setup status: ${setupStatus.title}. ${setupStatus.body}`}
              >
                <Ionicons name={setupStatus.icon} size={iconSize.sm} color={t.colors.primary} />
                <View style={styles.setupStatusCopy}>
                  <Text style={[styles.setupStatusTitle, live.setupStatusTitle]}>{setupStatus.title}</Text>
                  <Text style={[styles.setupStatusBody, live.setupStatusBody]}>{setupStatus.body}</Text>
                </View>
              </View>
            ) : null}

            {mode === 'sideBySide' ? (
              <View style={styles.panes}>
                <Pane item={earlier} role="Earlier" w={paneW} h={paneH} failed={!!failed[earlier.name]} onError={() => onImageError(earlier)} reduceMotion={reduceMotion} />
                <Pane item={later} role="Later" w={paneW} h={paneH} failed={!!failed[later.name]} onError={() => onImageError(later)} reduceMotion={reduceMotion} />
              </View>
            ) : null}

            {mode === 'slider' ? (
              <CompareSlider
                key={`${earlier.name}-${later.name}`}
                earlier={earlier}
                later={later}
                w={frameW}
                h={frameH}
                reduceMotion={!!reduceMotion}
                failed={{ earlier: !!failed[earlier.name], later: !!failed[later.name] }}
                onError={onImageError}
              />
            ) : null}

            {mode === 'overlay' ? (
              <CompareOverlay
                key={`${earlier.name}-${later.name}`}
                earlier={earlier}
                later={later}
                w={frameW}
                h={frameH}
              />
            ) : null}
          </View>
        )}

        <View style={styles.modeBar}>
          <Segmented options={MODES} value={mode} onChange={setMode} groupLabel="Comparison style" />
        </View>

        {/* Dated thumbnail ribbon. Tapping fills the two slots; a third tap
            replaces the earlier choice so a tap always responds. */}
        <View style={styles.ribbon}>
          {scoped.map((item) => {
            const isChosen = selected.includes(item.name);
            return (
              <TouchableOpacity
                key={item.name}
                onPress={() => toggleSelect(item.name)}
                accessibilityRole="button"
                accessibilityState={{ selected: isChosen }}
                accessibilityLabel={`Photo from ${formatProgressPhotoDay(item.takenAt)}`}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={[styles.thumb, live.thumb, isChosen && [styles.thumbChosen, live.thumbChosen]]}
                  contentFit="cover"
                  recyclingKey={item.name}
                  transition={reduceMotion ? 0 : motion.state}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxxl },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  title: { ...type.h3, color: colors.textPrimary },
  headerCopy: { flex: 1, minWidth: 0, gap: spacing.xxs },
  subtitle: { ...type.caption, color: colors.textMuted, lineHeight: 18 },

  segmented: {
    flexDirection: 'row', gap: spacing.xs,
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  segment: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    flex: 1, minWidth: 0, paddingVertical: spacing.sm, borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  segmentActive: { backgroundColor: colors.primaryFill },
  segmentText: { ...type.label, color: colors.textMuted, textAlign: 'center', flexShrink: 1 },
  segmentTextActive: { color: colors.onPrimary },

  quickRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  quick: {
    flex: 1, minWidth: 132, paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderSubtle,
    alignItems: 'center',
  },
  quickText: { ...type.label, color: colors.textPrimary, textAlign: 'center' },

  body: { paddingHorizontal: spacing.lg },
  setupStatus: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  setupStatusCopy: { flex: 1, minWidth: 0, gap: spacing.xxs },
  setupStatusTitle: { ...type.label, color: colors.textPrimary },
  setupStatusBody: { ...type.caption, color: colors.textMuted, lineHeight: 18 },
  panes: { flexDirection: 'row', gap: spacing.sm },
  pane: { flex: 1, alignItems: 'center' },
  paneImage: { borderRadius: radius.md, backgroundColor: colors.surface },
  paneRole: { ...type.label, color: colors.textMuted, marginTop: spacing.sm },
  paneDate: { ...type.bodyStrong, color: colors.textPrimary, marginTop: spacing.xxs },

  stage: { alignItems: 'center' },
  frame: {
    borderRadius: radius.md, backgroundColor: colors.surface, overflow: 'hidden',
    position: 'relative',
  },
  clip: {
    position: 'absolute', top: 0, left: 0, bottom: 0, overflow: 'hidden',
  },
  handle: {
    position: 'absolute', top: 0, bottom: 0, width: HANDLE,
    alignItems: 'center', justifyContent: 'center',
  },
  handleLine: {
    position: 'absolute', top: 0, bottom: 0, width: 2,
    backgroundColor: withAlpha(colors.background, 0.85),
  },
  handleGrip: {
    width: HANDLE, height: HANDLE, borderRadius: radius.full,
    backgroundColor: colors.primaryFill, alignItems: 'center', justifyContent: 'center',
  },
  ends: {
    flexDirection: 'row', justifyContent: 'space-between',
    width: '100%', marginTop: spacing.sm,
  },
  endBlock: { alignItems: 'flex-start' },
  endRight: { alignItems: 'flex-end' },

  trackWrap: { width: '100%', paddingVertical: spacing.md },
  track: {
    height: 4, borderRadius: radius.hair, backgroundColor: colors.surface3,
    justifyContent: 'center',
  },
  trackFill: { height: 4, borderRadius: radius.hair, backgroundColor: colors.primaryFill },
  trackThumb: {
    position: 'absolute', width: HANDLE / 2, height: HANDLE / 2, borderRadius: radius.full,
    marginLeft: -HANDLE / 4, backgroundColor: colors.primaryFill,
  },

  modeBar: { marginTop: spacing.lg },
  ribbon: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs,
    paddingHorizontal: spacing.lg, marginTop: spacing.sm,
  },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.sm, backgroundColor: colors.surface },
  thumbChosen: { borderWidth: 2, borderColor: colors.primary },

  fallback: {
    alignItems: 'center', justifyContent: 'center', padding: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
  },
  fallbackText: { ...type.bodySm, color: colors.textMuted, textAlign: 'center' },

  placeholder: { alignItems: 'center', marginTop: spacing.xxxl, gap: spacing.sm, paddingHorizontal: spacing.lg },
  placeholderText: { ...type.bodyStrong, color: colors.textPrimary, textAlign: 'center' },
  placeholderSub: { ...type.bodySm, color: colors.textMuted, textAlign: 'center' },
});

// CP-10 stage 4 (theming, Skia/chart consumers, 2026-07-10): buildLiveStyles
// is the shared "frozen base + live override" map for this file's five
// function-component scopes (Segmented, Pane, CompareSlider, CompareOverlay,
// ProgressPhotoCompare) -- each calls `const t = useTheme(); const live =
// useMemo(() => buildLiveStyles(t), [t]);` and appends `live.KEY` after
// `styles.KEY` in every style array, same pattern as WorkoutSummaryScreen.js's
// buildLiveStyles. Memoised on `t` (not called bare per render like the
// primitives' convention) because CompareSlider/CompareOverlay re-render on
// every drag frame (runOnJS(setPct) in their pan gestures) -- rebuilding a
// fresh style-value map on every one of those frames would be wasted work
// the plan's section 5.1 performance note warns against. Every key here
// mirrors only the colour/fontSize/type-bearing sub-properties of the
// matching frozen style above, at identical rest values; pure layout keys
// (flex/gap/padding/position/width, no token) are correctly omitted.
// `scroll`, `scrollContent`, `segmented`, `quickRow`, `body`,
// `setupStatusCopy`, `clip`, `handle`, `ends`, `endBlock`, `endRight`,
// `trackWrap`, `modeBar`, `ribbon` have no colour/fontSize tokens at all, so
// they stay untouched with no `live.*` entry.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    title: { ...t.type.h3, color: t.colors.textPrimary },
    subtitle: { ...t.type.caption, color: t.colors.textMuted },
    segment: { backgroundColor: t.colors.surface2 },
    segmentActive: { backgroundColor: t.colors.primaryFill },
    segmentText: { ...t.type.label, color: t.colors.textMuted },
    segmentTextActive: { color: t.colors.onPrimary },
    quick: { borderColor: t.colors.borderSubtle },
    quickText: { ...t.type.label, color: t.colors.textPrimary },
    setupStatus: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    setupStatusTitle: { ...t.type.label, color: t.colors.textPrimary },
    setupStatusBody: { ...t.type.caption, color: t.colors.textMuted },
    paneImage: { backgroundColor: t.colors.surface },
    paneRole: { ...t.type.label, color: t.colors.textMuted },
    paneDate: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    frame: { backgroundColor: t.colors.surface },
    handleLine: { backgroundColor: withAlpha(t.colors.background, 0.85) },
    handleGrip: { backgroundColor: t.colors.primaryFill },
    track: { backgroundColor: t.colors.surface3 },
    trackFill: { backgroundColor: t.colors.primaryFill },
    trackThumb: { backgroundColor: t.colors.primaryFill },
    thumb: { backgroundColor: t.colors.surface },
    thumbChosen: { borderColor: t.colors.primary },
    fallback: { backgroundColor: t.colors.surface },
    fallbackText: { ...t.type.bodySm, color: t.colors.textMuted },
    placeholderText: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    placeholderSub: { ...t.type.bodySm, color: t.colors.textMuted },
  };
}
