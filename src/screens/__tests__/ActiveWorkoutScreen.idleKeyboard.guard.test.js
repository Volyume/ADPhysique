/**
 * The logger keyboard goes away by itself after 5 seconds with nothing typed
 * or stepped (founder, 2026-10-15: "the keyboard stays up unless you press
 * down. I would like that to go back down after like 5 seconds inactivity").
 *
 * Pins the mechanism in ActiveWorkoutScreen.js: one clock armed while a well
 * is open and re-armed by every keystroke, step, Next and well open; when it
 * fires it does what the bar's OK does (the typed numbers stay, nothing is
 * logged) or, for an edit of a logged set, ONLY puts the keyboard away: the
 * edit stays open and is saved the way leaving it always is, by a tap
 * elsewhere, never by the clock (which could save a half-typed number or
 * raise a refusal unasked; fresh-eyes review 2026-10-15). After it fires
 * nothing re-arms until the next touch.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'ActiveWorkoutScreen.js'), 'utf8');

describe('the logger keyboard idle dismiss', () => {
  test('5 seconds, one named constant', () => {
    expect(SRC).toContain('const LOGGER_IDLE_DISMISS_MS = 5000;');
    expect((SRC.match(/LOGGER_IDLE_DISMISS_MS/g) || []).length).toBe(2);
  });

  test('one clock, armed only while a well is open, re-armed by activity, cleared on close', () => {
    expect(SRC).toMatch(/useEffect\(\(\) => \{\s*if \(!inputOpen\) return undefined;\s*const id = setTimeout\(\(\) => \{ idleDismissRef\.current\?\.\(\); \}, LOGGER_IDLE_DISMISS_MS\);\s*return \(\) => clearTimeout\(id\);\s*\}, \[inputOpen, inputActivity\]\);/);
  });

  test("when it fires: the keyboard goes; an entry keeps what was typed (the bar's OK); an edit stays open, never saved by the clock", () => {
    expect(SRC).toMatch(/idleDismissRef\.current = \(\) => \{\s*Keyboard\.dismiss\(\);\s*if \(!editingSet\) handleInputOk\(\);\s*\};/);
    const at = SRC.indexOf('idleDismissRef.current = () => {');
    const fire = SRC.slice(at, SRC.indexOf('};', at));
    expect(fire).not.toContain('handleInputDone');
    expect(fire).not.toContain('handleSaveEditedSet');
  });

  test('every keystroke, step, Next and well open re-arms it, and nothing else bumps the counter', () => {
    expect(SRC).toMatch(/function openWellNow\(field, set = null\) \{\s*hapticsVocab\.selection\(\);\s*setInputActivity\(\(n\) => n \+ 1\);/);
    expect(SRC).toMatch(/function handleInputStep\(delta\) \{\s*if \(!activeField\) return;\s*setInputActivity\(\(n\) => n \+ 1\);/);
    expect(SRC).toMatch(/function handleInputNext\(\) \{\s*if \(activeField !== 'weight'\) return;\s*setInputActivity\(\(n\) => n \+ 1\);/);
    expect(SRC).toMatch(/function handleInputChange\(raw\) \{\s*if \(!activeField\) return;\s*setInputActivity\(\(n\) => n \+ 1\);/);
    expect((SRC.match(/setInputActivity\(\(n\) => n \+ 1\);/g) || []).length).toBe(4);
  });
});
