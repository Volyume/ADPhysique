/**
 * BodyDiagramHeatmap.test.js
 *
 * Two generations of pins live here.
 *
 * AX-04 (launch accessibility audit,
 * docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md-linked audit
 * file): the figure used to put press handlers AND accessibility props
 * (accessible/accessibilityRole="button"/accessibilityLabel) on individual
 * react-native-svg shapes, roughly 15-29dp touch/focus targets with bilateral
 * shapes repeating identical labels. The diagram is ONE labelled summary image
 * for assistive tech; per-shape accessibility props are gone; the screen's
 * muscle rows are the real accessible path. Still pinned, and re-anchored to
 * the new drawing (D214, build lane 1, plan
 * docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md sections 7.2 c, 7.4 and 7.5):
 *   1. No shape of any kind (muscle, hit twin, marker, silhouette part)
 *      carries `accessible`, `accessibilityRole` or `accessibilityLabel`.
 *   2. Every visible shape and every hit twin keeps its sighted `onPress`, and
 *      it reports its OWN muscle.
 *   3. Exactly one accessibilityRole="image" node, with a summary label that
 *      names what it shows and counts the muscles, now out of SEVENTEEN (the
 *      ellipse figure drew fourteen: side delts, neck and tibialis had no
 *      region).
 *
 * D214 additions, each written to fail on the ellipse drawing:
 *   4. ALL SEVENTEEN engine keys are drawn: neck, front_delts, side_delts,
 *      chest, biceps, forearms, abs, quads, adductors, tibialis, calves, traps,
 *      rear_delts, back, triceps, glutes, hamstrings; sixty-two muscle paths,
 *      thirty-four on the front view and twenty-eight on the back, nine
 *      silhouette parts per view drawn as an outline pass then a fill pass.
 *   5. The hit model: a transparent twin (same geometry, wider stroke) behind
 *      every shape whose smaller side is more than 2 units short of a 24 dp
 *      target on a 412 dp phone (stroke re-derived here from the path data, so
 *      the baked table cannot drift), and the draw order that IS the no-overlap
 *      rule: silhouette, then twins (smallest region last), then the visible
 *      muscles, then the markers, so a twin can never cover a neighbour's
 *      visible shape. react-native-svg hit-tests the topmost shape first and a
 *      handler-less shape swallows the touch, so the order is behaviour.
 *   6. The selected state: a 1.5 px textPrimary outline on all of that
 *      muscle's shapes, drawn last.
 *   7. The volume palette and its legend: fill from the entry's colour, "No
 *      sets" with no fill and a hairline; six legend entries in order through
 *      LegendRow, with the plain-English tooltip kept.
 *   8. The division markers: still anchored beside the right muscles on BOTH
 *      views (each anchor re-derived from the path data and checked to lie
 *      inside one of the muscle's own shapes), ink not amber, and
 *      `pointerEvents="none"` so a tap on a marker reaches the muscle.
 *   9. Source guards: no raw hex, no amber token anywhere in the file (a status
 *      surface carries no amber), no ellipse primitives, and the F6 division
 *      legend copy that VolumeHeatmapScreen.test.js pins by source.
 *
 * react-native-svg is mocked (native-only, cannot run in the node test env).
 * `useTheme` is the real `resolveTheme` of a mutable preference object so
 * dark, light and colour-blind-safe can each be asked for by name.
 */
import fs from 'fs';
import path from 'path';
import { create } from 'react-test-renderer';
import { Text } from 'react-native';
import { resolveTheme, alpha, withAlpha } from '../../styles/theme';
import InfoTooltip from '../InfoTooltip';

jest.mock('react-native-svg', () => {
  const RN = require('react');
  const mk = (name) => (props) => RN.createElement(name, props, props.children);
  return {
    __esModule: true,
    Svg: mk('Svg'), G: mk('G'), Path: mk('Path'),
    default: mk('Svg'),
  };
});
let mockPrefs = {};
jest.mock('../../hooks/useTheme', () => () => require('../../styles/theme').resolveTheme(mockPrefs));

const BodyDiagramHeatmap = require('../BodyDiagramHeatmap').default;

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'BodyDiagramHeatmap.js'), 'utf8');
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

