/**
 * switchColours.guard.test.js — amber leaves the switch, and the thumb always
 * names the state it is in (D174 A1, stage 3).
 *
 * AUTHORITY. `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`
 * D174 "A1 — Switches (81 sites, 14 files): RULED, amber leaves", whose parent
 * is `docs/design-redesign-2026-09-14/20-DIRECTION-AND-PLAN.md` §3 (the four
 * amber disciplines) and §5 law 6. D174's reading, verbatim: "Discipline 1 is a
 * ceiling ... and discipline 4 is a filter inside it. So 'it is a state' is
 * never on its own an argument for amber: the state also has to be *now*. A
 * stored preference is not now." A switch's on-state is a stored preference.
 *
 * WHAT THIS SUITE PINS, and why each case is written to FAIL.
 *
 *  1. No `trackColor` or `thumbColor` anywhere in product source binds to
 *     `primary`, `primaryFill`, `primaryDim` or `primaryBg`, directly or
 *     through `withAlpha(... primary ...)`. Nine mechanisms carried amber
 *     across this app and the switch pair was two of them; a guard that only
 *     banned the flat token would have missed the 32 half-alpha tracks that
 *     were the commonest form of it.
 *  2. Every `thumbColor` is CONDITIONAL on the switch's own value. Eighteen
 *     source lines (twenty rendered switches) passed `thumbColor={t.colors
 *     .primary}` flat, so the thumb rendered the on-colour while the switch was
 *     OFF. D174: "A colour applied in the absence of the state it names is
 *     discipline 4 broken in the plainest way available." The ban is on the
 *     SHAPE, not on the amber, so re-introducing it in a neutral still fails.
 *  3. `success` is refused as the replacement — "a switch being on is not a
 *     success", and §8 protects the state-colour grammar from that borrowing.
 *     `warning` and `error` go with it for the same reason.
 *  4. A file that renders a `<Switch>` always binds a track. An unbound track
 *     falls back to the PLATFORM default, which on iOS is the system green: a
 *     silent way for a fifth state colour to appear on a settings screen.
 *
 * The colour VALUES themselves are not pinned here. Where the pair lands, and
 * that it clears WCAG 1.4.11's 3:1 graphical bar in all six palettes, is
 * computed and asserted in `src/styles/__tests__/theme.test.js` ("D174 A1:
 * switch track and thumb clear the non-text bar"), which is also where the
 * measured ladder and the one figure D174 asked for that could NOT be asserted
 * are written down. This suite pins the call sites; that one pins the tokens.
 *
 * SCOPE. Product source only: `__tests__` directories and `*.test.js` files are
 * excluded, exactly as `rewardProps.guard.test.js` scopes its own greps,
 * because a guard that pins ABSENCE has to be allowed to name the thing it
 * bans. Comments are stripped first (the `code()` helper), so the prose above
 * each recoloured switch — several of which now explain which prop they lost —
 * is never read as the prop coming back.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..', '..');

/** Strip comments, so a rule NAMED in a docblock is never read as code. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

// Product source only — same posture as rewardProps.guard.test.js.
function listSourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) listSourceFiles(p, out);
    else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) out.push(p);
  }
  return out;
}

const sources = listSourceFiles(SRC).map((p) => ({
  file: path.relative(SRC, p).split(path.sep).join('/'),
  text: code(fs.readFileSync(p, 'utf8')),
}));

/**
 * Every value bound to `prop`, in BOTH forms a switch colour is written in:
 * the JSX attribute (`trackColor={{ ... }}`) and the object property of a
 * shared props bag (`trackColor: { ... },`), which is how two Community
 * surfaces hold theirs. Brace-balanced rather than line-based, because a
 * `trackColor` object is two nested literals and a `thumbColor` ternary can
 * wrap.
 */
function bindings(text, prop) {
  const out = [];
  const re = new RegExp(`\\b${prop}\\s*[=:]\\s*`, 'g');
  let m;
  while ((m = re.exec(text))) {
    let i = m.index + m[0].length;
    const start = i;
    if (text[i] === '{') {
      let depth = 0;
      for (; i < text.length; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') { depth -= 1; if (depth === 0) { i++; break; } }
      }
    } else {
      let depth = 0;
      for (; i < text.length; i++) {
        const c = text[i];
        if (c === '(' || c === '[' || c === '{') depth++;
        else if (c === ')' || c === ']' || c === '}') { if (depth === 0) break; depth -= 1; }
        else if (c === ',' && depth === 0) break;
      }
    }
    out.push(text.slice(start, i));
  }
  return out;
}

/** [{ file, prop, value }] for every switch-colour binding in product source. */
function allBindings() {
  const out = [];
  for (const s of sources) {
    for (const prop of ['trackColor', 'thumbColor']) {
      for (const value of bindings(s.text, prop)) {
        out.push({ file: s.file, prop, value: value.replace(/\s+/g, ' ').trim() });
      }
    }
  }
  return out;
}

