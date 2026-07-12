/**
 * CascadeGateScreen
 *
 * Modal surface a user sees at the cascade decision points:
 *   * Day 14 (trial end): pro trial winding down ("Stay on Pro" vs Free)
 *   * Payment failure: 3-day grace banner overlay (Stay vs Drop)
 *
 * The trial is 14 days and 'day14' is the one real gate; 'day21'/'day28'
 * are accepted as legacy synonyms from the retired 3-tier cascade (E10-F6).
 *
 * Layout locked in UI_FLOWS_LOCKED.md lines 229-246 +
 * SUBSCRIPTION_AND_PAYMENT_LOCKED.md lines 305-326.
 *
 * Copy variants pulled from OPEN_QUESTIONS_RESOLVED.md Q3.
 *
 * Navigation params:
 *   variant: 'day14' | 'payment_failure' (legacy 'day21'/'day28' accepted)
 *   pricingWindow: 'open_beta'|'founders'|'standard'  (defaults via
 *     getCurrentPricingWindow; may be passed for SSR / preview)
 *
 * Returns control to the previous screen on any decision tap. Closing
 * via the X surfaces a "Decide later" no-op (user remains in their
 * current trial state; the next gate fires the same screen again).
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, radius } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Button from '../components/Button';
import BillingPeriodSelector from '../components/BillingPeriodSelector';
import ModalHeader from '../components/ModalHeader';
import { useToast } from '../components/Toast';
import * as cascade from '../lib/payments/cascade';
import * as playBilling from '../lib/payments/playBilling';
import { skuFor } from '../lib/payments/catalogue';
import { usePlayPrices } from '../lib/payments/usePlayPrices';
import { storeName } from '../lib/storeName';
import { logError, logInfo } from '../lib/errorLog';
import { audit } from '../lib/observability';
import { track as trackEvent } from '../lib/engineTelemetry';
import { getRecapData, getWeeklyPRCount } from '../lib/database';
import { localWeekStartMs } from '../lib/dayKey';
import useAppStore from '../store/useAppStore';

// C5 / D72 (2026-07-11): a factual training recap above the trial-end choice.
// RECAP_MIN_SESSIONS is the founder-set floor: below it the block is entirely
// absent (never a thin recap). TRIAL_MS is the cardless trial length; the recap
// window is [proTrialEndsAt - TRIAL_MS, proTrialEndsAt), read via getRecapData.
// See docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md (D72).
const RECAP_MIN_SESSIONS = 3;
const TRIAL_MS = 14 * 86400000;
const WEEK_MS = 7 * 86400000;

/**
 * Build the single factual recap line for the trial-end gate.
 *
 * Training-mechanics facts only (D72): no weight, food, or outcome/body-change
 * language, so the line is identical for every user and reads no flag. Returns
 * null below the founder floor so the caller renders no block at all, and omits
 * the personal-bests segment entirely when there are none.
 *
 * @param {{ totalSessions:number, totalSets:number, uniqueExercises:number, prCount:number }} p
 * @returns {string|null} e.g. "12 workouts · 96 sets · 9 exercises · 4 personal bests"
 */
export function buildTrialRecapLine({ totalSessions, totalSets, uniqueExercises, prCount } = {}) {
  const sessions = Number(totalSessions) || 0;
  if (sessions < RECAP_MIN_SESSIONS) return null;
  const sets = Number(totalSets) || 0;
  const exercises = Number(uniqueExercises) || 0;
  const prs = Number(prCount) || 0;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const parts = [
    plural(sessions, 'workout', 'workouts'),
    plural(sets, 'set', 'sets'),
    plural(exercises, 'exercise', 'exercises'),
  ];
  if (prs > 0) parts.push(plural(prs, 'personal best', 'personal bests'));
  return parts.join(' · ');
}

// 2-tier model (founder override 2026-05-25): one trial-end gate, plus the
// payment-failure overlay. M-3 (2026-06-06): the trial is 14+7, so 'day14' is
// the canonical variant; 'day21'/'day28' are accepted as synonyms so stale
// navigation calls don't crash. All render the same trial-end surface.

