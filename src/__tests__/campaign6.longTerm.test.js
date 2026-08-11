/**
 * campaign6.longTerm.test.js — the Campaign 6 long-term product-law
 * matrix (order Phase 61). Grown phase by phase alongside the campaign;
 * the six-block athlete and the longitudinal engine characterisations
 * live in their own suites (campaign6.sixBlock.test.js,
 * campaign6.longitudinal.test.js).
 *
 * Laws pinned here: memory must help never trap; no personalisation
 * without provenance; lapse is not failure.
 */
import fs from 'fs';
import path from 'path';

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('PHASE 7: stale history is never called recent (D97)', () => {
  test('the readiness baseline label does not claim recency the row-limited query cannot promise', () => {
    const src = stripComments(read('lib/blockAdvisor.js'));
    expect(src).toContain('Readiness a bit below your personal baseline');
    expect(src).not.toContain('below your recent average');
  });

  test('the goal-setup weight note states the last logged weight, not a recent trend', () => {
    const src = stripComments(read('screens/ProGoalSetupScreen.js'));
    expect(src).toContain('Targets use your last logged weight');
    expect(src).not.toContain('your recent weight trend');
  });

  test('the surfaces that DO say "recent" are genuinely date-windowed', () => {
    // The habit-derived reminder claim ("your recent workouts") rests on a
    // 6-week trailing calendar window; the check-in comparative verdicts
    // ("your usual") rest on the CALENDAR prior week, so a lapse return
    // refuses them (hasPriorWeek false). Pinned so a refactor that swaps
    // either to a row-limited read fails here.
    expect(read('lib/notifications/trainingHabitSchedule.js'))
      .toMatch(/HABIT_WINDOW_WEEKS = 6/);
    const checkin = read('screens/WeeklyCheckInScreen.js');
    expect(checkin).toMatch(/const hasPriorWeek = Number\.isFinite\(volLastWeek\) && volLastWeek > 0;/);
    // The workload card hides rather than comparing against nothing.
    expect(read('components/ProgressSections.js'))
      .toMatch(/if \(!data \|\| data\.ratio === null\) return null;/);
  });

  test('"your last block" and "set by how your last block went" remain temporal identity, not recency claims', () => {
    // These stay legal at any age: the last block IS the last block.
    expect(read('lib/blockExplain.js')).toContain("seed_ledger: 'set by how your last block went'");
  });
});

describe('PHASE 2 finding: the adaptive bands read the genuinely most recent sessions (D97)', () => {
  test('the landmark history feeder returns oldest-first so slice(-8) is the last 8, not the oldest 8', () => {
    // The query is ORDER BY started_at DESC; without the reverse, a
    // mature user\'s adapted MAV was computed from the OLDEST eight
    // sessions inside the 200-row window and barely moved as new
    // evidence arrived - the opposite of the function\'s own "last 8
    // data points" contract.
    const src = read('lib/database.js');
    const fn = src.slice(src.indexOf('export async function getAdaptiveLandmarkHistory'));
    const ret = fn.slice(0, fn.indexOf('export async function', 10));
    expect(ret).toMatch(/\}\)\)\.reverse\(\);/);
    expect(ret).toMatch(/ORDER BY w\.started_at DESC/);
  });
});

describe('D91-24 / D91-25 remain deferred, not implemented (D97)', () => {
  test('no freshness/decay algorithm exists in the learned range', () => {
    const src = stripComments(read('lib/learnedRange.js'));
    expect(src).not.toMatch(/decay|freshness|ageFactor|halfLife|staleAfter/i);
  });

  test('the accumulation-week list still excludes only the planned deload week (D91-24 unchanged)', () => {
    const src = read('lib/blockLedgerGather.js');
    expect(src).toMatch(/if \(w !== deloadWeekIndex\) weeks\.push\(w\);/);
  });
});

describe('PHASES 12 + 26: absence is never converted into evidence (D97)', () => {
  test('the session +1 branch requires feedback within the 14-day detraining boundary', () => {
    const src = read('lib/algorithms.js');
    const block = src.slice(src.indexOf('const stimulusReady =') - 800, src.indexOf('const stimulusReady =') + 300);
    expect(block).toMatch(/const feedbackRecent = lastTrainedAt != null/);
    expect(block).toMatch(/stimulusReady =\s*\n\s*feedbackRecent &&/);
  });

  test('the consecutive-week counters chain only across ADJACENT calendar weeks', () => {
    const src = read('screens/CoachOutputScreen.js');
    expect(src).toMatch(/const isAdjacent = \(expected, ws\) =>/);
    // Off-target chains only from the immediately previous week's output.
    expect(src).toMatch(/lastOutputAdjacent && lastOutput\?\.trend\?\.onTarget === false/);
    // Poor-recovery and exceeded both break on a calendar gap.
    const poor = src.slice(src.indexOf('const consecutivePoorRecoveryWeeks'));
    expect(poor.slice(0, 1200)).toMatch(/if \(!isAdjacent\(expected, ws\)\) break;/);
    const exceeded = src.slice(src.indexOf('const consecutiveExceededWeeks'));
    expect(exceeded.slice(0, 900)).toMatch(/if \(!isAdjacent\(expected, ws\)\) break;/);
    // The grade-3 counter is deliberately NOT adjacency-gated: it
    // certifies the ABSENCE of persistent fatigue, and an unknown gap
    // must keep withholding that upward-leaning certification.
    const grade3 = src.slice(src.indexOf('const consecutiveGrade3RecoveryWeeks'));
    expect(grade3.slice(0, 1400)).not.toMatch(/isAdjacent/);
  });
});

