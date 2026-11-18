/**
 * The exercise card's "Film" footer action (D229 addendum 11, founder
 * 2026-10-16: "I want to be able to record a set not just when it's a PR
 * attempt also. A normal one should still be an option but maybe not as
 * highlighted"). The quiet form: a footer action beside Add set and Swap, the
 * same label-and-glyph grammar as its neighbours (never a boxed button; since
 * kit trial 2, LOC-412, all three are the kit's ghost Button with a lucide icon), for
 * every set; the record row's "This set would be a new PR · Film it" stays the
 * highlighted one. The card draws it only when the screen passes onFilm, which
 * the screen withholds under calm mode or an open ED flag (fail closed), so
 * the card itself never asks.
 */
jest.mock('react-native-svg', () => require('../../../ui/__tests__/kitTestEnv').svgMock());
jest.mock('react-native', () => require('../../../ui/__tests__/kitTestEnv').reactNativeMock());
const { loadNativeInteropRuntime, setUpKitStyles, setPalette, renderKit } = require('../../../ui/__tests__/kitTestEnv');

loadNativeInteropRuntime();

// Plain requires, after loadNativeInteropRuntime() (an import would be hoisted above it).
const { act } = require('react-test-renderer');
const ExerciseSection = require('../ExerciseSection').default;

// kit trial 2 (LOC-412): the card draws through the kit's styling pipeline and reads the real
// app store for its palette (setPalette), so the old stub of the store is gone.
beforeAll(() => { setUpKitStyles(); setPalette({ theme: 'dark' }); }, 120000);

async function render(props = {}) {
  let tree;
  await act(async () => {
    tree = renderKit(<ExerciseSection index={1} name="Bench press" state="active" onPressHeader={() => {}} onAddSet={() => {}} onSwap={() => {}} onMore={() => {}} {...props} />);
  });
  return tree;
}
const byId = (tree, id) => tree.root.findAll((n) => typeof n.type === 'string' && n.props.testID === id);
// kit trial 2 (LOC-412): the footer actions are kit Buttons (role 'button'); the overflow is a
// TouchableOpacity with accessibilityRole 'button'. Either way, in render order.
const labels = (tree) => tree.root.findAll((n) => typeof n.type === 'string' && (n.props.role === 'button' || n.props.accessibilityRole === 'button')).map((n) => n.props.accessibilityLabel);

describe('the Film footer action', () => {
  test('drawn only when the screen passes onFilm; with the word, the video glyph and the plain spoken label', async () => {
    const without = await render();
    expect(byId(without, 'volyume-btn-film-set')).toHaveLength(0);
    const onFilm = jest.fn();
    const tree = await render({ onFilm });
    const film = byId(tree, 'volyume-btn-film-set')[0];
    expect(film.props.accessibilityLabel).toBe('Film this set');
    expect(JSON.stringify(tree.toJSON())).toContain('"Film"');
    // kit trial 2 (LOC-412): the lucide 'Video' glyph replaces Ionicons' videocam-outline.
    expect(film.findAll((n) => n.type === 'LucideIcon' && n.props.name === 'Video').length).toBe(1);
    expect(film.props.role).toBe('button');
    await act(async () => { film.props.onPress(); });
    expect(onFilm).toHaveBeenCalledTimes(1);
  });

  test('its place: after Add set and Swap, before the overflow, and only on the active card', async () => {
    const tree = await render({ onFilm: () => {} });
    const order = labels(tree).filter((l) => ['Add set', 'Swap exercise', 'Film this set', 'More options for this exercise'].includes(l));
    expect(order).toEqual(['Add set', 'Swap exercise', 'Film this set', 'More options for this exercise']);
    const upcoming = await render({ onFilm: () => {}, state: 'upcoming' });
    expect(byId(upcoming, 'volyume-btn-film-set')).toHaveLength(0);
  });

  test('the same grammar as its neighbours: a label and a glyph in a 48 dp ghost button, never a boxed button', async () => {
    const tree = await render({ onFilm: () => {} });
    const film = byId(tree, 'volyume-btn-film-set')[0];
    const add = byId(tree, 'volyume-btn-extra-set')[0];
    expect(film.props.style).toEqual(add.props.style);
    // kit trial 2 (LOC-412): both are the kit's ghost Button, so the shared resolved style is
    // also the "no fill, no border, 48 dp" one.
    expect(film.props.style.backgroundColor).toBeUndefined();
    expect(film.props.style.borderWidth).toBeUndefined();
    expect(film.props.style.minHeight).toBe(48);
  });
});
