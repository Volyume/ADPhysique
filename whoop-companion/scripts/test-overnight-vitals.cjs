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

const vitals = loadTypeScriptModule(path.join('src', 'metrics', 'overnightVitals.ts'));
const BASE_TS = 1_700_000_000_000;

function sleepFor(minutes, hypnogram, source = 'auto_hr') {
  return {
    startTs: BASE_TS,
    endTs: BASE_TS + minutes * 60_000,
    inBedMin: minutes,
    asleepMin: minutes - hypnogram.filter((part) => part.stage === 'awake').reduce((sum, part) => sum + part.minutes, 0),
    restorativeMin: 0,
    latencyMin: 0,
    wakeEvents: 0,
    efficiency: 0.95,
    stages: { awake: 0, light: minutes, deep: 0, rem: 0 },
    hypnogram,
    performance: 0.9,
    neededMin: 480,
    source,
    signalMin: minutes,
    hrvMin: minutes,
    motionMin: minutes,
    stillMin: minutes,
    movingMin: 0,
    sleepStateMin: 0,
    sleepStateWakeMin: 0,
    sleepStateStillMin: 0,
    sleepStateAsleepMin: 0,
    sleepStateUpMin: 0,
  };
}

function rrRows(minutes, hrForMinute, source = 'whoop5_v18', rrForMinute = () => null) {
  const rows = [];
  for (let minute = 0; minute < minutes; minute += 1) {
    for (let second = 0; second < 60; second += 1) {
      const rr = rrForMinute(minute, second) ?? (second % 2 === 0 ? 950 : 1050);
      const bpm = hrForMinute(minute, second, rr);
      rows.push({
        ts: BASE_TS + (minute * 60 + second) * 1000,
        bpm,
        rr: source === 'whoop5_v26_ppg' ? [] : [rr],
        source,
      });
    }
  }
  return rows;
}

function respiratoryRr(rateBrpm, seconds = 600) {
  const rr = [];
  let elapsed = 0;
  while (elapsed < seconds) {
    const interval = 1000 + 80 * Math.sin(2 * Math.PI * (rateBrpm / 60) * elapsed);
    rr.push(interval);
    elapsed += interval / 1000;
  }
  return rr;
}

function respiratoryRows(rateBrpm, startOffsetSec, seconds) {
  const rows = [];
  const values = respiratoryRr(rateBrpm, seconds);
  let elapsed = 0;
  for (const rr of values) {
    rows.push({
      ts: BASE_TS + (startOffsetSec + elapsed) * 1000,
      bpm: 60000 / rr,
      rr: [rr],
      source: 'whoop5_v18',
    });
    elapsed += rr / 1000;
  }
  return rows;
}

function respiratoryHeartRateRows(rateBrpm, seconds = 600) {
  return Array.from({ length: seconds }, (_, second) => ({
    ts: BASE_TS + second * 1000,
    bpm: Math.round(64 + 3 * Math.sin(2 * Math.PI * (rateBrpm / 60) * second)),
    rr: [],
    source: 'whoop5_v18',
  }));
}

function integerHeartRateNoise(seconds = 600) {
  let state = 0x12345678;
  return Array.from({ length: seconds }, (_, second) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return {
      ts: BASE_TS + second * 1000,
      bpm: 60 + (state % 11),
      rr: [],
      source: 'whoop5_v18',
    };
  });
}

function directHrRowsWithMissingRr() {
  const rows = [];
  for (let second = 0; second < 40 * 60; second += 1) {
      rows.push({
        ts: BASE_TS + second * 1000,
        bpm: 60,
        rr: [],
        source: 'whoop5_v18',
      });
  }
  return rows;
}

const stableSleep = sleepFor(80, [{ stage: 'light', minutes: 80 }]);
const endpointSleep = sleepFor(80, [
  { stage: 'awake', minutes: 10 },
  { stage: 'light', minutes: 60 },
  { stage: 'awake', minutes: 10 },
]);

const endpointRows = rrRows(
  80,
  (minute, _second, rr) => (minute < 10 || minute >= 70 ? 60000 / 667 : 60000 / rr),
);
const endpointVitals = vitals.computeOvernightVitals(endpointRows, endpointSleep);
assert(endpointVitals.rhr === 60, `awake endpoints must not raise RHR (got ${endpointVitals.rhr})`);
assert(vitals.maskHrSamplesToStableEpochs(endpointRows, endpointSleep).every((row) => {
  const minute = Math.floor((row.ts - BASE_TS) / 60_000);
  return minute >= 10 && minute < 70;
}), 'stable mask excludes both boundary-awake regions');

const artifactRows = rrRows(
  80,
  (minute, _second, rr) => (minute >= 10 && minute < 15 ? 60000 / 2000 : 60000 / rr),
  'whoop5_v18',
  (minute) => (minute >= 10 && minute < 15 ? 2000 : null),
);
const artifactVitals = vitals.computeOvernightVitals(artifactRows, stableSleep);
assert(artifactVitals.rhr === 60, `isolated low artifact windows must not become RHR (got ${artifactVitals.rhr})`);

