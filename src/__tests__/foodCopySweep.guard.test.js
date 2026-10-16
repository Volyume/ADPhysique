/**
 * The food copy sweep and the logged-cause rule (D230 R15 and R18, food
 * level-up 2026-10-16, lane 2C). Source-level, over the ten files the lane
 * owns, parsed with @babel/parser as shareWords.guard.test.js is, so the scan
 * reads exactly what a person can read (string literals, template text and JSX
 * text) and never a comment or a logError tag, and an apostrophe in JSX text
 * can never derail it.
 *
 * It pins five things, each a founder rule that a later edit could undo.
 *
 *  1. RETIRED WORDING IS GONE. The clipped errors ("Couldn't log."), the colour
 *     name in the unsure-figures note, the shouted section titles, the three
 *     spellings of one source, the "we" that did not belong, two buttons that
 *     shared a label, the sodium label. Each retired string must be absent from
 *     everything a person reads in these files.
 *  2. THE NEW SENTENCES ARE PRESENT, and every error is the same two-part
 *     shape: "<What happened>. <What to do>." in calm British English, with no
 *     "we".
 *  3. NO SHOUTING IN SECTION LABELS. SectionLabel capitalises itself, so a
 *     literal-capitals child is redundant, and QuickAddSheet's hand-rolled
 *     uppercase label is gone for the house SectionLabel.
 *  4. SHEET TITLES ARE HEADINGS (R16): every sheet title Text carries
 *     accessibilityRole="header".
 *  5. NO CAUSE IS DROPPED (R18). Every catch handler that does anything (a
 *     toast, a fallback value, a state reset) logs its cause with logError in
 *     the same handler; the count of logError calls in a file is never below
 *     its count of such handlers. A handler that does nothing is allowed only
 *     when a comment says why it may (telemetry that never blocks, a share
 *     sheet the person dismissed). A `.catch(() => <fallback value>)` is
 *     allowed only for a plain empty fallback ([], null, {}, a literal).
 *
 * The scanner is exercised on snippets below, so a change to it cannot quietly
 * make the guard pass over nothing.
 */
import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';

const ROOT = path.resolve(__dirname, '..', '..');
const FILES = [
  'src/components/food/SourceChip.js',
  'src/components/food/QuickAddSheet.js',
  'src/screens/AddCustomFoodScreen.js',
  'src/screens/ScanLabelScreen.js',
  'src/screens/ScanBarcodeScreen.js',
  'src/screens/MyMealsScreen.js',
  'src/screens/MyRecipesScreen.js',
  'src/screens/RecipeBuilderScreen.js',
  'src/screens/MealPlanScreen.js',
  'src/screens/SettingsDisplayScreen.js',
  // D230 lane 3B: the saved meal's two sheets and the recipe peek.
  'src/components/food/SavedMealDetailSheet.js',
  'src/components/food/SavedMealEditSheet.js',
  'src/components/food/RecipeDetailSheet.js',
  // D230 review sweep (#6): the files the first sweep did not cover.
  'src/screens/DiaryScreen.js',
  'src/screens/FoodInsightsScreen.js',
  'src/components/food/WeeklyMicronutrientsCard.js',
  'src/components/food/FoodRow.js',
  'src/components/food/EntryRow.js',
  'src/components/food/MealSection.js',
  'src/components/food/FoodLineReviewSheet.js',
  'src/components/food/SavedMealItemRow.js',
];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const astOf = (source) => parse(source, { sourceType: 'module', plugins: ['jsx'] });

function walk(node, visit, parent = null) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((n) => walk(n, visit, parent)); return; }
  if (node.type) visit(node, parent);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments' || key === 'innerComments') continue;
    walk(node[key], visit, node.type ? node : parent);
  }
}

const isLogCall = (n) => n.type === 'CallExpression'
  && n.callee.type === 'Identifier'
  && ['logError', 'logWarn', 'logInfo'].includes(n.callee.name);

