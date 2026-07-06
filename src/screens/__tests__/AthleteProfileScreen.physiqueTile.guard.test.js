const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'AthleteProfileScreen.js'), 'utf8');

describe('AthleteProfileScreen physique tile', () => {
  test('uses one adaptive Body fat / Physique tile instead of a permanent Physique Scan stat', () => {
    expect(source).toMatch(/const hasPhysiqueScore = summary\.scan\?\.visualLeannessScore != null;/);
    expect(source).toMatch(/label: 'Physique'/);
    expect(source).toMatch(/label: 'Body fat'/);
    expect(source).toMatch(/not body fat/);
    expect(source).toMatch(/<StatTile label=\{physiqueTile\.label\} value=\{physiqueTile\.value\} sub=\{physiqueTile\.sub\} \/>/);
    expect(source).not.toMatch(/<StatTile label="Physique Scan"/);
  });
});
