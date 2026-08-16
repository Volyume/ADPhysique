/**
 * WorkoutBottomBar (logger redesign phase 2, founder-accepted state machine)
 *
 * ONE primary CTA slot, one obvious action per state:
 *
 *   STATE 1 - target not complete: the logging action is the primary
 *   ("Log set" / "Log warm-up" / "Log other side" / "Start cluster"),
 *   testID volyume-btn-complete-set. No advance control is visible.
 *
 *   STATE 2 - target complete (the `advance` prop is non-null): the SAME
 *   primary slot becomes "Next exercise" / "Finish workout"
 *   (volyume-btn-next-exercise / volyume-btn-finish-primary). While the
 *   1.8s auto-advance countdown runs (`countdownActive`), the button
 *   carries a thin progress track as its countdown visual - there is NO
 *   separate "Next exercise in a moment / Stay here" row any more
 *   (founder ruling, Option B). Tapping the button advances immediately:
 *   the timer is a ceiling, never a mandatory delay. An extra set stays
 *   reachable as the explicit SECONDARY action ("Log another set",
 *   volyume-btn-extra-set), which arms extraSetArmed upstream and returns
 *   the bar to state 1 - it never competes as a second primary.
 *
 * The countdown track is decorative (hidden from assistive tech); the
 * button's accessibilityLabel stays the plain action label throughout
 * (R4/D64 same-string rule), and the arm itself is announced once by the
 * orchestrator. Under reduce-motion the track shows statically instead of
 * animating.
 *
 * Inset contract (BEHAVIOURAL-CONTRACT.md section 9): bottom padding is
 * Math.max(spacing.md, safeBottom + spacing.sm), where safeBottom floors the
 * Android inset at 48 so the bar never sits under the navigation buttons.
 */
import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import Button from '../Button';
import { spacing, radius } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

export default function WorkoutBottomBar({
  primaryLabel,
  onPrimary,
  saving = false,
  // null, or { label, onPress, testID } - when present it IS the primary.
  advance = null,
  safeBottom = 0,
  // D87: leading Ionicons name on the logging primary ('trophy' while the
  // entered set would break a record), icon only; accessibilityLabel stays
  // primaryLabel per the R4/D64 same-string rule.
  primaryIcon = null,
  // True while the 1.8s auto-advance timer is armed for the advance action.
  countdownActive = false,
  countdownMs = 1800,
  // Secondary explicit extra-set action, only meaningful alongside advance.
  onExtraSet = null,
  reduceMotion = false,
}) {
  const t = useTheme();
  const countdownAnim = useRef(new Animated.Value(0)).current;

  // The fill runs 0 -> 1 over the same 1800ms the auto-advance timer runs,
  // so the visual and the timer describe one countdown. Reduce-motion shows
  // the static full track instead of a moving fill.
  useEffect(() => {
    countdownAnim.stopAnimation();
    if (countdownActive && !reduceMotion) {
      countdownAnim.setValue(0);
      Animated.timing(countdownAnim, {
        toValue: 1,
        duration: countdownMs,
        useNativeDriver: false,
      }).start();
    } else {
      countdownAnim.setValue(countdownActive ? 1 : 0);
    }
  }, [countdownActive, countdownMs, reduceMotion, countdownAnim]);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: t.colors.background,
          borderTopColor: t.colors.borderSubtle,
          paddingBottom: Math.max(spacing.md, safeBottom + spacing.sm),
        },
      ]}
    >
      {advance ? (
        <>
          {onExtraSet ? (
            <View style={styles.extraSlot}>
              <Button
                title="Log another set"
                onPress={onExtraSet}
                variant="secondary"
                size="lg"
                singleLine
                testID="volyume-btn-extra-set"
                accessibilityLabel="Log another set"
              />
            </View>
          ) : null}
          <View style={styles.primarySlot}>
            <Button
              title={advance.label}
              onPress={advance.onPress}
              variant="primary"
              size="lg"
              singleLine
              testID={advance.testID}
              accessibilityLabel={advance.label}
            />
            {countdownActive ? (
              <View
                style={[styles.countdownTrack, { backgroundColor: t.colors.borderSubtle }]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Animated.View
                  style={[
                    styles.countdownFill,
                    {
                      backgroundColor: t.colors.primary,
                      width: countdownAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            ) : null}
          </View>
        </>
      ) : (
        <View style={styles.primarySlot}>
          <Button
            title={primaryLabel}
            icon={primaryIcon ?? undefined}
            onPress={onPrimary}
            variant="primary"
            size="lg"
            singleLine
            loading={saving}
            testID="volyume-btn-complete-set"
            accessibilityLabel={primaryLabel}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  // The single primary keeps the larger share when the secondary extra-set
  // action appears, so the main action never shrinks into a mis-tap.
  primarySlot: { flex: 3 },
  extraSlot: { flex: 2 },
  countdownTrack: {
    marginTop: spacing.xxs,
    height: 3,
    borderRadius: radius.hair,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  countdownFill: { height: 3, borderRadius: radius.hair },
});
