const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.resolve(__dirname, '../CoachOutputScreen.js'), 'utf8');
const NUTRITION = fs.readFileSync(path.resolve(__dirname, '../../lib/nutritionEngine.js'), 'utf8');

function callBody(source, callName) {
  const start = source.indexOf(`${callName}({`);
  expect(start).toBeGreaterThan(-1);
  const tail = source.slice(start);
  const end = tail.indexOf('\n      });');
  expect(end).toBeGreaterThan(-1);
  return tail.slice(0, end);
}

function lineContaining(source, text) {
  return source.split(/\r?\n/).find((line) => line.includes(text)) || '';
}

function callBlocks(source, callName) {
  const blocks = [];
  let offset = 0;
  while (offset < source.length) {
    const start = source.indexOf(`${callName}(`, offset);
    if (start === -1) break;
    const tail = source.slice(start);
    const end = tail.indexOf(');');
    expect(end).toBeGreaterThan(-1);
    blocks.push(tail.slice(0, end));
    offset = start + end + 2;
  }
  return blocks;
}

describe('Progress Scan coach isolation guard', () => {
  test('runWeeklyCoach inputs do not include Progress Scan context', () => {
    const body = callBody(SCREEN, 'runWeeklyCoach');
    expect(body).not.toMatch(/progressScan|photo_scan|estimateBodyFatPercent|rangeLow|rangeHigh/i);
  });

  test('local Progress Scan context is not persisted into coach_outputs', () => {
    const bodies = callBlocks(SCREEN, 'saveCoachOutput');
    expect(bodies.length).toBeGreaterThan(0);
    for (const body of bodies) {
      expect(body).not.toMatch(/progressScan|photo_scan|estimateBodyFatPercent|rangeLow|rangeHigh/i);
    }
  });

  test('rendered scan context is gated by current ED and calm suppression', () => {
    expect(lineContaining(SCREEN, 'canShowProgressScanCoachContext')).toMatch(/progressScanCoachContext/);
    expect(SCREEN).toMatch(/canShowProgressScanCoachContext = .*progressScanCoachContext.*!edPatternOpen.*!calmMode/s);
    expect(SCREEN).toMatch(/resolveProgressScanCoachNote\(\{/);
    expect(SCREEN).toMatch(/suppressed:\s*resultEdPatternOpen \|\| calmNow/);
  });

  test('scan context is folded into the main coach response through the out-of-engine adapter', () => {
    expect(SCREEN).toMatch(/applyProgressScanCoachContext\(baseCoachResponse,\s*canShowProgressScanCoachContext \? progressScanCoachContext : null\)/);
    expect(callBody(SCREEN, 'runWeeklyCoach')).not.toMatch(/progressScan|photo_scan|estimateBodyFatPercent|rangeLow|rangeHigh/i);
  });

  test('nutrition engine uses an explicit authoritative-source allowlist', () => {
    expect(NUTRITION).toMatch(/function isAuthoritativeBodyFatSource|export function isAuthoritativeBodyFatSource/);
    expect(NUTRITION).toMatch(/bodyFatSource === 'dexa'/);
    expect(NUTRITION).toMatch(/bodyFatSource === 'caliper'/);
    expect(NUTRITION).toMatch(/bodyFatSource === 'bia'/);
    expect(NUTRITION).not.toMatch(/bodyFatSource !== 'visual'/);
  });
});
