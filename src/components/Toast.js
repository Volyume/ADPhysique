// Toast / snackbar system
//
// Lightweight ephemeral notification, replaces 30-40 Alert.alert
// callsites that were showing routine success / info messages and
// forcing a modal dismissal. Alert is now reserved for destructive
// confirmations only (Delete account, Switch to Free, Reset history).
//
// Usage:
//   import { useToast } from '../components/Toast';
//   const toast = useToast();
//   toast.show('Set logged');
//   toast.show('Volume targets saved', { variant: 'success' });
//   toast.show('Could not save', { variant: 'error', duration: 5000 });
//
// Mount the provider once at the app root (App.js):
//   <ToastProvider>...</ToastProvider>
//
// Design notes:
//   - Slides up from the bottom with a fade. respects reduceMotion.
//   - Queue is FIFO; only one toast visible at a time so messages
//     don't pile up. New show() while one is visible pushes onto
//     the queue and shows after current dismisses.
//   - Tap-to-dismiss for impatient users.
//   - Auto-dismiss default 2.5s; errors get 4s (more important to
//     read).

import { createContext, useContext, useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, AccessibilityInfo } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fontWeight, spacing, radius, motion, letterSpacing } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import useTheme from '../hooks/useTheme';

const ToastContext = createContext({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// CP-10 stage 1: DEFAULTS was a module-scope const baking colors.success/
// error/warning/primary at import time (class 2, CP-10 plan section 1.4,
// explicitly called out as the Toast tint risk in the risk register #5).
// Built per-render from the live theme now, inside ToastProvider, so a fresh
// toast picks up the current tint even if the theme changed since boot.
function buildDefaults(c) {
  return {
    success: { icon: 'checkmark-circle', tint: c.success, duration: 2500 },
    error:   { icon: 'alert-circle',     tint: c.error,   duration: 4000 },
    warning: { icon: 'warning',          tint: c.warning, duration: 3500 },
    info:    { icon: 'information-circle', tint: c.primary, duration: 2500 },
    // Undo variant for destructive actions. Longer duration so the user
    // has time to read + react. Neutral icon, white text, looks distinct
    // from success/error to signal "you can take this back".
    undo:    { icon: 'arrow-undo',      tint: c.warning, duration: 8000 },
  };
}

export function ToastProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const t = useTheme();
  // Memoized on t.colors (itself stable across unrelated re-renders — see
  // useTheme.js) so `show`'s useCallback dep below stays stable too, and F7's
  // "one show() for the app's life" optimisation only breaks (deliberately)
  // on an actual theme change, not on every queue/current/reduceMotion tick.
  const DEFAULTS = useMemo(() => buildDefaults(t.colors), [t.colors]);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 40)).current;
  const dismissTimer = useRef(null);
  // Belt-and-braces removal timer: guarantees a dismissed toast leaves the
  // screen even if the out-animation's completion callback never fires (see
  // dismiss()).
  const clearFallback = useRef(null);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo?.isScreenReaderEnabled?.()
      ?.then?.((enabled) => { if (mounted) setScreenReaderEnabled(!!enabled); })
      ?.catch?.(() => {});
    const subscription = AccessibilityInfo?.addEventListener?.('screenReaderChanged', (enabled) => {
      setScreenReaderEnabled(!!enabled);
    });
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  const show = useCallback((message, options = {}) => {
    if (!message) return;
    const variant = options.variant || 'success';
    const cfg = DEFAULTS[variant] || DEFAULTS.success;
    const next = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      message: String(message),
      variant,
      icon: options.icon || cfg.icon,
      tint: options.tint || cfg.tint,
      duration: options.duration || cfg.duration,
      // Optional action button. { label, onPress }, e.g. { label: 'Undo',
      // onPress: () => restoreWorkout(...) }. Tapping the action runs the
      // callback AND dismisses the toast. Use 'undo' variant for the
      // destructive-action pattern (8s window).
      action: options.action || null,
      // Called when the toast dismisses WITHOUT the action being tapped.
      // For undo-style flows the caller registers the destructive commit
      // here (e.g. actually delete the row from SQLite + cloud).
      onTimeout: options.onTimeout || null,
    };
    setQueue(q => [...q, next]);
    // DEFAULTS only changes reference when the theme actually flips (see the
    // useMemo above); F7's "show is stable for the app's life" is now
    // "show is stable until the user changes their theme", which is the
    // intended, rare exception (CP-10).
  }, [DEFAULTS]);

  // Pump the queue: when current is null and queue has items, dequeue one.
  useEffect(() => {
    if (current || queue.length === 0) return;
    const [head, ...rest] = queue;
    setQueue(rest);
    setCurrent(head);
  }, [current, queue]);

  // Animate in + schedule dismiss whenever current changes.
  useEffect(() => {
    if (!current) return;
    // Reset starting state then animate in
    opacity.setValue(0);
    translateY.setValue(reduceMotion ? 0 : 40);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: reduceMotion ? 0 : motion.exit,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: reduceMotion ? 0 : motion.sheet,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    const holdUndoForScreenReader = screenReaderEnabled && current.variant === 'undo' && current.action;
    if (!holdUndoForScreenReader) {
      dismissTimer.current = setTimeout(() => dismiss(), current.duration);
    }
    // A fresh toast supersedes any pending fallback from the previous one.
    if (clearFallback.current) { clearTimeout(clearFallback.current); clearFallback.current = null; }
    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, reduceMotion, screenReaderEnabled]);

  function dismiss(opts = {}) {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    // Fire onTimeout only if this dismiss is automatic (timer ran out
    // or user tapped the toast body). Action-tap dismissals skip it,
    // since the action already replaced the timeout behaviour.
    if (current?.onTimeout && !opts.skipTimeout) {
      try { current.onTimeout(); } catch (_) {}
    }
    // Clear by id so a late fallback can never wipe a newer toast.
    const dismissingId = current?.id;
    const finish = () => setCurrent((c) => (c && c.id === dismissingId ? null : c));
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: reduceMotion ? 0 : motion.state,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: reduceMotion ? 0 : 20,
        duration: reduceMotion ? 0 : motion.state,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(finish);
    // A native-driven animation whose completion callback never fires (e.g.
    // interrupted by a tab navigation) used to leave a dismissed toast pinned
    // on screen until tapped (founder QA 2026-06-16). Guarantee removal just
    // after the animation's nominal duration; finish() is id-guarded and
    // idempotent, so running it twice is harmless.
    if (clearFallback.current) clearTimeout(clearFallback.current);
    clearFallback.current = setTimeout(finish, reduceMotion ? 0 : 240);
  }

  // F7 (audit UI): a fresh `{ show }` object every provider render re-rendered
  // EVERY useToast consumer on each toast show/dismiss/animation tick. `show`
  // is stable (useCallback []), so this value never changes for the app's life.
  const contextValue = useMemo(() => ({ show }), [show]);
  const dismissLabel = current?.variant === 'undo'
    ? `Dismiss undo message and keep change: ${current.message}`
    : `Dismiss notification: ${current?.message ?? ''}`;
  const dismissHint = current?.variant === 'undo'
    ? 'Closes this notification and keeps the pending change.'
    : 'Closes this notification.';

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {current && (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.host, { opacity, transform: [{ translateY }] }]}
        >
          <View
            style={[
              styles.toast,
              {
                backgroundColor: t.colors.surface2,
                borderColor: t.colors.border,
                ...t.shadow.lg,
              },
              { borderLeftColor: current.tint },
            ]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <TouchableOpacity accessibilityRole="button"
              activeOpacity={0.85}
              onPress={dismiss}
              accessibilityLabel={dismissLabel}
              accessibilityHint={dismissHint}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}
            >
              <Ionicons name={current.icon} size={18} color={current.tint} />
              <Text
                style={[styles.text, { ...t.type.bodySm, color: t.colors.textPrimary, fontWeight: fontWeight.medium }]}
                numberOfLines={3}
              >
                {current.message}
              </Text>
            </TouchableOpacity>
            {current.action && (
              <TouchableOpacity
                onPress={() => {
                  try { current.action.onPress?.(); } catch (_) {}
                  // Action-tap dismisses without firing onTimeout, the
                  // action replaced the destructive commit.
                  dismiss({ skipTimeout: true });
                }}
                style={styles.actionBtn}
                accessibilityRole="button"
                accessibilityLabel={current.action.label}
                accessibilityHint={current.variant === 'undo'
                  ? 'Restores the change and closes this notification.'
                  : 'Runs this action and closes this notification.'}
              >
                <Text style={[styles.actionText, { fontSize: t.fontSize.sm, color: current.tint }]}>
                  {current.action.label}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

// Layout-only (theme-invariant): backgroundColor / borderColor / the shadow
// / type role + text colour / fontSize now come from the live theme
// per-render above (CP-10 stage 1) so Toast follows a theme flip with no
// restart.
const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 80, // above tab bar
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minWidth: 220,
    maxWidth: 480,
  },
  text: {
    flex: 1,
  },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginLeft: spacing.xs,
  },
  actionText: {
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.overline,
    textTransform: 'uppercase',
  },
});
