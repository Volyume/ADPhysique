/**
 * VolyumeTabBar, the E15 tab-bar elevation (greenlit 2026-07-02; design in
 * audit/e15-signature-elements.md §2), designed together with
 * ActiveSessionMiniBar as the shared bottom band.
 *
 * Anchored, not floating (blur is banned by the Android-first material rule;
 * a floating dock steals the reclaimed edge-to-edge list height). The
 * elevation is earned through motion and material:
 *   - a sliding amber cushion behind the active icon AND its label, a
 *     UI-thread spring (motion.springs.settle) keyed to state.index;
 *   - an icon settle-scale (1 -> 1.06 -> 1, springs.press/release) on focus,
 *     pairing with the M1 selection haptic that still fires through the
 *     navigator's screenListeners (tab presses are emitted exactly like the
 *     stock bar, so the NAV-5 re-tap-to-root listeners keep working too);
 *   - under Reduce Motion the pill jumps instantly and icons do not scale.
 *
 * While ActiveWorkout is focused the whole band returns null, logging gets
 * the full screen, and the mini-bar is absent because you are ON the session
 * screen. On any other tab mid-session the mini-bar docks directly above
 * this bar. Hide-on-scroll deliberately not implemented (jittery on
 * mid-range Android, unpredictable mid-set); no centre action button (the
 * log-food candidate is Pro-gated, and a paywalled centre button violates
 * the free/pro exposure rule).
 *
 * T2 (world-class-audit-2026-07-03/05-cohesion.md #4): the Coach tab (where
 * CoachOutput is registered, see RootNavigator's ProfileStack) carries a
 * small amber dot when there is an unseen weekly coach review. Sourced from
 * the store's hasUnseenCoachChange flag, which HomeScreen mirrors from its
 * own coach-banner condition and CoachOutputScreen clears the moment the
 * review is actually viewed (both via the SAME per-week AsyncStorage
 * dismissal flag the Home banner already used, no second scheme). Amber, not
 * red: the theme defines no alarm-dot treatment, and amber matches the
 * calm coach-update treatment rather than reading as an alarm.
 */
import { useEffect, useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import useAppStore from '../store/useAppStore';
import ActiveSessionMiniBar from './ActiveSessionMiniBar';
import { colors, radius, spacing, motion, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';

// Sits behind the ACTIVE ICON AND ITS LABEL as one soft cushion (founder
// review 2026-07-03: a pill behind only the icon left the label hanging
// beneath the highlight and read as unfinished). Width tracks the tab cell,
// inset each side, so the widest label ("Progress") sits comfortably inside;
// the height spans the whole icon-and-label block, and a rounded-rect radius
// (not a full stadium) suits the taller cushion.
const PILL_H_INSET = spacing.sm; // breathing room each side of the cushion
const PILL_HEIGHT = 46;
const PILL_TOP = 2;

// Per-icon micro-response: one settle-scale beat when the tab gains focus.
function TabIcon({ focused, reduceMotion, children }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!focused || reduceMotion) return;
    scale.value = withSequence(
      withSpring(1.06, motion.springs.press),
      withSpring(1, motion.springs.release),
    );
  }, [focused, reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function VolyumeTabBar({ state, descriptors, navigation }) {
  // CP-10 stage 3 (theming batch 2): live theme, same append-after pattern
  // as batch 1. `styles` stays frozen; `live` carries the colour-bearing
  // keys only. `color` (the per-tab icon/label ink) already read the
  // frozen singleton directly at render time (class 3, CP-10 plan section
  // 1.4) -- now reads the live hook instead so it re-renders on a flip.
  const t = useTheme();
  const live = {
    bar: { backgroundColor: t.colors.surfaceElevated, borderTopColor: t.colors.borderSubtle },
    pill: { backgroundColor: t.colors.primaryBg },
    badgeDot: { backgroundColor: t.colors.primaryFill, borderColor: t.colors.surfaceElevated },
    label: { ...t.type.caption, fontFamily: t.type.label.fontFamily },
  };
  const insets = useSafeAreaInsets();
  const reduceMotion = useAppStore((s) => !!s.accessibility?.reduceMotion);
  // T2: unseen weekly coach review, mirrored into the store by HomeScreen and
  // cleared by CoachOutputScreen (see the header comment above).
  const hasUnseenCoachChange = useAppStore((s) => !!s.hasUnseenCoachChange);

  const [barWidth, setBarWidth] = useState(0);
  const tabWidth = state.routes.length > 0 ? barWidth / state.routes.length : 0;
  // The cushion is the tab cell minus a small inset each side, so it wraps the
  // icon and the label together rather than just the icon.
  const pillWidth = tabWidth > 0 ? Math.max(0, tabWidth - PILL_H_INSET * 2) : 0;

  const pillX = useSharedValue(0);
  useEffect(() => {
    if (!tabWidth) return;
    const target = state.index * tabWidth + PILL_H_INSET;
    pillX.value = reduceMotion ? target : withSpring(target, motion.springs.settle);
  }, [state.index, tabWidth, reduceMotion, pillX]);
  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pillX.value }] }));

  // Session screen owns the full height: no tab bar, no mini-bar (you are
  // on the screen the mini-bar would return you to). The check must follow
  // every hook above (stable hook order).
  const nested = getFocusedRouteNameFromRoute(state.routes[state.index]);
  if (nested === 'ActiveWorkout') return null;

  return (
    <View>
      <ActiveSessionMiniBar navigation={navigation} />
      <View
        style={[styles.bar, live.bar, { height: 60 + insets.bottom, paddingBottom: 4 + insets.bottom }]}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {barWidth > 0 ? (
          <Animated.View pointerEvents="none" style={[styles.pill, live.pill, { width: pillWidth }, pillStyle]} />
        ) : null}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const color = isFocused ? t.colors.primary : t.colors.textMuted;
          const label = options.title ?? route.name;
          // T2: CoachOutput lives in ProfileStack only (RootNavigator), so
          // the Coach tab is the one that carries the unseen-review badge.
          const showCoachBadge = route.name === 'ProfileTab' && hasUnseenCoachChange;
          const accessibilityLabel = options.tabBarAccessibilityLabel ?? label;

          const onPress = () => {
            // Emitted exactly like the stock bar so the navigator's
            // screenListeners (M1 haptic) and each stack's NAV-5
            // re-tap-to-root listener keep receiving tab presses.
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };
          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              style={styles.item}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="tab"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={showCoachBadge ? `${accessibilityLabel}, new coaching update` : accessibilityLabel}
            >
              <View style={styles.iconWrap}>
                <TabIcon focused={isFocused} reduceMotion={reduceMotion}>
                  {options.tabBarIcon
                    ? options.tabBarIcon({ focused: isFocused, color, size: 22 })
                    : null}
                </TabIcon>
                {showCoachBadge ? <View style={[styles.badgeDot, live.badgeDot]} pointerEvents="none" /> : null}
              </View>
              <Text style={[styles.label, live.label, { color }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    paddingTop: 4,
  },
  pill: {
    position: 'absolute',
    top: PILL_TOP, left: 0,
    height: PILL_HEIGHT,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryBg,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 2, paddingTop: 4 },
  iconWrap: { position: 'relative' },
  // T2: a calm amber dot, not an alarm-red one (the theme defines no such
  // treatment). It matches the coach-update colour; the hairline border cuts
  // it out from the icon glyph underneath it.
  badgeDot: {
    position: 'absolute',
    top: -spacing.xxs,
    right: -spacing.xxs,
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primaryFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceElevated,
  },
  label: { ...type.caption, fontFamily: type.label.fontFamily },
});
