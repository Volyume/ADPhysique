/**
 * Toast with two actions (founder report 2026-10-16, a screenshot of the
 * "Saved for..." toast after filming a set: the message read down the screen
 * a few letters a line beside WATCH and UNDO).
 *
 * Pins the cause, not the symptom: the toast is full width (up to 480) rather
 * than shrinking to its content, and with a second action the actions move to
 * their own row under the message, so the message keeps the whole width.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'Toast.js'), 'utf8');

test('the toast is full width up to 480, not shrink-to-content', () => {
  const toast = SRC.slice(SRC.indexOf('  toast: {'), SRC.indexOf('  toastStacked: {'));
  expect(toast).toMatch(/width: '100%'/);
  expect(toast).toMatch(/maxWidth: 480/);
  expect(toast).not.toMatch(/minWidth: 220/);
});

test('with a second action the toast stacks: message row, then an actions row', () => {
  expect(SRC).toMatch(/current\.secondaryAction \? styles\.toastStacked : null/);
  expect(SRC).toMatch(/toastStacked: \{\s*flexDirection: 'column',\s*alignItems: 'stretch',/);
  expect(SRC).toMatch(/style=\{current\.secondaryAction \? styles\.actionsRowStacked : styles\.actionsRow\}/);
  expect(SRC).toMatch(/style=\{current\.secondaryAction \? styles\.messageRowStacked : styles\.messageRow\}/);
});
