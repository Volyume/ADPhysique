/**
 * community.copy.guard.test.js -- communities revamp 2026-09-10
 * (`docs/communities-revamp-2026-09-10/20-BLUEPRINT.md` section 10, CR-11;
 * `README.md`: "the app must never explain Community as programme or
 * routine sharing anywhere").
 *
 * WHAT THIS SUITE PINS, and why it is written to fail rather than to
 * pass: Community is never a place to share plans, programmes or
 * routines -- Volyume builds each person's plan. The failure mode is a
 * future string added to a Community screen or component that slips
 * back into that framing: a re-added door, a label copied from the old
 * rules text, a moderator screen's kind map growing a stale entry back.
 * A behavioural test only covers a screen that is actually mounted in
 * that test; this covers every string literal in the file, mounted or
 * not, the same source-level convention `community.privacy.guard.test.js`
 * and `community.rpcOnly.guard.test.js` already use (CLAUDE.md section 3:
 * "Source-level regression guards... lock founder rules").
 *
 * Comments are stripped before the scan. The module this guard exists to
 * catch a regression of legitimately DISCUSSES the retired feature in
 * prose -- "the 'programme' story kind is retired" is history, not
 * residue, and lives in a comment for exactly that reason. A string a
 * user or a moderator could actually read still fails, because none of
 * that lives inside a comment.
 *
 * Positive pins, so the guard cannot be satisfied by deleting all the
 * copy instead of correcting it: the intro card still says what
 * Community is FOR, the Rules screen still opens with the founder's own
 * definition, and the rules version has moved past the pre-revamp text
 * (version 2) so the existing updated-rules acceptance path shows it.
 *
 * A second, unrelated census was added 2026-09-23 (founder order
 * 2026-09-22 item 8, A-14): no Community copy reads "handle" any more
 * ("Username" everywhere a person reads it). See the second describe
 * block below for what THAT one pins, why a JSX-text extractor and
 * brace-balanced interpolation stripping were needed on top of the
 * `code()`/`stringLiterals()` helpers above, and its one named
 * exception.
 *
 * Extended 2026-09-24 (founder order 2026-09-22 item 9, Part E; the
 * item 8 review that named it): (1) the handle census above now also
 * walks `lib/community/*.js`, which renders real copy of its own; (2)
 * `stringLiterals()` is hardened so a template literal nested inside
 * another template literal's own `${...}` no longer confuses the scan
 * (see `scanTemplateLiteralEnd`'s comment for the constructed case);
 * (3) a third census, same shape as the handle one, pins that no
 * Community copy reads "age band" any more either ("Age group"
 * everywhere a person reads it, item 8). Jest's own test titles are
 * developer-facing, not user-facing copy, so they sit under
 * `__tests__` and are outside every census's scope here.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SCREENS_DIR = path.join(ROOT, 'src/screens');
const COMPONENTS_COMMUNITY_DIR = path.join(ROOT, 'src/components/community');
// Item 9 hygiene pass (founder order 2026-09-22, Part E point 1; item 8
// review): `lib/community/*.js` renders real copy too (`reasons.js`,
// `groups.js`'s GROUP_PURPOSE_LINE, `earlyDays.js`), and the handle census
// below had left it out.
const LIB_COMMUNITY_DIR = path.join(ROOT, 'src/lib/community');
const INTRO_CARD = path.join(ROOT, 'src/components/HomeCommunityIntroCard.js');
const RULES_SCREEN = path.join(ROOT, 'src/screens/CommunityRulesScreen.js');
const LIMITS_FILE = path.join(ROOT, 'src/lib/community/limits.js');
// F6 fix (fresh-eyes review, founder order 2026-09-22 item 2): the Today
// live Community row and the screen that hosts its header action are two
// new surfaces that can carry Community copy, so the guard covers them too.
const TODAY_ROW = path.join(ROOT, 'src/components/HomeCommunityTodayRow.js');
const SETTINGS_SCREEN = path.join(ROOT, 'src/screens/SettingsScreen.js');
// Item 8 R2's own scope: the onboarding wizard is not a `Community*.js`
// screen, so only its step 5 slice (the one step that mentions
// Community) is read in, exactly as
// `ProOnboardingScreen.communityStep.guard.test.js:44` slices it.
const PROONBOARDING = path.join(ROOT, 'src/screens/ProOnboardingScreen.js');

/** Strip block and line comments so a rule NAMED or EXPLAINED in a
 * comment (this file is full of them, and so is the source) is never
 * mistaken for live copy. Identical to the stripper
 * `community.privacy.guard.test.js` uses, for the same reason. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * From `start` (a template literal's opening backtick), the index just
 * past its TRUE matching closing backtick. A naive "next backtick
 * closes it" regex is fooled by a template literal NESTED inside this
 * one's own `${...}` (item 9 hygiene pass, Part E point 2; item 8
 * review's constructed case: `` `${cond ? 'x' : `@${y}`} tail` `` --
 * the inner opening backtick reads as the outer literal's close, and
 * the genuine tail is lost). This walks the literal itself, and hands
 * off to `scanBracedExpressionEnd` for every `${...}` it meets, which
 * recurses back here for any template literal nested inside THAT
 * expression -- so a backtick is only ever treated as a close while
 * literal text is actually being scanned, at any nesting depth. Escape
 * sequences (`\` + any character) are skipped as a pair. Returns null
 * if the source runs out first (never true of real, well-formed code).
 */
