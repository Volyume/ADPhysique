/**
 * rewardProps.guard.test.js — the reward props stay gone (D173, stage 3).
 *
 * AUTHORITY. `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`
 * D173, whose parent is `docs/design-redesign-2026-09-14/20-DIRECTION-AND-
 * PLAN.md` §3 amber discipline 3, verbatim: "Amber never appears alongside a
 * flame, a trophy, a medal colour or a glow. Those go (stage 3)." Founder,
 * D165: "No gamification. No decorative fitness iconography." Law 5 forbids
 * celebratory animation, which is what the particle machinery was.
 *
 * WHAT THIS SUITE PINS, and why each case is written to FAIL.
 *
 *  1. T1 — `theme.js` defines no `gold`, `silver` or `bronze` colour role in
 *     ANY palette. A trophy tier is a game mechanic; `silver` and `bronze`
 *     never had a consumer outside a contrast test. A deleted token is only
 *     deleted until somebody needs "a nice warm yellow", so the definition
 *     itself is pinned, not merely its absence at the call sites.
 *  2. T1 — no file under `src/` reads `colors.gold` / `.silver` / `.bronze`.
 *     Nine files did; their replacements are recorded in D173's table.
 *  3. T2/T3 — no quoted Ionicons name `flame`, `trophy`, `medal*`, `ribbon*`
 *     or `sparkles` survives in product source. Five of the fourteen flames
 *     meant WARM-UP rather than decoration and were re-encoded (a textMuted
 *     ledger mark, `trending-up-outline`) rather than stripped, so this case
 *     is about the GLYPH vocabulary, never about the meaning it carried.
 *  4. T4 — `PRCelebration.js` exports no `MilestoneBurst` and carries no
 *     particle machinery. D170 removed its only mount; the code that stayed
 *     behind was one import away from being a confetti burst again.
 *
 * SCOPE. Product source only: `__tests__` directories and `*.test.js` files
 * are excluded, exactly as `motionFitRules.guard.test.js` scopes its own
 * greps, because a guard that pins ABSENCE has to be allowed to name the
 * thing it bans. Comments are stripped before matching (the `code()` helper),
 * so a rule NAMED in a docblock — and several of these files now explain in
 * prose which prop they lost — is never read as the prop coming back.
 *
 * DELIBERATELY OUT OF SCOPE: `src/lib/shareCard/`, which carries its own
 * `PALETTE.gold`, a trophy moment and a "NEW PR" plate. D173 sequences it to
 * stage 4, "one properly made personal best moment that states a fact rather
 * than throwing confetti", where the celebration language is rewritten rather
 * than recoloured piecemeal. It is named here so its exemption is a recorded
 * decision with a destination, not a hole somebody later mistakes for
 * completeness.
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

// Product source only — same posture as motionFitRules.guard.test.js.
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

// The stage-4 exemption, applied as a path prefix so a new file added inside
// the share-card folder inherits it rather than silently failing.
const STAGE_4 = 'lib/shareCard/';

const filesMatching = (re, { includeStage4 = false } = {}) =>
  sources
    .filter((s) => (includeStage4 || !s.file.startsWith(STAGE_4)) && re.test(s.text))
    .map((s) => s.file)
    .sort();

describe('D173 T1: the trophy-tier colour roles do not exist', () => {
  test('theme.js defines no gold, silver or bronze role in any palette', () => {
    const THEME = code(fs.readFileSync(path.join(SRC, 'styles', 'theme.js'), 'utf8'));
    // Key-definition form in any of the palette or modifier tables
    // (baseColors, lightColors, darkHC/lightHC, darkCVD/lightCVD).
    for (const role of ['gold', 'silver', 'bronze']) {
      expect({ role, defined: new RegExp(`\\b${role}\\s*:`).test(THEME) })
        .toEqual({ role, defined: false });
    }
    // And the literal values they carried, so the role cannot come back under
    // a new name with the same medal hues.
    for (const hex of ['#FFD700', '#C0C0C0', '#CD7F32', '#8A6D00', '#8C5318']) {
      expect({ hex, present: THEME.includes(hex) }).toEqual({ hex, present: false });
    }
  });

  test('no file under src/ reads colors.gold, colors.silver or colors.bronze', () => {
    // Catches both the static singleton (`colors.gold`) and the live theme
    // read (`t.colors.gold`), plus the bracket form.
    const offences = filesMatching(/colors\s*[.[]\s*['"]?(gold|silver|bronze)\b/);
    expect(offences).toEqual([]);
  });

  test('nor through an ALIAS of the palette, which is how one survived', () => {
    // THE HOLE THIS CLOSES, found 2026-09-15. The case above requires the
    // literal identifier `colors`. `LiftProgressScreen.js` aliases the live
    // table to `c` (`buildLevelColor(c)`, a house pattern), so its
    // `Elite: c.gold` was invisible to this guard for the whole campaign --
    // and because D173 T1 had deleted the role, `map.Elite` resolved
    // `undefined`, fell through the `||` default, and an ELITE lifter's badge
    // rendered in the same muted grey as a BEGINNER's. A deleted token plus an
    // aliasing convention plus a regex anchored on one identifier produced a
    // live defect no test could see.
    //
    // The rule is now the property, not the object: these three words are only
    // ever the deleted medal roles, so ANY `.gold` / `.silver` / `.bronze`
    // member access in product source is an offence whatever it hangs off.
    // `\b` keeps "golden" and the like out of it.
    const offences = filesMatching(/\.\s*(gold|silver|bronze)\b/);
    expect(offences).toEqual([]);
  });

  test('no Card or GradientCard call site asks for the gold tone', () => {
    const offences = filesMatching(/tone\s*[:=]\s*\{?\s*['"]gold['"]/);
    expect(offences).toEqual([]);
  });
});

describe('D173 T2/T3: the flame, trophy, medal, ribbon and sparkle glyphs are gone', () => {
  // Quoted Ionicons names only. A bare `grep trophy` matches HYPERTROPHY all
  // over the engine, which is how an earlier census reached "102 trophy
  // references" for a surface that was really nineteen; the quotes are what
  // make this case mean what it says.
  const BANNED = /['"](flame|flame-outline|trophy|trophy-outline|medal|medal-outline|medal-sharp|ribbon|ribbon-outline|ribbon-sharp|sparkles|sparkles-outline|sparkles-sharp)['"]/;

  test('no reward glyph survives under screens, components or lib', () => {
    const offences = filesMatching(BANNED).filter(
      (f) => f.startsWith('screens/') || f.startsWith('components/') || f.startsWith('lib/'),
    );
    expect(offences).toEqual([]);
  });

  test('nowhere else in src/ either, share card excepted', () => {
    // styles/, store/, navigation/, hooks/, widgets/ are held to the same
    // rule; the share card is the one recorded exemption (stage 4).
    expect(filesMatching(BANNED)).toEqual([]);
  });

  test('the warm-up signal was re-encoded, not deleted with the glyph', () => {
    // D173 T2's own correction: five of the fourteen flames MEANT warm-up,
    // and one of them stood in the 22 dp column where a working set's number
    // goes. If a later sweep removes these, the ledger loses its alignment
    // and the logger loses the warm-up cue, which is the opposite of what
    // T2 ruled. Pinned positively so the re-encoding cannot quietly lapse.
    //
    // D184 (2026-09-17): `warmupMark` is no longer a style key -- the row's
    // presentation moved onto LedgerRow, and the mark is the constant passed
    // as that row's `index`. Same column, same dot, same intent; this pin
    // still holds without edit because the identifier survived on purpose.
    const loggedRow = code(
      fs.readFileSync(path.join(SRC, 'components', 'workout', 'LoggedSetRow.js'), 'utf8'),
    );
    expect(loggedRow).toContain('warmupMark');
    expect(loggedRow).toContain("' - Warm-up'");
    const nowCard = code(
      fs.readFileSync(path.join(SRC, 'components', 'workout', 'NowCard.js'), 'utf8'),
    );
    expect(nowCard).toContain("'trending-up-outline'");
  });

  test('the warm-up cue no longer borrows the warning state colour', () => {
    // §8 protects the state-colour grammar and a warm-up is not a warning.
    const nowCard = code(
      fs.readFileSync(path.join(SRC, 'components', 'workout', 'NowCard.js'), 'utf8'),
    );
    expect(nowCard).not.toMatch(/warmup['"]?\s*\?\s*t\.colors\.warning/);
  });
});

describe('D173 T4: the particle machinery is deleted, the calm toast is not', () => {
  const PR_PATH = path.join(SRC, 'components', 'PRCelebration.js');
  const PR = code(fs.readFileSync(PR_PATH, 'utf8'));

  test('PRCelebration exports no MilestoneBurst', () => {
    expect(PR).not.toContain('MilestoneBurst');
    expect(PR).not.toMatch(/export\s+function\s+MilestoneBurst/);
  });

  test('none of the confetti machinery survives', () => {
    for (const symbol of ['NUM_PARTICLES', 'createParticle', 'buildPrPalette', 'buildGoldPalette']) {
      expect({ symbol, present: PR.includes(symbol) }).toEqual({ symbol, present: false });
    }
    // The particle style and the physics that drove it.
    expect(PR).not.toMatch(/\bparticles?\b/i);
    expect(PR).not.toContain('Math.random()');
  });

  test('nothing anywhere imports MilestoneBurst', () => {
    expect(filesMatching(/\bMilestoneBurst\b/, { includeStage4: true })).toEqual([]);
  });

  test('the calm bottom toast itself is untouched', () => {
    // T4 deletes the burst and NOTHING else: the default export is the calm,
    // auto-dismissing, screen-reader-announced toast, and it stays.
    expect(PR).toContain('export default function PRCelebration');
    expect(PR).toContain('announceForAccessibility');
    expect(PR).toContain('First lift logged');
    expect(PR).toContain('toastWrap');
  });

  test('the confetti palette tokens went with the confetti', () => {
    // D174, lead review. `celebrationEmber` / `celebrationViolet` existed for
    // buildPrPalette / buildGoldPalette and nothing else. Once T4 deleted
    // those, they were two dead brand colours sitting in the theme waiting to
    // be repurposed. Law 5 forbids the animation they were for, so nothing can
    // legitimately want them back.
    const THEME = code(fs.readFileSync(path.join(SRC, 'styles', 'theme.js'), 'utf8'));
    for (const role of ['celebrationEmber', 'celebrationViolet']) {
      expect({ role, defined: new RegExp(`\\b${role}\\s*:`).test(THEME) })
        .toEqual({ role, defined: false });
    }
    for (const hex of ['#FF6B35', '#9C27B0']) {
      expect({ hex, present: THEME.includes(hex) }).toEqual({ hex, present: false });
    }
    expect(filesMatching(/celebration(Ember|Violet)/, { includeStage4: true })).toEqual([]);
  });
});

describe('D174: the glow, which discipline 3 names alongside the props', () => {
  // The fourth co-occurring tell in §3 discipline 3 is "or a glow", and the
  // founder's own statement of the design law (plan §4a) says "No glow." in as
  // many words. `theme.js` used to record an exception permitting one: a Skia
  // glow on the Home Start button, plus `shadow.glow`, a brand-tinted soft
  // shadow for three Pro-moment hero surfaces.
  //
  // Neither survived contact with the tree. The Skia glow was NEVER BUILT --
  // there is no reference to it in HomeScreen. `shadow.glow` was down to two
  // consumers, one inside a style the file's own comment records as dead and
  // unreferenced, the other a decorative circle on a dormant billing screen.
  // So D174 removed the token, both consumers and the exception note. Removing
  // an unused permission is not removing a feature, and this suite is what
  // stops it being quietly re-granted.

  const THEME = code(fs.readFileSync(path.join(SRC, 'styles', 'theme.js'), 'utf8'));

  test('theme.js defines no glow token in either the frozen or the live shadow set', () => {
    // Both halves: the module-scope `shadow` export and resolveTheme's own
    // shadow object each carried a `get glow()`. One surviving would have left
    // the token reachable through exactly one of the two theme systems, which
    // is the frozen/live split this campaign has spent itself closing.
    expect(/get\s+glow\s*\(/.test(THEME)).toBe(false);
    expect(/\bglow\s*:/.test(THEME)).toBe(false);
  });

  test('nothing in src/ spreads or reads shadow.glow', () => {
    expect(filesMatching(/shadow\s*\.\s*glow\b/, { includeStage4: true })).toEqual([]);
  });
});
