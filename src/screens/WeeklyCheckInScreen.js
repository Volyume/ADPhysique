import { useState, useEffect, useCallback } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../store/useAppStore';
import { formatBodyWeightShort } from '../lib/units';
import { computeEWMA } from '../lib/weeklyCoach';
import {
  saveWeeklyCheckin,
  getLatestCheckin,
  getMorningWeightsLast14Days,
  getWeeklySessionStats,
  getWeeklyPRCount,
  getWeeklyVolumeByMuscle,
  getNutritionTargets,
  getUserBodyProfile,
  getDailyStepsRange,
  getCardioLogRange,
  activityDayKey,
} from '../lib/database';
import { localDayKey, localWeekStartMs } from '../lib/dayKey';
import {
  formatWeekRange, hasLoggedToday, earliestWeightTs,
  deriveTrainingPerformance, deriveCalsAdherence, stripAutoNotes, PERF_VERDICT_TEXT,
} from '../lib/checkinDerive';
import { summariseWeekSteps } from '../lib/stepsSummary';
import * as haptics from '../lib/haptics';
import { summariseWeekCardio, cardioComplianceFromLog } from '../lib/cardio/cardioEngine';
import { getRollupsForRange, getPlannedDaysInRange, confirmPlannedDay } from '../lib/food/db';
import { getCycleTracking, shouldShowCycleQuestion } from '../lib/cyclePrefs';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha } from '../styles/theme';
import { requestNotificationPermissions, getNotificationPermissionStatus, scheduleNextCheckinReminder, scheduleWeeklyCoachReady, scheduleMissedCheckinFollowups } from '../lib/notifications';
import { logError, logWarn } from '../lib/errorLog';
import { audit } from '../lib/observability';
import { SkeletonCard } from '../components/Skeleton';
// COMP-023: the first-check-in gate constants live in trialActivation.js as the
// single source of truth, so the day-3 unlock date this screen gates on and the
// date the trial moment promises can never drift apart.
import { FIRST_CHECKIN_MIN_DAYS, MIN_WEIGH_INS } from '../lib/trialActivation';

const NOTIF_PREFS_KEY = '@volyume_notification_prefs';
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepBar({ current, total }) {
  return (
    <View style={styles.stepBar}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            i < current && styles.stepDotDone,
            i === current && styles.stepDotActive,
          ]}
        />
      ))}
    </View>
  );
}

function SectionLabel({ children, hint }) {
  return (
    <View style={styles.sectionLabelWrap}>
      <Text style={styles.sectionLabel}>{children}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
    </View>
  );
}

