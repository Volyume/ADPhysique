/**
 * Weekly operating run guard (LOC-665).
 *
 * docs/growth-operations-2026-11/WEEKLY-RUN.md is the runbook for the one
 * weekly run and the monthly wording round. This suite pins, as a source-level
 * regression guard, what the owner's brief requires of it:
 *  - all eight failure signals of plan section 6 (LOC-583, revision 7) appear
 *    in the plan's own words, each with its action in the plan's own words:
 *    none added, none dropped, none softened (the action text is compared
 *    verbatim, so a reworded or shortened action fails);
 *  - the call budget is named, and the "never" list keeps its limits (publish
 *    without the independent check, spend, touch main, read more than
 *    finished totals);
 *  - the example names every signal and carries the figures taken from the
 *    LOC-661 sample totals;
 *  - the page holds no em dash, no emoji and nothing shaped like a secret.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', '..', 'docs', 'growth-operations-2026-11', 'WEEKLY-RUN.md');
const text = fs.readFileSync(FILE, 'utf8');

// Plan section 6 (LOC-583 revision 7): signal, action. Copied verbatim.
const PLAN_SIGNALS = [
  [
    'Volyume is still outside the top 25 for a phrase after two rounds',
    'That phrase is dropped and the next takes its place.',
  ],
  [
    'Volyume ranks for its phrases but installs from store search do not rise',
    'The opening lines of the page and the order of the screenshots are changed, then compared month against month.',
  ],
  [
    'Fewer than 1 in 5 new accounts log three workouts in 14 days (once there are at least 10 accounts to judge by)',
    'Adverts pause if running. The step where most new users stop becomes a repair at the front of the improvement queue that week. The next release\'s new users are compared with the last.',
  ],
  [
    'A crash or error is hitting users',
    'A repair task the same week, ahead of other work.',
  ],
  [
    'A release makes the totals worse than the one before',
    'The change responsible is corrected or removed in the next build.',
  ],
  [
    'Active users stop after a few weeks',
    'The last screen people used before leaving, and the reason they chose on leaving, decide that month\'s improvements.',
  ],
  [
    'Halfway through the advert spend, Apple\'s report shows an install costing more than £5',
    'Adverts stop early.',
  ],
  [
    'Three rounds (on iPhone, three builds) with no rise in installs from store search',
    'Wording changes stop on that phone, because repeating them would be activity for its own sake. Pages stay accurate, featuring requests and the improvement round continue, and my monthly report says plainly that free search has reached its limit there, with the figures. The only routes left need money, so the report may carry one optional spending offer. Nothing stops while you decide, or if you never do.',
  ],
];

const signalRows = text.split('\n').filter((l) => /^\| S[1-8] \|/.test(l));

describe('the eight plan signals', () => {
  test('exactly eight signal rows, S1 to S8 in order', () => {
    expect(signalRows.map((r) => r.split('|')[1].trim())).toEqual([
      'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8',
    ]);
  });

  test.each(PLAN_SIGNALS.map((s, i) => [`S${i + 1}`, s[0], s[1]]))(
    '%s carries the plan signal and action verbatim',
    (id, signal, action) => {
      const row = signalRows.find((r) => r.split('|')[1].trim() === id);
      const cells = row.split('|').map((c) => c.trim());
      expect(cells[2]).toBe(signal);
      expect(cells[3]).toBe(action);
      // The two who-does-it columns must both be filled in.
      expect(cells[4].length).toBeGreaterThan(10);
      expect(cells[5].length).toBeGreaterThan(10);
    },
  );
});

describe('limits', () => {
  test('names the weekly and monthly call budgets', () => {
    expect(text).toMatch(/at most \*\*30 tool calls\*\*/);
    expect(text).toMatch(/at most \*\*60\*\*/);
  });

  test('keeps the never list', () => {
    expect(text).toMatch(/Publish anything .* without the independent check/);
    expect(text).toMatch(/Spend money/);
    expect(text).toMatch(/Touch `main`/);
    expect(text).toMatch(/Read anything but finished totals/);
    expect(text).toMatch(/No research/);
  });

  test('the monthly round has its four jobs', () => {
    expect(text).toMatch(/Position check/);
    expect(text).toMatch(/Swap the weakest phrases/);
    expect(text).toMatch(/Android: prepare for the independent check/);
    expect(text).toMatch(/iPhone: queue for the next build/);
    expect(text).toMatch(/store-position-check\.cjs/);
  });

  test('states the one-time setup for the recurrence', () => {
    expect(text).toMatch(/## 9\. One-time setup needed for the recurrence itself/);
  });
});