// All seventeen engine keys, named here on purpose: this list is the contract.
const SEVENTEEN = [
  'neck', 'front_delts', 'side_delts', 'chest', 'biceps', 'forearms', 'abs', 'quads', 'adductors',
  'tibialis', 'calves', 'traps', 'rear_delts', 'back', 'triceps', 'glutes', 'hamstrings',
];
const FRONT_KEYS = ['neck', 'front_delts', 'side_delts', 'chest', 'biceps', 'forearms', 'abs', 'quads', 'adductors', 'tibialis', 'calves'];
const BACK_KEYS = ['traps', 'rear_delts', 'side_delts', 'back', 'triceps', 'forearms', 'glutes', 'hamstrings', 'calves'];

const VOLUME_BY_MUSCLE = {
  chest: { workingSets: 10, status: 'optimal', color: '#0a0', label: 'Good range' },
  biceps: { workingSets: 0, status: 'below', color: '#999', label: 'Below target' },
};

// ─── tree helpers (host nodes only: the mocks make every shape two nodes) ────
const host = (tree, pred) => tree.root.findAll((n) => typeof n.type === 'string' && pred(n));
const paths = (tree) => host(tree, (n) => n.type === 'Path');
const idOf = (n) => n.props.testID || '';
const visibleShapes = (tree) => paths(tree).filter((n) => /^muscle-(?!hit-)/.test(idOf(n)));
const hitTwins = (tree) => paths(tree).filter((n) => /^muscle-hit-/.test(idOf(n)));
const markers = (tree) => paths(tree).filter((n) => /^division-marker-/.test(idOf(n)));
const keyOf = (n) => idOf(n).replace(/^muscle-(hit-)?/, '');
const shapesOf = (tree, key) => visibleShapes(tree).filter((n) => keyOf(n) === key);
const viewGroups = (tree) => host(tree, (n) => n.type === 'G' && typeof n.props.x === 'number');
const texts = (tree) => tree.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));
const imageNodes = (tree) => host(tree, (n) => n.props.accessibilityRole === 'image');
const flat = (style) => Object.assign({}, ...[].concat(style || []).flat(Infinity).filter(Boolean));
const swatches = (tree) => host(tree, (n) => n.props.testID === 'legend-swatch').map((s) => flat(s.props.style));

// ─── geometry helpers (M / L / C / Z, absolute, as the figure data uses) ─────
function polygon(d) {
  const tokens = d.match(/[MLCZ]|-?\d*\.?\d+/g);
  const pts = [];
  let i = 0; let cmd = null; let x = 0; let y = 0; let sx = 0; let sy = 0;
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/[MLCZ]/.test(tokens[i])) cmd = tokens[i++];
    if (cmd === 'M') { x = num(); y = num(); sx = x; sy = y; pts.push([x, y]); cmd = 'L'; }
    else if (cmd === 'L') { x = num(); y = num(); pts.push([x, y]); }
    else if (cmd === 'C') {
      const [x1, y1, x2, y2, x3, y3] = [num(), num(), num(), num(), num(), num()];
      for (let k = 1; k <= 24; k += 1) {
        const u = k / 24; const v = 1 - u;
        pts.push([
          v * v * v * x + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3,
          v * v * v * y + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3,
        ]);
      }
      x = x3; y = y3;
    } else if (cmd === 'Z') { pts.push([sx, sy]); x = sx; y = sy; cmd = null; }
  }
  return pts;
}
function box(d) {
  const pts = polygon(d);
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs); const x1 = Math.max(...xs); const y0 = Math.min(...ys); const y1 = Math.max(...ys);
  return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 };
}
function inside(pt, d) {
  const poly = polygon(d);
  let hit = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a, a += 1) {
    const [xa, ya] = poly[a]; const [xb, yb] = poly[b];
    if ((ya > pt.y) !== (yb > pt.y) && pt.x < ((xb - xa) * (pt.y - ya)) / (yb - ya) + xa) hit = !hit;
  }
  return hit;
}
// 24 dp on a 412 dp phone: the figure card leaves 348 dp for the 360 unit viewBox.
const TARGET_UNITS = 24 / ((412 - 64) / 360);

