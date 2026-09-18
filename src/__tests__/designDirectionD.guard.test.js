/**
 * DESIGN DIRECTION D ("Ledger, dark") — the stage 1 spine, pinned in source.
 *
 * Authority: founder in chat 2026-09-14, first "I'd like you to plan a complete
 * app look and feel redesign as I don't like what we have and I think it looks
 * far too much like it's built by ai", then the correction "I wouldn't make it
 * look like a fitness app", then the ruling: "a hybrid of A + B, with B's
 * visual language and A's information architecture", dark-first. Recorded as
 * D165; the research rulings behind it are D164; the founder's three ED-safety
 * answers and the lead's three corrections are D166. Plan:
 * `docs/design-redesign-2026-09-14/20-DIRECTION-AND-PLAN.md`.
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL.
 *
 * A redesign with no enforcement leaks back within a month. The measured
 * starting state was: 73.9% of all typed text at 11 or 13 px, only TWO sites in
 * 106 screens above 24 px through a type role, and one radius (`lg`) serving as
 * the card, the button, the empty state, the tooltip and the tab pill at once,
 * so a button and a card were geometrically identical. None of that was
 * anybody's decision; it was the absence of one. These cases make each law's
 * mechanism a thing a future edit has to break on purpose.
 *
 * Coverage is deliberately narrow: the SPINE only. The stage-2 and stage-3
 * screens get their own guards as they land, rather than one suite that
 * pretends to cover surfaces nobody has rebuilt yet.
 *
 * Not covered here, and not silently: whether a given screen has exactly one
 * loud element (law 1's per-screen half) cannot be checked from source without
 * a screen-by-screen table, so it is walked on device instead — plan section 11.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** Strip comments, so a rule NAMED in a docblock is never read as code. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const THEME = read('src/styles/theme.js');
const BUTTON = read('src/components/Button.js');
const BIG_NUMBER = read('src/components/BigNumber.js');
const WEEK_RIBBON = read('src/components/WeekRibbon.js');
const LEDGER_ROW = read('src/components/LedgerRow.js');
const ESLINT = read('eslint.config.js');

describe('D165: the ground is the founder-specified warm charcoal, and its mirrors track it', () => {
  test('theme.js carries the charcoal ground and warm ink, not black and pure white', () => {
    const c = code(THEME);
    expect(c).toContain("background: '#111110'");
    expect(c).toContain("textPrimary: '#F2EFE7'");
    // The values that were there before. If either comes back, the ground has
    // been reverted without the decision being reversed.
    expect(c).not.toContain("background: '#0D0D0D'");
    expect(c).not.toContain("textPrimary: '#FFFFFF'");
  });

  test('the widget palette mirrors the ground by hand and has not desynced', () => {
    const c = code(read('src/widgets/widgets.js'));
    expect(c).toContain("const INK = '#111110'");
    expect(c).toContain("const TEXT = '#F2EFE7'");
  });

  test('the share card palette mirrors the ground by hand and has not desynced', () => {
    const c = code(read('src/lib/shareCard/drawShareCard.js'));
    expect(c).toContain("bg0: '#111110'");
    expect(c).toContain("text: '#F2EFE7'");
    // Both files are whitelisted to hold their own hex values precisely because
    // they cannot import the theme, and both have drifted from it before.
    expect(c).not.toContain("bg0: '#0D0D0D'");
  });
});

describe('D166 law 3: geometry carries meaning — a control is not a card', () => {
  test('radius.control exists and is a named token, not an alias of md', () => {
    const c = code(THEME);
    expect(/control:\s*10,/.test(c)).toBe(true);
    expect(/lg:\s*16,/.test(c)).toBe(true);
  });

  test('Button draws the control radius, not the card radius', () => {
    const c = code(BUTTON);
    const base = /base:\s*\{[\s\S]*?\}/.exec(c);
    expect({ anchored: !!base }).toEqual({ anchored: true });
    expect(base[0]).toContain('borderRadius: radius.control');
    expect(base[0]).not.toContain('borderRadius: radius.lg');
  });

  test('the lint bank bans raw borderRadius literals, exempting only 0', () => {
    const c = code(ESLINT);
    expect(c).toContain('border(Top|Bottom)?(Left|Right|Start|End)?Radius');
    expect(c).toContain("[raw!='0']");
  });

  test('no product file carries a raw borderRadius literal', () => {
    // The lint rule is the live enforcement; this case exists so that deleting
    // or weakening the rule fails a test rather than passing silently.
    const dirs = ['src/components', 'src/screens'];
    const offenders = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          if (entry.name === '__tests__') continue;
          walk(rel);
        } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) {
          const c = code(read(rel));
          const m = c.match(/border(Top|Bottom)?(Left|Right|Start|End)?Radius:\s*[1-9][0-9.]*/g);
          if (m) offenders.push(`${rel}: ${m.join(', ')}`);
        }
      }
    };
    dirs.forEach(walk);
    expect(offenders).toEqual([]);
  });
});

