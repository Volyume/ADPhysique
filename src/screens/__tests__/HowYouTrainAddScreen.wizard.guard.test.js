/**
 * HowYouTrainAddScreen.wizard.guard.test.js - source-level pins for the add
 * wizard (D133, flow audit 2026-09-03), repo convention (fs.readFileSync +
 * regex; no screen renders via a testing library here).
 *
 * What this pins, one block each:
 *  - the shape every step shares: a title, a step count, an announced and
 *    focused heading, Back and Cancel that step back or confirm leaving,
 *    hardware back intercepted mid-flow and released after the save;
 *  - "Change" from the check step means change ONE thing: Continue and
 *    Back return to the check as soon as the rest is already answered;
 *  - the flow ends on the thing it made: `finish` hands the home screen
 *    the episode group id or the baseline section key, never a bare row id;
 *  - honesty at the end (adversarial review 2026-09-03): a failed
 *    supersede is counted and told, never swallowed; a failed plan check
 *    is told, never rendered as "nothing to decide" (A15); a failed
 *    library load is shown with a retry, never a blank screen; the consent
 *    grant has an error path;
 *  - one phrase per meaning inside the wizard: "Not now" is wired to
 *    declineNow (a real write); "Leave it as it is" writes nothing.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'HowYouTrainAddScreen.js'), 'utf8');

describe('every step shares one shape', () => {
  test('title, step count, announced and focused heading', () => {
    expect(src).toContain("const screenTitle = edit ? 'Change this' : 'Add something';");
    expect(src).toMatch(/Step \$\{pos\.index\} of \$\{pos\.total\}/);
    expect(src).toContain('AccessibilityInfo.announceForAccessibility(`${where}${stepTitle}`)');
    expect(src).toContain('AccessibilityInfo.setAccessibilityFocus(node)');
    expect(src).toContain('accessibilityRole="header"');
  });
  test('Back and Cancel are always there; hardware back is intercepted until the save', () => {
    expect(src).toContain("accessibilityLabel=\"Cancel adding this\"");
    expect(src).toContain("navigation.addListener('beforeRemove'");
    expect(src).toContain('if (leavingRef.current || saved) return;');
    expect(src).toContain("appAlert('Leave without saving?', 'Your answers here will not be kept.'");
  });
  test('the footer has one primary action per step and Continue is gated on the step\'s own answer', () => {
    expect(src).toContain('const ok = canContinue(draft, step);');
    expect(src).toContain('<Button title="Continue" onPress={onNext} disabled={!ok} />');
  });
});

describe('"Change" from the check step changes one thing', () => {
  test('Change sets returnToCheck; Continue and Back return to the check once the rest is answered', () => {
    expect(src).toContain('setReturnToCheck(true); setStep(l.step);');
    expect(src).toMatch(/if \(rest\.every\(\(s\) => canContinue\(draft, s\)\)\) \{ setReturnToCheck\(false\); setStep\(ADD_STEP\.CHECK\); return; \}/);
    expect(src).toContain('if (returnToCheck) { setReturnToCheck(false); setStep(ADD_STEP.CHECK); return; }');
  });
});

describe('the flow ends on the thing it made', () => {
  test('finish hands the home screen a key it can scroll to', () => {
    expect(src).toContain("highlight: saved?.groupId ?? 'baseline',");
    expect(src).toContain("navigation.navigate('HowYouTrain', {");
  });
});

describe('honesty at the end (adversarial review 2026-09-03)', () => {
  test('a failed supersede is counted and told, never swallowed', () => {
    expect(src).toContain('let supersedeFailed = 0;');
    expect(src).toMatch(/markConstraintSuperseded\(userId, id, \{ nowMs \}\)\s*\n\s*\.catch\(\(e\) => \{ supersedeFailed \+= 1;/);
    expect(src).toMatch(/endEpisode\(userId, draft\.editing\.groupId, \{ nowMs, reason: 'superseded' \}\)\s*\n\s*\.catch\(\(e\) => \{ supersedeFailed \+= 1;/);
    expect(src).toContain('The old version could not be closed. It still applies alongside this one until you remove it under How you train.');
    // New rows land BEFORE the old are closed: never a gap in which nothing applies.
    expect(src.indexOf('await createConstraints(userId, rows, { nowMs })')).toBeLessThan(src.indexOf('let supersedeFailed = 0;'));
  });
  test('a failed plan check is told, never rendered as "nothing to decide"', () => {
    expect((src.match(/planUnchecked: true/g) ?? []).length).toBe(2);
    expect(src).toContain('Volyume could not check your current plan just now. It will ask you about this under How you train.');
  });
  test('a failed library load shows a retry, never a blank screen', () => {
    expect(src).toContain("libraryStatus === 'failed'");
    expect(src).toContain('<Button title="Try again" onPress={loadLibrary} />');
    expect(src).toContain('Volyume could not load your exercise list just now. Nothing has changed.');
  });
  test('the consent grant has an error path', () => {
    expect(src).toMatch(/try \{ ok = await grantCapabilityConsent\(userId, \{\}\); \} catch \(e\) \{/);
    expect(src).toMatch(/try \{ ok = await hasCapabilityConsent\(userId\); \} catch \(_e\) \{ ok = false; \}/);
  });
});

describe('one phrase per meaning inside the wizard', () => {
  test('"Not now" declines (a real write); "Leave it as it is" writes nothing', () => {
    expect(src).toContain('<Button title="Not now" variant="secondary" onPress={declineNow} />');
    const decline = src.slice(src.indexOf('const declineNow = () => {'), src.indexOf('const commitLines = async () => {'));
    expect(decline).toContain("await recordAll('declined')");
    expect(src).toContain('<Button title="Leave it as it is" variant="secondary" onPress={onKeepPlan} />');
    const keep = src.slice(src.indexOf("onKeepPlan: () => finishPlan('declined')"), src.indexOf("onKeepPlan: () => finishPlan('declined')") + 60);
    expect(keep).not.toMatch(/recordAll|recordEffectiveChoice/);
  });
  test('every write goes through the one consent-gated door, exactly once', () => {
    expect(src.match(/createConstraints\(userId/g)).toHaveLength(1);
  });
});
