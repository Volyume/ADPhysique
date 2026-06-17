/**
 * PartnerScreen — the training partner's first-class home (NEW-002 rebuild,
 * bp-partner-system-rebuild.md, founder device-walk 2026-06-12).
 *
 * Placement research: Duolingo keeps the friend streak with the user's OWN
 * streak and re-engages post-lesson; Apple Fitness gives minimal-signal
 * sharing a proper named destination. So Volyume's partner gets this screen
 * (reached from the Progress hub tile + the Consistency slim row), and the
 * live beat happens on WorkoutSummary.
 *
 * Locked behaviour carried over from the v1 section, verbatim where it
 * matters: derived signals only (ticks, shared streak, resting), the
 * privacy receipt copy, one cheer per local day, either side ends it and
 * what was shared is deleted, free 1 partner / Pro up to 3. Resting NEVER
 * reads as a fail. House style throughout (docs/rules/styling.md).
 */
import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Share, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { appAlert } from '../components/AppAlert';
import { colors, spacing, radius, fontSize, fontWeight, type, withAlpha } from '../styles/theme';
import usePartners from '../hooks/usePartners';
import { ticksLabel } from '../lib/partners/signals';
import { sharedStreakLabel } from '../lib/partners/sharedStreak';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../components/Toast';
import { logError } from '../lib/errorLog';

const SEES = [
  'Whether each of you trained this week, shown as a simple count like three of four. Never the numbers behind it.',
  'A shared streak that you build together, counted in weeks rather than days.',
  'A rest week or a quiet week, which simply shows as "Resting". It never counts against either of you and it never breaks the streak.',
  'A cheer you can send each other once a day, so a good week never goes unnoticed.',
];
const NEVER_SEES = [
  'The weights you lifted, your sets and reps, or anything else from a session.',
  'Your body weight, your measurements, or any photos.',
  'Your food, your calories, or anything you logged in the diary.',
  'Your check-ins, or anything you told the coach.',
  'Where you are. Your location is never shared.',
];

