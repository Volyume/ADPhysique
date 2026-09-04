/**
 * D147 (founder, 2026-09-04): the plan-generation card never moves. Every
 * stage row is rendered from the first frame (no rows appended, no card
 * growth), only each row's status treatment animates, and when the last
 * stage completes the card's content crossfades in place to the plan-ready
 * payoff, drawn from the plan that was actually written. Success no longer
 * leaves the card for the old completion screen; "See my plan" completes
 * first run and lands on the Train tab. Failure still goes to
 * ProSetupComplete, which owns the no-plan state.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'ProOnboardingScreen.js'), 'utf8');
const NAV = fs.readFileSync(path.join(__dirname, '..', '..', 'navigation', 'RootNavigator.js'), 'utf8');
const STORE = fs.readFileSync(path.join(__dirname, '..', '..', 'store', 'useAppStore.js'), 'utf8');

describe('the layout never moves during generation', () => {
  test('every stage row is rendered from the start; nothing is sliced by progress', () => {
    expect(SRC).toMatch(/\{lines\.map\(\(line, i\) => \(\s*<StageRow key=\{i\} label=\{line\} state=\{stateFor\(i\)\}/);
    expect(SRC).not.toMatch(/lines\.slice\(0, sequenceStage\)/);
  });
  test('the card reserves the payoff height before anything is seen', () => {
    expect(SRC).toMatch(/payoffH \? \{ minHeight: payoffH \+ spacing\.lg \* 2 \} : null/);
    expect(SRC).toMatch(/onLayout=\{\(e\) => setPayoffH\(Math\.round\(e\.nativeEvent\.layout\.height\)\)\}/);
    expect(SRC).toMatch(/seqPayoff: \{\s*position: 'absolute', left: spacing\.lg, right: spacing\.lg, top: spacing\.lg,\s*\}/);
  });
  test('only status treatments animate: opacity on the tick and the text, nothing on the box', () => {
    expect(SRC).toMatch(/function StageRow\(\{ label, state, reduceMotion, t, live \}\)/);
    expect(SRC).toMatch(/Animated\.timing\(textOpacity, \{ toValue: textTo, duration: motion\.fast, useNativeDriver: true \}\)/);
    expect(SRC).toMatch(/Animated\.timing\(tickOpacity, \{ toValue: tickTo, duration: motion\.fast, useNativeDriver: true \}\)/);
    expect(SRC).toMatch(/seqIcon: \{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' \}/);
    expect(SRC).toMatch(/seqRow: \{[\s\S]{0,120}minHeight: 34/);
  });
  test('the card is a charcoal surface with a hairline, not an outlined box', () => {
    expect(SRC).toMatch(/seqPanel: \{[\s\S]{0,200}borderWidth: 1,\s*borderColor: colors\.borderSubtle/);
    expect(SRC).not.toMatch(/seqPanel: \{[\s\S]{0,200}borderWidth: 1\.5/);
  });
  test('reduce motion runs the same card with instant transitions', () => {
    expect(SRC).toMatch(/const useSequence = true;/);
    expect(SRC).toMatch(/if \(reduceMotion\) \{\s*textOpacity\.setValue\(textTo\);\s*tickOpacity\.setValue\(tickTo\);\s*return;\s*\}/);
    expect(SRC).toMatch(/await wait\(reduceMotion \? 0 : PAYOFF_HOLD_MS\);/);
  });
});

describe('completion is a payoff in place, from real plan state', () => {
  test('the last tick holds briefly, then the content crossfades', () => {
    expect(SRC).toMatch(/const PAYOFF_HOLD_MS = 500;/);
    expect(SRC).toMatch(/Animated\.timing\(stageContentOpacity, \{ toValue: 0, duration: motion\.fast, useNativeDriver: true \}\)/);
    expect(SRC).toMatch(/Animated\.timing\(payoffOpacity, \{ toValue: 1, duration: motion\.fast, delay: 80, useNativeDriver: true \}\)/);
    expect(SRC).toMatch(/haptics\.planReady\(\);/);
  });
  test('the payoff reads the written plan, and leaves out anything it cannot read', () => {
    expect(SRC).toMatch(/if \(builtPlanId\) programme = await getProgrammeById\(builtPlanId\);/);
    expect(SRC).toMatch(/const splitName = programme\?\.splitType \? \(SPLIT_LABELS\[programme\.splitType\] \?\? null\) : null;/);
    expect(SRC).toMatch(/goalLabel: GOAL_LABELS\[trainingGoal\] \?\? null,/);
    expect(SRC).toMatch(/phaseLabel: PHASE_LABELS\[trainingPhase\] \?\? null,/);
    expect(SRC).toMatch(/buildWeeks: BLOCK_PLANNED_WEEKS - 1,/);
    expect(SRC).toMatch(/\[payoff\?\.goalLabel, payoff\?\.phaseLabel\]\.filter\(Boolean\)\.join\(' · '\)/);
  });
  test('the payoff holds only the plan, one line of reassurance, and See my plan', () => {
    expect(SRC).toContain('Your plan is ready');
    expect(SRC).toContain('Your targets and weekly check-in are ready too.');
    expect(SRC).toMatch(/title="See my plan"/);
    const payoff = SRC.slice(SRC.indexOf('styles.seqPayoff, { opacity: payoffOpacity }'), SRC.indexOf('</Animated.View>', SRC.indexOf('styles.seqPayoff, { opacity: payoffOpacity }')));
    expect(payoff).not.toMatch(/Log your weight|Coach reminders|Targets saved|Calm/);
  });
  test('success stays on the card; failure still goes to the completion screen', () => {
    const fn = SRC.slice(SRC.indexOf('async function advanceFrom7'), SRC.indexOf('// ── Step 1, Create account'));
    expect((fn.match(/navigation\.replace\('ProSetupComplete'\)/g) || []).length).toBe(1);
    expect(fn).toMatch(/if \(planFailed\) \{[\s\S]{0,300}navigation\.replace\('ProSetupComplete'\);/);
    expect(fn).toMatch(/await revealPayoff\(\{/);
  });
  test('See my plan completes first run and lands on the Train tab', () => {
    expect(SRC).toMatch(/async function seePlan\(\) \{[\s\S]{0,400}setPostSetupLanding\('PlansTab'\);\s*await completeFirstRun\(\);/);
    expect(STORE).toMatch(/postSetupLanding: null,/);
    expect(STORE).toMatch(/setPostSetupLanding: \(tab\) => set\(\{ postSetupLanding: tab \|\| null \}\),/);
    expect(NAV).toMatch(/const initialTab = postSetupLanding \|\| 'HomeTab';/);
    expect(NAV).toMatch(/<Tab\.Navigator\s*initialRouteName=\{initialTab\}/);
  });
});
