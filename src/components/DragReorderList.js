/**
 * DragReorderList
 *
 * Campaign item 20 (D32, founder-delegated, lead-ruled 2026-07-10): true
 * long-press drag reorder, built on the gesture-handler + Reanimated already
 * in the tree (HARD CONSTRAINT: no draggable-flatlist or any other reorder
 * library, ever). Block-aware: consecutive items sharing a non-null group id
 * (a superset/giant-set) always pick up, drag and drop as ONE unit; the
 * block-move arithmetic itself lives in `src/lib/reorder.js` (pure,
 * independently unit-tested) so this component only owns gesture plumbing
 * and layout.
 *
 * Design (kept intentionally simple to stay reviewable):
 * - Non-dragged blocks render in NORMAL flow, in the current visual order
 *   (local `order` state). Reordering during a drag is just re-sorting that
 *   JS array and letting React re-render the blocks in their new positions;
 *   each block wrapper carries Reanimated's `layout` transition
 *   (LinearTransition, same primitive AnimatedRow.js already uses for list
 *   reflow) so the OTHER rows glide into their new slot instead of jump-
 *   cutting. Reduce Motion drops that transition (plain View reflow),
 *   matching AnimatedRow.js's own reduce-motion branch.
 * - The block currently being dragged switches to `position: absolute` and
 *   is driven directly by the raw pan translation (a Reanimated shared
 *   value, 1:1 with the finger, no spring lag) while a same-height spacer
 *   holds its old place in the flow so siblings don't collapse together.
 *   The SAME node stays mounted throughout (only its style changes) so the
 *   gesture is never interrupted by a remount mid-drag.
 * - Worklets ('onUpdate' etc.) are pure arithmetic only (no theme/store
 *   reads), matching the established photo-viewer hero-morph pattern in
 *   ProgressPhotoViewer.js; every state change (haptics, reordering the JS
 *   array, ending the drag) is dispatched via runOnJS, exactly like that
 *   file's `triggerZoomHaptic`/`goPage`.
 * - Long-press-to-pick-up uses Pan's own `activateAfterLongPress` (gesture-
 *   handler's documented mechanism for exactly this "hold, then drag" case)
 *   rather than composing a separate LongPress gesture.
 * - Haptics: `haptics.selection()` on pickup and on drop only (not on every
 *   slot crossing) -- matches the "pickup/drop" vocabulary the founder asked
 *   for, and this never runs on a weight/food surface.
 * - Accessibility: the drag handle is hidden from screen readers
 *   (`accessibilityElementsHidden` / `importantForAccessibility="no"`) --
 *   long-press-drag has no meaningful screen-reader equivalent here, and
 *   every surface using this component keeps its existing move-up/move-down
 *   chevrons (or, for the ActiveWorkout reorder sheet, an equivalent
 *   accessible affordance) as the fully accessible path. Drag is strictly
 *   additive.
 *
 * KNOWN LIMITATION (disclosed, not silently accepted): this list does not
 * auto-scroll its parent ScrollView when a drag reaches the top/bottom edge.
 * For the list lengths every current surface actually has (a handful of
 * plan days / routine exercises / workout exercises) the whole list fits on
 * screen or nearly does; a very long list would need to be dropped and
 * picked up again to cross out of the visible area. Flagged to the founder
 * rather than built silently or skipped silently -- see the campaign-20
 * delivery notes.
 */

import { useMemo, useRef, useState, Fragment } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, runOnJS, LinearTransition,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import useAppStore from '../store/useAppStore';
import useTheme from '../hooks/useTheme';
import { spacing, radius, motion, iconSize } from '../styles/theme';
import * as haptics from '../lib/haptics';
import { groupIntoBlocks } from '../lib/reorder';

const LONG_PRESS_MS = 350;

function buildLiveStyles(t) {
  return {
    handleIcon: { color: t.colors.textMuted },
    blockLifted: { backgroundColor: t.colors.surface2, borderColor: t.colors.primary, ...t.shadow.md },
  };
}

function sameKeys(a, b, keyExtractor) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (keyExtractor(a[i]) !== keyExtractor(b[i])) return false;
  }
  return true;
}