beforeEach(() => { mockPrefs = {}; });

describe('BodyDiagramHeatmap accessibility structure (AX-04)', () => {
  test('no SVG shape of any kind carries per-shape accessibility props', () => {
    const tree = create(
      <BodyDiagramHeatmap volumeByMuscle={VOLUME_BY_MUSCLE} onMuscleTap={() => {}} divisionMarkers={{ chest: 'elevated', calves: 'capped' }} divisionLabel="Bikini" selectedMuscle="chest" />,
    );
    const shapes = paths(tree);
    expect(shapes.length).toBeGreaterThan(100); // muscles + twins + markers + silhouette parts
    expect(visibleShapes(tree)).toHaveLength(62);
    expect(markers(tree).length).toBeGreaterThan(0);
    for (const shape of shapes) {
      expect(shape.props.accessible).toBeUndefined();
      expect(shape.props.accessibilityRole).toBeUndefined();
      expect(shape.props.accessibilityLabel).toBeUndefined();
    }
  });

  test('shapes keep their sighted onPress, and each one reports its own muscle', () => {
    const onMuscleTap = jest.fn();
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={VOLUME_BY_MUSCLE} onMuscleTap={onMuscleTap} />);
    const pressable = [...visibleShapes(tree), ...hitTwins(tree)];
    expect(pressable.length).toBeGreaterThan(62);
    pressable.forEach((shape) => {
      expect(typeof shape.props.onPress).toBe('function');
      onMuscleTap.mockClear();
      shape.props.onPress();
      expect(onMuscleTap).toHaveBeenCalledTimes(1);
      expect(onMuscleTap).toHaveBeenCalledWith(keyOf(shape));
    });
  });

  test('a press with no onMuscleTap is a no-op, never a throw', () => {
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={VOLUME_BY_MUSCLE} />);
    expect(() => visibleShapes(tree)[0].props.onPress()).not.toThrow();
  });

  test('exactly one accessibilityRole="image" node summarises the whole diagram', () => {
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={VOLUME_BY_MUSCLE} onMuscleTap={() => {}} />);
    const nodes = imageNodes(tree);
    expect(nodes).toHaveLength(1);
    const label = nodes[0].props.accessibilityLabel;
    expect(typeof label).toBe('string');
    // Names what it shows (front/back, volume) and how many of the SEVENTEEN
    // drawn muscles have logged volume: here only chest has workingSets > 0.
    expect(label).toMatch(/front and back/i);
    expect(label).toMatch(/weekly training volume/i);
    expect(label).toMatch(/1 of 17 muscles/);
    expect(nodes[0].props.accessible).toBe(true);
  });

  test('the summary label tracks how many drawn muscles have logged volume', () => {
    const none = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} />);
    expect(imageNodes(none)[0].props.accessibilityLabel).toMatch(/0 of 17 muscles/);
    const all = {};
    SEVENTEEN.forEach((m) => { all[m] = { workingSets: 4 }; });
    const full = create(<BodyDiagramHeatmap volumeByMuscle={all} onMuscleTap={() => {}} />);
    expect(imageNodes(full)[0].props.accessibilityLabel).toMatch(/17 of 17 muscles/);
  });
});

