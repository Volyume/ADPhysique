/**
 * importHistory.js, the pure half of "Import food history" (D230 R21, lane 4C).
 *
 * What this suite pins, and why each pin is written to fail:
 *  - THE FILES AS THE VENDORS WRITE THEM. Fixtures in fixtures/importHistory
 *    are built from the column lists cited in importHistory.js's header: the
 *    Cronometer servings header verbatim from gocronometer's parser of the raw
 *    export, the MyFitnessPal nutrition header as believed (unverified, so
 *    found by name). Each messy case a real file holds has a pin: a BOM, CRLF,
 *    quoted commas, doubled quotes and line breaks, a semicolon file with
 *    decimal commas, a quoted decimal comma, units after figures, columns in
 *    another order, unknown columns, blank rows, a totals row, UK and US slash
 *    dates (and an unsettled file reported, never guessed), AM/PM times, and
 *    thousands of rows.
 *  - R21's SHAPES. MyFitnessPal: one entry per meal row, a quick entry with
 *    the note "Breakfast, from MyFitnessPal". Cronometer: entries by food with
 *    their amounts; a custom food per unique name where the amount is in
 *    grams (one per name, whatever the case or spacing, and a name the person
 *    already saved is reused, never made twice); a named serving stays a
 *    quick entry that keeps its name and amount in the note.
 *  - ACTUALS ON THEIR OWN DATES. Never planned; the file's own clock time on
 *    the row's own day; no time in the file is no time (null), never noon or
 *    the moment of import.
 *  - NOTHING OVERWRITTEN. A day that already holds food is left whole; a row
 *    after today is left out and reported.
 *  - THE WORDS. The review reads exactly as R21's example ("Read 412 rows
 *    from 3 March to 14 October. 408 will be added. 4 could not be read."),
 *    the summary after ("408 added. 4 could not be read."), and what could
 *    not be read is listed by row, calmly, with no em dash and no "we".
 */
const fs = require('fs');
const path = require('path');
const {
  readCsv, detectDelimiter, parseNumber, parseDateCell, parseTimeCell, detectFormat,
  parseHistoryCsv, parseMfpNutritionCsv, parseCronometerServingsCsv, planImport,
  summariseImport, summariseResult, problemLines, PROBLEM, IMPORT_QUICK_REF, columnMap,
} = require('../importHistory');
const { FOOD_NOTE_MAX_LENGTH } = require('../entryNote');

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', 'importHistory', name), 'utf8');
const TODAY = '2026-10-16';
const at = (day, h, m) => {
  const [y, mo, d] = day.split('-').map(Number);
  return new Date(y, mo - 1, d, h, m, 0, 0).getTime();
};

describe('readCsv: what a real file holds', () => {
  test('a BOM, CRLF, quoted commas, doubled quotes and a line break inside quotes', () => {
    const rows = readCsv('\uFEFFa,b,c\r\n1,"x, y","say ""hi"""\r\n2,"two\r\nlines",z\r\n3,after,it\r\n');
    expect([...rows[0]]).toEqual(['a', 'b', 'c']);
    expect([...rows[1]]).toEqual(['1', 'x, y', 'say "hi"']);
    expect([...rows[2]]).toEqual(['2', 'two\r\nlines', 'z']);
    expect(rows.map((r) => r.line)).toEqual([1, 2, 3, 5]);
  });

  test('blank lines are dropped and the line numbers still match the file', () => {
    const rows = readCsv('h1,h2\n\n1,2\n\n\n3,4');
    expect(rows.map((r) => r.line)).toEqual([1, 3, 6]);
  });

  test('the separator is read from the header: comma, semicolon or tab', () => {
    expect(detectDelimiter('Date,Meal,Calories')).toBe(',');
    expect(detectDelimiter('Date;Meal;Calories;"a,b"')).toBe(';');
    expect(detectDelimiter('Date\tMeal\tCalories')).toBe('\t');
  });
});