function scanTemplateLiteralEnd(source, start) {
  let i = start + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') { i += 2; continue; }
    if (ch === '`') return i + 1;
    if (ch === '$' && source[i + 1] === '{') {
      const close = scanBracedExpressionEnd(source, i + 2);
      if (close == null) return null;
      i = close;
      continue;
    }
    i += 1;
  }
  return null;
}

/**
 * From `start` (just past a template literal's `${`), the index just
 * past THIS interpolation's own matching `}`. Depth-counts `{`/`}` the
 * same way `stripBraced` does, but also skips a quoted string (so a
 * `}` inside one, e.g. `${isAdmin ? 'settings}' : x}`, never miscounts)
 * and a nested template literal (via `scanTemplateLiteralEnd`,
 * recursively, so ITS OWN `${...}` and any further nesting never
 * miscounts this level either). Returns null if unterminated.
 */
function scanBracedExpressionEnd(source, start) {
  let i = start;
  let depth = 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\'' || ch === '"') {
      i += 1;
      while (i < source.length && source[i] !== ch) {
        i += source[i] === '\\' ? 2 : 1;
      }
      i += 1;
      continue;
    }
    if (ch === '`') {
      const end = scanTemplateLiteralEnd(source, i);
      if (end == null) return null;
      i = end;
      continue;
    }
    if (ch === '{') { depth += 1; i += 1; continue; }
    if (ch === '}') {
      depth -= 1;
      i += 1;
      if (depth === 0) return i;
      continue;
    }
    i += 1;
  }
  return null;
}

/** Every quoted string's CONTENT (single, double, template), in the
 * order it appears. Call this AFTER `code()`, or a `//` inside a
 * comment's own prose could be misread as starting one. The template
 * branch is a manual scan (`scanTemplateLiteralEnd`), not a regex, so a
 * literal nested inside this one's own interpolation is skipped as a
 * unit rather than mistaken for the close -- see that function's own
 * comment for the constructed case this fixes. */
function stringLiterals(source) {
  const out = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\'' || ch === '"') {
      let j = i + 1;
      while (j < source.length && source[j] !== ch) {
        j += source[j] === '\\' ? 2 : 1;
      }
      out.push(source.slice(i + 1, j));
      i = j + 1;
      continue;
    }
    if (ch === '`') {
      const end = scanTemplateLiteralEnd(source, i);
      if (end == null) { i += 1; continue; }
      out.push(source.slice(i + 1, end - 1));
      i = end;
      continue;
    }
    i += 1;
  }
  return out;
}