/**
 * Every `const <name> = { ... }` object literal that binds a `trackColor` —
 * i.e. a shared props bag spread into one or more `<Switch>`es. Brace-balanced,
 * so the scan stops at the object's own closing brace rather than running on to
 * the next occurrence anywhere below it in the file.
 */
function sharedColourBags(text) {
  const out = [];
  const re = /\bconst\s+\w+\s*=\s*\{/g;
  let m;
  while ((m = re.exec(text))) {
    let i = m.index + m[0].length - 1;
    const start = i;
    let depth = 0;
    for (; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') { depth -= 1; if (depth === 0) { i++; break; } }
    }
    const body = text.slice(start, i);
    if (/\btrackColor\b/.test(body)) out.push(body);
  }
  return out;
}

const BINDINGS = allBindings();
const SWITCH_FILES = sources.filter((s) => s.text.includes('<Switch')).map((s) => s.file).sort();

describe('D174 A1: the switch pair carries no amber and no state colour', () => {
  test('there are switches to guard (the greps have not gone silently empty)', () => {
    // A source-pinning guard whose corpus vanishes passes vacuously forever.
    expect(SWITCH_FILES.length).toBeGreaterThan(0);
    expect(BINDINGS.length).toBeGreaterThan(0);
  });

  test('no trackColor or thumbColor binds to any amber token', () => {
    // Covers the flat token, the deepened fill, the dim ink, the wash, and the
    // `withAlpha(t.colors.primary, alpha.half)` form that 32 of these used.
    const AMBER = /\b(primary|primaryFill|primaryDim|primaryBg)\b/;
    const offences = BINDINGS
      .filter((b) => AMBER.test(b.value))
      .map((b) => `${b.file} ${b.prop}=${b.value}`)
      .sort();
    expect(offences).toEqual([]);
  });

  test('no trackColor or thumbColor borrows a state colour', () => {
    // D174 refused `success` by name; `warning` and `error` are the same
    // borrowing. `textPrimary`/`textMuted`/`textSecondary` are neutrals and are
    // deliberately NOT matched here.
    const STATE = /\b(success|successBg|warning|warningBg|error|errorBg|errorFill)\b/;
    const offences = BINDINGS
      .filter((b) => STATE.test(b.value))
      .map((b) => `${b.file} ${b.prop}=${b.value}`)
      .sort();
    expect(offences).toEqual([]);
  });

  test('no raw hex or rgb() is passed to a switch', () => {
    // Every colour comes from a theme token, so the six palettes reach the
    // switch the way they reach everything else.
    const offences = BINDINGS
      .filter((b) => /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(/.test(b.value))
      .map((b) => `${b.file} ${b.prop}=${b.value}`)
      .sort();
    expect(offences).toEqual([]);
  });
});

describe('D174 A1: no thumbColor is passed unconditionally', () => {
  test('every thumbColor is a ternary on the switch own value', () => {
    // The bug D174 called "discipline 4 broken in the plainest way available":
    // a flat `thumbColor` paints the thumb its on-colour while the switch is
    // OFF. Shape, not colour — a flat NEUTRAL thumb fails this too, because the
    // off state then has no ink of its own.
    const offences = BINDINGS
      .filter((b) => b.prop === 'thumbColor' && !b.value.includes('?'))
      .map((b) => `${b.file} thumbColor=${b.value}`)
      .sort();
    expect(offences).toEqual([]);
  });

  test('no shared props bag holds a thumbColor for several switches to share', () => {
    // Two Community surfaces spread a `switchColours` object into three
    // switches between them. A `thumbColor` inside such a bag cannot read any
    // one switch's value, which is how the flat thumb got there in the first
    // place; the bag keeps `trackColor`, and each site passes its own thumb.
    const offences = sources
      .filter((s) => sharedColourBags(s.text).some((bag) => /\bthumbColor\b/.test(bag)))
      .map((s) => s.file)
      .sort();
    expect(offences).toEqual([]);
  });
});

describe('D174 A1: a switch never falls back to the platform track', () => {
  test('every file rendering a Switch binds a trackColor', () => {
    // Unbound, iOS draws its system green — a fifth state colour arriving on a
    // settings screen without anyone choosing it.
    const offences = SWITCH_FILES.filter(
      (f) => !BINDINGS.some((b) => b.file === f && b.prop === 'trackColor'),
    );
    expect(offences).toEqual([]);
  });

  test('every file rendering a Switch binds a thumbColor', () => {
    const offences = SWITCH_FILES.filter(
      (f) => !BINDINGS.some((b) => b.file === f && b.prop === 'thumbColor'),
    );
    expect(offences).toEqual([]);
  });
});