describe('the filled-in example', () => {
  const example = text.slice(text.indexOf('## 8. A filled-in example'), text.indexOf('## 9.'));

  test('judges every signal', () => {
    for (let i = 1; i <= 8; i += 1) expect(example).toMatch(new RegExp(`- S${i} `));
  });

  test('uses figures from the LOC-661 sample totals', () => {
    expect(example).toContain('24 of 42, 57%');
    expect(example).toContain('33 crashes, 12 people');
    expect(example).toContain('9 of 15, 60%');
    expect(example).toContain('13 of 25, 52%');
    expect(example).toContain('| 35 | 32 |');
  });

  test('S3 and S4 verdicts follow from the figures printed on their own lines', () => {
    const s3 = example.match(/- S3 .*?(\*\*(?:not )?fired\*\*)\. (\d+) of (\d+)/);
    expect(s3).not.toBeNull();
    const [, verdict, three, judged] = s3;
    const fires = Number(judged) >= 10 && Number(three) * 5 < Number(judged);
    expect(verdict).toBe(fires ? '**fired**' : '**not fired**');
    expect(example).toMatch(/- S4 .*\*\*fired\*\*/);
  });
});

describe('monthly swaps never soften S1', () => {
  const m4 = text.slice(text.indexOf('**M4.'), text.indexOf('**M5.'));

  test('S1 drops are explicitly uncapped', () => {
    expect(m4).toMatch(/S1 drops are never capped/);
    expect(m4).toMatch(/however many there are/);
  });

  test('no cap on swaps is written into the M4 steps themselves', () => {
    // The only cap on swaps is R8, which applies beyond S1 drops.
    expect(m4).not.toMatch(/maximum of \*\*3 swaps/);
    expect(text).toMatch(/R8\. Extra swaps and "weakest"[^\n]*They never limit S1/);
  });

  test('a drop is never skipped because the replacement does not fit', () => {
    expect(m4).toMatch(/A phrase is never left in the wording because the replacements do not fit/);
    expect(m4).toMatch(/waiting for room/);
  });

  test('S1 and S8 share one meaning of a round', () => {
    expect(text).toMatch(/R2\. A round \(one meaning, used by S1 and S8\)/);
  });
});

describe('the advert duties LOC-664 gives the weekly run', () => {
  const step5 = text.slice(text.indexOf('**Step 5.'), text.indexOf('**Step 6.'));

  test('reports start gates G1 and G2', () => {
    expect(step5).toMatch(/G1, the corrected iPhone page is live/);
    expect(step5).toMatch(/G2, the weekly totals work/);
  });

  test('reads the hand exports on the six dates', () => {
    expect(step5).toMatch(/S\+7, S\+14, S\+21, S\+28, S\+30 and S\+40/);
  });

  test('makes the day-8 read under £4.00', () => {
    expect(step5).toMatch(/Day-8 read/);
    expect(step5).toMatch(/under \*\*£4\.00\*\*/);
  });
});

describe('hygiene', () => {
  test('no em dash and no emoji', () => {
    expect(text).not.toMatch(/—/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  test('nothing shaped like a secret', () => {
    expect(text).not.toMatch(/ghp_|github_pat_|sbp_|sk_live|eyJ[A-Za-z0-9_-]{10,}|BEGIN [A-Z ]*PRIVATE KEY/);
  });
});
