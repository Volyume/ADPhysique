/**
 * ProgressPhotoImage (launch accessibility audit, AX-13).
 *
 * Pins the shared real-photo image primitive: it ALWAYS sets
 * accessibilityIgnoresInvertColors on the underlying image, even when a
 * caller explicitly tries to pass a falsy value for it, so a future edit
 * cannot silently drop the flag the way the audit found ProgressPhotoViewer
 * and ProgressPhotoCompare had. Every other prop (source, style, contentFit,
 * accessibilityLabel, etc.) still reaches the underlying image unchanged --
 * this is presentation-only, it never alters what is rendered.
 *
 * ProgressPhotoViewer.test.js and ProgressPhotoCompare.test.js carry the
 * matching end-to-end checks that the real components render their real
 * photos through this component (or with the flag set).
 */
import { create, act } from 'react-test-renderer';
import ProgressPhotoImage from '../ProgressPhotoImage';

function findHostImage(tree) {
  return tree.root.find((n) => n.type === 'Image');
}

test('always sets accessibilityIgnoresInvertColors, even if a caller passes a falsy override', () => {
  let tree;
  act(() => {
    tree = create(
      <ProgressPhotoImage
        source={{ uri: 'file:///photos/a.jpg' }}
        accessibilityLabel="A real photo"
        accessibilityIgnoresInvertColors={false}
      />,
    );
  });
  const img = findHostImage(tree);
  expect(img.props.accessibilityIgnoresInvertColors).toBe(true);
});

test('sets the flag with no invert prop passed at all', () => {
  let tree;
  act(() => {
    tree = create(<ProgressPhotoImage source={{ uri: 'file:///photos/b.jpg' }} />);
  });
  const img = findHostImage(tree);
  expect(img.props.accessibilityIgnoresInvertColors).toBe(true);
});

test('forwards every other prop unchanged (presentation only, nothing else changes)', () => {
  let tree;
  act(() => {
    tree = create(
      <ProgressPhotoImage
        source={{ uri: 'file:///photos/c.jpg' }}
        style={{ width: 100, height: 120 }}
        contentFit="cover"
        recyclingKey="c.jpg"
        transition={200}
        accessible
        accessibilityLabel="Photo from 3 Jul 2026"
      />,
    );
  });
  const img = findHostImage(tree);
  expect(img.props.source).toEqual({ uri: 'file:///photos/c.jpg' });
  expect(img.props.style).toEqual({ width: 100, height: 120 });
  expect(img.props.contentFit).toBe('cover');
  expect(img.props.recyclingKey).toBe('c.jpg');
  expect(img.props.transition).toBe(200);
  expect(img.props.accessible).toBe(true);
  expect(img.props.accessibilityLabel).toBe('Photo from 3 Jul 2026');
});