function ChipRow({ options, selected, onSelect }) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(isSelected ? null : opt.value)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${opt.value} ${opt.label}`}
          >
            <Text style={[styles.chipValue, isSelected && styles.chipValueSelected]}>
              {opt.value}
            </Text>
            <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function OptionRow({ options, selected, onSelect }) {
  return (
    <View style={styles.optionRow}>
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
            onPress={() => onSelect(isSelected ? null : opt.value)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={opt.label}
          >
            <Text style={[styles.optionBtnText, isSelected && styles.optionBtnTextSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const TOTAL_STEPS = 4;

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WeeklyCheckInScreen({ navigation }) {
  const { user, userProfile, bodyWeightUnits } = useAppStore();
  const [nutritionTargets, setNutritionTargets] = useState(null);
  const [bioSex, setBioSex] = useState(null);          // 'male' | 'female' | null
  const [cycleEnabled, setCycleEnabled] = useState(false);
  const [cycle, setCycle] = useState(null);            // 'yes' | 'no' | null (GAP row 15)
  const [step, setStep] = useState(0); // 0–3
  // COMP-008 Fast Check-In: when set, the user has chosen to expand the
  // condensed card into the full four-step wizard. Lets the fast path stay an
  // offer, never a cage.
  const [forceFullWizard, setForceFullWizard] = useState(false);

  // ─── Gate state ──────────────────────────────────────────────────────────────
  // 'loading' | 'wrong_day' | 'day_late' | 'too_soon' | 'need_weights' | 'open' | 'load_error'
  const [gateState, setGateState] = useState('loading');
  // OB-7: when the user is exactly one day past their scheduled day, every
  // week window anchors to yesterday so the check-in reviews the week they
  // missed (matters when the scheduled day is Sunday, where "today" would
  // otherwise start a fresh Monday-anchored week).
  const [weekAnchorMs, setWeekAnchorMs] = useState(() => Date.now());
  // PIPE-006: bump to re-run the loader after a load failure, so the error
  // state is recoverable rather than failing open into the form.
  const [reloadKey, setReloadKey] = useState(0);
  // For 'too_soon': how many more days the user needs to wait + which
  // chosen day that lands on. Both surfaced in the gate copy.
  const [tooSoonCtx, setTooSoonCtx] = useState({ daysToWait: 0, nextDayLabel: null });
  // Auto-derivation context: PR count, planned/completed sessions,
  // and the food-rollup-derived calorie adherence verdict. Populated
  // in the same load() that runs the gate evaluation so step 1 and
  // step 3 can pre-select sensible defaults without a second fetch.
  const [autoDerived, setAutoDerived] = useState({
    trainingPerformance: null,
    trainingMeta: null, // { completed, planned, prs }
    calsAdherence: null,
    calsMeta: null,     // { daysLogged, avgKcal, target, withinPct }
  });
  const [checkinDayNum, setCheckinDayNum] = useState(0); // 0=Sunday
  const [weighInsThisWeek, setWeighInsThisWeek] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    getNutritionTargets(user.id).then(t => setNutritionTargets(t ?? null)).catch(() => {});
    getUserBodyProfile(user.id).then(p => setBioSex(p?.sex ?? null)).catch(() => {});
    getCycleTracking().then(setCycleEnabled).catch(() => {});
    // The week's registered steps: the trailing seven days up to today.
    const toDate = activityDayKey();
    const fromDate = activityDayKey(Date.now() - 6 * 24 * 60 * 60 * 1000);
    getDailyStepsRange(user.id, fromDate, toDate)
      .then(rows => setStepsSummary(summariseWeekSteps(rows)))
      .catch(() => setStepsSummary(null));
    // Cardio compliance: prefill the adherence verdict from the actual log
    // (sessions done vs the coach target) so the user usually just confirms.
    // The engine returns the same hit/mostly/missed values the question uses.
    const cardioTarget = userProfile?.cardioTarget;
    if (userProfile?.cardioPrescription || cardioTarget) {
      getCardioLogRange(user.id, fromDate, toDate)
        .then(rows => {
          const s = summariseWeekCardio(rows);
          const target = cardioTarget || { sessionsPerWeek: 3 };
          const derived = cardioComplianceFromLog(s.sessions, target);
          // Only fill when nothing is set yet, so this log-derived prefill can't
          // race with (and clobber) a saved override loaded by the re-entry
          // prefill in load(). Functional setter avoids a stale-closure read.
          setCardioAdherence(prev => prev ?? derived);
          // A7 provenance: keep the counts so the question can say which log
          // the pre-selected answer came from (mirrors the diary/training notes).
          setCardioMeta({
            sessions: s.sessions,
            targetSessions: Number(target?.sessionsPerWeek) || 0,
          });
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // OB-7: anchored, so a day-late check-in saves against (and labels) the
  // week it reviews, not a week that started this morning.
  const weekStart = new Date(localWeekStartMs(weekAnchorMs));
  const weekLabel = formatWeekRange(weekStart);
  const bwu = bodyWeightUnits || 'st';

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  // True when a weekly check-in already exists for this week, so the form is
  // prefilled for editing rather than shown blank.
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);

  // Weight data
  const [weekWeights, setWeekWeights] = useState([]);
  const [alreadyLoggedToday, setAlreadyLoggedToday] = useState(false);

  // Step 1, How are you?
  const [energyScore, setEnergyScore] = useState(null);   // 1–5
  const [stressScore, setStressScore] = useState(null);   // 1–5
  const [sleepHours, setSleepHours] = useState('');

  // Step 2, This week
  const [calsAdherence, setCalsAdherence] = useState(null);
  // Days in the review week that still hold unconfirmed planned meals, so the
  // user can retroactively confirm "I ate as planned" (adherence backstop).
  const [unconfirmedPlannedDays, setUnconfirmedPlannedDays] = useState([]);
  const [confirmingPlanned, setConfirmingPlanned] = useState(false);
  const [stepsAdherence] = useState(null); // legacy field, no longer collected; steps_avg replaces it
  const [cardioAdherence, setCardioAdherence] = useState(null);
  // A7 provenance for the cardio prefill: { sessions, targetSessions } from
  // the week's cardio log, so the pre-selected answer names its source.
  const [cardioMeta, setCardioMeta] = useState(null);
  // Steps: the week's auto summary (null until loaded). When 4+ days are
  // registered the check-in shows the average and offers a tap-to-override,
  // for users whose real count lives on a watch or another app; otherwise the
  // user types a single average as the fallback. stepsOverride flips the auto
  // display to the manual field, prefilled with the auto value to edit.
  const [stepsSummary, setStepsSummary] = useState(null);
  const [stepsManual, setStepsManual] = useState('');
  const [stepsOverride, setStepsOverride] = useState(false);

  // Step 3, Recovery
  const [sorenessScore, setSorenessScore] = useState(null); // 1–5
  const [soreMuscles, setSoreMuscles] = useState([]);       // muscle group keys
  const [jointPain, setJointPain] = useState(null);         // 'yes'|'no'
  const [notes, setNotes] = useState('');

  // Step 4, Training
  const [trainingPerformance, setTrainingPerformance] = useState(null); // 'exceeded'|'hit'|'struggled'|'dropped'

  const showCycle = shouldShowCycleQuestion(bioSex, cycleEnabled);
  const hasNutritionTarget = Boolean(nutritionTargets?.targetKcal);
  // Steps section shows whenever the user has not explicitly opted out
  // (stepsEnabled === false). A step target is no longer required to see it:
  // without one we still capture the weekly average and show a short line
  // pointing at Settings (founder direction 2026-06-08). hasStepsTarget is kept
  // for the target-comparison verdict only.
  const showSteps = userProfile?.stepsEnabled !== false;
  const hasStepsTarget = showSteps
    && Boolean(userProfile?.stepsTarget ?? userProfile?.steps_target);
  const hasCardioPrescription = Boolean(userProfile?.cardioPrescription ?? userProfile?.cardio_prescription);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (!user?.id) return;

        // Load check-in day from notification prefs
        let scheduledDay = 0; // default Sunday
        try {
          const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
          if (raw) {
            const prefs = JSON.parse(raw);
            if (prefs.checkinDay !== undefined) scheduledDay = prefs.checkinDay;
          }
        } catch (_) {}
        if (!cancelled) setCheckinDayNum(scheduledDay);

        // Today's day of week (0=Sunday)
        const todayDay = new Date().getDay();

        // OB-7: exactly one day past the scheduled day still reviews the same
        // coaching week, so travel or illness doesn't cost a whole cycle. Any
        // later and the user waits for the next cycle as before. When a day
        // late, every week window below anchors to yesterday so the review
        // covers the week that was missed.
        const dayLate = (todayDay - scheduledDay + 7) % 7 === 1;
        const anchorMs = dayLate ? Date.now() - 86400000 : Date.now();
        if (dayLate && !cancelled) setWeekAnchorMs(anchorMs);

        // Wrong-day gate resolved FIRST, before any throwable data load.
        // The day check needs no data, so settling it up front means a
        // later read that throws (e.g. the morning-weights query) can't
        // skip to the catch below and fail OPEN, which previously let a
        // user check in on a day that wasn't their scheduled one.
        if (todayDay !== scheduledDay && !dayLate) {
          if (!cancelled) setGateState('wrong_day');
          return;
        }

        const weights = await getMorningWeightsLast14Days(user.id);
        if (cancelled) return;
        setAlreadyLoggedToday(hasLoggedToday(weights));
        const weekAgo = anchorMs - 7 * 86400000;
        const thisWeek = weights.filter(w => (w.loggedAt ?? 0) >= weekAgo);
        setWeekWeights(thisWeek);
        setWeighInsThisWeek(thisWeek.length);

        // Compute days since the user first logged a morning weight.
        // Stand-in for "days since they started using the coaching
        // flow": fresh enrolment yields 0 days (enrolment now seeds
        // a morning weight), a returning user who's been logging for
        // months yields a large number. Used to gate the first
        // check-in until at least FIRST_CHECKIN_MIN_DAYS have passed.
        const earliestTs = earliestWeightTs(weights);
        const daysSinceStart = earliestTs
          ? Math.floor((Date.now() - earliestTs) / 86400000)
          : 0;
        const daysToWait = Math.max(0, FIRST_CHECKIN_MIN_DAYS - daysSinceStart);

        // Auto-derive context. Loaded in parallel with the gate
        // evaluation so the screen is fully populated when it lands.
        // weekStartMs is epoch milliseconds (local Monday 00:00), NOT a Date.
        // getWeeklySessionStats / getWeeklyPRCount and localDayKey all require
        // ms. Passing a Date (the old bug) made weekEnd a string and made
        // localDayKey fall back to now, collapsing the week window to today,
        // so sessions read 0 and the rollup range covered a single day and
        // nothing was ever derived: the form showed only blind buttons.
        const weekStartMs = localWeekStartMs(anchorMs);
        const [sessions, prCount, targets] = await Promise.all([
          getWeeklySessionStats(user.id, weekStartMs).catch(() => ({ completed: 0, planned: 0 })),
          getWeeklyPRCount(user.id, weekStartMs).catch(() => 0),
          getNutritionTargets(user.id).catch(() => null),
        ]);
        let rollups = [];
        let plannedDays = [];
        if (targets?.targetKcal) {
          const startIso = localDayKey(weekStartMs); // local-day bounds match the rollup keys
          const endIso = localDayKey(weekStartMs + 6 * 86400000);
          rollups = await getRollupsForRange(user.id, startIso, endIso).catch(() => []);
          plannedDays = await getPlannedDaysInRange(user.id, startIso, endIso).catch(() => []);
        }
        // Week-over-week working-set volume, so the verdict reflects whether
        // training is improving, holding or falling away, not just whether
        // sessions happened. getWeeklyVolumeByMuscle returns [lastWeek, thisWeek]
        // with the same allocation the heatmap uses. ALGO-001: anchor the
        // windows to the END of this Monday-anchored check-in week
        // (weekStartMs + 7d), so "this week" is the week being submitted and
        // "last week" is the full prior Mon-Sun week, not a rolling 7-day
        // window read off the wall clock.
        let volDeltaPct = null;
        let volThisWeek = null;
        let volLastWeek = null;
        try {
          const vol = await getWeeklyVolumeByMuscle(user.id, 2, weekStartMs + 7 * 86400000);
          if (Array.isArray(vol) && vol.length === 2) {
            const sumSets = (w) => Object.values(w?.volumeByMuscle ?? {}).reduce((a, n) => a + (Number(n) || 0), 0);
            volLastWeek = Math.round(sumSets(vol[0]));
            volThisWeek = Math.round(sumSets(vol[1]));
            if (volLastWeek > 0) volDeltaPct = (volThisWeek - volLastWeek) / volLastWeek;
          }
        } catch (_) { /* volume trend optional */ }

        const trainingPerf = deriveTrainingPerformance({
          completed: sessions?.completed ?? 0,
          planned: sessions?.planned ?? 0,
          prs: prCount ?? 0,
          volDeltaPct,
        });
        const calsAdh = deriveCalsAdherence({
          rollups,
          targetKcal: targets?.targetKcal ?? null,
        });
        // Has the user already completed THIS week's check-in? A row can exist
        // from a completed workout (which now writes only sleep_quality), so
        // presence alone is not enough: a real weekly check-in always sets an
        // energy score (step 0 is required). energyScore != null is therefore
        // the reliable "already checked in this week" signal.
        const existingCheckin = await getLatestCheckin(user.id, weekStartMs).catch(() => null);
        const alreadyDone = !!(existingCheckin && existingCheckin.energyScore != null);

        // Days with a finite, positive logged intake (NaN/null/0 excluded), so
        // the shown average can never render NaN.
        const loggedRollups = rollups.filter(r => Number.isFinite(r.kcal_total) && r.kcal_total > 0);

        if (!cancelled) {
          setUnconfirmedPlannedDays(plannedDays);
          setAutoDerived({
            trainingPerformance: trainingPerf,
            trainingMeta: { completed: sessions?.completed ?? 0, planned: sessions?.planned ?? 0, prs: prCount ?? 0, volDeltaPct, volThisWeek, volLastWeek },
            calsAdherence: calsAdh,
            calsMeta: targets?.targetKcal ? {
              daysLogged: loggedRollups.length,
              avgKcal: loggedRollups.length ? Math.round(loggedRollups.reduce((a, r) => a + r.kcal_total, 0) / loggedRollups.length) : 0,
              target: targets.targetKcal,
            } : null,
          });
          if (alreadyDone) {
            // Re-entry: prefill the user's saved answers so they edit, not
            // restart, and the derived figures above still show the intelligence.
            setAlreadyCheckedIn(true);
            setEnergyScore(existingCheckin.energyScore ?? null);
            setStressScore(existingCheckin.stressScore ?? null);
            setSleepHours(existingCheckin.sleepHours != null ? String(existingCheckin.sleepHours) : '');
            setSorenessScore(existingCheckin.sorenessScore ?? null);
            setSoreMuscles(existingCheckin.soreMuscles
              ? String(existingCheckin.soreMuscles).split(',').map(s => s.trim()).filter(Boolean)
              : []);
            setJointPain(existingCheckin.jointPain ? 'yes' : 'no');
            setCycle(existingCheckin.cycleOverride ? 'yes' : 'no');
            const VALID_CALS = ['yes', 'no', 'untracked'];
            const VALID_PERF = ['exceeded', 'hit', 'struggled', 'dropped'];
            setCalsAdherence(VALID_CALS.includes(existingCheckin.calsAdherence)
              ? existingCheckin.calsAdherence : (calsAdh ?? null));
            setCardioAdherence(existingCheckin.cardioAdherence ?? null);
            // Legacy rows (pre-fix) could hold a session-difficulty string in
            // training_performance, which matches no card. Fall back to the
            // derived verdict so the user never sees a stuck non-selection or
            // resubmits an invalid value to the coach.
            setTrainingPerformance(VALID_PERF.includes(existingCheckin.trainingPerformance)
              ? existingCheckin.trainingPerformance : (trainingPerf ?? null));
            // Restore the user's free-text note, stripping the auto-appended
            // joint/sore lines so resubmitting can't duplicate them.
            setNotes(stripAutoNotes(existingCheckin.notes));
            if (existingCheckin.stepsAvg != null) {
              setStepsManual(String(existingCheckin.stepsAvg));
              setStepsOverride(true);
            }
          } else {
            // First check-in this week: pre-select the derived values so the
            // user only overrides when the data is wrong, not pick from scratch.
            if (trainingPerf) setTrainingPerformance(trainingPerf);
            if (calsAdh) setCalsAdherence(calsAdh);
          }
        }

        // Gate evaluation. Order: wrong day -> first check-in too
        // soon (< 5 days since first weight log) -> need more weight
        // readings -> open. The too_soon gate sits between wrong_day
        // and need_weights because a brand-new user without any
        // weights still satisfies "today is chosen day" but hasn't
        // earned enough rhythm to check in yet.
        if (todayDay !== scheduledDay && !dayLate) {
          setGateState('wrong_day');
        } else if (daysToWait > 0) {
          const nextDate = new Date(Date.now() + daysToWait * 86400000);
          setTooSoonCtx({
            daysToWait,
            nextDayLabel: nextDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
            scheduledDayName: DAYS_FULL[scheduledDay],
          });
          setGateState('too_soon');
        } else if (thisWeek.length < MIN_WEIGH_INS) {
          setGateState('need_weights');
        } else if (dayLate) {
          // OB-7: the stricter data gates above still win; a day-late user
          // with enough data must still explicitly choose "Check in anyway".
          setGateState('day_late');
        } else {
          setGateState('open');
        }
      } catch (e) {
        // PIPE-006: do NOT fail open. A load failure means the weight, session
        // and food context that gates the check-in could not be read, so
        // opening the form would let the user submit against missing data and
        // hand the coach a less reliable read. Surface a recoverable error with
        // a retry instead.
        logWarn('WeeklyCheckIn.load', e?.message);
        if (!cancelled) setGateState('load_error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id, reloadKey]);

  // Compute EMA trend weight from this week's weigh-ins
  const ewmaSeries = weekWeights.length > 0 ? computeEWMA(weekWeights) : [];
  const trendKg = ewmaSeries.length ? ewmaSeries[ewmaSeries.length - 1].ewmaKg : null;

  // COMP-008 Fast Check-In eligibility: every field the wizard would ask is
  // already confidently auto-derived for this week, so the only things left to
  // gather are energy and soreness — the two inputs we deliberately never
  // derive, because they feed the recovery score and the rapid-loss safety
  // calorie-raise and must stay a conscious tap. When that holds, the condensed
  // card replaces the four-step flow (with an "Add more detail" escape into the
  // full wizard via forceFullWizard). These gate on the to-be-saved state, so a
  // value the user couldn't auto-fill (e.g. no food logged) falls back to the
  // wizard rather than silently saving a guess. Weight is already covered:
  // gateState only reaches 'open' once MIN_WEIGH_INS is met.
  const fastEligible =
    gateState === 'open' &&
    !forceFullWizard &&
    trainingPerformance != null &&
    (!hasNutritionTarget || calsAdherence != null) &&
    (!showSteps || !!stepsSummary?.registered) &&
    (!hasCardioPrescription || cardioAdherence != null);

  // The fast card's only required inputs: the two we never derive.
  const fastCanSubmit = energyScore !== null && sorenessScore !== null;

  function stepCanAdvance(s) {
    if (s === 0) return energyScore !== null;
    if (s === 1) return true;
    if (s === 2) return sorenessScore !== null;
    if (s === 3) return trainingPerformance !== null;
    return false;
  }

  // Adherence backstop: the user confirms they ate the plan on days they never
  // confirmed in the diary. Flips those days' planned meals to actuals, then
  // re-derives calorie adherence so it reflects the now-counted intake.
  const handleConfirmPlannedWeek = useCallback(async () => {
    if (!user?.id || confirmingPlanned || unconfirmedPlannedDays.length === 0) return;
    setConfirmingPlanned(true);
    try {
      for (const day of unconfirmedPlannedDays) {
        // eslint-disable-next-line no-await-in-loop
        await confirmPlannedDay(user.id, day);
      }
      const weekStartMs = localWeekStartMs(weekAnchorMs);
      const startIso = localDayKey(weekStartMs);
      const endIso = localDayKey(weekStartMs + 6 * 86400000);
      const rollups = await getRollupsForRange(user.id, startIso, endIso).catch(() => []);
      const targetKcal = autoDerived.calsMeta?.target ?? null;
      const calsAdh = deriveCalsAdherence({ rollups, targetKcal });
      const loggedRollups = rollups.filter((r) => Number.isFinite(r.kcal_total) && r.kcal_total > 0);
      if (calsAdh) setCalsAdherence(calsAdh);
      setAutoDerived((prev) => ({
        ...prev,
        calsAdherence: calsAdh,
        calsMeta: prev.calsMeta ? {
          ...prev.calsMeta,
          daysLogged: loggedRollups.length,
          avgKcal: loggedRollups.length ? Math.round(loggedRollups.reduce((a, r) => a + r.kcal_total, 0) / loggedRollups.length) : 0,
        } : prev.calsMeta,
      }));
      setUnconfirmedPlannedDays([]);
    } catch (_) { /* leave the prompt up so it can be retried */ }
    setConfirmingPlanned(false);
  }, [user?.id, confirmingPlanned, unconfirmedPlannedDays, autoDerived.calsMeta, weekAnchorMs]);

  const handleSubmit = useCallback(async () => {
    if (busy) return;
    audit('checkin.weekly.submit');
    // D2: the week's one deliberate commitment gets the commit beat
    // (reduce-motion gated inside the vocabulary).
    haptics.commit();
    setBusy(true);
    try {
      const userId = user?.id;
      if (!userId) return;

      await saveWeeklyCheckin(userId, {
        weekStart: weekStart.getTime(),
        energyScore,
        sorenessScore,
        stressScore,
        sleepHours: sleepHours.trim() ? parseFloat(sleepHours) : null,
        calsAdherence: calsAdherence ?? null,
        stepsAdherence: stepsAdherence ?? null,
        stepsAvg: showSteps
          // A typed value always wins (manual fallback, or an override of the
          // auto figure); otherwise use the registered average; otherwise null.
          ? (stepsManual !== ''
            ? parseInt(stepsManual, 10)
            : stepsSummary?.registered
              ? Math.round(stepsSummary.avgSteps)
              : null)
          : null,
        cardioAdherence: cardioAdherence ?? null,
        cycleOverride: showCycle && cycle === 'yes',
        trainingPerformance: trainingPerformance ?? null,
        jointPain: jointPain === 'yes',
        soreMuscles: soreMuscles.length > 0 ? soreMuscles.join(',') : null,
        notes: [
          notes.trim(),
          jointPain === 'yes' ? 'Joint pain flagged this week.' : '',
          soreMuscles.length > 0 ? `Sore: ${soreMuscles.join(', ')}.` : '',
        ].filter(Boolean).join(' ') || null,
      });

      // Reschedule the check-in reminder so we don't bug them again this week.
      // The prefs blob is FLAT (checkinEnabled, checkinDay, checkinHour,
      // checkinMinute) — the shape CoachingRemindersScreen,
      // NotificationSettingsScreen and ProOnboardingScreen write and
      // restoreNotifications reads. This used to read a nested
      // prefs.checkin.enabled shape that nothing writes, so the post-submit
      // reschedule never fired.
      try {
        const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
        const prefs = raw ? JSON.parse(raw) : null;
        if (prefs?.checkinEnabled) {
          await scheduleNextCheckinReminder(
            userId,
            prefs.checkinDay ?? 0,
            prefs.checkinHour ?? 12,
            prefs.checkinMinute ?? 0,
          );
        }
        // A check-in just landed, so next week's coach output computes
        // overnight. Lay (or refresh) the recurring Monday 09:00 "plan
        // ready" reminder unless the user disabled it. Default on.
        if (prefs?.coachReady?.enabled !== false) {
          await scheduleWeeklyCoachReady(
            prefs?.coachReady?.hour ?? 9,
            prefs?.coachReady?.minute ?? 0,
          );
        }
      } catch (_) {}

      // OPP-C03: this check-in resolved any pending missed-check-in episode.
      // Re-lay the follow-up pair against the NEXT expected occurrence (the
      // helper self-guards: Pro-only, toggle, ED flag).
      try { await scheduleMissedCheckinFollowups(userId); } catch (_) {}

      const goCoach = () => navigation.navigate('CoachOutput', { weekStart: weekStart.getTime() });
      const permStatus = await getNotificationPermissionStatus();
      if (permStatus === 'undetermined') {
        appAlert(
          'Daily weight reminders',
          'Logging your weight each morning makes your coaching more accurate. A 7-day trend is much more reliable than a single reading. Enable a daily nudge?',
          [
            { text: 'Not now', style: 'cancel', onPress: goCoach },
            {
              text: 'Yes please',
              onPress: async () => {
                await requestNotificationPermissions().catch(() => {});
                goCoach();
              },
            },
          ],
          { cancelable: false },
        );
      } else {
        goCoach();
      }
    } catch (e) {
      logError('WeeklyCheckInScreen.submit', e, { userId: user?.id });
      appAlert(
        'Couldn\'t save check-in',
        e?.message ?? 'Try again.',
      );
    } finally {
      setBusy(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    busy, user?.id, energyScore, sorenessScore, stressScore, sleepHours,
    calsAdherence, stepsAdherence, cardioAdherence, trainingPerformance, jointPain, notes, weekStart, navigation,
  ]);

  // ─── Step views ─────────────────────────────────────────────────────────────

  function renderStep0() {
    return (
      <>
        <Text style={styles.stepHeading}>How are you feeling?</Text>
        <Text style={styles.stepSubtitle}>How your body and mind are doing sets the context for everything else.</Text>

        <View style={styles.section}>
          <SectionLabel>Energy and motivation this week</SectionLabel>
          <ChipRow
            options={[
              { value: 1, label: 'Low' },
              { value: 2, label: 'Below normal' },
              { value: 3, label: 'Normal' },
              { value: 4, label: 'Good' },
              { value: 5, label: 'High' },
            ]}
            selected={energyScore}
            onSelect={setEnergyScore}
          />
        </View>

        <View style={styles.section}>
          <SectionLabel hint="Work, life, family, anything outside the gym">Stress level this week</SectionLabel>
          <ChipRow
            options={[
              { value: 1, label: 'Low' },
              { value: 2, label: 'Mild' },
              { value: 3, label: 'Moderate' },
              { value: 4, label: 'High' },
              { value: 5, label: 'Very high' },
            ]}
            selected={stressScore}
            onSelect={setStressScore}
          />
        </View>

        <View style={styles.section}>
          <SectionLabel hint="Optional">Average sleep hours</SectionLabel>
          <TextInput
            style={styles.shortInput}
            value={sleepHours}
            onChangeText={setSleepHours}
            accessibilityLabel="Average sleep hours"
            keyboardType="decimal-pad"
            placeholder="7.5"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            maxLength={4}
          />
        </View>
      </>
    );
  }

  function renderStep1() {
    return (
      <>
        <Text style={styles.stepHeading}>This week's data</Text>
        <Text style={styles.stepSubtitle}>How did the week go against your targets?</Text>

        {/* Weight trend, read-only */}
        {!loading && (
          <View style={styles.section}>
            <SectionLabel
              hint="Your 7-day smoothed trend. More reliable than a single reading."
            >
              Morning weight trend
            </SectionLabel>
            {weekWeights.length > 0 ? (
              <View style={styles.weightSummaryRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.weightSummaryText}>
                  {weekWeights.length} {weekWeights.length === 1 ? 'day' : 'days'} logged
                  {trendKg ? ` · trend ${formatBodyWeightShort(trendKg, bwu)}` : ''}
                </Text>
                {!alreadyLoggedToday && (
                  <Text style={styles.weightSummaryMissed}>Not yet today</Text>
                )}
              </View>
            ) : (
              <Text style={styles.skipNote}>
                No morning weights logged this week. Log each morning from the Train tab. One reading per day makes the trend far more accurate.
              </Text>
            )}
          </View>
        )}

        {/* Cycle (GAP row 15). Only shown when the user opted in from
            Settings and their recorded biological sex is female. Sits
            with the weight question because that's what it qualifies:
            a flagged week tells the coach to hold weight-based changes. */}
        {showCycle && (
          <View style={styles.section}>
            <SectionLabel
              hint="If your period could be moving the scale this week, flag it. The coach holds weight-based changes so a normal fluctuation isn't read as fat gain or loss."
            >
              Cycle
            </SectionLabel>
            <OptionRow
              options={[
                { value: 'yes', label: 'Affecting the scale' },
                { value: 'no', label: 'Not this week' },
              ]}
              selected={cycle}
              onSelect={setCycle}
            />
          </View>
        )}

        {/* Nutrition adherence */}
        {hasNutritionTarget ? (
          <View style={styles.section}>
            <SectionLabel>Calorie target: how did you get on?</SectionLabel>
            {autoDerived.calsMeta ? (
              autoDerived.calsMeta.daysLogged > 0 ? (
                <Text style={styles.autoDerivedNote}>
                  From your diary: {autoDerived.calsMeta.daysLogged} of 7 days logged,
                  averaging {autoDerived.calsMeta.avgKcal.toLocaleString('en-GB')} kcal a day
                  against your {autoDerived.calsMeta.target.toLocaleString('en-GB')} target ({
                    autoDerived.calsMeta.avgKcal <= autoDerived.calsMeta.target * 0.9 ? 'under target'
                    : autoDerived.calsMeta.avgKcal >= autoDerived.calsMeta.target * 1.1 ? 'over target'
                    : 'on target'
                  }). Adjust below only if your logging was off, for example you tracked in another app.
                </Text>
              ) : (
                <Text style={styles.autoDerivedNote}>
                  No food logged in your diary this week. If you tracked elsewhere, set it below.
                </Text>
              )
            ) : null}
            {unconfirmedPlannedDays.length > 0 ? (
              <View style={styles.plannedBackstop}>
                <Text style={styles.plannedBackstopText}>
                  You had a meal plan on {unconfirmedPlannedDays.length} {unconfirmedPlannedDays.length === 1 ? 'day' : 'days'} this
                  week but didn&apos;t confirm eating {unconfirmedPlannedDays.length === 1 ? 'it' : 'them'}, so {unconfirmedPlannedDays.length === 1 ? "it isn't" : "they aren't"} counted
                  above. If you stuck to your plan, confirm so it counts.
                </Text>
                <TouchableOpacity
                  style={styles.plannedBackstopBtn}
                  onPress={handleConfirmPlannedWeek}
                  disabled={confirmingPlanned}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm I ate as planned on those days"
                >
                  <Text style={styles.plannedBackstopBtnText}>{confirmingPlanned ? 'Confirming' : 'I ate as planned'}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <OptionRow
              options={[
                { value: 'yes', label: 'Hit it' },
                { value: 'no', label: 'Off target' },
                { value: 'untracked', label: "Didn't track" },
              ]}
              selected={calsAdherence}
              onSelect={setCalsAdherence}
            />
          </View>
        ) : (
          <View style={styles.section}>
            <SectionLabel>Calorie target</SectionLabel>
            <TouchableOpacity onPress={() => navigation.navigate('NutritionTargets')} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Set up nutrition targets">
              <Text style={styles.skipNoteTappable}>
                Nutrition targets not set. Tap to set them up and turn on calorie coaching.
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Steps. Read the registered average when 4+ days are tracked,
            otherwise ask for a single average as the fallback. */}
        {showSteps && (
          <View style={styles.section}>
            {stepsSummary?.registered && !stepsOverride ? (
              <>
                <SectionLabel>Steps this week</SectionLabel>
                <TouchableOpacity
                  style={styles.stepsAutoRow}
                  onPress={() => {
                    setStepsManual(String(Math.round(stepsSummary.avgSteps)));
                    setStepsOverride(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Averaged ${Math.round(stepsSummary.avgSteps)} steps a day. Tap to override.`}
                >
                  <Ionicons name="walk-outline" size={18} color={colors.primary} />
                  <Text style={styles.stepsAutoText}>
                    Averaged {Math.round(stepsSummary.avgSteps).toLocaleString('en-GB')} a day. Tap to override.
                  </Text>
                </TouchableOpacity>
                {(() => {
                  const target = Number(userProfile?.stepsTarget ?? userProfile?.steps_target) || 0;
                  if (!target) return null;
                  const avg = Math.round(stepsSummary.avgSteps);
                  const verdict = avg >= target ? 'on target'
                    : avg >= target * 0.9 ? 'just under target'
                    : 'under target';
                  return (
                    <Text style={styles.autoDerivedNote}>
                      Against your {target.toLocaleString('en-GB')} step target ({verdict}). Override only if your steps were tracked on a device not synced here.
                    </Text>
                  );
                })()}
              </>
            ) : (
              <>
                <SectionLabel hint={stepsSummary?.registered
                  ? 'Enter the average from your tracker'
                  : 'We could not read your steps automatically this week'}>
                  Average steps a day
                </SectionLabel>
                <TextInput
                  style={styles.shortInput}
                  value={stepsManual}
                  onChangeText={t => setStepsManual(t.replace(/[^0-9]/g, ''))}
                  accessibilityLabel="Average steps a day"
                  keyboardType="number-pad"
                  placeholder="8000"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="done"
                  maxLength={6}
                />
              </>
            )}
            {!hasStepsTarget && (
              <Text style={styles.autoDerivedNote}>
                No step target set. Add one in Settings for step coaching, or just log your average here.
              </Text>
            )}
          </View>
        )}

        {/* Cardio (shown once a cardio prescription has been applied
            from the coach card; mirrors the steps adherence question). */}
        {hasCardioPrescription && (
          <View style={styles.section}>
            <SectionLabel>Prescribed cardio</SectionLabel>
            {/* A7 provenance: the pre-selected answer names its source, matching
                the diary and logged-sessions notes above. */}
            {cardioMeta ? (
              <Text style={styles.autoDerivedNote}>
                {cardioMeta.sessions > 0 && cardioMeta.targetSessions > 0
                  ? `From your cardio log: ${cardioMeta.sessions} of ${cardioMeta.targetSessions} prescribed session${cardioMeta.targetSessions === 1 ? '' : 's'} this week. Adjust below only if you did cardio that isn't logged here.`
                  : cardioMeta.sessions > 0
                    ? `From your cardio log: ${cardioMeta.sessions} session${cardioMeta.sessions === 1 ? '' : 's'} this week. Adjust below only if you did cardio that isn't logged here.`
                    : "No cardio logged this week. If you did yours elsewhere, set it below."}
              </Text>
            ) : null}
            <OptionRow
              options={[
                { value: 'hit', label: 'Did it' },
                { value: 'mostly', label: 'Mostly' },
                { value: 'missed', label: 'Not this week' },
              ]}
              selected={cardioAdherence}
              onSelect={setCardioAdherence}
            />
          </View>
        )}
      </>
    );
  }

  function renderStep2() {
    return (
      <>
        <Text style={styles.stepHeading}>Recovery and issues</Text>
        <Text style={styles.stepSubtitle}>Helps the coach decide whether to hold, push, or ease off training.</Text>

        <View style={styles.section}>
          <SectionLabel>Overall muscle soreness this week</SectionLabel>
          <ChipRow
            options={[
              { value: 1, label: 'None' },
              { value: 2, label: 'Mild' },
              { value: 3, label: 'Moderate' },
              { value: 4, label: 'High' },
              { value: 5, label: 'Very high' },
            ]}
            selected={sorenessScore}
            onSelect={setSorenessScore}
          />
        </View>

        {sorenessScore !== null && sorenessScore >= 2 && (
          <View style={styles.section}>
            <SectionLabel hint="Tap any that feel sore or fatigued (optional)">Which muscles?</SectionLabel>
            <View style={styles.muscleChipGrid}>
              {[
                'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
                'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core',
              ].map(muscle => {
                const sel = soreMuscles.includes(muscle);
                return (
                  <TouchableOpacity
                    key={muscle}
                    style={[styles.muscleChip, sel && styles.muscleChipSelected]}
                    onPress={() =>
                      setSoreMuscles(prev =>
                        prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle],
                      )
                    }
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sel }}
                    accessibilityLabel={muscle}
                  >
                    <Text style={[styles.muscleChipText, sel && styles.muscleChipTextSelected]}>
                      {muscle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <SectionLabel hint="Joints and tendons, not normal muscle soreness">Any joint or tendon pain?</SectionLabel>
          <OptionRow
            options={[
              { value: 'no', label: 'No' },
              { value: 'yes', label: 'Yes' },
            ]}
            selected={jointPain}
            onSelect={setJointPain}
          />
        </View>

        <View style={styles.section}>
          <SectionLabel hint="Illness, travel, big life stress, anything unusual (optional)">Anything else to flag?</SectionLabel>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            multiline
            accessibilityLabel="Anything else to flag?"
            placeholder="Anything Volyume should take into account this week…"
            placeholderTextColor={colors.textMuted}
            maxLength={280}
            textAlignVertical="top"
            returnKeyType="default"
          />
          <Text style={styles.charCount}>{notes.length}/280</Text>
        </View>
      </>
    );
  }

  function renderStep3() {
    return (
      <>
        <Text style={styles.stepHeading}>Training performance</Text>
        <Text style={styles.stepSubtitle}>
          {autoDerived.trainingPerformance
            ? 'Pre-filled from your logged sessions. Tap a different option if it feels wrong.'
            : 'How did your sessions go compared to what you expected?'}
        </Text>

        <View style={styles.section}>
          <SectionLabel>This week's training felt like</SectionLabel>
          {autoDerived.trainingMeta && autoDerived.trainingMeta.completed > 0 ? (
            <Text style={styles.autoDerivedNote}>
              From your logged sessions: {autoDerived.trainingMeta.completed} session{autoDerived.trainingMeta.completed === 1 ? '' : 's'} this
              week, {autoDerived.trainingMeta.prs} PR{autoDerived.trainingMeta.prs === 1 ? '' : 's'}
              {autoDerived.trainingMeta.volDeltaPct != null
                ? `, training volume ${
                    autoDerived.trainingMeta.volDeltaPct >= 0.05 ? `up ${Math.round(autoDerived.trainingMeta.volDeltaPct * 100)}%`
                    : autoDerived.trainingMeta.volDeltaPct <= -0.10 ? `down ${Math.abs(Math.round(autoDerived.trainingMeta.volDeltaPct * 100))}%`
                    : 'about level'
                  } on last week`
                : ''}
              {autoDerived.trainingPerformance ? `, ${PERF_VERDICT_TEXT[autoDerived.trainingPerformance]}` : ''}.
              Tap a card to override.
            </Text>
          ) : (
            <Text style={styles.autoDerivedNote}>
              No sessions logged in the app this week. Pick how training went below.
            </Text>
          )}
          <View style={styles.perfGrid}>
            {[
              { value: 'exceeded', label: 'Beat my targets', icon: 'trending-up' },
              { value: 'hit', label: 'Hit targets as planned', icon: 'checkmark-circle-outline' },
              { value: 'struggled', label: 'Struggled to hit targets', icon: 'remove-circle-outline' },
              { value: 'dropped', label: 'Performance dropped', icon: 'trending-down' },
            ].map(opt => {
              const isSelected = trainingPerformance === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.perfCard, isSelected && styles.perfCardSelected]}
                  onPress={() => setTrainingPerformance(isSelected ? null : opt.value)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={opt.label}
                >
                  <Ionicons
                    name={opt.icon}
                    size={22}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.perfCardText, isSelected && styles.perfCardTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </>
    );
  }

  // ─── Fast Check-In ───────────────────────────────────────────────────────────
  // The condensed card shown when fastEligible holds. The derived facts are
  // read-only confirmations; energy and soreness are the only two inputs. It
  // reuses the same energyScore/sorenessScore state and the same handleSubmit
  // as the wizard, so submitting here is identical to a wizard run where the
  // user accepted every pre-filled value and answered only the two required
  // recovery questions.
  function renderFastCheckIn() {
    const CALS_TEXT = { yes: 'Hit your target', no: 'Off your target', untracked: "Didn't track" };
    const CARDIO_TEXT = { hit: 'Did it', mostly: 'Mostly done', missed: 'Not this week' };
    const summaryRows = [
      {
        key: 'training',
        icon: 'barbell-outline',
        label: 'Training',
        value: trainingPerformance ? PERF_VERDICT_TEXT[trainingPerformance] : null,
      },
      hasNutritionTarget && {
        key: 'cals',
        icon: 'restaurant-outline',
        label: 'Nutrition',
        value: calsAdherence ? CALS_TEXT[calsAdherence] : null,
      },
      showSteps && stepsSummary?.registered && {
        key: 'steps',
        icon: 'walk-outline',
        label: 'Steps',
        value: `${Math.round(stepsSummary.avgSteps).toLocaleString('en-GB')} a day`,
      },
      hasCardioPrescription && {
        key: 'cardio',
        icon: 'heart-outline',
        label: 'Cardio',
        value: cardioAdherence ? CARDIO_TEXT[cardioAdherence] : null,
      },
      {
        key: 'weight',
        icon: 'scale-outline',
        label: 'Weight',
        value: `${weekWeights.length} ${weekWeights.length === 1 ? 'day' : 'days'} logged${trendKg ? ` · trend ${formatBodyWeightShort(trendKg, bwu)}` : ''}`,
      },
    ].filter(Boolean).filter(r => r.value != null);

    return (
      <>
        <Text style={styles.stepHeading}>Quick check-in</Text>
        <Text style={styles.stepSubtitle}>
          We've read your week from your logs. Just confirm how you're recovering.
        </Text>

        <View style={styles.fastSummaryCard}>
          {summaryRows.map(row => (
            <View key={row.key} style={styles.fastSummaryRow}>
              <Ionicons name={row.icon} size={16} color={colors.textSecondary} style={styles.fastSummaryIcon} />
              <Text style={styles.fastSummaryLabel}>{row.label}</Text>
              <Text style={styles.fastSummaryValue} numberOfLines={1}>{row.value}</Text>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <SectionLabel>Energy and motivation this week</SectionLabel>
          <ChipRow
            options={[
              { value: 1, label: 'Low' },
              { value: 2, label: 'Below normal' },
              { value: 3, label: 'Normal' },
              { value: 4, label: 'Good' },
              { value: 5, label: 'High' },
            ]}
            selected={energyScore}
            onSelect={setEnergyScore}
          />
        </View>

        <View style={styles.section}>
          <SectionLabel>Overall muscle soreness this week</SectionLabel>
          <ChipRow
            options={[
              { value: 1, label: 'None' },
              { value: 2, label: 'Mild' },
              { value: 3, label: 'Moderate' },
              { value: 4, label: 'High' },
              { value: 5, label: 'Very high' },
            ]}
            selected={sorenessScore}
            onSelect={setSorenessScore}
          />
        </View>
      </>
    );
  }

  // ─── Gate screens ──────────────────────────────────────────────────────────
  if (loading || gateState === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <SkeletonCard height={72} />
          <SkeletonCard height={160} />
          <SkeletonCard height={120} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (gateState === 'wrong_day') {
    const dayName = DAYS_FULL[checkinDayNum];
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header bar matches the rest of the app: single chevron back,
            screen title in line. Empty card style below mirrors the
            BodyMetrics empty state for visual consistency. */}
        <View style={styles.gateHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.gateHeaderTitle}>Weekly check-in</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.gateScroll}>
          <View style={styles.gateCard}>
            <Ionicons name="calendar-outline" size={40} color={colors.surface3} />
            <Text style={styles.gateTitle}>Come back on {dayName}</Text>
            <Text style={styles.gateBody}>
              Your check-in day is {dayName}. Coaching runs on a weekly rhythm tied to that day, so the numbers compare like for like each time.
            </Text>
            <Text style={styles.gateBody}>
              You can change the day in Settings → Coaching reminders. In the meantime, log your weight each morning from the Train tab. Every reading makes the trend more accurate.
            </Text>
          </View>
          <TouchableOpacity style={styles.gateBtn} onPress={() => navigation.goBack()} activeOpacity={0.85} accessibilityRole="button">
            <Text style={styles.gateBtnText}>Got it</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // OB-7: exactly one day late. The same week is still reviewable, so offer
  // the override with the same softer-accuracy framing the weights gate uses,
  // rather than costing the user a whole coaching cycle.
  if (gateState === 'day_late') {
    const dayName = DAYS_FULL[checkinDayNum];
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.gateHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.gateHeaderTitle}>Weekly check-in</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.gateScroll}>
          <View style={styles.gateCard}>
            <Ionicons name="calendar-outline" size={40} color={colors.surface3} />
            <Text style={styles.gateTitle}>Your check-in day was {dayName}</Text>
            <Text style={styles.gateBody}>
              You&apos;re one day late, so the week you missed can still be reviewed. If travel or illness pushed you off your day, check in now rather than lose the week.
            </Text>
            <Text style={styles.gateBody}>
              A day&apos;s delay makes the read slightly less accurate than checking in on {dayName}. Your next check-in lands back on {dayName} as normal.
            </Text>
          </View>
          <TouchableOpacity style={styles.gateBtn} onPress={() => setGateState('open')} activeOpacity={0.85} accessibilityRole="button">
            <Text style={styles.gateBtnText}>Check in anyway</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gateDeferBtn} onPress={() => navigation.goBack()} activeOpacity={0.75} accessibilityRole="button">
            <Text style={styles.gateDeferBtnText}>Wait for {dayName}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (gateState === 'too_soon') {
    const { daysToWait, nextDayLabel, scheduledDayName } = tooSoonCtx;
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.gateHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.gateCenter}>
          <View style={styles.gateIconWrap}>
            <Ionicons name="time-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.gateTitle}>First check-in needs more data</Text>
          <Text style={styles.gateBody}>
            Precision Coaching needs at least {FIRST_CHECKIN_MIN_DAYS} days of data before the first weekly check-in. Right now there {daysToWait === 1 ? 'is 1 day' : `are ${daysToWait} days`} left.
            {'\n\n'}
            Coaching adjustments compare this week to last. With nothing to compare against yet, the weekly read would be guesswork. Log your morning weight each day and food data if you're on Diary, and the first check-in lands on {nextDayLabel} (your chosen day, {scheduledDayName}).
          </Text>
          <TouchableOpacity style={styles.gateBtn} onPress={() => navigation.goBack()} activeOpacity={0.85} accessibilityRole="button">
            <Text style={styles.gateBtnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (gateState === 'need_weights') {
    const dayName = DAYS_FULL[checkinDayNum];
    const remaining = MIN_WEIGH_INS - weighInsThisWeek;
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.gateHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.gateCenter}>
          <View style={styles.gateIconWrap}>
            <Ionicons name="scale-outline" size={32} color={colors.warning} />
          </View>
          <Text style={styles.gateTitle}>A few more weight readings needed</Text>
          <Text style={styles.gateBody}>
            You've logged {weighInsThisWeek} {weighInsThisWeek === 1 ? 'reading' : 'readings'} this week. Your coach needs at least {MIN_WEIGH_INS} to calculate a reliable trend.
            {'\n\n'}
            Body weight shifts naturally each day due to fluid, food, and hormones. Logging every other day gives enough readings to smooth out that noise and see what's actually changing. With fewer readings, the coaching adjustments won't be as accurate.
            {'\n\n'}
            Log {remaining} more {remaining === 1 ? 'reading' : 'readings'} from the Train tab and come back on {dayName}.
          </Text>
          <TouchableOpacity style={styles.gateBtn} onPress={() => navigation.goBack()} activeOpacity={0.85} accessibilityRole="button">
            <Text style={styles.gateBtnText}>Log my weight first</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gateDeferBtn} onPress={() => setGateState('open')} activeOpacity={0.75} accessibilityRole="button">
            <Text style={styles.gateDeferBtnText}>Check in anyway</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (gateState === 'load_error') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.gateHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.gateCenter}>
          <View style={styles.gateIconWrap}>
            <Ionicons name="cloud-offline-outline" size={32} color={colors.warning} />
          </View>
          <Text style={styles.gateTitle}>Couldn't load your week</Text>
          <Text style={styles.gateBody}>
            We couldn't read this week's data, so the check-in is held to keep the coaching accurate.
          </Text>
          <TouchableOpacity
            style={styles.gateBtn}
            onPress={() => { setLoading(true); setGateState('loading'); setReloadKey(k => k + 1); }}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.gateBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main check-in screen ──────────────────────────────────────────────────

  // COPY-002: plain visible header. The Precision Coaching branding stays in
  // the supporting copy (gate and intro text), it does not need to lead here.
  const checkinDayLabel = 'Weekly check-in';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => (!fastEligible && step > 0) ? setStep(s => s - 1) : navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={(!fastEligible && step > 0) ? 'Previous step' : 'Back'}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View
          style={styles.headerCenter}
          accessible
          accessibilityLabel={fastEligible ? `${checkinDayLabel}, quick check-in` : `${checkinDayLabel}, step ${step + 1} of ${TOTAL_STEPS}`}
        >
          <Text style={styles.headerTitle}>{checkinDayLabel}</Text>
          {fastEligible
            ? <Text style={styles.headerQuickTag}>Quick check-in</Text>
            : <StepBar current={step} total={TOTAL_STEPS} />}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Ritual intro, only on the wizard's first step */}
          {!fastEligible && step === 0 && (
            <View style={styles.ritualIntro}>
              <Text style={styles.ritualIntroTitle}>{checkinDayLabel}</Text>
              <Text style={styles.ritualIntroSub}>Just four questions, and your coach reads them every week.</Text>
            </View>
          )}

          {/* Week label */}
          <Text style={styles.weekLabel}>{weekLabel}</Text>

          {alreadyCheckedIn && (fastEligible || step === 0) && (
            <View style={styles.alreadyInRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.alreadyInText}>
                You've checked in this week. Your answers are loaded, edit and resubmit to update.
              </Text>
            </View>
          )}

          {/* Content: condensed fast card, or the four-step wizard */}
          {fastEligible ? renderFastCheckIn() : (
            <>
              {step === 0 && renderStep0()}
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
            </>
          )}

          {/* Navigation CTA */}
          <View style={styles.ctaRow}>
            {fastEligible ? (
              <TouchableOpacity
                style={[styles.ctaBtn, !fastCanSubmit && styles.ctaBtnDisabled]}
                onPress={handleSubmit}
                disabled={!fastCanSubmit || busy}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ disabled: !fastCanSubmit || busy }}
                accessibilityLabel="See this week's coaching"
              >
                {busy ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={[styles.ctaBtnText, !fastCanSubmit && styles.ctaBtnTextDisabled]}>
                    See this week's coaching
                  </Text>
                )}
              </TouchableOpacity>
            ) : step < TOTAL_STEPS - 1 ? (
              <TouchableOpacity
                style={[styles.ctaBtn, !stepCanAdvance(step) && styles.ctaBtnDisabled]}
                onPress={() => setStep(s => s + 1)}
                disabled={!stepCanAdvance(step)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ disabled: !stepCanAdvance(step) }}
                accessibilityLabel="Next"
              >
                <Text style={[styles.ctaBtnText, !stepCanAdvance(step) && styles.ctaBtnTextDisabled]}>
                  Next
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={!stepCanAdvance(step) ? colors.textMuted : colors.background}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.ctaBtn, !stepCanAdvance(step) && styles.ctaBtnDisabled]}
                onPress={handleSubmit}
                disabled={!stepCanAdvance(step) || busy}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ disabled: !stepCanAdvance(step) || busy }}
                accessibilityLabel="See this week's coaching"
              >
                {busy ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={[styles.ctaBtnText, !stepCanAdvance(step) && styles.ctaBtnTextDisabled]}>
                    See this week's coaching
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* COMP-008: escape from the fast card into the full wizard. */}
          {fastEligible && (
            <TouchableOpacity
              style={styles.fastExpandBtn}
              onPress={() => { setForceFullWizard(true); setStep(0); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Add more detail"
            >
              <Text style={styles.fastExpandText}>Add more detail</Text>
            </TouchableOpacity>
          )}

          {fastEligible && !fastCanSubmit && (
            <Text style={styles.ctaHint}>Rate your energy and soreness to continue.</Text>
          )}

          {!fastEligible && !stepCanAdvance(step) && step !== 1 && (
            <Text style={styles.ctaHint}>
              {step === 0 ? 'Rate your energy to continue.' : step === 2 ? 'Rate your soreness to continue.' : 'Pick how training felt to continue.'}
            </Text>
          )}

          <View style={styles.bottomPad} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  // ── Gate screens ────────────────────────────────────────────────────────────
  gateHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  gateHeaderTitle: {
    ...type.title, color: colors.textPrimary,
  },
  // Centred wrapper kept for the other gate states (loading / etc.) that
  // still use it elsewhere on this screen.
  gateCenter: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xxl, gap: spacing.lg,
  },
  gateIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  // Empty-state card matches BodyMetricsScreen.emptyCard so the visual
  // language is consistent across info screens.
  gateScroll: {
    padding: spacing.lg, gap: spacing.lg,
  },
  gateCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xxl,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: spacing.md,
  },
  gateTitle: {
    ...type.title, color: colors.textSecondary,
    textAlign: 'center',
  },
  gateBody: {
    fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20,
    textAlign: 'center',
  },
  gateBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.lg, alignItems: 'center',
  },
  gateBtnText: {
    fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.onPrimary,
  },
  gateDeferBtn: {
    paddingVertical: spacing.md, alignItems: 'center',
  },
  gateDeferBtnText: {
    fontSize: fontSize.sm, color: colors.textMuted,
  },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backBtn: { width: 32, alignItems: 'flex-start' },
  headerCenter: { flex: 1, alignItems: 'center', gap: spacing.xs },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  headerSpacer: { width: 32 },

  stepBar: { flexDirection: 'row', gap: spacing.xs },
  stepDot: {
    width: 20, height: 4, borderRadius: 2,
    backgroundColor: colors.surface3,
  },
  stepDotDone: { backgroundColor: withAlpha(colors.primary, 0.376) },
  stepDotActive: { backgroundColor: colors.primary },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  weekLabel: {
    ...type.label,
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  alreadyInRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  alreadyInText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },
  stepHeading: {
    ...type.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },

  section: { marginBottom: spacing.xl },
  sectionLabelWrap: { marginBottom: spacing.sm, gap: spacing.xxs },
  sectionLabel: {
    ...type.label,
    color: colors.textSecondary,
  },
  sectionHint: {
    ...type.caption,
    color: colors.textMuted,
  },

  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    flex: 1, minWidth: 52, minHeight: 52,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, gap: spacing.xxs,
  },
  chipSelected: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  chipValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textSecondary },
  chipValueSelected: { color: colors.primary },
  chipLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.textMuted, textAlign: 'center' },
  chipLabelSelected: { color: colors.primary },

  optionRow: { flexDirection: 'row', gap: spacing.sm },
  optionBtn: {
    flex: 1, minHeight: 48,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xs,
  },
  optionBtnSelected: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  optionBtnText: { ...type.label, color: colors.textSecondary, textAlign: 'center' },
  optionBtnTextSelected: { color: colors.primary, fontWeight: fontWeight.semibold },

  weightSummaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  weightSummaryText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary },
  weightSummaryMissed: { ...type.caption, color: colors.textMuted, fontStyle: 'italic' },

  skipNote: {
    fontSize: fontSize.sm, color: colors.textMuted, fontStyle: 'italic',
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, lineHeight: 20,
  },
  skipNoteTappable: {
    fontSize: fontSize.sm, color: colors.primary,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryBg, borderRadius: radius.md,
    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.251),
  },
  autoDerivedNote: {
    ...type.caption, color: colors.textSecondary,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
    fontStyle: 'italic',
  },
  plannedBackstop: {
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  plannedBackstopText: { ...type.caption, color: colors.textPrimary },
  plannedBackstopBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, minHeight: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  plannedBackstopBtnText: { color: colors.onPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },

  shortInput: {
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: fontSize.lg, color: colors.textPrimary,
    fontWeight: fontWeight.medium, width: 120,
  },
  stepsAutoRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  stepsAutoText: { ...type.num('body'), color: colors.textPrimary },

  notesInput: {
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.md,
    fontSize: fontSize.md, color: colors.textPrimary,
    minHeight: 88, lineHeight: 22,
  },
  charCount: { ...type.num('caption'), color: colors.textMuted, textAlign: 'right', marginTop: spacing.xs },

  perfGrid: { gap: spacing.sm },
  perfCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  perfCardSelected: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  perfCardText: { ...type.label, color: colors.textSecondary, flex: 1 },
  perfCardTextSelected: { color: colors.primary, fontWeight: fontWeight.semibold },

  ctaRow: { marginTop: spacing.lg },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: radius.lg, height: 52,
  },
  ctaBtnDisabled: { backgroundColor: colors.surface3 },
  ctaBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.onPrimary, letterSpacing: 0.3 },
  ctaBtnTextDisabled: { color: colors.textMuted },
  ctaHint: { textAlign: 'center', fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm },

  // ── COMP-008 Fast Check-In ────────────────────────────────────────────────
  headerQuickTag: { fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 0.3 },
  fastSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  fastSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  fastSummaryIcon: { width: 18 },
  fastSummaryLabel: { fontSize: fontSize.sm, color: colors.textSecondary, width: 76 },
  fastSummaryValue: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary },
  fastExpandBtn: { alignItems: 'center', paddingVertical: spacing.md },
  fastExpandText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },

  bottomPad: { height: spacing.xxl },

  ritualIntro: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  muscleChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  muscleChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full ?? 99,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2 ?? colors.surface,
  },
  muscleChipSelected: {
    borderColor: colors.warning,
    backgroundColor: colors.warningBg,
  },
  muscleChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  muscleChipTextSelected: {
    color: colors.warning,
    fontWeight: fontWeight.semibold,
  },

  ritualIntroTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  ritualIntroSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
