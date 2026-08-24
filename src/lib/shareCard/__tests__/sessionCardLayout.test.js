/**
 * The session card's content, asserted rather than eyeballed.
 *
 * Founder device order 2026-08-24, on the share cards: make them look like
 * the reference, "But I don't want the epic session thing in it either."
 *
 * The card is drawn imperatively, so its output is normally only checkable
 * as pixels. Here it is driven with a recording canvas and a stub Skia: the
 * draw runs for real, every string and shape it emits is captured, and the
 * things that can silently go wrong are checked directly.
 *
 * What is pinned and why:
 *  - the intensity badge is GONE. It graded a session from thresholds the
 *    athlete never agreed to, directly under their own number.
 *  - the exercise line names two lifts and counts the rest honestly, rather
 *    than running five names to the edge and ellipsising the last.
 *  - the top lift never draws over the footer. Square is top-anchored with
 *    no overflow protection of its own, so an unconditional card printed
 *    straight through the brand mark; whether it fits is now measured.
 *  - a name that fits is not marked as truncated.
 */
import { drawShareCard, cardHeight } from '../drawShareCard';

// Every glyph one unit wide: measurement stays proportional to length, which
// is all the layout maths needs, and the assertions stay font-independent.
const stubFont = (px) => ({
  getSize: () => px,
  getGlyphIDs: (str) => new Array(String(str).length).fill(1),
  getGlyphWidths: (ids) => ids.map(() => px * 0.55),
});

function makeStubSkia() {
  return {
    Paint: () => ({
      setAntiAlias() {}, setColor() {}, setStyle() {}, setStrokeWidth() {},
      setMaskFilter() {}, setShader() {}, setAlphaf() {},
    }),
    Color: (c) => c,
    XYWHRect: (x, y, w, h) => ({ x, y, w, h }),
    RRectXY: (rect, rx, ry) => ({ rect, rx, ry }),
    Font: (_tf, px) => stubFont(px),
    MaskFilter: { MakeBlur: () => ({}) },
    Shader: { MakeLinearGradient: () => ({}), MakeRadialGradient: () => ({}) },
    Point: (x, y) => ({ x, y }),
    Data: { fromBytes: () => ({}) },
  };
}

function record(params, width = 1080) {
  const texts = [];
  const rrects = [];
  const canvas = new Proxy({}, {
    get: (_t, key) => {
      if (key === 'drawText') return (str, x, y) => texts.push({ str, x, y });
      if (key === 'drawRRect') return (r) => rrects.push(r.rect || {});
      return () => undefined;
    },
  });
  const Skia = makeStubSkia();
  drawShareCard(canvas, {
    Skia,
    width,
    params,
    typefaces: { regular: {}, bold: {} },
    wordmark: null,
  });
  const strings = texts.map((t) => t.str);
  // Letter-spaced labels are drawn one character at a time (Skia has no
  // tracking), so a tracked caption is many drawText calls, not one. Assert
  // against the run as well as the individual strings.
  return { texts, rrects, strings, run: strings.join('') };
}

const SESSION = (over = {}) => ({
  cardType: 'session',
  sessionName: 'Back + Hams',
  planName: 'Push Pull Legs',
  showPlanName: true,
  showDate: true,
  date: 'Mon · 24 Aug 2026',
  duration: 58,
  workingSets: 22,
  exerciseCount: 7,
  tonnage: 24142,
  showVolume: true,
  showExercises: true,
  exercises: ['Ab Crunch Machine', 'Seated Leg Curl', 'Lying Leg Curl', 'Machine Curl', 'Chest-Supported T-Bar Row', 'Cable Row', 'Face Pull'],
  prCount: 1,
  topSet: { weight: 180, reps: 10, exerciseName: 'Chest-Supported T-Bar Row' },
  intensityTier: 'epic',
  units: 'kg',
  aspect: 'portrait',
  ...over,
});

