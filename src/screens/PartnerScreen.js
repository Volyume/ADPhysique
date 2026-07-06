/**
 * PartnerScreen, the premium partner destination (DESIGN-SPEC B2 to B7, Step B).
 *
 * The flagship connection surface. Every active pairing is its own isolated
 * PairCard (no cross-pair totals, no ordering by performance): a shared-streak
 * hero, both people as calm stacked rows, one cheer a day, a milestone moment
 * slot, and a shared-block chip. The empty state is the pitch: the privacy
 * receipt in full. The invite journey is a three-beat full-screen modal that
 * mints exactly one code. Manage lives in a bottom sheet.
 *
 * Constraints held here: tokens only (no hard-coded colours/sizes/durations),
 * motion via Reanimated on the UI thread (never JS-thread Animated), every
 * touchable role+labelled, British English, no em dash, no exclamation marks,
 * no guilt or urgency or counters-as-pressure. Resting never reads as a fail.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Share, ActivityIndicator, Linking, Platform, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  FadeInDown, useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import { appAlert } from '../components/AppAlert';
import {
  colors, spacing, radius, type, iconSize, hitSlop, withAlpha, alpha,
  motion, letterSpacing, stateColors, circle, fontWeight,
} from '../styles/theme';
import Card from '../components/Card';
import BackHeader from '../components/BackHeader';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import TextField from '../components/TextField';
import RollingNumber from '../components/RollingNumber';
import PartnerPrivacyReceipt from '../components/PartnerPrivacyReceipt';
import usePartners from '../hooks/usePartners';
import { getAllProgrammes } from '../lib/database';
import { parseInviteCode } from '../lib/partners/link';
import { ticksLabel } from '../lib/partners/signals';
import { ACKNOWLEDGEMENTS } from '../lib/partners/acknowledgements';
import { resolveIntention, KEPT_LINE, clampAim } from '../lib/partners/intention';
import { sharedStreakLabel } from '../lib/partners/sharedStreak';
import { buildPartnerSupportPlan } from '../lib/partners/supportPlan';
import {
  SHARE_WIN_CARD_RULES,
  SHARE_WIN_POLICY,
  buildShareWinExamplePreviews,
  buildShareWinReviewReceipt,
} from '../lib/partners/shareWins';
import { INVITE_EXPIRY_DAYS } from '../lib/partners/inviteCache';
import { PARTNER_PRIVACY_NOTICE_VERSION } from '../lib/partners/consent';
import { trackPartnerSurfaceView, trackInviteJourneyStep } from '../lib/partners/telemetry';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../components/Toast';
import { logError } from '../lib/errorLog';

// Milestone moments (DESIGN-SPEC B6). C3 delivers src/lib/partners/moments.js
// in parallel to the exact B6 contract. Consume it defensively so a not-yet-
// landed module degrades to "no moment shown" rather than making the whole
// screen un-mountable (the screen-mount harness mounts every screen). When the
// module is present it is used in full.
let momentsApi = { getVisibleMoments: async () => [], markMomentSeen: async () => {} };
try {
  // eslint-disable-next-line global-require, import/no-unresolved
  const m = require('../lib/partners/moments');
  if (m && typeof m.getVisibleMoments === 'function') momentsApi = m;
} catch (_) { /* lands with C3; until then, no moments */ }

const PRO_MAX_PAIRS = 3;
// Persisted dismissal of the archived-streak reconnection surface, so it never
// nags: once dismissed for a pair it stays hidden across launches (D5-B3).
const RECONNECT_DISMISS_KEY = '@volyume_partner_reconnect_dismissed_v1';
const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
function spellNumber(n) {
  const i = Math.round(Number(n) || 0);
  return NUM_WORDS[i] ?? String(i);
}

function initialForName(name) {
  const text = typeof name === 'string' ? name.trim() : '';
  return (text[0] || 'P').toUpperCase();
}

// One person's calm week line. Resting reads exactly "resting this week" and
// never as a fail; a counted week reuses ticksLabel ("3 of 4").
function weekPhrase(name, week, resting) {
  if (resting) return `${name}: resting this week`;
  const hasPlan = Number(week?.planned) > 0;
  return `${name}: ${ticksLabel({ done: week?.done, planned: week?.planned })}${hasPlan ? ' this week' : ''}`;
}

function cheerFailureMessage(error) {
  if (error === 'not_active') {
    return 'That partnership is no longer active. Refresh Partners and try again.';
  }
  if (error === 'insert_failed' || error === 'server_misconfigured') {
    return 'Partner cheers are not available right now. Try again later.';
  }
  return 'Could not send that cheer. Check your connection and try again.';
}

// ── Small motion helpers (Reanimated, reduce-motion aware) ──

function EntranceView({ children, duration, style }) {
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  if (reduceMotion) return <View style={style}>{children}</View>;
  let entering;
  try { entering = FadeInDown.duration(duration); } catch (_) { return <View style={style}>{children}</View>; }
  return <Animated.View entering={entering} style={style}>{children}</Animated.View>;
}