describe('cells', () => {
  test.each([
    ['412', 412], ['12.5', 12.5], ['12,5', 12.5], ['1,050', 1050], ['1,234.5', 1234.5], ['1.234,5', 1234.5],
    ['1 234', 1234], ['250 kcal', 250], ['12 g', 12], ['12g', 12], ['', null], ['-', null], ['lots', NaN],
  ])('parseNumber(%p) is %p', (cell, want) => {
    const got = parseNumber(cell);
    if (Number.isNaN(want)) expect(Number.isNaN(got)).toBe(true);
    else expect(got).toBe(want);
  });

  test('a decimal-comma file reads every comma as the point', () => {
    expect(parseNumber('412,5', { decimalComma: true })).toBe(412.5);
    expect(parseNumber('1.050,5', { decimalComma: true })).toBe(1050.5);
    expect(parseNumber('1,050', { decimalComma: true })).toBe(1.05);
  });

  test.each([
    ['2026-03-03', null, '2026-03-03'],
    ['2026-03-03 00:00:00', null, '2026-03-03'],
    ['3 March 2026', null, '2026-03-03'],
    ['March 3, 2026', null, '2026-03-03'],
    ['Tue, 3 Mar 2026', null, '2026-03-03'],
    ['3-Mar-26', null, '2026-03-03'],
    ['14/03/2026', null, '2026-03-14'],
    ['03/14/2026', null, '2026-03-14'],
    ['05/04/2026', 'dmy', '2026-04-05'],
    ['05/04/2026', 'mdy', '2026-05-04'],
    ['05/04/2026', null, null],
    ['04/04/2026', null, '2026-04-04'],
    ['31/02/2026', null, null],
    ['yesterday', null, null],
  ])('parseDateCell(%p, %p) is %p', (cell, order, want) => {
    expect(parseDateCell(cell, order)).toBe(want);
  });

  test.each([
    ['08:30', 510], ['8:05 AM', 485], ['7:45 PM', 1185], ['12:10 AM', 10], ['12:10 PM', 730],
    ['13:04 PM', 784], ['08:30:15', 510], ['', null], ['25:00', null],
  ])('parseTimeCell(%p) is %p', (cell, want) => {
    expect(parseTimeCell(cell)).toBe(want);
  });

  test('a kcal column is preferred to a kJ one; a kJ-only file is converted', () => {
    expect(columnMap(['Day', 'Energy (kJ)', 'Energy (kcal)']).kcal).toBe(2);
    const onlyKj = columnMap(['Day', 'Energy (kJ)']);
    expect(onlyKj).toEqual(expect.objectContaining({ kcal: 1, kcalIsKj: true }));
    const parsed = parseHistoryCsv('Day,Group,Food Name,Amount,Energy (kJ),Protein (g),Carbs (g),Fat (g)\n2026-03-03,Lunch,Soup,1.00 bowl,1046,10,20,5\n');
    expect(Math.round(parsed.rows[0].kcal)).toBe(250);
  });
});

describe('detectFormat: by column names, never by position', () => {
  test('the two exports, and anything else refused whole', () => {
    expect(detectFormat(fixture('mfp-nutrition-summary.csv'))).toBe('mfp');
    expect(detectFormat(fixture('mfp-uk-dates.csv'))).toBe('mfp');
    expect(detectFormat(fixture('mfp-semicolon-decimal-comma.csv'))).toBe('mfp');
    expect(detectFormat(fixture('cronometer-servings.csv'))).toBe('cronometer');
    expect(detectFormat('Date,Exercise,Minutes,Calories Burned\n2026-03-03,Run,30,300')).toBeNull();
    expect(detectFormat('Workout Name,Exercise Name,Weight')).toBeNull();
    expect(detectFormat('')).toBeNull();
    expect(parseHistoryCsv('{"backup":true}').format).toBeNull();
    expect(parseMfpNutritionCsv(fixture('cronometer-servings.csv')).format).toBeNull();
    expect(parseCronometerServingsCsv(fixture('mfp-us-dates.csv')).format).toBeNull();
  });
});