describe('all seventeen engine keys are drawn', () => {
  test.each(SEVENTEEN.map((k) => [k]))('%s has at least one muscle shape', (key) => {
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} />);
    expect(shapesOf(tree, key).length).toBeGreaterThan(0);
    shapesOf(tree, key).forEach((s) => expect(typeof s.props.d).toBe('string'));
  });

  test('exactly those seventeen keys, sixty-two shapes: thirty-four front, twenty-eight back', () => {
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} />);
    expect([...new Set(visibleShapes(tree).map(keyOf))].sort()).toEqual([...SEVENTEEN].sort());
    const [front, back] = viewGroups(tree);
    const inView = (g) => host({ root: g }, (n) => n.type === 'Path' && /^muscle-(?!hit-)/.test(idOf(n)));
    expect(inView(front)).toHaveLength(34);
    expect(inView(back)).toHaveLength(28);
    expect([...new Set(inView(front).map(keyOf))].sort()).toEqual([...FRONT_KEYS].sort());
    expect([...new Set(inView(back).map(keyOf))].sort()).toEqual([...BACK_KEYS].sort());
  });

  test('the back view is the front translated by 200 inside one 360 x 320 viewBox', () => {
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} />);
    const svg = host(tree, (n) => n.type === 'Svg')[0];
    expect(svg.props.viewBox).toBe('0 0 360 320');
    const [front, back] = viewGroups(tree);
    expect(front.props.x).toBe(0);
    expect(back.props.x).toBe(200);
  });

  test('every shape stays inside its own 160 x 320 view', () => {
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} />);
    visibleShapes(tree).forEach((s) => {
      const b = box(s.props.d);
      expect(b.x0).toBeGreaterThanOrEqual(20);
      expect(b.x1).toBeLessThanOrEqual(140);
      expect(b.y0).toBeGreaterThanOrEqual(40);
      expect(b.y1).toBeLessThanOrEqual(300);
    });
  });

  test('the silhouette is nine parts per view, an outline pass then a fill pass, with no handler', () => {
    const t = resolveTheme({});
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} />);
    viewGroups(tree).forEach((g) => {
      const parts = host({ root: g }, (n) => n.type === 'Path' && !n.props.testID);
      expect(parts).toHaveLength(18);
      const outline = parts.slice(0, 9);
      const fill = parts.slice(9);
      outline.forEach((p) => {
        expect(p.props).toMatchObject({ fill: 'none', stroke: t.colors.border, strokeWidth: 2, strokeLinejoin: 'round' });
        expect(p.props.onPress).toBeUndefined();
      });
      fill.forEach((p) => {
        expect(p.props.fill).toBe(t.colors.surface);
        expect(p.props.stroke).toBeUndefined();
        expect(p.props.onPress).toBeUndefined();
      });
      // The two passes are the same nine shapes.
      expect(fill.map((p) => p.props.d)).toEqual(outline.map((p) => p.props.d));
    });
  });
});