const orderedVitals = vitals.computeOvernightVitals(endpointRows, endpointSleep);
const shuffledVitals = vitals.computeOvernightVitals(endpointRows.slice().reverse(), endpointSleep);
assert(JSON.stringify(orderedVitals) === JSON.stringify(shuffledVitals), 'out-of-order rows must produce the same vitals');

const constantRows = rrRows(80, (_minute, _second) => 60, 'whoop5_v18', () => 1000);
const partialVitals = vitals.computeOvernightVitals(constantRows, stableSleep);
assert(partialVitals.rhr === 60, `valid RHR must survive invalid HRV (got ${partialVitals.rhr})`);
assert(partialVitals.rmssd === null, `marginal zero-variation HRV windows must be rejected (got ${partialVitals.rmssd})`);
assert(vitals.computeRmssdFromRows(constantRows) === null, 'RMSSD selection is independent of RHR selection');

const sparseV18Rows = [];
for (let second = 0; second < 40 * 60; second += 2) {
  const rr = second % 4 === 0 ? 950 : 1050;
  sparseV18Rows.push({
    ts: BASE_TS + second * 1000,
    bpm: 60000 / rr,
    rr: [rr],
    source: 'whoop5_v18',
  });
}
assert(
  vitals.computeRmssdFromRows(sparseV18Rows) != null,
  'valid sparse WHOOP 5 v18 cadence publishes RMSSD without requiring impossible beat coverage',
);

const misleadingWakeState = Array.from({ length: 80 }, (_, minute) => ({
  startTs: BASE_TS + minute * 60_000,
  motion: 0,
  bandSleepState: 0,
}));
const wakeStateMask = vitals.buildSleepEpochMask(stableSleep, misleadingWakeState);
assert(wakeStateMask.every((epoch) => epoch.stable), 'unvalidated wake-state nibbles must not erase still overnight epochs');
const wakeStateVitals = vitals.computeOvernightVitals(endpointRows, stableSleep, wakeStateMask);
assert(wakeStateVitals.rhr != null && wakeStateVitals.rmssd != null, 'valid overnight HR and RR survive misleading wake-state nibbles');

const movingMask = vitals.buildSleepEpochMask(stableSleep, [{ startTs: BASE_TS, motion: 0.8, bandSleepState: 2 }]);
assert(movingMask[0]?.stable === false, 'independent high motion still excludes a wake-like epoch');

const directHrMissingRrVitals = vitals.computeOvernightVitals(directHrRowsWithMissingRr(), sleepFor(40, [{ stage: 'light', minutes: 40 }]));
assert(directHrMissingRrVitals.rhr === 60, 'three quality direct-HR windows with rr=[] still produce RHR');
assert(directHrMissingRrVitals.rmssd === null, 'direct-HR windows with rr=[] do not invent RMSSD');

const respiratoryRowsWithDisagreement = [
  ...respiratoryRows(15, 0, 600),
  ...respiratoryRows(20, 600, 600),
];
assert(
  vitals.computeRespiratoryRateFromRows(respiratoryRows(15, 0, 600)) === 15,
  'one long, clean respiratory segment is sufficient for a robust publication',
);
assert(vitals.computeRespiratoryRateFromRows(respiratoryRows(15, 0, 120)) === null, 'short respiratory evidence remains unpublished');
assert(
  vitals.computeRespiratoryRateFromRows(respiratoryHeartRateRows(15)) === 15,
  'timestamped continuous HR recovers a clean 15 brpm RSA rhythm when stored RR is sparse',
);
assert(
  vitals.computeRespiratoryRateFromRows(respiratoryHeartRateRows(15, 120)) === null,
  'short HR-only respiratory evidence remains unpublished',
);
assert(
  vitals.computeRespiratoryRateFromRows(integerHeartRateNoise()) === null,
  'integerized one-second HR noise cannot fabricate respiratory rate',
);
assert(
  vitals.computeRespiratoryRateFromRows([
    ...respiratoryRows(15, 0, 600),
    ...respiratoryRows(30, 600, 600),
  ]) === 15,
  'an out-of-band respiratory portion cannot erase a robust in-band estimate',
);
const respiratorySleep = sleepFor(30, [{ stage: 'light', minutes: 30 }]);
assert(
  vitals.computeOvernightVitals(respiratoryRowsWithDisagreement, respiratorySleep).resp === null,
  'disagreeing respiratory segments must return null',
);

const ppgRows = rrRows(80, () => 60, 'whoop5_v26_ppg');
const ppgVitals = vitals.computeOvernightVitals(ppgRows, stableSleep);
assert(ppgVitals.rmssd === null, 'PPG-only nights must never invent validated RMSSD');
assert(ppgVitals.rhr === null, 'PPG-only nights have no validated direct HR/RR RHR input');

const missingSource = { ...stableSleep };
delete missingSource.source;
assert(vitals.computeOvernightVitals(constantRows, missingSource).rmssd === null, 'missing sleep provenance fails closed');
assert(vitals.recoverySleepEvidence(missingSource, 480) === null, 'missing sleep provenance cannot feed recovery sleep evidence');
const recoveryEvidence = vitals.recoverySleepEvidence(stableSleep, 480);
assert(recoveryEvidence != null && recoveryEvidence > 0 && recoveryEvidence < 1, 'recovery sleep evidence uses bounded duration and efficiency');

console.log('overnight vitals regression tests passed');
