/**
 * TodayStrip tests (COMP-027 Part B).
 *
 * The top Home strip is weight-only. These tests cover the weight states and
 * guard against cardio, meal, or step shortcuts returning to this slot.
 */
import { create, act } from 'react-test-renderer';
import fs from 'fs';
import path from 'path';

jest.mock('../../lib/database', () => ({}));
jest.mock('../Sparkline', () => 'Sparkline');
// D214 addendum 4: the quick entry's plausibility prompt goes through appAlert.
jest.mock('../AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import TodayStrip from '../TodayStrip';
import { appAlert } from '../AppAlert';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'TodayStrip.js'), 'utf8');

let lastTree = null;
async function render(props = {}) {
  let tree;
  await act(async () => {
    tree = create(<TodayStrip bwu="kg" onLogWeight={() => {}} {...props} />);
  });
  lastTree = tree;
  return tree;
}

function json(tree) { return JSON.stringify(tree.toJSON()); }
function findByLabel(tree, label) {
  return tree.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
}

afterEach(() => {
  if (lastTree) { act(() => { lastTree.unmount(); }); lastTree = null; }
  jest.clearAllMocks();
});

describe('weight cell', () => {
  test('logged: shows the value and confirmation tick, no sparkline', async () => {
    const tree = await render({ todayWeight: 82.4 });
    expect(json(tree)).toContain('Morning weight');
    expect(json(tree)).toContain('82.4 kg');
    expect(json(tree)).not.toContain('Sparkline');
    expect(tree.root.findAll((n) => n.props.accessibilityLabel?.startsWith('Weight ')).length).toBeGreaterThan(0);
  });

  test('logged with a trend door: tap opens trend, long-press edits', async () => {
    const onOpenTrend = jest.fn();
    const tree = await render({ todayWeight: 82.4, onOpenTrend });
    const cell = tree.root.findAll((n) => n.props.accessibilityLabel?.includes('Tap to see your trend'))[0];
    expect(cell).toBeTruthy();
    act(() => cell.props.onPress());
    expect(onOpenTrend).toHaveBeenCalled();
    act(() => cell.props.onLongPress());
    expect(json(tree)).toContain('Morning weight');
  });

  test('logged without a trend door: tap still edits', async () => {
    const tree = await render({ todayWeight: 82.4 });
    const cell = tree.root.findAll((n) => n.props.accessibilityLabel?.includes('Tap to edit'))[0];
    expect(cell).toBeTruthy();
    act(() => cell.props.onPress());
    expect(json(tree)).toContain('Morning weight');
  });

  test('no log: compact weight prompt, not auto-expanded', async () => {
    const tree = await render({ todayWeight: null, lastWeightKg: 80 });
    expect(json(tree)).toContain('Morning weight');
    expect(findByLabel(tree, 'Log morning weight')).toBeTruthy();
    expect(findByLabel(tree, 'Morning weight in stones')).toBeFalsy();
  });

  test('empty weight prompt uses neutral contained chrome, not an amber text link', () => {
    // R9/D70 (design-cohesion sweep, 2026-07-11): the hand-rolled
    // metricAction/metricActionText fill+ink pair (asserted here up to
    // 2026-07-11) was converted onto the shared <Button variant="primary">
    // primitive per docs/remediation-2026-07-11/FOOD-DESIGN-STANDARD.md
    // section 4. The RULE this test pins is UNCHANGED -- a contained solid
    // action, never a bare amber text link -- Button's primary variant IS
    // that solid primaryFill/onPrimary treatment (Button.js:53), just
    // expressed through the shared primitive instead of a bespoke style
    // block, so there is no longer a static metricActionText to assert
    // byte-for-byte.
    expect(SOURCE).toContain('metricRow: {');
    expect(SOURCE).toContain('metricIcon: {');
    expect(SOURCE).toContain('metricAction: {');
    expect(SOURCE).toContain('borderColor: colors.border');
    expect(SOURCE).toContain('backgroundColor: colors.surface2');
    // C5-P37-01 (D96): the Log button dropped from primary to secondary so
    // the session hero owns Home's single primary action. The law this pin
    // holds is unchanged - contained button chrome, never an amber text
    // link - and secondary is contained chrome.
    expect(SOURCE).toMatch(/variant="secondary"[\s\S]{0,300}title="Log"/);
    expect(SOURCE).toContain('logPrompt: { ...type.label, color: colors.textPrimary }');
    expect(SOURCE).not.toContain('emptyLogBox: {');
    expect(SOURCE).not.toContain('logPrompt: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.primary }');
  });

  test('tapping weight opens input; submitting calls onLogWeight with parsed kg', async () => {
    const onLogWeight = jest.fn();
    const tree = await render({ todayWeight: null, onLogWeight });
    act(() => findByLabel(tree, 'Log morning weight').props.onPress());
    const input = tree.root.findAll((n) => n.props.placeholder === 'kg' && typeof n.props.onChangeText === 'function')[0];
    act(() => input.props.onChangeText('80'));
    act(() => findByLabel(tree, 'Log morning weight').props.onPress());
    expect(onLogWeight).toHaveBeenCalledWith(80);
  });
});

