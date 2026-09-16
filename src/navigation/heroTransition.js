/**
 * heroTransition
 *
 * The origin-aware hero-zoom: the screen transition that makes a pushed
 * screen grow out of the row the user tapped, instead of sliding in from
 * the edge.
 *
 * Extracted from RootNavigator.js under D180 part 2 (the transition half of
 * stage 4, `docs/design-redesign-2026-09-14/20-DIRECTION-AND-PLAN.md` §7),
 * unchanged in behaviour, for two reasons:
 *
 *   1. RootNavigator.js is not importable under this project's jest config
 *      (no native-module mocks -- see the header of
 *      rootNavigatorSheetIsolation.guard.test.js), so every guard on it has
 *      had to be a source-text regex. The fallback path below is the one
 *      property that must never regress, and it is now pinned by CALLING the
 *      real interpolator rather than by reading its source
 *      (`src/navigation/__tests__/heroTransition.guard.test.js`).
 *   2. The mechanism is one thing and now lives in one file: the timing
 *      spec, the interpolator, the Reduce Motion replacement and the
 *      measuring helper the non-PressableCard call sites need.
 *
 * TWO PROPERTIES ARE NON-NEGOTIABLE (D180 part 2, verbatim: "Two properties
 * are non-negotiable because the mechanism already has them and an extension
 * must not lose them"):
 *
 *   A. A MISSING OR MALFORMED RECT FALLS BACK TO THE ORDINARY PUSH. A row can
 *      be recycled between the measure and the navigate, a native handle can
 *      be unmeasurable, and `measureInWindow` can hand back undefined. Every
 *      one of those produces the plain centre zoom the app has always had,
 *      never a throw and never a zero-size zoom.
 *   B. REDUCE MOTION REPLACES THE ZOOM WITH A CROSS-FADE, NEVER WITH NOTHING
 *      (law 5, plan §5: "Reduce Motion replaces motion with a cross-fade
 *      rather than removing the feedback"). The opacity ramp stays; the
 *      translate and the scale go.
 *
 * The store is read lazily (`require` inside the call) rather than imported,
 * matching the convention for modules that need the store without taking an
 * import cycle on it (CLAUDE.md section 3, "State").
 */

import { motion } from '../styles/theme';

// The route param a tapping row uses to hand its measured window rect to the
// destination. Named here so a call site and the interpolator can never drift.
export const HERO_ORIGIN_PARAM = '__heroOrigin';

// Shared timing for every hero-zoom registration (calm enter, quicker exit).
export const heroZoomTransitionSpec = {
  open: { animation: 'timing', config: { duration: motion.enter } },
  close: { animation: 'timing', config: { duration: motion.exit } },
};

// Reduce Motion timing: the shortest token there is, because the cross-fade
// is confirmation that the screen changed, not an effect.
export const crossFadeTransitionSpec = {
  open: { animation: 'timing', config: { duration: motion.micro } },
  close: { animation: 'timing', config: { duration: motion.micro } },
};

// Reduce Motion's replacement for the zoom: opacity only. No translate, no
// scale, nothing that moves across the screen -- and, crucially, not nothing
// at all (property B above). Same defensive progress guard as the zoom.
export function crossFadeCardStyle({ current }) {
  if (!current?.progress) {
    return { cardStyle: { opacity: 1 } };
  }
  return {
    cardStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
    },
  };
}

// Builds the card interpolator for a hero-zoom push. When `origin` is a
// measured rect ({ x, y, width, height } in window coords, supplied by the
// tapping card via PressableCard's measure API in the destination route's
// __heroOrigin param, D31), the incoming screen grows FROM that rect: it
// starts scaled down and offset so it reads as the tapped card expanding
// into the full screen, then settles to identity. When `origin` is absent
// (cross-tab pushes, programmatic navigation) this is byte-identical to the
// original centre zoom (opacity 0->1, scale 0.92->1).
export function makeHeroZoomCardStyle(origin) {
  return ({ current, layouts }) => {
    // Defensive: react-navigation can call this with current.progress
    // missing during certain pop/back gestures, which throws an
    // "interpolate of undefined" the user reads as an app crash on
    // first session-start. Fall back to the default opacity behaviour
    // so the transition still completes cleanly.
    if (!current?.progress) {
      return { cardStyle: { opacity: 1 } };
    }
    const opacity = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    const screen = layouts?.screen;
    if (origin && Number.isFinite(origin.width) && origin.width > 0 && screen?.width && screen?.height) {
      const originCx = origin.x + origin.width / 2;
      const originCy = origin.y + origin.height / 2;
      // Uniform scale kept in a calm band so the screen always grows a little
      // (never a distant, tiny-far zoom, never an overshoot past 1); the
      // translate carries that growth out of the card's real position on the
      // previous screen.
      const startScale = Math.min(0.95, Math.max(0.85, origin.width / screen.width));
      const translateX = current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [originCx - screen.width / 2, 0],
      });
      const translateY = current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [originCy - screen.height / 2, 0],
      });
      const scale = current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [startScale, 1],
      });
      return { cardStyle: { opacity, transform: [{ translateX }, { translateY }, { scale }] } };
    }
    const scale = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.92, 1],
    });
    return { cardStyle: { opacity, transform: [{ scale }] } };
  };
}

