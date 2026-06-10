/**
 * TrainingPartnersScreen
 *
 * The whole Training Partners surface (You tab → Training Partners). Private,
 * invite-only circles capped small. Shows the user's own weekly consistency
 * signal alongside their partners', and nothing else — no feed, no posts, no
 * weight/food/coaching data (none of that exists on the partner tables).
 *
 * Degrades gracefully: renders cached signals offline ("Updated Xh ago") and
 * never spins forever. The entire screen is gated behind isPartnersEnabled().
 *
 * Voice: British English, plain, adult. No em dashes (CLAUDE.md).
 */
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Share, Alert, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useFocusEffect } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import { colors, spacing, type, radius, fontWeight } from '../styles/theme';
import Button from '../components/Button';
import { SkeletonCard } from '../components/Skeleton';
import PartnerSignalCard from '../components/PartnerSignalCard';
import * as haptics from '../lib/haptics';
import { appAlert } from '../components/AppAlert';
import {
  getMyCircles, getCircleSignals, createCircle, createInvite,
  sendNudge, setCirclePact,
} from '../lib/partners/partnerService';

function relativeTime(ts) {
  if (!ts) return null;
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function TrainingPartnersScreen() {
  const { user } = useAppStore(useShallow(s => ({ user: s.user })));
  const [loading, setLoading] = useState(true);
  const [circle, setCircle] = useState(null);
  const [members, setMembers] = useState([]);
  const [signals, setSignals] = useState([]);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState(null);
  const [nudged, setNudged] = useState({});      // userId -> true once nudged this session
  const [busy, setBusy] = useState(false);
  const [inviteModal, setInviteModal] = useState(null); // { link, shareText } when an invite is live

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const circles = await getMyCircles();
      const first = circles[0] ?? null;
      setCircle(first);
      if (first?.id) {
        const res = await getCircleSignals(first.id);
        setMembers(res.members);
        setSignals(res.signals);
        setFromCache(res.fromCache);
        setCachedAt(res.cachedAt ?? null);
      } else {
        setMembers([]); setSignals([]);
      }
    } catch (_) { /* graceful: empty state */ }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const signalFor = (uid) => signals.find(s => s.user_id === uid) ?? null;
  // Signals arrive newest-first per user; [1] is the previous week, used for
  // the "back this week" reframe (the comeback is shown, never the gap).
  const prevSignalFor = (uid) => signals.filter(s => s.user_id === uid)[1] ?? null;

  async function handleSetPact() {
    if (!circle?.id || busy) return;
    haptics.selection();
    const options = [2, 3, 4, 5].map(n => ({
      text: `${n} sessions each`,
      onPress: async () => {
        const res = await setCirclePact(circle.id, n);
        if (res.ok) { setCircle(c => ({ ...c, pact_sessions: n })); load(); }
      },
    }));
    if (circle?.pact_sessions) {
      options.push({
        text: 'Remove the pact',
        style: 'destructive',
        onPress: async () => {
          const res = await setCirclePact(circle.id, null);
          if (res.ok) { setCircle(c => ({ ...c, pact_sessions: null })); load(); }
        },
      });
    }
    appAlert(
      'Shared weekly pact',
      'One target you both commit to. It shows on everyone\'s card; nothing else changes.',
      [...options, { text: 'Not now', style: 'cancel' }],
    );
  }

  async function handleInvite() {
    if (busy) return;
    setBusy(true);
    haptics.selection();
    try {
      // Create a circle on first invite; reuse the existing one otherwise.
      let circleId = circle?.id;
      if (!circleId) {
        const created = await createCircle(null);
        if (!created.ok) { setBusy(false); return; }
        circleId = created.circleId;
      }
      const inv = await createInvite(circleId);
      if (inv.ok) {
        // Show the QR + link sheet (in-person scan or one-tap share) instead
        // of firing the OS share sheet blind. Either path lands on the same
        // deep link the app already handles (App.js: /partner/<token>).
        setInviteModal({ link: inv.link, shareText: inv.shareText });
        load();
      }
    } catch (_) { /* offline, or invite creation failed */ }
    setBusy(false);
  }

  async function handleNudge(toUserId, emoji) {
    haptics.selection();
    setNudged(prev => ({ ...prev, [toUserId]: true }));
    const res = await sendNudge(circle?.id, toUserId, emoji);
    if (res.ok && res.sent === false) {
      Alert.alert('Already nudged', 'You can nudge a partner once a day.');
    }
  }

  const partners = members.filter(m => m.user_id !== user?.id);
  const hasCircle = !!circle;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <>
            <SkeletonCard height={92} />
            <SkeletonCard height={92} />
          </>
        ) : !hasCircle ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color={colors.primary} />
            <Text style={styles.emptyTitle}>Stay accountable together</Text>
            <Text style={styles.emptyBody}>
              Training with someone? Invite a partner and keep each other honest.
              Private, and nothing is shared but whether you trained.
            </Text>
            <Button
              title="Invite a training partner"
              onPress={handleInvite}
              loading={busy}
              icon="person-add-outline"
            />
          </View>
        ) : (
          <>
            {fromCache ? (
              <Text style={styles.cacheNote}>
                Offline. Updated {relativeTime(cachedAt) ?? 'recently'}.
              </Text>
            ) : null}

            <TouchableOpacity
              style={styles.pactRow}
              onPress={handleSetPact}
              accessibilityRole="button"
              accessibilityLabel={circle?.pact_sessions
                ? `Shared pact: ${circle.pact_sessions} sessions each this week. Tap to change.`
                : 'Set a shared weekly pact'}
            >
              <Ionicons name="ribbon-outline" size={16} color={colors.primary} />
              <Text style={styles.pactText}>
                {circle?.pact_sessions
                  ? `Our pact: ${circle.pact_sessions} sessions each this week`
                  : 'Set a shared weekly pact'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </TouchableOpacity>

            <PartnerSignalCard
              displayName="You"
              isSelf
              signal={signalFor(user?.id)}
              prevSignal={prevSignalFor(user?.id)}
            />

            {partners.length === 0 ? (
              <Text style={styles.waiting}>
                Waiting for your partner to join. Send them the invite again if needed.
              </Text>
            ) : (
              partners.map(p => (
                <PartnerSignalCard
                  key={p.user_id}
                  displayName={p.display_name}
                  signal={p.sharing_enabled ? signalFor(p.user_id) : null}
                  prevSignal={p.sharing_enabled ? prevSignalFor(p.user_id) : null}
                  nudgeEnabled={p.sharing_enabled}
                  nudged={!!nudged[p.user_id]}
                  onNudge={(emoji) => handleNudge(p.user_id, emoji)}
                  streakLabel={p.sharing_enabled ? undefined : 'sharing paused'}
                />
              ))
            )}

            <Button
              title="Invite another"
              variant="secondary"
              onPress={handleInvite}
              loading={busy}
              icon="person-add-outline"
            />
            <Text style={styles.footnote}>
              Manage sharing in Settings → Coaching. You can stop sharing any time.
            </Text>
          </>
        )}
      </ScrollView>

      {/* Invite sheet: scan in person, or share the link. Both routes hit the
          same deep link the app already handles. */}
      <Modal
        visible={!!inviteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setInviteModal(null)}
      >
        <View style={styles.inviteOverlay}>
          <View style={styles.inviteSheet}>
            <Text style={styles.inviteTitle}>Invite your partner</Text>
            <Text style={styles.inviteBody}>
              Have them scan this with their camera, or send the link.
            </Text>
            <View style={styles.qrWrap}>
              {inviteModal ? (
                <QRCode
                  value={inviteModal.link}
                  size={180}
                  backgroundColor={colors.textPrimary}
                  color={colors.background}
                />
              ) : null}
            </View>
            <Button
              title="Share link"
              icon="share-outline"
              onPress={() => {
                if (inviteModal) Share.share({ message: inviteModal.shareText }).catch(() => {});
              }}
            />
            <TouchableOpacity
              onPress={() => setInviteModal(null)}
              style={styles.inviteDone}
              accessibilityRole="button"
              accessibilityLabel="Done"
            >
              <Text style={styles.inviteDoneText}>Done</Text>
            </TouchableOpacity>
            {/* Privacy receipt: spell out exactly what crosses to a partner,
                and what never does. Accountability without exposure. */}
            <View style={styles.receipt}>
              <View style={styles.receiptRow}>
                <Ionicons name="eye-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.receiptText}>
                  They see: whether you trained this week, and your weekly streak.
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Ionicons name="eye-off-outline" size={14} color={colors.textMuted} />
                <Text style={styles.receiptTextMuted}>
                  They never see: your weights, body data, food, or any numbers.
                </Text>
              </View>
            </View>
            <Text style={styles.inviteNote}>
              Single-use and private. The link expires once your partner joins.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  emptyTitle: { ...type.title, color: colors.textPrimary, textAlign: 'center' },
  emptyBody: { ...type.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  cacheNote: { ...type.caption, color: colors.textMuted },
  waiting: { ...type.caption, color: colors.textMuted, paddingHorizontal: spacing.xs },
  inviteOverlay: { flex: 1, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  inviteSheet: {
    width: '100%', maxWidth: 360, alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  inviteTitle: { ...type.title, color: colors.textPrimary, textAlign: 'center' },
  inviteBody: { ...type.body, color: colors.textSecondary, textAlign: 'center' },
  qrWrap: { backgroundColor: colors.textPrimary, padding: spacing.md, borderRadius: radius.md },
  inviteDone: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  inviteDoneText: { ...type.body, color: colors.textSecondary, fontWeight: fontWeight.semibold },
  inviteNote: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
  receipt: {
    width: '100%', gap: spacing.xs,
    backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.md,
  },
  receiptRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  receiptText: { ...type.caption, color: colors.textSecondary, flex: 1, lineHeight: 16 },
  receiptTextMuted: { ...type.caption, color: colors.textMuted, flex: 1, lineHeight: 16 },
  footnote: { ...type.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  pactRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  pactText: { ...type.label, flex: 1, color: colors.textPrimary },
});
