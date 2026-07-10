/**
 * Ultimate-Audit item 11 (D16, founder ruling 2026-07-10): named autonomy
 * modes -- Coached / Collaborative / Manual -- wired into CoachOutputScreen.
 *
 * Source read in full for this build:
 * - docs/ultimate-audit-2026-06-13/pass3-v2-founder-decisions.md:166
 *   ("Named autonomy modes (AC/SC) -- Coached/Collaborative/Manual toggle
 *   (manual control already exists; name it)") and :186-187 (NA-coaching-10:
 *   "Coached never auto-applies while a safety hold / ED-flag / suppression
 *   is active -- the decision is shown for the user to confirm; auto-apply
 *   resumes only when clear.").
 * - docs/ultimate-audit-2026-06-13/pass4-blueprints-coaching-progress.md
 *   :191-377 (ULTIMATE-AUTONOMY-01 mapping + implementation blueprint).
 * - D16 (this run) refines NA-coaching-10 into the exact named hold set:
 *   deload, poor recovery, safety hold, FFM floor, ED flag, rapid loss, calm
 *   mode -- enforced in ONE place, weeklyCoach.js's `autoApplyHoldActive`
 *   (see weeklyCoach.d16AutonomyHold.test.js for the engine-side contract).
 *
 * This screen cannot be safely `require`'d in Jest (expo-notifications,
 * Reanimated, the live zustand store; no existing mock scaffold -- see
 * CoachOutputScreen.progressScanAssessment.test.js and
 * CoachOutputScreen.d15ExceededEscalation.guard.test.js, both source-guard-
 * only for the same reason). This suite follows that same established house
 * convention: fs.readFileSync + regex against the real source.
 *
 * Pins:
 *  1. coachAutonomy is read the same local-only way coachTone is (default
 *     'collaborative', so existing users see no behaviour change).
 *  2. Manual strips every onApply* prop passed into the adjustment cards (no
 *     Apply control renders); Coached and Collaborative both keep them wired
 *     identically -- confirm-then-apply remains the only write path in every
 *     mode; a more autonomous mode only changes WHO triggers it.
 *  3. The Coached auto-apply effect gates on `coachAutonomy === 'coached'`
 *     AND `!output.autoApplyHoldActive` (D16's single enforcement point) and
 *     invokes the SAME handlers Collaborative's tap does -- no parallel
 *     compute path, no bypass of any handler's own guards.
 *  4. Deload supersedes the incremental training-volume push in Coached mode
 *     the same way the render already does (TrainingNextWeekCard shows one
 *     or the other, never both).
 */
const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.resolve(__dirname, '../CoachOutputScreen.js'), 'utf8');

describe('D16: coachAutonomy read + default', () => {
  test('read the same local-only way coachTone is (default collaborative)', () => {
    expect(SCREEN).toMatch(
      /const coachAutonomy = userProfile\?\.coachAutonomy \?\? 'collaborative';/,
    );
  });

  test('applyDisabled is derived from Manual only', () => {
    expect(SCREEN).toMatch(/const applyDisabled = coachAutonomy === 'manual';/);
  });
});

describe('D16: Manual strips every onApply* prop; Coached/Collaborative keep them wired', () => {
  test('every adjustment card receives its handler gated on applyDisabled, never unconditionally', () => {
    const gatedProps = [
      'onApply={applyDisabled ? undefined : handleApplyTraining}',
      'onApplyDeload={applyDisabled ? undefined : handleApplyDeload}',
      'onApplyCalories={applyDisabled ? undefined : handleApplyCalories}',
      'onApplyCardio={applyDisabled ? undefined : handleApplyCardio}',
      'onApply={applyDisabled ? undefined : handleApplyMacroCycle}',
      'onApply={applyDisabled ? undefined : handleApplyRefeed}',
      'onApply={applyDisabled ? undefined : handleApplyDietBreak}',
    ];
    for (const line of gatedProps) {
      expect(SCREEN).toContain(line);
    }
  });

  test('no handler is ever passed unconditionally (the old un-gated wiring is fully replaced)', () => {
    const unconditional = [
      'onApply={handleApplyTraining}',
      'onApplyDeload={handleApplyDeload}',
      'onApplyCalories={handleApplyCalories}',
      'onApplyCardio={handleApplyCardio}',
      'onApply={handleApplyMacroCycle}',
      'onApply={handleApplyRefeed}',
      'onApply={handleApplyDietBreak}',
    ];
    for (const line of unconditional) {
      expect(SCREEN).not.toContain(line);
    }
  });
});