/** Remove every brace-balanced region that starts with `openToken`
 * (`'{'` or `` '${' ``) from `text`, closing bracket and all. Shared by
 * `stripInterpolations` and `stripExpressionContainers` below: both are
 * the same brace-counting walk, only the trigger token differs. Brace
 * balanced, not a `[^}]*` regex, because the region can itself nest
 * braces (`${fn({a: 1})}`, `{card.handle ? {x: 1} : null}`), and a
 * naive non-greedy match would close on the FIRST `}` instead of the
 * matching one. */
function stripBraced(text, openToken) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text.startsWith(openToken, i)) {
      let depth = 1;
      let j = i + openToken.length;
      while (j < text.length && depth > 0) {
        if (text[j] === '{') depth += 1;
        else if (text[j] === '}') depth -= 1;
        j += 1;
      }
      i = j;
    } else {
      out += text[i];
      i += 1;
    }
  }
  return out;
}

/** Strip every `${...}` template-literal interpolation from a captured
 * STRING LITERAL's raw content (call after `stringLiterals()`, on each
 * literal in turn -- that function captures a template literal's
 * content verbatim, interpolation and all, so `` `@${card.handle}` ``
 * reads back as the literal text "@${card.handle}", and the bare word
 * "handle" after the dot would otherwise false-positive as if it were
 * copy a person reads, when it is a field access inside the
 * expression). */
function stripInterpolations(text) {
  return stripBraced(text, '${');
}

/** Strip every `{...}` JSX expression container from captured JSX TEXT
 * (call after `jsxTextContents()`, on each captured string in turn),
 * for the same reason `stripInterpolations` exists: "Nothing here yet
 * from {label}'s members" must be judged on the copy around the
 * container, never on a field name read inside it. */
function stripExpressionContainers(text) {
  return stripBraced(text, '{');
}

/** From `i` (just past a JSX tag's name, e.g. right after "<Text"),
 * find THIS tag's own closing '>' (or the '/>' of a self-closing tag).
 * Skips any '>' inside a quoted attribute value or a brace-nested
 * `{...}` attribute expression (e.g. `style={x > y ? a : b}`), so a
 * stray '>' that belongs to a comparison, not the markup, never ends
 * the tag early. Returns null if the source runs out first (never true
 * of a real, well-formed file). */
function scanTagEnd(source, start) {
  let i = start;
  let depth = 0;
  let quote = null;
  while (i < source.length) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === '\'' || ch === '"' || ch === '`') { quote = ch; i += 1; continue; }
    if (ch === '{') { depth += 1; i += 1; continue; }
    if (ch === '}') { depth -= 1; i += 1; continue; }
    if (depth === 0 && ch === '/' && source[i + 1] === '>') return { end: i + 2, selfClosing: true };
    if (depth === 0 && ch === '>') return { end: i + 1, selfClosing: false };
    i += 1;
  }
  return null;
}

/** From `i` (just past a `<Text ...>` tag's own closing '>'), the index
 * where ITS matching `</Text>` starts, skipping any nested `<Text>` (or
 * self-closing `<Text .../>`) so an inline Text nested inside another
 * never closes the outer one early. Returns null if unterminated. */
function scanTextChildrenEnd(source, start) {
  let i = start;
  let depth = 1;
  while (i < source.length) {
    const closeIdx = source.indexOf('</Text>', i);
    if (closeIdx === -1) return null;
    const openIdx = source.indexOf('<Text', i);
    // `\b` after "Text": the character right after must not be a word
    // character, so a nested `<TextField`/`<TextInput` is never
    // mistaken for a nested `<Text`.
    if (openIdx !== -1 && openIdx < closeIdx && !/\w/.test(source[openIdx + 5] || '')) {
      const tag = scanTagEnd(source, openIdx + 5);
      if (!tag) return null;
      if (!tag.selfClosing) depth += 1;
      i = tag.end;
      continue;
    }
    depth -= 1;
    if (depth === 0) return closeIdx;
    i = closeIdx + '</Text>'.length;
  }
  return null;
}

