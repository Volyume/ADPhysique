/**
 * NEW-002 — the training-partner section on the Progress consistency screen
 * (directly beneath the COMP-018 streak card, §4.1). One compact row plus the
 * privacy-receipt sheet. Derived signals only: ticks ("3 of 4"), a shared
 * streak chip, and a one-tap cheer. No raw metric, no free text, never a fail
 * word. British English throughout.
 */
import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput,
  Share, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight, withAlpha } from '../styles/theme';
import usePartners from '../hooks/usePartners';
import { ticksLabel } from '../lib/partners/signals';
import { sharedStreakLabel } from '../lib/partners/sharedStreak';

export default function PartnerSection({ userId, tier }) {
  const p = usePartners(userId, tier);
  const [sheet, setSheet] = useState(false);      // privacy receipt open
  const [streakOn, setStreakOn] = useState(true);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (p.loading) return null;

  async function handleCreate() {
    setBusy(true);
    const r = await p.invite({ streakEnabled: streakOn });
    setBusy(false);
    if (!r.ok) { Alert.alert('Could not create an invite', 'Please check your connection and try again.'); return; }
    setSheet(false);
    try { await Share.share({ message: r.data.shareMessage }); } catch (_) { /* user dismissed */ }
    p.reload();
  }

  async function handleRedeem() {
    if (!code.trim()) return;
    setBusy(true);
    const r = await p.redeem(code.trim());
    setBusy(false);
    if (!r.ok) { Alert.alert('That invite did not work', 'It may have expired or already been used.'); return; }
    setSheet(false); setCode('');
  }

  async function handleCheer() {
    const reciprocal = p.partnerWeek?.weekMet || (p.partnerWeek?.done > 0);
    await p.cheer(p.partnership.id, !!reciprocal);
  }

  function confirmUnpair() {
    Alert.alert('End partnership?', 'Sharing stops straight away and what was shared is deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => p.unpair(p.partnership.id) },
    ]);
  }

  const partnerName = p.partnership?.partnerFirstName || 'Your partner';

  return (
    <View style={styles.wrap}>
      {/* ── EMPTY: discovered, not buried ── */}
      {p.rowState === 'empty' && (
        <TouchableOpacity style={styles.row} onPress={() => setSheet(true)} accessibilityRole="button">
          <Ionicons name="people-outline" size={22} color={colors.primary} />
          <Text style={styles.rowTitle}>Train with a partner</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* ── PENDING ── */}
      {p.rowState === 'pending' && (
        <View style={styles.row}>
          <Ionicons name="hourglass-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.rowTitle}>Invitation sent. Waiting for your partner.</Text>
          <TouchableOpacity onPress={confirmUnpair} hitSlop={8}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── ENDED ── */}
      {p.rowState === 'ended' && (
        <View style={styles.row}>
          <Ionicons name="people-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.rowTitle}>Partnership ended.</Text>
          <TouchableOpacity onPress={() => setSheet(true)} hitSlop={8}>
            <Text style={styles.cancel}>New partner</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── ACTIVE / RESTING ── */}
      {(p.rowState === 'active' || p.rowState === 'resting') && (
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.name}>{partnerName}</Text>
            <TouchableOpacity onPress={confirmUnpair} hitSlop={10}>
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {p.rowState === 'resting' ? (
            <View style={styles.restRow}>
              <Ionicons name="moon-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.restText}>Resting this week</Text>
            </View>
          ) : (
            <Text style={styles.ticks}>{ticksLabel({ done: p.partnerWeek?.done, planned: p.partnerWeek?.planned })}</Text>
          )}

          <View style={styles.cardFoot}>
            {p.sharedStreak && sharedStreakLabel(p.sharedStreak) ? (
              <View style={styles.chip}><Text style={styles.chipText}>{sharedStreakLabel(p.sharedStreak)}</Text></View>
            ) : <View />}

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
          </View>

          {p.lastReceived ? (
            <Text style={styles.caption}>{partnerName} cheered you recently.</Text>
          ) : null}
        </View>
      )}

      {/* ── Privacy receipt sheet (§4.3, verbatim, identical both directions) ── */}
      <Modal visible={sheet} animationType="slide" transparent onRequestClose={() => setSheet(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <ScrollView contentContainerStyle={styles.sheetBody}>
              <Text style={styles.sheetTitle}>Training partners</Text>
              <Text style={styles.sheetLead}>You and your partner will each see, about each other:</Text>
              {[
                'Whether you trained this week. Ticks only, like 3 of 4.',
                'Your shared streak, counted in weeks.',
                'A recovery week or a break shows as "Resting". Never as a fail.',
                'Cheers you send each other. One tap, once a day.',
              ].map((t) => (
                <View key={t} style={styles.bullet}><Text style={styles.yes}>✓</Text><Text style={styles.bulletText}>{t}</Text></View>
              ))}
              <Text style={styles.sheetLead}>Neither of you will ever see the other&apos;s:</Text>
              {[
                'Weights lifted, sets, reps or any session detail',
                'Body weight, measurements or photos',
                'Food, calories or anything from the diary',
                'Check-ins or anything said to the coach',
                'Location',
              ].map((t) => (
                <View key={t} style={styles.bullet}><Text style={styles.no}>✕</Text><Text style={styles.bulletText}>{t}</Text></View>
              ))}
              <Text style={styles.fine}>
                Either of you can end this at any time. Sharing stops straight away and what was shared is deleted.
                The other person sees only &quot;Partnership ended&quot;.
              </Text>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Share a consistency streak</Text>
                <Switch value={streakOn} onValueChange={setStreakOn}
                  trackColor={{ true: colors.primary, false: colors.border }} />
              </View>

              {!p.canAdd && (
                <Text style={styles.cap}>You can have one partner on Free. Go Pro for up to three.</Text>
              )}

              <TouchableOpacity
                style={[styles.primary, (busy || !p.canAdd) && styles.primaryDisabled]}
                onPress={handleCreate} disabled={busy || !p.canAdd} accessibilityRole="button"
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
                <TouchableOpacity style={styles.codeBtn} onPress={handleRedeem} disabled={busy || !code.trim()}>
                  <Text style={styles.codeBtnText}>Join</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => setSheet(false)} style={styles.notNow}>
                <Text style={styles.notNowText}>Not now</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderSubtle, padding: spacing.md,
  },
  rowTitle: { flex: 1, color: colors.text, fontSize: fontSize.md },
  cancel: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderSubtle, padding: spacing.md, gap: spacing.sm,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  ticks: { color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.heavy, fontVariant: ['tabular-nums'] },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  restText: { color: colors.textSecondary, fontSize: fontSize.md },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  chip: { backgroundColor: withAlpha(colors.primary, 0.12), borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  chipText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  cheerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 44,
  },
  cheerBtnDone: { backgroundColor: colors.surfaceAlt || withAlpha(colors.border, 0.25) },
  cheerText: { color: colors.onPrimary, fontWeight: fontWeight.bold, fontSize: fontSize.sm },
  cheerTextDone: { color: colors.textSecondary },
  caption: { color: colors.textSecondary, fontSize: fontSize.sm },

  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '92%' },
  sheetBody: { padding: spacing.lg, gap: spacing.sm },
  sheetTitle: { color: colors.text, fontSize: fontSize.xxl, fontWeight: fontWeight.black, marginBottom: spacing.xs },
  sheetLead: { color: colors.textSecondary, fontSize: fontSize.md, marginTop: spacing.sm },
  bullet: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  yes: { color: colors.success, fontWeight: fontWeight.heavy, width: 18 },
  no: { color: colors.warning, fontWeight: fontWeight.heavy, width: 18 },
  bulletText: { flex: 1, color: colors.text, fontSize: fontSize.md },
  fine: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.sm },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  toggleLabel: { color: colors.text, fontSize: fontSize.md },
  cap: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.sm },
  primary: { backgroundColor: colors.primary, borderRadius: radius.lg, alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.md, minHeight: 50, justifyContent: 'center' },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { color: colors.onPrimary, fontWeight: fontWeight.heavy, fontSize: fontSize.md },
  orLabel: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.md },
  codeRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  codeInput: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.text, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 44 },
  codeBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, justifyContent: 'center', minHeight: 44 },
  codeBtnText: { color: colors.primary, fontWeight: fontWeight.bold },
  notNow: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
  notNowText: { color: colors.textSecondary, fontSize: fontSize.md },
});