export default function PartnerScreen() {
  const { user, tier } = useAppStore(useShallow(s => ({ user: s.user, tier: s.tier })));
  const toast = useToast();
  const p = usePartners(user?.id, tier);
  const [streakOn, setStreakOn] = useState(true);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    setBusy(true);
    const r = await p.invite({ streakEnabled: streakOn });
    setBusy(false);
    if (!r.ok) {
      // Capture the real cause (server RPC error vs offline vs auth) — the toast
      // is deliberately generic, but a discarded error makes the failure
      // impossible to diagnose from the field.
      logError('PartnerScreen.handleCreate', new Error(r.error || 'unknown'), { userId: user?.id });
      toast.show('Could not create an invite. Check your connection and try again.', { variant: 'error' });
      return;
    }
    try { await Share.share({ message: r.data.shareMessage }); } catch (_) { /* user dismissed */ }
    p.reload();
  }

  async function handleRedeem() {
    if (!code.trim()) return;
    setBusy(true);
    const r = await p.redeem(code.trim());
    setBusy(false);
    if (!r.ok) { toast.show('That invite did not work. It may have expired or already been used.', { variant: 'error' }); return; }
    setCode('');
  }

  async function handleCheer() {
    const reciprocal = p.partnerWeek?.weekMet || (p.partnerWeek?.done > 0);
    await p.cheer(p.partnership.id, !!reciprocal);
  }

  function confirmUnpair() {
    appAlert('End partnership?', 'Sharing will stop right away and everything you shared will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => p.unpair(p.partnership.id) },
    ]);
  }

  if (p.loading) return <SafeAreaView style={styles.safe} edges={['bottom']} />;

  const partnerName = p.partnership?.partnerFirstName || 'Your partner';
  const paired = p.rowState === 'active' || p.rowState === 'resting';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Paired: the live card, both sides of the week ── */}
        {paired && (
          <View style={styles.section}>
            <View style={styles.liveCard}>
              <View style={styles.liveHead}>
                <Text style={styles.name}>{partnerName}</Text>
                {p.sharedStreak && sharedStreakLabel(p.sharedStreak) ? (
                  <View style={styles.chip}><Text style={styles.chipText}>{sharedStreakLabel(p.sharedStreak)}</Text></View>
                ) : null}
              </View>

              <View style={styles.weekRow}>
                <View style={styles.weekCol}>
                  <Text style={styles.weekLabel}>You</Text>
                  <Text style={styles.weekTicks}>{ticksLabel({ done: p.myWeek?.done, planned: p.myWeek?.planned })}</Text>
                </View>
                <View style={styles.weekDivider} />
                <View style={styles.weekCol}>
                  <Text style={styles.weekLabel}>{partnerName}</Text>
                  {p.rowState === 'resting' ? (
                    <View style={styles.restRow}>
                      <Ionicons name="moon-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.restText}>Resting this week</Text>
                    </View>
                  ) : (
                    <Text style={styles.weekTicks}>{ticksLabel({ done: p.partnerWeek?.done, planned: p.partnerWeek?.planned })}</Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.cheerBtn, !p.cheerEnabled && styles.cheerBtnDone]}
                onPress={handleCheer}
                disabled={!p.cheerEnabled}
                accessibilityRole="button"
                accessibilityLabel={p.cheerEnabled ? 'Send a cheer' : 'Cheer sent'}
              >
                <Ionicons name="hand-left-outline" size={16} color={p.cheerEnabled ? colors.onPrimary : colors.textSecondary} />
                <Text style={[styles.cheerText, !p.cheerEnabled && styles.cheerTextDone]}>
                  {p.cheerEnabled ? 'Cheer' : 'Cheer sent'}
                </Text>
              </TouchableOpacity>

              {p.lastReceived ? (
                <Text style={styles.caption}>{partnerName} cheered you recently.</Text>
              ) : null}
            </View>

            <TouchableOpacity style={styles.manageRow} onPress={confirmUnpair} accessibilityRole="button" accessibilityLabel="End partnership">
              <Ionicons name="exit-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.manageText}>End partnership</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Pending invite ── */}
        {p.rowState === 'pending' && (
          <View style={styles.pendingCard}>
            <Ionicons name="hourglass-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.pendingText}>Invitation sent. Waiting for your partner.</Text>
            <TouchableOpacity onPress={confirmUnpair} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel invitation">
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Empty / ended: the pitch + privacy receipt + pairing ── */}
        {(p.rowState === 'empty' || p.rowState === 'ended') && (
          <>
            {p.rowState === 'ended' ? (
              <Text style={styles.endedNote}>Partnership ended.</Text>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Train with a partner</Text>
              <View style={styles.card}>
                <Text style={styles.pitch}>
                  Pick one person you trust and you will both see whether the other
                  trained this week. There are no numbers to compare and there is no
                  feed to scroll. It is just the two of you, quietly keeping each
                  other going.
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>What you each see</Text>
              <View style={styles.card}>
                {SEES.map((t) => (
                  <View key={t} style={styles.bullet}><Text style={styles.yes}>✓</Text><Text style={styles.bulletText}>{t}</Text></View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>What neither of you will ever see</Text>
              <View style={styles.card}>
                {NEVER_SEES.map((t) => (
                  <View key={t} style={styles.bullet}><Text style={styles.no}>✕</Text><Text style={styles.bulletText}>{t}</Text></View>
                ))}
                <Text style={styles.fine}>
                  Either of you can end this whenever you want. The moment you do,
                  sharing stops and everything that was shared between you is deleted.
                  Your partner simply sees that the partnership has ended, and nothing more.
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Share a consistency streak</Text>
                  <Switch
                    value={streakOn} onValueChange={setStreakOn}
                    trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
                    thumbColor={streakOn ? colors.primary : colors.textMuted}
                  />
                </View>

                {!p.canAdd && (
                  <Text style={styles.cap}>Free includes one training partner. With Pro you can train alongside up to three.</Text>
                )}

                <TouchableOpacity
                  style={[styles.primary, (busy || !p.canAdd) && styles.primaryDisabled]}
                  onPress={handleCreate} disabled={busy || !p.canAdd} accessibilityRole="button"
                  accessibilityLabel="Create invite"
                >
                  {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryText}>Create invite</Text>}
                </TouchableOpacity>

                <Text style={styles.orLabel}>Or enter a partner&apos;s code</Text>
                <View style={styles.codeRow}>
                  <TextInput
                    style={styles.codeInput} value={code} onChangeText={setCode}
                    placeholder="Invite code" placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters" autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.codeBtn} onPress={handleRedeem} disabled={busy || !code.trim()}
                    accessibilityRole="button" accessibilityLabel="Join with code"
                  >
                    <Text style={styles.codeBtnText}>Join</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  section: { gap: spacing.md },
  sectionLabel: { ...type.label, color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm,
  },
  pitch: { ...type.body, color: colors.textPrimary, lineHeight: 22 },

  // Paired live card
  liveCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md,
  },
  liveHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, flexShrink: 1 },
  chip: { backgroundColor: withAlpha(colors.primary, 0.12), borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  chipText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary },
  weekRow: {
    flexDirection: 'row', alignItems: 'stretch', gap: spacing.lg,
    backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.md,
  },
  weekCol: { flex: 1, gap: spacing.xxs },
  weekDivider: { width: 1, backgroundColor: colors.border },
  weekLabel: { ...type.caption, color: colors.textMuted },
  weekTicks: { ...type.num('title'), color: colors.textPrimary },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: 2 },
  restText: { fontSize: fontSize.sm, color: colors.textSecondary },
  cheerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.md, minHeight: 48,
  },
  cheerBtnDone: { backgroundColor: withAlpha(colors.border, 0.25) },
  cheerText: { ...type.label, color: colors.onPrimary },
  cheerTextDone: { color: colors.textSecondary },
  caption: { fontSize: fontSize.sm, color: colors.textSecondary },
  manageRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: spacing.md, minHeight: 44,
  },
  manageText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary },

  // Pending
  pendingCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
  },
  pendingText: { flex: 1, ...type.body, color: colors.textPrimary },
  cancel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  endedNote: { fontSize: fontSize.sm, color: colors.textSecondary },

  // Privacy receipt
  bullet: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  yes: { color: colors.success, fontWeight: fontWeight.bold, width: 18 },
  no: { color: colors.warning, fontWeight: fontWeight.bold, width: 18 },
  bulletText: { flex: 1, ...type.body, color: colors.textPrimary },
  fine: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 19 },

  // Pairing controls
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { ...type.body, color: colors.textPrimary },
  cap: { fontSize: fontSize.sm, color: colors.textSecondary },
  primary: {
    backgroundColor: colors.primary, borderRadius: radius.lg, alignItems: 'center',
    paddingVertical: spacing.md, marginTop: spacing.xs, minHeight: 50, justifyContent: 'center',
  },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { ...type.label, color: colors.onPrimary, fontSize: fontSize.md },
  orLabel: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  codeRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  codeInput: {
    flex: 1, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, color: colors.textPrimary, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, minHeight: 44, ...type.body,
  },
  codeBtn: {
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md,
    paddingHorizontal: spacing.md, justifyContent: 'center', minHeight: 44,
  },
  codeBtnText: { ...type.label, color: colors.primary },
});