// True when the user has Reduce Motion on. Read at the moment the navigator
// evaluates a screen's options, NOT subscribed: every Stack.Navigator in
// RootNavigator calls useStackMotionOverride(), which subscribes to this same
// flag, so the navigator re-renders and these options are re-evaluated when
// the setting is toggled -- no app restart, exactly as before.
function readsReduceMotion() {
  try {
    const useAppStore = require('../store/useAppStore').default;
    return !!useAppStore.getState().accessibility?.reduceMotion;
  } catch (_) {
    // A store that cannot be read is not a reason to drop a transition.
    return false;
  }
}

// Screen options for every hero-zoom destination. Reads the destination
// route's __heroOrigin and builds the growing interpolator; with no origin
// present it produces the identical centre zoom, so this is a safe drop-in
// for any hero-zoom registration. Under Reduce Motion the zoom is REPLACED by
// the cross-fade (property B) -- `animationEnabled: true` is set explicitly
// because the stack-level Reduce Motion override turns animation off for
// every other screen, and a per-screen option beats a navigator screenOption.
export function heroZoomOptions(extra) {
  return ({ route }) => {
    if (readsReduceMotion()) {
      return {
        ...(extra || {}),
        animationEnabled: true,
        transitionSpec: crossFadeTransitionSpec,
        cardStyleInterpolator: crossFadeCardStyle,
      };
    }
    return {
      ...(extra || {}),
      transitionSpec: heroZoomTransitionSpec,
      cardStyleInterpolator: makeHeroZoomCardStyle(route?.params?.[HERO_ORIGIN_PARAM] || null),
    };
  };
}

// How long to wait for measureInWindow before giving up on an origin.
// measureInWindow is a native round trip whose callback simply never arrives
// if the view was detached first (a recycled list row), and a lost tap is far
// worse than a lost zoom, so the navigation is never left waiting on it. On
// the ordinary path the callback lands inside a frame and this never fires.
const MEASURE_TIMEOUT_MS = 100;

// A rect is only usable if every field is a real number and it has a size.
// Anything else is treated as "no origin" (property A).
function usableRect(x, y, width, height) {
  if (![x, y, width, height].every((n) => Number.isFinite(n))) return null;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

/**
 * measureHeroOrigin(node, run)
 *
 * The measuring half, for tap targets that are NOT a PressableCard (which
 * measures itself via onPressWithLayout). Measures the given view in window
 * coordinates and calls `run(rect)`; calls `run(null)` when there is nothing
 * measurable, when the numbers are not usable, or when the native callback
 * never arrives. `run` is called EXACTLY ONCE, always, so the tap behind it
 * can never be lost (property A). Pass the node itself (`ref.current`, or the
 * entry read out of a per-row ref map), read at press time.
 */
// Screen options for a screen that is NOT a hero destination. Under Reduce
// Motion it REPLACES the transition with the same cross-fade the hero routes
// use; otherwise it adds nothing and the navigator's own defaults stand.
//
// D182 fixed Reduce Motion on the hero routes and left this gap open: every
// other screen was still getting `animationEnabled: false` from the navigator,
// which DELETES the feedback rather than replacing it, and law 5 is explicit
// that it must be replaced. This closes it.
//
// It is applied PER SCREEN rather than through the navigator's `screenOptions`
// for one reason found the hard way on the hero routes: a screen's own
// `options` are applied AFTER `screenOptions`
// (`@react-navigation/core`'s `useDescriptors`), so a screen that sets
// anything of its own -- `presentation: 'modal'` on seven registrations here --
// can silently win against a navigator-level override. Routing every screen
// through one entry point means Reduce Motion cannot be honoured on some
// screens and not others, which is the failure this whole fix exists to stop.
export function reducedMotionOptions(extra) {
  return () => {
    if (!readsReduceMotion()) return { ...(extra || {}) };
    return {
      ...(extra || {}),
      animationEnabled: true,
      transitionSpec: crossFadeTransitionSpec,
      cardStyleInterpolator: crossFadeCardStyle,
    };
  };
}

export function measureHeroOrigin(node, run) {
  if (typeof run !== 'function') return;
  let settled = false;
  const finish = (rect) => {
    if (settled) return;
    settled = true;
    run(rect);
  };
  if (!node || typeof node.measureInWindow !== 'function') {
    finish(null);
    return;
  }
  const timer = setTimeout(() => finish(null), MEASURE_TIMEOUT_MS);
  try {
    node.measureInWindow((x, y, width, height) => {
      clearTimeout(timer);
      finish(usableRect(x, y, width, height));
    });
  } catch (_) {
    // An unmeasurable handle is an ordinary push, never a thrown tap.
    clearTimeout(timer);
    finish(null);
  }
}
