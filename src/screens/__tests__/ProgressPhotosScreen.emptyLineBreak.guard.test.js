/**
 * Pins the empty Progress photos state's paragraph break. A JSX attribute
 * string does not read escapes, so `text="...\n\n..."` showed a literal
 * "\n\n" on the phone (found in the 2026-10-23 screen renders). The text must
 * be a JS string expression so the break is real.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'ProgressPhotosScreen.js'), 'utf8');

describe('Progress photos empty state', () => {
  test('the paragraph break is a real line break, never the two characters', () => {
    expect(SRC).toContain("text={'Add front, back and side photos to start.\\n\\nThe scale cannot tell muscle from water. Photos can.'}");
    expect(SRC).not.toMatch(/text="[^"]*\\n/);
  });
});
