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
 *  - NO exercise names (founder order 2026-09-26: "I don't want exercise
 *    names list to be an option or show at all as it does not fit in the
 *    share and looks stupid"). Even a caller that still hands over a name
 *    list gets none of it drawn, and the toggle is gone from the source.
 *  - the top lift is the one the athlete chose, drawn as a row, never over
 *    the footer, and a long name takes its own line rather than being cut.
 *  - the 2026-09-26 restyle ("Use styles from the rest of the app and none
 *    of the pill nonsense"): no pills, glows, lit frame, trophy or icons;
 *    the plan name is the card's section label.
 *  - over a photo the title sits at the top and the numbers at the bottom,
 *    so the middle of the photo stays clear.
 */
import { drawShareCard, cardHeight, sessionLiftsThatFit } from '../drawShareCard';

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

function record(params, width = 1080, bgPhoto = null) {
  const texts = [];
  const rrects = [];
  const rects = [];
  const canvas = new Proxy({}, {
    get: (_t, key) => {
      if (key === 'drawText') return (str, x, y) => texts.push({ str, x, y });
      if (key === 'drawRRect') return (r) => rrects.push(r.rect || {});
      if (key === 'drawRect') return (r) => rects.push(r);
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
    bgPhoto,
  });
  const strings = texts.map((t) => t.str);
  // Letter-spaced labels are drawn one character at a time (Skia has no
  // tracking), so a tracked caption is many drawText calls, not one. Assert
  // against the run as well as the individual strings.
  return { texts, rrects, rects, strings, run: strings.join('') };
}

// The footer's hairline: the lowest rule on the card. The footer draws its
// mark and address below it; the body must not.
const footerTopOf = (rects) => Math.max(...rects.filter((r) => r.h <= 2).map((r) => r.y));

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

describe('no exercise names on the card (founder order 2026-09-26)', () => {
  test('a name list handed over by an older caller draws none of it', () => {
    for (const aspect of ['square', 'portrait', 'story']) {
      const { strings, run } = record(SESSION({ aspect }));
      ['Ab Crunch Machine', 'Seated Leg Curl', 'Lying Leg Curl', 'Machine Curl', 'Face Pull'].forEach((name) => {
        expect(strings).not.toContain(name);
      });
      expect(run).not.toMatch(/\+\d+ more/);
    }
  });

  test('the exercise line and its toggle are gone from the renderer source', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'drawShareCard.js'), 'utf8',
    ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toContain('drawExerciseSummary');
    expect(src).not.toContain('showExercises');
    expect(src).not.toMatch(/p\.exercises\b/);
  });
});

describe('the top lift', () => {
  test('is drawn on every format, as the lift the athlete chose', () => {
    for (const aspect of ['square', 'portrait', 'story']) {
      const { run } = record(SESSION({ aspect }));
      expect(run).toContain('TOP LIFT');
      // withUnit joins the number to its unit with a non-breaking space, so
      // the pair can never wrap mid-token; match either kind of space.
      expect(run).toMatch(/180\skg × 10/);
      expect(run).toContain('Chest-Supported T-Bar Row');
    }
    const { run } = record(SESSION({ topSet: { weight: 60, reps: 12, exerciseName: 'Seated Leg Curl' } }));
    expect(run).toMatch(/60\skg × 12/);
    expect(run).toContain('Seated Leg Curl');
  });

  test('an exercise name that fits is not marked as truncated', () => {
    const { strings } = record(SESSION({
      topSet: { weight: 90, reps: 8, exerciseName: 'Lat Pulldown' },
    }));
    expect(strings).toContain('Lat Pulldown');
    expect(strings).not.toContain('Lat Pulldown…');
  });

  test('a name too long to sit beside the set takes its own line, uncut', () => {
    const name = 'Single Arm Chest-Supported Dumbbell Row';
    const { texts } = record(SESSION({ topSet: { weight: 40, reps: 10, exerciseName: name } }));
    const nameAt = texts.find((t) => t.str === name);
    const setAt = texts.find((t) => /40\skg × 10/.test(t.str));
    expect(nameAt).toBeTruthy();
    expect(setAt).toBeTruthy();
    expect(setAt.y).toBeGreaterThan(nameAt.y);
  });

  test('nothing is drawn over the footer on any format', () => {
    for (const aspect of ['square', 'portrait', 'story']) {
      for (const photo of [null, { width: () => 1000, height: () => 1500 }]) {
        const { texts, rects } = record(SESSION({ aspect }), 1080, photo);
        const footerTop = footerTopOf(rects);
        const body = texts.filter((t) => t.str !== 'volyume.app');
        body.forEach((t) => { expect(t.y).toBeLessThanOrEqual(footerTop); });
        expect(texts.find((t) => t.str === 'volyume.app').y).toBeGreaterThan(footerTop);
      }
    }
  });

  test('a session with no top lift simply omits it', () => {
    const { run } = record(SESSION({ topSet: null }));
    expect(run).not.toContain('TOP LIFT');
  });
});

describe('the app\'s style, not a poster template (2026-09-26 restyle)', () => {
  const SRC = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'drawShareCard.js'), 'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  test('no pills, glows, lit frame, trophy or stat icons remain in the renderer', () => {
    ['drawGlow', 'drawCardFrame', 'drawBackgroundGeometry', 'iconTrophy', 'iconDumbbell', 'iconClock', 'iconList', 'iconBars', 'STAT_ICONS', 'drawStatBoxes', 'drawElapsedBadge', 'MaskFilter'].forEach((name) => {
      expect(SRC).not.toContain(name);
    });
  });

  // Founder, 2026-09-26: "Need the amber outline we have in other areas of
  // the app", then, of an outline on the image's own edge, "that outline
  // isn't the outline of the content it looks too high". The one rounded
  // shape is that outline, round the content itself; rows and hairlines are
  // still the structure inside it.
  test('the one rounded shape is the outline, with every word on the card inside it', () => {
    for (const aspect of ['square', 'portrait', 'story']) {
      for (const photo of [null, { width: () => 1000, height: () => 1500 }]) {
        const H = cardHeight(1080, aspect !== 'story', aspect);
        const { rrects, texts } = record(SESSION({ aspect }), 1080, photo);
        expect(rrects).toHaveLength(1);
        const [o] = rrects;
        expect(o.x).toBeGreaterThan(0);
        expect(o.x + o.w).toBeLessThan(1080);
        texts.forEach((t) => {
          expect(t.x).toBeGreaterThanOrEqual(o.x);
          expect(t.x).toBeLessThanOrEqual(o.x + o.w);
          expect(t.y).toBeGreaterThan(o.y);
          expect(t.y).toBeLessThan(o.y + o.h);
        });
        // On a story it stays clear of the platform's bars at the top and
        // bottom, so none of it is hidden.
        if (aspect === 'story') {
          expect(o.y).toBeGreaterThanOrEqual(Math.round(H * 0.14));
          expect(o.y + o.h).toBeLessThanOrEqual(H - Math.round(H * 0.2));
        }
      }
    }
  });

  test('the outline hugs the content: no empty band inside it, top or bottom', () => {
    for (const aspect of ['square', 'portrait', 'story']) {
      for (const photo of [null, { width: () => 1000, height: () => 1500 }]) {
        const { rrects, texts } = record(SESSION({ aspect }), 1080, photo);
        const [o] = rrects;
        const first = Math.min(...texts.map((t) => t.y));
        const last = Math.max(...texts.map((t) => t.y));
        expect(first - o.y).toBeLessThan(120);
        expect(o.y + o.h - last).toBeLessThan(120);
      }
    }
  });

  test('the typefaces are the app\'s roles, with the system faces only as a fallback', () => {
    expect(SRC).toMatch(/case 'display': return tf\.display \|\| tf\.bold/);
    expect(SRC).toMatch(/case 'displayHeavy': return tf\.displayHeavy/);
  });
});

