// Campaign item 20 (D32, 2026-07-10): pins the block-move arithmetic every
// reorder surface shares (PlanDetail days, ManualBuilder/RoutineDetail/
// ActiveWorkout exercises). Written to FAIL if a future change ever splits a
// superset/giant-set block, drops or duplicates an item, or diverges from
// plain flat-array move semantics when nothing is grouped.
import { groupIntoBlocks, moveItemOrBlock, swapAdjacentBlocks } from '../reorder';

function withGroup(id, groupId) {
  return { id, supersetGroupId: groupId ?? null };
}

function ids(list) {
  return list.map((x) => x.id);
}

describe('groupIntoBlocks', () => {
  test('every item ungrouped -> one block per item', () => {
    const items = [withGroup('a'), withGroup('b'), withGroup('c')];
    const blocks = groupIntoBlocks(items);
    expect(blocks.map((b) => b.items.length)).toEqual([1, 1, 1]);
  });

  test('consecutive same group id merges into one block', () => {
    const items = [withGroup('a'), withGroup('b', 'g1'), withGroup('c', 'g1'), withGroup('d')];
    const blocks = groupIntoBlocks(items);
    expect(blocks.map((b) => b.items.map((i) => i.id))).toEqual([['a'], ['b', 'c'], ['d']]);
  });

  test('the SAME group id appearing in two non-adjacent runs stays two blocks (never merges across a gap)', () => {
    const items = [withGroup('a', 'g1'), withGroup('b'), withGroup('c', 'g1')];
    const blocks = groupIntoBlocks(items);
    expect(blocks.map((b) => b.items.map((i) => i.id))).toEqual([['a'], ['b'], ['c']]);
  });

  test('a giant set (3+) is one block', () => {
    const items = [withGroup('a', 'g1'), withGroup('b', 'g1'), withGroup('c', 'g1')];
    const blocks = groupIntoBlocks(items);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].items).toHaveLength(3);
  });
});

describe('moveItemOrBlock -- flat (no blocks), matches standard array move', () => {
  function flatMove(arr, from, to) {
    const a = arr.slice();
    const [item] = a.splice(from, 1);
    a.splice(to, 0, item);
    return a;
  }

  test('moving forward matches splice-based move', () => {
    const items = ['A', 'B', 'C', 'D', 'E'].map((id) => withGroup(id));
    const result = moveItemOrBlock(items, 1, 3);
    expect(ids(result)).toEqual(ids(flatMove(items, 1, 3)));
    expect(ids(result)).toEqual(['A', 'C', 'D', 'B', 'E']);
  });

  test('moving backward matches splice-based move', () => {
    const items = ['A', 'B', 'C', 'D', 'E'].map((id) => withGroup(id));
    const result = moveItemOrBlock(items, 3, 1);
    expect(ids(result)).toEqual(ids(flatMove(items, 3, 1)));
    expect(ids(result)).toEqual(['A', 'D', 'B', 'C', 'E']);
  });

  test('moving to the very end matches splice-based move', () => {
    const items = ['A', 'B', 'C', 'D'].map((id) => withGroup(id));
    const result = moveItemOrBlock(items, 0, 3);
    expect(ids(result)).toEqual(ids(flatMove(items, 0, 3)));
    expect(ids(result)).toEqual(['B', 'C', 'D', 'A']);
  });

  test('moving to the very start matches splice-based move', () => {
    const items = ['A', 'B', 'C', 'D'].map((id) => withGroup(id));
    const result = moveItemOrBlock(items, 3, 0);
    expect(ids(result)).toEqual(ids(flatMove(items, 3, 0)));
    expect(ids(result)).toEqual(['D', 'A', 'B', 'C']);
  });

  test('same index is a no-op', () => {
    const items = ['A', 'B', 'C'].map((id) => withGroup(id));
    expect(ids(moveItemOrBlock(items, 1, 1))).toEqual(['A', 'B', 'C']);
  });
});