/**
 * Every `<Text ...>...</Text>` pair's own text content, in the order it
 * appears in `source` (call after `code()`). A tag-aware scanner, not a
 * full JSX parser, that respects `{}` nesting in attributes: a naive
 * `>...<` match reads the `>` in `Number(conversation.unread) > 0`
 * (`ConversationRow.js`) as a tag close and the `<PressableCard` that
 * follows as the next tag open, then captures the whole of the code in
 * between -- including the several `const handle = ...` lines -- as if
 * it were "JSX text" (the false hit the previous lane's report names).
 * Anchoring on the literal tag name instead of a bare `>`/`<` pair
 * avoids that: everything between JSX elements is skipped rather than
 * scanned. `<TextField`/`<TextInput` are never matched (`\b` after
 * "Text" fails on the following word character).
 */
function jsxTextContents(source) {
  const out = [];
  let i = 0;
  while (i < source.length) {
    const openIdx = source.indexOf('<Text', i);
    if (openIdx === -1) break;
    const after = source[openIdx + 5];
    if (after && /\w/.test(after)) { i = openIdx + 5; continue; }
    const tag = scanTagEnd(source, openIdx + 5);
    if (!tag) break;
    if (tag.selfClosing) { i = tag.end; continue; }
    const closeIdx = scanTextChildrenEnd(source, tag.end);
    if (closeIdx == null) { i = tag.end; continue; }
    out.push(source.slice(tag.end, closeIdx));
    i = closeIdx + '</Text>'.length;
  }
  return out;
}

/**
 * The three sites the founder named: every `Community*.js` screen, every
 * component under `components/community/`, and the intro card by its own
 * path (it lives one level up, named for what it is rather than for
 * Community). Both directories are read top-level only -- neither has a
 * subdirectory but `__tests__`, and a `.js`-only filter already leaves
 * that out.
 *
 * RE-ANCHORED 2026-09-22 (founder order item 2, fresh-eyes review F6): the
 * Today root's live Community row (HomeCommunityTodayRow.js) and the
 * Settings screen that now hosts a Community-adjacent entry point are
 * added by their own path, the same way the intro card is.
 */
function targetFiles() {
  const screens = fs.readdirSync(SCREENS_DIR)
    .filter((f) => /^Community.*\.js$/.test(f))
    .map((f) => path.join(SCREENS_DIR, f));
  const components = fs.readdirSync(COMPONENTS_COMMUNITY_DIR)
    .filter((f) => f.endsWith('.js'))
    .map((f) => path.join(COMPONENTS_COMMUNITY_DIR, f));
  return [...screens, ...components, INTRO_CARD, TODAY_ROW, SETTINGS_SCREEN];
}

describe('no Community copy explains programme, plan or routine sharing', () => {
  test('there is Community copy to guard', () => {
    // If this ever falls near zero, the guard has quietly stopped
    // guarding anything (a folder rename, a moved file) rather than
    // passing honestly.
    expect(targetFiles().length).toBeGreaterThan(20);
  });

  test.each(targetFiles().map((f) => [path.relative(ROOT, f), f]))(
    '%s carries no "programme" string literal',
    (rel, full) => {
      const source = code(fs.readFileSync(full, 'utf8'));
      const hits = stringLiterals(source).filter((s) => /programme/i.test(s));
      expect({ rel, hits }).toEqual({ rel, hits: [] });
    },
  );
});