export default function DragReorderList({
  items,
  keyExtractor,
  getGroupId,
  renderRow,
  onReorder,
  disabled = false,
  handleAccessibilityLabel,
  // Vertical space between BLOCKS (not between rows within one block -- that
  // uses the tighter, fixed spacing.xs of rowInBlockGap below, matching
  // every surface's existing paired-row look). Pass the same value the
  // caller's list used for its separator/gap before adopting this
  // component, so drag mode reads identically to the browsing mode.
  gap = 0,
  style,
  testID,
}) {
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  const t = useTheme();
  const live = buildLiveStyles(t);

  // While NOT dragging, `order` always tracks `items` directly (never a
  // stale local copy) so any parent-side edit -- a stepper change, a
  // rename, grouping/ungrouping a superset -- shows up immediately, even
  // though those edits keep every item's key the same. `liveOrder` only
  // exists WHILE a drag is in flight: it is seeded from `items` on pickup,
  // mutated locally as the block crosses slots (so the drag feels instant,
  // no round trip through the parent), and cleared back to null on drop
  // (the parent's next `items` render then becomes the source of truth
  // again, seamlessly, since `onReorder` already told it the new order).
  const [liveOrder, setLiveOrder] = useState(null);
  const order = liveOrder ?? items;
  const draggingKeyRef = useRef(null);
  const [draggingKey, setDraggingKeyState] = useState(null);

  const blocks = useMemo(() => groupIntoBlocks(order, getGroupId), [order, getGroupId]);
  const blockKey = (block) => keyExtractor(block.items[0]);

  // JS-side layout cache: blockKey -> { y, height } within the list
  // container, refreshed on every relevant onLayout. Mirrored into a shared
  // value (JS write, read from the worklet below) so the pan gesture can do
  // pure-arithmetic hit-testing without crossing threads per frame.
  const layoutsRef = useRef({});
  const orderedLayoutsSV = useSharedValue([]);

  function publishLayouts() {
    const list = [];
    for (const block of blocks) {
      const key = blockKey(block);
      if (key === draggingKeyRef.current) continue; // hit-test against everyone ELSE
      const l = layoutsRef.current[key];
      if (l) list.push({ key, y: l.y, height: l.height });
    }
    orderedLayoutsSV.value = list;
  }

  function recordLayout(key, layout) {
    layoutsRef.current[key] = { y: layout.y, height: layout.height };
    publishLayouts();
  }

  // Shared values driving the actively-dragged block's floating position.
  const dragTranslateY = useSharedValue(0);
  const dragStartTop = useSharedValue(0);
  const dragHeight = useSharedValue(0);
  const lastTargetIdx = useSharedValue(-1);
  const [floatTop, setFloatTop] = useState(0);
  const [floatHeight, setFloatHeight] = useState(0);

  function handlePickUp(key) {
    const l = layoutsRef.current[key];
    draggingKeyRef.current = key;
    setDraggingKeyState(key);
    setLiveOrder(order); // seed the local drag copy from whatever is on screen right now
    setFloatTop(l ? l.y : 0);
    setFloatHeight(l ? l.height : 0);
    dragStartTop.value = l ? l.y : 0;
    dragHeight.value = l ? l.height : 0;
    dragTranslateY.value = 0;
    lastTargetIdx.value = -1;
    publishLayouts();
    haptics.selection();
  }

  function handleCrossSlot(targetIdx) {
    setLiveOrder((prev) => {
      const base = prev ?? order;
      const prevBlocks = groupIntoBlocks(base, getGroupId);
      const bFrom = prevBlocks.findIndex((b) => blockKey(b) === draggingKeyRef.current);
      if (bFrom === -1) return base;
      const rest = prevBlocks.slice(0, bFrom).concat(prevBlocks.slice(bFrom + 1));
      const clamped = Math.max(0, Math.min(targetIdx, rest.length));
      const moved = prevBlocks[bFrom];
      const next = rest.slice();
      next.splice(clamped, 0, moved);
      return next.flatMap((b) => b.items);
    });
  }

  function handleDrop() {
    draggingKeyRef.current = null;
    setDraggingKeyState(null);
    haptics.selection();
    setLiveOrder((current) => {
      if (current && !sameKeys(current, items, keyExtractor)) onReorder?.(current);
      return null; // hand control back to `items` -- the parent now owns the new order
    });
  }

  const floatingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragTranslateY.value }],
  }));

  // Gesture objects are keyed off the PROP-level grouping (items), not the
  // live drag `order` -- block MEMBERSHIP is stable through an entire drag
  // (only position changes), so this keeps every Pan gesture's identity
  // stable while a drag is in flight. Rebuilding a gesture object mid-
  // gesture (e.g. if this were keyed on `blocks`/`order` instead, which
  // changes on every slot crossing) risks the native recogniser resetting
  // the in-progress touch.
  const itemBlocks = useMemo(() => groupIntoBlocks(items, getGroupId), [items, getGroupId]);

  const gestures = useMemo(() => {
    const map = {};
    for (const block of itemBlocks) {
      const key = blockKey(block);
      const pan = Gesture.Pan()
        .enabled(!disabled)
        .activateAfterLongPress(LONG_PRESS_MS)
        .onStart(() => {
          'worklet';
          runOnJS(handlePickUp)(key);
        })
        .onUpdate((e) => {
          'worklet';
          dragTranslateY.value = e.translationY;
          const currentCenter = dragStartTop.value + e.translationY + dragHeight.value / 2;
          const layouts = orderedLayoutsSV.value;
          let targetIdx = 0;
          for (let i = 0; i < layouts.length; i++) {
            const mid = layouts[i].y + layouts[i].height / 2;
            if (currentCenter > mid) targetIdx = i + 1;
          }
          if (targetIdx !== lastTargetIdx.value) {
            lastTargetIdx.value = targetIdx;
            runOnJS(handleCrossSlot)(targetIdx);
          }
        })
        .onEnd(() => {
          'worklet';
          runOnJS(handleDrop)();
        })
        .onFinalize(() => {
          'worklet';
          dragTranslateY.value = 0;
        });
      map[key] = pan;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemBlocks, disabled]);

  return (
    <View style={[styles.container, style]} testID={testID}>
      {blocks.map((block, bIdx) => {
        const key = blockKey(block);
        const isDragging = draggingKey === key;
        const isLastBlock = bIdx === blocks.length - 1;
        const blockGapStyle = !isLastBlock && gap ? { marginBottom: gap } : null;
        return (
          <Fragment key={key}>
            {isDragging && <View style={[{ height: floatHeight }, blockGapStyle]} />}
            <Animated.View
              layout={reduceMotion ? undefined : LinearTransition.duration(motion.state)}
              onLayout={(e) => recordLayout(key, e.nativeEvent.layout)}
              style={[
                styles.blockWrap,
                blockGapStyle,
                isDragging && [
                  styles.blockFloating,
                  live.blockLifted,
                  { top: floatTop },
                  floatingAnimatedStyle,
                ],
              ]}
            >
              {block.items.map((item, i) => {
                const index = order.indexOf(item);
                const isLastInBlock = i === block.items.length - 1;
                return (
                  <View
                    key={keyExtractor(item)}
                    style={[styles.row, !isLastInBlock && styles.rowInBlockGap]}
                  >
                    <View style={styles.rowContent}>{renderRow({ item, index })}</View>
                    {!disabled && (
                      <GestureDetector gesture={gestures[key]}>
                        <View
                          style={styles.handle}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                          accessibilityLabel={handleAccessibilityLabel ? handleAccessibilityLabel(item) : 'Drag to reorder'}
                        >
                          <Ionicons name="reorder-three" size={iconSize.lg} style={live.handleIcon} />
                        </View>
                      </GestureDetector>
                    )}
                  </View>
                );
              })}
            </Animated.View>
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  blockWrap: {
    borderRadius: radius.lg,
  },
  blockFloating: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 50,
    elevation: 8,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowInBlockGap: {
    marginBottom: spacing.xs,
  },
  rowContent: { flex: 1 },
  handle: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
});
