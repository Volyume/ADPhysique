/**
 * persistence.test.js — Campaign 21 Step 12 closure, SCREEN/PERSISTENCE
 * lane, GAP C.
 *
 * The harness's `persisted:` mechanism (harness.js runScenarios, "if
 * (scenario.persisted) expect(scenario.persisted.check(result)).toBe(true)")
 * is unused by every scenarios.*.data.js file, and even if a scenario used
 * it, it only re-inspects the in-memory `result` runWeeklyCoach/coachApply
 * already returned -- it was never a real DB write-then-read-back proof.
 * This file is the first thing in the coachValidation tree that drives an
 * ACTUAL write call (through the real screen wiring or the real save/read
 * contract) and then re-reads what landed.
 *
 * ── INVENTORY: what pre-existing suites already prove, with citations ──────
 *
 * N-VOL-03 (apply-time MEV/MRV clamp, src/lib/coachApply.js computeVolumeApply):
 *   - src/lib/__tests__/coachApply.test.js:203-267 ("computeVolumeApply"
 *     describe block) -- exhaustive PURE-FUNCTION proof of the clamp maths
 *     itself (push/pull, mev/mrv/mav fallback chain, the
 *     ABSOLUTE_WEEKLY_SET_CEILING=30 backstop).
 *   - src/__tests__/coachValidation/scenarios.nutrition.data.js:1264-1279
 *     (NUT-62, rule N-VOL-03) -- the SAME pure function via the harness's
 *     'coachApply' run entry, the registered ledger proof for N-VOL-03.
 *   - src/__tests__/campaign6.applyRepeat.test.js:35-90 (PHASE 13) --
 *     composes computeVolumeApply with computeWeeklySessionAllocation
 *     PURELY IN MEMORY ("Persist the apply." then hand-builds the applied
 *     rows array) to prove downstream session allocation reads the WRITTEN
 *     dose, not the output object; it never calls the real
 *     upsertPlannedMuscleVolume/getPlannedMuscleVolume DB functions.
 *   - src/screens/__tests__/CoachOutputScreen.d16Autonomy.guard.test.js:58-140
 *     -- SOURCE-LEVEL guard that handleApplyTraining is unconditionally
 *     wired to the Apply button (gated only on applyDisabled) and that the
 *     Coached-autonomy auto-apply walk calls the same handler.
 *   NOT PREVIOUSLY PROVEN: that a real Apply TAP, through the mounted
 *   screen, calls the real upsertPlannedMuscleVolume with the CLAMPED
 *   value computeVolumeApply produced -- as opposed to the raw
 *   output.volumeSignal delta applied uniformly. Closed below by
 *   "GAP C(i)".
 *
 * N-TARGETS-10 (diet-break apply, src/lib/coachApply.js computeDietBreakTargets):
 *   - src/__tests__/coachValidation/scenarios.nutrition.data.js, NUT-13/
 *     NUT-14 (direct_case/hold_case in ledger.json rule N-TARGETS-10) --
 *     pure-function proof of computeDietBreakTargets's own decision (raises
 *     to maintenance only when maintenance > current; null otherwise).
 *   NOT PREVIOUSLY PROVEN, and NOT closed here (out of the "at minimum"
 *   scope for this task; registered as a genuine gap, not duplicated):
 *   CoachOutputScreen.handleApplyDietBreak (CoachOutputScreen.js:1397-1463)
 *   actually calls saveNutritionTargets(user.id, computed.targets) with the
 *   computed (not raw) targets. This handler additionally requires a
 *   second-tap confirmation when the live preview has drifted
 *   (dietBreakPreviewKcal !== computed.newKcal, lines 1437-1446), which the
 *   GAP C(i) mount recipe below was not extended to cover. Flagged as a
 *   remaining screen/persistence gap for a future closure pass, not as a
 *   defect -- the code path itself is unremarkable, just unexercised.
 *
 * U-AUTH-01 (accepted-intervention memory, src/lib/coachIntervention.js
 * interventionsFromHistory):
 *   - src/lib/__tests__/coachIntervention.test.js -- pure-function proof of
 *     interventionsFromHistory's parsing/ordering.
 *   - status MAPPED in ledger.json (no whole_scenario_ids) -- the ledger
 *     itself records this as structural/mapped, not a behavioural chain.
 *   NOT PREVIOUSLY PROVEN, and NOT closed here (same "at minimum" scope
 *   note): that CoachOutputScreen's own buildInterventionRecord() +
 *   saveCoachOutput() write actually round-trips through a real
 *   getCoachOutputHistory() read into interventionsFromHistory() the way
 *   GAP C(ii) proves for the DECLINE side (U-AUTH-02) below. The identical
 *   fake-store technique in this file would close it; left as a citation
 *   for whoever picks up N-TARGETS-10 next, since it is the same shape of
 *   gap and the fix is the same recipe.
 *
 * U-AUTH-02 (explicit decline, src/lib/coachApply.js markDeclined/isDeclined
 * + src/lib/coachDecline.js suppressedByDecline/declinesFromHistory):
 *   - src/__tests__/coachValidation/scenarios.conflict.data.js:488-533
 *     (CFL-18/18b/18c) -- CFL-18 hand-constructs a `priorDeclines` array
 *     literal and passes it DIRECTLY into runWeeklyCoach's `facts`; CFL-18b/
 *     18c call materialEvidenceChange directly. Neither drives markDeclined,
 *     buildDeclineRecord, saveCoachOutput, getCoachOutputHistory or
 *     declinesFromHistory -- the exact real write-then-read path
 *     CoachOutputScreen.js:1816 (`const priorDeclines =
 *     declinesFromHistory(coachOutputHistory);`) uses.
 *   - src/lib/__tests__/coachApply.test.js -- markDeclined/isDeclined pure
 *     unit tests (no persistence).
 *   NOT PREVIOUSLY PROVEN: that a declined recommendation, persisted the
 *   way handleDeclineCalories persists it (CoachOutputScreen.js:1239-1262),
 *   is actually read back through getCoachOutputHistory +
 *   declinesFromHistory and suppresses the SAME proposal on the next real
 *   runWeeklyCoach run. Closed below by "GAP C(ii)".
 *
 * ── This file's two closures ────────────────────────────────────────────────
 *   (i)  CoachOutputScreen Apply-training tap persists the CLAMPED volume
 *        value, not the raw proposal (N-VOL-03, screen wiring).
 *   (ii) A decline is persisted and suppresses the same proposal on the
 *        next coach run, via the real suppressedByDecline read path
 *        (U-AUTH-02, write-then-read).
 *
 * Neither test touches ledger.json, ledger.coverage.test.js or any
 * scenarios.*.data.js file (other agents own them).
 */