describe('moveItemOrBlock -- block cases', () => {
  test('a block moves as a whole and never splits: dragging a lone item past a pair', () => {
    // A, [B,C] paired, D -- drag A onto D's row.
    const items = [withGroup('A'), withGroup('B', 'g1'), withGroup('C', 'g1'), withGroup('D')];
    const result = moveItemOrBlock(items, 0, 3);
    expect(ids(result)).toEqual(['B', 'C', 'D', 'A']);
    // The pair is still adjacent, in original relative order.
    const bi = ids(result).indexOf('B');
    expect(ids(result)[bi + 1]).toBe('C');
  });

  test('dragging a lone item onto the FIRST row of a pair lands it before the pair (never inside)', () => {
    const items = [withGroup('A'), withGroup('B', 'g1'), withGroup('C', 'g1'), withGroup('D')];
    // to=1 is B, the first row of the [B,C] block. D moves up and lands
    // immediately before the pair (after A, which is unaffected).
    const result = moveItemOrBlock(items, 3, 1); // drag D up onto B's row
    expect(ids(result)).toEqual(['A', 'D', 'B', 'C']);
  });

  test('dragging a lone item onto the LAST row of a pair (moving down) lands it after the pair', () => {
    const items = [withGroup('A'), withGroup('B', 'g1'), withGroup('C', 'g1'), withGroup('D')];
    // to=2 is C, the last row of the [B,C] block; moving forward (0 -> 2).
    const result = moveItemOrBlock(items, 0, 2);
    expect(ids(result)).toEqual(['B', 'C', 'A', 'D']);
  });

  test('a pair (as a block) moves as a unit past a lone item', () => {
    const items = [withGroup('A', 'g1'), withGroup('B', 'g1'), withGroup('C'), withGroup('D')];
    // Drag the pair (index 0, A) down past C.
    const result = moveItemOrBlock(items, 0, 2);
    expect(ids(result)).toEqual(['C', 'A', 'B', 'D']);
  });

  test('a giant set (3+) moves as one unit', () => {
    const items = [
      withGroup('A', 'g1'), withGroup('B', 'g1'), withGroup('C', 'g1'), withGroup('D'), withGroup('E'),
    ];
    const result = moveItemOrBlock(items, 4, 0); // drag E to the very front
    expect(ids(result)).toEqual(['E', 'A', 'B', 'C', 'D']);
  });

  test('dragging within your own block is a no-op', () => {
    const items = [withGroup('A'), withGroup('B', 'g1'), withGroup('C', 'g1'), withGroup('D')];
    const result = moveItemOrBlock(items, 1, 2); // both inside the same [B,C] block
    expect(ids(result)).toEqual(['A', 'B', 'C', 'D']);
  });

  test('two independent blocks can each move without merging or splitting the other', () => {
    const items = [
      withGroup('A', 'g1'), withGroup('B', 'g1'),
      withGroup('C'),
      withGroup('D', 'g2'), withGroup('E', 'g2'),
    ];
    const result = moveItemOrBlock(items, 0, 4); // drag the AB block past everything
    expect(ids(result)).toEqual(['C', 'D', 'E', 'A', 'B']);
  });
});

describe('moveItemOrBlock -- boundary cases', () => {
  test('out-of-range indices clamp into range rather than throwing', () => {
    const items = ['A', 'B', 'C'].map((id) => withGroup(id));
    expect(() => moveItemOrBlock(items, -5, 99)).not.toThrow();
    const result = moveItemOrBlock(items, -5, 99);
    expect(ids(result)).toEqual(['B', 'C', 'A']); // clamps to (0, 2)
  });

  test('empty list is a no-op', () => {
    expect(moveItemOrBlock([], 0, 0)).toEqual([]);
  });

  test('single-item list is a no-op', () => {
    const items = [withGroup('A')];
    expect(ids(moveItemOrBlock(items, 0, 0))).toEqual(['A']);
  });

  test('whole list is one block: any move is a no-op', () => {
    const items = [withGroup('A', 'g1'), withGroup('B', 'g1'), withGroup('C', 'g1')];
    expect(ids(moveItemOrBlock(items, 0, 2))).toEqual(['A', 'B', 'C']);
  });
});