function CheerPill({ enabled, onPress, style }) {
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  const pressIn = () => {
    if (reduceMotion) return;
    scale.value = withSpring(0.96, motion.springs.press);
    opacity.value = withTiming(0.9, { duration: motion.micro });
  };
  const pressOut = () => {
    if (reduceMotion) return;
    scale.value = withSpring(1, motion.springs.release);
    opacity.value = withTiming(1, { duration: motion.micro });
  };
  return (
    <Animated.View style={[styles.cheerWrap, style, animStyle]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={!enabled}
        activeOpacity={0.85}
        style={[styles.cheerPill, !enabled && styles.cheerPillDone]}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityState={{ disabled: !enabled }}
        accessibilityLabel={enabled ? 'Send a cheer' : 'Cheer sent today'}
      >
        <Ionicons name="hand-left" size={iconSize.sm} color={enabled ? colors.onPrimary : colors.textSecondary} />
        <Text style={[styles.cheerPillText, !enabled && styles.cheerPillTextDone]}>
          {enabled ? 'Send a cheer' : 'Sent today'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function PersonRow({ phrase, resting }) {
  return (
    <View style={styles.personRow}>
      <View style={[styles.dot, resting ? styles.dotResting : styles.dotActive]} />
      <Text style={styles.personText}>{phrase}</Text>
    </View>
  );
}

function MomentCard({ line, cheerEnabled, onCheer }) {
  return (
    <EntranceView duration={motion.state} style={styles.momentCard}>
      <Text style={styles.momentLine}>{line}</Text>
      <CheerPill enabled={cheerEnabled} onPress={onCheer} />
    </EntranceView>
  );
}

function blockStatusCopy(block, partnerName, userId) {
  const name = partnerName || 'Your partner';
  if (!block) return null;
  if (block.status === 'active') {
    return {
      title: 'Shared block label',
      copy: `${block.blockName} is shared by name only. Workouts, loading and notes stay private.`,
    };
  }
  if (block.status === 'proposed' && block.proposedBy === userId) {
    return {
      title: 'Label suggested',
      copy: `Waiting for ${name}. Only the block name is visible.`,
    };
  }
  if (block.status === 'proposed') {
    return {
      title: 'Label suggestion',
      copy: `${name} suggested ${block.blockName}. It will not change your plan.`,
    };
  }
  return null;
}

// D5-A weekly intention: each side's OWN aim, shown side by side and NEVER
// compared. A shared line when both aims match; otherwise each own aim on its
// own. Plus a calm control to set or change your own aim (intention, not
// obligation). No "must", no "target", no ranking language anywhere here.
function IntentionBlock({ pair, onSetAim }) {
  const name = pair.partnerFirstName || 'Your partner';
  const { shared, mine, theirs } = resolveIntention({
    myAim: pair.myAim, partnerAim: pair.partnerAim, partnerName: name,
  });
  return (
    <View style={styles.intention}>
      {shared ? <Text style={styles.intentionShared}>{shared}</Text> : null}
      {mine ? <Text style={styles.intentionOwn}>{mine}</Text> : null}
      {theirs ? <Text style={styles.intentionOwn}>{theirs}</Text> : null}
      <TouchableOpacity
        onPress={() => onSetAim(pair)}
        style={styles.intentionSet}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={pair.myAim > 0 ? 'Change this week\'s sessions' : 'Set this week\'s sessions'}
      >
        <Ionicons name="flag-outline" size={iconSize.sm} color={colors.primary} />
        <Text style={styles.intentionSetText}>
          {pair.myAim > 0 ? 'Change this week' : 'Set this week'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function PartnerSupportSnapshot({ pair, name }) {
  const hasBlock = pair.sharedBlock && (pair.sharedBlock.status === 'active' || pair.sharedBlock.status === 'proposed');
  const sharedRows = [
    'Your first name',
    'This week\'s training status',
    'This week\'s session target',
    'One fixed cheer a day',
    'Chosen wins you approve',
    hasBlock ? 'Shared block name' : null,
  ].filter(Boolean);
  const privateRows = [
    'Workout weights, sets and reps',
    'Food diary, coach notes and check-ins',
    'Body metrics and progress photos',
  ];
  return (
    <View style={styles.supportSnapshot}>
      <View style={styles.supportHead}>
        <Ionicons name="shield-checkmark-outline" size={iconSize.sm} color={colors.primary} />
        <Text style={styles.supportTitle}>What {name} can see</Text>
      </View>
      <View style={styles.supportGrid}>
        <View style={styles.supportCell}>
          <Text style={styles.supportLabel}>Shared</Text>
          {sharedRows.map((row) => (
            <View key={row} style={styles.supportBulletRow}>
              <View style={styles.supportDot} />
              <Text style={styles.supportText}>{row}</Text>
            </View>
          ))}
        </View>
        <View style={styles.supportCell}>
          <Text style={styles.supportLabel}>Private</Text>
          {privateRows.map((row) => (
            <View key={row} style={styles.supportBulletRow}>
              <View style={styles.supportDotMuted} />
              <Text style={styles.supportText}>{row}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.supportFoot}>
        This week: you {ticksLabel({ done: pair.myWeek?.done, planned: pair.myWeek?.planned })}. {name} {ticksLabel({ done: pair.partnerWeek?.done, planned: pair.partnerWeek?.planned })}. No ranking or comparison.
      </Text>
    </View>
  );
}

function PartnerSupportPlan({ pair, name, onSetAim, onCheer, onOpenShareWins }) {
  const plan = buildPartnerSupportPlan(pair, name);
  const onPrimary = () => {
    if (plan.primaryAction.key === 'set_aim') onSetAim(pair);
    else if (plan.primaryAction.key === 'cheer') onCheer(pair);
    else onOpenShareWins(pair);
  };
  return (
    <View style={styles.partnerWeekPanel}>
      <View style={styles.supportPlanHead}>
        <Ionicons name="people-outline" size={iconSize.sm} color={colors.primary} />
        <Text style={styles.supportPlanTitle}>{plan.title}</Text>
      </View>
      <Text style={styles.supportPlanHeadline}>{plan.headline}</Text>
      <View style={styles.supportPlanGrid}>
        {plan.steps.map((step) => (
          <View key={step.key} style={styles.supportPlanStep}>
            <View style={styles.supportPlanStepTop}>
              <Text style={styles.supportPlanStepLabel}>{step.label}</Text>
              <Text style={styles.supportPlanStepState}>{step.state}</Text>
            </View>
            <Text style={styles.supportPlanStepCopy}>{step.copy}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.supportPlanPrivacy}>{plan.privacyLine}</Text>
      <TouchableOpacity
        onPress={onPrimary}
        style={styles.supportPlanButton}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={plan.primaryAction.accessibilityLabel}
      >
        <Text style={styles.supportPlanButtonText}>{plan.primaryAction.label}</Text>
        <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

function PartnerShareWinsCard({ onOpen, partnerName }) {
  const name = partnerName || 'your partner';
  return (
    <TouchableOpacity
      onPress={onOpen}
      style={styles.shareWinsRow}
      activeOpacity={0.85}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel="Review shareable wins"
    >
      <View style={styles.shareWinsIcon}>
        <Ionicons name="trophy-outline" size={iconSize.sm} color={colors.primary} />
      </View>
      <View style={styles.shareWinsRowCopy}>
        <Text style={styles.shareWinsTitle}>Share wins</Text>
        <Text style={styles.shareWinsText}>
          Send one chosen card to {name}. You approve it first. No feed.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.primary} />
    </TouchableOpacity>
  );
}

function formatWinCardDate(ms) {
  if (!ms) return '';
  try {
    return new Date(Number(ms)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch (_) {
    return '';
  }
}

function PartnerWinCards({ cards = [], userId, onRevoke }) {
  const visible = (cards || []).filter((card) => !card.revokedAt).slice(0, 3);
  if (!visible.length) return null;
  return (
    <View style={styles.partnerWins}>
      <Text style={styles.partnerWinsTitle}>Shared wins</Text>
      {visible.map((card) => {
        const mine = card.senderId === userId;
        const date = formatWinCardDate(card.createdAt);
        return (
          <View key={card.id} style={styles.partnerWinCard}>
            <View style={styles.partnerWinTop}>
              <Text style={styles.partnerWinMeta}>{mine ? 'You shared' : 'Partner shared'}{date ? ` - ${date}` : ''}</Text>
              {mine ? (
                <TouchableOpacity
                  onPress={() => onRevoke(card)}
                  hitSlop={hitSlop}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete shared win ${card.title}`}
                >
                  <Text style={styles.partnerWinDelete}>Delete</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={styles.partnerWinTitle}>{card.title}</Text>
            <Text style={styles.partnerWinSummary}>{card.summary}</Text>
            <Text style={styles.partnerWinDetail}>{card.detail}</Text>
          </View>
        );
      })}
    </View>
  );
}

// D5-B3 reconnection surface: shown only when the shared run has archived. One
// tap reaches out (opens the acknowledgement picker); dismissable and never
// nagging (the dismissal persists). Reuses the existing archived copy.
function ReconnectCard({ onReconnect, onDismiss }) {
  return (
    <View style={styles.reconnect}>
      <TouchableOpacity
        style={styles.reconnectMain}
        onPress={onReconnect}
        accessibilityRole="button"
        accessibilityLabel="Start a new run together"
      >
        <Ionicons name="refresh-outline" size={iconSize.sm} color={colors.primary} />
        <Text style={styles.reconnectText}>{sharedStreakLabel({ run: 0, status: 'archived' })}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onDismiss}
        style={styles.reconnectDismiss}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Not now"
      >
        <Text style={styles.reconnectDismissText}>Not now</Text>
      </TouchableOpacity>
    </View>
  );
}

function BlockStatusCard({ block, partnerName, userId, onOpen }) {
  const status = blockStatusCopy(block, partnerName, userId);
  if (!status) return null;
  return (
    <TouchableOpacity
      style={styles.blockStatusCard}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Shared block label, ${status.title}`}
    >
      <View style={styles.blockStatusHead}>
        <Ionicons name="barbell-outline" size={iconSize.sm} color={colors.primary} />
        <Text style={styles.blockStatusTitle}>{status.title}</Text>
      </View>
      <Text style={styles.blockStatusName} numberOfLines={1}>{block.blockName}</Text>
      <Text style={styles.blockStatusCopy}>{status.copy}</Text>
      <View style={styles.blockStatusAction}>
        <Text style={styles.blockStatusActionText}>Manage label</Text>
        <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

function PairCard({
  pair, moment, onCheer, onManage, onOpenBlock, onSetAim, onReconnect,
  reconnectDismissed, onDismissReconnect, onOpenShareWins, onRevokeWin, userId,
}) {
  const name = pair.partnerFirstName || 'Your partner';
  const run = pair.sharedStreak?.run ?? 0;
  const showHero = run >= 2;
  const myResting = pair.myWeek?.state === 'resting';
  const partnerResting = pair.rowState === 'resting';
  const block = pair.sharedBlock;
  const hasChip = block && (block.status === 'active' || block.status === 'proposed');
  const showReconnect = pair.sharedStreak?.status === 'archived' && !reconnectDismissed;

  return (
    <Card style={styles.pairCard} tone="primary">
      <View style={styles.pairHead}>
        <View style={styles.partnerIdentity}>
          <View style={styles.partnerAvatar}>
            <Text style={styles.partnerAvatarText}>{initialForName(name)}</Text>
          </View>
          <View style={styles.partnerNameBlock}>
            <Text style={styles.pairName} numberOfLines={1}>{name}</Text>
            <Text style={styles.pairKicker}>Private partner space</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => onManage(pair)}
          style={styles.ellipsis}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel={`Manage partnership with ${name}`}
        >
          <Ionicons name="ellipsis-horizontal" size={iconSize.md} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.partnerStatusBand}>
        {showHero ? (
          <View style={styles.hero}>
            <View style={styles.heroRow}>
              <RollingNumber
                value={run}
                grouped={false}
                style={styles.heroNum}
                accessibilityLabel={`${run} weeks running together`}
              />
              <Text style={styles.heroWord}>weeks running, together</Text>
            </View>
            <Text style={styles.heroSub}>
              Counted in weeks you both trained against your own plans. Resting never breaks it.
            </Text>
          </View>
        ) : (
          <Text style={styles.heroFirst}>Your first shared week is under way.</Text>
        )}

        <View style={styles.people}>
          <PersonRow phrase={weekPhrase('You', pair.myWeek, myResting)} resting={myResting} />
          <PersonRow phrase={weekPhrase(name, pair.partnerWeek, partnerResting)} resting={partnerResting} />
        </View>

        <IntentionBlock pair={pair} onSetAim={onSetAim} />
      </View>

      {showReconnect ? (
        <ReconnectCard onReconnect={() => onReconnect(pair)} onDismiss={() => onDismissReconnect(pair)} />
      ) : null}

      <PartnerSupportPlan
        pair={pair}
        name={name}
        onSetAim={onSetAim}
        onCheer={onCheer}
        onOpenShareWins={onOpenShareWins}
      />

      <PartnerSupportSnapshot pair={pair} name={name} />

      <View style={styles.partnerShareSection}>
        <PartnerShareWinsCard onOpen={() => onOpenShareWins(pair)} partnerName={name} />
        <PartnerWinCards cards={pair.winCards || []} userId={userId} onRevoke={onRevokeWin} />
      </View>

      {pair.weekKept ? <Text style={styles.keptLine}>{KEPT_LINE}</Text> : null}

      {hasChip ? (
        <BlockStatusCard
          block={block}
          partnerName={name}
          userId={userId}
          onOpen={() => onOpenBlock(pair)}
        />
      ) : null}

      {moment ? (
        <MomentCard line={moment.line} cheerEnabled={pair.cheerEnabled} onCheer={() => onCheer(pair)} />
      ) : null}

      {/* The moment IS that day's cheer surface (it carries its own pill), so
          the standing cheer row is hidden while a moment shows; it returns as
          the pair's cheer affordance when no moment is visible. */}
      {moment ? null : (
        <CheerPill enabled={pair.cheerEnabled} onPress={() => onCheer(pair)} style={styles.cheerRowAlign} />
      )}
    </Card>
  );
}

function SheetRow({ icon, label, danger, onPress }) {
  return (
    <TouchableOpacity
      style={styles.sheetRow}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={iconSize.md} color={danger ? colors.error : colors.textPrimary} />
      <Text style={[styles.sheetRowText, danger && styles.sheetRowDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ProgressDots({ active }) {
  return (
    <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[1, 2, 3].map((n) => (
        <View key={n} style={[styles.progressDot, n === active ? styles.progressDotOn : styles.progressDotOff]} />
      ))}
    </View>
  );
}

export default function PartnerScreen({ route }) {
  const { user, tier } = useAppStore(useShallow((s) => ({ user: s.user, tier: s.tier })));
  const toast = useToast();
  const p = usePartners(user?.id, tier);

  // Invite journey (three-beat full-screen modal).
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [beat, setBeat] = useState(1);
  const [minting, setMinting] = useState(false);
  const [mintedInvite, setMintedInvite] = useState(null); // the ONE minted code

  // Empty-state code entry (the "I have a code" path).
  const [codeEntryOpen, setCodeEntryOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  // Manage sheet + shared-block sheet, each scoped to one pair.
  const [managePair, setManagePair] = useState(null);
  const [blockSheetPair, setBlockSheetPair] = useState(null);
  const [programmes, setProgrammes] = useState(null);

  // D5-A weekly intention sheet (a stepper) + D5-B1 acknowledgement picker, each
  // scoped to one pair. reconnectDismissed is the persisted set of pairs whose
  // archived-streak reconnection surface has been dismissed (D5-B3).
  const [aimSheetPair, setAimSheetPair] = useState(null);
  const [aimValue, setAimValue] = useState(1);
  const [ackSheetPair, setAckSheetPair] = useState(null);
  const [shareWinsPair, setShareWinsPair] = useState(null);
  const [reconnectDismissed, setReconnectDismissed] = useState([]);

  // Milestone moments, indexed by pair (at most one per pair per local day).
  const [momentsByPair, setMomentsByPair] = useState({});
  const momentsRef = useRef({});
  const seenRef = useRef(new Set());

  const source = route?.params?.source;
  const incomingShareWinType = route?.params?.shareWinType;
  const incomingShareWinPayload = route?.params?.shareWinPayload;
  const incomingProgressCardPayload = route?.params?.progressCardSharePayload;
  const hasIncomingShareIntent = !!(incomingShareWinType || incomingProgressCardPayload);
  const incomingCode = route?.params?.code ? parseInviteCode(route.params.code) : null;
  const handledCodeRef = useRef(null);
  const shareWinsRouteHandledRef = useRef(null);

  // Surface-view telemetry, once on mount.
  useEffect(() => {
    trackPartnerSurfaceView(source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the persisted reconnection-dismissal set once (D5-B3: never nag).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECONNECT_DISMISS_KEY);
        const list = raw ? JSON.parse(raw) : [];
        if (alive && Array.isArray(list)) setReconnectDismissed(list.filter((x) => typeof x === 'string'));
      } catch (_) { /* default: nothing dismissed */ }
    })();
    return () => { alive = false; };
  }, []);

  const dismissReconnect = useCallback(async (pair) => {
    setReconnectDismissed((prev) => {
      if (prev.includes(pair.id)) return prev;
      const next = [...prev, pair.id];
      AsyncStorage.setItem(RECONNECT_DISMISS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // Journey-step telemetry on each beat while the modal is open.
  useEffect(() => {
    if (journeyOpen) trackInviteJourneyStep(beat);
  }, [journeyOpen, beat]);

  // Load the day's visible moments once the pairs are known. Best-effort: a
  // failed or absent moments module simply shows no moment.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await momentsApi.getVisibleMoments(user?.id);
        if (!alive) return;
        const byPair = {};
        for (const mo of (list || [])) if (mo && mo.pairId && !byPair[mo.pairId]) byPair[mo.pairId] = mo;
        momentsRef.current = byPair;
        setMomentsByPair(byPair);
      } catch (_) { /* moments are best-effort */ }
    })();
    return () => { alive = false; };
  }, [user?.id, p.pairs?.length]);

  // Seen-on-unmount: any moment still displayed when the screen leaves is
  // marked seen so it never returns (DESIGN-SPEC B6).
  useEffect(() => () => {
    for (const mo of Object.values(momentsRef.current)) {
      if (mo && !seenRef.current.has(mo.id)) {
        seenRef.current.add(mo.id);
        momentsApi.markMomentSeen(mo.id).catch(() => {});
      }
    }
  }, []);

  // Deep-link auto-redeem: opening an invite link is explicit intent to accept.
  // Fires once per distinct code, only when there is room to add a partner.
  useEffect(() => {
    if (!incomingCode || p.loading) return;
    if (handledCodeRef.current === incomingCode) return;
    setCode(incomingCode);
    if (!p.canAdd) return;
    handledCodeRef.current = incomingCode;
    handleRedeem(incomingCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingCode, p.loading, p.canAdd]);

  useEffect(() => {
    if (!incomingShareWinType || p.loading) return;
    const firstPair = (p.pairs || [])[0];
    if (!firstPair) return;
    const marker = [
      incomingShareWinType,
      incomingShareWinPayload?.workoutName || incomingShareWinPayload?.liftName || incomingShareWinPayload?.recordLabel || '',
      incomingProgressCardPayload?.dateRange || '',
      incomingProgressCardPayload?.format || '',
      incomingProgressCardPayload?.label || '',
      incomingProgressCardPayload?.includesWeight === true ? 'weight' : 'no-weight',
      incomingProgressCardPayload?.includesScanScore === true ? 'scan' : 'no-scan',
    ].join('|');
    if (shareWinsRouteHandledRef.current === marker) return;
    shareWinsRouteHandledRef.current = marker;
    setShareWinsPair(firstPair);
  }, [incomingShareWinType, incomingShareWinPayload, incomingProgressCardPayload, p.loading, p.pairs]);

  // ── Invite journey ──
  function openJourney() {
    setMintedInvite(null);
    setBeat(1);
    setJourneyOpen(true);
  }
  function closeJourney() {
    // Closing mints nothing beyond what "Agree" already minted.
    setJourneyOpen(false);
    setBeat(1);
    setMintedInvite(null);
  }

  async function agreeAndMint() {
    if (minting || !p.canAdd) return;
    setMinting(true);
    const r = await p.invite(); // single-mint: reuses the one active code
    setMinting(false);
    if (!r.ok) {
      logError('PartnerScreen.agreeAndMint', new Error(r.error || 'unknown'), { userId: user?.id });
      toast.show('Could not create an invite. Check your connection and try again.', { variant: 'error' });
      return;
    }
    setMintedInvite(r.data);
    setBeat(3);
  }

  // Every share channel reuses the ONE minted code. Dismiss to the pending
  // state once a share fires.
  async function shareVia(target) {
    const data = mintedInvite;
    if (!data) return;
    const message = data.shareMessage;
    const body = encodeURIComponent(message);
    let url;
    if (target === 'sms') {
      url = Platform.OS === 'ios' ? `sms:&body=${body}` : `sms:?body=${body}`;
    } else if (target === 'whatsapp') {
      url = `whatsapp://send?text=${body}`;
    } else {
      const subject = encodeURIComponent('Train with me on Volyume');
      url = `mailto:?subject=${subject}&body=${body}`;
    }
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
      else await Share.share({ message });
    } catch (e) {
      logError('PartnerScreen.shareVia', e, { userId: user?.id, target });
      try { await Share.share({ message }); } catch (_) { /* user dismissed */ }
    }
    closeJourney();
    p.reload();
  }

  async function shareMore() {
    const data = mintedInvite;
    if (!data) return;
    try { await Share.share({ message: data.shareMessage }); } catch (_) { /* user dismissed */ }
    closeJourney();
    p.reload();
  }

  async function sharePendingInvite() {
    const r = await p.invite();
    if (!r.ok || !r.data?.shareMessage) {
      logError('PartnerScreen.sharePendingInvite', new Error(r.error || 'unknown'), { userId: user?.id });
      toast.show('Could not share the invite. Check your connection and try again.', { variant: 'error' });
      return;
    }
    try { await Share.share({ message: r.data.shareMessage }); } catch (_) { /* user dismissed */ }
    p.reload();
  }

  // ── Redeem ──
  async function handleRedeem(incoming) {
    const raw = typeof incoming === 'string' ? incoming : code;
    const toRedeem = parseInviteCode(raw);
    if (!toRedeem) {
      toast.show('Enter a valid Volyume invite code or link.', { variant: 'error' });
      return;
    }
    setCode(toRedeem);
    setBusy(true);
    const r = await p.redeem(toRedeem);
    setBusy(false);
    if (!r.ok) {
      if (r.error === 'at_cap') {
        toast.show('You are at your partner limit.', { variant: 'error' });
      } else if (r.error === 'consent_failed') {
        toast.show('We could not record your agreement to share. Please try again.', { variant: 'error' });
      } else {
        toast.show('That invite did not work. It may have expired or already been used.', { variant: 'error' });
      }
      return;
    }
    setCode('');
    setCodeEntryOpen(false);
    toast.show('Partner connected', { variant: 'success' });
  }

  // ── Cheer (D5-B1: pick a fixed acknowledgement, no free text) ──
  // The cheer affordance opens the acknowledgement picker rather than sending
  // silently. The actual send happens once the sender picks a line.
  function openAckSheet(pair) {
    if (!pair?.cheerEnabled) return;
    setAckSheetPair(pair);
  }

  function consumeMoment(pair) {
    const mo = momentsRef.current[pair.id];
    if (mo && !seenRef.current.has(mo.id)) {
      seenRef.current.add(mo.id);
      momentsApi.markMomentSeen(mo.id).catch(() => {});
      const next = { ...momentsRef.current };
      delete next[pair.id];
      momentsRef.current = next;
      setMomentsByPair(next);
    }
  }

  async function handleSendAck(pair, kind) {
    setAckSheetPair(null);
    if (!pair?.cheerEnabled) return;
    const reciprocal = pair.partnerWeek?.weekMet || (pair.partnerWeek?.done > 0);
    const r = await p.cheer(pair.id, kind, !!reciprocal);
    // Consuming the day's cheer also consumes the pair's moment, but only once
    // the send actually succeeds or the server says today's cheer exists.
    if (r?.ok || r?.error === 'already_cheered') consumeMoment(pair);
    if (!r?.ok && r?.error !== 'already_cheered') {
      logError('PartnerScreen.handleSendAck', new Error(r?.error || 'unknown'), { userId: user?.id });
      toast.show(cheerFailureMessage(r?.error), { variant: 'error' });
    }
  }

  async function handleSendWin(pair, preview) {
    const r = await p.shareWin(pair.id, preview);
    if (r?.ok) {
      toast.show('Win shared with your partner', { variant: 'success' });
      return r;
    }
    if (r?.error === 'win_cards_unavailable') {
      toast.show('Partner win sharing needs the latest cloud update.', { variant: 'error' });
    } else {
      toast.show('Could not share that win. Check your connection and try again.', { variant: 'error' });
    }
    return r;
  }

  async function handleRevokeWin(card) {
    if (!card?.id) return;
    const r = await p.revokeWin(card.id);
    if (r?.ok) {
      toast.show('Shared win deleted', { variant: 'success' });
    } else if (r?.error === 'win_cards_unavailable') {
      toast.show('Partner win sharing needs the latest cloud update.', { variant: 'error' });
    } else {
      toast.show('Could not delete that win. Check your connection and try again.', { variant: 'error' });
    }
  }

  // ── Weekly intention (D5-A) ──
  function openAimSheet(pair) {
    // Default to the member's own aim, or their existing weekly planned count,
    // clamped to a sane 1..14. Confirming is a one-tap "aim", not an obligation.
    const planned = Number(pair.myWeek?.plannedCount) || Number(pair.myWeek?.planned) || 0;
    setAimValue(clampAim(pair.myAim > 0 ? pair.myAim : (planned || 3)));
    setAimSheetPair(pair);
  }

  async function confirmAim(pair) {
    const aim = clampAim(aimValue);
    setAimSheetPair(null);
    const r = await p.setIntention(pair.id, aim);
    if (!r?.ok) {
      logError('PartnerScreen.confirmAim', new Error(r?.error || 'unknown'), { userId: user?.id });
      toast.show('Could not save your aim. Check your connection and try again.', { variant: 'error' });
    }
  }

  // ── End / cancel / block ──
  function confirmUnpair(pair) {
    appAlert('End partnership?', 'Sharing will stop right away and everything you shared will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End',
        style: 'destructive',
        onPress: async () => {
          const r = await p.unpair(pair.id);
          if (r?.ok) toast.show('Partnership ended', { variant: 'success' });
          else {
            logError('PartnerScreen.confirmUnpair', new Error(r?.error || 'unknown'), { userId: user?.id });
            toast.show('Could not end the partnership. Check your connection and try again.', { variant: 'error' });
          }
        },
      },
    ]);
  }

  function confirmCancelInvite(pending) {
    appAlert('Cancel invitation?', 'Your invitation will be withdrawn. You can send a new one any time.', [
      { text: 'Keep waiting', style: 'cancel' },
      {
        text: 'Cancel invitation',
        style: 'destructive',
        onPress: async () => {
          const r = await p.unpair(pending.id);
          if (r?.ok) toast.show('Invitation cancelled', { variant: 'success' });
          else {
            logError('PartnerScreen.confirmCancelInvite', new Error(r?.error || 'unknown'), { userId: user?.id });
            toast.show('Could not cancel the invitation. Check your connection and try again.', { variant: 'error' });
          }
        },
      },
    ]);
  }

  function confirmBlock(pair) {
    const name = pair.partnerFirstName || 'your partner';
    appAlert(
      `Block ${name}`,
      'This ends the partnership, deletes everything you shared, and stops them pairing with you again. They will not be told.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            const b = await p.block(pair.partnerId);
            if (!b?.ok) logError('PartnerScreen.block', new Error(b?.error || 'unknown'), { userId: user?.id });
            const r = await p.unpair(pair.id);
            if (r?.ok) toast.show('Partnership ended', { variant: 'success' });
            else {
              logError('PartnerScreen.blockUnpair', new Error(r?.error || 'unknown'), { userId: user?.id });
              toast.show('Could not block right now. Check your connection and try again.', { variant: 'error' });
            }
          },
        },
      ],
    );
  }

  // ── Shared training block sheet ──
  async function openBlockSheet(pair) {
    setBlockSheetPair(pair);
    try {
      const all = await getAllProgrammes(user?.id);
      setProgrammes(all || []);
    } catch (e) {
      logError('PartnerScreen.loadProgrammes', e, { userId: user?.id });
      setProgrammes([]);
    }
  }
  function closeBlockSheet() { setBlockSheetPair(null); }

  async function proposeBlock(pair, name) {
    closeBlockSheet();
    const r = await p.proposeBlock(pair.id, name);
    if (!r.ok) {
      logError('PartnerScreen.proposeBlock', new Error(r.error || 'unknown'), { userId: user?.id });
      toast.show('Could not suggest the block. Check your connection and try again.', { variant: 'error' });
    }
  }
  async function adoptBlock(pair) {
    closeBlockSheet();
    const r = await p.adoptBlock(pair.id);
    if (!r.ok) {
      logError('PartnerScreen.adoptBlock', new Error(r.error || 'unknown'), { userId: user?.id });
      toast.show('Could not join the block. Check your connection and try again.', { variant: 'error' });
    }
  }
  async function leaveBlock(pair) {
    closeBlockSheet();
    const r = await p.leaveBlock(pair.id);
    if (!r.ok) {
      logError('PartnerScreen.leaveBlock', new Error(r.error || 'unknown'), { userId: user?.id });
      toast.show('Could not update the block. Check your connection and try again.', { variant: 'error' });
    }
  }

  if (p.loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <BackHeader title="Partners" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (p.error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <BackHeader title="Partners" />
        <View style={styles.errorWrap}>
          <EmptyState
            icon="warning-outline"
            title="Couldn't load partners"
            text="Check your connection and try again."
            actionLabel="Try again"
            onAction={p.reload}
          />
        </View>
      </SafeAreaView>
    );
  }

  const pairs = p.pairs || [];
  const pending = p.pendingInvite;
  const connected = pairs.length > 0;
  const canInviteAnother = tier === 'pro' && pairs.length < PRO_MAX_PAIRS;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackHeader title="Partners" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {connected ? (
          <>
            {pairs.map((pair) => (
              <PairCard
                key={pair.id}
                pair={pair}
                moment={momentsByPair[pair.id] || null}
                onCheer={openAckSheet}
                onManage={setManagePair}
                onOpenBlock={openBlockSheet}
                onSetAim={openAimSheet}
                onReconnect={openAckSheet}
                reconnectDismissed={reconnectDismissed.includes(pair.id)}
                onDismissReconnect={dismissReconnect}
                onOpenShareWins={setShareWinsPair}
                onRevokeWin={handleRevokeWin}
                userId={user?.id}
              />
            ))}

            {canInviteAnother ? (
              <TouchableOpacity
                style={styles.inviteAnother}
                onPress={openJourney}
                accessibilityRole="button"
                accessibilityLabel="Invite another partner"
              >
                <Text style={styles.inviteAnotherText}>Invite another partner</Text>
                <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.primary} />
              </TouchableOpacity>
            ) : null}

            {pending ? (
              <PendingCard pending={pending} onShareAgain={sharePendingInvite} onRefresh={p.refresh || p.reload} onCancel={confirmCancelInvite} />
            ) : null}
          </>
        ) : pending ? (
          <PendingCard pending={pending} onShareAgain={sharePendingInvite} onRefresh={p.refresh || p.reload} onCancel={confirmCancelInvite} />
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="people-outline" size={iconSize.xl} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>{hasIncomingShareIntent ? 'Add a partner to share this' : 'Train with a partner'}</Text>
            <Text style={styles.emptyBody}>
              {hasIncomingShareIntent
                ? 'Nothing has been sent. Partner sharing starts after you pair with one person you already know and trust.'
                : 'Pair up with one person you already train with. It is quiet accountability: someone you trust who knows whether you showed up.'}
            </Text>

            {hasIncomingShareIntent ? (
              <Card style={styles.incomingShareNotice}>
                <View style={styles.incomingShareNoticeHead}>
                  <Ionicons name="lock-closed-outline" size={iconSize.sm} color={colors.primary} />
                  <Text style={styles.incomingShareNoticeTitle}>Your card stays private</Text>
                </View>
                <Text style={styles.incomingShareNoticeText}>
                  Invite your partner first. Once they accept, you can choose exactly which card to send.
                </Text>
              </Card>
            ) : null}

            <Card style={styles.howItWorks}>
              <Text style={styles.howHeader}>HOW IT WORKS</Text>
              <Text style={styles.howLine}>
                Once a week, you each see whether the other trained, and nothing else.
              </Text>
              <Text style={styles.howLine}>
                You build a streak of weeks you both showed up. A rest week never breaks it.
              </Text>
              <Text style={styles.howLine}>No feed, no followers, no numbers to compare.</Text>
            </Card>

            <PartnerPrivacyReceipt />

            <Button
              title="Invite someone you train with"
              style={styles.primaryBtn}
              textStyle={styles.primaryBtnText}
              onPress={openJourney}
              accessibilityLabel="Invite someone you train with"
            />

            <TouchableOpacity
              style={styles.textRow}
              onPress={() => setCodeEntryOpen((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel="I have a code"
            >
              <Text style={styles.textRowText}>I have a code</Text>
            </TouchableOpacity>

            {codeEntryOpen ? (
              <View style={styles.codeRow}>
                <TextField
                  containerStyle={styles.codeFieldContainer}
                  fieldStyle={styles.codeField}
                  inputStyle={styles.codeInput}
                  value={code}
                  onChangeText={setCode}
                  placeholder="Invite code"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  accessibilityLabel="Invite code"
                />
                <Button
                  title="Join"
                  variant="outline"
                  size="sm"
                  fullWidth={false}
                  style={styles.codeBtn}
                  textStyle={styles.codeBtnText}
                  onPress={() => handleRedeem()}
                  disabled={busy || !code.trim()}
                  loading={busy}
                  accessibilityLabel="Join with code"
                />
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* ── Invite journey (three beats) ── */}
      <InviteJourney
        visible={journeyOpen}
        beat={beat}
        minting={minting}
        minted={mintedInvite}
        onClose={closeJourney}
        onContinue={() => setBeat(2)}
        onAgree={agreeAndMint}
        onShareVia={shareVia}
        onShareMore={shareMore}
      />

      {/* ── Manage sheet ── */}
      <BottomSheet visible={!!managePair} onClose={() => setManagePair(null)} accessibilityLabel="Manage partnership">
        {managePair ? (
          <View style={styles.sheetBody}>
            <SheetRow
              icon="exit-outline"
              label="End partnership"
              onPress={() => { const pr = managePair; setManagePair(null); confirmUnpair(pr); }}
            />
            <SheetRow
              icon="hand-left-outline"
              danger
              label={`Block ${managePair.partnerFirstName || 'partner'}`}
              onPress={() => { const pr = managePair; setManagePair(null); confirmBlock(pr); }}
            />
          </View>
        ) : null}
      </BottomSheet>

      {/* ── Shared-block sheet ── */}
      <BottomSheet visible={!!blockSheetPair} onClose={closeBlockSheet} accessibilityLabel="Shared training block" scroll>
        {blockSheetPair ? (
          <BlockSheetBody
            pair={blockSheetPair}
            programmes={programmes}
            userId={user?.id}
            onPropose={proposeBlock}
            onAdopt={adoptBlock}
            onLeave={leaveBlock}
          />
        ) : null}
      </BottomSheet>

      {/* ── Weekly-aim sheet (D5-A) ── */}
      <BottomSheet visible={!!aimSheetPair} onClose={() => setAimSheetPair(null)} accessibilityLabel="This week's sessions">
        {aimSheetPair ? (
          <AimSheetBody
            value={aimValue}
            onChange={setAimValue}
            onConfirm={() => confirmAim(aimSheetPair)}
          />
        ) : null}
      </BottomSheet>

      {/* ── Acknowledgement picker (D5-B1) ── */}
      <BottomSheet visible={!!ackSheetPair} onClose={() => setAckSheetPair(null)} accessibilityLabel="Send an acknowledgement">
        {ackSheetPair ? (
          <AckSheetBody pair={ackSheetPair} onSend={handleSendAck} />
        ) : null}
      </BottomSheet>

      <BottomSheet visible={!!shareWinsPair} onClose={() => setShareWinsPair(null)} accessibilityLabel="Partner shareable wins" scroll>
        {shareWinsPair ? (
          <ShareWinsSheetBody
            pair={shareWinsPair}
            initialType={route?.params?.shareWinType}
            shareWinPayload={route?.params?.shareWinPayload}
            progressCardPayload={route?.params?.progressCardSharePayload}
            onSend={(preview) => handleSendWin(shareWinsPair, preview)}
          />
        ) : null}
      </BottomSheet>
    </SafeAreaView>
  );
}

// D5-A: the weekly-aim stepper. Intention, not obligation — a calm "aim" you
// confirm, never a target you must hit. Numerals, no guilt copy.
function AimSheetBody({ value, onChange, onConfirm }) {
  const v = clampAim(value);
  return (
    <View style={styles.sheetBody}>
      <Text style={styles.sheetHeading}>This week's sessions</Text>
      <Text style={styles.blockPitch}>
        Choose the number of sessions you plan to train this week. Your partner sees the number only.
      </Text>
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => onChange(clampAim(v - 1))}
          disabled={v <= 1}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Decrease sessions"
        >
          <Ionicons name="remove" size={iconSize.md} color={v <= 1 ? colors.textMuted : colors.primary} />
        </TouchableOpacity>
        <Text style={styles.stepperValue} accessibilityLabel={`${v} sessions this week`}>{v}</Text>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => onChange(clampAim(v + 1))}
          disabled={v >= 14}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Increase sessions"
        >
          <Ionicons name="add" size={iconSize.md} color={v >= 14 ? colors.textMuted : colors.primary} />
        </TouchableOpacity>
      </View>
      <Button
        title="Save"
        style={styles.primaryBtn}
        textStyle={styles.primaryBtnText}
        onPress={onConfirm}
        accessibilityLabel="Save this week's sessions"
      />
    </View>
  );
}

// D5-B1: the fixed acknowledgement picker. Exactly the curated set, no free text.
function AckSheetBody({ pair, onSend }) {
  return (
    <View style={styles.sheetBody}>
      <Text style={styles.sheetHeading}>Send an acknowledgement</Text>
      {ACKNOWLEDGEMENTS.map((ack) => (
        <TouchableOpacity
          key={ack.key}
          style={styles.ackRow}
          onPress={() => onSend(pair, ack.key)}
          accessibilityRole="button"
          accessibilityLabel={ack.line}
        >
          <Ionicons name="heart-outline" size={iconSize.sm} color={colors.primary} />
          <Text style={styles.ackRowText}>{ack.line}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ShareWinsSheetBody({ pair, initialType, shareWinPayload, progressCardPayload, onSend }) {
  const previewPayloads = {};
  if (initialType && shareWinPayload && typeof shareWinPayload === 'object') {
    previewPayloads[initialType] = shareWinPayload;
  }
  if (progressCardPayload) previewPayloads.progress_card = progressCardPayload;
  const examplePreviews = buildShareWinExamplePreviews(previewPayloads);
  const initialPreview = examplePreviews.find((preview) => preview.type === initialType) || examplePreviews[0];
  const [selectedType, setSelectedType] = useState(initialPreview?.type || 'workout_summary');
  const [sending, setSending] = useState(false);
  const [sentType, setSentType] = useState(null);
  const selectedPreview = examplePreviews.find((preview) => preview.type === selectedType) || examplePreviews[0];
  const receipt = selectedPreview ? buildShareWinReviewReceipt(selectedPreview) : null;
  const partnerName = pair?.partnerFirstName || 'your partner';
  async function sendSelected() {
    if (!selectedPreview || sending || sentType === selectedPreview.type) return;
    setSending(true);
    const r = await onSend?.(selectedPreview);
    if (r?.ok) setSentType(selectedPreview.type);
    setSending(false);
  }
  return (
    <View style={styles.sheetBody}>
      <Text style={styles.sheetHeading}>Shareable wins</Text>
      <Text style={styles.blockPitch}>{SHARE_WIN_POLICY.summary}</Text>
      <View style={styles.shareWinPreviewIntro}>
        <Ionicons name="eye-outline" size={iconSize.sm} color={colors.primary} />
        <Text style={styles.shareWinPreviewIntroText}>
          Pick a card, check exactly what {partnerName} will see, then send it.
        </Text>
      </View>
      <View style={styles.shareWinChooser} accessibilityRole="radiogroup" accessibilityLabel="Choose shareable win type">
        {examplePreviews.map((preview) => {
          const active = preview.type === selectedType;
          return (
            <TouchableOpacity
              key={preview.type}
              style={[styles.shareWinChoice, active && styles.shareWinChoiceActive]}
              onPress={() => setSelectedType(preview.type)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Preview ${preview.draft.title.toLowerCase()}`}
            >
              <Text style={[styles.shareWinChoiceTitle, active && styles.shareWinChoiceTitleActive]}>
                {preview.draft.title}
              </Text>
              <Text style={styles.shareWinChoiceSummary} numberOfLines={2}>{preview.draft.summary}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedPreview ? (
        <View style={styles.shareWinPreviewCard}>
          <View style={styles.shareWinPreviewTop}>
            <Text style={styles.shareWinPreviewStatus}>{selectedPreview.status}</Text>
            <Ionicons name="lock-closed-outline" size={iconSize.sm} color={colors.primary} />
          </View>
          <Text style={styles.shareWinExampleTitle}>{selectedPreview.draft.title}</Text>
          <Text style={styles.shareWinExampleSummary}>{selectedPreview.draft.summary}</Text>
          <Text style={styles.shareWinExampleDetail}>{selectedPreview.draft.detail}</Text>
          <View style={styles.shareWinBoundaryGrid}>
            <View style={styles.shareWinBoundary}>
              <Text style={styles.shareWinBoundaryLabel}>Partner sees</Text>
              <Text style={styles.shareWinBoundaryText}>{receipt?.visibleToPartner || selectedPreview.shared}</Text>
            </View>
            <View style={styles.shareWinBoundary}>
              <Text style={styles.shareWinBoundaryLabel}>Stays private</Text>
              <Text style={styles.shareWinBoundaryText}>{receipt?.remainsPrivate || selectedPreview.private}</Text>
            </View>
          </View>
          <Text style={styles.shareWinExampleConsent}>{receipt?.consentLine || selectedPreview.confirmation}</Text>
          <Button
            title={sentType === selectedPreview.type ? 'Sent' : `Send to ${partnerName}`}
            onPress={sendSelected}
            disabled={sending || sentType === selectedPreview.type}
            loading={sending}
            accessibilityLabel={`Send ${selectedPreview.draft.title.toLowerCase()} to ${partnerName}`}
          />
        </View>
      ) : null}
      <View style={styles.shareWinRules}>
        <Text style={styles.shareWinSectionTitle}>What never happens</Text>
        {SHARE_WIN_CARD_RULES.slice(0, 3).map((rule) => (
          <View key={rule} style={styles.shareWinRuleRow}>
            <Ionicons name="checkmark-circle-outline" size={iconSize.sm} color={colors.primary} />
            <Text style={styles.shareWinRuleText}>{rule}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PendingCard({ pending, onShareAgain, onRefresh, onCancel }) {
  const [checking, setChecking] = useState(false);
  async function checkConnection() {
    if (checking) return;
    setChecking(true);
    try { await onRefresh?.(); } finally { setChecking(false); }
  }
  return (
    <View style={styles.pendingCard}>
      <View style={styles.pendingRow}>
        <Ionicons name="hourglass-outline" size={iconSize.md} color={colors.textSecondary} />
        <Text style={styles.pendingText}>Invitation sent. Waiting for your partner.</Text>
      </View>
      <Text style={styles.pendingExpiry}>It expires {spellNumber(INVITE_EXPIRY_DAYS)} days after you send it.</Text>
      <Text style={styles.pendingHint}>Share the same invite again if they missed it. It still only pairs one person.</Text>
      <TouchableOpacity
        onPress={onShareAgain}
        style={styles.pendingPrimary}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Share invite again"
      >
        <Ionicons name="share-outline" size={iconSize.sm} color={colors.primary} />
        <Text style={styles.pendingPrimaryText}>Share invite again</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={checkConnection}
        style={[styles.pendingPrimary, checking && styles.pendingPrimaryDisabled]}
        disabled={checking}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityState={{ disabled: checking }}
        accessibilityLabel="Check partner connection"
      >
        {checking ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="refresh-outline" size={iconSize.sm} color={colors.primary} />
        )}
        <Text style={styles.pendingPrimaryText}>{checking ? 'Checking...' : 'Check connection'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onCancel(pending)}
        style={styles.textRow}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Cancel invitation"
      >
        <Text style={styles.cancelText}>Cancel invitation</Text>
      </TouchableOpacity>
    </View>
  );
}

function InviteJourney({ visible, beat, minting, minted, onClose, onContinue, onAgree, onShareVia, onShareMore }) {
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  return (
    <Modal
      visible={visible}
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
      transparent={false}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <SafeAreaView style={styles.journeySafe} edges={['top', 'bottom']}>
        <View style={styles.journeyHead}>
          <TouchableOpacity onPress={onClose} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={iconSize.lg} color={colors.textPrimary} />
          </TouchableOpacity>
          <ProgressDots active={beat} />
          <View style={styles.journeyHeadSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.journeyContent} showsVerticalScrollIndicator={false}>
          {beat === 1 ? (
            <EntranceView key="beat1" duration={motion.enter} style={styles.beat}>
              <Text style={styles.beatTitle}>A partner, not an audience</Text>
              <Text style={styles.beatLine}>One person you already know and trust.</Text>
              <Text style={styles.beatLine}>No feed, no followers, no comparing numbers.</Text>
              <Text style={styles.beatLine}>Just whether you each showed up for your own plan.</Text>
              <Button
                title="Continue"
                style={styles.primaryBtn}
                textStyle={styles.primaryBtnText}
                onPress={onContinue}
                accessibilityLabel="Continue"
              />
            </EntranceView>
          ) : null}

          {beat === 2 ? (
            <EntranceView key="beat2" duration={motion.enter} style={styles.beat}>
              <PartnerPrivacyReceipt />
              <Text style={styles.beatConsent}>
                Pairing means you both agree to share this, and only this. Notice v{PARTNER_PRIVACY_NOTICE_VERSION}.
              </Text>
              <Button
                title="Agree and get my code"
                style={[styles.primaryBtn, minting && styles.primaryBtnDisabled]}
                textStyle={styles.primaryBtnText}
                onPress={onAgree}
                disabled={minting}
                loading={minting}
                accessibilityLabel="Agree and get my code"
              />
            </EntranceView>
          ) : null}

          {beat === 3 ? (
            <EntranceView key="beat3" duration={motion.enter} style={styles.beat}>
              <Text style={styles.codeDisplay}>{minted?.code || ''}</Text>
              <Text style={styles.codeSub}>
                One person can use this code. It expires in {spellNumber(INVITE_EXPIRY_DAYS)} days.
              </Text>
              <View style={styles.channelRow}>
                <ChannelButton icon="chatbubble-outline" label="Text" onPress={() => onShareVia('sms')} />
                <ChannelButton icon="logo-whatsapp" label="WhatsApp" onPress={() => onShareVia('whatsapp')} />
                <ChannelButton icon="mail-outline" label="Email" onPress={() => onShareVia('email')} />
              </View>
              <TouchableOpacity
                style={styles.moreOptions}
                onPress={onShareMore}
                accessibilityRole="button"
                accessibilityLabel="More options"
              >
                <Ionicons name="share-outline" size={iconSize.sm} color={colors.primary} />
                <Text style={styles.moreOptionsText}>More options</Text>
              </TouchableOpacity>
            </EntranceView>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function ChannelButton({ icon, label, onPress }) {
  return (
    <TouchableOpacity
      style={styles.channelBtn}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Send by ${label}`}
    >
      <Ionicons name={icon} size={iconSize.md} color={colors.primary} />
      <Text style={styles.channelBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function BlockSheetBody({ pair, programmes, userId, onPropose, onAdopt, onLeave }) {
  const name = pair.partnerFirstName || 'your partner';
  const block = pair.sharedBlock;

  if (block?.status === 'active') {
    return (
      <View style={styles.sheetBody}>
        <Text style={styles.sheetHeading}>Shared block label</Text>
        <Text style={styles.blockPitch}>This is only a shared label. Workouts, exercises, loading and coach changes stay private.</Text>
        <SheetRow icon="exit-outline" label="Remove shared label" onPress={() => onLeave(pair)} />
      </View>
    );
  }

  if (block?.status === 'proposed' && block.proposedBy === userId) {
    return (
      <View style={styles.sheetBody}>
        <Text style={styles.sheetHeading}>Block suggested</Text>
        <Text style={styles.blockPitch}>You suggested sharing the label {block.blockName}. Waiting for {name}.</Text>
        <SheetRow icon="close-circle-outline" label="Withdraw label" onPress={() => onLeave(pair)} />
      </View>
    );
  }

  if (block?.status === 'proposed' && block.proposedBy !== userId) {
    return (
      <View style={styles.sheetBody}>
        <Text style={styles.sheetHeading}>Share a block label</Text>
        <Text style={styles.blockPitch}>{name} suggested sharing the label {block.blockName}. It will not sync workouts or change your plan.</Text>
        <SheetRow icon="checkmark-circle-outline" label="Use this label" onPress={() => onAdopt(pair)} />
        <SheetRow icon="close-circle-outline" label="Decline label" onPress={() => onLeave(pair)} />
      </View>
    );
  }

  // No block yet: suggest one from the user's programmes.
  return (
    <View style={styles.sheetBody}>
      <Text style={styles.sheetHeading}>Share a block label</Text>
      <Text style={styles.blockPitch}>
        Optional. Use this only if you and {name} want to show that you are following the same named block. It does not alter either plan.
      </Text>
      {programmes === null ? (
        <ActivityIndicator color={colors.primary} />
      ) : programmes.length === 0 ? (
        <Text style={styles.blockEmpty}>No plans yet. Build or pick one in Plans first.</Text>
      ) : (
        programmes.map((prog) => (
          <SheetRow
            key={prog.id}
            icon="barbell-outline"
            label={prog.name}
            onPress={() => onPropose(pair, prog.name)}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorWrap: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },

  // ── PairCard ──
  pairCard: { gap: spacing.lg },
  pairHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  partnerIdentity: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
  partnerAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, alpha.edge),
  },
  partnerAvatarText: { ...type.label, color: colors.primary },
  partnerNameBlock: { flex: 1, minWidth: 0, gap: 2 },
  pairName: { ...type.title, color: colors.textPrimary, flexShrink: 1 },
  pairKicker: { ...type.caption, color: colors.textSecondary },
  ellipsis: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  partnerStatusBand: {
    gap: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    padding: spacing.md,
  },
  hero: { gap: spacing.xs },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: spacing.sm },
  heroNum: { ...type.display, color: colors.textPrimary },
  heroWord: { ...type.title, color: colors.textPrimary, paddingBottom: spacing.xs },
  heroSub: { ...type.caption, color: colors.textSecondary },
  heroFirst: { ...type.body, color: colors.textPrimary },

  people: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: spacing.sm, height: spacing.sm, borderRadius: circle(spacing.sm) },
  dotActive: { backgroundColor: colors.primary },
  dotResting: { backgroundColor: stateColors.watch },
  personText: { ...type.body, color: colors.textPrimary, flex: 1 },

  // D5-A weekly intention
  intention: { gap: spacing.xs },
  intentionShared: { ...type.body, color: colors.textPrimary },
  intentionOwn: { ...type.body, color: colors.textSecondary },
  intentionSet: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    minHeight: 44,
  },
  intentionSetText: { ...type.label, color: colors.primary },
  keptLine: { ...type.body, color: colors.primary },

  partnerWeekPanel: {
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, alpha.edge),
    backgroundColor: withAlpha(colors.primary, alpha.tint),
    padding: spacing.md,
  },
  supportPlanHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  supportPlanTitle: { ...type.label, color: colors.textPrimary },
  supportPlanHeadline: { ...type.body, color: colors.textPrimary, lineHeight: 22 },
  supportPlanGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  supportPlanStep: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 132,
    gap: spacing.xxs,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    padding: spacing.sm,
  },
  supportPlanStepTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  supportPlanStepLabel: { ...type.caption, color: colors.textSecondary, flexShrink: 1 },
  supportPlanStepState: { ...type.caption, color: colors.primary, flexShrink: 0 },
  supportPlanStepCopy: { ...type.caption, color: colors.textPrimary, lineHeight: 18 },
  supportPlanPrivacy: { ...type.caption, color: colors.textSecondary, lineHeight: 18 },
  supportPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    minHeight: 44,
  },
  supportPlanButtonText: { ...type.label, color: colors.primary },

  // Active-pair trust snapshot
  supportSnapshot: {
    gap: spacing.sm,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  supportHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  supportTitle: { ...type.label, color: colors.textPrimary },
  supportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  supportCell: { flexGrow: 1, flexBasis: '48%', minWidth: 136, gap: spacing.xxs },
  supportLabel: { ...type.caption, color: colors.textSecondary },
  supportBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  supportDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    marginTop: 7,
    flexShrink: 0,
  },
  supportDotMuted: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.textMuted,
    marginTop: 7,
    flexShrink: 0,
  },
  supportText: { ...type.caption, color: colors.textPrimary, lineHeight: 18, flex: 1 },
  supportFoot: { ...type.caption, color: colors.textSecondary, lineHeight: 18 },
  shareWinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, alpha.edge),
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    padding: spacing.md,
    minHeight: 72,
  },
  shareWinsIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBg,
    flexShrink: 0,
  },
  shareWinsRowCopy: { flex: 1, minWidth: 0, gap: spacing.xxs },
  shareWinsTitle: { ...type.label, color: colors.textPrimary },
  shareWinsText: { ...type.caption, color: colors.textPrimary, lineHeight: 18 },
  partnerShareSection: { gap: spacing.sm },
  partnerWins: { gap: spacing.sm },
  partnerWinsTitle: { ...type.label, color: colors.textPrimary },
  partnerWinCard: {
    gap: spacing.xxs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    padding: spacing.md,
  },
  partnerWinTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  partnerWinMeta: { ...type.caption, color: colors.textMuted, flexShrink: 1 },
  partnerWinDelete: { ...type.label, color: colors.primary },
  partnerWinTitle: { ...type.label, color: colors.textPrimary },
  partnerWinSummary: { ...type.bodySm, color: colors.textPrimary, lineHeight: 20 },
  partnerWinDetail: { ...type.caption, color: colors.textSecondary, lineHeight: 18 },

  // D5-B3 reconnection surface
  reconnect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: withAlpha(colors.primary, alpha.tint),
    borderRadius: radius.md,
    padding: spacing.md,
  },
  reconnectMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  reconnectText: { ...type.body, color: colors.primary, flexShrink: 1 },
  reconnectDismiss: { paddingHorizontal: spacing.xs, minHeight: 44, justifyContent: 'center' },
  reconnectDismissText: { ...type.label, color: colors.textSecondary },

  // D5-A aim stepper + D5-B1 acknowledgement rows
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.md,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { ...type.display, color: colors.textPrimary, minWidth: 56, textAlign: 'center' },
  ackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  ackRowText: { ...type.body, color: colors.textPrimary, flex: 1 },
  shareWinDefault: { ...type.label, color: colors.textPrimary },
  shareWinPreviewIntro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    padding: spacing.md,
  },
  shareWinPreviewIntroText: { ...type.caption, color: colors.textPrimary, lineHeight: 18, flex: 1 },
  shareWinChooser: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  shareWinChoice: {
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: 132,
    minHeight: 78,
    gap: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    padding: spacing.md,
  },
  shareWinChoiceActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  shareWinChoiceTitle: { ...type.label, color: colors.textPrimary },
  shareWinChoiceTitleActive: { color: colors.primary },
  shareWinChoiceSummary: { ...type.caption, color: colors.textSecondary, lineHeight: 18 },
  shareWinPreviewCard: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    padding: spacing.md,
  },
  shareWinPreviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  shareWinPreviewStatus: {
    ...type.caption,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  shareWinBoundaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  shareWinBoundary: {
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: 136,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    gap: spacing.xxs,
  },
  shareWinBoundaryLabel: { ...type.caption, color: colors.textMuted },
  shareWinBoundaryText: { ...type.caption, color: colors.textPrimary, lineHeight: 18 },
  shareWinRules: { gap: spacing.sm },
  shareWinRuleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  shareWinRuleText: { ...type.caption, color: colors.textPrimary, lineHeight: 18, flex: 1 },
  shareWinSectionTitle: { ...type.label, color: colors.textPrimary },
  shareWinReceipt: {
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    padding: spacing.md,
  },
  shareWinReceiptHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  shareWinReceiptStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  shareWinReceiptNumber: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBg,
    flexShrink: 0,
  },
  shareWinReceiptNumberText: { ...type.caption, color: colors.primary, fontWeight: fontWeight.semibold },
  shareWinReceiptCopy: { flex: 1, minWidth: 0, gap: 2 },
  shareWinReceiptTitle: { ...type.caption, color: colors.textPrimary, fontWeight: fontWeight.semibold },
  shareWinReceiptBody: { ...type.caption, color: colors.textSecondary, lineHeight: 18 },
  shareWinReceiptFinal: {
    ...type.caption,
    color: colors.textPrimary,
    lineHeight: 18,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryBg,
    padding: spacing.md,
  },
  shareWinExampleTitle: { ...type.label, color: colors.textPrimary },
  shareWinExampleSummary: { ...type.bodySm, color: colors.textPrimary, lineHeight: 20 },
  shareWinExampleDetail: { ...type.caption, color: colors.textSecondary, lineHeight: 18 },
  shareWinExampleConsent: { ...type.caption, color: colors.primary, lineHeight: 18 },
  shareWinFooter: { ...type.caption, color: colors.textSecondary, lineHeight: 18 },

  // Moment card
  momentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: withAlpha(colors.primary, alpha.tint),
    borderRadius: radius.md,
    padding: spacing.md,
  },
  momentLine: { ...type.body, color: colors.textPrimary, flex: 1 },

  // Shared-block status
  blockStatusCard: {
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    padding: spacing.md,
  },
  blockStatusHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  blockStatusTitle: { ...type.label, color: colors.textPrimary, flexShrink: 1 },
  blockStatusName: { ...type.bodySm, color: colors.primary },
  blockStatusCopy: { ...type.caption, color: colors.textSecondary, lineHeight: 18 },
  blockStatusAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    minHeight: 36,
  },
  blockStatusActionText: { ...type.label, color: colors.primary },

  // Cheer pill
  cheerWrap: { alignSelf: 'flex-start' },
  cheerRowAlign: { alignSelf: 'flex-end' },
  cheerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
  },
  cheerPillDone: { backgroundColor: withAlpha(colors.border, alpha.edge) },
  cheerPillText: { ...type.label, color: colors.onPrimary },
  cheerPillTextDone: { color: colors.textSecondary },

  // Invite-another text row
  inviteAnother: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  inviteAnotherText: { ...type.body, color: colors.primary },

  // Pending card
  pendingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pendingText: { ...type.body, color: colors.textPrimary, flex: 1 },
  pendingExpiry: { ...type.caption, color: colors.textSecondary },
  pendingHint: { ...type.caption, color: colors.textSecondary, lineHeight: 18 },
  pendingPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    minHeight: 44,
  },
  pendingPrimaryDisabled: { opacity: 0.68 },
  pendingPrimaryText: { ...type.label, color: colors.primary },
  cancelText: { ...type.label, color: colors.primary },

  // ── Empty state ──
  empty: { gap: spacing.xl, alignItems: 'stretch' },
  emptyIconCircle: {
    alignSelf: 'center',
    padding: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: withAlpha(colors.primary, alpha.tint),
  },
  emptyTitle: { ...type.title, color: colors.textPrimary, textAlign: 'center' },
  emptyBody: { ...type.body, color: colors.textSecondary, textAlign: 'center' },
  incomingShareNotice: { gap: spacing.sm },
  incomingShareNoticeHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  incomingShareNoticeTitle: { ...type.label, color: colors.textPrimary },
  incomingShareNoticeText: { ...type.bodySm, color: colors.textSecondary, lineHeight: 20 },
  // Plain-English "how it works", left-aligned so the three lines read as a
  // short explainer rather than a centred paragraph. Sits between the pitch and
  // the privacy receipt; the empty container's own xl gap spaces it.
  howItWorks: { gap: spacing.sm },
  howHeader: {
    ...type.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.caption,
  },
  howLine: { ...type.body, color: colors.textPrimary },
  textRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, minHeight: 44 },
  textRowText: { ...type.body, color: colors.primary },

  // Code entry
  codeRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  codeFieldContainer: {
    flex: 1,
    gap: 0,
  },
  codeField: {
    borderRadius: radius.md,
    minHeight: 44,
  },
  codeInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...type.body,
  },
  codeBtn: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
  codeBtnText: { ...type.label },

  // Primary button
  primaryBtn: {
    minHeight: 50,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { ...type.label, color: colors.onPrimary },

  // ── Sheets ──
  sheetBody: { gap: spacing.xs },
  sheetHeading: { ...type.title, color: colors.textPrimary, marginBottom: spacing.xs },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  sheetRowText: { ...type.body, color: colors.textPrimary, flex: 1 },
  sheetRowDanger: { color: colors.error },
  blockPitch: { ...type.body, color: colors.textSecondary },
  blockEmpty: { ...type.body, color: colors.textSecondary },

  // ── Invite journey ──
  journeySafe: { flex: 1, backgroundColor: colors.background },
  journeyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  journeyHeadSpacer: { width: iconSize.lg },
  dots: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressDot: { width: spacing.xs2, height: spacing.xs2, borderRadius: circle(spacing.xs2) },
  progressDotOn: { backgroundColor: colors.primary },
  progressDotOff: { backgroundColor: withAlpha(colors.primary, alpha.tint) },
  journeyContent: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  beat: { gap: spacing.lg },
  beatTitle: { ...type.h2, color: colors.textPrimary },
  beatLine: { ...type.body, color: colors.textPrimary },
  beatConsent: { ...type.caption, color: colors.textSecondary },
  codeDisplay: {
    ...type.display,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: letterSpacing.caption,
  },
  codeSub: { ...type.caption, color: colors.textSecondary, textAlign: 'center' },
  channelRow: { flexDirection: 'row', gap: spacing.sm },
  channelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  channelBtnText: { ...type.label, color: colors.primary },
  moreOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  moreOptionsText: { ...type.body, color: colors.primary },
});
