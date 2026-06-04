/**
 * WhatsNewSheet
 *
 * One-time bottom sheet that surfaces a small batch of features after
 * the user updates to a release that introduces something user-actionable.
 *
 * Design rules (the "elite, non-annoying" bit):
 *   - Shows ONCE per release key. Dismissal is permanent.
 *   - Doesn't appear during sign-in / setup, only on the main app.
 *   - Slides up from the bottom with a backdrop. Tap outside dismisses
 *     without losing the "seen" mark (we err on the side of "user has
 *     decided" rather than re-nagging).
 *   - Each item is small (icon + headline + one line), no walls of
 *     text, no third-person marketing voice.
 *   - Optional secondary action per item routes to the feature. Caller
 *     supplies the handler so the sheet stays presentation-only.
 *
 * Mount once at the app root. The component checks AsyncStorage on
 * mount; renders nothing if already seen.
 */

import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha } from '../styles/theme';
import BottomSheet from './BottomSheet';
import useAppStore from '../store/useAppStore';

/**
 * Bump the storage key when you have a new batch of features to announce.
 * The previous mark is never read again, so the user sees the new batch
 * exactly once.
 */
const SEEN_KEY = '@volyume_seen_whats_new_2026_05_v2';

export default function WhatsNewSheet({ items = [], onOpenSettings }) {
  const [visible, setVisible] = useState(false);
  const tier = useAppStore(s => s.tier);
  const user = useAppStore(s => s.user);

  useEffect(() => {
    // Gate the show on having a user + tier so we never appear over
    // Welcome / Login / first-run.
    if (!user?.id || !tier) return;
    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(SEEN_KEY);
        if (!seen && !cancelled) {
          // Give the screen a beat to settle so the sheet doesn't
          // collide with the user's first navigation gesture.
          setTimeout(() => { if (!cancelled) setVisible(true); }, 1200);
        }
      } catch (_) { /* if we can't read, don't show */ }
    })();
    return () => { cancelled = true; };
  }, [user?.id, tier]);

  async function dismiss() {
    try { await AsyncStorage.setItem(SEEN_KEY, '1'); } catch (_) {}
    setVisible(false);
  }

  if (!items?.length) return null;

  return (
    <BottomSheet visible={visible} onClose={dismiss} accessibilityLabel="New in Volyume">
      <Text style={styles.title}>New in Volyume</Text>
      <Text style={styles.subtitle}>A few additions you might find useful.</Text>

      <View style={styles.itemList}>
        {items.map((item, idx) => (
          <View key={idx} style={styles.item}>
            <View style={[styles.itemIcon, { backgroundColor: withAlpha(item.tint || colors.primary, 0.13) }]}>
              <Ionicons name={item.icon} size={20} color={item.tint || colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemHeadline}>{item.headline}</Text>
              <Text style={styles.itemBody}>{item.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Text style={styles.secondaryBtnText}>Got it</Text>
        </TouchableOpacity>
        {onOpenSettings && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => { dismiss(); onOpenSettings(); }}
            accessibilityRole="button"
            accessibilityLabel="Open Settings"
          >
            <Text style={styles.primaryBtnText}>Open Settings</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.background} />
          </TouchableOpacity>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xxs,
    marginBottom: spacing.lg,
  },
  itemList: { gap: spacing.md },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  itemIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  itemHeadline: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  itemBody: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  secondaryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryBtnText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  primaryBtnText: {
    fontSize: fontSize.sm,
    color: colors.background,
    fontWeight: fontWeight.bold,
  },
});
