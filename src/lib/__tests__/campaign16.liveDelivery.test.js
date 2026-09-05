/**
 * campaign16.liveDelivery.test.js — the LIVE product contracts that Campaign
 * 16 twice reported as delivered while they were engine-only.
 *
 * FOUNDER COMPLETION LAW (2026-08-14), verbatim:
 *   MODULE EXISTS != DELIVERED
 *   HELPER EXISTS != DELIVERED
 *   RETURN VALUE EXISTS != DELIVERED
 *   TEST PASSES != DELIVERED
 *   DOC SAYS LANDED != DELIVERED
 *   ENGINE COMPUTES IT != DELIVERED
 *
 * "A requirement is delivered only when the ORIGINAL REQUESTED USER/PRODUCT
 * BEHAVIOUR actually occurs through the live production path."
 *
 * So this suite does not test the helpers again - the suites beside it
 * already do. It tests the SEAMS the helpers were missing: that a production
 * caller exists, that the value reaches persistence where persistence is the
 * point, and that the user-facing surface renders it. A guard here fails the
 * moment a live path is unplugged, which is exactly the failure mode nobody
 * caught for two closure reports.
 */

const fs = require('fs');
const path = require('path');

const src = f => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');
const lib = f => src(`lib/${f}`);
const screen = f => src(`screens/${f}`);

// ---------------------------------------------------------------------------
// Job 10 — a saved plan can explain itself
// ---------------------------------------------------------------------------

describe('C16-LIVE job 10: the reason survives the save and reaches a screen', () => {
  test('the write carries the selector\'s reason code to the row', () => {
    // The old defect exactly: the engine stamped selectionReason, the copy
    // table translated it, and the INSERT never mentioned it - so the
    // explanation existed only for as long as the in-memory plan did.
    const db = lib('database.js');
    expect(db).toMatch(/selection_reason TEXT/);
    // EL-9 (exercise-library-expansion-2026-09-05): the circuit columns
    // group_kind and round_rest_seconds sit between selection_reason and
    // created_at now; the pin is that selection_reason is written.
    expect(db).toMatch(/superset_group_id, selection_reason, group_kind, round_rest_seconds, created_at, updated_at/);
    expect(db).toMatch(/addExerciseToRoutine\([^)]*selectionReason = null/s);
    expect(lib('planAutoGen.js')).toMatch(/ex\.selectionReason \?\? null/);
  });

  test('the reason survives cloud backup and fresh-device restore', () => {
    const sync = lib('sync.js');
    const db = lib('database.js');
    expect(sync).toMatch(/selection_reason: re\.selectionReason \?\? null/);
    expect(sync).toMatch(/withoutSelectionReason/);
    expect(db).toMatch(/re\.selection_reason \?\? null/);
    const migration = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'supabase',
        'migrate_139_routine_exercises_selection_reason.sql'),
      'utf8',
    );
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS selection_reason text/);
  });

  test('a code is stored, not a sentence', () => {
    // Prose in the database ages badly and cannot be reworded or translated.
    const db = lib('database.js');
    expect(db).not.toMatch(/selection_reason_text|selection_explanation/);
  });

  test('the routine screen renders the recorded reason, not a guess', () => {
    const s = screen('RoutineDetailScreen.js');
    expect(s).toMatch(/from '\.\.\/lib\/planRationale'/);
    expect(s).toMatch(/explainSelection\(routineExercise\.selectionReason\)/);
    // The generic subregion template is the FALLBACK, not the answer.
    expect(s).toMatch(/chosen \?\? getExerciseWhyThis/);
  });
});

// ---------------------------------------------------------------------------
// Job 11 — the change receipt reaches the user
// ---------------------------------------------------------------------------

describe('C16-LIVE job 11: the rebuild receipt is rendered', () => {
  test('Update Your Plan builds the receipt from the dry run it will commit', () => {
    const s = screen('PlanUpdateScreen.js');
    expect(s).toMatch(/buildChangeReceipt/);
    expect(s).toMatch(/dry\.continuity\?\.decisions/);
  });

  // RE-ANCHORED (D139): the receipt is rendered by the shared
  // components/PlanPreviewSheet.js now, so all four generation moments show
  // it. Adjust training still BUILDS it from the dry run it will commit
  // (pinned above); this pins the rendering where it lives.
  test('it renders what stayed, what changed and why', () => {
    const s = require('fs').readFileSync(
      require('path').resolve(__dirname, '../../components/PlanPreviewSheet.js'), 'utf8');
    for (const heading of ['What stays', 'What changes', 'New in your plan']) {
      expect(s).toContain(heading);
    }
    expect(s).toMatch(/receipt\.stays\.map/);
    expect(s).toMatch(/receipt\.changes\.map/);
    // The why is rendered, not dropped.
    expect(s).toMatch(/l\.why \? ` - \$\{l\.why\}` : ''/);
  });
});

