/**
 * FeedbackSheet
 *
 * Minimal, non-blocking feedback collection. The sheet animates up
 * from the bottom, asks one question (sentiment chip), accepts an
 * optional line of text, and submits.
 *
 * Visual pattern mirrors PeekMenu, backdrop + slide-up sheet with
 * a handle pill. Auto-dismisses after 12 s of inactivity if the
 * user hasn't engaged so we never linger.
 *
 * Imperative usage from any screen:
 *
 *   const ref = useRef();
 *   <FeedbackSheet ref={ref} />
 *   ref.current.open({ trigger: 'contextual', triggerKey: 'first_workout' });
 *
 * Or app-globally via the singleton mount in App.js + the
 * `useFeedback().open(...)` hook (defined below).
 *
 * Honour the contract: NEVER auto-pop without an explicit
 * shouldPrompt() check first. This component will gladly show
 * itself every time .open() is called, suppression lives at
 * the caller via the feedback.js helpers.
 */

import {
  useImperativeHandle, useRef, useState, useEffect, forwardRef, createContext, useContext,
} from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable,
  Animated, Easing, Platform, Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as haptics from '../lib/haptics';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import { submitFeedback, markPromptShown } from '../lib/feedback';
import Button from './Button';
import Chip from './Chip';
import TextField from './TextField';

const SENTIMENTS = [
  { key: 'love',      icon: 'heart',                  label: 'Love it'   },
  { key: 'helpful',   icon: 'thumbs-up-outline',      label: 'Helpful'   },
  { key: 'confusing', icon: 'help-circle-outline',    label: 'Confusing' },
  { key: 'slow',      icon: 'speedometer-outline',    label: 'Slow'      },
  { key: 'buggy',     icon: 'bug-outline',            label: 'Buggy'     },
];

const FeedbackContext = createContext(null);

export function useFeedback() {
  return useContext(FeedbackContext);
}

/**
 * Mount this once at the App root. Renders the sheet at a global
 * z-level so any screen can open it via useFeedback().open(...).
 *
 * The provider also installs the shake-to-report handler when
 * expo-sensors is available. Triggering on a sustained shake (not
 * a single jolt) avoids accidental opens during heavy lifts.
 * Suppressed for 30 seconds after each open so the user doesn't
 * get prompted twice in a row.
 */
export function FeedbackProvider({ children }) {
  const ref = useRef(null);
  const api = {
    open: (opts = {}) => ref.current?.open(opts),
    close: () => ref.current?.close(),
  };

  useEffect(() => {
    // expo-sensors is a runtime-optional dep; lazy require so the
    // app keeps building if it ever gets removed. No-op on web /
    // platforms without an accelerometer.
    //
    // Explicit web bypass: expo-sensors on web has historically thrown
    // during Accelerometer.setUpdateInterval (no Web Sensor API on
    // most browsers). Codex caught this as a real web startup crash
    //, gate it here so the rest of the lazy chain doesn't even run.
    if (Platform.OS === 'web') return;
    let Accelerometer;
    try {
      // eslint-disable-next-line global-require, import/no-unresolved
      const sensors = require('expo-sensors');
      Accelerometer = sensors.Accelerometer;
    } catch (_) { return; }
    if (!Accelerometer?.addListener) return;
    // Sample at ~5 Hz, high enough to detect a shake, low enough
    // to be invisible to battery. Threshold tuned so a phone in a
    // gym bag bouncing about doesn't trigger.
    Accelerometer.setUpdateInterval(200);
    let lastOpen = 0;
    let shakeStreak = 0;
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      // Idle phone reads ~1.0 (gravity). A vigorous shake spikes to
      // >2.5. Require three consecutive samples above the threshold
      // (~0.6s of sustained shaking) so a single thump doesn't fire.
      if (magnitude > 2.5) {
        shakeStreak++;
        if (shakeStreak >= 3 && Date.now() - lastOpen > 30_000) {
          lastOpen = Date.now();
          shakeStreak = 0;
          try {
            ref.current?.open({ trigger: 'shake' });
          } catch (_) {}
        }
      } else if (magnitude < 1.5) {
        shakeStreak = 0;
      }
    });
    return () => { try { subscription?.remove?.(); } catch (_) {} };
  }, []);

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <FeedbackSheet ref={ref} />
    </FeedbackContext.Provider>
  );
}