describe('the founder\'s definition is actually in place', () => {
  test('the Today intro card leads with connecting and respect', () => {
    const source = code(fs.readFileSync(INTRO_CARD, 'utf8'));
    const literals = stringLiterals(source);
    expect(literals.some((s) => /give respect/i.test(s))).toBe(true);
  });

  test('the Rules screen opens with "connect with people at your gym"', () => {
    const source = code(fs.readFileSync(RULES_SCREEN, 'utf8'));
    const literals = stringLiterals(source);
    expect(literals.some((s) => /connect with people at your gym/i.test(s))).toBe(true);
  });

  test('the rules version has moved past the pre-revamp text (version 2)', () => {
    const source = fs.readFileSync(LIMITS_FILE, 'utf8');
    const m = /export const COMMUNITY_RULES_VERSION = (\d+);/.exec(source);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBeGreaterThanOrEqual(3);
  });
});

/**
 * Community screens, every top-level file under `components/community/`,
 * and every top-level file under `lib/community/` -- the three globs
 * the census below covers. Deliberately narrower than `targetFiles()`
 * above: the intro card, the Today row and the Settings screen are that
 * OTHER guard's own three named extra sites, not this one's (R2's scope
 * was originally exactly the first two globs plus the onboarding step 5
 * slice, read separately below).
 *
 * EXTENDED 2026-09-24 (founder order 2026-09-22 item 9, Part E point 1;
 * item 8 review): `lib/community/*.js` renders real copy too and had
 * been left out. Both directories are still read top-level only -- see
 * `targetFiles()`'s own comment for why a `.js`-only filter is enough.
 */
function handleCensusFiles() {
  const screens = fs.readdirSync(SCREENS_DIR)
    .filter((f) => /^Community.*\.js$/.test(f))
    .map((f) => path.join(SCREENS_DIR, f));
  const components = fs.readdirSync(COMPONENTS_COMMUNITY_DIR)
    .filter((f) => f.endsWith('.js'))
    .map((f) => path.join(COMPONENTS_COMMUNITY_DIR, f));
  const lib = fs.readdirSync(LIB_COMMUNITY_DIR)
    .filter((f) => f.endsWith('.js'))
    .map((f) => path.join(LIB_COMMUNITY_DIR, f));
  return [...screens, ...components, ...lib];
}

/** The onboarding wizard's step 5, "Your gym" -- the only step that
 * mentions Community -- exactly as
 * `ProOnboardingScreen.communityStep.guard.test.js:44` slices it. */
function proOnboardingStep5Slice() {
  const src = fs.readFileSync(PROONBOARDING, 'utf8');
  const slice = src.slice(
    src.indexOf('  if (step === 5) {'),
    src.indexOf('// ── Step 6, Injuries & limitations'),
  );
  // If either marker ever moves, `.slice` silently returns '' or the
  // wrong range rather than throwing -- fail loudly instead of passing
  // by guarding nothing.
  if (!slice) throw new Error('ProOnboardingScreen.js step 5 markers not found -- update the slice');
  return slice;
}

/**
 * Every "handle"/"handles" hit in `source` (after `code()` has already
 * stripped comments): string-literal hits (interpolations stripped
 * first) and JSX-text hits (expression containers stripped first).
 * `allowLiteralOnce`, when given, lets through exactly ONE literal hit
 * equal to that exact string -- never a blanket allowance for the
 * whole file -- so a second, genuine offender in the same file still
 * fails.
 */
function handleHits(strippedSource, { allowLiteralOnce } = {}) {
  let literalHits = stringLiterals(strippedSource)
    .map(stripInterpolations)
    .filter((s) => /\bhandles?\b/i.test(s));
  if (allowLiteralOnce != null) {
    const idx = literalHits.indexOf(allowLiteralOnce);
    if (idx !== -1) literalHits = [...literalHits.slice(0, idx), ...literalHits.slice(idx + 1)];
  }
  const jsxHits = jsxTextContents(strippedSource)
    .map(stripExpressionContainers)
    .filter((s) => /\bhandles?\b/i.test(s));
  return { literalHits, jsxHits };
}