describe('the hit model: enlarged transparent twins, and the draw order that is the no-overlap rule', () => {
  test('a twin exists for exactly the shapes more than 2 units short of a 24 dp target, with the derived stroke', () => {
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} />);
    const twins = hitTwins(tree);
    let expectedTwins = 0;
    // Per view: the front and back share some identical geometry (the forearms, the side delts).
    viewGroups(tree).forEach((g) => {
      const inView = (re) => host({ root: g }, (n) => n.type === 'Path' && re.test(idOf(n)));
      const viewTwins = inView(/^muscle-hit-/);
      inView(/^muscle-(?!hit-)/).forEach((shape) => {
        const b = box(shape.props.d);
        const need = TARGET_UNITS - Math.min(b.w, b.h);
        const stroke = need >= 2 ? Math.ceil(need) : 0;
        const matching = viewTwins.filter((tw) => tw.props.d === shape.props.d && keyOf(tw) === keyOf(shape));
        if (stroke > 0) {
          expectedTwins += 1;
          expect(matching).toHaveLength(1);
          expect(matching[0].props.strokeWidth).toBe(stroke);
          // The twin reaches the target in both directions.
          expect(b.w + stroke).toBeGreaterThanOrEqual(TARGET_UNITS - 1e-9);
          expect(b.h + stroke).toBeGreaterThanOrEqual(TARGET_UNITS - 1e-9);
        } else {
          expect(matching).toHaveLength(0);
        }
      });
    });
    expect(twins).toHaveLength(expectedTwins);
    // Thirty-four paths are under 12 dp in one dimension at this width (plan 7.5); all of them have a twin.
    const small = visibleShapes(tree).filter((s) => {
      const b = box(s.props.d);
      return Math.min(b.w, b.h) * (348 / 360) < 12;
    });
    expect(small).toHaveLength(34);
    small.forEach((s) => expect(twins.some((tw) => tw.props.d === s.props.d)).toBe(true));
  });

  test('a twin is transparent, rounded, same geometry as a visible shape of the same muscle', () => {
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} />);
    hitTwins(tree).forEach((tw) => {
      expect(tw.props).toMatchObject({ fill: 'transparent', stroke: 'transparent', strokeLinejoin: 'round', strokeLinecap: 'round' });
      expect(tw.props.strokeWidth).toBeGreaterThanOrEqual(2);
      expect(shapesOf(tree, keyOf(tw)).some((s) => s.props.d === tw.props.d)).toBe(true);
    });
  });

  test('every muscle has a target of at least 24 dp in each direction from its largest shape plus its twin', () => {
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} />);
    SEVENTEEN.forEach((key) => {
      const reach = shapesOf(tree, key).map((s) => {
        const b = box(s.props.d);
        const tw = hitTwins(tree).find((t2) => t2.props.d === s.props.d);
        const extra = tw ? tw.props.strokeWidth : 0;
        return Math.min(b.w + extra, b.h + extra);
      });
      expect(Math.max(...reach)).toBeGreaterThanOrEqual(TARGET_UNITS - 1e-9);
    });
  });

  test('draw order, bottom to top: silhouette, twins, visible muscles, markers', () => {
    const tree = create(
      <BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} divisionMarkers={{ chest: 'elevated', quads: 'capped', back: 'elevated' }} divisionLabel="Bikini" />,
    );
    const rank = (n) => {
      const id = idOf(n);
      if (!id) return 0;
      if (id.startsWith('muscle-hit-')) return 1;
      if (id.startsWith('muscle-')) return 2;
      return 3; // division-marker-
    };
    viewGroups(tree).forEach((g) => {
      const order = host({ root: g }, (n) => n.type === 'Path').map(rank);
      expect(order).toEqual([...order].sort((a, b) => a - b));
      expect(new Set(order)).toEqual(new Set([0, 1, 2, 3]));
    });
  });

  test('twins are drawn smallest region last, so a tiny muscle keeps the bare skin around it', () => {
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} />);
    viewGroups(tree).forEach((g) => {
      const strokes = host({ root: g }, (n) => n.type === 'Path' && /^muscle-hit-/.test(idOf(n))).map((n) => n.props.strokeWidth);
      expect(strokes).toEqual([...strokes].sort((a, b) => a - b));
    });
  });

  test('the abs, quads and tibialis keys each have several shapes and the twins to join them', () => {
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} />);
    expect(shapesOf(tree, 'abs')).toHaveLength(10); // four rectus rows a side and an oblique each side
    expect(shapesOf(tree, 'quads')).toHaveLength(6);
    expect(shapesOf(tree, 'tibialis')).toHaveLength(2);
    expect(hitTwins(tree).filter((t2) => keyOf(t2) === 'abs').length).toBeGreaterThan(0);
  });
});

describe('the selected muscle is outlined in ink and drawn last', () => {
  test('all of its shapes take a 1.5 px textPrimary stroke; no other muscle does', () => {
    const t = resolveTheme({});
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={VOLUME_BY_MUSCLE} onMuscleTap={() => {}} selectedMuscle="quads" />);
    shapesOf(tree, 'quads').forEach((s) => {
      expect(s.props.stroke).toBe(t.colors.textPrimary);
      expect(s.props.strokeWidth).toBe(1.5);
    });
    visibleShapes(tree).filter((s) => keyOf(s) !== 'quads').forEach((s) => {
      expect(s.props.stroke).not.toBe(t.colors.textPrimary);
      expect(s.props.strokeWidth).not.toBe(1.5);
    });
  });

  test('with no selection, nothing is outlined in ink', () => {
    const t = resolveTheme({});
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={VOLUME_BY_MUSCLE} onMuscleTap={() => {}} />);
    visibleShapes(tree).forEach((s) => expect(s.props.stroke).not.toBe(t.colors.textPrimary));
  });

  test('the selected muscle\'s shapes are the last visible shapes in their view', () => {
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} selectedMuscle="calves" />);
    viewGroups(tree).forEach((g) => {
      const order = host({ root: g }, (n) => n.type === 'Path' && /^muscle-(?!hit-)/.test(idOf(n))).map(keyOf);
      const firstSelected = order.indexOf('calves');
      expect(firstSelected).toBeGreaterThan(-1);
      expect(order.slice(firstSelected).every((k) => k === 'calves')).toBe(true);
    });
  });

  test('selecting a muscle never changes its fill, and its shapes stay pressable', () => {
    const onMuscleTap = jest.fn();
    const plain = create(<BodyDiagramHeatmap volumeByMuscle={VOLUME_BY_MUSCLE} onMuscleTap={onMuscleTap} />);
    const picked = create(<BodyDiagramHeatmap volumeByMuscle={VOLUME_BY_MUSCLE} onMuscleTap={onMuscleTap} selectedMuscle="chest" />);
    expect(shapesOf(picked, 'chest').map((s) => s.props.fill)).toEqual(shapesOf(plain, 'chest').map((s) => s.props.fill));
    shapesOf(picked, 'chest')[0].props.onPress();
    expect(onMuscleTap).toHaveBeenCalledWith('chest');
  });

  test('a null or unknown selection draws nothing special', () => {
    const t = resolveTheme({});
    [null, undefined, 'not_a_muscle'].forEach((sel) => {
      const tree = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} selectedMuscle={sel} />);
      visibleShapes(tree).forEach((s) => expect(s.props.stroke).not.toBe(t.colors.textPrimary));
    });
  });
});