// Everything a person can read: string literals, template text and JSX text.
// Left out: comments (never in the AST), import and require paths, the tags
// and messages handed to logError / logWarn / logInfo and to new Error (logs,
// never shown).
function readable(source) {
  const out = [];
  const skip = (n) => n.type === 'ImportDeclaration'
    || isLogCall(n)
    || (n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 'require')
    || (n.type === 'NewExpression' && n.callee.type === 'Identifier' && n.callee.name === 'Error');
  const go = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(go); return; }
    if (node.type && skip(node)) return;
    if (node.type === 'StringLiteral') out.push(node.value);
    if (node.type === 'JSXText') out.push(node.value);
    if (node.type === 'TemplateLiteral') {
      // The sentence as written, with each substitution marked ${..}.
      out.push(node.quasis.map((q) => q.value.cooked ?? '').join('${..}'));
      // Also each fragment alone, so a fragment can be searched for.
      node.quasis.forEach((q) => out.push(q.value.cooked ?? ''));
      node.expressions.forEach(go);
      return;
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments' || key === 'innerComments') continue;
      go(node[key]);
    }
  };
  go(astOf(source).program);
  return out.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

const WORDS = Object.fromEntries(FILES.map((f) => [f, readable(read(f))]));
const allWords = FILES.flatMap((f) => WORDS[f]);
const has = (file, text) => WORDS[file].some((s) => s === text || s.includes(text));

