#!/usr/bin/env node
/*
 * Entry sheet for the one approved Apple search advert campaign (LOC-664).
 *
 * Why it exists: the 60 pound ceiling is "daily budget x days in the campaign"
 * (Apple Ads help, bids-and-budget/0016). A start date plus 30 is 31 calendar days
 * and would allow 62 pounds, so the end date is the one value a person is likely to
 * get wrong. This prints every value for a given start date, with the end date worked
 * out from docs/growth-ads-2026-11/campaign.json, and refuses if the arithmetic does
 * not hold.
 *
 * It reads one local file and prints text. No network, no credential, no account.
 *   node scripts/growth/appleAdsEntrySheet.cjs 2026-12-01
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DEFINITION = path.join(__dirname, '..', '..', 'docs', 'growth-ads-2026-11', 'campaign.json');

function loadDefinition(file = DEFINITION) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Parse YYYY-MM-DD as a calendar date (no time zone); throws on anything else. */
function parseYmd(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd));
  if (!m) throw new Error(`start date must be YYYY-MM-DD, got ${JSON.stringify(ymd)}`);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) {
    throw new Error(`not a real calendar date: ${ymd}`);
  }
  return d;
}

function formatYmd(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(d, n) {
  return new Date(d.getTime() + n * 86400000);
}

/** Whole calendar days from start to end, both days counted. */
function campaignDays(startYmd, endYmd) {
  return Math.round((parseYmd(endYmd) - parseYmd(startYmd)) / 86400000) + 1;
}

function entrySheet(startYmd, def = loadDefinition()) {
  const start = parseYmd(startYmd);
  const end = formatYmd(addDays(start, def.endDateIsStartPlusDays));
  const days = campaignDays(startYmd, end);
  const ceiling = days * def.dailyBudgetGbp;
  if (days !== def.durationDays) throw new Error(`campaign would run ${days} days, not ${def.durationDays}`);
  if (ceiling !== def.totalCeilingGbp) throw new Error(`ceiling would be ${ceiling}, not ${def.totalCeilingGbp}`);
  if (def.startingMaxCptGbp > def.dailyBudgetGbp || def.raisedMaxCptGbp > def.dailyBudgetGbp) {
    throw new Error('a single tap could cost more than the daily budget');
  }
  return {
    startDate: formatYmd(start),
    startTime: def.startTime,
    endDate: end,
    endTime: def.endTime,
    days,
    dailyBudgetGbp: def.dailyBudgetGbp,
    ceilingGbp: ceiling,
    halfwaySpendGbp: def.stopRules.halfway.triggerSpendGbp,
    dayEightRaiseCheckDate: formatYmd(addDays(start, def.dayEightRaiseCheckAfterStart)),
    handExportDates: def.handExportDaysAfterStart.map((n) => formatYmd(addDays(start, n))),
    provisionalReadDate: formatYmd(addDays(start, def.durationDays)),
    finalReadDate: formatYmd(addDays(start, def.durationDays + 10)),
    keywordBlock: def.keywords.map((k) => `[${k}]`).join('\n'),
    negativeBlock: def.negativeKeywords.join('\n'),
  };
}

function render(startYmd, def = loadDefinition()) {
  const s = entrySheet(startYmd, def);
  return [
    `Campaign name:        ${def.campaignName}`,
    `Ad group name:        ${def.adGroupName}`,
    `Country:              United Kingdom only`,
    `Start:                ${s.startDate} ${s.startTime} (account time zone)`,
    `End:                  ${s.endDate} ${s.endTime} (account time zone)  => ${s.days} days`,
    `Daily budget:         GBP ${s.dailyBudgetGbp.toFixed(2)}`,
    `Ceiling Apple allows: ${s.days} x GBP ${s.dailyBudgetGbp.toFixed(2)} = GBP ${s.ceilingGbp.toFixed(2)}`,
    `Default max CPT bid:  GBP ${def.startingMaxCptGbp.toFixed(2)}`,
    `Search Match:         OFF`,
    `Halfway check:        the first daily read with Spend of GBP ${s.halfwaySpendGbp.toFixed(2)} or more (halfway is spend, not a date)`,
    `Day-8 bid check:      morning of ${s.dayEightRaiseCheckDate}`,
    `Hand exports (only without the API credential): ${s.handExportDates.join(', ')}`,
    `Provisional read:     ${s.provisionalReadDate}`,
    `Final read:           ${s.finalReadDate}`,
    '',
    'Keywords (paste, one per line; the brackets make each one exact match and cannot be changed later):',
    s.keywordBlock,
    '',
    'Negative keywords (campaign level, one per line):',
    s.negativeBlock,
    '',
  ].join('\n');
}

module.exports = { loadDefinition, parseYmd, formatYmd, addDays, campaignDays, entrySheet, render, DEFINITION };

if (require.main === module) {
  const arg = process.argv[2];
  if (!arg) {
    process.stderr.write('usage: node scripts/growth/appleAdsEntrySheet.cjs YYYY-MM-DD\n');
    process.exit(2);
  }
  try {
    process.stdout.write(render(arg));
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  }
}
