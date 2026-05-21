// Toast / snackbar system
//
// Lightweight ephemeral notification — replaces 30-40 Alert.alert
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

import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import useAppStore from '../store/useAppStore';

const ToastContext = createContext({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const DEFAULTS = {
  success: { icon: 'checkmark-circle', tint: colors.success, duration: 2500 },
  error:   { icon: 'alert-circle',     tint: colors.error,   duration: 4000 },
  warning: { icon: 'warning',          tint: colors.warning, duration: 3500 },
  info:    { icon: 'information-circle', tint: colors.primary, duration: 2500 },
};

export function ToastProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 40)).current;
  const dismissTimer = useRef(null);

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
    };
    setQueue(q => [...q, next]);
  }, []);

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
        duration: reduceMotion ? 0 : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: reduceMotion ? 0 : 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => dismiss(), current.duration);
    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, reduceMotion]);

  function dismiss() {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: reduceMotion ? 0 : 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: reduceMotion ? 0 : 20,
        duration: reduceMotion ? 0 : 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrent(null);
    });
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {current && (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.host, { opacity, transform: [{ translateY }] }]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={dismiss}
            style={[styles.toast, { borderLeftColor: current.tint }]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <Ionicons name={current.icon} size={18} color={current.tint} />
            <Text style={styles.text} numberOfLines={3}>{current.message}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

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
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minWidth: 220,
    maxWidth: 480,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 10,
  },
  text: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: 19,
  },
});
