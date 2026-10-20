/**
 * Item 15 (owner 2026-10-20): the decision wording was rewritten for new
 * outputs, but the ED, FFM-floor and rapid-loss copy is locked and must stay
 * word for word. This suite pins every such string verbatim, in the engine
 * (weeklyCoach.js) and in the shared templates (whyThisTemplates.js), so a
 * future rewrite pass cannot touch them without failing here.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const COACH = fs.readFileSync(path.join(__dirname, '..', 'weeklyCoach.js'), 'utf8');
const TEMPLATES = require('../whyThisTemplates');

describe('locked ED, FFM and rapid-loss engine copy is verbatim', () => {
  const LOCKED = [
    'Your calorie target holds. Your seven-day average intake is at or below the safety floor for your lean mass.',
    'Weight dropped fast this week with low energy, so calories go up now rather than waiting two weeks.',
    'Weight is dropping faster than the target rate and energy is low. Adding calories straight away to protect recovery.',
    'Calorie cut held. Multiple safety signals are active. See the held-decision card for details.',
    'Hold lifted. The signals that triggered the hold have settled for two weeks. Standard coaching resumes next week.',
    'is at or below your safety floor of ${ffmFloorContext.floorKcal} kcal. Eating below this level for long stretches can compromise recovery and lean mass.',
    'Calorie target raised by ${calorieAdjustment.change} kcal. Weight dropped ${Math.abs(actualRatePct).toFixed(1)}% this week with low energy; the standard two-week wait is bypassed.',
    'Calories held. Wellbeing screen flagged restriction concerns.',
    'Your food diary could not be read this run, so the safety floor check could not confirm a reduction is safe. Nothing changes until the next successful check.',
  ];
  test.each(LOCKED)('%s', (line) => {
    expect(COACH.includes(line)).toBe(true);
  });
});

describe('locked ED and rapid-loss templates are unchanged', () => {
  // sha256 of the JSON of each locked export, taken from the base before the
  // wording pass. A change to a single character changes the hash.
  const sha = (v) => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
  test('ED lockout, cleared and rapid-loss copy hashes', () => {
    expect({
      lockout: sha(TEMPLATES.ED_PATTERN_LOCKOUT_COPY),
      cleared: sha(TEMPLATES.ED_PATTERN_CLEARED_COPY),
      rapid: sha(TEMPLATES.RAPID_LOSS_CORRECTED_COPY),
    }).toEqual(PINNED);
  });
});

const PINNED = {
  lockout: '2ebc559b62a4dec13d9a1309b5aedd249592c08cbf9f0c6d77f95436af524da7',
  cleared: '14a7c0cfd9e127066405535c2f20ee00d5d6396abc846e63b040928e105cfd68',
  rapid: '77a08ddbbca040c809e81cf8a4de1b5699d5f6a370c12b48163bb87d4d6e6ec3',
};
