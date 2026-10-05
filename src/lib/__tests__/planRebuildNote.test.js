/**
 * D219 lane C1b: the one-time "what changed" note a person sees once after
 * their plan is rebuilt (design section 8: "Under A and B the person sees a
 * one-time note of what changed and why, built from section 6"; founder Q1 = A).
 *
 * composePlanRebuildNote is pure: the facts of one rebuild in, the lines out.
 * It pins:
 *  - the note NAMES what changed and why, by kind: a generated plan lists the
 *    exercises it replaced, took out and added; the caps (explain.js's own cap
 *    line, so the note says what the plan page says); the new targets, with the
 *    numbers before and after; a library or kit plan says its sessions and
 *    exercises are as they were and that sets, the climb and the order changed;
 *    a manual plan says its own counts are served as typed and halved in the
 *    recovery week, and that the set caps never apply to numbers it typed;
 *  - the voice (D204, CLAUDE.md section 3): it describes and never tells anyone
 *    to train more or less, British English, no em dash, calm and plain;
 *  - it states only what it was given: no changed exercise, no line; no target
 *    numbers, no targets line; a list is shortened with a count, never cut
 *    silently;
 *  - deterministic: the same facts, the same note.
 * Each of these fails on the code before this lane (the module did not exist).
 */
const { composePlanRebuildNote, explainLinesForKind, PLAN_REBUILD_KIND } = require('../planRebuildNote');

// The D204 instruction and judgement words the plan explanations are checked
// against (plan/__tests__/explain.test.js), kept identical here.
const NEVER = /\b(too much|near the limit|overtrain(ed|ing)?|overreach(ed|ing)?|junk|cut back|you should|you must|reduce your|train more|train less|risk|danger(ous)?|avoid|must|should|need to|make sure|try to|aim to)\b/i;
const US_SPELLINGS = /\b(color|behavior|optimiz|program(?!me)|center|favorite|recognized)\w*/i;

const CAP = 'No exercise goes above 4 sets. Past 3 or 4 sets, each extra set of the same exercise gets fewer reps for more fatigue, and a second exercise trains parts of the muscle the first reaches less.';
const SPACING = "The order keeps each muscle's own sessions at least 47 hours apart even on consecutive training days, and at least 72 hours apart in a usual week.";

const generated = (over = {}) => composePlanRebuildNote({
  kind: PLAN_REBUILD_KIND.GENERATED,
  changes: {
    replaced: [{ from: 'Smith Machine Bench Press', to: 'Barbell Bench Press' }],
    removed: ['Cable Fly'],
    added: ['Seated Leg Curl'],
  },
  capLine: CAP,
  targets: { week: 5, before: { chest: 22, back: 20, quads: 18 }, after: { chest: 14, back: 16, quads: 12 } },
  week: 3,
  ...over,
});

const text = (note) => note.lines.map((l) => l.text).join('\n');
const ids = (note) => note.lines.map((l) => l.id);

describe('a generated plan: what changed and why', () => {
  test('names the replaced, removed and added exercises and why the list is the standard one', () => {
    const note = generated();
    expect(ids(note)).toEqual(['changes', 'cap', 'targets', 'block']);
    const changes = note.lines.find((l) => l.id === 'changes').text;
    expect(changes).toContain('Smith Machine Bench Press is now Barbell Bench Press');
    expect(changes).toContain('Cable Fly taken out');
    expect(changes).toContain('1 exercise added');
    expect(changes).not.toContain('Seated Leg Curl'); // added exercises are counted, not listed
    expect(changes).toMatch(/standard exercise list/);
  });

  test('says the caps with explain.js\'s own line, word for word', () => {
    expect(generated().lines.find((l) => l.id === 'cap').text).toBe(CAP);
  });

  test('gives the new targets with the numbers before and after, and the biggest movers by name', () => {
    const line = generated().lines.find((l) => l.id === 'targets').text;
    // week 5 totals: 22 + 20 + 18 = 60 before, 14 + 16 + 12 = 42 now.
    expect(line).toContain('At the week 5 peak');
    expect(line).toContain('42 direct sets a week');
    expect(line).toContain('where it held 60');
    expect(line).toContain('Chest 14 (was 22)');
    expect(line).toContain('Back 16 (was 20)');
    expect(line).toContain('Quads 12 (was 18)');
    expect(line).toMatch(/session length/);
  });

  test('says which week the person is in and that the block carries on', () => {
    expect(generated().lines.find((l) => l.id === 'block').text).toMatch(/week 3 of your block/);
    expect(text(generated())).toMatch(/effort targets are as they were/);
  });

  test('a week other than the peak is named as that week', () => {
    const line = generated({ targets: { week: 3, before: { chest: 12 }, after: { chest: 10 } } })
      .lines.find((l) => l.id === 'targets').text;
    expect(line).toContain('In week 3');
  });

  test('a long list is shortened with a count, never cut silently', () => {
    const note = generated({
      changes: { replaced: ['A', 'B', 'C', 'D', 'E', 'F'].map((n) => ({ from: `Old ${n}`, to: `New ${n}` })), removed: [], added: [] },
    });
    const changes = note.lines.find((l) => l.id === 'changes').text;
    expect(changes).toContain('Old A is now New A');
    expect(changes).toContain('Old D is now New D');
    expect(changes).not.toContain('Old E');
    expect(changes).toMatch(/and 2 more/);
  });

  test('states only what it was given: nothing changed, no changes line; no numbers, no targets line', () => {
    const quiet = generated({ changes: { replaced: [], removed: [], added: [] }, targets: null, capLine: null });
    expect(ids(quiet)).toEqual(['block']);
    const noChanges = generated({ changes: null });
    expect(ids(noChanges)).not.toContain('changes');
  });

  test('a muscle whose target did not change is not listed among the biggest changes', () => {
    const line = generated({ targets: { week: 5, before: { chest: 20, back: 16 }, after: { chest: 14, back: 16 } } })
      .lines.find((l) => l.id === 'targets').text;
    expect(line).toContain('Chest 14 (was 20)');
    expect(line).not.toContain('Back 16');
  });
});

