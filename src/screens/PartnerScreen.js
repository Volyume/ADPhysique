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
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Share, Switch, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { appAlert } from '../components/AppAlert';
import { colors, spacing, radius, fontSize, fontWeight, type, withAlpha, alpha } from '../styles/theme';
import Card from '../components/Card';
import usePartners from '../hooks/usePartners';
import { getAllProgrammes } from '../lib/database';
import { parseInviteCode } from '../lib/partners/link';
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
  'If you choose to train the same block, the block\u2019s name is shared between you. Never what is inside it.',
];
const NEVER_SEES = [
  'The weights you lifted, your sets and reps, or anything else from a session.',
  'Your body weight, your measurements, or any photos.',
  'Your food, your calories, or anything you logged in the diary.',
  'Your check-ins, or anything you told the coach.',
  'Where you are. Your location is never shared.',
];

export default function PartnerScreen({ route }) {
  const { user, tier } = useAppStore(useShallow(s => ({ user: s.user, tier: s.tier })));
  const toast = useToast();
  const p = usePartners(user?.id, tier);
  const [streakOn, setStreakOn] = useState(true);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  // Shared training block (Wave 5 C5 A2): inline programme picker state.
  const [blockPickerOpen, setBlockPickerOpen] = useState(false);
  const [programmes, setProgrammes] = useState(null);

  // A partner invite link (volyume://partner/<CODE> or
  // https://volyume.app/partner/<CODE>) routes here with the code in params.
  // Prefill it and auto-redeem once the partner data has loaded — opening an
  // invite link is explicit intent to accept — unless already paired. Guarded
  // by a ref so it fires once per distinct code.
  const incomingCode = route?.params?.code ? parseInviteCode(route.params.code) : null;
  const handledCodeRef = useRef(null);
  useEffect(() => {
    if (!incomingCode || p.loading) return;
    if (handledCodeRef.current === incomingCode) return;
    handledCodeRef.current = incomingCode;
    setCode(incomingCode);
    const alreadyPaired = p.rowState === 'active' || p.rowState === 'resting';
    if (!alreadyPaired) handleRedeem(incomingCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingCode, p.loading, p.rowState]);

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

  // Send the invite straight into a specific app (founder 2026-06-30: text,
  // WhatsApp and email as separate buttons that open the respective app rather
  // than the generic OS share sheet). Each tap creates a fresh invite, then
  // deep-links into the target with the share message prefilled. If the target
  // isn't installed (or the deep link fails), we fall back to the OS share sheet
  // so the invite is never stranded.
  async function inviteVia(target) {
    if (busy || !p.canAdd) return;
    setBusy(true);
    const r = await p.invite({ streakEnabled: streakOn });
    setBusy(false);
    if (!r.ok) {
      logError('PartnerScreen.inviteVia', new Error(r.error || 'unknown'), { userId: user?.id, target });
      toast.show('Could not create an invite. Check your connection and try again.', { variant: 'error' });
      return;
    }
    const message = r.data.shareMessage;
    const body = encodeURIComponent(message);
    let url;
    if (target === 'sms') {
      // iOS wants sms:&body=, Android wants sms:?body=.
      url = Platform.OS === 'ios' ? `sms:&body=${body}` : `sms:?body=${body}`;
    } else if (target === 'whatsapp') {
      url = `whatsapp://send?text=${body}`;
    } else {
      const subject = encodeURIComponent('Train with me on Volyume');
      url = `mailto:?subject=${subject}&body=${body}`;
    }
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Target app/handler unavailable: hand off to the OS share sheet.
        await Share.share({ message });
      }
    } catch (e) {
      logError('PartnerScreen.inviteVia.open', e, { userId: user?.id, target });
      try { await Share.share({ message }); } catch (_) { /* user dismissed */ }
    }
    p.reload();
  }

  async function handleRedeem(incoming) {
    // Accept an explicit code (deep link) or fall back to the typed field.
    // Guards against being passed a press event object.
    const toRedeem = (typeof incoming === 'string' ? incoming : code).trim();
    if (!toRedeem) return;
    setBusy(true);
    const r = await p.redeem(toRedeem);
    setBusy(false);
    if (!r.ok) { toast.show('That invite did not work. It may have expired or already been used.', { variant: 'error' }); return; }
    setCode('');
  }

  async function handleCheer() {
    const reciprocal = p.partnerWeek?.weekMet || (p.partnerWeek?.done > 0);
    await p.cheer(p.partnership.id, !!reciprocal);
  }

  // ── Shared training block (Wave 5 C5 A2) ──
  async function openBlockPicker() {
    setBlockPickerOpen(true);
    if (programmes === null) {
      try {
        const all = await getAllProgrammes(user.id);
        setProgrammes(all || []);
      } catch (e) {
        logError('PartnerScreen.loadProgrammes', e, { userId: user?.id });
        setProgrammes([]);
      }
    }
  }

  async function handleProposeBlock(name) {
    setBlockPickerOpen(false);
    const r = await p.proposeBlock(p.partnership.id, name);
    if (!r.ok) {
      logError('PartnerScreen.proposeBlock', new Error(r.error || 'unknown'), { userId: user?.id });
      toast.show('Could not suggest the block. Check your connection and try again.', { variant: 'error' });
    }
  }

  async function handleAdoptBlock() {
    const r = await p.adoptBlock(p.partnership.id);
    if (!r.ok) {
      logError('PartnerScreen.adoptBlock', new Error(r.error || 'unknown'), { userId: user?.id });
      toast.show('Could not join the block. Check your connection and try again.', { variant: 'error' });
    }
  }

  async function handleLeaveBlock(kind) {
    const r = await p.leaveBlock(p.partnership.id);
    if (!r.ok) {
      logError('PartnerScreen.leaveBlock', new Error(r.error || 'unknown'), { userId: user?.id, kind });
      toast.show('Could not update the block. Check your connection and try again.', { variant: 'error' });
    }
  }

  // Used by both "End partnership" (active) and the pending-invite "Cancel".
  // Awaits the result and surfaces it: the unpair RPC can fail (e.g. offline, or
  // before the server migration is applied), and a silent failure left the user
  // tapping Cancel with nothing happening (founder 2026-06-30). The wording
  // adapts so cancelling a pending invite never reads as "ending" a partnership.
  function confirmUnpair() {
    const pending = p.rowState === 'pending';
    const title = pending ? 'Cancel invitation?' : 'End partnership?';
    const message = pending
      ? 'Your invitation will be withdrawn. You can send a new one any time.'
      : 'Sharing will stop right away and everything you shared will be deleted.';
    const confirmLabel = pending ? 'Cancel invitation' : 'End';
    appAlert(title, message, [
      { text: pending ? 'Keep waiting' : 'Cancel', style: 'cancel' },
      {
        text: confirmLabel,
        style: 'destructive',
        onPress: async () => {
          const r = await p.unpair(p.partnership.id);
          if (r?.ok) {
            toast.show(pending ? 'Invitation cancelled' : 'Partnership ended', { variant: 'success' });
          } else {
            logError('PartnerScreen.confirmUnpair', new Error(r?.error || 'unknown'), { userId: user?.id, pending });
            toast.show(
              pending
                ? 'Could not cancel the invitation. Check your connection and try again.'
                : 'Could not end the partnership. Check your connection and try again.',
              { variant: 'error' },
            );
          }
        },
      },
    ]);
  }

  if (p.loading) return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </SafeAreaView>
  );

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

            {/* ── Shared training block (Wave 5 C5 A2) — the block's NAME is the
                 only shared content; the week compare above already shows both
                 sides' derived counts. ── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Train the same block</Text>
              <Card style={styles.card}>
                {!p.sharedBlock && (
                  <>
                    <Text style={styles.blockPitch}>
                      Suggest a block and, if {partnerName} joins it, the week
                      counts above become your shared week on the same plan.
                      Only the block&apos;s name is shared. Never what is inside it.
                    </Text>
                    {!blockPickerOpen ? (
                      <TouchableOpacity
                        style={styles.blockBtn} onPress={openBlockPicker}
                        accessibilityRole="button" accessibilityLabel="Suggest a block"
                      >
                        <Ionicons name="barbell-outline" size={16} color={colors.primary} />
                        <Text style={styles.blockBtnText}>Suggest a block</Text>
                      </TouchableOpacity>
                    ) : programmes === null ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : programmes.length === 0 ? (
                      <Text style={styles.caption}>No plans yet. Build or pick one in Plans first.</Text>
                    ) : (
                      programmes.map((prog) => (
                        <TouchableOpacity
                          key={prog.id} style={styles.blockOption}
                          onPress={() => handleProposeBlock(prog.name)}
                          accessibilityRole="button" accessibilityLabel={`Suggest ${prog.name}`}
                        >
                          <Text style={styles.blockOptionText} numberOfLines={1}>{prog.name}</Text>
                          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                      ))
                    )}
                  </>
                )}

                {p.sharedBlock?.status === 'proposed' && p.sharedBlock.proposedBy === user?.id && (
                  <>
                    <Text style={styles.blockPitch}>
                      You suggested {p.sharedBlock.blockName}. Waiting for {partnerName}.
                    </Text>
                    <TouchableOpacity
                      style={styles.blockLeaveRow} onPress={() => handleLeaveBlock('withdraw')}
                      accessibilityRole="button" accessibilityLabel="Withdraw suggestion"
                    >
                      <Text style={styles.blockLeaveText}>Withdraw suggestion</Text>
                    </TouchableOpacity>
                  </>
                )}

                {p.sharedBlock?.status === 'proposed' && p.sharedBlock.proposedBy !== user?.id && (
                  <>
                    <Text style={styles.blockPitch}>
                      {partnerName} suggested training {p.sharedBlock.blockName} together.
                    </Text>
                    <TouchableOpacity
                      style={styles.blockBtn} onPress={handleAdoptBlock}
                      accessibilityRole="button" accessibilityLabel="Train this block too"
                    >
                      <Ionicons name="checkmark" size={16} color={colors.primary} />
                      <Text style={styles.blockBtnText}>Train this block too</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.blockLeaveRow} onPress={() => handleLeaveBlock('decline')}
                      accessibilityRole="button" accessibilityLabel="Not for me"
                    >
                      <Text style={styles.blockLeaveText}>Not for me</Text>
                    </TouchableOpacity>
                  </>
                )}

                {p.sharedBlock?.status === 'active' && (
                  <>
                    <View style={styles.blockActiveRow}>
                      <Ionicons name="barbell-outline" size={16} color={colors.primary} />
                      <Text style={styles.blockActiveText} numberOfLines={2}>
                        You are both training {p.sharedBlock.blockName}. The week
                        counts above are your shared week on it.
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.blockLeaveRow} onPress={() => handleLeaveBlock('leave')}
                      accessibilityRole="button" accessibilityLabel="Leave this block"
                    >
                      <Text style={styles.blockLeaveText}>Leave this block</Text>
                    </TouchableOpacity>
                  </>
                )}
              </Card>
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
              <Card style={styles.card}>
                <Text style={styles.pitch}>
                  Pick one person you trust and you will both see whether the other
                  trained this week. There are no numbers to compare and there is no
                  feed to scroll. It is just the two of you, quietly keeping each
                  other going.
                </Text>
              </Card>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>What you each see</Text>
              <Card style={styles.card}>
                {SEES.map((t) => (
                  <View key={t} style={styles.bullet}><Text style={styles.yes}>✓</Text><Text style={styles.bulletText}>{t}</Text></View>
                ))}
              </Card>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>What neither of you will ever see</Text>
              <Card style={styles.card}>
                {NEVER_SEES.map((t) => (
                  <View key={t} style={styles.bullet}><Text style={styles.no}>✕</Text><Text style={styles.bulletText}>{t}</Text></View>
                ))}
                <Text style={styles.fine}>
                  Either of you can end this whenever you want. The moment you do,
                  sharing stops and everything that was shared between you is deleted.
                  Your partner simply sees that the partnership has ended, and nothing more.
                </Text>
              </Card>
            </View>

            <View style={styles.section}>
              <Card style={styles.card}>
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

                {/* Send the invite straight into a specific app. */}
                <Text style={styles.orLabel}>Or send it directly</Text>
                <View style={styles.sendRow}>
                  <TouchableOpacity
                    style={[styles.sendBtn, (busy || !p.canAdd) && styles.primaryDisabled]}
                    onPress={() => inviteVia('sms')} disabled={busy || !p.canAdd}
                    accessibilityRole="button" accessibilityLabel="Invite by text message"
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                    <Text style={styles.sendBtnText}>Text</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sendBtn, (busy || !p.canAdd) && styles.primaryDisabled]}
                    onPress={() => inviteVia('whatsapp')} disabled={busy || !p.canAdd}
                    accessibilityRole="button" accessibilityLabel="Invite by WhatsApp"
                  >
                    <Ionicons name="logo-whatsapp" size={18} color={colors.primary} />
                    <Text style={styles.sendBtnText}>WhatsApp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sendBtn, (busy || !p.canAdd) && styles.primaryDisabled]}
                    onPress={() => inviteVia('email')} disabled={busy || !p.canAdd}
                    accessibilityRole="button" accessibilityLabel="Invite by email"
                  >
                    <Ionicons name="mail-outline" size={18} color={colors.primary} />
                    <Text style={styles.sendBtnText}>Email</Text>
                  </TouchableOpacity>
                </View>

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
              </Card>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  section: { gap: spacing.md },
  sectionLabel: { ...type.label, color: colors.textSecondary },
  card: { gap: spacing.sm },
  pitch: { ...type.body, color: colors.textPrimary, lineHeight: 22 },

  // Paired live card
  liveCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md,
  },
  liveHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, flexShrink: 1 },
  chip: { backgroundColor: withAlpha(colors.primary, alpha.tint), borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
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
  cheerBtnDone: { backgroundColor: withAlpha(colors.border, alpha.edge) },
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
  fine: { ...type.bodySm, color: colors.textSecondary, marginTop: spacing.sm },

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
  sendRow: { flexDirection: 'row', gap: spacing.sm },
  sendBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md,
    paddingVertical: spacing.sm, minHeight: 44,
  },
  sendBtnText: { ...type.label, color: colors.primary, fontSize: fontSize.sm },
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

  // Shared training block
  blockPitch: { ...type.body, color: colors.textPrimary, lineHeight: 21 },
  blockBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md,
    paddingVertical: spacing.sm, minHeight: 44,
  },
  blockBtnText: { ...type.label, color: colors.primary, fontSize: fontSize.sm },
  blockOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm, minHeight: 44,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  blockOptionText: { ...type.body, color: colors.textPrimary, flexShrink: 1 },
  blockActiveRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  blockActiveText: { flex: 1, ...type.body, color: colors.textPrimary, lineHeight: 21 },
  blockLeaveRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, minHeight: 44 },
  blockLeaveText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary },
});