function _variantContent(variant) {
  switch (variant) {
    case 'upgrade':
      // A free / never-started user choosing to go Pro for the first time.
      // The trial-end "winding down" copy is wrong here: there is no trial
      // running, so frame it as going Pro. No "Drop to Free" option, the
      // user is already on Free; the close button dismisses.
      return {
        title: 'Go Pro',
        subtitle: 'Pro keeps the weekly coaching and the food log. Free keeps your data and safety checks, but some features stay view-only.',
        primaryCta: 'Go Pro',
        primaryTarget: 'pro',
        secondaryCta: null,
        secondaryTarget: null,
        tertiaryCta: null,
        tertiaryTarget: null,
        surface: 'subscription_upgrade_gate',
      };
    case 'day14':
    case 'day21':   // legacy synonym
    case 'day28':   // legacy synonym
      return {
        title: 'Your Pro trial is winding down',
        subtitle: "Pro keeps the weekly coaching and the food log. Free keeps your data and safety checks, but some features become view-only.",
        primaryCta: 'Stay on Pro',
        primaryTarget: 'pro',
        secondaryCta: null,
        secondaryTarget: null,
        tertiaryCta: 'Drop to Free',
        tertiaryTarget: 'free',
        surface: 'cascade_trial_end_gate',
      };
    case 'payment_failure':
      return {
        title: "We couldn't take your payment",
        subtitle: `Update your billing in ${storeName()} within 3 days to keep your current features. After that you'll drop to Free.`,
        primaryCta: 'Open billing settings',
        primaryTarget: 'billing',
        secondaryCta: null,
        secondaryTarget: null,
        tertiaryCta: 'Decide later',
        tertiaryTarget: null,
        surface: 'payment_failure_gate',
      };
    default:
      return null;
  }
}

