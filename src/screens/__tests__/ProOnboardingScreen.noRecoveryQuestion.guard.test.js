/**
 * D228 addendum Q5-A (founder "Go as recommended", 2026-10-15): onboarding no
 * longer asks the recovery-level question.
 *
 * What this suite pins and why.
 *
 * The structure engine never reads the answer (its inputs are goal, days,
 * length, equipment, experience, focus; src/lib/structure/adapt.js). So the
 * question, its required-field validation and its "blocks progression" entry
 * leave the wizard, and no step asks it. What does NOT change:
 *   - the profile field `recoveryRating` and every reader outside onboarding
 *     (muscle recovery model, generator inputs, block ledger, and the two edit
 *     screens that still let the person set it);
 *   - the key is still WRITTEN at the end of onboarding, with the default every
 *     reader already falls back to ('average'), and never over a value the
 *     person has already set, so nothing downstream sees it absent;
 *   - every other required field, and the sex gate (proOnboarding.sexGate.test.js
 *     is untouched and still passes).
 *
 * Source-level guard, same convention as the other ProOnboardingScreen guards.
 */
const fs = require('fs');
const path = require('path');

const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const SRC = read('ProOnboardingScreen.js');

describe('Q5-A: no step of the wizard asks for a recovery level', () => {
  test('the question, its options, its setter and its copy are gone', () => {
    for (const gone of [
      "How's your recovery?",
      'RECOVERY_OPTIONS',
      'setRecoveryRating',
      'Select your recovery',
      'Choose your recovery level.',
      'Still needed: your recovery level.',
      'Be honest here. This sets how much volume your plan includes, so it can protect your recovery.',
      'Often sore, disrupted sleep, high life stress',
      'errors8.recovery',
      "markY('recovery')",
    ]) {
      expect(SRC).not.toContain(gone);
    }
  });

  test('no recovery gate: the step-8 validator, its attempted flag and its surfaced gap are gone', () => {
    expect(SRC).not.toMatch(/function validateStep8/);
    expect(SRC).not.toMatch(/attempted8|setAttempted8|group8|errors8/);
    expect(SRC).not.toMatch(/errs\.recovery/);
    // Continue on the last step goes straight to the schedule-fit check: no
    // validator, no surfaced gap and no early return stand before it.
    const fn = SRC.slice(SRC.indexOf('async function advanceFrom8()'));
    const fitCheck = fn.indexOf('if (!fitAccepted && !libraryKitForEquipment(equipment)) {');
    expect(fitCheck).toBeGreaterThan(-1);
    expect(fn.slice(0, fitCheck)).not.toMatch(/validateStep|surfaceGaps|setAttempted|return;/);
  });

  test('the step no longer promises recovery guardrails or carries the recovery title', () => {
    const outcomes8 = SRC.slice(SRC.indexOf('  8: ['), SRC.indexOf('];', SRC.indexOf('  8: [')));
    expect(outcomes8).not.toMatch(/Recovery guardrails/);
    expect(outcomes8).toMatch(/Check-in rhythm/);
    expect(SRC).toContain('title="Your reminders"');
    expect(SRC).not.toContain('title="Recovery and reminders"');
  });

  test('the reminders are untouched: morning weigh-in time, weekly check-in day, required pill', () => {
    expect(SRC).toContain('Morning weight reminder');
    expect(SRC).toContain('Weekly check-in reminder');
    expect(SRC).toContain('accessibilityRole="radiogroup" accessibilityLabel="Morning weight reminder time"');
    expect(SRC).toContain('accessibilityRole="radiogroup" accessibilityLabel="Weekly check-in day"');
    expect(SRC).toContain('<Text style={[styles.requiredPillText, live.requiredPillText]}>Part of your coaching</Text>');
  });
});

