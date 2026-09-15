/**
 * shareCardProps.guard.test.js -- the share card's props stay gone (D180, stage 4).
 *
 * AUTHORITY. `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`
 * D180 part 1, whose parent is `docs/design-redesign-2026-09-14/
 * 20-DIRECTION-AND-PLAN.md` §3 (the four amber disciplines), §5 (the laws) and
 * §4a, the founder's own statement of the design law: "No gamification. No
 * decorative fitness iconography. No gradients. No glow. No neon."
 *
 * WHY THIS FILE EXISTS. `src/lib/shareCard/` was held OUT of the stage 1-3
 * sweeps on purpose -- D173 named it and sequenced it here rather than
 * recolouring it piecemeal -- so it is the last place the removed props
 * survived, and `rewardProps.guard.test.js` still carries a path exemption for
 * it (`STAGE_4 = 'lib/shareCard/'`). That exemption was a recorded decision
 * with a destination; this suite is the destination. The renderer is a pure
 * imperative Skia routine with no React tree to query, so the contract is
 * pinned against the SOURCE, exactly as `brandLockup.guard.test.js` pins the
 * brand lockup in the same file.
 *
 * WHAT THIS SUITE PINS, and why each case is written to FAIL.
 *
 *  1. `PALETTE` holds no `gold` key and none of the medal hexes. D173 T1
 *     deleted gold/silver/bronze from `theme.js`; this canvas carried its own
 *     copy of #FFD700 and is whitelisted to hold raw hex, so the value is
 *     pinned as well as the key -- a deleted token is only deleted until
 *     somebody needs "a nice warm yellow".
 *  2. `drawGlow` and `iconTrophy` do not exist, and nothing calls them. Both
 *     are DEFINITION-and-call-site cases: a helper left behind is a
 *     capability, and the whole point of deleting the glow helper rather than
 *     its five call sites alone is that it cannot come back by accident.
 *  3. The PR card draws no plate. `drawPR` contains no `fillRRect` or
 *     `strokeRRect` at all now: "PERSONAL RECORD" is a letter-spaced eyebrow
 *     in muted ink, and law 2 is that a pill drawn round a label is not an
 *     object.
 *  4. The hero numeral KEEPS `PALETTE.accent`. D180: "Discipline 1 grants
 *     amber 'a personal best' by name, and after the above it is the ONE
 *     amber on the card. That is the point." A later sweep reading "remove
 *     the props" as "neutralise the card" would take the wrong thing.
 *  5. The sweep did not over-reach. The milestone ring, the seven weekly
 *     day-ticks, the before/after seam and the per-moment tonal grounds are
 *     all still drawn -- D180 keeps them, the first three because they are
 *     geometry rather than glow, the grounds because "a share card is a
 *     rendered image someone posts, not a screen someone operates", so its
 *     tonal ground is the poster's paper rather than a decorative gradient.
 *
 * SCOPE. Product source in `src/lib/shareCard/` only; `__tests__` and
 * `*.test.js` are excluded, exactly as `rewardProps.guard.test.js` scopes its
 * own greps, because a guard that pins ABSENCE has to be allowed to name the
 * thing it bans. Comments are stripped before matching (the `code()` helper),
 * so the renderer's own docblocks -- which now explain in prose which props
 * they lost, and quote the hex -- are never read as the props coming back.
 *
 * NOT IN SCOPE, and deliberately so: what the card SAYS. The GDPR/ED contract
 * (no name, no measurements, no private notes; bodyweight only on the
 * founder-approved before/after card, which is withheld entirely under calm
 * mode or an open ED flag) is pinned by `BeforeAfterShareSheet.test.js` and
 * `greatWeek.test.js` against the PAYLOAD builders. D180 changed paint, never
 * payload, and this suite stays on the same side of that line.
 */
import fs from 'fs';
import path from 'path';

const DIR = path.resolve(__dirname, '..');

/** Strip comments, so a rule NAMED in a docblock is never read as code. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

// Product source only -- same posture as rewardProps.guard.test.js.
const sources = fs.readdirSync(DIR, { withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith('.js') && !e.name.endsWith('.test.js'))
  .map((e) => ({ file: e.name, text: code(fs.readFileSync(path.join(DIR, e.name), 'utf8')) }));

const RENDERER = sources.find((s) => s.file === 'drawShareCard.js');

/**
 * Every match of `re` across the folder, as "file:line  <the line>", so a
 * failure NAMES the site rather than reporting a bare true/false.
 */
function hits(re) {
  const out = [];
  sources.forEach((s) => {
    s.text.split('\n').forEach((line, i) => {
      if (new RegExp(re.source, re.flags.replace('g', '')).test(line)) {
        out.push(`${s.file}:${i + 1}  ${line.trim()}`);
      }
    });
  });
  return out;
}

/** The body of a top-level `function name(` up to the next top-level function. */
function functionBody(name) {
  const start = RENDERER.text.indexOf(`function ${name}(`);
  if (start < 0) return '';
  const rest = RENDERER.text.slice(start + 1);
  const end = rest.indexOf('\nfunction ');
  return end < 0 ? rest : rest.slice(0, end);
}

describe('D180: the medal colour is gone from the card as well as the app', () => {
  test('PALETTE defines no gold key', () => {
    expect(hits(/\bgold\s*:/)).toEqual([]);
  });

  test('none of the medal hexes survive anywhere in the folder', () => {
    // The value, not just the name: this canvas is whitelisted to hold raw
    // hex (it cannot import theme.js), so the role could return under any
    // key at all if only the key were pinned.
    for (const hex of ['#FFD700', '#C0C0C0', '#CD7F32']) {
      expect({ hex, sites: hits(new RegExp(hex, 'i')) }).toEqual({ hex, sites: [] });
    }
  });

  test('nothing reads PALETTE.gold', () => {
    expect(hits(/PALETTE\s*\.\s*gold\b/)).toEqual([]);
  });
});