describe('PHASE 16/26: old proposals are never resurrected by Coached mode (D97)', () => {
  test('the coached auto-walk is bounded to the current cycle', () => {
    const src = read('screens/CoachOutputScreen.js');
    const walk = src.slice(src.indexOf("if (coachAutonomy !== 'coached') return;"));
    expect(walk.slice(0, 1600)).toMatch(/liveWeek - outWeek > 7 \* 86400000\) return;/);
    // The safety-hold confirm-first gate stays ahead of it.
    const holdAt = walk.indexOf('autoApplyHoldActive');
    const ageAt = walk.indexOf('liveWeek - outWeek');
    expect(holdAt).toBeGreaterThan(-1);
    expect(holdAt).toBeLessThan(ageAt);
  });
});

describe('ADDENDUM: anti-anthropomorphism and anti-manipulative retention (D97)', () => {
  const fs2 = require('fs');
  const path2 = require('path');
  const walk = (dir) => fs2.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path2.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(p);
    return e.name.endsWith('.js') ? [p] : [];
  });

  test('no app-voice surface claims feelings, human understanding, or manipulative retention', () => {
    // The app's own voice must never imply emotions, consciousness or
    // human observation, threaten loss, or invent personalisation
    // percentages. The ONE legitimate "proud" in the tree is the
    // partner cheer set (lib/partners/acknowledgements.js): a HUMAN
    // partner's words to a human, founder-authored, closed enum - a
    // person may be proud; the engine may not.
    const BANNED = [
      /we're proud of you/i, /i'm proud of you/i, /i know you\b/i,
      /i missed you/i, /we know your body/i, /your body loves/i,
      /your body told/i, /figured you out/i, /optimal for you/i,
      /perfect for you/i, /we understand you\b/i,
      /don't lose what we've learned/i, /journey needs you/i,
      /crushing it/i, /been through a lot together/i,
      /\d+% personalised/i,
    ];
    const roots = ['screens', 'components', 'lib'].map((d) => path2.join(__dirname, '..', d));
    for (const root of roots) {
      for (const file of walk(root)) {
        if (file.endsWith('partners/acknowledgements.js')) continue;
        const src = fs2.readFileSync(file, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
        for (const re of BANNED) {
          if (re.test(src)) {
            throw new Error(`${file} matches banned relationship copy: ${re}`);
          }
        }
      }
    }
  });

  test('the boast words stay banned in app copy (campaign 5 law carried forward)', () => {
    for (const f of ['lib/blockExplain.js', 'lib/coachRegister.js', 'lib/coachResponse.js', 'lib/whyThisTemplates.js']) {
      const src = stripComments(read(f));
      expect(src).not.toMatch(/optimal|perfected|we've figured/i);
    }
  });
});