const FeedbackSheet = forwardRef(function FeedbackSheet(_, ref) {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const userId = useAppStore(s => s.user?.id);

  const [config, setConfig] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 500)).current;
  // Bottom-anchored Modal: overlays the tab band, so it must absorb the
  // system inset itself (edge-to-edge sweep, 2026-07-03).
  const insets = useSafeAreaInsets();
  const backdrop = useRef(new Animated.Value(0)).current;
  const autoDismissRef = useRef(null);

  useImperativeHandle(ref, () => ({
    open: (cfg = {}) => {
      setConfig({ trigger: 'settings', triggerKey: null, ...cfg });
      setSentiment(null);
      setMessage('');
      setDone(false);
      setSubmitting(false);
      // Record that we showed the prompt so the suppression window
      // starts even if the user dismisses without submitting.
      if (cfg.triggerKey) markPromptShown(cfg.triggerKey).catch(() => {});
      haptics.selection();
    },
    close: () => animateOut(),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  useEffect(() => {
    if (!config) return;
    translateY.setValue(reduceMotion ? 0 : 500);
    backdrop.setValue(0);
    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 1, duration: reduceMotion ? 0 : 220,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration: reduceMotion ? 0 : 280,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();
    // Auto-dismiss if untouched for 12s. Resets every time the user
    // interacts (sentiment select or text change).
    scheduleAutoDismiss();
    return () => clearAutoDismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  function scheduleAutoDismiss() {
    clearAutoDismiss();
    autoDismissRef.current = setTimeout(() => {
      if (!sentiment && !message) animateOut();
    }, 12_000);
  }

  function clearAutoDismiss() {
    if (autoDismissRef.current) {
      clearTimeout(autoDismissRef.current);
      autoDismissRef.current = null;
    }
  }

  function animateOut(then) {
    clearAutoDismiss();
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 0, duration: reduceMotion ? 0 : 180,
        easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: reduceMotion ? 0 : 500, duration: reduceMotion ? 0 : 220,
        easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }),
    ]).start(() => {
      setConfig(null);
      if (then) then();
    });
  }

  async function handleSubmit() {
    if (!sentiment) return;
    setSubmitting(true);
    clearAutoDismiss();
    try {
      await submitFeedback({
        trigger: config?.trigger || 'settings',
        triggerKey: config?.triggerKey || null,
        sentiment,
        message: message.trim() || null,
        userId,
      });
      // Single success note (planReady's signature, reused so the
      // vocabulary's reduce-motion gate covers it).
      haptics.planReady();
      setDone(true);
      // Stay on the success state briefly, then dismiss.
      setTimeout(() => animateOut(), 1400);
    } catch (_) {
      // submitFeedback never throws, but be defensive.
      setSubmitting(false);
    }
  }

  if (!config) return null;

  return (
    <Modal
      transparent
      visible
      onRequestClose={() => animateOut()}
      animationType="none"
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable accessibilityRole="button" style={StyleSheet.absoluteFillObject} onPress={() => animateOut()} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(spacing.xxl + spacing.md, insets.bottom + spacing.lg) },
          { transform: [{ translateY }] },
        ]}
        accessibilityViewIsModal
      >
        <View style={styles.handle} />

        {done ? (
          <View style={styles.doneBlock}>
            <Ionicons name="checkmark-circle" size={36} color={colors.success} />
            <Text style={styles.doneTitle}>Thanks</Text>
            <Text style={styles.doneSub}>Your feedback's on its way.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.title}>
              {config.trigger === 'shake' ? "What's wrong?" : 'How was that?'}
            </Text>
            <Text style={styles.sub}>
              {config.trigger === 'shake'
                ? "Tell us what just happened. We attach the rest automatically."
                : "Pick the closest match. One tap is plenty."}
            </Text>

            <View style={styles.chipRow}>
              {SENTIMENTS.map(s => (
                <Chip
                  key={s.key}
                  label={s.label}
                  icon={s.icon}
                  selected={sentiment === s.key}
                  onPress={() => {
                    setSentiment(s.key);
                    scheduleAutoDismiss();
                    haptics.selection();
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={`${s.label} sentiment`}
                  style={styles.sentimentChip}
                  labelStyle={styles.sentimentChipText}
                  selectedLabelStyle={styles.sentimentChipTextSelected}
                />
              ))}
            </View>

            <TouchableWithoutFeedback accessibilityRole="button" onPress={() => scheduleAutoDismiss()}>
              <View>
                <TextField
                  placeholder="Anything specific? (optional)"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  value={message}
                  onChangeText={(t) => { setMessage(t); scheduleAutoDismiss(); }}
                  accessibilityLabel="Optional details"
                  surface="surface2"
                  containerStyle={styles.inputContainer}
                  fieldStyle={styles.inputField}
                  inputStyle={styles.inputText}
                />
              </View>
            </TouchableWithoutFeedback>

            <View style={styles.actions}>
              <Button
                title="Cancel"
                onPress={() => animateOut()}
                variant="secondary"
                fullWidth={false}
                style={styles.cancelBtn}
                textStyle={styles.cancelText}
                accessibilityLabel="Cancel feedback"
              />
              <Button
                title="Send"
                onPress={handleSubmit}
                disabled={!sentiment || submitting}
                loading={submitting}
                fullWidth={false}
                style={styles.submitBtn}
                textStyle={styles.submitText}
                accessibilityLabel="Send feedback"
              />
            </View>

            <Text style={styles.privacy}>
              Sent with build info, your last few actions, and a recent error if any.
              Body measurements and names are stripped before sending.
            </Text>
          </>
        )}
      </Animated.View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
    opacity: 0.55,
  },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    alignSelf: 'center',
    width: 36, height: 4,
    borderRadius: radius.hair,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  sub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sentimentChip: {
    paddingVertical: spacing.sm,
  },
  sentimentChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  sentimentChipTextSelected: {
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },

  inputContainer: {
    gap: 0,
    marginBottom: spacing.md,
  },
  inputField: {
    minHeight: 80,
    borderWidth: 1,
  },
  inputText: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.sm,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cancelBtn: {
    flex: 1,
  },
  cancelText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  submitBtn: {
    flex: 1.5,
  },
  submitText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.onPrimary,
  },

  privacy: {
    ...type.captionTight,
    color: colors.textMuted,
    textAlign: 'center',
  },

  doneBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  doneTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  doneSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});

export default FeedbackSheet;
