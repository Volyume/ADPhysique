const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

function loadTypeScriptModule(relativePath, mocks = {}) {
  const sourcePath = path.join(__dirname, '..', relativePath);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  const loaded = new Module(sourcePath, module);
  loaded.filename = sourcePath;
  loaded.paths = module.paths;
  const originalLoad = Module._load;
  Module._load = (request, parent, isMain) => {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    return originalLoad.call(Module, request, parent, isMain);
  };
  try {
    loaded._compile(compiled, sourcePath);
  } finally {
    Module._load = originalLoad;
  }
  return loaded.exports;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sleep = loadTypeScriptModule(path.join('src', 'metrics', 'sleep.ts'));
const sleepWindow = loadTypeScriptModule(path.join('src', 'util', 'sleepWindow.ts'));
const evidence = loadTypeScriptModule(path.join('src', 'metrics', 'sleepEvidence.ts'));
const sleepStress = loadTypeScriptModule(path.join('src', 'metrics', 'sleepStress.ts'));
const sleepConsistency = loadTypeScriptModule(path.join('src', 'metrics', 'sleepConsistency.ts'));
const sleepRegularity = loadTypeScriptModule(path.join('src', 'metrics', 'sleepRegularity.ts'));
const naps = loadTypeScriptModule(path.join('src', 'metrics', 'naps.ts'));
const dataQuality = loadTypeScriptModule(path.join('src', 'metrics', 'dataQuality.ts'));
const database = loadTypeScriptModule(path.join('src', 'db', 'database.ts'), {
  'expo-sqlite': {},
  '../metrics/dataQuality': dataQuality,
});
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

const moderateMotionOnly = {
  source: 'auto_hr',
  inBedMin: 480,
  motionMin: 480,
  stillMin: 0,
  movingMin: 0,
};
assert(evidence.sleepEvidencePct(moderateMotionOnly) === 0, 'moderate motion is not misclassified as stillness');

const unknownMotion = Array.from({ length: 180 }, (_, i) => ({
  ts: start + i * minute,
  hr: 60,
  motion: null,
  rmssd: 50,
}));
assert(sleep.computeSleep(unknownMotion) === null, 'unknown motion cannot establish an automatic sleep window');
const unknownMotionForced = sleep.computeSleep(unknownMotion, undefined, {
  forceWindow: true,
  startTs: start,
  endTs: start + 180 * minute,
});
assert(unknownMotionForced === null, 'manual HR with wholly unknown motion cannot persist zero sleep');

const oneMinuteUnknown = [
  ...Array.from({ length: 60 }, (_, i) => ({ ts: start + i * minute, hr: 60, motion: 0, rmssd: 50 })),
  { ts: start + 60 * minute, hr: 60, motion: null, rmssd: 50 },
  ...Array.from({ length: 60 }, (_, i) => ({ ts: start + (61 + i) * minute, hr: 60, motion: 0, rmssd: 50 })),
];
const oneMinuteUnknownResult = sleep.computeSleep(oneMinuteUnknown, undefined, {
  forceWindow: true,
  startTs: start,
  endTs: start + 121 * minute,
  source: 'manual_hr',
});
assert(oneMinuteUnknownResult && oneMinuteUnknownResult.stages.awake >= 1, 'an unknown-motion minute remains awake');
assert(oneMinuteUnknownResult && oneMinuteUnknownResult.asleepMin <= 120, 'unknown motion is not smoothed back into sleep');

const paddedSleep = [
  ...Array.from({ length: 20 }, (_, i) => ({ ts: start + i * minute, hr: 78, motion: 0 })),
  ...Array.from({ length: 180 }, (_, i) => ({ ts: start + (20 + i) * minute, hr: 60, motion: 0 })),
  ...Array.from({ length: 20 }, (_, i) => ({ ts: start + (200 + i) * minute, hr: 78, motion: 0 })),
];
const paddedResult = sleep.computeSleep(paddedSleep);
assert(
  paddedResult && paddedResult.inBedMin >= 175 && paddedResult.inBedMin <= 180,
  `detectable quiet boundary padding is excluded (got ${paddedResult ? paddedResult.inBedMin : 'null'}m)`,
);

const fragmented = [
  ...Array.from({ length: 100 }, (_, i) => ({ ts: start + i * minute, hr: 60, motion: 0 })),
  ...Array.from({ length: 20 }, (_, i) => ({ ts: start + (100 + i) * minute, hr: null, motion: null })),
  ...Array.from({ length: 100 }, (_, i) => ({ ts: start + (120 + i) * minute, hr: 60, motion: 0 })),
];
const fragmentedResult = sleep.computeSleep(fragmented);
assert(fragmentedResult && fragmentedResult.inBedMin <= 100, 'fragmented evidence is not blind-gap bridged');

const makeCore = (offset, count, hr = 60, motion = 0) =>
  Array.from({ length: count }, (_, i) => ({ ts: start + (offset + i) * minute, hr, motion }));
const fiveMinuteQuietGap = [...makeCore(0, 100), ...makeCore(100, 5, 64, 0.25), ...makeCore(105, 100)];
const fiveMinuteResult = sleep.computeSleep(fiveMinuteQuietGap);
assert(fiveMinuteResult && fiveMinuteResult.inBedMin >= 200, 'an exact five-minute quiet bridge remains in one window');
const sixMinuteQuietGap = [...makeCore(0, 100), ...makeCore(100, 6, 64, 0.25), ...makeCore(106, 100)];
const sixMinuteResult = sleep.computeSleep(sixMinuteQuietGap);
assert(sixMinuteResult && sixMinuteResult.inBedMin <= 105, 'an exact six-minute quiet gap is not bridged');

const observedAwakening = [
  ...makeCore(0, 120),
  ...makeCore(120, 20, 86, 0.7),
  ...makeCore(140, 120, 58, 0),
];
const observedAwakeningResult = sleep.computeSleep(observedAwakening);
assert(observedAwakeningResult && observedAwakeningResult.inBedMin >= 235, 'observed 20-minute awakening keeps one conservative TIB window');
assert(observedAwakeningResult && observedAwakeningResult.stages.awake >= 15, 'observed awakening minutes remain awake');

const fragmentedStart = Date.UTC(2026, 0, 4, 18, 0);
const makeFragmentedCore = (offset, count, hr = 58) =>
  Array.from({ length: count }, (_, i) => ({ ts: fragmentedStart + (offset + i) * minute, hr, motion: 0 }));
const wakeBlock = (offset, count = 60) =>
  Array.from({ length: count }, (_, i) => ({ ts: fragmentedStart + (offset + i) * minute, hr: 86, motion: 0.8 }));
const fragmentedSleep = [
  ...Array.from({ length: 30 }, (_, i) => ({ ts: fragmentedStart - (30 - i) * minute, hr: 84, motion: 0.8 })),
  ...makeFragmentedCore(0, 15 * 60),
  ...wakeBlock(15 * 60),
  ...makeFragmentedCore(16 * 60, 3 * 60),
  ...wakeBlock(19 * 60),
  ...makeFragmentedCore(20 * 60, 4 * 60),
  ...Array.from({ length: 30 }, (_, i) => ({ ts: fragmentedStart + (24 * 60 + i) * minute, hr: 84, motion: 0.8 })),
];
const extendedFragmentedResult = sleep.computeSleep(fragmentedSleep);
assert(
  extendedFragmentedResult && extendedFragmentedResult.inBedMin >= 24 * 60 - 5 && extendedFragmentedResult.inBedMin <= 24 * 60,
  'strong observed cores merge into one conservatively trimmed 24-hour TIB window',
);
assert(extendedFragmentedResult && extendedFragmentedResult.stages.awake >= 120, 'observed 60-minute awakenings remain awake');

const fragmentedMissingGap = fragmentedSleep.map((sample) => ({ ...sample }));
for (let i = 15 * 60; i < 16 * 60; i += 1) {
  const sample = fragmentedMissingGap.find((candidate) => candidate.ts === fragmentedStart + i * minute);
  if (sample) {
    sample.hr = null;
    sample.motion = null;
  }
}
const fragmentedMissingResult = sleep.computeSleep(fragmentedMissingGap);
assert(!fragmentedMissingResult || fragmentedMissingResult.inBedMin < 24 * 60, 'missing HR and motion gaps never merge fragmented cores');

const normalSingleRun = [
  ...Array.from({ length: 30 }, (_, i) => ({ ts: fragmentedStart - (30 - i) * minute, hr: 84, motion: 0.8 })),
  ...Array.from({ length: 12 * 60 }, (_, i) => ({ ts: fragmentedStart + i * minute, hr: 58, motion: 0 })),
  ...Array.from({ length: 30 }, (_, i) => ({ ts: fragmentedStart + (12 * 60 + i) * minute, hr: 84, motion: 0.8 })),
];
const normalSingleResult = sleep.computeSleep(normalSingleRun);
assert(normalSingleResult && normalSingleResult.inBedMin <= 11 * 60, 'normal single quiet run remains capped at 11 hours');

const manualWindowStart = Date.UTC(2026, 0, 4, 18, 0);
const manualWindowEnd = Date.UTC(2026, 0, 5, 18, 0);
assert(sleepWindow.sleepWindowDurationMin(manualWindowStart, manualWindowEnd) === 24 * 60, 'same-clock manual window is 24 hours');
assert(sleepWindow.isManualSleepWindowDurationAllowed(manualWindowStart, manualWindowEnd), 'manual 24-hour timestamp window is accepted');
const manualResult = sleep.computeSleep([], undefined, {
  forceWindow: true,
  startTs: manualWindowStart,
  endTs: manualWindowEnd,
  source: 'manual_duration',
});
assert(manualResult && manualResult.inBedMin === 24 * 60, 'manual 24-hour window is scored over its full bounds');

const quietNineHours = Array.from({ length: 9 * 60 }, (_, i) => ({
  ts: start + i * minute,
  hr: 60,
  motion: 0,
}));
assert(sleep.computeSleep(quietNineHours) === null, 'quiet nine-hour data without wake boundaries is rejected');
const boundedNineHours = [
  ...Array.from({ length: 30 }, (_, i) => ({ ts: start + (i - 30) * minute, hr: 84, motion: 0.7 })),
  ...quietNineHours.map((sample) => ({ ...sample, ts: sample.ts + 30 * minute })),
  ...Array.from({ length: 30 }, (_, i) => ({ ts: start + (9 * 60 + 30 + i) * minute, hr: 84, motion: 0.7 })),
];
assert(sleep.computeSleep(boundedNineHours) != null, 'real long rest with observed wake boundaries remains eligible');

const boundaryNap = {
  source: 'nap',
  startTs: start - 10 * minute,
  endTs: start + 30 * minute,
  notes: null,
};
assert(naps.napCreditMin(boundaryNap) === 20, 'an unverified timed nap receives conservative half-duration credit');
assert(naps.napCreditMinWithin(boundaryNap, start, start + 60 * minute) === 15, 'nap credit is limited to window overlap');
assert(naps.napCreditMinWithin(boundaryNap, start + 30 * minute, start + 60 * minute) === 0, 'nap credit excludes non-overlapping windows');
assert(naps.napCreditMinWithin(boundaryNap, start - 60 * minute, start + 60 * minute) === 20, 'nap credit is capped at the full nap credit');
assert(naps.napCreditMinWithin({ ...boundaryNap, endTs: boundaryNap.startTs }, start, start + 60 * minute) === 0, 'invalid nap intervals receive no overlap credit');
const splitWindows = [
  [start, start + 10 * minute],
  [start + 10 * minute, start + 20 * minute],
  [start + 20 * minute, start + 60 * minute],
];
const splitCredit = splitWindows.reduce(
  (total, [windowStart, windowEnd]) => total + naps.napCreditMinWithin(boundaryNap, windowStart, windowEnd),
  0,
);
const coveredBoundaryNapCredit = naps.napCreditMinWithin(boundaryNap, start, start + 60 * minute);
assert(splitCredit <= coveredBoundaryNapCredit, 'split nap windows cannot over-credit their covered nap range');
const splitRoundingLoss = coveredBoundaryNapCredit - splitCredit;
const nonEmptySplitWindows = splitWindows.filter(
  ([windowStart, windowEnd]) => Math.min(boundaryNap.endTs, windowEnd) > Math.max(boundaryNap.startTs, windowStart),
).length;
assert(
  splitRoundingLoss >= 0 && splitRoundingLoss <= nonEmptySplitWindows,
  'split nap floor rounding never over-credits and loses at most one minute per non-empty window',
);
const tinyCreditNap = { ...boundaryNap, startTs: start, endTs: start + 3 * minute };
assert(naps.napCreditMin(tinyCreditNap) === 2, 'short unverified naps retain integer conservative credit');
const tinySplitCredit =
  naps.napCreditMinWithin(tinyCreditNap, start, start + minute) +
  naps.napCreditMinWithin(tinyCreditNap, start + minute, start + 2 * minute) +
  naps.napCreditMinWithin(tinyCreditNap, start + 2 * minute, start + 3 * minute);
assert(tinySplitCredit <= naps.napCreditMin(tinyCreditNap), 'small split credits never exceed full credit');
const overcreditedObservedNap = {
  ...boundaryNap,
  endTs: start + 30 * minute,
  notes: naps.encodeNapDetail({
    kind: 'nap_sleep',
    autoDetected: false,
    startTs: start,
    endTs: start + 30 * minute,
    inBedMin: 30,
    asleepMin: 120,
    restorativeMin: 120,
    efficiency: 100,
    signalMin: 30,
    coveragePct: 100,
    source: 'manual_hr',
  }),
};
assert(naps.napCreditMinWithin(overcreditedObservedNap, start, start + minute) === 1, 'overlap credit cannot exceed actual elapsed overlap');
const existingAutoNap = { startTs: start + 10 * minute, endTs: start + 20 * minute };
assert(naps.napIntervalsOverlap(existingAutoNap, { startTs: start + 19 * minute, endTs: start + 30 * minute }), 'positive nap overlap is detected');
assert(!naps.napIntervalsOverlap(existingAutoNap, { startTs: start + 20 * minute, endTs: start + 30 * minute }), 'touching nap intervals do not overlap');
assert(!naps.canInsertAutoNap({ startTs: start + 19 * minute, endTs: start + 30 * minute }, [existingAutoNap]), 'any overlapping auto nap is rejected');
assert(naps.canInsertAutoNap({ startTs: start + 20 * minute, endTs: start + 30 * minute }, [existingAutoNap]), 'a touching auto nap is allowed without double credit');

assert(
  database.NAP_OVERLAP_QUERY ===
    "SELECT * FROM cardio WHERE source = 'nap' AND start_ts < ? AND end_ts > ? ORDER BY start_ts ASC",
  'nap query keeps source filtering and strict overlap bounds',
);
assert(database.intervalsOverlap(start, start + 10 * minute, start + 10 * minute, start + 20 * minute) === false, 'nap query excludes touching intervals');
assert(database.intervalsOverlap(start, start + 10 * minute, start + 9 * minute, start + 11 * minute) === true, 'nap query includes intervals with positive overlap');
assert(database.intervalsOverlap(start, start + 10 * minute, start + 11 * minute, start + 20 * minute) === false, 'nap query excludes disjoint intervals');

const timerDetail = naps.napDetailFromSleep({
  source: 'manual_duration',
  startTs: start,
  endTs: start + 40 * minute,
  inBedMin: 40,
  asleepMin: 36,
  restorativeMin: 12,
  efficiency: 0.9,
  signalMin: 0,
}, false);
assert(timerDetail.asleepMin === 0 && timerDetail.restorativeMin === 0, 'timer naps do not present invented sleep minutes');
assert(naps.napCreditMin({ ...boundaryNap, startTs: start, endTs: start + 40 * minute, notes: naps.encodeNapDetail(timerDetail) }) === 20, 'timer naps retain capped conservative unverified credit');

const validStages = database.cleanStageMinutes({ deepMin: 180, remMin: 120, lightMin: 180, awakeMin: 20 }, 480, 500);
assert(validStages.deep === 180 && validStages.awake === 20, 'valid asleep and awake totals are retained');
const impossibleAsleep = database.cleanStageMinutes({ deepMin: 181, remMin: 120, lightMin: 180, awakeMin: 20 }, 480, 500);
assert(impossibleAsleep.deep === null && impossibleAsleep.awake === null, 'impossible asleep stage totals are rejected');
const impossibleAwake = database.cleanStageMinutes({ deepMin: 180, remMin: 120, lightMin: 180, awakeMin: 21 }, 480, 500);
assert(impossibleAwake.deep === null && impossibleAwake.awake === null, 'asleep plus awake cannot exceed time in bed');
const awakeWithoutWindow = database.cleanStageMinutes({ deepMin: 180, remMin: 120, lightMin: 180, awakeMin: 1 }, 480, null);
assert(awakeWithoutWindow.awake === null, 'awake minutes require a time-in-bed window');

const stress = sleepStress.computeSleepStress(
  Array.from({ length: 8 }, (_, i) => ({ hr: 55 + i, rmssd: 70 - i * 2 })),
  null,
  10,
);
assert(stress != null, 'scores a sufficiently populated stress fixture');
assert(stress.highPct + stress.medPct + stress.lowPct === 80, 'sleep stress percentages use time in bed');
assert(stress.unscoredMin === 2 && stress.unscoredPct === 20, 'missing stress epochs remain explicitly unscored');

const orderedWindows = Array.from({ length: 30 }, (_, index) => {
  const day = new Date(2026, 0, 1 + index, index < 16 ? (index % 4) * 3 : 23, index < 16 ? (index % 3) * 17 : 0, 0, 0);
  const end = new Date(day);
  end.setHours(end.getHours() + 8);
  return { startTs: day.getTime(), endTs: end.getTime() };
});
const newestFirstWindows = orderedWindows.slice().reverse();
const recentConsistency = sleepConsistency.sleepConsistency(newestFirstWindows);
const recentRegularity = sleepRegularity.sleepRegularity(newestFirstWindows);
assert(recentConsistency?.nights === 5 && recentConsistency.score >= 95, 'consistency selects the latest five nights from newest-first DB rows');
assert(recentRegularity?.nights === 14 && recentRegularity.score >= 95, 'regularity selects the latest 14 nights from newest-first DB rows');

console.log('sleep reliability regression tests passed');
