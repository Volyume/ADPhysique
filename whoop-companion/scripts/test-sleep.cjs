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

console.log('sleep reliability regression tests passed');