describe('the session card no longer grades the session', () => {
  for (const aspect of ['square', 'portrait', 'story']) {
    test(`no intensity badge on ${aspect}`, () => {
      const { strings } = record(SESSION({ aspect }));
      expect(strings).not.toContain('EPIC SESSION');
      expect(strings).not.toContain('TOUGH SESSION');
      expect(strings).not.toContain('SOLID SESSION');
    });
  }

  test('the tier can still be passed without it appearing anywhere', () => {
    for (const intensityTier of ['epic', 'tough', 'solid']) {
      expect(record(SESSION({ intensityTier })).run).not.toMatch(/SESSION/);
    }
  });

  test('the badge is gone from the source, not just unreachable', () => {
    // Comments stripped: the retirement is RECORDED in a comment where the
    // badge used to be drawn, which is the note a future reader needs.
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'drawShareCard.js'), 'utf8',
    ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toContain('EPIC SESSION');
    expect(src).not.toContain('drawIntensityBadge');
  });
});

describe('the exercise line', () => {
  test('names two lifts and counts the rest', () => {
    const { strings } = record(SESSION());
    expect(strings).toContain('Ab Crunch Machine');
    expect(strings).toContain('Seated Leg Curl');
    expect(strings).toContain('+5 more');
    // The names it did not show are not on the card at all.
    expect(strings).not.toContain('Lying Leg Curl');
  });

  test('two lifts exactly get no remainder', () => {
    const { strings } = record(SESSION({ exercises: ['Squat', 'Bench'] }));
    expect(strings).toContain('Squat');
    expect(strings).toContain('Bench');
    expect(strings.some((t) => /more/.test(t))).toBe(false);
  });

  test('the toggle still turns it off', () => {
    const { strings } = record(SESSION({ showExercises: false }));
    expect(strings).not.toContain('Ab Crunch Machine');
  });
});

describe('the top lift', () => {
  test('is drawn on every format when it fits', () => {
    for (const aspect of ['square', 'portrait', 'story']) {
      const { run } = record(SESSION({ aspect }));
      expect(run).toContain('TOP LIFT');
      // withUnit joins the number to its unit with a non-breaking space, so
      // the pair can never wrap mid-token; match either kind of space.
      expect(run).toMatch(/180\skg × 10/);
    }
  });

  test('an exercise name that fits is not marked as truncated', () => {
    const { strings } = record(SESSION({
      topSet: { weight: 90, reps: 8, exerciseName: 'Lat Pulldown' },
    }));
    expect(strings).toContain('Lat Pulldown');
    expect(strings).not.toContain('Lat Pulldown…');
  });

  test('nothing is drawn over the footer on any format', () => {
    for (const aspect of ['square', 'portrait', 'story']) {
      const H = cardHeight(1080, aspect !== 'story', aspect);
      const footerTop = H - (aspect === 'square' ? 128 : 150)
        - (aspect === 'story' ? Math.round(H * 0.2) : 0);
      const { texts, rrects } = record(SESSION({ aspect }));
      // The footer draws its own mark below this line; the BODY must not.
      const body = texts.filter((t) => t.str !== 'volyume.app');
      body.forEach((t) => { expect(t.y).toBeLessThanOrEqual(footerTop); });
      // The top-lift card is the tallest thing the body can add.
      rrects.filter((r) => r.h > 60).forEach((r) => {
        // The card frame itself spans the whole canvas by design.
        if (r.h > H * 0.8) return;
        expect(r.y + r.h).toBeLessThanOrEqual(footerTop);
      });
    }
  });

  test('a session with no top set simply omits it', () => {
    const { run } = record(SESSION({ topSet: null }));
    expect(run).not.toContain('TOP LIFT');
  });
});

describe('the header', () => {
  test('the plan name rides in its own pill and stays behind its toggle', () => {
    expect(record(SESSION()).run).toContain('PUSH PULL LEGS');
    expect(record(SESSION({ showPlanName: false })).run).not.toContain('PUSH PULL LEGS');
  });

  test('nothing generic is invented when there is no plan', () => {
    expect(record(SESSION({ planName: null })).run).not.toMatch(/STRENGTH/i);
  });

  test('the session name is the title', () => {
    expect(record(SESSION()).strings).toContain('Back + Hams');
  });
});
