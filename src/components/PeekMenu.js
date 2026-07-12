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
 *
 * D36b (BottomSheet migration, 2026-07-10): renders through the shared
 * <BottomSheet> chrome (backdrop, handle, insets, reduce-motion, gesture
 * dismiss) instead of a hand-rolled Modal + Animated slide. The exported
 * imperative ref API is UNCHANGED (open/close) so both call sites
 * (PlansScreen, LiftProgressScreen) needed zero changes: this component is
 * now a thin adapter that turns open()/close() into internal `visible` state
 * fed to <BottomSheet visible onClose>. `config` (title/items) is only ever
 * SET by open() and deliberately never cleared on close, for the same
 * "don't blank the panel mid-close-animation" reason documented in
 * FeedbackSheet.js's header.
 *
 * Selecting an item still defers running its onPress until the sheet has
 * finished closing (the item may itself open another sheet/dialog, e.g. a
 * delete confirmation, and firing it while this menu is still visually
 * sliding away looked wrong under the old hand-rolled animation too). The
 * shared BottomSheet doesn't expose an "animation finished" callback, so
 * this uses the same duration BottomSheet uses for its own settle spring
 * when motion is off, and motion.state otherwise (this component's own
 * historical close duration) — reduce-motion still collapses it to 0.
 */

import {
  useImperativeHandle, useRef, useState, useCallback, forwardRef,
} from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, motion, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import useAppStore from '../store/useAppStore';
import * as haptics from '../lib/haptics';
import BottomSheet from './BottomSheet';

const PeekMenu = forwardRef(function PeekMenu(_, ref) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState(null);
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const closeTimerRef = useRef(null);

  const closeSheet = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setVisible(false);
  }, []);

  useImperativeHandle(ref, () => ({
    open: (cfg) => {
      if (!cfg?.items?.length) return;
      // Medium "commit" beat (the same impact this shipped with, now routed
      // through the vocabulary so reduce-motion silences it).
      haptics.commit();
      setConfig(cfg);
      setVisible(true);
    },
    close: () => closeSheet(),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [closeSheet]);

  function handleItem(item) {
    closeSheet();
    // Preserve the old animateOut(then)-style deferral: run the action after
    // the close animation would have finished, not the instant the tap lands.
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      try { item.onPress?.(); } catch (_) {}
    }, reduceMotion ? 0 : motion.state);
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={closeSheet}
      accessibilityLabel={config?.title || 'Menu'}
    >
      {config ? (
        <>
          {config.title ? (
            <Text style={[styles.title, live.title]} numberOfLines={1}>{config.title}</Text>
          ) : null}
          {config.subtitle ? (
            <Text style={[styles.subtitle, live.subtitle]} numberOfLines={2}>{config.subtitle}</Text>
          ) : null}
          <View style={styles.itemList}>
            {config.items.map((item, i) => (
              <Pressable
                key={i}
                onPress={() => handleItem(item)}
                style={({ pressed }) => [
                  styles.item,
                  pressed && { backgroundColor: t.colors.surface2 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <Ionicons
                  name={item.icon || 'ellipse-outline'}
                  size={18}
                  color={item.destructive ? t.colors.error : t.colors.primary}
                />
                <Text
                  style={[
                    styles.itemText,
                    live.itemText,
                    item.destructive && { color: t.colors.error },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => closeSheet()}
            style={[styles.cancel, live.cancel]}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={[styles.cancelText, live.cancelText]}>Cancel</Text>
          </Pressable>
        </>
      ) : null}
    </BottomSheet>
  );
});

export default PeekMenu;

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    ...type.caption,
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

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BottomSheet.js's buildLiveStyles. itemList/item have no colour tokens.
// D36b (2026-07-10): backdrop/sheet/handle entries removed, that chrome now
// lives in BottomSheet.js's own buildLiveStyles.
function buildLiveStyles(t) {
  return {
    title: { color: t.colors.textPrimary },
    subtitle: { ...t.type.caption, color: t.colors.textMuted },
    itemText: { color: t.colors.textPrimary },
    cancel: { backgroundColor: t.colors.surface2 },
    cancelText: { color: t.colors.textSecondary },
  };
}