describe('D166 law 1: the type scale has a loud step, on a face that already ships', () => {
  test('fontSize.hero exists and scales under largerText', () => {
    const c = code(THEME);
    // RE-ANCHORED (D192, 2026-09-18): the hero step is 40. 56 dwarfed everything beside it.
    expect(/hero:\s*40,/.test(c)).toBe(true);
    // resolveTheme enumerates every key by name; an omitted key silently does
    // not scale for users who need larger text.
    expect(c).toContain('hero:    Math.round(baseFontSize.hero    * 1.2)');
  });

  test('the hero role uses the display face already in the bundle, and no new font ships', () => {
    const c = code(THEME);
    const role = /get hero\(\)\s*\{[\s\S]*?\}/.exec(c);
    expect({ anchored: !!role }).toEqual({ anchored: true });
    expect(role[0]).toContain('fontFamily.displayHeavy');
    // D164 withdrew the proposed Archivo typeface: "scoreboard" is a sports
    // cue, the opposite of the founder's non-fitness correction.
    const fonts = code(read('src/styles/fonts.js'));
    expect(fonts.toLowerCase()).not.toContain('archivo');
  });

  test('letterSpacing stays neutral on the loud step (D3 is not reversed)', () => {
    const c = code(THEME);
    const role = /get hero\(\)\s*\{[\s\S]*?\}/.exec(c);
    expect(role[0]).toContain('letterSpacing: letterSpacing.display');
    expect(/letterSpacing:\s*-/.test(role[0])).toBe(false);
  });
});

describe('D166: the spine components are written to the migrated pattern, not the double-write', () => {
  test.each([
    ['src/components/BigNumber.js', BIG_NUMBER],
    ['src/components/WeekRibbon.js', WEEK_RIBBON],
    ['src/components/LedgerRow.js', LEDGER_ROW],
  ])('%s reads colour from useTheme and memoizes it, with no buildLiveStyles', (rel, src) => {
    const c = code(src);
    expect({ rel, useTheme: c.includes('useTheme()') }).toEqual({ rel, useTheme: true });
    expect({ rel, memo: /useMemo\(\(\) =>[\s\S]*?\[t[,\]]/.test(c) }).toEqual({ rel, memo: true });
    // The frozen-plus-live mirror is what let LoggedSetRow's two halves disagree
    // about a border colour unnoticed. New components do not use it.
    expect({ rel, doubleWrite: c.includes('buildLiveStyles') }).toEqual({ rel, doubleWrite: false });
  });

  test.each([
    ['src/components/BigNumber.js', BIG_NUMBER],
    ['src/components/WeekRibbon.js', WEEK_RIBBON],
    ['src/components/LedgerRow.js', LEDGER_ROW],
  ])('%s keeps only palette-invariant properties in the frozen block', (rel, src) => {
    const c = code(src);
    const frozen = /StyleSheet\.create\(\{[\s\S]*?\n\}\);/.exec(c);
    expect({ rel, anchored: !!frozen }).toEqual({ rel, anchored: true });
    // A colour or a type spread in the frozen half is the bug, not the pattern.
    expect({ rel, colour: /colors\./.test(frozen[0]) }).toEqual({ rel, colour: false });
    expect({ rel, type: /\.\.\.type\./.test(frozen[0]) }).toEqual({ rel, type: false });
  });
});

describe('D166 law 6: amber means now', () => {
  test('the week ribbon spends amber on today and nothing else', () => {
    // RE-ANCHORED (D191, 2026-09-17): today is an amber OUTLINE until you
    // have trained today and an amber FILL after, so the two amber lines
    // are both today's. Nothing else in the file may spend it.
    const c = code(WEEK_RIBBON);
    const amber = c.match(/t\.colors\.primary/g) || [];
    expect({ count: amber.length }).toEqual({ count: 2 });
    expect(c).toContain('cellToday: { borderWidth: 1.5, borderColor: t.colors.primary }');
    expect(c).toContain('cellTodayTrained: { backgroundColor: t.colors.primary }');
    expect(c).toContain('isToday && (isTrained ? s.cellTodayTrained : s.cellToday)');
  });

  test('the ledger spends amber on the current row only, as ink and never as a fill', () => {
    const c = code(LEDGER_ROW);
    const build = /function buildStyles[\s\S]*?\n\}/.exec(c);
    expect({ anchored: !!build }).toEqual({ anchored: true });
    // Amber appears as `color:` on the index and the figure. A backgroundColor
    // would make the live row the loudest thing on a screen whose loud thing is
    // somewhere else.
    expect(/backgroundColor:\s*t\.colors\.primary/.test(build[0])).toBe(false);
    expect(build[0]).toContain('isCurrent ? t.colors.primary');
  });
});