describe('the volume palette and its legend', () => {
  test('a region fills with the entry\'s colour and a hairline of the card ground', () => {
    const t = resolveTheme({});
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={{ chest: { workingSets: 10, color: '#0a0' } }} onMuscleTap={() => {}} />);
    shapesOf(tree, 'chest').forEach((s) => {
      expect(s.props.fill).toBe('#0a0');
      expect(s.props.stroke).toBe(t.colors.surface);
      expect(s.props.strokeWidth).toBe(0.75);
      expect(s.props.strokeDasharray).toBeUndefined();
    });
  });

  test('"No sets" is no fill, the silhouette ground, and a hairline: absent entry or no colour', () => {
    const t = resolveTheme({});
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={{ chest: { workingSets: 0, status: 'unknown' } }} onMuscleTap={() => {}} />);
    [...shapesOf(tree, 'chest'), ...shapesOf(tree, 'neck')].forEach((s) => {
      expect(s.props.fill).toBe('transparent');
      expect(s.props.stroke).toBe(t.colors.border);
      expect(s.props.strokeWidth).toBe(0.75);
    });
  });

  // RE-PINNED under D219 lane A5 (design 5.3): the legend used to name five
  // statuses ("Under the range" to "Too much", the last two in warning and error
  // colours); it names the four tones of the one judgement (volumeJudgement.js),
  // and none of them is a warning or an error token.
  test('the legend names five entries, in order, through LegendRow, with the tooltip kept', () => {
    const t = resolveTheme({});
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={VOLUME_BY_MUSCLE} onMuscleTap={() => {}} />);
    const group = host(tree, (n) => n.props.accessible === true && String(n.props.accessibilityLabel).startsWith('Key: '))[0];
    const legend = group.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));
    expect(legend).toEqual(['Below maintenance', 'Maintenance to growth', 'Growth range', 'Beyond the studied range', 'No sets']);
    const sw = swatches(tree);
    expect(sw.map((s) => s.backgroundColor)).toEqual([
      t.colors.textMuted, t.colors.volumeMinimum, t.colors.success, t.colors.macroCarb, undefined,
    ]);
    expect(sw.map((s) => s.backgroundColor)).not.toContain(t.colors.error);
    expect(sw.map((s) => s.backgroundColor)).not.toContain(t.colors.warning);
    // "No sets" is a hairline, not a gap.
    expect(sw[4]).toMatchObject({ borderWidth: 1, borderColor: t.colors.border, borderStyle: 'solid' });
    expect(tree.root.findAllByType(InfoTooltip).length).toBeGreaterThan(0);
    expect(host(tree, (n) => n.props.accessible === true && String(n.props.accessibilityLabel).startsWith('Key: '))[0].props.accessibilityLabel)
      .toBe('Key: Below maintenance, Maintenance to growth, Growth range, Beyond the studied range, No sets');
  });

  test('under the colour-blind-safe palette "Maintenance to growth" and "Growth range" are different colours', () => {
    mockPrefs = { colorBlindSafe: true };
    const t = resolveTheme(mockPrefs);
    expect(t.colors.volumeMinimum).not.toBe(t.colors.success);
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={VOLUME_BY_MUSCLE} onMuscleTap={() => {}} />);
    const sw = swatches(tree);
    expect(sw[1].backgroundColor).toBe(t.colors.volumeMinimum);
    expect(sw[2].backgroundColor).toBe(t.colors.success);
    expect(sw[1].backgroundColor).not.toBe(sw[2].backgroundColor);
  });

  test('the legend and the silhouette follow the live theme', () => {
    mockPrefs = { theme: 'light' };
    const light = resolveTheme(mockPrefs);
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} />);
    expect(swatches(tree)[0].backgroundColor).toBe(light.colors.textMuted);
    const outline = paths(tree).filter((n) => !n.props.testID)[0];
    expect(outline.props.stroke).toBe(light.colors.border);
    const container = host(tree, (n) => n.props.style && flat(n.props.style).borderRadius && flat(n.props.style).padding)[0];
    expect(flat(container.props.style).backgroundColor).toBe(light.colors.surface);
  });
});