export default function CascadeGateScreen({ navigation, route }) {
  const toast = useToast();
  const variant = route?.params?.variant ?? 'day14';
  // Flat pricing (2026-06-06): the choice is billing period. Monthly by
  // default; the toggle below lets the user pick annual at the gate.
  const [period, setPeriod] = useState(route?.params?.period === 'annual' ? 'annual' : 'monthly');
  const content = _variantContent(variant);
  const [busy, setBusy] = useState(null);  // which CTA is in-flight
  const userId = useAppStore((s) => s.user?.id);
  // C5 / D72: the factual training-recap line, or null (below floor, off-surface,
  // or any load failure -> no block renders).
  const [recapLine, setRecapLine] = useState(null);
  // CP-10 batch G lane 1 (2026-07-11): live theme (src/hooks/useTheme.js).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);

  // Fire the paywall_shown impression once per mount (mirrors HomeScreen's
  // call signature), tagging the cascade gate as the surface and its variant as
  // the trigger. The ref guards a re-render / strict-mode double-invoke from
  // re-sending the same view; the decision taps still emit their own cascade
  // telemetry through the payments layer.
  const shownRef = useRef(false);
  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    if (userId) {
      trackEvent(userId, 'paywall_shown', {
        surface: 'cascade_gate',
        trigger: variant,
      }).catch(() => {});
    }
    // Once per mount: intentionally no deps so a re-render never re-sends it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // C5 / D72 (2026-07-11): load the factual training recap for the trial-end
  // variant only. Render-only decoration above the choice; it touches no
  // purchase logic and is fully best-effort, so any failure renders nothing
  // rather than delaying or breaking the gate. Training-mechanics facts only,
  // so the block is flag-invariant and identical for every user (nothing
  // weight- or food-adjacent is read or shown). PBs sum getWeeklyPRCount over
  // the window's Monday-local weeks (the app's one PB definition).
  useEffect(() => {
    if (content?.surface !== 'cascade_trial_end_gate' || !userId) return undefined;
    let cancelled = false;
    (async () => {
      // Dual-key read mirroring HomeScreen.js:486 (camelCase | snake_case).
      // The cloud column is timestamptz, so the store usually holds an ISO
      // string, not epoch ms; coerce the way scheduler.js does or the block
      // would never render for a real user.
      const profile = useAppStore.getState().userProfile;
      const raw = profile?.proTrialEndsAt ?? profile?.pro_trial_ends_at ?? null;
      const endsAt = typeof raw === 'number' ? raw : Date.parse(raw ?? '');
      if (!Number.isFinite(endsAt)) return;
      const startMs = endsAt - TRIAL_MS;
      const endMs = endsAt;
      const recap = await getRecapData(userId, { startMs, endMs });
      let prCount = 0;
      for (let ws = localWeekStartMs(startMs); ws < endMs; ws += WEEK_MS) {
        // eslint-disable-next-line no-await-in-loop
        prCount += await getWeeklyPRCount(userId, ws);
      }
      if (cancelled) return;
      setRecapLine(buildTrialRecapLine({
        totalSessions: recap?.totalSessions ?? 0,
        totalSets: recap?.totalSets ?? 0,
        uniqueExercises: recap?.uniqueExercises ?? 0,
        prCount,
      }));
    })().catch(() => { /* best-effort: a recap must never delay or break the gate */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.surface, userId]);

  // C-2 / PLAY-002: localised store prices. priceFor returns null until the
  // active store responds; the chips show a short placeholder rather than a
  // hardcoded price.
  const priceFor = usePlayPrices();
  const monthlyPrice = priceFor('pro', 'monthly');
  const annualPrice = priceFor('pro', 'annual');

  const dismiss = useCallback(() => {
    if (navigation?.canGoBack?.()) navigation.goBack();
  }, [navigation]);

  const handlePay = useCallback(async (targetTier) => {
    audit('cascade.pay.tap', { targetTier, gateDay: variant });
    setBusy(targetTier);
    const sku = skuFor(targetTier, period);
    if (!sku) {
      logError('CascadeGate.skuMissing', new Error('sku not found'), {
        targetTier, period,
      });
      toast.show("Couldn't load the subscription option, try again later", { variant: 'error' });
      setBusy(null);
      return;
    }
    try {
      // Initiate purchase. The webhook posts back the tier change;
      // we also call cascade.payAt optimistically so the local state
      // updates immediately (idempotent, webhook will reconcile).
      const purchaseResult = await playBilling.purchasePackage(sku.id);
      const ref = purchaseResult?.transactionId ?? `client_${Date.now()}`;
      await cascade.payAt(targetTier, ref, content.surface);
      // SUB-003: verify the token with Google and write Pro server-side,
      // AWAITED (not fire-and-forget) so a failed grant is surfaced. The
      // optimistic unlock from payAt holds, so a confirm failure never denies
      // the paid access; the Play RTDN push and the next cloud refresh
      // reconcile it.
      const confirm = await cascade.confirmPurchase({
        purchaseToken: purchaseResult?.purchaseToken, subscriptionId: sku.id,
      });
      if (!confirm.ok) {
        logError('CascadeGate.confirmPurchase', confirm.error ?? 'confirm_failed', { targetTier });
        toast.show('Payment received. Finishing activation, this can take a moment', { variant: 'info', duration: 5000 });
      }
      logInfo('CascadeGate.paid', `tier=${targetTier} sku=${sku.id}`);
      dismiss();
    } catch (e) {
      // Three outcomes to tell apart:
      //  - the user backed out, or re-opened the gate so a stale purchase
      //    bridge was superseded: benign, no toast, no Sentry issue;
      //  - the Play sheet closed without a result (timeout): let them retry
      //    without an alarming error;
      //  - anything else: a real failure worth logging + a warning toast.
      const code = e?.code ?? '';
      const msg = e?.message ?? '';
      if (code === 'E_USER_CANCELLED' || code === 'E_PURCHASE_SUPERSEDED' || /cancel|abort/i.test(msg)) {
        logInfo('CascadeGate.purchaseCancelled', `tier=${targetTier} code=${code || 'cancel'}`);
      } else if (code === 'E_PURCHASE_TIMEOUT') {
        logInfo('CascadeGate.purchaseTimedOut', `tier=${targetTier}`);
        toast.show('Purchase did not finish. Try again.', { variant: 'warning', duration: 4000 });
      } else {
        logError('CascadeGate.purchaseFailed', e, { targetTier });
        toast.show('Purchase did not complete. Try again or pick a different option', { variant: 'warning', duration: 5000 });
      }
    } finally {
      setBusy(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, content?.surface, dismiss]);

  const handleSkip = useCallback(async (targetTier) => {
    audit('cascade.skip.tap', { targetTier, gateDay: variant });
    setBusy(targetTier ?? 'skip');
    try {
      if (targetTier === 'free') {
        await cascade.skipToFree(content.surface);
      } else if (targetTier === 'pro') {
        // Day-14 "Switch to Pro", choosing Pro now skips the
        // automatic complete→pro downgrade, with locked-in pricing.
        // For day14 we use skipToPro (user_skip → pro_trial_active).
        // For day28 there is no "Switch to Pro" option (already on
        // pro trial).
        await cascade.skipToPro(content.surface);
      }
      dismiss();
    } catch (e) {
      logError('CascadeGate.skip.threw', e, { targetTier });
    } finally {
      setBusy(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.surface, dismiss]);

  const handleBilling = useCallback(() => {
    // Deep link to platform-managed subscription page. Apple / Google
    // both require their own UI for billing updates.
    // expo Linking can open the iOS / Android subscription URLs.
    // eslint-disable-next-line global-require
    const { Linking, Platform } = require('react-native');
    const url = Platform.OS === 'ios'
      ? 'itms-apps://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
    Linking.openURL(url).catch((e) => {
      logError('CascadeGate.openBilling', e);
      toast.show("Couldn't open billing settings", { variant: 'error' });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!content) {
    return (
      <SafeAreaView style={[styles.safe, live.safe]}>
        <View style={styles.center}>
          <Text style={[styles.errorText, live.errorText]}>Unknown cascade variant: {variant}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <ModalHeader title="Subscription" onClose={dismiss} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, live.title]}>{content.title}</Text>
        <Text style={[styles.subtitle, live.subtitle]}>{content.subtitle}</Text>

        {/* C5 / D72: factual training recap, trial-end variant only. Render-only,
            not tappable, no accent. Training facts only, so it is identical for
            every user; absent below the floor or on any load failure. */}
        {recapLine && content.surface === 'cascade_trial_end_gate' ? (
          <View style={[styles.recapCard, live.recapCard]}>
            <Text style={[styles.recapTitle, live.recapTitle]}>During your trial</Text>
            <Text style={[styles.recapLine, live.recapLine]}>{recapLine}</Text>
          </View>
        ) : null}

        {/* TierComparisonStrip was a 3-tier Pro-vs-Complete strip;
            in the 2-tier model the gate is a single Pro / Free
            decision and the strip is dropped from this surface. */}

        {content.primaryTarget === 'pro' ? (
          <BillingPeriodSelector
            value={period}
            onChange={setPeriod}
            monthlyPrice={monthlyPrice}
            annualPrice={annualPrice}
            disabled={busy !== null}
            style={styles.periodSelector}
          />
        ) : null}

        <View style={styles.ctaStack}>
          {content.primaryTarget === 'billing' ? (
            <Button
              title={content.primaryCta}
              size="lg"
              disabled={busy !== null}
              onPress={handleBilling}
            />
          ) : content.primaryTarget ? (
            <Button
              title={content.primaryCta}
              size="lg"
              loading={busy === content.primaryTarget}
              disabled={busy !== null}
              onPress={() => handlePay(content.primaryTarget)}
            />
          ) : null}

          {content.secondaryCta && content.secondaryTarget === 'pro' ? (
            <Button
              title={content.secondaryCta}
              variant="secondary"
              loading={busy === 'pro'}
              disabled={busy !== null}
              onPress={() => handlePay('pro')}
            />
          ) : null}

          {content.tertiaryCta ? (
            <Button
              title={content.tertiaryCta}
              variant="tertiary"
              disabled={busy !== null}
              onPress={() => {
                if (content.tertiaryTarget === 'free') handleSkip('free');
                else dismiss();
              }}
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  periodSelector: { marginBottom: spacing.xl },
  // C5 / D72: neutral recap card (no accent), consistent with the screen's
  // surface ladder + hairline card edge. New keys only; frozen keys untouched.
  recapCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  recapTitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  recapLine: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  ctaStack: {
    gap: spacing.md,
  },
  errorText: { color: colors.error },
});

// CP-10 batch G lane 1 (2026-07-11): the frozen `styles` block above stays
// byte-identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/padding/gap/alignItems/justifyContent, no token) are correctly
// omitted -- there is nothing to unfreeze for them. No billing/purchase
// logic touched -- colours only.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    title: { color: t.colors.textPrimary, fontSize: t.fontSize.xxl },
    subtitle: { color: t.colors.textSecondary, fontSize: t.fontSize.md },
    errorText: { color: t.colors.error },
    // C5 / D72: mirror only the colour/fontSize-bearing sub-properties of the
    // recap keys (borderRadius/padding/margin are theme-invariant, so omitted).
    recapCard: { backgroundColor: t.colors.surfaceElevated, borderColor: t.colors.borderSubtle },
    recapTitle: { color: t.colors.textMuted, fontSize: t.fontSize.sm },
    recapLine: { color: t.colors.textSecondary, fontSize: t.fontSize.md },
  };
}
