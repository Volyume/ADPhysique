/**
 * HomeScreen.heroPrecedence.guard.test.js — F-18 (final certification
 * 2026-09-05), evidence 05-SURFACE-TRUTH.md B-1, B-2, B-3 and D-2.
 *
 * WHAT WENT WRONG. Today's hero had three states (active workout, training
 * day, no plan) and used the training-day one for everything else, because
 * `nextSession: null` fell back to `routines[0]`. So an athlete who had done
 * every required session this week was offered session 1 again under
 * "Day 1 of N"; a finished block showed "Start workout" directly beneath a
 * Today line reading "Block complete. Choose what's next."; and an active
 * plan holding no sessions rendered "No active plan yet", whose own fix
 * would have replaced the plan.
 *
 * The mounted proof of each state lives in HomeScreen.stateMatrix.test.js
 * (real render, real isWeekComplete). This suite pins what a render test
 * cannot: that the PRECEDENCE is written down in one place, that the hero
 * branches are ordered to match it, and that the exact copy each state ships
 * is the ruled copy. Source-level (fs.readFileSync + regex), the convention
 * every other HomeScreen.*.guard.test.js uses.
 */
const fs = require('fs');
const path = require('path');

const home = fs.readFileSync(path.join(__dirname, '..', 'HomeScreen.js'), 'utf8');
const plans = fs.readFileSync(path.join(__dirname, '..', 'PlansScreen.js'), 'utf8');
const coachOutput = fs.readFileSync(path.join(__dirname, '..', 'CoachOutputScreen.js'), 'utf8');

// A "this state must NOT offer X" assertion has to read the RENDERED branch,
// not the comment above it that quotes the defect being fixed. Comments are
// stripped for those checks only.
const withoutComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the hero precedence is stated once, in one place', () => {
  test('the comment names all five states in order', () => {
    const block = home.slice(home.indexOf('HERO PRECEDENCE'), home.indexOf('HERO PRECEDENCE') + 1400);
    expect(block).toContain('HERO PRECEDENCE');
    const order = ['active workout', 'block awaiting decision', 'week complete', 'next session', 'empty states'];
    let cursor = -1;
    for (const state of order) {
      const at = block.indexOf(state);
      expect(at).toBeGreaterThan(cursor);
      cursor = at;
    }
  });

  test('the JSX branches run in exactly that order', () => {
    const at = (needle) => {
      const i = home.indexOf(needle);
      expect(i).toBeGreaterThan(-1);
      return i;
    };
    const active = at('{hasActiveWorkout ? (');
    const block = at(') : blockAwaitingDecision ? (');
    const week = at(') : weekComplete ? (');
    const training = at(') : activePlan && nextWorkout ? (');
    const noSessions = at(') : activePlan && planHasNoSessions ? (');
    const noPlan = at('<View style={styles.noPlanSection}>');
    expect(active).toBeLessThan(block);
    expect(block).toBeLessThan(week);
    expect(week).toBeLessThan(training);
    expect(training).toBeLessThan(noSessions);
    expect(noSessions).toBeLessThan(noPlan);
  });

  test('choosing a workout from the sheet drops the two announcement states', () => {
    // Otherwise "Do another session" would open the sheet, record the
    // choice, and then hand back the same announcement with no way to start.
    expect(home).toMatch(/const blockAwaitingDecision = !!currentMesoWeek\?\.awaitingDecision && !selectedWorkoutOverride;/);
    expect(home).toMatch(/isWeekComplete\(programmePosition\) && !selectedWorkoutOverride/);
  });
});

