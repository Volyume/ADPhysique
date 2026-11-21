/**
 * Guard for the held Apple search advert campaign (LOC-664).
 *
 * What this pins and why: the founder approved "£60 at most, exact UK searches only,
 * £2 a day for 30 days". Apple's only ceiling on a card account is daily budget x days
 * with an end date (no lifetime budget, no budget orders). So the numbers must agree
 * with each other, the end date must be start + 29 (start + 30 would allow £62), every
 * keyword must be exact and come from LOC-662's phrase list without the brand, no
 * negative keyword may cancel a keyword, and the document must carry the same lists as
 * campaign.json. Nothing here talks to Apple or any network.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const sheet = require('../appleAdsEntrySheet.cjs');

const ROOT = path.join(__dirname, '..', '..', '..');
const DOC = fs.readFileSync(path.join(ROOT, 'docs', 'growth-ads-2026-11', '01-campaign-definition.md'), 'utf8');
const def = sheet.loadDefinition();

// The 21 non-brand rows of LOC-662's phrases.tsv at commit d3e9bd75d5bda28d3a1bd59c0f537cab093e0d74,
// written out here because that file is not on this task's base.
const LOC_662_PHRASES = [
  'hypertrophy', 'hypertrophy training', 'hypertrophy tracker', 'progressive overload',
  'progressive overload workout', 'progressive overload tracker', 'bodybuilding', 'bodybuilding workout',
  'bodybuilding planner', 'gym log', 'workout log', 'workout tracker', 'workout tracker free',
  'workout planner', 'gym planner', 'weight lifting log', 'weight lifting tracker', 'strength training',
  'macro tracker', 'calorie counter free uk', 'muscle building',
];

function fencedBlocks(md) {
  const out = [];
  const re = /```\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(md))) out.push(m[1].replace(/\n$/, ''));
  return out;
}

describe('the ceiling', () => {
  test('daily budget times days equals the approved total, and the total is 60 pounds', () => {
    expect(def.dailyBudgetGbp).toBe(2);
    expect(def.durationDays).toBe(30);
    expect(def.dailyBudgetGbp * def.durationDays).toBe(def.totalCeilingGbp);
    expect(def.totalCeilingGbp).toBe(60);
  });

  test('no lifetime budget is assumed (Apple paused them in June 2026)', () => {
    expect(def.lifetimeBudgetAvailable).toBe(false);
  });

  test('a single tap can never cost more than the day budget, before or after the one allowed raise', () => {
    expect(def.startingMaxCptGbp).toBeLessThanOrEqual(def.dailyBudgetGbp);
    expect(def.raisedMaxCptGbp).toBeLessThanOrEqual(def.dailyBudgetGbp);
    expect(def.raisedMaxCptGbp).toBeGreaterThan(def.startingMaxCptGbp);
  });

  test.each(['2026-12-01', '2026-12-02', '2027-01-15', '2027-02-01', '2028-02-10', '2026-11-30'])(
    'start %s: the end date makes exactly 30 calendar days and 60 pounds',
    (start) => {
      const s = sheet.entrySheet(start, def);
      expect(sheet.campaignDays(s.startDate, s.endDate)).toBe(30);
      expect(s.days * def.dailyBudgetGbp).toBe(60);
      expect(s.endDate).toBe(sheet.formatYmd(sheet.addDays(sheet.parseYmd(start), 29)));
    },
  );

  test('the worked example in the document is right, and start + 30 is the wrong answer', () => {
    expect(sheet.entrySheet('2026-12-01', def).endDate).toBe('2026-12-30');
    expect(DOC).toContain('start 2026-12-01, end 2026-12-30');
    expect(sheet.campaignDays('2026-12-01', '2026-12-31')).toBe(31);
  });

  test('the helper refuses a definition whose arithmetic does not hold', () => {
    expect(() => sheet.entrySheet('2026-12-01', { ...def, endDateIsStartPlusDays: 30 })).toThrow(/31 days/);
    expect(() => sheet.entrySheet('2026-12-01', { ...def, dailyBudgetGbp: 3, startingMaxCptGbp: 1.5 })).toThrow(/ceiling/);
    expect(() => sheet.entrySheet('2026-12-01', { ...def, startingMaxCptGbp: 2.5 })).toThrow(/more than the daily budget/);
  });

  test('the helper refuses a start date that is not a real date', () => {
    expect(() => sheet.entrySheet('2026-02-30', def)).toThrow(/real calendar date/);
    expect(() => sheet.entrySheet('1 December', def)).toThrow(/YYYY-MM-DD/);
  });

  test('the document states the ceiling and the end-date rule', () => {
    expect(DOC).toMatch(/30 days × £2 = \*\*£60/);
    expect(DOC).toContain('Start date plus 29 days, 23:59');
    expect(DOC).toContain('If you set an end date, you won\'t spend more than the total number of days in the campaign times your daily budget.');
    expect(DOC).toContain('All campaigns that used lifetime budget were paused in June 2026.');
  });
});

describe('the structure the plan approved', () => {
  test('one campaign, one ad group, UK only, search results only, Search Match off', () => {
    expect(def.campaignCount).toBe(1);
    expect(def.adGroupCount).toBe(1);
    expect(def.storefront).toBe('United Kingdom only');
    expect(def.placement).toBe('App Store search results only');
    expect(def.searchMatch).toBe(false);
    expect(def.bidStrategy).toMatch(/^Manage Bids/);
    expect(def.keywordMatchType).toBe('exact');
  });

  test('default product page: no custom page, no ad variation, no ad text of its own', () => {
    expect(def.productPage).toBe('default');
    expect(def.customProductPage).toBeNull();
    expect(def.adVariations).toBe(0);
    expect(Object.keys(def).filter((k) => /adText|headline|creative|promo/i.test(k))).toEqual([]);
  });

  test('no tracker or SDK is added to the app by this task', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).join(' ');
    expect(names).not.toMatch(/attribution|adjust|appsflyer|branch|singular|kochava|firebase|facebook|tiktok|apple-ads|adservices/i);
    expect(DOC).toMatch(/no tracker or SDK is added to the app/);
  });

  test('nothing is created or started: no credential, key or token appears in the folder or the helper', () => {
    const files = [
      path.join(ROOT, 'docs', 'growth-ads-2026-11', 'campaign.json'),
      path.join(ROOT, 'docs', 'growth-ads-2026-11', '01-campaign-definition.md'),
      path.join(ROOT, 'scripts', 'growth', 'appleAdsEntrySheet.cjs'),
    ];
    for (const f of files) {
      const t = fs.readFileSync(f, 'utf8');
      expect(t).not.toMatch(/-----BEGIN|client_secret\s*[:=]\s*\S{8,}|Bearer\s+[A-Za-z0-9._-]{16,}|process\.env/);
    }
    const helper = fs.readFileSync(path.join(ROOT, 'scripts', 'growth', 'appleAdsEntrySheet.cjs'), 'utf8');
    expect(helper).not.toMatch(/require\(['"](https?|net|child_process|node:https?)['"]\)|fetch\(/);
  });
});

describe('keywords', () => {
  test('exactly the 21 non-brand phrases from LOC-662, in order, none repeated', () => {
    expect(def.keywords).toEqual(LOC_662_PHRASES);
    expect(new Set(def.keywords).size).toBe(def.keywords.length);
  });

  test('the brand control is not bid on and is a negative keyword', () => {
    expect(def.keywords).not.toContain(def.brandControlExcluded);
    expect(def.negativeKeywords).toContain(def.brandControlExcluded);
  });

  test('when LOC-662 has landed on this tree, its phrase list still matches (else: not on this base)', () => {
    const tsv = path.join(ROOT, 'docs', 'growth-store-2026-11', 'phrases.tsv');
    if (!fs.existsSync(tsv)) {
      expect(def.keywordSource.commit).toBe('d3e9bd75d5bda28d3a1bd59c0f537cab093e0d74');
      return;
    }
    const rows = fs.readFileSync(tsv, 'utf8').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t')[0]);
    expect(rows.filter((p) => p !== def.brandControlExcluded)).toEqual(def.keywords);
  });

  test('no negative keyword is a whole-word part of a keyword, so no negative cancels a keyword', () => {
    for (const neg of def.negativeKeywords) {
      if (neg === def.brandControlExcluded) continue;
      const re = new RegExp(`(^| )${neg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`);
      for (const kw of def.keywords) expect(re.test(kw)).toBe(false);
    }
  });

  test('no weight-loss, cardio, AI, or competitor-brand term is a keyword', () => {
    expect(def.keywords.join('\n')).not.toMatch(/lose weight|weight loss|fat|diet|slimming|cardio|step|running|\bai\b|hevy|fitbod|jefit|myfitnesspal|fitnotes/i);
  });
});

describe('stop rules use figures Apple or the weekly totals really show', () => {
  test('rule A is keyed to Spend reaching 30 pounds, not to a calendar day (plan: "halfway through the advert spend")', () => {
    const a = def.stopRules.halfway;
    expect(a.triggerSpendGbp).toBe(def.totalCeilingGbp / 2);
    expect(a.maxCostPerInstallGbp).toBe(5);
    expect(a).not.toHaveProperty('checkedAfterDay');
    expect(JSON.stringify(a)).not.toMatch(/day 15|S\+15/i);
    expect(a.readCadence).toMatch(/every morning/);
    expect(a.noInstallsRule).toMatch(/no installs/);
    expect(a.neverReachedRule).toMatch(/does not apply/);
    expect(DOC).toContain('Spend ÷ Installs (Tap-Through) is more than £5.00, or there are no installs');
    expect(DOC).toContain('first read at which Spend');
    expect(DOC).toContain('**£30.00 or more**');
    expect(DOC).toContain('**If £30.00 is never reached**');
    // Apple only limits the total, so the document must not claim a date-based bound on spend.
    expect(DOC).not.toMatch(/at most about £30 can have been spent/);
    expect(DOC).not.toMatch(/morning after day 15|Morning of S\+15/);
    expect(sheet.render('2026-12-01', def)).toMatch(/Halfway check:\s+the first daily read with Spend of GBP 30\.00 or more/);
    expect(sheet.render('2026-12-01', def)).not.toMatch(/2026-12-16/);
  });

  test('the hand-export fallback covers every read the document relies on, and says what it loses', () => {
    const days = def.handExportDaysAfterStart;
    expect(days).toContain(def.dayEightRaiseCheckAfterStart);
    expect(days).toContain(def.finalReads.provisionalAfterDay);
    expect(days).toContain(def.finalReads.finalAfterDay);
    const weekly = days.filter((d) => d < 30);
    for (let i = 1; i < weekly.length; i += 1) expect(weekly[i] - weekly[i - 1]).toBeLessThanOrEqual(7);
    expect(weekly[0]).toBeLessThanOrEqual(7);
    expect(sheet.entrySheet('2026-12-01', def).handExportDates).toEqual(
      ['2026-12-08', '2026-12-15', '2026-12-22', '2026-12-29', '2026-12-31', '2027-01-10'],
    );
    expect(DOC).toContain('S+7, S+14, S+21, S+28, S+30 and S+40');
    expect(DOC).toMatch(/G4[^\n]*can fire up to 7 days late[^\n]*£14/);
    expect(DOC).toMatch(/G4[^\n]*Stop rule B is not affected/);
    // the old three-date fallback is gone
    expect(DOC).not.toMatch(/S\+15, S\+30 and S\+40/);
  });

  test('gate G1 says how the page text is compared', () => {
    expect(DOC).toMatch(/G1[^\n]*converting line endings[^\n]*trimming whitespace/);
  });

  test('rule B: 1 in 5, at least 10 accounts, read from the_one_measure', () => {
    expect(def.stopRules.activation.minAccountsJudged).toBe(10);
    expect(def.stopRules.activation.minShareThreeWorkoutsIn14Days).toBe(0.2);
    expect(def.stopRules.activation.figure).toMatch(/the_one_measure/);
    expect(DOC).toContain('`three_workouts_in_14_days` × 5 is less than `judged_14_days`');
  });

  test('every Apple column named in the document is one Apple defines', () => {
    for (const col of ['Impressions', 'Taps', 'Spend', 'Average CPT', 'Average CPA (Tap-Through)', 'Installs (Tap-Through)', 'New Downloads (Tap-Through)', 'Redownloads (Tap-Through)']) {
      expect(DOC).toContain(col);
    }
  });

  test('the final read comes after Apple finishes processing charges (up to 10 days)', () => {
    const s = sheet.entrySheet('2026-12-01', def);
    expect(s.provisionalReadDate).toBe('2026-12-31');
    expect(s.finalReadDate).toBe('2027-01-10');
    expect(def.finalReads.finalAfterDay - def.finalReads.provisionalAfterDay).toBeGreaterThanOrEqual(10);
  });
});

describe('the document and campaign.json agree, and the rules of the house hold', () => {
  test('the pasted keyword block is the 21 keywords in brackets and the negative block is the negatives', () => {
    const blocks = fencedBlocks(DOC);
    expect(blocks).toContain(def.keywords.map((k) => `[${k}]`).join('\n'));
    expect(blocks).toContain(def.negativeKeywords.join('\n'));
  });

  test('the helper prints the same blocks', () => {
    const out = sheet.render('2026-12-01', def);
    expect(out).toContain(def.keywords.map((k) => `[${k}]`).join('\n'));
    expect(out).toContain('End:                  2026-12-30 23:59');
    expect(out).toContain('Ceiling Apple allows: 30 x GBP 2.00 = GBP 60.00');
  });

  test('the counts the document states are the counts in the file', () => {
    expect(DOC).toContain(`The ${def.keywords.length} in section 3`);
    expect(DOC).toContain(`The ${def.negativeKeywords.length} in section 3`);
    expect(DOC).toContain(`**Negative keywords (${def.negativeKeywords.length},`);
    expect(DOC).toContain(`**Keywords (${def.keywords.length},`);
  });

  test('the sections the acceptance criteria need are present', () => {
    for (const h of ['## 1. The gates', '## 2. The campaign: every value', '## 4. How the £60 is kept inside Apple', '## 6. What is read, when, and by whom', '### Stop rules', '### One-time setup (founder)']) {
      expect(DOC).toContain(h);
    }
    expect(DOC).toContain('Nothing here has been done.');
  });

  test('house style: no em dash, no Pro/trial/price promise, no streak, no AI claim', () => {
    expect(DOC).not.toMatch(/—/);
    expect(JSON.stringify(def)).not.toMatch(/—/);
    expect(DOC).not.toMatch(/free forever|best app|#1 app|guarantee|learns from your training|AI-powered/i);
    // "streak" appears only in the one sentence that denies such a claim (section 8).
    const streakLines = DOC.split('\n').filter((l) => /streak/i.test(l));
    expect(streakLines).toHaveLength(1);
    expect(streakLines[0]).toMatch(/adds no price promise, streak,/);
  });
});
