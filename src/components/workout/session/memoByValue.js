/**
 * memoByValue (LOC-648)
 *
 * Wraps a presentational component of the session page so it draws again only
 * when something it SHOWS has changed.
 *
 * Why it exists. The session page is one screen that builds every row and
 * section afresh on each render (new `wells`, `last` and `testIDs` objects, and
 * a new closure for every callback), then hands them down. React cannot tell
 * that a row's inputs are the same as a moment ago when each one is a new
 * object or a new function, so each tap, however small, drew every exercise
 * section and every set row again, and the cost grew with the sets logged
 * (the measurements are in docs/kit-trial-2026-11-21/LOC-648-*.md).
 *
 * How it works, in two halves, so a screen that skips a draw is never wrong:
 *   - Data. The wrapper compares the previous and the next props by value, one
 *     level deep (a row's `wells`, `last`, `inputField`, `testIDs`, ...). A
 *     React element (for example `children`) is compared by identity, so a
 *     section that is handed new children always draws.
 *   - Callbacks. Every top-level function prop is replaced by ONE steady
 *     function that calls whatever the newest render handed in. A callback that
 *     closes over this render's state is still the one that runs, while the row
 *     that holds it did not have to draw again. Whether a callback exists at
 *     all stays part of the data: a row with no `onPressLast` has no Last
 *     button, and gaining one draws the row. A function INSIDE an object prop
 *     (the input of the row being typed into) is compared as it is, so that
 *     one row, whose callbacks are new on every render, draws every time, and
 *     the field's own handlers reach it untouched.
 *
 * Nothing here knows about sets or exercises. A component inside the wrapper
 * that reads the theme or the store still updates when those change, because
 * memo does not block them.
 */
import React, { memo, useRef } from 'react';

const isPlainObject = (value) => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  if (React.isValidElement(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

// One level of value comparison: the same keys, each member the same value.
function sameMembers(a, b) {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}

function sameValue(a, b) {
  if (Object.is(a, b)) return true;
  if (isPlainObject(a) && isPlainObject(b)) return sameMembers(a, b);
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length
      && a.every((item, i) => Object.is(item, b[i])
        || (isPlainObject(item) && isPlainObject(b[i]) && sameMembers(item, b[i])));
  }
  return false;
}

export function propsAreEqualByValue(prev, next) {
  const prevKeys = Object.keys(prev);
  if (prevKeys.length !== Object.keys(next).length) return false;
  for (const key of prevKeys) {
    if (!Object.prototype.hasOwnProperty.call(next, key)) return false;
    if (!sameValue(prev[key], next[key])) return false;
  }
  return true;
}

export default function memoByValue(Inner) {
  const Memoised = memo(Inner, propsAreEqualByValue);

  function ByValue(props) {
    const latest = useRef(props);
    latest.current = props;
    const steady = useRef({});

    // The one steady function for a callback prop such as 'onCheck'. It reads
    // the newest props when it is CALLED.
    const callbackFor = (key) => {
      let fn = steady.current[key];
      if (!fn) {
        fn = (...args) => {
          const target = latest.current[key];
          return typeof target === 'function' ? target(...args) : undefined;
        };
        steady.current[key] = fn;
      }
      return fn;
    };

    const stable = {};
    for (const key of Object.keys(props)) {
      stable[key] = typeof props[key] === 'function' ? callbackFor(key) : props[key];
    }
    return <Memoised {...stable} />;
  }

  ByValue.displayName = `ByValue(${Inner.displayName || Inner.name || 'Component'})`;
  return ByValue;
}