describe('MyFitnessPal nutrition summary', () => {
  const parsed = parseMfpNutritionCsv(fixture('mfp-nutrition-summary.csv'));

  test('reads every data row; the blank row and the totals row are not data', () => {
    expect(parsed.format).toBe('mfp');
    expect(parsed.rowsRead).toBe(9);
    expect(parsed.rows).toHaveLength(6);
    expect(parsed.rows.map((r) => r.meal)).toEqual(['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Breakfast', 'Snacks']);
  });

  test('each unreadable row is reported with its line in the file and its reason', () => {
    expect(parsed.problems).toEqual([
      { row: 8, reason: PROBLEM.CALORIES },
      { row: 9, reason: PROBLEM.FIGURE },
      { row: 10, reason: PROBLEM.DATE },
    ]);
  });

  test('figures: quoted thousands, decimals, fibre from "Fiber"', () => {
    const [b] = parsed.rows;
    expect(b).toEqual(expect.objectContaining({ date: '2026-03-03', kcal: 412, fatG: 12.5, carbsG: 48.2, proteinG: 24.1, fibreG: 6 }));
    expect(parsed.rows[4]).toEqual(expect.objectContaining({ date: '2026-03-04', kcal: 1050 }));
  });

  test('one quick entry per meal row, an actual on its own date, with R21\'s note', () => {
    const plan = planImport(parsed, { today: TODAY });
    expect(plan.entries).toHaveLength(6);
    expect(plan.entries[0]).toEqual(expect.objectContaining({
      entryDate: '2026-03-03', mealSlot: 'meal_1', foodRef: IMPORT_QUICK_REF, quantityG: 0,
      kcal: 412, proteinG: 24.1, carbsG: 48.2, fatG: 12.5, fibreG: 6,
      isPlanned: false, note: 'Breakfast, from MyFitnessPal', eatenAt: null,
    }));
    expect(plan.entries.map((e) => e.note)).toEqual([
      'Breakfast, from MyFitnessPal', 'Lunch, from MyFitnessPal', 'Dinner, from MyFitnessPal',
      'Snacks, from MyFitnessPal', 'Breakfast, from MyFitnessPal', 'Snacks, from MyFitnessPal',
    ]);
    expect(plan.entries.map((e) => e.mealSlot)).toEqual(['meal_1', 'meal_2', 'meal_3', 'meal_4', 'meal_1', 'meal_4']);
    expect(plan.entries.every((e) => e.isPlanned === false)).toBe(true);
    expect(plan.customFoods).toEqual([]);
  });

  test('meals follow the person\'s own number of meals, never past the last', () => {
    const plan = planImport(parsed, { today: TODAY, mealsPerDay: 2 });
    expect(plan.entries.slice(0, 4).map((e) => e.mealSlot)).toEqual(['meal_1', 'meal_2', 'meal_2', 'meal_2']);
    expect(plan.entries[2].note).toBe('Dinner, from MyFitnessPal');
  });

  test('UK dates, columns in another order, an unknown column', () => {
    const p = parseHistoryCsv(fixture('mfp-uk-dates.csv'));
    expect(p.rows.map((r) => r.date)).toEqual(['2026-03-03', '2026-03-14', '2026-04-05']);
    expect(p.rows[1]).toEqual(expect.objectContaining({ meal: 'Lunch', kcal: 655, proteinG: 41, carbsG: 70, fatG: 22, fibreG: 8 }));
    expect(p.problems).toEqual([]);
  });

  test('US dates', () => {
    const p = parseHistoryCsv(fixture('mfp-us-dates.csv'));
    expect(p.rows.map((r) => r.date)).toEqual(['2026-03-14', '2026-04-06']);
  });

  test('a file whose slash dates never say which way round is reported, never guessed', () => {
    const p = parseHistoryCsv('Date,Meal,Calories\n05/04/2026,Lunch,500\n06/07/2026,Dinner,600\n');
    expect(p.rows).toEqual([]);
    expect(p.problems).toEqual([{ row: 2, reason: PROBLEM.DATE }, { row: 3, reason: PROBLEM.DATE }]);
  });

  test('a semicolon file with decimal commas', () => {
    const p = parseHistoryCsv(fixture('mfp-semicolon-decimal-comma.csv'));
    expect(p.rows[0]).toEqual(expect.objectContaining({ kcal: 412.5, fatG: 12.5, carbsG: 48.2, proteinG: 24.1 }));
    expect(p.rows[1]).toEqual(expect.objectContaining({ kcal: 1050.5, meal: 'Dinner' }));
    expect(planImport(p, { today: TODAY }).entries[0].kcal).toBe(413);
  });

  test('a renamed meal keeps its number; an unknown one sits in the last meal with its own name', () => {
    const p = parseHistoryCsv('Date,Meal,Calories\n2026-03-03,Meal 2,500\n2026-03-03,Pre-gym,300\n2026-03-03,,100\n');
    const plan = planImport(p, { today: TODAY, mealsPerDay: 5 });
    expect(plan.entries.map((e) => [e.mealSlot, e.note])).toEqual([
      ['meal_2', 'Meal 2, from MyFitnessPal'],
      ['meal_4', 'Pre-gym, from MyFitnessPal'],
      ['meal_4', 'From MyFitnessPal'],
    ]);
  });
});