// ─── 1. Retired wording ──────────────────────────────────────────────────
// [pattern, why it went]
const RETIRED = [
  [/Couldn['’]t/, 'clipped, cause-less errors ("Couldn\'t log."); now "<What happened>. <What to do>."'],
  [/Snap label|Snapped|Snap the front/, 'the label scan is "Scan the label"; the source is "From a label"'],
  [/Amber figures/, 'named a colour; now a dot the note describes'],
  [/PER 100G|QUANTITY EATEN/, 'SectionLabel capitalises itself; the literals are sentence case'],
  [/^SERVING$/, 'SectionLabel capitalises itself; the literal is sentence case'],
  [/We will not suggest/, 'now "<food> will not be suggested again."'],
  [/^Add meal$/, 'shared a label with the Diary\'s "Add another meal"; now "Add this meal"'],
  [/^Scan$/, 'both barcode headers are "Scan barcode"'],
  [/^Sodium$|Show milligrams of sodium/, 'UK packs print salt; the switch reads "Show salt"'],
  [/Not certain, check this value/, 'a comma splice; now "Hard to read. Check this value."'],
  [/We match each ingredient/, 'no "we" for an app action'],
  [/^(?:OFF|OCR|Custom|CURATE|RECIPE)$/, 'one source vocabulary; no raw key or code on a chip'],
];

describe('retired wording is gone from everything a person reads', () => {
  test.each(RETIRED)('%s (%s)', (pattern) => {
    const hits = FILES.flatMap((f) => WORDS[f].filter((s) => pattern.test(s)).map((s) => `${f}: ${s}`));
    expect(hits).toEqual([]);
  });

  test('SourceChip no longer builds a label from the raw key', () => {
    let upper = 0;
    walk(astOf(read('src/components/food/SourceChip.js')), (n) => {
      if (n.type === 'MemberExpression' && n.property && n.property.name === 'toUpperCase') upper += 1;
    });
    expect(upper).toBe(0);
  });

  test('the scan actually read each file\'s words', () => {
    for (const f of FILES) expect(WORDS[f].length).toBeGreaterThan(3);
  });
});

// ─── 2. The new sentences ────────────────────────────────────────────────
const ERROR_SENTENCES = {
  'src/components/food/QuickAddSheet.js': ['That quick add was not saved. Try again in a moment.'],
  'src/screens/AddCustomFoodScreen.js': [
    'That food was not saved. Try again in a moment.',
    'That food did not load. Try again in a moment.',
    'The figures marked with a dot were hard to read. Check them before you save.',
  ],
  'src/screens/ScanBarcodeScreen.js': ['The food library could not be reached. Try again in a moment.'],
  'src/screens/MyMealsScreen.js': [
    'That meal was not added. Try again in a moment.',
    'That meal was not deleted. Try again in a moment.',
    'That meal was not renamed. Try again in a moment.',
    'That meal was not removed. You can remove its foods from the diary.',
    'That meal was not saved. Try again in a moment.',
  ],
  'src/screens/MyRecipesScreen.js': [
    'That recipe was not logged. Try again in a moment.',
    'That recipe was not deleted. Try again in a moment.',
    'That recipe was not removed. You can remove it from the diary.',
  ],
  'src/screens/RecipeBuilderScreen.js': [
    'That recipe was not saved. Try again in a moment.',
    'A recipe could not be read from that link. Check the link and try again.',
  ],
  'src/screens/MealPlanScreen.js': [
    'Your meals were not created. Try again in a moment.',
    'The plan was not refreshed. Try again in a moment.',
    'That day was not added to your diary. Try again in a moment.',
    'The week was not added to your diary. Try again in a moment.',
    'That day was not repeated. Try again in a moment.',
    'That meal was not swapped. Try again in a moment.',
    'That food was not swapped. Try again in a moment.',
    'That food was not left out of your plans. Try again in a moment.',
    'That raw or cooked choice was not saved. Try again in a moment.',
    'Your preferences were not saved. Try again in a moment.',
    'That change was not saved. Try again in a moment.',
  ],
};

const OTHER_SENTENCES = {
  'src/components/food/SourceChip.js': ['Food Facts', 'CoFID', 'USDA', 'From a label', 'Yours', 'Volyume', 'Recipe'],
  'src/screens/AddCustomFoodScreen.js': ['Per 100 g', 'Quantity eaten', 'Serving', 'Save the food', 'Hard to read. Check this value.', 'hard to read', 'Food saved. You can add it to your diary any time.'],
  'src/screens/ScanLabelScreen.js': ['Scan the label', 'The full food library could not be checked'],
  'src/screens/ScanBarcodeScreen.js': ['Scan barcode'],
  // RE-POINTED (D230 lane 3B, R12): "Add this meal" was the old confirmation
  // sheet's button. The saved meal's sheet now lists the foods and its button
  // reads "Add to <meal>" (the sheet's own file below); the screen keeps the
  // load sentence, the add toast and the new save toast.
  'src/screens/MyMealsScreen.js': ['Your saved meals did not load', ' added to ${..}.', ' saved.'],
  'src/components/food/SavedMealDetailSheet.js': ['Add to ${..}', 'Edit this meal'],
  'src/components/food/SavedMealEditSheet.js': ['Edit this meal', 'Add a food', 'Save'],
  'src/components/food/RecipeDetailSheet.js': ['The ingredient list did not load. The totals above are still correct.'],
  'src/screens/MyRecipesScreen.js': ['Your recipes did not load', ' added to ${..}.', 'Add to ${..}', 'Servings', 'Grams'],
  'src/screens/RecipeBuilderScreen.js': ['This recipe did not load', 'Each ingredient is matched to a food with a rough amount.'],
  'src/screens/MealPlanScreen.js': ['The meal builder did not load', ' will not be suggested again.'],
  'src/screens/SettingsDisplayScreen.js': ['Show salt', 'Shown as salt, the way UK packs label it.'],
};

describe('the new sentences are present, whole', () => {
  const cases = [
    ...Object.entries(ERROR_SENTENCES).flatMap(([f, list]) => list.map((s) => [f, s])),
    ...Object.entries(OTHER_SENTENCES).flatMap(([f, list]) => list.map((s) => [f, s])),
  ];
  test.each(cases)('%s says "%s"', (file, sentence) => {
    expect(has(file, sentence)).toBe(true);
  });

  // ModalHeader titles by file, read from the AST.
  function headerTitles(file) {
    const titles = [];
    walk(astOf(read(file)), (n) => {
      if (n.type !== 'JSXOpeningElement' || n.name.name !== 'ModalHeader') return;
      const attr = n.attributes.find((a) => a.name && a.name.name === 'title');
      if (attr && attr.value && attr.value.type === 'StringLiteral') titles.push(attr.value.value);
    });
    return titles;
  }

  test('the barcode screen has one title, "Scan barcode", on all three states', () => {
    expect(headerTitles('src/screens/ScanBarcodeScreen.js')).toEqual(['Scan barcode', 'Scan barcode', 'Scan barcode']);
  });

  test('the label screen has one title, "Scan the label", on all three states', () => {
    expect(headerTitles('src/screens/ScanLabelScreen.js')).toEqual(['Scan the label', 'Scan the label', 'Scan the label']);
  });
});

describe('every error is "<What happened>. <What to do>." in plain British English', () => {
  const all = Object.values(ERROR_SENTENCES).flat();

  test.each(all)('%s', (sentence) => {
    // Two sentences, each capitalised and full-stopped.
    expect(sentence).toMatch(/^[A-Z][^.]*\. [A-Z][^.]*\.$/);
    expect(sentence).not.toMatch(/\bwe\b/i);
    expect(sentence).not.toMatch(/—/);
    expect(sentence).not.toMatch(/n['’]t\b/); // no contraction in an error
    expect(sentence).not.toMatch(/ - |;/);
  });

  test('no readable string in these files says "we" for an app action, bar the swap sheet\'s own lines', () => {
    // MealPlan's swap sheet keeps "We will use ... from now on", "We will use it
    // instead of ..." and "what we suggest in future": outside this lane's
    // brief and listed in its report for the lead. Nothing else may say "we".
    const SWAP_SHEET = /^(?:We will use\b|(?:Just this meal\. )?Nothing changes about what we suggest in future\.)/;
    const weLines = allWords.filter((s) => /\bwe\b/i.test(s) && !SWAP_SHEET.test(s));
    expect(weLines).toEqual([]);
  });
});

// ─── 3 and 4. Section labels and sheet titles ────────────────────────────
describe('section labels are sentence case; sheet titles are headings', () => {
  test('no SectionLabel child is a literal in capitals', () => {
    const shouted = [];
    for (const f of FILES) {
      walk(astOf(read(f)), (n) => {
        if (n.type !== 'JSXElement' || n.openingElement.name.name !== 'SectionLabel') return;
        for (const c of n.children) {
          const texts = [];
          if (c.type === 'JSXText') texts.push(c.value);
          if (c.type === 'JSXExpressionContainer') {
            walk(c.expression, (m) => { if (m.type === 'StringLiteral') texts.push(m.value); });
          }
          for (const t of texts.map((x) => x.trim()).filter(Boolean)) {
            if (/[A-Z]/.test(t) && t === t.toUpperCase() && t.length > 2) shouted.push(`${f}: ${t}`);
          }
        }
      });
    }
    expect(shouted).toEqual([]);
  });

  test('QuickAddSheet uses the house SectionLabel, with no hand-rolled uppercase label', () => {
    const src = read('src/components/food/QuickAddSheet.js');
    expect(src).toMatch(/import SectionLabel from '\.\.\/SectionLabel';/);
    expect(src).not.toMatch(/textTransform:\s*['"]uppercase['"]/);
    expect((src.match(/<SectionLabel\b/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  // The sheet-title style names in these files.
  const TITLE_STYLES = {
    'src/components/food/QuickAddSheet.js': ['styles.title'],
    'src/screens/MyMealsScreen.js': ['styles.sheetTitle'],
    'src/screens/MyRecipesScreen.js': ['styles.sheetTitle'],
    'src/components/food/SavedMealDetailSheet.js': ['styles.title'],
    'src/components/food/SavedMealEditSheet.js': ['styles.title'],
    'src/components/food/RecipeDetailSheet.js': ['styles.title'],
    'src/screens/ScanBarcodeScreen.js': ['styles.manualTitle'],
    'src/screens/ScanLabelScreen.js': ['styles.choiceTitle'],
    'src/screens/MealPlanScreen.js': ['styles.swapSheetTitle'],
  };

  test.each(Object.entries(TITLE_STYLES))('%s: every sheet title Text carries the header role', (file, names) => {
    const source = read(file);
    const missing = [];
    let found = 0;
    walk(astOf(source), (n) => {
      if (n.type !== 'JSXOpeningElement' || n.name.name !== 'Text') return;
      const text = source.slice(n.start, n.end);
      if (!names.some((s) => text.includes(s))) return;
      found += 1;
      if (!/accessibilityRole="header"/.test(text)) missing.push(text.slice(0, 80));
    });
    expect(found).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });
});

// ─── 5. No cause is dropped ──────────────────────────────────────────────
function catchHandlers(source) {
  const ast = astOf(source);
  const handlers = [];
  walk(ast, (n) => {
    if (n.type === 'CatchClause') {
      handlers.push({ kind: 'try/catch', node: n.body, fn: null, outer: n });
    } else if (
      n.type === 'CallExpression'
      && n.callee.type === 'MemberExpression'
      && n.callee.property
      && n.callee.property.name === 'catch'
      && n.arguments.length === 1
      && /^(?:ArrowFunctionExpression|FunctionExpression)$/.test(n.arguments[0].type)
    ) {
      const fn = n.arguments[0];
      handlers.push({ kind: '.catch', node: fn.body, fn, outer: n });
    }
  });
  return { ast, handlers };
}

const containsLog = (node) => {
  let found = false;
  walk(node, (m) => { if (isLogCall(m) && m.callee.name === 'logError') found = true; });
  return found;
};

const FALLBACK = (b) => (
  (b.type === 'ArrayExpression' && b.elements.length === 0)
  || (b.type === 'ObjectExpression' && b.properties.length === 0)
  || b.type === 'NullLiteral' || b.type === 'BooleanLiteral' || b.type === 'NumericLiteral'
  || b.type === 'StringLiteral' || (b.type === 'Identifier' && b.name === 'undefined')
);

function judge(source) {
  const { handlers } = catchHandlers(source);
  const acting = [];     // handlers that do something: must log
  const silent = [];     // handlers that do nothing: must carry a comment
  const badFallback = []; // expression-bodied handlers that are not a plain fallback
  for (const h of handlers) {
    if (h.node.type !== 'BlockStatement') {
      if (!FALLBACK(h.node)) badFallback.push(source.slice(h.outer.start, h.outer.end).slice(0, 80));
      continue;
    }
    if (h.node.body.length === 0) {
      const inside = source.slice(h.node.start, h.node.end);
      const lineEnd = source.indexOf('\n', h.outer.end);
      const after = source.slice(h.outer.end, lineEnd === -1 ? undefined : lineEnd);
      if (!/\/\*|\/\//.test(inside) && !/\/\//.test(after)) {
        silent.push(source.slice(h.outer.start, h.outer.end).slice(0, 80));
      }
      continue;
    }
    acting.push({ text: source.slice(h.outer.start, h.outer.end).slice(0, 80), logs: containsLog(h.node) });
  }
  let logCalls = 0;
  walk(astOf(source), (n) => { if (isLogCall(n) && n.callee.name === 'logError') logCalls += 1; });
  return { handlers: handlers.length, acting, silent, badFallback, logCalls };
}

describe('the scanner itself (so the guard cannot pass over nothing)', () => {
  test('it finds acting, silent and fallback handlers and counts logError calls', () => {
    const r = judge(`
      async function f() {
        try { await a(); } catch (e) { logError('x.a', e); toast('no'); }
        try { await b(); } catch (e) { toast('no'); }
        try { await c(); } catch (_) { /* telemetry only */ }
        try { await d(); } catch (_) {}
        e().catch(() => {}); // telemetry only
        g().catch(() => {});
        h().catch(() => []);
        i().catch(() => toast('no'));
        j().catch((e) => { logError('x.j', e); });
      }
    `);
    expect(r.handlers).toBe(9);
    expect(r.acting.map((a) => a.logs)).toEqual([true, false, true]);
    expect(r.silent).toHaveLength(2); // the bare try/catch and the bare .catch, no comment
    expect(r.badFallback).toHaveLength(1); // the toast in an expression body
    expect(r.logCalls).toBe(2);
  });
});

describe('every handler that acts logs its cause (R18)', () => {
  test.each(FILES)('%s', (file) => {
    const r = judge(read(file));
    // Per handler: any handler with a body logs, any silent handler says why,
    // any expression-bodied handler is a plain empty fallback.
    expect(r.acting.filter((a) => !a.logs).map((a) => a.text)).toEqual([]);
    expect(r.silent).toEqual([]);
    expect(r.badFallback).toEqual([]);
    // Per file: logError is called at least once per acting handler.
    expect(r.logCalls).toBeGreaterThanOrEqual(r.acting.length);
  });

  test('the files the lane found bare now log: AddCustomFood (was 0), ScanLabel (was 0), MealPlan (was 1)', () => {
    expect(judge(read('src/screens/AddCustomFoodScreen.js')).logCalls).toBeGreaterThanOrEqual(6);
    expect(judge(read('src/screens/ScanLabelScreen.js')).logCalls).toBeGreaterThanOrEqual(5);
    expect(judge(read('src/screens/MealPlanScreen.js')).logCalls).toBeGreaterThanOrEqual(20);
  });

  test('the ScanLabel capture failure, which used to route on silently, logs its cause and step', () => {
    const src = read('src/screens/ScanLabelScreen.js');
    expect(src).toMatch(/logError\('ScanLabel\.capture', e, \{ step,/);
  });

  test('no log context carries a food name or an amount', () => {
    // Context objects handed to logError name ids, counts, slots and flags only.
    const offenders = [];
    for (const file of FILES) {
      const source = read(file);
      walk(astOf(source), (n) => {
        if (!(isLogCall(n) && n.callee.name === 'logError') || n.arguments.length < 3) return;
        const text = source.slice(n.arguments[2].start, n.arguments[2].end);
        if (/\b(?:name|foodName|brand|kcal|protein|carbs|fat|quantity|grams|amount|servings)\b\s*[:,}]/.test(text)) {
          offenders.push(`${file}: ${text}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