describe('D180: the glow helper and the trophy glyph do not exist', () => {
  test('drawGlow is neither defined nor called', () => {
    // Five call sites went with it: the PR numeral's halo, the PR and session
    // background corners, and the card frame's two lit corners.
    expect(hits(/\bdrawGlow\b/)).toEqual([]);
  });

  test('iconTrophy is neither defined nor called', () => {
    // One call site, the session card's top-lift row. D173 T3: a personal
    // record is stated as a fact, in words and a number.
    expect(hits(/\biconTrophy\b/)).toEqual([]);
  });

  test('no blur mask filter survives, which is what a glow was made of', () => {
    // The capability, not just the helper. MaskFilter.MakeBlur was also the
    // least portable corner of the Skia surface between the CanvasKit build
    // the harness renders with and the JsiSk build on device.
    expect(hits(/MaskFilter|MakeBlur|BLUR_NORMAL/)).toEqual([]);
  });
});

describe('D180: the PR card states a fact, with no chrome round it', () => {
  const drawPR = functionBody('drawPR');

  test('the suite is actually reading the PR card', () => {
    expect(drawPR).toContain("const label = 'PERSONAL RECORD'");
  });

  test('the eyebrow is letter-spaced muted ink, not a pill', () => {
    expect(drawPR).toMatch(/textTracked\(cv, Skia, label, W \/ 2, [^;]*PALETTE\.textMuted, 'center', Math\.round\(3 \* s\)\);/);
  });

  test('the PR card draws no plate of any kind', () => {
    // The pill was a fillRRect + strokeRRect pair round three words. Nothing
    // in this card is an object in law 2's sense, so no rounded rect belongs
    // in it at all -- pinned as the absence of the primitives, so a plate
    // cannot return in a different colour or round a different label.
    expect({ fills: /fillRRect\(/.test(drawPR), strokes: /strokeRRect\(/.test(drawPR) })
      .toEqual({ fills: false, strokes: false });
  });

  test('the hero numeral KEEPS its amber', () => {
    // The one thing on this card the campaign is NOT removing.
    expect(drawPR).toMatch(/text\(cv, Skia, wStr, W \/ 2, ey \+ wFont\.getSize\(\), wFont, PALETTE\.accent, 'center'\)/);
  });

  test('the card still says what it is and what it beat', () => {
    // Paint changed, payload did not: the eyebrow, the exercise name, the
    // hero and the previous-best line are all still drawn.
    expect(drawPR).toContain('p.exerciseName');
    expect(drawPR).toContain('Previous best:');
    expect(drawPR).toContain('p.showPrevBest && p.previousBest');
  });
});

describe('D180: what the sweep must NOT have taken', () => {
  const geometry = functionBody('drawBackgroundGeometry');

  test('the milestone ring is still drawn', () => {
    expect(geometry).toMatch(/cardType === 'milestone'/);
    expect(geometry).toMatch(/canvas\.drawCircle\(W \* 1\.04, H \* 0\.2, W \* 0\.5, paint\)/);
  });

  test('the seven weekly day-ticks are still drawn', () => {
    expect(geometry).toMatch(/cardType === 'weekly'/);
    expect(geometry).toMatch(/for \(let i = 0; i < 7; i \+= 1\)/);
  });

  test('the before/after seam is still drawn', () => {
    expect(geometry).toMatch(/cardType === 'beforeAfter'/);
    expect(geometry).toMatch(/fillRect\(canvas, Skia, W \/ 2 - Math\.max\(1, W \* 0\.0015\)/);
  });

  test('the per-moment tonal grounds stay, all five of them', () => {
    // D180 ruled these IN, against §4a's "No gradients", and surfaced the
    // judgement to the founder rather than treating it as settled: a
    // near-black warm-to-neutral tonal shift on a poster is the paper, not an
    // effect, and flattening it would lose depth the medium legitimately has.
    for (const moment of ['pr', 'session', 'milestone', 'weekly', 'beforeAfter']) {
      expect({ moment, present: new RegExp(`${moment}: \\{ stops:`).test(RENDERER.text) })
        .toEqual({ moment, present: true });
    }
    expect(RENDERER.text).toContain('MakeLinearGradient');
  });

  test('the card frame keeps its rule, having lost its lit corners', () => {
    const frame = functionBody('drawCardFrame');
    expect(frame).toMatch(/strokeRRect\(canvas, Skia, inset, inset, w, h, r, rgba\(PALETTE\.accent, 0\.55\)/);
    expect(frame).toMatch(/strokeRRect\(canvas, Skia, inset, inset, w, h, r, rgba\(PALETTE\.accent, 0\.12\)/);
  });
});

describe('D180: every ornament still degrades rather than crashing', () => {
  test('the accent geometry and the gradient each stay inside a try/catch', () => {
    // Founder device failure 2026-08-18, recorded in the renderer: "a card
    // without its ornament is still a card, a card that cannot draw is not".
    // Removing the glow must not have taken a guard with it.
    const crafted = functionBody('drawCraftedBackground');
    expect(crafted).toContain('fillRect(canvas, Skia, 0, 0, W, H, PALETTE.bg0)');
    expect((crafted.match(/try \{/g) || []).length).toBeGreaterThanOrEqual(2);
    expect((crafted.match(/catch \(_e\)/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