describe('Cronometer servings', () => {
  const parsed = parseCronometerServingsCsv(fixture('cronometer-servings.csv'));
  const OWN = new Map([['Chicken Breast', 'own-chicken']]);
  const plan = planImport(parsed, { today: TODAY, existingFoods: OWN });

  test('reads the rows; no name and an unreadable date are reported by line', () => {
    expect(parsed.rowsRead).toBe(9);
    expect(parsed.problems).toEqual([{ row: 7, reason: PROBLEM.NAME }, { row: 10, reason: PROBLEM.DATE }]);
    expect(parsed.rows[0]).toEqual(expect.objectContaining({
      date: '2026-03-03', time: 485, group: 'Breakfast', name: 'Oats, rolled',
      amountText: '60.00 g', amountValue: 60, amountUnit: 'g', kcal: 227, carbsG: 36, fibreG: 6, fatG: 5, proteinG: 8,
    }));
    // A quoted decimal comma in the amount; an empty nutrient cell is no data.
    expect(parsed.rows.find((r) => r.name === 'Dark chocolate').amountValue).toBe(25);
    expect(parsed.rows.find((r) => r.name === 'Black coffee')).toEqual(expect.objectContaining({ carbsG: 0, fibreG: null }));
  });

  test('one custom food per unique name in grams, whatever its case or spacing; per 100 g', () => {
    expect(plan.customFoods.map((f) => f.name)).toEqual(['Oats, rolled', 'Semi-skimmed milk', 'Dark chocolate']);
    expect(plan.customFoods[0]).toEqual(expect.objectContaining({
      servingG: 60, kcal100g: 378.3, protein100g: 13.3, carbs100g: 60, fat100g: 8.3, fibre100g: 10,
    }));
    const oats = plan.entries.filter((e) => e.customName === 'Oats, rolled');
    expect(oats.map((e) => [e.entryDate, e.quantityG, e.kcal])).toEqual([['2026-03-03', 60, 227], ['2026-03-04', 90, 341]]);
  });

  test('a name already saved as the person\'s own food is reused, never made again', () => {
    expect(plan.customFoods.some((f) => /chicken/i.test(f.name))).toBe(false);
    const chicken = plan.entries.find((e) => e.foodRef === 'custom:own-chicken');
    expect(chicken).toEqual(expect.objectContaining({ entryDate: '2026-03-04', quantityG: 150, kcal: 248, mealSlot: 'meal_3' }));
  });

  test('a named serving is a quick entry carrying its name and amount in the note', () => {
    const egg = plan.entries.find((e) => e.note && e.note.startsWith('Egg'));
    expect(egg).toEqual(expect.objectContaining({
      foodRef: IMPORT_QUICK_REF, quantityG: 0, kcal: 143, note: 'Egg, 2.00 large, from Cronometer', mealSlot: 'meal_2',
    }));
  });

  test('a food whose figures fail the custom-food sanity check stays a quick entry', () => {
    expect(plan.customFoods.some((f) => f.name === 'Black coffee')).toBe(false);
    expect(plan.entries.find((e) => e.note === 'Black coffee, 240.00 g, from Cronometer')).toBeTruthy();
  });

  test('the file\'s own clock time on the row\'s own day; no time is no time', () => {
    const byKcal = (k) => plan.entries.find((e) => e.kcal === k);
    expect(byKcal(227).eatenAt).toBe(at('2026-03-03', 8, 5));
    expect(byKcal(143).eatenAt).toBe(at('2026-03-03', 13, 10));
    expect(byKcal(136).eatenAt).toBe(at('2026-03-05', 19, 45));
    expect(byKcal(341).eatenAt).toBeNull();
    expect(plan.entries.every((e) => e.isPlanned === false)).toBe(true);
  });

  test('"Uncategorized" and "Snacks" sit in the last meal', () => {
    expect(plan.entries.find((e) => e.kcal === 136).mealSlot).toBe('meal_4');
  });

  test('a long name keeps the note within its bound and keeps where it came from', () => {
    const long = 'A'.repeat(100);
    const p = parseHistoryCsv(`Day,Group,Food Name,Amount,Energy (kcal)\n2026-03-03,Lunch,${long},1.00 enormous serving of something,500\n`);
    const [e] = planImport(p, { today: TODAY }).entries;
    expect(e.note.length).toBeLessThanOrEqual(FOOD_NOTE_MAX_LENGTH);
    expect(e.note.endsWith(', from Cronometer')).toBe(true);
  });
});

