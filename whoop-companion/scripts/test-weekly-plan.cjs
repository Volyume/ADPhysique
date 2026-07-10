const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

Module._extensions['.ts'] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  }).outputText;
  module._compile(compiled, filename);
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const weekly = require(path.join(__dirname, '..', 'src', 'metrics', 'weeklyPlan.ts'));
const now = new Date(2026, 6, 8, 12, 0, 0, 0).getTime(); // Wednesday
const days = Array.from({ length: 30 }, (_, offset) => {
  const date = new Date(now);
  date.setDate(date.getDate() - offset);
  date.setHours(0, 0, 0, 0);
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const sleepEnd = date.getTime() + 7 * 60 * 60 * 1000;
  return {
    day,
    recovery: 70,
    rmssd: 55,
    rhr: 58,
    resp: 14,
    spo2: null,
    skinTempC: 33,
    sleepMin: 450,
    sleepPerf: 0.9,
    strain: 8,
    steps: 8000,
    stepSource: 'band',
    sleepStart: sleepEnd - 8 * 60 * 60 * 1000,
    sleepEnd,
    deepMin: null,
    remMin: null,
    lightMin: null,
    awakeMin: null,
    sleepDetail: { confidence: 'high', coveragePct: 90, signalMin: 400, needMin: 510 },
    updatedAt: now,
  };
});
const cardio = days.slice(0, 8).map((day, index) => ({
  id: `a${index}`,
  startTs: new Date(`${day.day}T12:00:00`).getTime(),
  endTs: new Date(`${day.day}T12:30:00`).getTime(),
  source: 'live',
}));
const plan = weekly.buildWeeklyPlan({
  now,
  today: days[0],
  recentDays: days.slice(1),
  cardio,
  intensity: { moderate: 80, vigorous: 20, total: 120, goal: 150 },
});
assert(plan.daysElapsed === 3 && plan.days.length === 7, 'weekly plan uses a Monday-Sunday calendar week');
assert(plan.metrics.length === 5, 'weekly plan covers sleep, consistency, steps, zones and activities');
assert(plan.metrics.find((metric) => metric.key === 'steps')?.goal === 56_000, 'step goal learns the trusted daily baseline');
assert(plan.metrics.find((metric) => metric.key === 'sleep')?.goal === 3_570, 'sleep goal follows learned need rather than chronic undersleep');
assert(plan.metrics.find((metric) => metric.key === 'consistency')?.current >= 95, 'consistent recent sleep unlocks the weekly timing goal');
assert(plan.calibration == null, 'complete local history clears calibration');

console.log('weekly plan regression tests passed');