describe('over a photo, the middle stays clear', () => {
  const PHOTO = { width: () => 1000, height: () => 1500 };

  test('the title sits at the top and the numbers at the bottom on the story', () => {
    const H = cardHeight(1080, false, 'story');
    // prCount 0: the hero is then the total lifted, a string no other part
    // of the card draws.
    const { texts } = record(SESSION({ aspect: 'story', prCount: 0 }), 1080, PHOTO);
    const title = texts.find((t) => t.str === 'Back + Hams');
    const hero = texts.find((t) => t.str === '24,142');
    expect(title.y).toBeLessThan(H * 0.3);
    expect(hero.y).toBeGreaterThan(H * 0.45);
  });

  test('without a photo the same card is one centred block', () => {
    const { texts } = record(SESSION({ aspect: 'story', prCount: 0 }));
    const title = texts.find((t) => t.str === 'Back + Hams');
    const hero = texts.find((t) => t.str === '24,142');
    expect(hero.y - title.y).toBeLessThan(420);
  });
});

describe('the header', () => {
  test('the plan name is the card\'s label (not a pill) and stays behind its toggle', () => {
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

// Founder, 2026-09-26: "Is there an elegant way to do bodybuilding short
// quotes that people can insert", "Are there any stats that could be
// included ... We don't want to force them on but optional?" Nothing extra
// is drawn unless the screen hands it over; what is handed over is drawn in
// its place, and never over the footer.
describe('the optional quote and highlights', () => {
  const QUOTE = { text: 'Stimulate, don\u2019t annihilate.', by: 'Lee Haney' };
  const HIGHLIGHTS = ['Strongest workout in 4 weeks', '12% more than your 4-week average', 'A third line that must not fit'];

  test('none of it appears unless it is handed over', () => {
    const { strings, run } = record(SESSION());
    expect(run).not.toMatch(/\u201C/);
    expect(strings.some((t) => /Strongest workout/.test(t))).toBe(false);
  });

  test('a quote with a source is in curly quotes, with the source under it', () => {
    const { texts, run } = record(SESSION({ quote: QUOTE }));
    const q = texts.find((t) => t.str === '\u201CStimulate, don\u2019t annihilate.\u201D');
    expect(q).toBeTruthy();
    expect(run).toContain('LEE HANEY');
    const title = texts.find((t) => t.str === 'Back + Hams');
    expect(q.y).toBeGreaterThan(title.y);
  });

  test("the athlete's own words stand as a plain caption", () => {
    const { strings } = record(SESSION({ quote: { text: 'Back day done before work', by: null } }));
    expect(strings).toContain('Back day done before work');
    expect(strings.some((t) => /\u201C/.test(t))).toBe(false);
  });

  test('highlights sit under the hero, two at most, above the stat row', () => {
    const { texts, strings } = record(SESSION({ prCount: 0, highlights: HIGHLIGHTS }));
    const hero = texts.find((t) => t.str === '24,142');
    const first = texts.find((t) => t.str === HIGHLIGHTS[0]);
    const second = texts.find((t) => t.str === HIGHLIGHTS[1]);
    const sets = texts.find((t) => t.str === 'Sets');
    expect(first.y).toBeGreaterThan(hero.y);
    expect(second.y).toBeGreaterThan(first.y);
    expect(sets.y).toBeGreaterThan(second.y);
    expect(strings).not.toContain(HIGHLIGHTS[2]);
  });

  test('with every extra on, nothing is drawn over the footer on any format, photo or not', () => {
    for (const aspect of ['square', 'portrait', 'story']) {
      for (const photo of [null, { width: () => 1000, height: () => 1500 }]) {
        const { texts, rects } = record(SESSION({ aspect, quote: QUOTE, highlights: HIGHLIGHTS }), 1080, photo);
        const footerTop = footerTopOf(rects);
        texts.filter((t) => t.str !== 'volyume.app').forEach((t) => {
          expect(t.y).toBeLessThanOrEqual(footerTop);
        });
      }
    }
  });

  test('a character the typeface cannot draw is left out, never printed as a box', () => {
    const { drawShareCard: draw } = require('../drawShareCard');
    const drawn = [];
    const canvas = new Proxy({}, { get: (_t, key) => (key === 'drawText' ? (str) => drawn.push(str) : () => undefined) });
    const Skia = makeStubSkia();
    // A face with no glyph for anything outside the Basic Multilingual Plane
    // (where emoji live), as Inter has none.
    Skia.Font = (_tf, px) => ({
      getSize: () => px,
      getGlyphIDs: (str) => Array.from(String(str)).map((ch) => (ch.codePointAt(0) > 0xffff ? 0 : 1)),
      getGlyphWidths: (ids) => ids.map(() => px * 0.55),
    });
    draw(canvas, {
      Skia, width: 1080, params: SESSION({ quote: { text: 'Leg day \u{1F4AA} done', by: null } }), typefaces: { regular: {}, bold: {} }, wordmark: null,
    });
    expect(drawn).toContain('Leg day done');
    expect(drawn.some((t) => /\u{1F4AA}/u.test(t))).toBe(false);
  });
});

// Founder, 2026-09-26: "Could we do Top Lifts? And they can select more than
// one if they'd fit? Top Lift if only one selected Top Lifts if they select
// more than one. They don't have to select any number it's the end users
// choice."
describe('top lifts', () => {
  const LIFTS = [
    { exerciseName: 'Lat Pulldown', weight: 90, reps: 8 },
    { exerciseName: 'Seated Cable Row', weight: 75, reps: 10 },
    { exerciseName: 'Dumbbell Lateral Raise', weight: 14, reps: 15 },
  ];
  const MANY = Array.from({ length: 12 }, (_, i) => ({ exerciseName: `Lift ${i + 1}`, weight: 50 + i, reps: 8 }));
  const PHOTO = { width: () => 1000, height: () => 1500 };
  const fit = (params, lifts, bgPhoto = null) => sessionLiftsThatFit({
    Skia: makeStubSkia(), params, typefaces: { regular: {}, bold: {} }, wordmark: null, bgPhoto, lifts,
  });
  const drawnOf = (strings) => MANY.filter((l) => strings.includes(l.exerciseName));

  test('one chosen lift is labelled TOP LIFT, more than one TOP LIFTS', () => {
    const one = record(SESSION({ topSet: null, topLifts: LIFTS.slice(0, 1) }));
    expect(one.run).toContain('TOP LIFT');
    expect(one.run).not.toContain('TOP LIFTS');
    const three = record(SESSION({ aspect: 'story', topSet: null, topLifts: LIFTS }));
    expect(three.run).toContain('TOP LIFTS');
    LIFTS.forEach((l) => { expect(three.strings).toContain(l.exerciseName); });
  });

  test('the lifts are drawn in the order given, one under another', () => {
    const { texts } = record(SESSION({ aspect: 'story', topSet: null, topLifts: LIFTS }));
    const ys = LIFTS.map((l) => texts.find((t) => t.str === l.exerciseName).y);
    expect(ys[1]).toBeGreaterThan(ys[0]);
    expect(ys[2]).toBeGreaterThan(ys[1]);
  });

  test('choosing none draws no lift section at all', () => {
    const { run } = record(SESSION({ topSet: null, topLifts: [] }));
    expect(run).not.toContain('TOP LIFT');
  });

  test('only as many as fit are drawn, the first always, and the screen is told the same number', () => {
    for (const aspect of ['square', 'portrait', 'story']) {
      for (const photo of [null, PHOTO]) {
        for (const extras of [{}, { quote: { text: 'Stimulate, don\u2019t annihilate.', by: 'Lee Haney' }, highlights: ['Strongest workout in 4 weeks'] }]) {
          const params = SESSION({ aspect, topSet: null, topLifts: MANY, ...extras });
          const n = fit(params, MANY, photo);
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThan(MANY.length);
          const { strings, texts, rects } = record(params, 1080, photo);
          expect(drawnOf(strings)).toEqual(MANY.slice(0, n));
          const footerTop = footerTopOf(rects);
          texts.filter((t) => t.str !== 'volyume.app').forEach((t) => { expect(t.y).toBeLessThanOrEqual(footerTop); });
        }
      }
    }
  });

  test('the preview and the saved image, drawn at different widths, show the same lifts', () => {
    for (const aspect of ['square', 'portrait', 'story']) {
      const params = SESSION({ aspect, topSet: null, topLifts: MANY });
      expect(drawnOf(record(params, 640).strings)).toEqual(drawnOf(record(params, 1080).strings));
    }
  });

  test('a further lift never costs the title a line', () => {
    const sessionName = 'Back, Biceps and Rear Delts Volume Day';
    for (const aspect of ['square', 'portrait', 'story']) {
      const one = record(SESSION({ aspect, sessionName, topSet: null, topLifts: MANY.slice(0, 1) })).strings;
      // The title takes two lines here, so there is a line to lose.
      expect(one).not.toContain(sessionName);
      const more = record(SESSION({ aspect, sessionName, topSet: null, topLifts: MANY })).strings;
      one.filter((str) => !/^Lift \d+$/.test(str) && !/\u00D7/.test(str)).forEach((str) => { expect(more).toContain(str); });
    }
  });

  test('an older caller that sends one set still gets it drawn as the top lift', () => {
    const { run, strings } = record(SESSION());
    expect(run).toContain('TOP LIFT');
    expect(run).not.toContain('TOP LIFTS');
    expect(strings).toContain('Chest-Supported T-Bar Row');
  });
});