describe('nothing overwritten, nothing in the future', () => {
  const parsed = parseMfpNutritionCsv(fixture('mfp-nutrition-summary.csv'));

  test('a day that already holds food is left whole and counted', () => {
    const plan = planImport(parsed, { today: TODAY, existingDays: new Set(['2026-03-03']) });
    expect(plan.entries.some((e) => e.entryDate === '2026-03-03')).toBe(false);
    expect(plan.addedRows).toBe(2);
    expect(plan.existingDays).toBe(1);
    expect(plan.existingDayRows).toBe(4);
  });

  test('every day already in the diary: nothing new, and the review says so', () => {
    const plan = planImport(parsed, { today: TODAY, existingDays: ['2026-03-03', '2026-03-04', '2026-10-14'] });
    expect(plan.addedRows).toBe(0);
    expect(summariseImport(plan)).toEqual([
      'Read 9 rows from 3 March to 14 October.',
      'Every day in this file already has food in your diary, so nothing new will be added.',
      '3 could not be read.',
    ]);
  });

  test('a row after today is left out and reported', () => {
    const plan = planImport(parsed, { today: '2026-03-31' });
    expect(plan.entries.some((e) => e.entryDate === '2026-10-14')).toBe(false);
    expect(plan.problems).toContainEqual({ row: 11, reason: PROBLEM.FUTURE });
  });
});

describe('the words', () => {
  const base = {
    rowsRead: 412, from: '2026-03-03', to: '2026-10-14', addedRows: 408,
    problems: [{ row: 5, reason: PROBLEM.DATE }, { row: 9, reason: PROBLEM.DATE }, { row: 40, reason: PROBLEM.CALORIES }, { row: 77, reason: PROBLEM.FIGURE }],
    existingDays: 0, existingDayRows: 0, customFoods: [],
  };

  test('the review reads as R21 has it, before anything is written', () => {
    expect(summariseImport(base).join(' ')).toBe('Read 412 rows from 3 March to 14 October. 408 will be added. 4 could not be read.');
  });

  test('the summary after', () => {
    expect(summariseResult(base, { added: 408 }).join(' ')).toBe('408 added. 4 could not be read.');
    expect(summariseResult({ ...base, problems: [] }, { added: 408, foodsSaved: 3 })).toEqual(['408 added.', '3 foods were saved to your own foods.']);
    // A day that gained food between the review and the write is left alone too, and said.
    expect(summariseResult({ ...base, problems: [], existingDays: 1 }, { added: 5, daysLeft: 1 }))
      .toEqual(['5 added.', '2 days that already had food were left as they were.']);
  });

  test('a range across years names the years; days left alone are said plainly', () => {
    const lines = summariseImport({ ...base, from: '2025-12-30', to: '2026-01-02', existingDays: 2, existingDayRows: 7, customFoods: [{}, {}] });
    expect(lines[0]).toBe('Read 412 rows from 30 December 2025 to 2 January 2026.');
    expect(lines).toContain('7 rows fall on 2 days that already have food in your diary, and those days are left as they are.');
    expect(lines).toContain('2 foods weighed in grams will also be saved to your own foods.');
  });

  test('what could not be read, by row, one line per reason', () => {
    expect(problemLines(base.problems)).toEqual([
      'Rows 5 and 9: the date could not be read.',
      'Row 40: the calories could not be read.',
      'Row 77: a protein, carbohydrate, fat or fibre figure could not be read.',
    ]);
    const many = Array.from({ length: 12 }, (_, i) => ({ row: i + 2, reason: PROBLEM.FUTURE }));
    expect(problemLines(many)).toEqual(['Rows 2, 3, 4, 5, 6, 7, 8, 9 and 4 more: the date is after today.']);
  });

  test('no em dash and no "we" in any word the import shows', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'importHistory.js'), 'utf8');
    const shown = [
      ...summariseImport(base), ...summariseResult(base, { added: 1, foodsSaved: 1 }),
      ...problemLines(Object.values(PROBLEM).map((reason, i) => ({ row: i + 2, reason }))),
    ].join(' ');
    expect(shown).not.toMatch(/\u2014/);
    expect(shown).not.toMatch(/\bwe\b/i);
    expect(src).not.toMatch(/\u2014/);
  });
});