describe('moveItemOrBlock -- fuzz invariants (multiset preserved, no block ever split)', () => {
  function randomList(n, groupChance, rng) {
    const items = [];
    let openGroup = null;
    let openRemaining = 0;
    for (let i = 0; i < n; i++) {
      if (openRemaining > 0) {
        items.push(withGroup(`i${i}`, openGroup));
        openRemaining -= 1;
      } else if (rng() < groupChance && i < n - 1) {
        openGroup = `g${i}`;
        const size = 2 + Math.floor(rng() * 2); // 2 or 3 members
        openRemaining = size - 1;
        items.push(withGroup(`i${i}`, openGroup));
      } else {
        items.push(withGroup(`i${i}`, null));
      }
    }
    return items;
  }

  // Deterministic seeded RNG (mulberry32) so a failure is reproducible.
  function mulberry32(seed) {
    let a = seed;
    return function rng() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  test('300 random moves over random block layouts: multiset preserved, blocks never split', () => {
    const rng = mulberry32(20260710);
    for (let trial = 0; trial < 300; trial++) {
      const n = 2 + Math.floor(rng() * 10); // 2..11 items
      const items = randomList(n, 0.4, rng);
      const from = Math.floor(rng() * n);
      const to = Math.floor(rng() * n);

      const before = groupIntoBlocks(items).map((b) => b.items.map((i) => i.id));
      const result = moveItemOrBlock(items, from, to);

      // Multiset preserved: same ids, same count, order aside.
      expect([...ids(result)].sort()).toEqual([...ids(items)].sort());
      expect(result).toHaveLength(items.length);

      // No block split: every original block's members are still all
      // mutually adjacent (as a contiguous run, in their original relative
      // order) somewhere in the result.
      for (const blockIds of before) {
        if (blockIds.length < 2) continue;
        const positions = blockIds.map((id) => ids(result).indexOf(id));
        for (let k = 1; k < positions.length; k++) {
          expect(positions[k]).toBe(positions[k - 1] + 1);
        }
      }
    }
  });
});

describe('swapAdjacentBlocks -- chevron-shape single-step move', () => {
  test('moves a lone item up/down past a neighbour', () => {
    const items = ['A', 'B', 'C'].map((id) => withGroup(id));
    expect(ids(swapAdjacentBlocks(items, 1, 'up'))).toEqual(['B', 'A', 'C']);
    expect(ids(swapAdjacentBlocks(items, 1, 'down'))).toEqual(['A', 'C', 'B']);
  });

  test('moves a whole pair past a lone item, in one step, never splitting it', () => {
    const items = [withGroup('A', 'g1'), withGroup('B', 'g1'), withGroup('C')];
    const result = swapAdjacentBlocks(items, 0, 'down');
    expect(ids(result)).toEqual(['C', 'A', 'B']);
  });

  test('a lone item hops OVER a whole pair rather than landing inside it', () => {
    const items = [withGroup('A'), withGroup('B', 'g1'), withGroup('C', 'g1')];
    const result = swapAdjacentBlocks(items, 0, 'down');
    expect(ids(result)).toEqual(['B', 'C', 'A']);
  });

  test('at the top boundary, moving up is a no-op (returns the SAME reference)', () => {
    const items = ['A', 'B'].map((id) => withGroup(id));
    expect(swapAdjacentBlocks(items, 0, 'up')).toBe(items);
  });

  test('at the bottom boundary, moving down is a no-op (returns the SAME reference)', () => {
    const items = ['A', 'B'].map((id) => withGroup(id));
    expect(swapAdjacentBlocks(items, 1, 'down')).toBe(items);
  });

  test('empty list is a no-op', () => {
    expect(swapAdjacentBlocks([], 0, 'down')).toEqual([]);
  });

  test('out-of-range itemIndex is a no-op (returns the SAME reference)', () => {
    const items = ['A', 'B'].map((id) => withGroup(id));
    expect(swapAdjacentBlocks(items, 99, 'down')).toBe(items);
  });
});
