/**
 * VolyumeTabBar — the E15 tab-bar elevation (greenlit 2026-07-02; design in
 * audit/e15-signature-elements.md §2), designed together with
 * ActiveSessionMiniBar as the shared bottom band.
 *
 * Anchored, not floating (blur is banned by the Android-first material rule;
 * a floating dock steals the reclaimed edge-to-edge list height). The
 * elevation is earned through motion and material:
 *   - a sliding amber pill behind the active icon, a UI-thread spring
 *     (motion.springs.settle) keyed to state.index;
 *   - an icon settle-scale (1 -> 1.06 -> 1, springs.press/release) on focus,
 *     pairing with the M1 selection haptic that still fires through the
 *     navigator's screenListeners (tab presses are emitted exactly like the
 *     stock bar, so the NAV-5 re-tap-to-root listeners keep working too);
 *   - under Reduce Motion the pill jumps instantly and icons do not scale.
 *
 * While ActiveWorkout is focused the whole band returns null — logging gets
 * the full screen, and the mini-bar is absent because you are ON the session
 * screen. On any other tab mid-session the mini-bar docks directly above
 * this bar. Hide-on-scroll deliberately not implemented (jittery on
 * mid-range Android, unpredictable mid-set); no centre action button (the
 * log-food candidate is Pro-gated, and a paywalled centre button violates
 * the free/pro exposure rule).
 *
 * T2 (world-class-audit-2026-07-03/05-cohesion.md #4): the You tab (where
 * CoachOutput is registered, see RootNavigator's ProfileStack) carries a
 * small amber dot when there is an unseen weekly coach review. Sourced from
 * the store's hasUnseenCoachChange flag, which HomeScreen mirrors from its
 * own coach-banner condition and CoachOutputScreen clears the moment the
 * review is actually viewed (both via the SAME per-week AsyncStorage
 * dismissal flag the Home banner already used, no second scheme). Amber, not
 * red: the theme defines no alarm-dot treatment, and amber matches the
 * sparkles icon on the banner itself, so a coaching update reads as calm.
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
import { colors, fontSize, fontWeight, radius, spacing, motion } from '../styles/theme';

const PILL_WIDTH = 56;
// Sits behind the ACTIVE ICON only. Height + top are tuned so the pill clears
// the label below it (the icon band is ~8-30px from the bar top; the label
// starts ~32px down): a taller/lower pill bled over the top of the label text
// ("covered half the text"), so it ends flush with the icon, above the label.
const PILL_HEIGHT = 26;
const PILL_TOP = 4;

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
  const insets = useSafeAreaInsets();
  const reduceMotion = useAppStore((s) => !!s.accessibility?.reduceMotion);
  // T2: unseen weekly coach review, mirrored into the store by HomeScreen and
  // cleared by CoachOutputScreen (see the header comment above).
  const hasUnseenCoachChange = useAppStore((s) => !!s.hasUnseenCoachChange);

  const [barWidth, setBarWidth] = useState(0);
  const tabWidth = state.routes.length > 0 ? barWidth / state.routes.length : 0;

  const pillX = useSharedValue(0);
  useEffect(() => {
    if (!tabWidth) return;
    const target = state.index * tabWidth + (tabWidth - PILL_WIDTH) / 2;
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
        style={[styles.bar, { height: 60 + insets.bottom, paddingBottom: 4 + insets.bottom }]}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {barWidth > 0 ? (
          <Animated.View pointerEvents="none" style={[styles.pill, pillStyle]} />
        ) : null}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const color = isFocused ? colors.primary : colors.textMuted;
          const label = options.title ?? route.name;
          // T2: CoachOutput lives in ProfileStack only (RootNavigator), so
          // the You tab is the one that carries the unseen-review badge.
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
                {showCoachBadge ? <View style={styles.badgeDot} pointerEvents="none" /> : null}
              </View>
              <Text style={[styles.label, { color }]} numberOfLines={1}>{label}</Text>
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
    width: PILL_WIDTH, height: PILL_HEIGHT,
    borderRadius: radius.full,
    backgroundColor: colors.primaryBg,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 2, paddingTop: 4 },
  iconWrap: { position: 'relative' },
  // T2: a calm amber dot, not an alarm-red one (the theme defines no such
  // treatment). It matches the sparkles icon colour on the coach banner it
  // stands in for; the hairline border cuts it out from the icon glyph
  // underneath it.
  badgeDot: {
    position: 'absolute',
    top: -spacing.xxs,
    right: -spacing.xxs,
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceElevated,
  },
  label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});
