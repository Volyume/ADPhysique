/**
 * Progress-photo score-grid overlap guard (founder-reported 2026-07-12).
 *
 * The scan score grid (Score / Leanness / Change / Confidence) is a two-column
 * `flexWrap: 'wrap'` row. Its cells used `flex: 1`, which sets flexBasis:0 --
 * and inside a wrapping row Yoga then measures the row's height as a single
 * line, so the wrapped second row overflowed the row's reported height and the
 * "starting set is saved" callout below it rendered OVERLAPPING the cells.
 *
 * The fix gives the cell an explicit non-zero flexBasis so the row measures
 * both lines. This guard pins that the basis-0 `flex: 1` never returns to the
 * wrapping grid cell.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.resolve(__dirname, '..', 'ProgressPhotosScreen.js'),
  'utf8',
);

// Isolate the libraryScoreCell style block.
const cell = SRC.slice(
  SRC.indexOf('libraryScoreCell: {'),
  SRC.indexOf('libraryScoreLabel: {'),
);

describe('progress-photo score grid measures its wrapped height', () => {
  test('the wrapping row still uses flexWrap', () => {
    const row = SRC.slice(SRC.indexOf('libraryScoreRow: {'), SRC.indexOf('libraryScoreCell: {'));
    expect(row).toMatch(/flexWrap:\s*'wrap'/);
  });

  test('the grid cell uses an explicit flexBasis, not basis-0 flex:1', () => {
    expect(cell).toMatch(/flexBasis:\s*'\d+%'/);
    // `flex: 1` (basis 0) inside the flexWrap row is exactly the overlap bug.
    expect(cell).not.toMatch(/\bflex:\s*1\b/);
  });
});