describe('D166 part 2.1: the week ribbon draws two states, because a third does not exist', () => {
  test('it has a trained state and a today state, and no rest-day state', () => {
    const c = code(WEEK_RIBBON);
    expect(c).toContain('cellTrained');
    expect(c).toContain('cellToday');
    // The founder ruled on 2026-08-03 that the product has no scheduled
    // training days. A rest-day cell would be inventing data, and the plan's
    // original three-state spec was withdrawn for exactly that reason.
    expect(/cellRest|restDay|plannedRest/i.test(c)).toBe(false);
  });

  test('the ribbon never draws a broken or failed state', () => {
    const c = code(WEEK_RIBBON);
    // It is a record, not a tally that can break. No red, no missed marker.
    expect(/colors\.error|missed|broken|streakLost/i.test(c)).toBe(false);
  });
});

describe('D166: ED-safety carried into the spine', () => {
  test('BigNumber does not animate at all, so it cannot become a hole in the commission allowlist', () => {
    const c = code(BIG_NUMBER);
    // rollingNumber.guard.test.js holds an allowlist of two surfaces because
    // the count-up carries an absolute ED rule. A component used everywhere
    // must not be on it, and a per-caller `isBodyweight` flag would be weaker
    // than the allowlist in exactly the way that matters.
    expect(c).not.toContain('RollingNumber');
    expect(/animate|withTiming|useSharedValue/.test(c)).toBe(false);
  });

  test('BigNumber reads no safety flag of its own', () => {
    const c = code(BIG_NUMBER);
    // Suppression is the caller's fail-closed chain. A presentational primitive
    // that also read the flag would be a second place for it to drift.
    expect(/edFlag|isCalm|wellbeing|getOpenEdPatternFlag/i.test(c)).toBe(false);
  });

  test("RollingNumber's absolute bodyweight exclusion is still stated in source", () => {
    const src = read('src/components/RollingNumber.js');
    expect(src).toContain('body-weight');
    expect(src).toContain('NEVER ticks');
  });
});

describe('D166 law 7: a number states what it is', () => {
  test('the home last-session row no longer hard-codes kg', () => {
    const c = code(read('src/components/HomeLastSessionCard.js'));
    expect(c).not.toContain('kg lifted');
    expect(c).toContain('tonnageLabel');
  });

  test('the home tonnage label is built with the unit helper and the users own preference', () => {
    const c = code(read('src/screens/HomeScreen.js'));
    expect(c).toContain('formatWithUnit(formatNumber(Math.round(tonnage))');
    expect(c).toContain("units === 'lbs' ? 'lbs' : 'kg'");
    // "Volume" means a muscle's weekly hard sets app-wide. This lens was
    // renamed to "lifted" once already because colliding the names misled
    // users; the guard stops it colliding again.
    expect(c).toContain('lifted');
  });

  test('BigNumber can carry a unit beside its figure', () => {
    const c = code(BIG_NUMBER);
    expect(c).toContain('unit');
    expect(c).toContain('s.unit');
  });
});