describe('D16: the Coached auto-apply effect', () => {
  function effectBody() {
    const match = SCREEN.match(
      /\/\/ Ultimate-Audit item 11 \(D16[\s\S]*?useEffect\(\(\) => \{[\s\S]*?\n {2}\}, \[coachAutonomy, output, applyingKey, nextTrainingWeekId, user\?\.id\]\);/,
    );
    expect(match).toBeTruthy();
    return match[0];
  }

  test('gates on coachAutonomy === coached', () => {
    expect(effectBody()).toMatch(/if \(coachAutonomy !== 'coached'\) return;/);
  });

  test('D16: gates on output.autoApplyHoldActive -- the ONE enforcement point', () => {
    const body = effectBody();
    expect(body).toMatch(/if \(output\.autoApplyHoldActive\) return;/);
  });

  test('re-entrancy: will not fire a second apply while one is already in flight', () => {
    expect(effectBody()).toMatch(/if \(applyingKey\) return;/);
  });

  test('deload supersedes the incremental training push (either/or, never both)', () => {
    const body = effectBody();
    expect(body).toMatch(/if \(output\.deloadSuggested\) \{/);
    expect(body).toMatch(/handleApplyDeload\(\);/);
    expect(body).toMatch(/if \(output\.volumeSignal && !isApplied\(output, 'training'\) && nextTrainingWeekId\)/);
  });

  test('invokes the SAME apply handlers Collaborative uses, not a parallel compute path', () => {
    const body = effectBody();
    for (const handler of [
      'handleApplyDeload();',
      'handleApplyTraining();',
      'handleApplyCalories();',
      'handleApplyCardio();',
      'handleApplyDietBreak();',
      'handleApplyMacroCycle();',
      'handleApplyRefeed();',
    ]) {
      expect(body).toContain(handler);
    }
  });

  test('checks isApplied before every handler call (idempotent against re-renders)', () => {
    const body = effectBody();
    expect(body.match(/!isApplied\(output, '(deload|training|calories|cardio|dietBreak|macroCycle|refeed)'\)/g).length).toBe(7);
  });
});

describe('D16: SettingsCoachingScreen carries the mode selector (sibling-file check)', () => {
  const SETTINGS = fs.readFileSync(
    path.resolve(__dirname, '../SettingsCoachingScreen.js'),
    'utf8',
  );

  test('persists via saveLocalProfile the same way coachTone does (local-only field)', () => {
    expect(SETTINGS).toMatch(
      /const \[coachAutonomy, setCoachAutonomyState\] = useState\(userProfile\?\.coachAutonomy \?\? 'collaborative'\);/,
    );
    expect(SETTINGS).toMatch(
      /await saveLocalProfile\(user\.id, \{ \.\.\.\(userProfile \|\| \{\}\), coachAutonomy: next \}\);/,
    );
  });

  test('exposes exactly the three named modes with plain, honesty-test-passing copy', () => {
    expect(SETTINGS).toContain("{ key: 'coached', label: 'Coached' }");
    expect(SETTINGS).toContain("{ key: 'collaborative', label: 'Collaborative' }");
    expect(SETTINGS).toContain("{ key: 'manual', label: 'Manual' }");
    expect(SETTINGS).toContain("The coach applies each week's changes for you.");
    expect(SETTINGS).toContain('The coach suggests each change. You tap to apply it.');
    expect(SETTINGS).toContain('The coach shows each change and the reason. You make the change yourself.');
  });

  test('no em dash in the new copy (British English, no em/en dashes)', () => {
    const block = SETTINGS.slice(
      SETTINGS.indexOf("Text style={styles.toneLabel}>Autonomy"),
      SETTINGS.indexOf("Text style={styles.toneLabel}>Autonomy") + 1200,
    );
    expect(block).not.toMatch(/—/);
  });
});