describe('the figure is sized by aspect ratio and labelled under each view', () => {
  test('the image box is 360:320, the figure never wider than its drawing, labels centred under each view', () => {
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} />);
    const imageBox = imageNodes(tree)[0];
    expect(flat(imageBox.props.style)).toMatchObject({ width: '100%', aspectRatio: 360 / 320 });
    const svg = host(tree, (n) => n.type === 'Svg')[0];
    expect(svg.props).toMatchObject({ width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet' });
    const labels = texts(tree).filter((x) => x === 'Front' || x === 'Back');
    expect(labels).toEqual(['Front', 'Back']);
    const cell = host(tree, (n) => n.props.style && flat(n.props.style).alignItems === 'center' && typeof flat(n.props.style).width === 'string')[0];
    expect(flat(cell.props.style).width).toBe('44.44444444444444%');
  });
});

describe('the division markers: beside the right muscles on both views, ink not amber', () => {
  const ALL_MARKED = {
    front_delts: 'elevated', side_delts: 'capped', chest: 'elevated', biceps: 'capped', abs: 'elevated', quads: 'capped',
    traps: 'elevated', rear_delts: 'capped', back: 'elevated', triceps: 'capped', glutes: 'elevated', hamstrings: 'capped', calves: 'elevated',
  };
  // The marker's centre, read back from its path: up = M x-4 y+3 L x+4 y+3 L x y-4, down = M x-4 y-3 L x+4 y-3 L x y+4.
  const centre = (marker, direction) => {
    const nums = marker.props.d.match(/-?\d*\.?\d+/g).map(Number);
    return { x: nums[4], y: direction === 'elevated' ? nums[1] - 3 : nums[1] + 3 };
  };

  test('front muscles mark the front view, back muscles the back view, and nothing else', () => {
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} divisionMarkers={ALL_MARKED} divisionLabel="Bikini" />);
    const [front, back] = viewGroups(tree);
    const ids = (g) => host({ root: g }, (n) => n.type === 'Path' && /^division-marker-/.test(idOf(n))).map((n) => idOf(n).replace('division-marker-', '')).sort();
    expect(ids(front)).toEqual(['abs', 'biceps', 'chest', 'front_delts', 'quads', 'side_delts']);
    expect(ids(back)).toEqual(['back', 'calves', 'glutes', 'hamstrings', 'rear_delts', 'traps', 'triceps']);
  });

  test('every marker\'s centre lies inside one of its own muscle\'s shapes on that view', () => {
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} divisionMarkers={ALL_MARKED} divisionLabel="Bikini" />);
    const [front, back] = viewGroups(tree);
    [[front, 'front'], [back, 'back']].forEach(([g]) => {
      const inView = (pred) => host({ root: g }, (n) => n.type === 'Path' && pred(idOf(n)));
      inView((id) => id.startsWith('division-marker-')).forEach((marker) => {
        const muscle = idOf(marker).replace('division-marker-', '');
        const pt = centre(marker, ALL_MARKED[muscle]);
        const shapes = inView((id) => id === `muscle-${muscle}`);
        expect({ muscle, inside: shapes.some((s) => inside(pt, s.props.d)) }).toEqual({ muscle, inside: true });
      });
    });
  });

  test('markers are ink (up textPrimary, down textMuted), ringed in the card ground, never amber, and let taps through', () => {
    ['dark', 'light'].forEach((theme) => {
      mockPrefs = { theme };
      const t = resolveTheme(mockPrefs);
      const tree = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} divisionMarkers={ALL_MARKED} divisionLabel="Bikini" />);
      markers(tree).forEach((m) => {
        const muscle = idOf(m).replace('division-marker-', '');
        expect(m.props.fill).toBe(ALL_MARKED[muscle] === 'elevated' ? t.colors.textPrimary : t.colors.textMuted);
        expect(m.props.stroke).toBe(t.colors.surface);
        expect(m.props.fill).not.toBe(t.colors.primary);
        expect(m.props.pointerEvents).toBe('none');
        expect(m.props.onPress).toBeUndefined();
      });
    });
  });

  test('no markers and no division legend unless both markers and a label are given', () => {
    const none = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} />);
    expect(markers(none)).toHaveLength(0);
    const noLabel = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} divisionMarkers={ALL_MARKED} />);
    expect(texts(noLabel).join('|')).not.toMatch(/weekly target raised/);
  });

  test('the division legend keeps its copy, and its up triangle is ink', () => {
    const t = resolveTheme({});
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} divisionMarkers={{ chest: 'elevated' }} divisionLabel="Bikini" />);
    const legend = host(tree, (n) => n.type === 'Text' && typeof n.props.accessibilityLabel === 'string' && /Triangle up/.test(n.props.accessibilityLabel))[0];
    expect(legend.props.accessibilityLabel).toBe('Triangle up means the weekly target is raised for Bikini, triangle down means it is capped');
    const plain = (node) => (typeof node === 'string' ? node : node.children.map(plain).join(''));
    expect(plain(legend)).toBe('▲ weekly target raised for Bikini · ▼ capped');
    const up = tree.root.findAllByType(Text).find((n) => n.props.children === '▲');
    expect(flat(up.props.style).color).toBe(t.colors.textPrimary);
  });
});

