import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, Pressable, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import TodaysPlateTeaser from './food/TodaysPlateTeaser';

/**
 * ProGate wraps any content that requires a Pro tier.
 * Free users see the content with a lock overlay, tapping it opens an
 * upgrade sheet that routes to ProUpgrade, which starts the trial or
 * subscribes depending on whether the user has used their trial.
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
            <Ionicons name="lock-closed" size={13} color={colors.onPrimary} />
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
              This is part of Pro: weekly coaching, the food diary, and your body metrics.
            </Text>

            <TouchableOpacity style={styles.upgradeBtn} onPress={upgrade} activeOpacity={0.88}>
              <Ionicons name="sparkles" size={16} color={colors.onPrimary} />
              <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
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
  // Show-then-sell: on the food-diary lock, free users get a read-only
  // example day above the upgrade ask (founder decision #6). It exposes no
  // Pro action, only the value. Other Pro locks keep the plain held-seat.
  const showPlateTeaser = feature === 'Food diary';
  return (
    <SafeAreaView style={styles.lockedSafe}>
      <ScrollView contentContainerStyle={styles.lockedScroll} showsVerticalScrollIndicator={false}>
        {showPlateTeaser ? <TodaysPlateTeaser /> : null}
        <View style={styles.lockedIcon}>
          <Ionicons name="lock-closed" size={28} color={colors.primary} />
        </View>
        <Text style={styles.lockedTitle}>{feature} is part of Pro</Text>
        <Text style={styles.lockedBody}>
          Pro is the coaching layer: weekly check-ins, nutrition targets, the food diary, and your body metrics.
        </Text>
        {/* COMP-025-A §4b: a held seat, not a wall. Reassures lapsed users
            their data is intact and untouched. */}
        <Text style={styles.lockedHeldSeat}>
          Everything you logged is saved, and will be exactly as you left it if you come back.
        </Text>
        <TouchableOpacity
          style={styles.lockedBtn}
          onPress={() => navigation.navigate('ProUpgrade')}
          activeOpacity={0.88}
        >
          <Ionicons name="sparkles" size={16} color={colors.onPrimary} />
          <Text style={styles.lockedBtnText}>Upgrade to Pro</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.lockedBack}
          onPress={() => {
            // "Not now" must always lead somewhere. If the user deep-linked
            // straight onto a locked tab root there's no back entry, so fall
            // back to the Home tab rather than leaving them stranded.
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate('HomeTab');
          }}
        >
          <Text style={styles.lockedBackText}>Not now</Text>
        </TouchableOpacity>
      </ScrollView>
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
      <Ionicons name="sparkles" size={isSmall ? 8 : 10} color={colors.onPrimary} />
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
  lockChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.onPrimary },

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
  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.md, alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
  upgradeBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.onPrimary },
  dismissBtn: { paddingVertical: spacing.sm },
  dismissText: { fontSize: fontSize.sm, color: colors.textMuted },

  lockedSafe: { flex: 1, backgroundColor: colors.background },
  lockedScroll: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center',
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
  lockedHeldSeat: {
    fontSize: fontSize.sm, color: colors.textMuted,
    textAlign: 'center', lineHeight: 21,
    marginBottom: spacing.sm,
  },
  lockedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: radius.lg, paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xxl, alignSelf: 'stretch',
  },
  lockedBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.onPrimary },
  lockedBack: { paddingVertical: spacing.sm },
  lockedBackText: { fontSize: fontSize.sm, color: colors.textMuted },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.primary, borderRadius: 4,
  },
  badgeSm: { paddingHorizontal: 5, paddingVertical: spacing.xxs },
  badgeMd: { paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontWeight: fontWeight.black, color: colors.onPrimary, letterSpacing: 0.3 },
  badgeTextSm: { fontSize: fontSize.micro },
  badgeTextMd: { fontSize: fontSize.micro },
});
