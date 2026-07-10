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

const sleep = loadTypeScriptModule(path.join('src', 'metrics', 'sleep.ts'));
const evidence = loadTypeScriptModule(path.join('src', 'metrics', 'sleepEvidence.ts'));
const sleepStress = loadTypeScriptModule(path.join('src', 'metrics', 'sleepStress.ts'));
const minute = 60_000;
const start = 1_800_000;
const quiet = Array.from({ length: 180 }, (_, i) => ({
  ts: start + i * minute,
  hr: 60,
  motion: 0,
  rmssd: 50,
  bandSleepState: i === 0 ? 2 : 0,
}));
const detected = sleep.computeSleep(quiet);
assert(detected != null, 'candidate state bytes must not veto HR and motion evidence');
assert(!sleep.autoSleepBoundariesCovered(detected, quiet), 'rejects a sleep block with no synced edges');

const covered = [
  ...Array.from({ length: 30 }, (_, i) => ({ ts: start - (30 - i) * minute, hr: 78, motion: 0.5 })),
  ...quiet,
  ...Array.from({ length: 30 }, (_, i) => ({ ts: detected.endTs + i * minute, hr: 80, motion: 0.6 })),
];
assert(sleep.autoSleepBoundariesCovered(detected, covered), 'accepts a sleep block with both synced edges');

const quietEdges = [
  ...Array.from({ length: 30 }, (_, i) => ({ ts: start - (30 - i) * minute, hr: 60, motion: 0 })),
  ...quiet,
  ...Array.from({ length: 30 }, (_, i) => ({ ts: detected.endTs + i * minute, hr: 60, motion: 0 })),
];
assert(!sleep.autoSleepBoundariesCovered(detected, quietEdges), 'quiet awake time is not accepted as a wake boundary');

const firstRunStart = start + 30 * minute;
const secondRunStart = firstRunStart + 260 * minute;
const multiRun = [
  ...Array.from({ length: 30 }, (_, i) => ({ ts: start + i * minute, hr: 82, motion: 0.7 })),
  ...Array.from({ length: 200 }, (_, i) => ({ ts: firstRunStart + i * minute, hr: 60, motion: 0 })),
  ...Array.from({ length: 60 }, (_, i) => ({ ts: firstRunStart + (200 + i) * minute, hr: 85, motion: 0.7 })),
  ...Array.from({ length: 150 }, (_, i) => ({ ts: secondRunStart + i * minute, hr: 58, motion: 0 })),
  ...Array.from({ length: 30 }, (_, i) => ({ ts: secondRunStart + (150 + i) * minute, hr: 82, motion: 0.7 })),
];
const wakeDayRun = sleep.computeSleep(multiRun, undefined, {
  endAfterTs: secondRunStart,
  endBeforeTs: secondRunStart + 24 * 60 * minute,
});
assert(wakeDayRun && wakeDayRun.endTs >= secondRunStart, 'wake-day bounds select the target sleep run');

const longRunStart = Date.UTC(2026, 0, 1, 12, 30);
const nextWakeDay = Date.UTC(2026, 0, 2, 0, 0);
const crossMidnightRun = [
  ...Array.from({ length: 30 }, (_, i) => ({ ts: longRunStart - (30 - i) * minute, hr: 84, motion: 0.8 })),
  ...Array.from({ length: 12 * 60 }, (_, i) => ({ ts: longRunStart + i * minute, hr: 58, motion: 0 })),
  ...Array.from({ length: 30 }, (_, i) => ({ ts: longRunStart + (12 * 60 + i) * minute, hr: 84, motion: 0.8 })),
];
const cappedWakeDayRun = sleep.computeSleep(crossMidnightRun, undefined, {
  endAfterTs: nextWakeDay,
  endBeforeTs: nextWakeDay + 24 * 60 * minute,
});
assert(cappedWakeDayRun && cappedWakeDayRun.endTs >= nextWakeDay, 'window capping preserves the requested wake day');
assert(cappedWakeDayRun && cappedWakeDayRun.inBedMin <= 11 * 60, 'wake-day constrained window still obeys the duration cap');

const stateOnly = {
  source: 'auto_hr',
  inBedMin: 480,
  motionMin: 0,
  stillMin: 0,
  movingMin: 0,
  sleepStateMin: 480,
  sleepStateAsleepMin: 480,
  sleepStateStillMin: 0,
};
assert(evidence.sleepEvidencePct(stateOnly) === 0, 'candidate state is not independent sleep evidence');
assert(evidence.longAutoSleepNeedsCorroboration(stateOnly, false), 'state-only long sleep remains untrusted');

const stress = sleepStress.computeSleepStress(
  Array.from({ length: 8 }, (_, i) => ({ hr: 55 + i, rmssd: 70 - i * 2 })),
  null,
  10,
);
assert(stress != null, 'scores a sufficiently populated stress fixture');
assert(stress.highPct + stress.medPct + stress.lowPct === 80, 'sleep stress percentages use time in bed');
assert(stress.unscoredMin === 2 && stress.unscoredPct === 20, 'missing stress epochs remain explicitly unscored');

console.log('sleep reliability regression tests passed');
