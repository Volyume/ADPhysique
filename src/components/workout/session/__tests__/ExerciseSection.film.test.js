/**
 * The exercise card's "Film" footer action (D229 addendum 11, founder
 * 2026-10-16: "I want to be able to record a set not just when it's a PR
 * attempt also. A normal one should still be an option but maybe not as
 * highlighted"). The quiet form: a footer action beside Add set and Swap, the
 * same label-and-glyph grammar as its neighbours (never a boxed button), for
 * every set; the record row's "This set would be a new PR · Film it" stays the
 * highlighted one. The card draws it only when the screen passes onFilm, which
 * the screen withholds under calm mode or an open ED flag (fail closed), so
 * the card itself never asks.
 */
import { act, create } from 'react-test-renderer';

jest.mock('../../../../store/useAppStore', () => {
  const store = { accessibility: { reduceMotion: false } };
  const useAppStore = (sel) => (typeof sel === 'function' ? sel(store) : store);
  useAppStore.getState = () => store;
  return { __esModule: true, default: useAppStore };
});

import ExerciseSection from '../ExerciseSection';

async function render(props = {}) {
  let tree;
  await act(async () => {
    tree = create(<ExerciseSection index={1} name="Bench press" state="active" onPressHeader={() => {}} onAddSet={() => {}} onSwap={() => {}} onMore={() => {}} {...props} />);
  });
  return tree;
}
const byId = (tree, id) => tree.root.findAll((n) => typeof n.type === 'string' && n.props.testID === id);
const labels = (tree) => tree.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'button').map((n) => n.props.accessibilityLabel);

describe('the Film footer action', () => {
  test('drawn only when the screen passes onFilm; with the word, the videocam glyph and the plain spoken label', async () => {
    const without = await render();
    expect(byId(without, 'volyume-btn-film-set')).toHaveLength(0);
    const onFilm = jest.fn();
    const tree = await render({ onFilm });
    const film = byId(tree, 'volyume-btn-film-set')[0];
    expect(film.props.accessibilityLabel).toBe('Film this set');
    expect(JSON.stringify(tree.toJSON())).toContain('"Film"');
    expect(film.findAll((n) => n.props.name === 'videocam-outline').length).toBeGreaterThan(0);
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

  test('the same grammar as its neighbours: a label and a glyph in a 48 dp target, never a boxed button', async () => {
    const tree = await render({ onFilm: () => {} });
    const film = byId(tree, 'volyume-btn-film-set')[0];
    const add = byId(tree, 'volyume-btn-extra-set')[0];
    expect(film.props.style).toEqual(add.props.style);
  });
});