describe('R2 radius cohesion (2026-07-11)', () => {
  // Lead-ruled one-liner: the "Logged" pill joins the pill/chip/badge class at
  // radius.full (FOOD-DESIGN-STANDARD.md section 4). The strip's OTHER inner sm
  // radii (metricIcon/weightField/logBtn) are a recorded density decision and
  // deliberately stay radius.sm; pinned here so neither side drifts.
  test('loggedPill is a full-radius badge; density-exception radii stay sm', () => {
    expect(SOURCE).toMatch(/loggedPill:\s*\{[\s\S]*?borderRadius:\s*radius\.full/);
    expect(SOURCE).toMatch(/metricIcon:\s*\{[\s\S]*?borderRadius:\s*radius\.sm/);
    expect(SOURCE).toMatch(/weightField:\s*\{[\s\S]*?borderRadius:\s*radius\.sm/);
    expect(SOURCE).toMatch(/logBtn:\s*\{[\s\S]*?borderRadius:\s*radius\.sm/);
  });
});

describe('Campaign 22 Phase 2 Stage 2: first-use tutorial copy retires after the first ever log', () => {
  test('everLogged=false (default): the why-line shows on the empty state', async () => {
    const tree = await render({ todayWeight: null, everLogged: false });
    expect(json(tree)).toContain('each reading is comparable');
  });

  test('everLogged=true: the why-line never renders once a real weigh-in exists', async () => {
    const tree = await render({ todayWeight: null, everLogged: true });
    expect(json(tree)).not.toContain('each reading is comparable');
    // The rest of the empty state is unaffected: label, prompt and Log stay.
    expect(json(tree)).toContain('Morning weight');
    expect(json(tree)).toContain('Not logged yet');
    expect(findByLabel(tree, 'Log morning weight')).toBeTruthy();
  });

  test('the logged state never shows the tutorial line either way', async () => {
    const tree = await render({ todayWeight: 82.4, everLogged: false });
    expect(json(tree)).not.toContain('each reading is comparable');
  });
});

describe('weight-only top slot', () => {
  test('does not render cardio, meal or step shortcuts', async () => {
    const tree = await render({ todayWeight: 80 });
    const txt = json(tree);
    expect(txt).toContain('Morning weight');
    expect(txt).not.toContain('CARDIO');
    expect(txt).not.toContain('MEAL');
    expect(txt).not.toContain('STEPS');
    expect(findByLabel(tree, 'Log cardio')).toBeFalsy();
    expect(findByLabel(tree, 'Log food')).toBeFalsy();
  });
});

// ─── D214 addendum 4 (Body metrics, lane 7): the quick entry's floor and plausibility prompt ──────
// Spec docs/audit/progress-recovery-consistency-audit-2026-10-01/
// 04-BODY-METRICS-AUDIT-AND-SPEC.md section 3 item 3: "the same check on Home's
// quick entry, which also gains the form's 20 kg floor" (BM-40: 28.4 kg was
// accepted, the gate was `0 < kg <= 300`). The strip owns the draft, so the
// prompt comes BEFORE the draft is cleared: a person who cancels keeps what
// they typed. TodayStrip.inputFocusStability.test.js still pins that no
// component is declared inside a render.
describe('quick entry: the 20 kg floor and the plausibility prompt (BM-40)', () => {
  async function type(tree, value) {
    act(() => findByLabel(tree, 'Log morning weight').props.onPress());
    const input = tree.root.findAll((n) => n.props.placeholder === 'kg' && typeof n.props.onChangeText === 'function')[0];
    act(() => input.props.onChangeText(value));
    return input;
  }
  const submit = (tree) => act(() => findByLabel(tree, 'Log morning weight').props.onPress());

  test('the form\'s floor: under 20 kg is not logged, 20 kg is', async () => {
    const onLogWeight = jest.fn();
    const tree = await render({ todayWeight: null, onLogWeight });
    await type(tree, '19.9');
    submit(tree);
    expect(onLogWeight).not.toHaveBeenCalled();
    // Said, never swallowed (lane 7 review S10): the form's own words.
    expect(appAlert).toHaveBeenCalledWith('Check that weight', expect.stringMatching(/looks off/));
    const input = tree.root.findAll((n) => n.props.placeholder === 'kg' && typeof n.props.onChangeText === 'function')[0];
    act(() => input.props.onChangeText('20'));
    submit(tree);
    expect(onLogWeight).toHaveBeenCalledWith(20);
  });

  test('a weight 54 kg from the last weigh-in asks first, in the spec\'s words, and logs nothing yet', async () => {
    const onLogWeight = jest.fn();
    const tree = await render({ todayWeight: null, onLogWeight, lastWeighInKg: 82.4 });
    await type(tree, '28.4');
    submit(tree);
    expect(onLogWeight).not.toHaveBeenCalled();
    expect(appAlert).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = appAlert.mock.calls[0];
    expect(title).toBe('Check this weigh-in');
    expect(message).toBe('That is 54 kg below your last weigh-in of 82.4 kg. Save it anyway?');
    expect(buttons.map((b) => b.text)).toEqual(['Change it', 'Save anyway']);
    expect(buttons[0].style).toBe('cancel');
    // the draft is still in the field: the person can change it
    const input = tree.root.findAll((n) => n.props.placeholder === 'kg' && typeof n.props.onChangeText === 'function')[0];
    expect(input.props.value).toBe('28.4');
    // "Save anyway" logs what was typed
    act(() => buttons[1].onPress());
    expect(onLogWeight).toHaveBeenCalledWith(28.4);
  });

  test('"Change it" logs nothing and keeps the draft', async () => {
    const onLogWeight = jest.fn();
    const tree = await render({ todayWeight: null, onLogWeight, lastWeighInKg: 82.4 });
    await type(tree, '90');
    submit(tree);
    const [, , buttons] = appAlert.mock.calls[0];
    expect(appAlert.mock.calls[0][1]).toBe('That is 7.6 kg above your last weigh-in of 82.4 kg. Save it anyway?');
    act(() => buttons[0].onPress?.());
    expect(onLogWeight).not.toHaveBeenCalled();
  });

  test('a plausible weight, or no last weigh-in, or only a prefill, never asks', async () => {
    const a = jest.fn();
    let tree = await render({ todayWeight: null, onLogWeight: a, lastWeighInKg: 82.4 });
    await type(tree, '82.9');
    submit(tree);
    expect(a).toHaveBeenCalledWith(82.9);
    act(() => { tree.unmount(); lastTree = null; });

    const b = jest.fn();
    tree = await render({ todayWeight: null, onLogWeight: b, lastWeighInKg: null });
    await type(tree, '60');
    submit(tree);
    expect(b).toHaveBeenCalledWith(60);
    act(() => { tree.unmount(); lastTree = null; });

    // lastWeightKg alone is the prefill (it may be the profile's setup weight): it never calls itself "your last weigh-in"
    const c = jest.fn();
    tree = await render({ todayWeight: null, onLogWeight: c, lastWeightKg: 82.4 });
    await type(tree, '60');
    submit(tree);
    expect(c).toHaveBeenCalledWith(60);
    expect(appAlert).not.toHaveBeenCalled();
  });

  test('a stone reader reads stones and pounds in the sentence', async () => {
    const tree = await render({ bwu: 'st', todayWeight: null, lastWeighInKg: 82.4 });
    act(() => findByLabel(tree, 'Log morning weight').props.onPress());
    const st = tree.root.findAll((n) => n.props.accessibilityLabel === 'Morning weight in stones' && typeof n.props.onChangeText === 'function')[0];
    const lbs = tree.root.findAll((n) => n.props.accessibilityLabel === 'Morning weight remaining pounds' && typeof n.props.onChangeText === 'function')[0];
    act(() => st.props.onChangeText('9'));
    act(() => lbs.props.onChangeText('0'));
    submit(tree);
    expect(appAlert.mock.calls[0][1]).toBe('That is 3 st 13.5 lbs below your last weigh-in of 12 st 13.5 lbs. Save it anyway?');
  });

  test('Home\'s handler holds the same floor, and hands the strip the last REAL weigh-in only', () => {
    const home = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'HomeScreen.js'), 'utf8');
    expect(home).toMatch(/import \{ BODY_WEIGHT_MIN_KG \} from '\.\.\/lib\/bodyMetricValidate';/);
    expect(home).toMatch(/weightKg < BODY_WEIGHT_MIN_KG \|\| weightKg > 300\) return;/);
    expect(home).toMatch(/lastWeighInKg=\{recentWeights\.length \? recentWeights\[recentWeights\.length - 1\] : null\}/);
    // the prefill keeps its own prop; the profile's setup weight is never "your last weigh-in"
    expect(home).toMatch(/lastWeightKg=\{recentWeights\.length \? recentWeights\[recentWeights\.length - 1\] : \(userProfile\?\.weightKg \?\? null\)\}/);
  });

  test('the strip shares the rule and the floor with the form, from the one module', () => {
    expect(SOURCE).toMatch(/import \{ BODY_WEIGHT_MIN_KG, BODY_WEIGHT_RANGE_MESSAGE, weighInPlausibility, plausibilityMessage \} from '\.\.\/lib\/bodyMetricValidate';/);
    expect(SOURCE).toMatch(/kg < BODY_WEIGHT_MIN_KG \|\| kg > 300/);
    expect(SOURCE).toMatch(/weighInPlausibility\(kg, lastWeighInKg\)\.implausible/);
  });
});

// D214 addendum 7 (lane 7 open question 14): under Home's own withhold the
// strip passes withholdFigures, and the shared sentence then names no figure.
describe('TodayStrip plausibility prompt under a withhold', () => {
  const { plausibilityMessage: msg } = require('../../lib/bodyMetricValidate');
  test('the withheld sentence carries no digit', () => {
    expect(msg({ kg: 28.4, lastKg: 82.4, bwu: 'st', withholdFigures: true })).not.toMatch(/\d/);
  });
  test('the strip forwards withholdFigures into the prompt (source)', () => {
    const fs2 = require('fs'); const path2 = require('path');
    const src = fs2.readFileSync(path2.join(__dirname, '..', 'TodayStrip.js'), 'utf8');
    expect(src).toMatch(/plausibilityMessage\(\{ kg, lastKg: lastWeighInKg, bwu, withholdFigures \}\)/);
    const home = fs2.readFileSync(path2.join(__dirname, '..', '..', 'screens', 'HomeScreen.js'), 'utf8');
    expect(home).toMatch(/withholdFigures=\{firstReviewFacts\?\.edFlagOpen !== false\}/);
  });
});