describe('no "handle"/"handles" word survives in Community copy (A-14 census, founder order 2026-09-22 item 8)', () => {
  /**
   * WHAT THIS PINS, and why it is written to fail rather than pass:
   * item 8 part C renamed every user-facing "Handle" to "Username" by
   * hand, site by site (the `handle` FIELD, RPC names, params, keys,
   * links and the `@name` rendering are untouched -- only the WORD in
   * copy moved). This is the census that catches the NEXT one: a fresh
   * screen, a copy-pasted hint, a moderator string that reaches for the
   * old word instead of "Username". It reads every quoted string
   * literal AND every `<Text>` child in `src/screens/Community*.js`,
   * `src/components/community/*.js` and the onboarding wizard's step 5
   * (the only step that mentions Community), after stripping comments
   * (`code()`), template-literal interpolations
   * (`stripInterpolations`) and JSX expression containers
   * (`stripExpressionContainers`) -- so a property access like
   * `card.handle` or a variable like `communityHandle` is judged on the
   * copy sitting around it, never on the field name inside the
   * expression that fills it in.
   *
   * ONE named exception, and why it is not copy: `ProOnboardingScreen.
   * js`'s `onLayout={markY('handle')}` (inside the step 5 slice) passes
   * the bare string 'handle' as `markY`'s own internal layout-
   * correlation key -- which section's measured Y position to
   * remember, so a validation error can be scrolled into view -- never
   * text a person reads. Exactly one occurrence is let through, and
   * only in that one slice; a second would still fail.
   */
  test('there is Community copy to guard (screens + components + lib)', () => {
    // If this ever falls near zero, the guard has quietly stopped
    // guarding anything (a folder rename, a moved file) rather than
    // passing honestly. Raised from 50 to 80 when `lib/community/*.js`
    // joined the walk (item 9, Part E point 1): the three globs together
    // run to 92 files today.
    expect(handleCensusFiles().length).toBeGreaterThan(80);
  });

  test.each(handleCensusFiles().map((f) => [path.relative(ROOT, f), f]))(
    '%s carries no "handle"/"handles" string literal or JSX text',
    (rel, full) => {
      const stripped = code(fs.readFileSync(full, 'utf8'));
      const { literalHits, jsxHits } = handleHits(stripped);
      expect({ rel, literalHits, jsxHits }).toEqual({ rel, literalHits: [], jsxHits: [] });
    },
  );

  test('ProOnboardingScreen.js step 5 carries no "handle"/"handles" string literal or JSX text, but for the one named layout-key exception', () => {
    const stripped = code(proOnboardingStep5Slice());
    const { literalHits, jsxHits } = handleHits(stripped, { allowLiteralOnce: 'handle' });
    expect({ literalHits, jsxHits }).toEqual({ literalHits: [], jsxHits: [] });
  });
});

/**
 * `stringLiterals()`'s own correctness, direct (item 9 hygiene pass,
 * founder order 2026-09-22, Part E point 2; item 8 review). Every other
 * test in this file exercises the helper only indirectly, through real
 * source; this pins the constructed case the review named, where a
 * template literal nests inside another template literal's own
 * `${...}`. The OLD regex-based scan read the inner literal's OPENING
 * backtick as the outer literal's CLOSE: it produced two garbled
 * fragments (`` `${cond ? 'go to your handle settings' : ` `` and
 * `` } suffix` ``, neither the true content) and silently dropped
 * anything the inner literal's own text carried that fell either side
 * of ITS interpolation. Written to fail first against the pre-fix
 * `stringLiterals()`; the report carries that failing output.
 */