describe('Q5-A: the profile still gets its recovery key, with the default every reader uses', () => {
  test('the value is the profile\'s own, else the default; it is never a typed-in answer', () => {
    expect(SRC).toMatch(/const DEFAULT_RECOVERY_RATING = 'average';/);
    expect(SRC).toMatch(/const recoveryRating = userProfile\?\.recoveryRating \?\? DEFAULT_RECOVERY_RATING;/);
    expect(SRC).not.toMatch(/\[recoveryRating, setRecoveryRating\]/);
  });

  test('the final profile write still carries the key, after the existing profile is spread (so a set value is kept)', () => {
    const merged = SRC.slice(SRC.indexOf('const merged = {'), SRC.indexOf('// RA-4 (D96, Review A): the name is optional now'));
    expect(merged).toMatch(/\.\.\.\(userProfile \|\| \{\}\),/);
    expect(merged).toMatch(/\n\s+recoveryRating,\n/);
    expect(merged.indexOf('...(userProfile || {})')).toBeLessThan(merged.indexOf('recoveryRating,'));
  });

  test('plan generation inputs still carry it, so the legacy generator sees what it always defaulted to', () => {
    const planProfile = SRC.slice(SRC.indexOf('function planProfileNow('), SRC.indexOf('Ask the engine what it would actually build'));
    expect(planProfile).toMatch(/\n\s+recoveryRating,\n/);
  });

  test('the draft no longer stores or restores it (an old draft carrying the key is simply ignored)', () => {
    expect(SRC).not.toMatch(/a\.recoveryRating/);
    const answers = SRC.slice(SRC.indexOf('const answers = {'), SRC.indexOf('if (draftTimerRef.current) clearTimeout'));
    expect(answers).not.toMatch(/recoveryRating/);
  });

  test('the default is the one the readers outside onboarding fall back to', () => {
    expect(read('..', 'lib', 'recovery', 'load.js')).toMatch(/profile\?\.recoveryRating \?\? 'average'/);
    expect(read('..', 'lib', 'planAutoGen.js')).toMatch(/recoveryRating: migrated\.recoveryRating \?\? 'average'/);
    expect(read('..', 'lib', 'blockLedgerGather.js')).toMatch(/userProfile\.recoveryRating \?\? 'average'/);
  });

  test('the two edit screens still let the person set it, from the same profile field', () => {
    for (const screen of ['PlanUpdateScreen.js', 'ProGoalSetupScreen.js']) {
      expect(read(screen)).toMatch(/useState\(userProfile\?\.recoveryRating \?\? 'average'\)/);
    }
  });
});

describe('Q5-A: every other required field, and the sex gate, stay exactly as they were', () => {
  test('step 2 still requires an explicit sex, age, height and weight', () => {
    expect(SRC).toMatch(/function validateStep2\(\) \{[\s\S]{0,200}?if \(sex !== 'male' && sex !== 'female'\) errs\.sex = 'Choose your biological sex\.';/);
    expect(SRC).toMatch(/errs\.age = 'Enter your age, 13 to 100\.'/);
    expect(SRC).toMatch(/errs\.height = 'Enter your height\.'/);
    expect(SRC).toMatch(/errs\.weight = 'Enter your body weight\.'/);
    expect(SRC).toMatch(/const \[\s*sex\s*,\s*setSex\s*\]\s*=\s*useState\(\s*null\s*\)/);
  });

  test('step 4 still requires experience, session length, days and equipment', () => {
    const v4 = SRC.slice(SRC.indexOf('function validateStep4()'), SRC.indexOf('function validateStep7()'));
    for (const msg of [
      'Choose your training experience.', 'Choose your usual session length.',
      'Choose your training days.', 'Choose your equipment.',
    ]) {
      expect(v4).toContain(msg);
    }
  });

  test('step 7 still requires the focus', () => {
    expect(SRC).toMatch(/function validateStep7\(\) \{\s*const errs = \{\};\s*if \(!trainingPhase\) errs\.phase = 'Choose what you are focused on\.';/);
  });
});