// ═══════════════════════════════════════════════════════════════════════════
// GAP C(i): CoachOutputScreen Apply-training tap persists the CLAMPED value
// ═══════════════════════════════════════════════════════════════════════════
//
// CoachOutputScreen has no pre-existing mount test anywhere in the repo --
// every one of its own test files (CoachOutputScreen.d16Autonomy.guard,
// CoachOutputScreen.progressScanAssessment, progressScanCoachIsolation.
// guard, CoachOutputScreen.profileMerge.guard, CoachOutputScreen.
// trainingPlanLink) explicitly says so and falls back to fs.readFileSync +
// regex, citing the screen's size (a ~700-line load effect, dozens of DB
// reads, the live zustand store) as the reason. That proves WIRING (the
// button calls the right handler) but never DATA correctness (what value
// actually reaches the write).
//
// This suite still mounts it, using the same monkeypatch-the-loaded-module
// convention screen-mount.test.js uses for NutritionTargetsScreen (override
// specific exports on the already-required module, not jest.mock the whole
// surface), PLUS the CFL-20 winback pattern's own principle: mock the IO/
// computation BOUNDARY, never the decision under test. Here the decision
// under test is computeVolumeApply's clamp and the screen's wiring of it to
// upsertPlannedMuscleVolume -- NOT runWeeklyCoach's own weekly-signal
// arithmetic, which the rest of coachValidation already exhaustively proves
// (e.g. NUT-63's identical fixture, reused verbatim below). So
// runWeeklyCoach is mocked to return its OWN real, byte-identical output
// (computed once via jest.requireActual and handed back as a canned
// result) rather than being hand-stubbed field-by-field, which would risk
// silently drifting from what the real engine actually produces.
describe('GAP C(i): CoachOutputScreen Apply (training) persists the clamped value', () => {
  jest.setTimeout(15000);

  test('upsertPlannedMuscleVolume is called with the per-muscle CLAMPED plannedSets, never the raw uniform delta', async () => {
    jest.resetModules();
    jest.doMock('expo-haptics', () => ({
      impactAsync: jest.fn(() => Promise.resolve()),
      notificationAsync: jest.fn(() => Promise.resolve()),
      selectionAsync: jest.fn(() => Promise.resolve()),
      ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
      NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
    }));
    jest.doMock('@react-navigation/native', () => ({
      useNavigation: () => ({ navigate: jest.fn(), getParent: () => ({ addListener: () => () => {} }) }),
      useFocusEffect: jest.fn(),
    }));
    jest.doMock('expo-notifications', () => ({
      setNotificationHandler: jest.fn(),
      scheduleNotificationAsync: jest.fn(() => Promise.resolve('id')),
      cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
      cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
      getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
      getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
      requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
      setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
      addNotificationResponseReceivedListener: jest.fn(() => ({ remove: () => {} })),
      addNotificationReceivedListener: jest.fn(() => ({ remove: () => {} })),
      SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', YEARLY: 'yearly', DATE: 'date', TIME_INTERVAL: 'timeInterval', CALENDAR: 'calendar' },
      AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1, NONE: 0 },
      AndroidNotificationPriority: { MAX: 'max', HIGH: 'high', DEFAULT: 'default' },
    }));
    jest.doMock('@shopify/react-native-skia', () => ({
      Canvas: 'Canvas', Path: 'Path', Skia: { Path: { Make: () => ({ moveTo: () => {}, lineTo: () => {}, close: () => {} }) } },
      useFont: () => null, useImage: () => null,
    }));

    // Mock ONLY runWeeklyCoach on the weeklyCoach module; every other export
    // (mapCalsAdherence, corroborateConfidenceLevel) stays real, since the
    // load effect calls those directly too.
    const mockRunWeeklyCoach = jest.fn();
    jest.doMock('../../lib/weeklyCoach', () => {
      const actual = jest.requireActual('../../lib/weeklyCoach');
      return { ...actual, runWeeklyCoach: (...a) => mockRunWeeklyCoach(...a) };
    });

    const mockGetLatestCheckin = jest.fn(() => Promise.resolve({
      weekStart: 0, energyScore: 3, sorenessScore: 2, stressScore: 3,
      calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, notes: null,
    }));
    const mockGetCurrentMesocycleWeek = jest.fn(() => Promise.resolve({
      id: 'mw-cur', isDeload: false, awaitingDecision: false, weekIndex: 2, plannedWeeks: 6,
    }));
    const mockGetNextMesocycleWeek = jest.fn(() => Promise.resolve({ id: 'mw-next', is_deload: 0 }));
    // Two rows designed so the clamp's effect is unambiguous:
    //  - chest has 1 set of headroom against a +2 proposal: the NAIVE raw
    //    write would be 21+2=23, which exceeds mrv=22. The clamped write
    //    must be 22, not 23.
    //  - shoulders is already AT its ceiling (22 of 22): the naive raw
    //    write would be 22+2=24, but because next(22) === current(22),
    //    computeVolumeApply emits NO change for it at all -- the raw
    //    proposal must never reach upsertPlannedMuscleVolume as a write.
    const mockGetPlannedMuscleVolume = jest.fn(() => Promise.resolve([
      { muscle: 'chest', planned_sets: 21, mev: 6, mav: 14, mrv: 22 },
      { muscle: 'shoulders', planned_sets: 22, mev: 6, mav: 14, mrv: 22 },
    ]));
    const mockUpsertPlannedMuscleVolume = jest.fn(() => Promise.resolve());

    jest.doMock('../../lib/database', () => {
      const actual = jest.requireActual('../../lib/database');
      return {
        ...actual,
        getLatestCheckin: (...a) => mockGetLatestCheckin(...a),
        getCurrentMesocycleWeek: (...a) => mockGetCurrentMesocycleWeek(...a),
        getNextMesocycleWeek: (...a) => mockGetNextMesocycleWeek(...a),
        getPlannedMuscleVolume: (...a) => mockGetPlannedMuscleVolume(...a),
        upsertPlannedMuscleVolume: (...a) => mockUpsertPlannedMuscleVolume(...a),
      };
    });

    global.__DEV__ = false;
    if (typeof global.requestAnimationFrame === 'undefined') {
      global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
      global.cancelAnimationFrame = (id) => clearTimeout(id);
    }

    const React = require('react');
    const TestRenderer = require('react-test-renderer');
    const useAppStore = require('../../store/useAppStore').default;

    useAppStore.setState({
      user: { id: 'u1', email: 't@e.com', isLocal: false },
      session: { user: { id: 'u1' } },
      tier: 'pro',
      firstRunComplete: true,
      userProfile: { firstName: 'Test', goal: 'lean_gain', units: 'metric', sex: 'male' },
    });

    // The REAL engine, run once with NUT-63's own fixture recipe (the fixed
    // +150 kcal bulk step is irrelevant here, only volumeSignal matters) plus
    // consecutiveExceededWeeks:3 to push volumeSignal to 2 (matches the
    // exceeded-escalation scenario shape already proven under N-COACH-EXCEEDED
    // in scenarios.nutrition.data.js). Computed via requireActual so the
    // canned result handed to the mocked screen import is BYTE-IDENTICAL to
    // what the real engine produces for these inputs, not a hand guess.
    const actualWeeklyCoach = jest.requireActual('../../lib/weeklyCoach');
    const NOW = Date.now();
    const DAY = 86400000;
    const flat = (n = 14, startKg = 85) => {
      const out = [];
      for (let i = 0; i < n; i++) out.push({ loggedAt: NOW - (n - 1 - i) * DAY, weightKg: startKg });
      return out;
    };
    const realResult = actualWeeklyCoach.runWeeklyCoach({
      checkin: {
        weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 2, stressScore: 3,
        calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, notes: null,
      },
      morningWeights: flat(),
      sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'maint', weeksInPhase: 4,
      currentCalTarget: 2400, currentStepsTarget: 8000,
      bodyweightKg: 85, units: 'kg', nowMs: NOW,
      consecutiveExceededWeeks: 3,
    });
    expect(realResult.volumeSignal).toBe(2); // sanity: the fixture still produces the delta this test's rows are designed around
    mockRunWeeklyCoach.mockReturnValue(realResult);

    const Screen = require('../../screens/CoachOutputScreen').default;
    let tree;
    await TestRenderer.act(async () => {
      tree = TestRenderer.create(
        React.createElement(Screen, {
          navigation: { navigate: jest.fn(), getParent: () => ({ addListener: () => () => {} }) },
          route: { params: { weekStart: 0 } },
        }),
      );
    });
    await TestRenderer.act(async () => {
      for (let i = 0; i < 25; i++) await Promise.resolve();
      await new Promise((r) => setImmediate(r));
      for (let i = 0; i < 15; i++) await Promise.resolve();
    });

    // The training row starts collapsed inside the "More adjustments"
    // disclosure at this signal magnitude; expand it before looking for the
    // Apply control (same behaviour a real user drives through).
    const moreButtons = tree.root.findAllByProps({ accessibilityLabel: 'More adjustments (2)' });
    if (moreButtons.length) {
      await TestRenderer.act(async () => {
        moreButtons[0].props.onPress?.();
        await Promise.resolve();
      });
    }

    const applyLabel = `Apply: Add ${realResult.volumeSignal} sets to each muscle group`;
    const applyButtons = tree.root
      .findAllByProps({ accessibilityLabel: applyLabel })
      .filter((n) => typeof n.props.onPress === 'function');
    expect(applyButtons.length).toBeGreaterThan(0);

    await TestRenderer.act(async () => {
      applyButtons[0].props.onPress();
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });

    expect(mockUpsertPlannedMuscleVolume).toHaveBeenCalledTimes(1);
    expect(mockUpsertPlannedMuscleVolume).toHaveBeenCalledWith(
      expect.objectContaining({
        mesocycleWeekId: 'mw-next',
        muscle: 'chest',
        plannedSets: 22, // CLAMPED to mrv, not the naive raw 21+2=23
        source: 'coach',
      }),
    );
    // shoulders (already at its 22-set ceiling) must never be written at all
    // -- the raw proposal (22+2=24) is withheld entirely, not silently
    // capped-and-written.
    const shoulderCalls = mockUpsertPlannedMuscleVolume.mock.calls.filter(
      ([arg]) => arg.muscle === 'shoulders',
    );
    expect(shoulderCalls).toHaveLength(0);

    TestRenderer.act(() => { tree.unmount(); });
    jest.dontMock('expo-haptics');
    jest.dontMock('@react-navigation/native');
    jest.dontMock('expo-notifications');
    jest.dontMock('@shopify/react-native-skia');
    jest.dontMock('../../lib/weeklyCoach');
    jest.dontMock('../../lib/database');
    jest.resetModules();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GAP C(ii): a decline is persisted and suppresses the same proposal next run
// ═══════════════════════════════════════════════════════════════════════════
//
// Uses the REAL engine functions throughout (runWeeklyCoach, markDeclined,
// buildDeclineRecord, declinesFromHistory, suppressedByDecline via
// runWeeklyCoach's own internals) -- none of coachApply.js/coachDecline.js/
// weeklyCoach.js is mocked, matching CLAUDE.md's "the coaching engine is
// deterministic, pure functions, no I/O" description; there is nothing to
// mock in them. The ONLY thing standing in for real I/O is a tiny in-memory
// fake mirroring src/lib/database.js's saveCoachOutput/getCoachOutputHistory
// CONTRACT exactly (verified against the source below), built on the REAL,
// exported preserveAppliedAdjustments merge function rather than a
// reimplementation of it -- this is the "database-monkeypatch pattern" the
// brief asks for, scaled to a pure round-trip instead of a mounted screen
// (CoachOutputScreen.handleDeclineCalories's own composition,
// CoachOutputScreen.js:1239-1262, is mirrored exactly below, cited inline).
describe('GAP C(ii): a persisted decline suppresses the same proposal on the next real coach run', () => {
  const { NOW, DAY } = require('./harness');
  const { runWeeklyCoach } = require('../../lib/weeklyCoach');
  const { markDeclined, isDeclined } = require('../../lib/coachApply');
  const { buildDeclineRecord, declinesFromHistory } = require('../../lib/coachDecline');
  const { preserveAppliedAdjustments } = require('../../lib/database');

  // Mirrors src/lib/database.js saveCoachOutput (database.js:7921-7952) /
  // getCoachOutputHistory (database.js:8689-8702) exactly:
  //   - saveCoachOutput: reads any existing row for (userId, weekStart),
  //     merges via preserveAppliedAdjustments(existing.output_json, data)
  //     when one exists, else stores data as-is; stores JSON.stringify(toStore).
  //   - getCoachOutputHistory: SELECT ... ORDER BY week_start DESC LIMIT ?,
  //     returns [{ weekStart: row.week_start, ...JSON.parse(row.output_json) }].
  function makeFakeCoachOutputTable() {
    const rowsByUserWeek = new Map(); // `${userId}:${weekStart}` -> json string
    return {
      async saveCoachOutput(userId, data) {
        const key = `${userId}:${data.weekStart}`;
        const existingJson = rowsByUserWeek.get(key) ?? null;
        const toStore = existingJson ? preserveAppliedAdjustments(existingJson, data) : data;
        rowsByUserWeek.set(key, JSON.stringify(toStore));
      },
      async getCoachOutputHistory(userId, limit = 52) {
        return [...rowsByUserWeek.entries()]
          .filter(([key]) => key.startsWith(`${userId}:`))
          .map(([key, json]) => ({ weekStart: Number(key.split(':')[1]), json }))
          .sort((a, b) => b.weekStart - a.weekStart)
          .slice(0, limit)
          .map(({ weekStart, json }) => {
            let parsed = {};
            try { parsed = JSON.parse(json) ?? {}; } catch (_) { /* ignore */ }
            return { weekStart, ...parsed };
          });
      },
    };
  }

  // 14-day flat weight trend anchored to an arbitrary `nowMs`, so week 1 and
  // week 2 (7 days apart) produce structurally identical engine context --
  // the fixture recipe proven in scenarios.nutrition.data.js's flatTrend14,
  // parametrised on nowMs so it can be re-anchored a week later.
  function flatTrend14At(nowMs, startKg = 85, kgPerWeek = 0) {
    const count = 14;
    const out = [];
    const endKg = startKg + kgPerWeek * 2;
    for (let i = 0; i < count; i++) {
      const t = nowMs - (count - 1 - i) * DAY;
      const w = startKg + (endKg - startKg) * (i / Math.max(1, count - 1));
      out.push({ loggedAt: t, weightKg: Math.round(w * 100) / 100 });
    }
    return out;
  }

  // NUT-63's own fixture shape (scenarios.nutrition.data.js:1290-1306,
  // ORACLE N-COACH-04): bulk + flat weight against a positive goal rate
  // fires the fixed +150 kcal step. Parametrised on nowMs/priorDeclines so
  // the identical recipe can represent "this week" and, unchanged a week
  // later, "next week".
  function bulkFixedStepFacts(nowMs, priorDeclines = []) {
    return {
      checkin: {
        weekStart: nowMs - 7 * DAY, energyScore: 3, sorenessScore: 2, stressScore: 3,
        calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, notes: null,
      },
      morningWeights: flatTrend14At(nowMs, 85, 0),
      sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_bulk', weeksInPhase: 4,
      consecutiveOffTargetWeeks: 3, lastCalAdjustmentWeeksAgo: 4,
      currentCalTarget: 3200, bodyweightKg: 85, nowMs,
      priorDeclines,
    };
  }

  test('week 1: the fixed +150 kcal proposal fires (control, no prior decline)', () => {
    const week1 = runWeeklyCoach(bulkFixedStepFacts(NOW));
    expect(week1.adjustments.calories.change).toBe(150);
  });

  test('an UNCHANGED week 2 (no decline in between) would propose the SAME +150 again -- the recommendation genuinely recurs absent a decline', () => {
    const week2NoDecline = runWeeklyCoach(bulkFixedStepFacts(NOW + 7 * DAY));
    expect(week2NoDecline.adjustments.calories.change).toBe(150);
  });

  test('a decline persisted the way handleDeclineCalories persists it is read back and suppresses the identical week-2 proposal', async () => {
    const table = makeFakeCoachOutputTable();
    const userId = 'u1';
    const week1WeekStart = NOW - 7 * DAY;

    // Week 1: run the real engine, then decline the calorie card exactly as
    // CoachOutputScreen.handleDeclineCalories composes the write
    // (CoachOutputScreen.js:1239-1262):
    //   const updated = markDeclined(output, 'calories', {
    //     decline: buildDeclineRecord({
    //       domain: 'nutrition', kind: 'calorie_target',
    //       direction: Math.sign(change), magnitude: Math.abs(change),
    //       signature: output?.evidenceSignature ?? null,
    //       declinedAtMs: Date.now(),
    //     }),
    //   });
    //   await saveCoachOutput(user.id, { weekStart, ...updated });
    const week1Output = runWeeklyCoach(bulkFixedStepFacts(NOW));
    expect(isDeclined(week1Output, 'calories')).toBe(false);
    const change = week1Output.adjustments.calories.change;
    const declinedOutput = markDeclined(week1Output, 'calories', {
      decline: buildDeclineRecord({
        domain: 'nutrition',
        kind: 'calorie_target',
        direction: Math.sign(change),
        magnitude: Math.abs(change),
        signature: week1Output.evidenceSignature ?? null,
        declinedAtMs: NOW,
      }),
    });
    expect(isDeclined(declinedOutput, 'calories')).toBe(true);
    await table.saveCoachOutput(userId, { weekStart: week1WeekStart, ...declinedOutput });

    // Week 2, 7 days later: the REAL "next coach run" read path
    // (CoachOutputScreen.js:1812/1816):
    //   const coachOutputHistory = await getCoachOutputHistory(user.id, 8);
    //   const priorDeclines = declinesFromHistory(coachOutputHistory);
    const coachOutputHistory = await table.getCoachOutputHistory(userId, 8);
    expect(coachOutputHistory).toHaveLength(1);
    expect(coachOutputHistory[0].declinedAdjustments?.calories?.decline?.kind).toBe('calorie_target');
    const priorDeclines = declinesFromHistory(coachOutputHistory);
    expect(priorDeclines).toHaveLength(1);
    expect(priorDeclines[0]).toMatchObject({
      domain: 'nutrition', kind: 'calorie_target', direction: 1, weekStart: week1WeekStart,
    });

    const week2Output = runWeeklyCoach(bulkFixedStepFacts(NOW + 7 * DAY, priorDeclines));

    // Suppressed: no calorie adjustment this week, and the reason is
    // recorded as a decline hold (weeklyCoach.js:1664 `if (declineHeld)
    // calorieAdjustment = null;`, weeklyCoach.js:1999-2004 pushes
    // `{ type: 'declined_last_time', ... }` onto heldDecisions).
    expect(week2Output.adjustments.calories).toBeFalsy();
    expect(week2Output.heldDecisions).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'declined_last_time' })]),
    );
  });

  test('a MATERIALLY changed week 2 (weight now deteriorating) is NOT suppressed -- the decline only withholds the identical situation', async () => {
    const table = makeFakeCoachOutputTable();
    const userId = 'u2';
    const week1WeekStart = NOW - 7 * DAY;

    const week1Output = runWeeklyCoach(bulkFixedStepFacts(NOW));
    const change = week1Output.adjustments.calories.change;
    const declinedOutput = markDeclined(week1Output, 'calories', {
      decline: buildDeclineRecord({
        domain: 'nutrition', kind: 'calorie_target',
        direction: Math.sign(change), magnitude: Math.abs(change),
        signature: week1Output.evidenceSignature ?? null,
        declinedAtMs: NOW,
      }),
    });
    await table.saveCoachOutput(userId, { weekStart: week1WeekStart, ...declinedOutput });
    const priorDeclines = declinesFromHistory(await table.getCoachOutputHistory(userId, 8));
    expect(priorDeclines).toHaveLength(1);

    // Week 2: a real losing trend replaces the flat one (goalPhase/checkin
    // otherwise identical), which is a genuinely different situation --
    // U-AUTH-02's law is "not now, not never", not a standing suppression.
    const losingWeek2 = {
      ...bulkFixedStepFacts(NOW + 7 * DAY, priorDeclines),
      morningWeights: (() => {
        const count = 14;
        const nowMs = NOW + 7 * DAY;
        const startKg = 85;
        const endKg = 83; // clearly losing against a bulk goal
        const out = [];
        for (let i = 0; i < count; i++) {
          const t = nowMs - (count - 1 - i) * DAY;
          const w = startKg + (endKg - startKg) * (i / Math.max(1, count - 1));
          out.push({ loggedAt: t, weightKg: Math.round(w * 100) / 100 });
        }
        return out;
      })(),
    };
    const week2Output = runWeeklyCoach(losingWeek2);
    // No longer suppressed by the old decline: either a fresh adjustment
    // fires, or a DIFFERENT hold (not 'declined_last_time') applies -- the
    // one thing the decline may never do is stand as a blanket, permanent
    // veto once the evidence has genuinely moved.
    const heldTypes = (week2Output.heldDecisions ?? []).map((h) => h.type);
    expect(heldTypes).not.toContain('declined_last_time');
  });
});