describe('stringLiterals correctly spans a nested template literal', () => {
  test('the review\'s constructed case: a template literal inside another one\'s ${...}', () => {
    // `${cond ? 'go to your handle settings' : `@${y}`} suffix`
    const source = '`${cond ? \'go to your handle settings\' : `@${y}`} suffix`';
    expect(stringLiterals(source)).toEqual([
      "${cond ? 'go to your handle settings' : `@${y}`} suffix",
    ]);
  });

  test('a plainer nested case still separates correctly either side of the inner literal', () => {
    // `${a ? `left ${x} mid` : 'right'} tail`
    const source = '`${a ? `left ${x} mid` : \'right\'} tail`';
    expect(stringLiterals(source)).toEqual([
      "${a ? `left ${x} mid` : 'right'} tail",
    ]);
  });

  test('an ordinary, non-nested template literal is unaffected', () => {
    const source = '`Hello ${name}, welcome`';
    expect(stringLiterals(source)).toEqual(['Hello ${name}, welcome']);
  });

  test('single and double quotes are unaffected, in the presence of a nested-template literal elsewhere', () => {
    const source = "'a' + \"b\" + `${x ? `c` : 'd'}e`";
    expect(stringLiterals(source)).toEqual(['a', 'b', '${x ? `c` : \'d\'}e']);
  });
});

/**
 * Every "age band"/"age bands" hit in `source` (after `code()` has
 * already stripped comments): string-literal hits (interpolations
 * stripped first) and JSX-text hits (expression containers stripped
 * first). The PHRASE, not the field: `\s+` between the two words means
 * `age_band`/`ageBand`/`TP_AGE_BANDS` (the field, RPC params, keys and
 * constant names, untouched by item 8's rename) never false-positive --
 * only the words a person would actually read, the same mechanism
 * `handleHits` above uses to leave `handle_taken` alone.
 */
function ageBandHits(strippedSource) {
  const re = /\bage\s+bands?\b/i;
  const literalHits = stringLiterals(strippedSource)
    .map(stripInterpolations)
    .filter((s) => re.test(s));
  const jsxHits = jsxTextContents(strippedSource)
    .map(stripExpressionContainers)
    .filter((s) => re.test(s));
  return { literalHits, jsxHits };
}

describe('no "age band"/"age bands" phrase survives in Community copy (item 9 hygiene pass, founder order 2026-09-22 Part E point 3; item 8 review)', () => {
  /**
   * WHAT THIS PINS, and why it is written to fail rather than pass:
   * item 8 renamed every user-facing "Age band" to "Age group" (board:
   * "Username and Age group everywhere"; live today in
   * `CommunityTrainingProfileScreen.js`'s `label: 'Age group'`,
   * `PeopleFiltersSheet.js`'s "Age group" section and accessibility
   * label, `CommunityDimensionScreen.js`'s "Your age group" header and
   * body line, and `lib/community/reasons.js`'s `'Same age group'`
   * reason). This is the census that catches the NEXT one: a fresh
   * screen, a copy-pasted hint, a moderator string that reaches for the
   * old phrase instead of "Age group". Same scopes as the handle
   * census just above (screens, components, lib, and the onboarding
   * step 5 slice), same comment/interpolation/expression-container
   * stripping, so a variable like `ageBand` or a key like `age_band` is
   * judged on the copy sitting around it, never on the field name
   * inside the expression that fills it in. No named exception was
   * needed: nothing in scope uses the two words, space-separated, as an
   * identifier.
   */
  test('there is Community copy to guard (screens + components + lib)', () => {
    expect(handleCensusFiles().length).toBeGreaterThan(80);
  });

  test.each(handleCensusFiles().map((f) => [path.relative(ROOT, f), f]))(
    '%s carries no "age band"/"age bands" string literal or JSX text',
    (rel, full) => {
      const stripped = code(fs.readFileSync(full, 'utf8'));
      const { literalHits, jsxHits } = ageBandHits(stripped);
      expect({ rel, literalHits, jsxHits }).toEqual({ rel, literalHits: [], jsxHits: [] });
    },
  );

  test('ProOnboardingScreen.js step 5 carries no "age band"/"age bands" string literal or JSX text', () => {
    const stripped = code(proOnboardingStep5Slice());
    const { literalHits, jsxHits } = ageBandHits(stripped);
    expect({ literalHits, jsxHits }).toEqual({ literalHits: [], jsxHits: [] });
  });
});