describe('D184: the ledger is built as specified, on the three surfaces the founder named', () => {
  // The plan's second signature device -- "every set, everywhere, as
  // hairline-ruled rows of tabular figures" -- was built in stage 1 and used on
  // ONE screen until 2026-09-17, when the lead surfaced that as the reduction it
  // was and the founder ruled "Build it as specified." These cases pin that
  // the three named surfaces draw their sets through LedgerRow, and that the two
  // props added to make that possible keep the primitive honest.
  const LOGGED_ROW = read('src/components/workout/LoggedSetRow.js');
  const ACTIVE = read('src/screens/ActiveWorkoutScreen.js');
  const SUMMARY = read('src/screens/WorkoutSummaryScreen.js');
  const DETAIL = read('src/screens/ExerciseDetailScreen.js');

  test.each([
    ['the logger\'s logged sets', LOGGED_ROW, /<LedgerRow[\s\S]*?accessible=\{false\}[\s\S]*?muted=\{isWarmup\}/],
    ['the logger\'s upcoming previews', ACTIVE, /<LedgerRow[\s\S]*?state="upcoming"/],
    ['the summary\'s set breakdown', SUMMARY, /workingSets\.map\(\(s, si\) => \(\s*<LedgerRow/],
    ['exercise detail\'s history', DETAIL, /sessionSets\.map\(\(s, j\) => \{[\s\S]*?<LedgerRow/],
  ])('%s draws through LedgerRow', (label, src, re) => {
    expect({ label, ledger: re.test(code(src)) }).toEqual({ label, ledger: true });
  });

  test('the logger keeps its behaviour layer around the ledger line, not inside it', () => {
    // The tap-to-edit pressable, the spoken label, the long-press menu wrap and
    // the zeego rowStyle clobber contract all predate D184 and are founder- and
    // Sentry-pinned elsewhere. The ledger is the CHILD of the pressable; the
    // pressable still owns the accessibility node, which is why the child is
    // `accessible={false}`.
    const c = code(LOGGED_ROW);
    expect(/<TouchableOpacity[\s\S]*?accessibilityRole="button"[\s\S]*?<LedgerRow/.test(c)).toBe(true);
    expect(c).toContain('<SetRowMenu rowStyle={rowStyle}');
  });

  test('a warm-up is a quiet DONE line, never called upcoming', () => {
    // `muted` exists so the primitive does not have to lie. A warm-up that was
    // logged is done; rendering it as `state="upcoming"` to get the grey would
    // have been exactly the kind of misnamed state this campaign has removed.
    const c = code(LOGGED_ROW);
    expect(c).toContain('muted={isWarmup}');
    expect(c).not.toMatch(/state=\{isWarmup/);
    const ledger = code(LEDGER_ROW);
    expect(ledger).toMatch(/\(isUpcoming \|\| muted\) \? t\.colors\.textMuted/);
  });

  test('the two new props are additive and default to the old behaviour', () => {
    const ledger = code(LEDGER_ROW);
    expect(ledger).toMatch(/muted = false,/);
    expect(ledger).toMatch(/accessible = true,/);
    // A11y label only when the row owns its node.
    expect(ledger).toMatch(/accessibilityLabel=\{accessible\s*\?/);
  });

  test('the middle dot still holds the warm-up index column (D173 T2 survives D184)', () => {
    const c = code(LOGGED_ROW);
    expect(c).toContain("const warmupMark = '\\u00B7';");
    expect(c).toMatch(/index=\{isWarmup \? warmupMark : progressNum\}/);
  });
});

describe('D187: the avatar presets stop borrowing state colours', () => {
  test('no preset carries a tone, and the mark reads no borrowed state colour for its glyphs', () => {
    // The six presets used to decorate their glyph with a `tone` borrowed from
    // the semantic palette (primary/macroFat/success/macroCarb/warning/error).
    // The glyph is the identity now; it draws in ink, and nothing in either
    // file may reintroduce a state colour under a new name.
    const presets = code(read('src/lib/profileAvatarPresets.js'));
    expect(presets).not.toMatch(/\btone\s*:/);
    const mark = code(read('src/components/ProfileAvatarMark.js'));
    expect(mark).not.toMatch(/t\.colors\.(primary|success|warning|error|macroFat|macroCarb)\b/);
  });
});