describe('a library or kit plan: its own sessions and exercises, with the planner setting the rest', () => {
  const library = (over = {}) => composePlanRebuildNote({
    kind: PLAN_REBUILD_KIND.LIBRARY,
    capLine: CAP,
    spacingLine: SPACING,
    order: { changed: true, names: ['Upper A', 'Lower A', 'Upper B', 'Lower B'] },
    targets: { week: 5, before: { chest: 22 }, after: { chest: 16 } },
    week: 2,
    ...over,
  });

  test('says the sessions and exercises are as they were, and what did change', () => {
    const note = library();
    expect(ids(note)).toEqual(['kept', 'sets', 'order', 'cap', 'targets', 'block']);
    expect(note.lines[0].text).toMatch(/sessions and your exercises are as they were/);
    expect(note.lines[1].text).toMatch(/sets, how they climb over the block, and the order your sessions run in/);
  });

  test('names the new order with explain.js\'s spacing line, only when the order changed', () => {
    const order = library().lines.find((l) => l.id === 'order').text;
    expect(order).toContain('Upper A, Lower A, Upper B, Lower B');
    expect(order).toContain(SPACING);
    const same = library({ order: { changed: false, names: ['Upper A', 'Lower A'] } });
    expect(ids(same)).not.toContain('order');
    expect(same.lines.find((l) => l.id === 'sets').text).not.toMatch(/order/);
  });
});

describe('a manual plan: every count is the person\'s own', () => {
  const manual = composePlanRebuildNote({ kind: PLAN_REBUILD_KIND.MANUAL, week: 4 });

  test('says the plan is as built, counts are served as typed, the recovery week is half, and the caps bind only what the plan adds', () => {
    expect(ids(manual)).toEqual(['kept', 'typed', 'block']);
    expect(manual.lines[0].text).toMatch(/every exercise and every set count is yours/);
    expect(manual.lines[1].text).toMatch(/served as you typed them in weeks 1 to 5/);
    expect(manual.lines[1].text).toMatch(/half in the recovery week/);
    expect(manual.lines[1].text).toMatch(/4-set and 3-set limits apply to sets the plan adds, never to numbers you typed/);
  });

  test('has no changes, caps or targets lines: nothing the person built is changed', () => {
    expect(ids(manual)).not.toEqual(expect.arrayContaining(['changes', 'cap', 'targets']));
  });
});

describe('the voice, for every kind', () => {
  const notes = [
    generated(),
    composePlanRebuildNote({ kind: PLAN_REBUILD_KIND.LIBRARY, capLine: CAP, spacingLine: SPACING, order: { changed: true, names: ['A', 'B'] }, targets: { week: 5, before: { chest: 20 }, after: { chest: 14 } }, week: 1 }),
    composePlanRebuildNote({ kind: PLAN_REBUILD_KIND.MANUAL, week: 1 }),
  ];

  test.each(notes.map((n, i) => [i, n]))('note %i: no instruction or judgement word, no em dash, British spelling', (_i, note) => {
    const all = `${note.title}\n${note.subtitle}\n${text(note)}`;
    expect(all).not.toMatch(NEVER);
    expect(all).not.toContain('—');
    expect(all).not.toMatch(US_SPELLINGS);
  });

  test.each(notes.map((n, i) => [i, n]))('note %i: a title, a subtitle and at least one line, each line with an id and plain text', (_i, note) => {
    expect(note.title).toBe('Your plan has been updated');
    expect(note.subtitle).toBe('What changed, and why');
    expect(note.lines.length).toBeGreaterThan(0);
    for (const line of note.lines) {
      expect(typeof line.id).toBe('string');
      expect(line.text.length).toBeGreaterThan(10);
    }
  });

  test('deterministic: the same facts give the same note', () => {
    expect(generated()).toEqual(generated());
  });

  test('an unknown kind is refused, never given a guessed note', () => {
    expect(() => composePlanRebuildNote({ kind: 'elsewhere' })).toThrow();
  });
});

describe('explainLinesForKind: the plan screen never says the planner chose what it did not', () => {
  const LINES = ['structure', 'spacing', 'cap', 'length', 'readiness', 'ladder'].map((id) => ({ id, text: id }));
  const idsOf = (lines) => lines.map((l) => l.id);

  test('a library or kit plan keeps its explanation except the line that says the split was chosen for the person', () => {
    expect(idsOf(explainLinesForKind(LINES, PLAN_REBUILD_KIND.LIBRARY))).toEqual(['spacing', 'cap', 'length', 'readiness', 'ladder']);
  });

  test('a manual plan loses the structure, the order and the caps lines: its counts and split are the person\'s own', () => {
    expect(idsOf(explainLinesForKind(LINES, PLAN_REBUILD_KIND.MANUAL))).toEqual(['length', 'readiness', 'ladder']);
  });

  test('a generated plan, a plan with no kind, and no lines at all come back as they were', () => {
    expect(explainLinesForKind(LINES, PLAN_REBUILD_KIND.GENERATED)).toBe(LINES);
    expect(explainLinesForKind(LINES, undefined)).toBe(LINES);
    expect(explainLinesForKind(null, PLAN_REBUILD_KIND.MANUAL)).toBeNull();
  });
});
