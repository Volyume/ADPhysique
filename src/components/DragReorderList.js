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
 * AUTO-SCROLL AT THE DRAG EDGE (D35, lead-ruled under D33, 2026-07-10): a
 * drag that reaches the top/bottom edge of the host ScrollView's visible
 * viewport auto-scrolls that ScrollView, speed roughly proportional to how
 * far past the edge zone the finger sits. Opt-in and backwards-compatible:
 * a consumer wires its OWN `<ScrollView>` to the exported
 * `useDragAutoScrollBridge()` hook (ref + onScroll + onContentSizeChange)
 * and passes the resulting `scrollRef`/`scrollOffset` pair straight through
 * as two new optional props on this component; a caller that never does
 * this keeps today's plain-ScrollView, no-auto-scroll behaviour byte for
 * byte. Driving mechanism: deliberately NOT Reanimated's UI-thread
 * `scrollTo()` (which needs an `Animated.ScrollView`/`useAnimatedRef` --
 * RoutineDetailScreen's reorder-mode branch is pinned to a plain
 * `<ScrollView>` by its own guard test, and every consumer already renders
 * an ordinary host ScrollView). Instead: the pan worklet writes the touch's
 * raw screen Y into a shared value on every `onUpdate` (pure arithmetic, no
 * thread hop), and a plain JS `requestAnimationFrame` loop -- started on
 * pickup, cancelled on drop -- reads that shared value each frame, computes
 * a proximity-based speed against the viewport bounds (measured once per
 * pickup via `measureInWindow`, since the ScrollView's own screen position
 * does not move mid-drag), and calls the consumer's `scrollRef.current.
 * scrollTo` imperatively. Because auto-scroll never asks the ScrollView's
 * OWN gesture recogniser to move it (driven programmatically, not by a
 * second competing pan), no `simultaneousHandlers` wiring is needed
 * anywhere, including inside the ActiveWorkout reorder sheet's nested
 * ScrollView -- an imperative `scrollTo` and an in-flight `Gesture.Pan`
 * simply don't contend for the same touch.
 * Hit-testing while scrolling (the crux of this build): the dragged
 * block's content-relative centre is `dragStartTop + dragTranslateY +
 * height / 2`, exactly the pre-D35 formula, but `dragTranslateY` now folds
 * in `scrollOffset.value - dragStartScrollOffset` (the scroll that has
 * happened since pickup) alongside the raw finger translation. That
 * cancels out the native content shift scrolling would otherwise apply to
 * the floating block (it is a normal descendant of the scrolling content,
 * so without this it would slide away from the finger as the list
 * scrolled beneath it) while keeping the SAME content-relative layout
 * cache (`orderedLayoutsSV`, unaffected by scroll) for slot detection.
 * Because Pan's `onUpdate` only fires on finger MOVEMENT, a
 * `useAnimatedReaction` on `scrollOffset` (gated on `isDraggingSV`, set
 * in the onStart/onFinalize worklets) re-runs the same translate fold and
 * the shared `scanSlots` worklet whenever auto-scroll moves the content
 * under a perfectly still finger -- without it the floating block would
 * drift away with the scrolled content and slot detection would stall
 * until the finger next twitched.
 * Reduce Motion: auto-scroll still FUNCTIONS (a navigational aid, not
 * decoration) but its proximity-to-speed curve flattens from eased
 * (proximity^2, ramps in faster the closer the finger sits to the very
 * edge) to plain linear, matching AnimatedRow.js's own reduce-motion
 * branch elsewhere in the app.
 */

import { useMemo, useRef, useState, Fragment } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedReaction, runOnJS, LinearTransition,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import useAppStore from '../store/useAppStore';
import useTheme from '../hooks/useTheme';
import { spacing, radius, motion, iconSize } from '../styles/theme';
import * as haptics from '../lib/haptics';
import { groupIntoBlocks } from '../lib/reorder';

const LONG_PRESS_MS = 350;

// D35 auto-scroll tuning -- pure geometry constants, not theme reads.
// EDGE_ZONE: band (px) from the visible viewport's top/bottom edge that
// triggers auto-scroll. MAX_SCROLL_SPEED: fastest the content moves
// (px/frame, ~60fps) when the finger sits right at the very edge.
const EDGE_ZONE = 80;
const MAX_SCROLL_SPEED = 14;

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * useDragAutoScrollBridge
 *
 * Companion hook a consumer calls ONCE per host ScrollView to opt into
 * DragReorderList's edge auto-scroll (full design in the file header
 * above). Wire the returned `scrollRef`/`onScroll`/`onContentSizeChange`
 * onto the consumer's OWN plain `<ScrollView>` (not an Animated.ScrollView
 * -- see the header comment for why), and pass the `scrollRef`/
 * `scrollOffset` pair straight through to every DragReorderList that lives
 * inside it. `scrollRef` doubles as the carrier for the measured content
 * height (`scrollRef.contentHeight`): plain JS bookkeeping a worklet never
 * reads, kept off the shared-value pair on purpose, so the auto-scroll
 * loop below can clamp at the bottom of the real content instead of
 * over-scrolling past it.
 */
export function useDragAutoScrollBridge() {
  const scrollRef = useRef(null);
  const scrollOffset = useSharedValue(0);

  function onScroll(e) {
    scrollOffset.value = e.nativeEvent.contentOffset.y;
  }

  function onContentSizeChange(_width, height) {
    scrollRef.contentHeight = height;
  }

  return { scrollRef, scrollOffset, onScroll, onContentSizeChange };
}

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
  // D35 auto-scroll opt-in pair (both optional, both required together):
  // pass the matching fields straight from useDragAutoScrollBridge(). See
  // the file header for the full design; omitted, this component behaves
  // exactly as before D35.
  scrollRef,
  scrollOffset,
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

  // D35 auto-scroll: raw touch screen-Y, written every onUpdate (worklet
  // side) and read every frame by the JS-thread auto-scroll loop below; the
  // scroll offset captured at pickup, so the hit-test/transform maths can
  // express "how much has the container scrolled since I picked this block
  // up". viewportRef/autoScrollFrameRef are plain refs, not shared values,
  // because the loop that reads them lives on the JS thread (see the file
  // header for why this is JS-thread-driven rather than a UI-thread
  // useFrameCallback/scrollTo).
  const touchAbsoluteYSV = useSharedValue(0);
  const dragStartScrollOffset = useSharedValue(0);
  // Raw finger translation, kept separate from dragTranslateY (which folds
  // the scroll delta in) so the useAnimatedReaction below can recompute the
  // fold when the SCROLL side changes without any new finger movement.
  const fingerTranslationYSV = useSharedValue(0);
  // Drag-in-flight flag for the reaction: set true in the onStart worklet,
  // false in the onFinalize worklet (both UI-thread, so the reaction never
  // races a runOnJS round trip).
  const isDraggingSV = useSharedValue(false);
  const viewportRef = useRef({ top: 0, height: 0 });
  const autoScrollFrameRef = useRef(null);

  function stopAutoScroll() {
    if (autoScrollFrameRef.current != null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }

  // JS-thread requestAnimationFrame loop, alive only between pickup and
  // drop and only when the consumer opted in (scrollRef + scrollOffset
  // both passed). Deliberately NOT a worklet/useFrameCallback: scrollRef
  // here is a plain ScrollView ref (useDragAutoScrollBridge's own header
  // note explains why it is not an Animated.ScrollView), and the
  // imperative `scrollTo` it needs only exists on the JS side. Re-reading
  // proximity every frame off `touchAbsoluteYSV` (rather than only
  // reacting to onUpdate) is what keeps auto-scroll going while the finger
  // holds still at the edge, not just while it is actively moving.
  function autoScrollTick() {
    if (!scrollRef?.current || !scrollOffset) {
      autoScrollFrameRef.current = null;
      return;
    }
    const touchY = touchAbsoluteYSV.value;
    const { top, height } = viewportRef.current;
    const distFromTop = touchY - top;
    const distFromBottom = (top + height) - touchY;
    let direction = 0;
    let proximity = 0;
    if (distFromTop < EDGE_ZONE) {
      direction = -1;
      proximity = clamp((EDGE_ZONE - distFromTop) / EDGE_ZONE, 0, 1);
    } else if (distFromBottom < EDGE_ZONE) {
      direction = 1;
      proximity = clamp((EDGE_ZONE - distFromBottom) / EDGE_ZONE, 0, 1);
    }
    if (direction !== 0) {
      // Reduce Motion: still functional, but the eased curve (proximity^2)
      // flattens to plain linear -- see the file header.
      const eased = reduceMotion ? proximity : proximity * proximity;
      const speed = direction * MAX_SCROLL_SPEED * eased;
      const current = scrollOffset.value;
      const maxOffset = Math.max(0, (scrollRef.contentHeight || 0) - height);
      const next = clamp(current + speed, 0, maxOffset);
      if (next !== current) {
        scrollRef.current.scrollTo({ y: next, animated: false });
      }
    }
    autoScrollFrameRef.current = requestAnimationFrame(autoScrollTick);
  }

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
    // D35: measure the host ScrollView's on-screen bounds once per pickup
    // (its position on screen doesn't move mid-drag) and start the
    // auto-scroll loop. No-op when the consumer hasn't opted in.
    if (scrollRef?.current && scrollOffset) {
      // (dragStartScrollOffset is captured in the onStart worklet itself,
      // UI-thread, before this runOnJS handler lands -- no race with the
      // scrollOffset reaction.)
      scrollRef.current.measureInWindow((x, y, width, height) => {
        viewportRef.current = { top: y, height };
      });
      stopAutoScroll();
      autoScrollFrameRef.current = requestAnimationFrame(autoScrollTick);
    }
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
    stopAutoScroll();
    setLiveOrder((current) => {
      if (current && !sameKeys(current, items, keyExtractor)) onReorder?.(current);
      return null; // hand control back to `items` -- the parent now owns the new order
    });
  }

  // The ONE slot-scan implementation, shared by the pan's onUpdate worklet
  // and the scrollOffset reaction below (D35 review fix): compares the
  // dragged block's content-relative centre against the cached layout
  // midpoints and dispatches a crossing via runOnJS, exactly as onUpdate
  // always did. Pure arithmetic -- no theme/store reads.
  function scanSlots() {
    'worklet';
    const currentCenter = dragStartTop.value + dragTranslateY.value + dragHeight.value / 2;
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
  }

  // D35 review fix: Pan.onUpdate only fires on finger MOVEMENT, so during
  // an auto-scroll with a perfectly still finger the scroll-delta fold and
  // the slot scan would otherwise stall (block drifts with the content,
  // release drops at a stale position). This reaction re-runs both on every
  // scrollOffset change while a drag is in flight. When the consumer hasn't
  // opted in, the prepare function returns a constant 0 and the reaction
  // never fires.
  useAnimatedReaction(
    () => (scrollOffset ? scrollOffset.value : 0),
    (current, previous) => {
      if (!scrollOffset || !isDraggingSV.value || current === previous) return;
      dragTranslateY.value = fingerTranslationYSV.value + (current - dragStartScrollOffset.value);
      scanSlots();
    },
  );

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
          // D35: capture the scroll offset at pickup HERE (UI thread), not
          // in handlePickUp -- the scrollOffset reaction is armed the same
          // instant via isDraggingSV, so its baseline must already be set.
          isDraggingSV.value = true;
          fingerTranslationYSV.value = 0;
          if (scrollOffset) dragStartScrollOffset.value = scrollOffset.value;
          runOnJS(handlePickUp)(key);
        })
        .onUpdate((e) => {
          'worklet';
          // D35: publish the raw touch screen-Y for the JS-thread
          // auto-scroll loop (see handlePickUp/autoScrollTick above), and
          // fold "how much has the container scrolled since pickup" into
          // the same translateY the floating block renders with -- this is
          // the offset-aware hit-testing fix documented in the file header.
          // The raw finger translation is kept in its own shared value so
          // the scrollOffset reaction can redo this fold without new
          // finger movement; the slot scan itself lives in the shared
          // scanSlots worklet above.
          touchAbsoluteYSV.value = e.absoluteY;
          fingerTranslationYSV.value = e.translationY;
          const scrollDelta = scrollOffset ? (scrollOffset.value - dragStartScrollOffset.value) : 0;
          dragTranslateY.value = e.translationY + scrollDelta;
          scanSlots();
        })
        .onEnd(() => {
          'worklet';
          runOnJS(handleDrop)();
        })
        .onFinalize(() => {
          'worklet';
          isDraggingSV.value = false;
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