describe('PHASES 9 + 44: plan lifecycle laws (D97-11..17)', () => {
  test('P44-02: activation unarchives, inside one transaction with a deterministic tiebreak', () => {
    const src = read('lib/database.js');
    const fn = src.slice(src.indexOf('export async function setActivePlan'));
    expect(fn.slice(0, 1400)).toMatch(/runInTransaction\(d, async \(\) => \{/);
    expect(fn.slice(0, 1400)).toMatch(/is_active = 1, is_archived = 0/);
    const get = src.slice(src.indexOf('export async function getActivePlan'));
    expect(get.slice(0, 700)).toMatch(/ORDER BY updated_at DESC LIMIT 1/);
  });

  test('P44-03: the archived flag syncs in both directions and archive writes schedule a push', () => {
    expect(read('lib/sync.js')).toMatch(/is_archived: !!p\.isArchived,/);
    const db = read('lib/database.js');
    const ins = db.slice(db.indexOf('export async function insertProgrammeFromCloud'));
    expect(ins.slice(0, 2600)).toMatch(/is_archived = \?/);
    expect(ins.slice(0, 3600)).toMatch(/is_library, is_active, is_archived, source_programme_id/);
    for (const fn of ['archivePlan', 'unarchivePlan', 'archiveOtherUserPlans']) {
      const f = db.slice(db.indexOf(`export async function ${fn}`));
      expect(f.slice(0, 800)).toMatch(/_scheduleSync\(\)/);
    }
  });

  test('P9-01: switched-away finished blocks are judged at consumption time', () => {
    const runner = read('lib/blockLedgerRunner.js');
    expect(runner).toMatch(/export async function backfillMissingBlockLedgers/);
    const seed = runner.slice(runner.indexOf('export async function buildSeedRangesForNextBlock'));
    expect(seed.slice(0, 700)).toMatch(/await backfillMissingBlockLedgers\(userId/);
    expect(read('screens/BlockReflectionScreen.js')).toMatch(/computeAndStoreBlockLedger\(user\.id, mesocycleId/);
  });

  test('P9-07: recovery-week and open-decision switches get their own honest dialogue', () => {
    const src = read('lib/planSwitch.js');
    expect(src).toMatch(/Switch during your recovery week\?/);
    expect(src).toMatch(/Skip the open block decision\?/);
    expect(stripComments(src)).not.toMatch(/about to roll over anyway/);
  });

  test('P9-04: PlanDetail holds the RB-3 synchronous guard on both activation paths', () => {
    const src = read('screens/PlanDetailScreen.js');
    expect((src.match(/if \(activatingRef\.current\) return;/g) || []).length).toBe(2);
  });

  test('P44-05: an abandoned block ends the day the user switches away', () => {
    const src = read('lib/database.js');
    const act = src.slice(src.indexOf('export async function activatePlanWithBlock'));
    expect(act.slice(0, 2200)).toMatch(/SET end_date = date\('now'\)/);
  });

  test('P9-06: a mature user is never told they lack personal history', () => {
    const src = read('lib/blockExplain.js');
    expect(src).toMatch(/RESEARCH_START_LINE_MATURE/);
    expect(src).toMatch(/hadPriorBlocks \? RESEARCH_START_LINE_MATURE : RESEARCH_START_LINE/);
    expect(read('screens/HomeScreen.js')).toMatch(/hadPriorBlocks = all\.some\(\(m\) => m\.id !== week\.mesocycleId && m\.blockLedger\)/);
  });

  test('P44-11/12: duplicates carry provenance and archived copies are reused, not re-copied', () => {
    const db = read('lib/database.js');
    const dup = db.slice(db.indexOf('export async function duplicatePlan'));
    expect(dup.slice(0, 1200)).toMatch(/SET source_programme_id = \?/);
    expect(read('screens/FreeStarterScreen.js')).toMatch(/archived\.find\(p => p\.sourceProgrammeId === recommendation\.id\)/);
  });
});

describe('PHASES 10 + 11: the mature record system (D97-18)', () => {
  test('P11-1: cluster rows can neither set nor seed an estimated-max record', () => {
    const src = read('lib/algorithms.js');
    expect(src).toMatch(/export function isE1rmEligibleRow/);
    const fn = src.slice(src.indexOf('export function detectPR'));
    expect(fn.slice(0, 900)).toMatch(/if \(!isE1rmEligibleRow\(newSet\)\) return prs;/);
    expect(fn.slice(0, 1400)).toMatch(/if \(!isE1rmEligibleRow\(s\)\) return best;/);
  });

  test('P11-2: the progress PR tile mirrors the live detector (baseline, warm-ups, exercise type)', () => {
    const src = read('hooks/useProgressData.js');
    expect(src).toMatch(/const isBaseline = runningMax === 0;/);
    expect(src).toMatch(/if \(!isBaseline && at >= windowStart\)/);
    expect(src).toMatch(/if \(exType !== 'weight_reps'\) continue;/);
  });

  test('P10-1: the records wall derives from all completed history, never a rolling window', () => {
    const db = read('lib/database.js');
    expect(db).toMatch(/export async function getCompletedSetHistoryForExercise/);
    const screen = read('screens/ExerciseDetailScreen.js');
    expect(screen).toMatch(/getCompletedSetHistoryForExercise\(exerciseId, user\.id\)/);
    expect(screen).not.toMatch(/getWorkoutSetsForExercise\(exerciseId, user\.id, 200\)/);
  });
});

describe('PHASES 18-21: tier and trial transitions (D97-20)', () => {
  test('P-3: the ledger readiness slope treats a sleep-only row as no reading, not a neutral 50', () => {
    // FB-36 alignment: WorkoutSummaryScreen writes a tier-blind
    // weekly_checkins row answering only sleep. blockAdvisor's reader got
    // the guard in D96; the ledger's sleep-free slope input now holds the
    // same rule, so evidence-free rows cannot flatten or manufacture a
    // strain trend across a block.
    const src = read('lib/blockLedgerRunner.js');
    const fn = src.slice(src.indexOf('const sleepFreeReadiness'));
    expect(fn.slice(0, 600)).toMatch(/if \(c\.energyScore == null && c\.sorenessScore == null\) return null;/);
    // The guard sits BEFORE the ?? 3 defaults, so it wins.
    const guardAt = fn.indexOf('c.energyScore == null');
    const defaultAt = fn.indexOf('c.energyScore ?? 3');
    expect(guardAt).toBeGreaterThan(-1);
    expect(defaultAt).toBeGreaterThan(guardAt);
    // And the slope helper it feeds discards nulls rather than zeroing them.
    const gather = read('lib/blockLedgerGather.js');
    const slope = gather.slice(gather.indexOf('export function computeReadinessSlope'));
    expect(slope.slice(0, 300)).toMatch(/\.filter\(\(v\) => v != null\)/);
  });
});
