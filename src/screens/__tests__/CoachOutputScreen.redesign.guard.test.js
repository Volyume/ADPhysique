/**
 * CoachOutputScreen.redesign.guard.test.js
 *
 * D206, the founder's orders of 2026-09-26 on the Coaching decision
 * screen: "Redesign it in line with the rest of the app this is meant to be
 * an elite product" and "Cut the duplicate." Source guards, per the house
 * convention for this screen, pinning the redesign's structure:
 *
 *  - the order: the decision, the safety shelf and what was held, your
 *    week, next, plan ahead, Done;
 *  - one loud line: the decision title is the only h2 on the screen;
 *  - one voice per fact: the retired narrators (the stat chips, the coach's
 *    acknowledgement and trend read, the working/off ledger, the why block,
 *    the focus cue, the pre-commitment line, the story's
 *    happened/means/staying lists) are not rendered here again;
 *  - rows that take you somewhere are the shared SettingRow; the method
 *    link lives once, on the decision.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'CoachOutputScreen.js'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

function renderBlock() {
  const start = CODE.lastIndexOf('<BackHeader title="Coaching decision" onBack={handleClose} />');
  const end = CODE.indexOf('</ScrollView>', start);
  return CODE.slice(start, end);
}

describe('the order of the screen', () => {
  test('decision, what we held, your week, next, plan ahead, Done', () => {
    const r = renderBlock();
    const at = (needle) => {
      const i = r.indexOf(needle);
      expect(i).toBeGreaterThan(-1);
      return i;
    };
    const order = [
      at('{heroCardEl ?? ('),
      at('<SectionLabel heading>What we held</SectionLabel>'),
      at('<SectionLabel heading>Your week</SectionLabel>'),
      at('<SectionLabel heading>Next</SectionLabel>'),
      at('<SectionLabel heading>Plan ahead</SectionLabel>'),
      at('title="Done"'),
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test('the safety blocks stay directly under the decision, never collapsed', () => {
    const r = renderBlock();
    expect(r.indexOf('<RapidLossAlert />')).toBeLessThan(r.indexOf('<SectionLabel heading>What we held</SectionLabel>'));
    expect(r.indexOf('zones.dietBreakInSafety ? dietBreakCardEl : null')).toBeLessThan(r.indexOf('<SectionLabel heading>Your week</SectionLabel>'));
  });
});

describe('one loud line', () => {
  test('the decision title is the only h2 on the screen', () => {
    const styles = CODE.slice(CODE.indexOf('const styles = StyleSheet.create({'));
    const h2 = styles.match(/\.\.\.(t\.)?type\.h2\b/g) || [];
    expect(h2).toHaveLength(2); // the frozen decisionTitle and its live twin
    expect(styles).toMatch(/decisionTitle: \{ \.\.\.type\.h2, color: colors\.textPrimary \}/);
  });
});

describe('each fact once', () => {
  test('the retired narrators are not rendered on this screen', () => {
    for (const gone of [
      /<StatChip\b/, /<LedgerCard\b/, /<WhyBlock\b/, /buildOffItems\(/, /buildFocus\(/,
      /coachResponse\.acknowledgement/, /baseCoachResponse\.interpretation/, /coachResponse\.cue/,
      /coachResponse\.preCommitment/, /coachResponse\.commitmentAnswer/,
      /weeklyStory\.happened/, /weeklyStory\.means/, /weeklyStory\.staying/, /weeklyStory\.watching/,
    ]) {
      expect(CODE).not.toMatch(gone);
    }
  });

  test('the method link lives once, on the decision; history lives once, under Plan ahead', () => {
    expect((CODE.match(/navigate\('Methodology'/g) || []).length).toBe(1);
    expect((CODE.match(/navigate\('CoachHeldHistory'\)/g) || []).length).toBe(1);
    expect(CODE).not.toMatch(/See all weeks/);
    expect(CODE).not.toMatch(/See how Precision Coaching decides/);
  });
});

describe('rows that take you somewhere are the shared row', () => {
  test('Plan ahead is SettingRows inside one card', () => {
    const r = renderBlock();
    const plan = r.slice(r.indexOf('<SectionLabel heading>Plan ahead</SectionLabel>'), r.indexOf('title="Done"'));
    expect((plan.match(/<SettingRow\b/g) || []).length).toBe(3);
    expect(plan).toMatch(/label="Plan next week's meals"/);
    expect(plan).toMatch(/label="Coaching history"/);
    expect(plan).toMatch(/\{greatWeek \? \(\s*<SettingRow/);
  });
});
