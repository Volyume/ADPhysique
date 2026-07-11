const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

function loadTypeScriptModule(relativePath) {
  const sourcePath = path.join(__dirname, '..', relativePath);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  const loaded = new Module(sourcePath, module);
  loaded.filename = sourcePath;
  loaded.paths = module.paths;
  loaded._compile(compiled, sourcePath);
  return loaded.exports;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function reliableNight(day, bedHour = 22, wakeHour = 6) {
  const wake = new Date(2026, 0, day, wakeHour, 0, 0, 0);
  const start = new Date(wake);
  start.setDate(start.getDate() - 1);
  start.setHours(bedHour, 0, 0, 0);
  return {
    day: `${wake.getFullYear()}-${String(wake.getMonth() + 1).padStart(2, '0')}-${String(wake.getDate()).padStart(2, '0')}`,
    sleepStart: start.getTime(),
    sleepEnd: wake.getTime(),
    sleepMin: (wake.getTime() - start.getTime()) / 60000,
    sleepDetail: { confidence: 'high', coveragePct: 95, source: 'auto_hr' },
  };
}

const { inferSleepSchedule } = loadTypeScriptModule(path.join('src', 'metrics', 'sleepSchedule.ts'));
const time = loadTypeScriptModule(path.join('src', 'util', 'time.ts'));

const duplicate = reliableNight(10);
const duplicateResult = inferSleepSchedule([duplicate, { ...duplicate }]);
assert(duplicateResult.sampleCount === 1, 'a duplicated wake-day must count as one sample');

const oldest = reliableNight(1, 1, 9);
const unsorted = [oldest, ...Array.from({ length: 28 }, (_, i) => reliableNight(i + 2, 22, 6)), reliableNight(30, 22, 6)];
const limitedResult = inferSleepSchedule(unsorted);
assert(limitedResult.sampleCount === 28, 'the schedule must cap at the newest 28 reliable nights');
assert(limitedResult.bedMin === 1320 && limitedResult.wakeMin === 360, 'newest nights must win before the 28-night limit');

const unreliable = [
  reliableNight(10),
  { ...reliableNight(11), sleepDetail: { confidence: 'low', coveragePct: 95, source: 'auto_hr' } },
  { ...reliableNight(12), sleepDetail: { confidence: 'high', coveragePct: 69, source: 'auto_hr' } },
  { ...reliableNight(13), sleepStart: reliableNight(13).sleepEnd - 120 * 60000, sleepMin: 120 },
  { ...reliableNight(14), sleepStart: reliableNight(14).sleepEnd - 13 * 60 * 60000, sleepMin: 780 },
];
const trustResult = inferSleepSchedule(unreliable);
assert(trustResult.sampleCount === 1, 'unreliable nights must remain excluded by the trust gates');

const scheduleContamination = [
  reliableNight(20),
  {
    ...reliableNight(21, 14, 23),
    sleepMin: 540,
    sleepDetail: { confidence: 'high', coveragePct: 95, source: 'manual_duration' },
  },
  {
    ...reliableNight(22, 13, 22),
    sleepMin: 540,
    sleepDetail: { confidence: 'low', coveragePct: 95, source: 'manual_hr' },
  },
  {
    ...reliableNight(23, 12, 21),
    sleepMin: 0,
    sleepDetail: { confidence: 'high', coveragePct: 95, source: 'manual_hr' },
  },
  {
    ...reliableNight(24),
    sleepDetail: { confidence: 'high', coveragePct: 95, source: 'manual_hr' },
  },
];
const uncontaminatedResult = inferSleepSchedule(scheduleContamination);
assert(uncontaminatedResult.sampleCount === 2, 'manual duration, zero sleep and low-quality manual HR do not teach the schedule');
assert(
  uncontaminatedResult.bedMin === 1320 && uncontaminatedResult.wakeMin === 360,
  'schedule medians ignore contaminated manual timing',
);

process.env.TZ = 'Europe/London';
const springStart = new Date(2026, 2, 29, 0, 0, 0, 0).getTime();
const springNext = time.addDays(springStart, 1);
assert(time.dayKey(springNext) === '2026-03-30', 'calendar-day addition crosses the spring DST change');
assert(springNext - springStart === 23 * 60 * 60 * 1000, 'calendar-day addition does not force a 24-hour DST day');

console.log('sleep schedule regression tests passed');
