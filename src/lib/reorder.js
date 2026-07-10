/**
 * reorder.js
 *
 * Campaign item 20 (D32, 2026-07-10): pure, dependency-free block-move
 * arithmetic shared by every drag/chevron reorder surface (PlanDetail days,
 * ManualBuilder/RoutineDetail/ActiveWorkout exercises). No I/O, no React, no
 * store reads — safe to unit-test directly and safe to call from a
 * component's plain JS event handlers (never from a Reanimated worklet;
 * worklets stay pure arithmetic per the CP-10 rule and call these via
 * runOnJS, same as every other JS-side state update in this codebase).
 *
 * A "block" is a run of CONSECUTIVE items sharing the same non-null group id
 * (a superset/giant-set group). A block always moves and lands as one unit;
 * neither helper below can ever split one. A list with no grouping (every
 * item's group id is null, e.g. PlanDetail's days) degrades to ordinary
 * single-item moves.
 */

function defaultGetGroupId(item) {
  return item?.supersetGroupId ?? null;
}

/**
 * Groups a flat array into blocks: runs of consecutive items sharing the
 * same non-null group id. A null/undefined group id never merges with its
 * neighbours (every such item is its own one-item block), so an ungrouped
 * list becomes N one-item blocks.
 *
 * Returns [{ groupId, items: [...] }, ...] in original order.
 */
export function groupIntoBlocks(items, getGroupId = defaultGetGroupId) {
  const blocks = [];
  for (const item of items || []) {
    const gid = getGroupId(item);
    const last = blocks[blocks.length - 1];
    if (gid != null && last && last.groupId === gid) {
      last.items.push(item);
    } else {
      blocks.push({ groupId: gid, items: [item] });
    }
  }
  return blocks;
}

// Locates the block containing a given flat-array item index. Returns
// { blockIndex, start, end } (end inclusive), or blockIndex -1 if out of
// range.
function locateBlock(blocks, itemIndex) {
  let idx = 0;
  for (let bi = 0; bi < blocks.length; bi++) {
    const len = blocks[bi].items.length;
    if (itemIndex >= idx && itemIndex < idx + len) {
      return { blockIndex: bi, start: idx, end: idx + len - 1 };
    }
    idx += len;
  }
  return { blockIndex: -1, start: -1, end: -1 };
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Moves the block containing `fromIndex` so it lands next to the block
 * containing `toIndex`: AFTER it when the move is downward (toIndex >
 * fromIndex), BEFORE it when the move is upward (toIndex < fromIndex). No
 * block is ever split; dragging an item to a position inside another block
 * moves the whole containing block to that block's edge, never in between
 * its members. Dragging within your own block is a no-op (a block cannot
 * reorder itself).
 *
 * This is a strict generalisation of the classic flat-array "move(arr, from,
 * to)" splice-based reorder: with every item ungrouped (no blocks bigger
 * than one), it produces byte-identical results to that algorithm for every
 * from/to pair.
 *
 * Returns a NEW array (same item references, reordered). Returns a copy of
 * `items` unchanged when there is nothing to do (equal indices, or the
 * target falls inside the source's own block).
 */
export function moveItemOrBlock(items, fromIndex, toIndex, getGroupId = defaultGetGroupId) {
  const list = items || [];
  const n = list.length;
  if (n === 0) return list.slice();
  const from = clamp(fromIndex, 0, n - 1);
  const to = clamp(toIndex, 0, n - 1);
  if (from === to) return list.slice();

  const blocks = groupIntoBlocks(list, getGroupId);
  const { blockIndex: bFrom, start: fStart, end: fEnd } = locateBlock(blocks, from);
  if (bFrom === -1) return list.slice();
  if (to >= fStart && to <= fEnd) return list.slice(); // target is inside the moving block itself

  const { blockIndex: bAnchor } = locateBlock(blocks, to);
  if (bAnchor === -1) return list.slice();

  const movedBlock = blocks[bFrom];
  const rest = blocks.slice(0, bFrom).concat(blocks.slice(bFrom + 1));
  const anchorInRest = bAnchor > bFrom ? bAnchor - 1 : bAnchor;
  const movingDown = to > from;
  const insertAt = movingDown ? anchorInRest + 1 : anchorInRest;

  const nextBlocks = rest.slice();
  nextBlocks.splice(insertAt, 0, movedBlock);
  return nextBlocks.flatMap((b) => b.items);
}

/**
 * Swaps the block containing `itemIndex` with the block immediately
 * ADJACENT to it (direction 'up' or 'down') -- the chevron-button move
 * shape every reorder surface already shipped (PlanDetailScreen.handleMoveDay,
 * ManualBuilderScreen.moveExercise, RoutineDetailScreen.handleMoveExercise).
 * Never splits a block. Returns the SAME array reference (not a copy) when
 * the move is impossible (already at the boundary, or itemIndex out of
 * range), so a caller can cheaply detect a no-op with `result === items`.
 */
export function swapAdjacentBlocks(items, itemIndex, direction, getGroupId = defaultGetGroupId) {
  if (!Array.isArray(items) || items.length === 0) return items;
  const blocks = groupIntoBlocks(items, getGroupId);
  const { blockIndex: bIdx } = locateBlock(blocks, itemIndex);
  if (bIdx === -1) return items;
  const swapIdx = direction === 'up' ? bIdx - 1 : bIdx + 1;
  if (swapIdx < 0 || swapIdx >= blocks.length) return items;

  const next = blocks.slice();
  const tmp = next[bIdx];
  next[bIdx] = next[swapIdx];
  next[swapIdx] = tmp;
  return next.flatMap((b) => b.items);
}