describe('thousands of rows', () => {
  test('a year of a five-meal day (over 1,800 rows) parses and plans quickly and completely', () => {
    const lines = ['Day,Time,Group,Food Name,Amount,Energy (kcal),Carbs (g),Fiber (g),Fat (g),Protein (g)'];
    const start = new Date(2025, 0, 1);
    for (let d = 0; d < 365; d += 1) {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + d);
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      for (let m = 0; m < 5; m += 1) lines.push(`${key},0${7 + m}:00,Breakfast,Food ${m},100.00 g,200,20,2,8,12`);
    }
    const textIn = lines.join('\r\n');
    const t0 = Date.now();
    const p = parseHistoryCsv(textIn);
    const plan = planImport(p, { today: TODAY });
    const ms = Date.now() - t0;
    expect(p.rowsRead).toBe(1825);
    expect(plan.entries).toHaveLength(1825);
    expect(plan.customFoods).toHaveLength(5);
    expect(plan.from).toBe('2025-01-01');
    expect(plan.to).toBe('2025-12-31');
    expect(ms).toBeLessThan(1500);
  });
});

// Food data-layer audit 2026-10-16, item 13: the file is read in slices that
// hand the thread back, and the slicing changes NOTHING in the result. Pinned
// on every fixture, at slice sizes that cut through quoted fields, CRLF pairs
// and doubled quotes, so a reader that lost its place at a boundary fails.
describe('parseHistoryCsvAsync: same result as parseHistoryCsv, read in slices (audit item 13)', () => {
  const {
    parseHistoryCsv: parseSync, parseHistoryCsvAsync, readCsv: readSync, readCsvAsync,
  } = require('../importHistory');
  const names = fs.readdirSync(path.join(__dirname, 'fixtures', 'importHistory')).filter((n) => n.endsWith('.csv'));

  test('there are fixtures to compare', () => {
    expect(names.length).toBeGreaterThanOrEqual(5);
  });

  test.each(names)('%s: equal at slice sizes 1, 7, 64 and the default, yielding between slices', async (name) => {
    const text = fixture(name);
    const expected = parseSync(text);
    for (const yieldEvery of [1, 7, 64, undefined]) {
      let yields = 0;
      // eslint-disable-next-line no-await-in-loop
      const got = await parseHistoryCsvAsync(text, { yieldEvery, yieldFn: async () => { yields += 1; } });
      expect(got).toEqual(expected);
      if (yieldEvery === 7) expect(yields).toBeGreaterThan(text.length / 7 - 2);
    }
  });

  test('awkward CSV (quotes, doubled quotes, CRLF, line breaks in a field) is read the same in slices', async () => {
    const text = '﻿a,b\r\n"x, ""y""",2\r\n"line\nbreak",3\n\n4,5';
    const expected = readSync(text, ',');
    for (const size of [1, 2, 3, 5]) {
      // eslint-disable-next-line no-await-in-loop
      expect(await readCsvAsync(text, ',', { yieldEvery: size })).toEqual(expected);
    }
    expect(expected.map((r) => [...r])).toEqual([['a', 'b'], ['x, "y"', '2'], ['line\nbreak', '3'], ['4', '5']]);
  });
});

// Food data-layer audit 2026-10-16, item 13: a day that holds planned meals is
// left whole and reported as already planned, never filled under the plan.
describe('planImport: a day with planned meals is left whole (audit item 13)', () => {
  const { planImport: plan, summariseImport: review, summariseResult: result } = require('../importHistory');
  const text = fixture('mfp-nutrition-summary.csv');

  test('rows on a planned day are not planned for writing, and the review says so', () => {
    const parsed = require('../importHistory').parseHistoryCsv(text);
    const p = plan(parsed, { plannedDays: new Set(['2026-03-03']), today: TODAY });
    expect(p.entries.some((e) => e.entryDate === '2026-03-03')).toBe(false);
    expect(p.plannedDays).toBe(1);
    expect(p.plannedDayRows).toBe(4);
    expect(review(p).join(' ')).toMatch(/4 rows fall on 1 day that already has meals planned, and that day is left as it is\./);
    expect(result(p, { added: p.entries.length }).join(' ')).toMatch(/1 day that already had meals planned was left as it was\./);
  });

  test('a day with food AND planned meals counts as a day with food', () => {
    const parsed = require('../importHistory').parseHistoryCsv(text);
    const p = plan(parsed, { existingDays: new Set(['2026-03-03']), plannedDays: new Set(['2026-03-03']), today: TODAY });
    expect(p.existingDays).toBe(1);
    expect(p.plannedDays).toBe(0);
  });

  test('with no planned days the plan and its words are unchanged', () => {
    const parsed = require('../importHistory').parseHistoryCsv(text);
    const a = plan(parsed, { today: TODAY });
    expect(a.plannedDays).toBe(0);
    expect(review(a).join(' ')).not.toMatch(/planned/);
  });
});
