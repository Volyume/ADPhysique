/**
 * PeekMenu
 *
 * A long-press / right-click style context menu that slides up from
 * the bottom with a list of actions. Use it as the consistent way to
 * surface "Edit / Delete / Duplicate / Share" without forcing a tap on
 * a small ellipsis button.
 *
 * Pattern: any card the user might want to act on (a plan, an
 * exercise row, a PR, a workout history entry) wraps the onLongPress
 * handler with a call to imperative open() (via a ref) or just
 * mounts <PeekMenu> with `visible` and `items`.
 *
 * Imperative usage from a PressableCard:
 *
 *   const menuRef = useRef();
 *   <PressableCard onLongPress={() => menuRef.current.open({
 *     title: 'Push Day A',
 *     items: [
 *       { icon: 'create-outline', label: 'Edit',  onPress: () => goEdit() },
 *       { icon: 'copy-outline',   label: 'Duplicate', onPress: () => dup() },
 *       { icon: 'trash-outline',  label: 'Delete', destructive: true, onPress: () => del() },
 *     ],
 *   })}>
 *     ...
 *   </PressableCard>
 *   <PeekMenu ref={menuRef} />
 *
 * The menu honours reduce-motion: snap-in instead of slide-up.
 */

import React, {
  useImperativeHandle, useRef, useState, useEffect, forwardRef,
} from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, Animated, Easing, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import * as Haptics from 'expo-haptics';

const PeekMenu = forwardRef(function PeekMenu(_, ref) {
  const [config, setConfig] = useState(null);
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 400)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useImperativeHandle(ref, () => ({
    open: (cfg) => {
      if (!cfg?.items?.length) return;
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); } catch (_) {}
      setConfig(cfg);
    },
    close: () => animateOut(),
  }), []);

  function animateOut(then) {
    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 0, duration: reduceMotion ? 0 : 180,
        easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: reduceMotion ? 0 : 400, duration: reduceMotion ? 0 : 200,
        easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }),
    ]).start(() => {
      setConfig(null);
      if (then) then();
    });
  }

  useEffect(() => {
    if (!config) return;
    translateY.setValue(reduceMotion ? 0 : 400);
    backdrop.setValue(0);
    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 1, duration: reduceMotion ? 0 : 200,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration: reduceMotion ? 0 : 280,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();
  }, [config, reduceMotion]);

  if (!config) return null;

  function handleItem(item) {
    animateOut(() => {
      try { item.onPress?.(); } catch (_) {}
    });
  }

  return (
    <Modal
      transparent
      visible
      onRequestClose={() => animateOut()}
      animationType="none"
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => animateOut()} />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }] }]}
        accessibilityViewIsModal
      >
        <View style={styles.handle} />
        {config.title ? (
          <Text style={styles.title} numberOfLines={1}>{config.title}</Text>
        ) : null}
        {config.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>{config.subtitle}</Text>
        ) : null}
        <View style={styles.itemList}>
          {config.items.map((item, i) => (
            <Pressable
              key={i}
              onPress={() => handleItem(item)}
              style={({ pressed }) => [
                styles.item,
                pressed && { backgroundColor: colors.surface2 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Ionicons
                name={item.icon || 'ellipse-outline'}
                size={18}
                color={item.destructive ? colors.error : colors.primary}
              />
              <Text
                style={[
                  styles.itemText,
                  item.destructive && { color: colors.error },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => animateOut()}
          style={styles.cancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
});

export default PeekMenu;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
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
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  itemList: { marginTop: spacing.md, gap: spacing.xxs },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  itemText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  cancel: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
  },
  cancelText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
});
