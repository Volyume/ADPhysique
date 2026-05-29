import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, Pressable, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import { PRO_BETA_ACTIVE } from '../lib/proGate';

/**
 * ProGate wraps any content that requires a Pro tier.
 * Free users see the content with a lock overlay, tapping it opens a
 * one-tap upgrade sheet. During beta, upgrading is instant (no payment).
 *
 * Usage:
 *   <ProGate feature="Weekly coaching">
 *     <WeeklyCheckInButton />
 *   </ProGate>
 */
export default function ProGate({ children, feature = 'This feature', style }) {
  // Only subscribe to tier, the unselected destructure re-rendered every
  // ProGated subtree on every store mutation (including each rest-timer
  // tick).
  const tier = useAppStore(s => s.tier);
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);

  // Pro users see the content. Free users must sign up and go through the
  // upgrade flow, going Pro is never a silent one-tap switch.
  if (tier === 'pro') return <>{children}</>;

  function upgrade() {
    setModalVisible(false);
    navigation.navigate('ProUpgrade');
  }

  return (
    <>
      <View style={[styles.wrapper, style]} pointerEvents="box-none">
        <View style={styles.contentDim} pointerEvents="none">
          {children}
        </View>
        <TouchableOpacity style={styles.lockOverlay} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
          <View style={styles.lockChip}>
            <Ionicons name="lock-closed" size={13} color={colors.background} />
            <Text style={styles.lockChipText}>Pro</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetIconWrap}>
              <Ionicons name="sparkles" size={28} color={colors.primary} />
            </View>

            <Text style={styles.sheetTitle}>{feature}</Text>
            <Text style={styles.sheetBody}>
              {PRO_BETA_ACTIVE
                ? 'This is part of Pro. It is completely free during beta. Create a quick account and it unlocks straight away.'
                : 'This is part of Pro. Upgrade to unlock intelligent coaching, weekly guidance, and nutrition tools.'}
            </Text>

            {PRO_BETA_ACTIVE && (
              <View style={styles.betaBanner}>
                <Ionicons name="gift-outline" size={14} color={colors.primary} />
                <Text style={styles.betaBannerText}>Pro is free during beta</Text>
              </View>
            )}

            <TouchableOpacity style={styles.upgradeBtn} onPress={upgrade} activeOpacity={0.88}>
              <Ionicons name="sparkles" size={16} color={colors.background} />
              <Text style={styles.upgradeBtnText}>
                {PRO_BETA_ACTIVE ? 'Go Pro, it\'s free' : 'Upgrade to Pro'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dismissBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.dismissText}>Maybe later</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/**
 * Full-screen locked state shown when a free user lands on a Pro route.
 * The route guard renders this instead of the screen.
 */
export function ProLocked({ feature = 'This' }) {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.lockedSafe}>
      <View style={styles.lockedInner}>
        <View style={styles.lockedIcon}>
          <Ionicons name="lock-closed" size={28} color={colors.primary} />
        </View>
        <Text style={styles.lockedTitle}>{feature} is part of Pro</Text>
        <Text style={styles.lockedBody}>
          {PRO_BETA_ACTIVE
            ? 'Pro is the intelligent coaching layer, and it is completely free during beta. Create a quick account to unlock it.'
            : 'Pro adds intelligent coaching, weekly guidance, and nutrition tools.'}
        </Text>
        <TouchableOpacity
          style={styles.lockedBtn}
          onPress={() => navigation.navigate('ProUpgrade')}
          activeOpacity={0.88}
        >
          <Ionicons name="sparkles" size={16} color={colors.background} />
          <Text style={styles.lockedBtnText}>
            {PRO_BETA_ACTIVE ? 'Go Pro, it\'s free' : 'Upgrade to Pro'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.lockedBack} onPress={() => navigation.goBack()}>
          <Text style={styles.lockedBackText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/**
 * Route guard: wraps a Pro-only screen component. Free users see ProLocked
 * instead of the screen, so a Pro route is enforced no matter how it is
 * reached (deep link, stale nav state, etc.). Pro users pass through.
 */
export function withProGuard(Component, feature) {
  return function GuardedScreen(props) {
    const tier = useAppStore(s => s.tier);
    if (tier !== 'pro') return <ProLocked feature={feature} />;
    return <Component {...props} />;
  };
}

/**
 * ProBadge, inline badge to show next to Pro-only labels/headings.
 */
export function ProBadge({ size = 'sm' }) {
  const isSmall = size === 'sm';
  return (
    <View style={[styles.badge, isSmall ? styles.badgeSm : styles.badgeMd]}>
      <Ionicons name="sparkles" size={isSmall ? 8 : 10} color={colors.background} />
      <Text style={[styles.badgeText, isSmall ? styles.badgeTextSm : styles.badgeTextMd]}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  contentDim: { opacity: 0.35 },
  lockOverlay: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  lockChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, borderRadius: radius.sm,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  lockChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.background },

  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, paddingBottom: spacing.xxl,
    alignItems: 'center', gap: spacing.md,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, marginBottom: spacing.sm,
  },
  sheetIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.textPrimary,
    textAlign: 'center',
  },
  sheetBody: {
    fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 21,
  },
  betaBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primaryBg, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  betaBannerText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },

  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.md, alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
  upgradeBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  dismissBtn: { paddingVertical: spacing.sm },
  dismissText: { fontSize: fontSize.sm, color: colors.textMuted },

  lockedSafe: { flex: 1, backgroundColor: colors.background },
  lockedInner: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, gap: spacing.md,
  },
  lockedIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  lockedTitle: {
    fontSize: fontSize.xl, fontWeight: fontWeight.black,
    color: colors.textPrimary, textAlign: 'center',
  },
  lockedBody: {
    fontSize: fontSize.sm, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 21,
    marginBottom: spacing.sm,
  },
  lockedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: radius.lg, paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xxl, alignSelf: 'stretch',
  },
  lockedBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  lockedBack: { paddingVertical: spacing.sm },
  lockedBackText: { fontSize: fontSize.sm, color: colors.textMuted },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.primary, borderRadius: 4,
  },
  badgeSm: { paddingHorizontal: 5, paddingVertical: spacing.xxs },
  badgeMd: { paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontWeight: fontWeight.black, color: colors.background, letterSpacing: 0.3 },
  badgeTextSm: { fontSize: 8 },
  badgeTextMd: { fontSize: 10 },
});
