/**
 * sessionRenderCost.test.js (LOC-648)
 *
 * The workout logger's cost per tap. The session screen builds every set row's
 * and every exercise section's props afresh on each render (new `wells`, `last`
 * and `testIDs` objects, a new closure per callback), and nothing used to tell
 * React that an untouched row had not changed, so each tap drew the whole table
 * and every section again (measured in LOC-648: the four "handles 100-tap
 * chains" tests in screen-mount.test.js ran 10 to 15 s each on the untouched app
 * and on every kit commit alike; the rows were about 60 per cent of what a tap
 * drew). SetRow and ExerciseSection now draw again only when what they SHOW
 * changes (memoByValue.js).
 *
 * This suite pins that by COUNTING DRAWS, not by timing anything: the kit parts
 * the rows are built from are replaced with counters, so a row that drew again
 * is a count that went up. It also pins the other half of the promise, that a
 * row which did not draw still calls the NEWEST callback it was given (a stale
 * closure would log the wrong set).
 */
jest.mock('../../../ui/set-row-kit', () => {
  const React = require('react');
  const draws = (global.__sessionRenderCostDraws = global.__sessionRenderCostDraws || {});
  const part = (name) => function Part(props) {
    const key = `${name}:${props.testID ?? ''}`;
    draws[key] = (draws[key] || 0) + 1;
    return React.createElement(name, props, props.children);
  };
  return {
    SetCheck: part('SetCheck'),
    SetLastText: part('SetLastText'),
    SetMarkerBadge: part('SetMarkerBadge'),
    SetRowShell: part('SetRowShell'),
    SetWell: part('SetWell'),
  };
});
jest.mock('../../../ui/exercise-card-kit', () => {
  const React = require('react');
  const draws = (global.__sessionRenderCostDraws = global.__sessionRenderCostDraws || {});
  const part = (name) => function Part(props) {
    if (name === 'ExerciseCard') draws.ExerciseCard = (draws.ExerciseCard || 0) + 1;
    return React.createElement(name, props, props.children);
  };
  return {
    ExerciseCaption: part('ExerciseCaption'),
    ExerciseCard: part('ExerciseCard'),
    ExerciseDoneMark: part('ExerciseDoneMark'),
    ExerciseFooterAction: part('ExerciseFooterAction'),
    ExerciseIndex: part('ExerciseIndex'),
    ExerciseInfoMark: part('ExerciseInfoMark'),
    ExerciseMoreMark: part('ExerciseMoreMark'),
    ExerciseName: part('ExerciseName'),
    SetColumnLabel: part('SetColumnLabel'),
    SetColumnsShell: part('SetColumnsShell'),
    SetFoldLabel: part('SetFoldLabel'),
    SetFoldShell: part('SetFoldShell'),
  };
});

const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const SetTable = require('../SetTable').default;
const ExerciseSection = require('../ExerciseSection').default;

const { act } = TestRenderer;
const draws = global.__sessionRenderCostDraws;
const drawsOf = (key) => draws[key] || 0;
const reset = () => { Object.keys(draws).forEach((k) => delete draws[k]); };

// What the screen does on every render: build each row's props afresh, with a
// new closure for every callback, whatever has or has not changed.
function buildRows({ nextWeight = 70, calls } = {}) {
  return [
    {
      id: 's1', marker: 1, check: 'logged', record: false,
      last: { text: '72.5 x 8', stale: false },
      wells: { weight: 60, reps: 10, state: 'logged', editingField: null },
      inputField: null,
      onPressWell: (field) => calls.push(['s1 well', field]),
      onCheck: () => calls.push(['s1 check']),
      testIDs: { row: 'row-s1', check: 'check-s1' },
    },
    {
      id: 's2', marker: 2, check: 'logged', record: false,
      last: { text: '72.5 x 8', stale: false },
      wells: { weight: 62.5, reps: 9, state: 'logged', editingField: null },
      inputField: null,
      onPressWell: (field) => calls.push(['s2 well', field]),
      onCheck: () => calls.push(['s2 check']),
      testIDs: { row: 'row-s2', check: 'check-s2' },
    },
    {
      id: 'next', marker: 3, check: 'next', checkLabel: undefined, busy: false,
      last: { text: '72.5 x 8', stale: false },
      wells: { weight: nextWeight, reps: 8, state: 'next', editingField: null, ghost: false },
      inputField: null,
      onPressWell: (field) => calls.push(['next well', field]),
      onCheck: () => calls.push(['next check', nextWeight]),
      testIDs: { row: 'row-next', check: 'check-next' },
    },
    {
      id: 'p1', marker: 4, check: 'pending',
      last: null,
      wells: { weight: '', reps: '8-10', state: 'pending' },
      testIDs: { row: 'row-p1' },
    },
  ];
}

const table = (rows, extra = {}) => (
  <SetTable rows={rows} columnsLabel={{ weight: 'kg' }} onLogRemaining={() => {}} {...extra} />
);

function mount(element) {
  let tree;
  act(() => { tree = TestRenderer.create(element); });
  return tree;
}
const update = (tree, element) => act(() => { tree.update(element); });
const hostByTestID = (tree, id) => tree.root.find((n) => typeof n.type === 'string' && n.props.testID === id);