// ---------------------------------------------------------------------------
// Phase C — the block boundary actually applies what it proposes
// ---------------------------------------------------------------------------

describe('C16-LIVE phase C: Continue With Adjustments applies its proposal', () => {
  const s = () => screen('PlansScreen.js');

  test('the adjusted route reviews before it writes', () => {
    expect(s()).toMatch(/if \(intent === 'adjust'\) \{[\s\S]{0,400}openNextBlockReview\(\)/);
  });

  test('the review is built from the dry run of the generator the confirm runs', () => {
    // Anything else is a second description of the change, which is how a
    // preview starts lying.
    expect(s()).toMatch(/generatePlanDryRun\(user\.id, userProfile, \{[\s\S]{0,100}continuityProposal: programmeProposal/);
    expect(s()).toMatch(/buildChangeReceipt\(decisions\)/);
    // The commit consumes the exact same decision record. Recomputing at
    // epochBlocks: 0 was the false-delivery defect this audit reproduced.
    expect(s()).toMatch(/generateAndSavePlan\(user\.id, userProfile, \{[\s\S]{0,180}continuityProposal:/);
  });

  test('a justified exercise change rebuilds the programme, with the ledger', () => {
    expect(s()).toMatch(/generateAndSavePlan\(user\.id, userProfile, \{[\s\S]{0,120}ledger: seedRanges/);
    expect(lib('planAutoGen.js')).toMatch(/activatePlanWithBlock\(userId, prog\.id, planName, \{ ledger, allowLearnedCarry \}\)/);
  });

  test('no exercise change means no churn: the same plan is reactivated', () => {
    expect(s()).toMatch(/const refine = \(\(reviewed\?\.exerciseChanges \?\? 0\) \+ \(reviewed\?\.prescriptionChanges \?\? 0\)\) > 0/);
    expect(s()).toMatch(/if \(mayRefine\) \{/);
  });

  test('a reviewed prescription change is applied rather than described only', () => {
    const t = s();
    expect(t).toMatch(/prescriptionChanges/);
    expect(t).toContain('The rep target changes shown above will be applied.');
    expect(lib('exercise/continuity.js')).toMatch(/repMin: prescriptionChange\.repMin/);
    expect(lib('exercise/continuity.js')).toMatch(/repMax: prescriptionChange\.repMax/);
  });

  test('the finished block\'s own programme is not mutated into the new one', () => {
    // generateAndSavePlan creates a NEW programme and archives the old, so
    // what the athlete actually trained stays true in their history.
    const auto = lib('planAutoGen.js');
    expect(auto).toMatch(/createProgramme/);
    expect(auto).toMatch(/archiveOtherUserPlans/);
    expect(s()).not.toMatch(/deleteProgrammeCascade/);
  });

  test('production epoch evidence is real, and uncertainty cannot trigger variation', () => {
    const advisor = lib('blockAdvisor.js');
    expect(advisor).toMatch(/currentStructure = \{[\s\S]{0,100}workouts: structure/);
    expect(advisor).not.toMatch(/history\.map\(\(\) => \(\{ structure:/);
    expect(advisor).toMatch(/systematicCandidate: facts\.progression === 'holding' && facts\.sufficient/);
    expect(advisor).toMatch(/plateau: facts\.plateau === true/);
    expect(lib('blockLedgerRunner.js')).toMatch(/programmeSignature/);
  });
});

// ---------------------------------------------------------------------------
// D — the next-block review UX
// ---------------------------------------------------------------------------

describe('C16-LIVE next-block review is a real surface', () => {
  const s = () => screen('PlansScreen.js');

  test('a sheet exists and is shown before activation', () => {
    expect(s()).toMatch(/visible=\{!!blockReview\}/);
    expect(s()).toMatch(/accessibilityLabel="Your next block"/);
  });

  test('it shows stays, changes, why, and the volume moves', () => {
    const t = s();
    for (const heading of ['What stays', 'What changes', 'Your set targets']) {
      expect(t).toContain(heading);
    }
    expect(t).toMatch(/blockReview\.verdictCopy\.body/);
  });

  test('it says plainly when only volume moves', () => {
    expect(s()).toContain('Your workouts stay exactly as they are. Only your set targets move.');
  });

  test('nothing is activated by opening it', () => {
    // The confirm button is the only path to runBlockActivation on this route.
    const t = s();
    expect(t).toMatch(/onPress=\{confirmNextBlockReview\}/);
    expect(t).toMatch(/title="Not yet"/);
  });
});

// ---------------------------------------------------------------------------
// E — Repeat means repeat, enforced at the call site
// ---------------------------------------------------------------------------

describe('C16-LIVE repeat cannot consume elective refinement', () => {
  const s = () => screen('PlansScreen.js');

  test('the repeat route hard-codes refine false', () => {
    expect(s()).toMatch(/runBlockActivation\(\{ intent, refine: false \}\)/);
  });

  test('the activation refuses to refine on a repeat intent whatever it is asked', () => {
    // Belt and braces, and deliberately so: this is the assertion the epoch
    // module's own header promised and did not have.
    expect(s()).toMatch(/const mayRefine = refine === true && seedIntent === 'adjust'/);
  });

  test('consider_rebuild is a repeat, not an adjustment', () => {
    // Its label states a plain repeat, so its behaviour must match the label.
    // D137 (fully free product, no tier split): the entitlement clause is
    // gone (PlansScreen.js:634), but the semantics this test pins are
    // unchanged -- only the 'adjust' label seeds 'adjust'.
    expect(s()).toMatch(/seedIntent = intent === 'adjust' \? 'adjust' : 'repeat'/);
  });

  test('the repeat alert still promises the same targets', () => {
    expect(s()).toContain('the same workouts and the same set targets as last time');
  });
});

// ---------------------------------------------------------------------------
// F — division roles are enforced when feasible, and reported when not
// ---------------------------------------------------------------------------

describe('C16-LIVE division roles are more than a ranking nudge', () => {
  test('importance is explicit, with three levels', () => {
    const { ROLE_IMPORTANCE } = require('../division/profile');
    expect(Object.values(ROLE_IMPORTANCE)).toEqual([
      'required_when_feasible', 'high_priority', 'optional',
    ]);
  });

  test('a required role becomes real coverage only when the pool can fill it', () => {
    const e = lib('planEngine.js');
    expect(e).toMatch(/spec\.importance !== ROLE_IMPORTANCE\.REQUIRED_WHEN_FEASIBLE/);
    expect(e).toMatch(/if \(available\.some\(e => e\.sub === spec\.role\)\) requiredSubs\.push\(spec\.role\)/);
  });

  test('sweep is never made compulsory', () => {
    const e = lib('planEngine.js');
    expect(e).toMatch(/if \(spec\.role === SWEEP \|\| requiredSubs\.includes\(spec\.role\)\) continue/);
  });

  test('the plan reports which judged roles it could not carry, and why', () => {
    const e = lib('planEngine.js');
    expect(e).toMatch(/function buildDivisionCoverage/);
    expect(e).toMatch(/cause: available \? 'not_selected' : 'not_available'/);
    expect(e).toMatch(/^\s+divisionCoverage,$/m);
  });

  test('that report reaches the athlete on both surfaces that claim the physique', () => {
    // Plan Fit answers "would this schedule work"; the routine screen claims
    // the plan wears the division. Both now have to be honest about a role
    // the plan could not place.
    expect(lib('planFit.js')).toMatch(/export function coverageCopy/);
    expect(screen('ProOnboardingScreen.js')).toMatch(/coverageCopy\(fitReview\)/);
    expect(lib('divisionDiff.js')).toMatch(/export function divisionCoverageLine/);
    expect(screen('RoutineDetailScreen.js')).toMatch(/divisionGapLine/);
  });
});

// ---------------------------------------------------------------------------
// The dead-helper rule, applied to Campaign 16's own product modules
// ---------------------------------------------------------------------------

describe('C16-LIVE no Campaign-16 product helper is dead', () => {
  // Every module the campaign created that represents USER-FACING behaviour,
  // with the production consumer that makes it real. volumeAudit is
  // deliberately absent: it is an invariant utility, and the volume contract
  // it checks is enforced by the generator itself.
  const PRODUCT_HELPERS = [
    ['planRationale.js', 'explainSelection', ['screens/RoutineDetailScreen.js']],
    ['planRationale.js', 'buildChangeReceipt', ['screens/PlanUpdateScreen.js', 'screens/PlansScreen.js']],
    ['planFit.js', 'fitCopy', ['screens/ProOnboardingScreen.js', 'screens/PlanUpdateScreen.js']],
    ['planFit.js', 'coverageCopy', ['screens/ProOnboardingScreen.js']],
    ['blockReview.js', 'verdictCopy', ['lib/blockAdvisor.js']],
    ['blockReview.js', 'recoveryHeadsUp', ['lib/blockAdvisor.js']],
    ['blockReview.js', 'proposeNextBlock', ['lib/blockAdvisor.js']],
    ['blockReview.js', 'blockReadyNotificationBody', ['lib/notifications/scheduler.js']],
    ['divisionDiff.js', 'divisionCoverageLine', ['screens/RoutineDetailScreen.js']],
    ['division/profile.js', 'divisionRoleSpecs', ['lib/planEngine.js']],
    ['exercise/continuity.js', 'applyContinuity', ['lib/planAutoGen.js']],
  ];

  test.each(PRODUCT_HELPERS)('%s %s has a live consumer', (module, symbol, consumers) => {
    expect(lib(module)).toMatch(new RegExp(`export (function|const) ${symbol}\\b`));
    const found = consumers.filter(c => src(c).includes(symbol));
    expect(found.length).toBeGreaterThan(0);
  });

  test('volumeAudit is an invariant utility and says so', () => {
    // Classified TEST-ONLY BY DESIGN rather than quietly left dead: the
    // production generator enforces the volume contract, and this module
    // exists to prove that it does.
    const a = lib('exercise/volumeAudit.js');
    expect(a).toMatch(/invariant|audit/i);
  });
});

// ---------------------------------------------------------------------------
// Amendment tests 17-20: the block-boundary UX laws
// ---------------------------------------------------------------------------

describe('C16-LIVE amendment 17-20: block-boundary copy and notification', () => {
  const { recoveryHeadsUp, verdictCopy, blockReadyNotificationBody, PROGRAMME_VERDICT }
    = require('../blockReview');

  test('17. the recovery-week heads-up promises a review, never a change', () => {
    for (const epochBlocks of [0, 1, 2, 3, 9]) {
      const body = recoveryHeadsUp({ epochBlocks }).body;
      expect(body).toMatch(/review/i);
      // It must not state that anything HAS changed or WILL change.
      expect(body).not.toMatch(/has changed|have changed|will change|we changed|new exercises/i);
      expect(body).not.toMatch(/—/);
    }
  });

  test('18. the block-ready notification says ready to REVIEW, not already changed', () => {
    for (const proposal of [null, { changedCount: 0 }, { changedCount: 1 }, { changedCount: 4 }]) {
      const body = blockReadyNotificationBody(proposal);
      expect(body).toMatch(/ready/i);
      expect(body).not.toMatch(/your plan changed|we have updated|has been updated/i);
      expect(body).not.toMatch(/—/);
    }
    // A proposal with changes describes them as RECOMMENDED, not applied.
    expect(blockReadyNotificationBody({ changedCount: 2 })).toMatch(/recommended/);
  });

  test('19. every programme verdict is stated as a proposal', () => {
    for (const v of Object.values(PROGRAMME_VERDICT)) {
      const c = verdictCopy(v, { changedCount: 2 });
      expect(c.body).not.toMatch(/we have changed|has been rebuilt|your plan now/i);
      expect(`${c.title} ${c.body}`).not.toMatch(/—/);
    }
  });

  test('20. nothing activates without the user, and the notification laws stand', () => {
    const s = screen('PlansScreen.js');
    // Activation is only ever reached from a confirm handler.
    const activations = s.match(/runBlockActivation\(/g) ?? [];
    // One definition plus exactly two call sites: the repeat confirm and the
    // reviewed-adjust confirm.
    expect(activations.length).toBe(3);
    // The notification goes through the EXISTING category, so every opt-out,
    // quiet-hours and budget rule already in force keeps applying.
    const sched = lib('notifications/scheduler.js');
    expect(sched).toMatch(/WEEKLY_COACH_READY/);
    expect(sched).toMatch(/blockReadyNotificationBody/);
  });
});