describe('B-1 — the week-complete state', () => {
  test('a resolved week no longer falls back to the plan\'s first routine', () => {
    expect(home).toMatch(/if \(!next && isWeekComplete\(position\)\) \{ setNextWorkout\(null\); return; \}/);
    // And the guard runs BEFORE the idx fallback it replaces.
    expect(home.indexOf('isWeekComplete(position)')).toBeLessThan(home.indexOf('const idx = next'));
  });

  test('the ruled copy, verbatim', () => {
    expect(home).toContain('Week complete');
    expect(home).toContain('Every session done this week');
    expect(home).toContain('{weekCompleteLine(planAllWorkouts[0]?.name)}');
    expect(home).toContain('Do another session');
  });

  test('the secondary action opens the existing options sheet, it does not start a session', () => {
    const start = home.indexOf(') : weekComplete ? (');
    const end = home.indexOf(') : activePlan && nextWorkout ? (');
    const branch = withoutComments(home.slice(start, end));
    expect(branch).toContain('setShowChangeWorkout(true)');
    expect(branch).not.toContain('handleStartNextWorkout');
    expect(branch).not.toContain('Start workout');
  });

  test('the readiness chip does not claim a session is pending', () => {
    expect(home).toMatch(/: weekComplete\s*\n?\s*\? \{ tone: 'go', line: 'Nothing outstanding this week\.' \}/);
  });
});

describe('B-3 — a finished block is the decision, not a workout', () => {
  test('the hero carries the block-complete state and its decision action', () => {
    const start = home.indexOf(') : blockAwaitingDecision ? (');
    const end = home.indexOf(') : weekComplete ? (');
    const branch = withoutComments(home.slice(start, end));
    expect(branch).toContain('Block complete');
    expect(branch).toContain('Every week of this block is done');
    expect(branch).toContain("Choose what's next");
    // The same destination the Today line's rank-2 occupant already opens.
    expect(branch).toContain("navigateCrossTab(navigation, 'PlansTab', 'Plans')");
    // Training during the wait stays available, never as the primary.
    expect(branch).toContain('Do another session');
    expect(branch).not.toContain('Start workout');
  });
});

describe('B-2 — an active plan with no sessions', () => {
  test('its own empty state, pointing at the plan the athlete owns', () => {
    const start = home.indexOf(') : activePlan && planHasNoSessions ? (');
    const end = home.indexOf('<View style={styles.noPlanSection}>');
    const branch = withoutComments(home.slice(start, end));
    expect(branch).toContain('Your plan has no sessions yet');
    expect(branch).toContain('Open your plan');
    expect(branch).toContain('Choose a different plan');
    expect(branch).toContain("navigateCrossTab(navigation, 'PlansTab', 'PlanDetail', { planId: activePlan.id, isLibrary: false })");
    // Never the copy that would send them to replace the plan they have.
    expect(branch).not.toContain('No active plan yet');
    expect(branch).not.toContain('Start with a plan');
  });

  test('the fact is loaded, never inferred from an empty array a failed read also produces', () => {
    expect(home).toMatch(/setPlanHasNoSessions\(routines\.length === 0\);/);
    // Cleared on every path that cannot know: no plan, and a read failure.
    expect((home.match(/setPlanHasNoSessions\(false\)/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});

describe('Train mirrors the week-complete state (B-1)', () => {
  test('the row says so and its action becomes the choice, not session 1', () => {
    expect(plans).toContain('Week complete. Your next session is on Monday.');
    expect(plans).toMatch(/title=\{weekComplete \? 'Do another session' : 'Start next workout'\}/);
    expect(plans).toMatch(/weekComplete\s*\n?\s*\? navigation\.navigate\('PlanDetail'/);
  });

  test('it reads the same authority Home does, and fails closed', () => {
    expect(plans).toContain("const { resolveProgrammePosition, isWeekComplete } = require('../lib/programmePosition');");
    expect(plans).toMatch(/setWeekComplete\(isWeekComplete\(position\)\);/);
    expect(plans).toMatch(/setWeekComplete\(false\);/);
  });
});

describe('D-2 — the Manual-mode ownership note renders on hold weeks too', () => {
  test('the same one line stands in both hero branches', () => {
    const note = 'Manual mode: these are recommendations. The coach applies nothing; any change is yours to make. Change modes in Settings, under Coaching.';
    expect((coachOutput.split(note).length - 1)).toBe(2);
    // Both occurrences are gated on the same fact, in the same place.
    expect((coachOutput.match(/\{applyDisabled \? \(\n\s*<Text style=\{\[styles\.manualModeNote, live\.manualModeNote\]\}>/g) || []).length).toBe(2);
  });
});