describe('source guards', () => {
  test('no raw hex or rgba literal anywhere in the figure', () => {
    expect(CODE).not.toMatch(/['"`]#[0-9a-fA-F]{3,8}['"`]/);
    expect(CODE).not.toMatch(/rgba?\(/);
  });

  test('no amber: a status surface carries no colors.primary, in code or in the division legend', () => {
    expect(CODE).not.toMatch(/colors\.primary|\.primary\b|primaryFill|primaryBg/);
  });

  test('the ellipse primitives are gone: paths and groups only', () => {
    expect(SOURCE).not.toMatch(/Ellipse|<Rect|<Line|<Circle/);
    expect(SOURCE).toMatch(/import Svg, \{ G, Path \} from 'react-native-svg'/);
  });

  test('the live pattern: no frozen colour import in the style block, colours come from useTheme', () => {
    expect(CODE).toMatch(/useTheme\(\)/);
    expect(CODE).not.toMatch(/import \{[^}]*\bcolors\b[^}]*\} from '..\/styles\/theme'/);
  });

  test('the F6 division legend copy that VolumeHeatmapScreen.test.js pins by source is intact', () => {
    expect(SOURCE).toMatch(/weekly target raised for \$\{divisionLabel\}/);
    expect(SOURCE).toMatch(/Triangle up means the weekly target is raised for/);
    expect(SOURCE).toMatch(/triangle down means it is capped/);
    expect(SOURCE).not.toMatch(/Elevated for \$\{divisionLabel\}/);
    expect(SOURCE).not.toMatch(/triangle down means capped/);
  });

  test('the recovery tint stops are the named ones', () => {
    expect(withAlpha('#000000', alpha.half)).toBeTruthy();
    expect(CODE).toMatch(/alpha\.half/);
    expect(CODE).toMatch(/alpha\.edge/);
  });
});
