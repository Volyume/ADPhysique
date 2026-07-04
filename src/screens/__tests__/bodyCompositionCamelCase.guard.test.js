const fs = require('fs');
const path = require('path');

const screenPath = (name) => path.join(__dirname, '..', name);

describe('latest body composition consumers', () => {
  test.each([
    ['DiaryScreen.js'],
    ['PerDayTargetsScreen.js'],
  ])('%s reads getLatestBodyComposition camelCase fields', (file) => {
    const src = fs.readFileSync(screenPath(file), 'utf8');
    const computeBlock = src.match(/computeFFMFloor\(bodyWeight\.weightKg,\s*\{[\s\S]*?\}\);/);

    expect(computeBlock?.[0]).toContain('bodyComp?.bodyFatPercent');
    expect(computeBlock?.[0]).toContain('bodyComp?.bodyFatSource');
    expect(computeBlock?.[0]).not.toContain('bodyComp?.body_fat_percent');
    expect(computeBlock?.[0]).not.toContain('bodyComp?.body_fat_source');
  });
});