beforeEach(reset);

describe('SetTable rows draw only when what they show changes', () => {
  test('a render that hands every row new but equal props draws no row again', () => {
    const calls = [];
    const tree = mount(table(buildRows({ calls })));
    ['row-s1', 'row-s2', 'row-next', 'row-p1'].forEach((id) => expect(drawsOf(`SetRowShell:${id}`)).toBe(1));

    update(tree, table(buildRows({ calls })));
    update(tree, table(buildRows({ calls })));

    ['row-s1', 'row-s2', 'row-next', 'row-p1'].forEach((id) => expect(drawsOf(`SetRowShell:${id}`)).toBe(1));
  });

  test('changing one row draws that row again and no other', () => {
    const calls = [];
    const tree = mount(table(buildRows({ calls })));
    update(tree, table(buildRows({ calls, nextWeight: 72.5 })));

    expect(drawsOf('SetRowShell:row-next')).toBe(2);
    ['row-s1', 'row-s2', 'row-p1'].forEach((id) => expect(drawsOf(`SetRowShell:${id}`)).toBe(1));
  });

  test('a row that did not draw still calls the NEWEST callbacks it was handed', () => {
    const first = [];
    const second = [];
    const tree = mount(table(buildRows({ calls: first })));
    update(tree, table(buildRows({ calls: second })));
    expect(drawsOf('SetRowShell:row-s1')).toBe(1); // it really was skipped

    act(() => { hostByTestID(tree, 'check-s1').props.onPress(); });
    act(() => { hostByTestID(tree, 'check-next').props.onPress(); });

    expect(first).toEqual([]);
    expect(second).toEqual([['s1 check'], ['next check', 70]]);
  });

  test('a callback that appears or disappears is a change the row shows', () => {
    const calls = [];
    const tree = mount(table(buildRows({ calls })));
    const rows = buildRows({ calls });
    rows[1] = { ...rows[1], onPressLast: () => calls.push(['use last']) };
    update(tree, table(rows));

    expect(drawsOf('SetRowShell:row-s2')).toBe(2);
    expect(drawsOf('SetRowShell:row-s1')).toBe(1);
  });

  test('the table-level callbacks stay current across renders too', () => {
    const first = [];
    const second = [];
    const rows = (calls) => buildRows({ calls }).map(({ onPressWell, onCheck, ...rest }) => rest);
    const tree = mount(table(rows(first), { onCheck: (id) => first.push(['table check', id]) }));
    update(tree, table(rows(second), { onCheck: (id) => second.push(['table check', id]) }));

    act(() => { hostByTestID(tree, 'check-s2').props.onPress(); });

    expect(first).toEqual([]);
    expect(second).toEqual([['table check', 's2']]);
  });
});

describe('ExerciseSection draws only when what it shows changes', () => {
  const header = (extra = {}) => (
    <ExerciseSection
      index={2}
      name="Row"
      state="upcoming"
      doneSetCount={1}
      totalSetCount={3}
      onPressHeader={() => {}}
      {...extra}
    />
  );

  test('a collapsed section handed a new closure and equal values does not draw again', () => {
    const tree = mount(header());
    expect(drawsOf('ExerciseCard')).toBe(1);
    update(tree, header({ onPressHeader: () => {} }));
    update(tree, header({ onPressHeader: () => {} }));
    expect(drawsOf('ExerciseCard')).toBe(1);
  });

  test('its newest header callback is the one a tap calls', () => {
    const calls = [];
    const tree = mount(header({ onPressHeader: () => calls.push('old') }));
    update(tree, header({ onPressHeader: () => calls.push('new') }));
    expect(drawsOf('ExerciseCard')).toBe(1);
    const button = tree.root.find((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'button');
    act(() => { button.props.onPress(); });
    expect(calls).toEqual(['new']);
  });

  test('a changed count, a changed name or a changed state draws it again', () => {
    const tree = mount(header());
    update(tree, header({ doneSetCount: 2 }));
    update(tree, header({ doneSetCount: 2, name: 'Cable row' }));
    update(tree, header({ doneSetCount: 2, name: 'Cable row', state: 'done' }));
    expect(drawsOf('ExerciseCard')).toBe(4);
  });

  test('the active section, which is handed new children, draws every time', () => {
    const active = () => (
      <ExerciseSection index={1} name="Squat" state="active" onAddSet={() => {}} onMore={() => {}}>
        <React.Fragment>{null}</React.Fragment>
      </ExerciseSection>
    );
    const tree = mount(active());
    update(tree, active());
    expect(drawsOf('ExerciseCard')).toBe(2);
  });
});

describe('source guard: the two parts are wrapped, so the saving cannot be dropped quietly', () => {
  const read = (file) => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');

  test.each([
    ['SetRow.js', /export default memoByValue\(SetRowView\);/],
    ['ExerciseSection.js', /export default memoByValue\(ExerciseSectionView\);/],
  ])('%s exports its view through memoByValue', (file, pattern) => {
    expect(read(file)).toMatch(pattern);
  });
});
