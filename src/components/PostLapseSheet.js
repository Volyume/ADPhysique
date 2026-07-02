/**
 * PostLapseSheet — COMP-025-A Moment 2
 *
 * The one-time, first-app-open-after-lapse sheet. Catches store-settings
 * cancels that never passed through the in-app cancel sheet. Transactional and
 * factual: it states plainly that everything is saved and what stays free, then
 * asks the same single reason question ONLY if no reason was captured this
 * episode. Shown once per churn episode (winbackState.lapseSheetShown).
 *
 * Deliberately a one-time sheet, NOT a persistent Home banner (§4a) — it
 * respects COMP-027's "one big thing" Home hierarchy and never nags.
 *
 * Unlike Moment 1 there is no store handoff here (the lapse already happened);
 * the question is purely optional and "Done"/"Got it" dismisses either way.
 */

import { useState, useEffect, useCallback } from 'react';
import { Text, StyleSheet, AppState } from 'react-native';
import { colors, spacing, fontSize, fontWeight, type } from '../styles/theme';
import BottomSheet from './BottomSheet';
import Button from './Button';
import ReasonPicker from './ReasonPicker';
import useAppStore from '../store/useAppStore';
import { captureCancelReason } from '../lib/cancelReason';
import {
  shouldShowPostLapseSheet, getEpisode, markLapseSheetShown, markReasonCaptured,
} from '../lib/payments/winbackState';

const BODY = "Everything you logged is saved: training history, PRs, weigh-ins, and your food diary. Training, plans and progress stay free. You can export or back up everything any time in You, under Data.";

export default function PostLapseSheet({ visible, onClose, userId = null, askReason = false }) {
  const [reason, setReason] = useState(null);
  const [text, setText] = useState('');

  const selectReason = useCallback((key) => setReason(key), []);

  const handleDone = useCallback(() => {
    if (askReason) {
      const captured = captureCancelReason({ reason, text, userId, surface: 'post_lapse_sheet' });
      if (captured) markReasonCaptured();
    }
    // One-time: never show this episode's sheet again, whether or not a reason
    // was given.
    markLapseSheetShown();
    setReason(null);
    setText('');
    onClose?.();
  }, [askReason, reason, text, userId, onClose]);

  return (
    <BottomSheet
      visible={visible}
      onClose={handleDone}
      keyboardAvoiding
      accessibilityLabel="Your Pro subscription has ended"
    >
      <Text style={styles.title}>Your Pro subscription has ended</Text>
      <Text style={styles.body}>{BODY}</Text>

      {askReason ? (
        <>
          <Text style={styles.sub}>One quick question, if you have a moment. Optional.</Text>
          <ReasonPicker
            reason={reason}
            text={text}
            onSelectReason={selectReason}
            onChangeText={setText}
          />
        </>
      ) : null}

      <Button
        title={askReason ? 'Done' : 'Got it'}
        size="lg"
        onPress={handleDone}
      />
    </BottomSheet>
  );
}

/**
 * Mount once near the app root. Watches for an open churn episode whose sheet
 * hasn't been shown yet — on first app open after a lapse (cold start,
 * foreground, or the in-session tier flip to free) it surfaces the sheet a
 * single time.
 */
export function PostLapseSheetHost() {
  const [visible, setVisible] = useState(false);
  const [askReason, setAskReason] = useState(false);
  const userId = useAppStore(s => s.user?.id);
  const tier = useAppStore(s => s.tier);

  const check = useCallback(async () => {
    try {
      if (!(await shouldShowPostLapseSheet())) return;
      const ep = await getEpisode();
      setAskReason(!ep?.reasonCaptured);
      setVisible(true);
    } catch (_) { /* tolerate */ }
  }, []);

  // On mount + whenever the tier becomes free in-session (the lapse is detected
  // asynchronously after the tier refresh).
  useEffect(() => { check(); }, [check, tier]);

  // On foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => { try { sub?.remove?.(); } catch (_) {} };
  }, [check]);

  return (
    <PostLapseSheet
      visible={visible}
      askReason={askReason}
      userId={userId}
      onClose={() => setVisible(false)}
    />
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  body: {
    ...type.bodySm,
    color: colors.textSecondary,
  },
  sub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
