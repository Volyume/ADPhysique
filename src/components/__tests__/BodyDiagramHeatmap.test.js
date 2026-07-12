/**
 * AX-04 (launch accessibility audit,
 * docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md-linked audit
 * file): BodyDiagramHeatmap used to put press handlers AND accessibility
 * props (accessible/accessibilityRole="button"/accessibilityLabel) directly
 * on individual react-native-svg shapes -- an 8x16-unit biceps ellipse and an
 * 11x9-unit delt inside a 360-unit viewBox, roughly 15-29dp touch/focus
 * targets, far below 44dp, with bilateral shapes repeating identical labels.
 * react-native-svg per-shape focusability is also platform-fragile.
 *
 * The real fix: the diagram is now ONE labelled decorative/summary image for
 * assistive tech (matching the existing SvgBarSparkline.js:71 convention);
 * per-shape accessibility props are gone; VolumeHeatmapScreen's muscle rows
 * below (own AX-04 tests in VolumeHeatmapScreen.test.js) are the real
 * accessible + operable path. This suite pins:
 *   1. No individual SVG shape (Ellipse/Rect/Path/Line) carries an
 *      `accessible`, `accessibilityRole` or `accessibilityLabel` prop.
 *   2. Sighted tap-to-jump is unchanged: shapes still carry `onPress`.
 *   3. Exactly one accessibilityRole="image" node exists (the diagram
 *      wrapper), with a concise summary label naming what it shows and how
 *      many muscles currently have logged volume.
 *
 * react-native-svg is mocked (native-only, cannot run in the node test env),
 * the same shape as Sparkline.test.js / cp10Stage4ChartsLiveTheme.test.js.
 */
import { create } from 'react-test-renderer';

jest.mock('react-native-svg', () => {
  const RN = require('react');
  const mk = (name) => (props) => RN.createElement(name, props, props.children);
  return {
    __esModule: true,
    Svg: mk('Svg'), G: mk('G'), Ellipse: mk('Ellipse'), Rect: mk('Rect'),
    Path: mk('Path'), Line: mk('Line'),
    default: mk('Svg'),
  };
});

const BodyDiagramHeatmap = require('../BodyDiagramHeatmap').default;

const SHAPE_TYPES = ['Ellipse', 'Rect', 'Path', 'Line'];

const VOLUME_BY_MUSCLE = {
  chest: { workingSets: 10, status: 'optimal', color: '#0a0', label: 'Good range' },
  biceps: { workingSets: 0, status: 'below', color: '#999', label: 'Below target' },
};

function allShapes(tree) {
  return SHAPE_TYPES.flatMap((type) => tree.root.findAllByType(type));
}

describe('BodyDiagramHeatmap accessibility structure (AX-04)', () => {
  test('no individual SVG shape carries per-shape accessibility props', () => {
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={VOLUME_BY_MUSCLE} onMuscleTap={() => {}} />);

    const shapes = allShapes(tree);
    expect(shapes.length).toBeGreaterThan(0);
    for (const shape of shapes) {
      expect(shape.props.accessible).toBeUndefined();
      expect(shape.props.accessibilityRole).toBeUndefined();
      expect(shape.props.accessibilityLabel).toBeUndefined();
    }
  });

  test('shapes keep their sighted onPress (tap-to-jump is unchanged)', () => {
    const onMuscleTap = jest.fn();
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={VOLUME_BY_MUSCLE} onMuscleTap={onMuscleTap} />);

    const pressable = allShapes(tree).find((s) => typeof s.props.onPress === 'function');
    expect(pressable).toBeTruthy();
    pressable.props.onPress();
    expect(onMuscleTap).toHaveBeenCalled();
  });

  test('exactly one accessibilityRole="image" node summarises the whole diagram', () => {
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={VOLUME_BY_MUSCLE} onMuscleTap={() => {}} />);

    // Host-node instances only ('View' string type): the forwardRef
    // composite wrapping the same host View otherwise double-counts one
    // physical node as two matches.
    const imageNodes = tree.root.findAll(
      (n) => n.props.accessibilityRole === 'image' && typeof n.type === 'string',
    );
    expect(imageNodes.length).toBe(1);

    const label = imageNodes[0].props.accessibilityLabel;
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
    // Names what it shows (front/back, volume) and how many muscles are
    // highlighted with logged volume out of the total drawn regions -- here
    // only chest has workingSets > 0 among the 14 drawn muscle keys.
    expect(label).toMatch(/front and back/i);
    expect(label).toMatch(/1 of 14 muscles/);
    expect(imageNodes[0].props.accessible).toBe(true);
  });

  test('the summary label tracks how many drawn muscles have logged volume', () => {
    const noneTrained = {};
    const treeNone = create(<BodyDiagramHeatmap volumeByMuscle={noneTrained} onMuscleTap={() => {}} />);
    const noneLabel = treeNone.root.findAll((n) => n.props.accessibilityRole === 'image')[0].props.accessibilityLabel;
    expect(noneLabel).toMatch(/0 of 14 muscles/);

    const allTrained = {
      front_delts: { workingSets: 4 }, chest: { workingSets: 4 }, biceps: { workingSets: 4 },
      forearms: { workingSets: 4 }, abs: { workingSets: 4 }, quads: { workingSets: 4 },
      adductors: { workingSets: 4 }, calves: { workingSets: 4 }, traps: { workingSets: 4 },
      rear_delts: { workingSets: 4 }, back: { workingSets: 4 }, triceps: { workingSets: 4 },
      glutes: { workingSets: 4 }, hamstrings: { workingSets: 4 },
    };
    const treeAll = create(<BodyDiagramHeatmap volumeByMuscle={allTrained} onMuscleTap={() => {}} />);
    const allLabel = treeAll.root.findAll((n) => n.props.accessibilityRole === 'image')[0].props.accessibilityLabel;
    expect(allLabel).toMatch(/14 of 14 muscles/);
  });
});
