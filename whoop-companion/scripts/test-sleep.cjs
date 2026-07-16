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
const naps = loadTypeScriptModule(path.join('src', 'metrics', 'naps.ts'), {
  './sleepEvidence': evidence,
});
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
assert(evidence.autoSleepAtSafetyCeiling(cappedWakeDayRun), 'a cap-hit automatic window is flagged for review');
assert(!evidence.autoSleepAtSafetyCeiling({ inBedMin: 10 * 60 }), 'a naturally bounded ten-hour window is not flagged');
assert(
  !evidence.autoSleepAtSafetyCeiling({ inBedMin: 655, cappedBySafetyLimit: false }),
  'an explicitly uncapped 10h55 window is not mistaken for a safety truncation',
);
assert(!evidence.autoSleepAtSafetyCeiling(cappedWakeDayRun, true), 'manual windows are not mistaken for automatic cap hits');

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
assert(unknownMotionForced && unknownMotionForced.asleepMin === 180, 'manual HR window remains scorable when motion history is unavailable');
assert(unknownMotionForced && unknownMotionForced.motionMin === 0, 'missing motion remains explicit instead of being fabricated as stillness');

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
assert(oneMinuteUnknownResult && oneMinuteUnknownResult.stages.awake === 0, 'an HR-observed minute is not forced awake only because motion is missing');
assert(oneMinuteUnknownResult && oneMinuteUnknownResult.asleepMin === 121, 'missing motion does not erase otherwise observed sleep');
assert(
  oneMinuteUnknownResult && oneMinuteUnknownResult.stages.deep === 0 && oneMinuteUnknownResult.stages.rem === 0,
  'missing beat-to-beat intervals are not imputed as observed deep or REM sleep',
);

const hrDropoutWindow = [
  ...Array.from({ length: 60 }, (_, i) => ({ ts: start + i * minute, hr: 60, motion: 0, rmssd: 50 })),
  ...Array.from({ length: 60 }, (_, i) => ({ ts: start + (60 + i) * minute, hr: null, motion: null, rmssd: null })),
  ...Array.from({ length: 60 }, (_, i) => ({ ts: start + (120 + i) * minute, hr: 60, motion: 0, rmssd: 50 })),
];
const hrDropoutResult = sleep.computeSleep(hrDropoutWindow, undefined, {
  forceWindow: true,
  startTs: start,
  endTs: start + 180 * minute,
  source: 'manual_hr',
});
assert(hrDropoutResult && hrDropoutResult.unscoredMin === 60, 'an HR dropout is retained as unscored time');
assert(hrDropoutResult && hrDropoutResult.stages.awake === 0, 'missing HR is not fabricated as observed wake');
assert(hrDropoutResult && hrDropoutResult.asleepMin === 120, 'unscored time cannot inflate observed sleep');
assert(
  hrDropoutResult && hrDropoutResult.hypnogram.some((segment) => segment.stage === 'unknown' && segment.minutes === 60),
  'the hypnogram exposes the full data gap',
);

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
  extendedFragmentedResult && extendedFragmentedResult.inBedMin <= 16 * 60,
  'automatic fragmented sleep cannot inflate into an all-day 24-hour window',
);

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

const sparseManualFragmented = fragmentedSleep
  .filter((sample) => sample.ts >= manualWindowStart && sample.ts < manualWindowEnd)
  .map((sample, index) => {
    const inWakeBlock = (index >= 15 * 60 && index < 16 * 60) || (index >= 19 * 60 && index < 20 * 60);
    if (inWakeBlock) return sample;
    if (index % 5 === 0) return { ...sample, hr: null, motion: null };
    return { ...sample, motion: index % 4 === 0 ? 0 : null };
  });
const sparseManualResult = sleep.computeSleep(sparseManualFragmented, undefined, {
  forceWindow: true,
  startTs: manualWindowStart,
  endTs: manualWindowEnd,
  source: 'manual_hr',
});
assert(sparseManualResult && sparseManualResult.signalMin >= 1_000, 'partial WHOOP HR history still covers most of the fragmented manual window');
assert(sparseManualResult && sparseManualResult.motionMin < sparseManualResult.signalMin / 2, 'fixture preserves sparse motion coverage');
assert(sparseManualResult && sparseManualResult.asleepMin >= 1_000, 'missing motion no longer collapses HR-observed fragmented sleep');
assert(sparseManualResult && sparseManualResult.stages.awake >= 120, 'observed one-hour awakenings remain awake with sparse motion history');

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

const longSecondarySleep = {
  inBedMin: 180,
  asleepMin: 165,
  signalMin: 175,
  motionMin: 170,
  stillMin: 150,
  movingMin: 15,
  efficiency: 0.92,
};
assert(
  !naps.autoSecondarySleepIsReliable(longSecondarySleep, false),
  'a long secondary sleep requires independently observed wake boundaries',
);
assert(
  naps.autoSecondarySleepIsReliable(longSecondarySleep, true),
  'a well-covered three-hour secondary sleep is preserved when both wake edges are observed',
);
assert(
  !naps.autoSecondarySleepIsReliable({ ...longSecondarySleep, inBedMin: 241 }, true),
  'automatic secondary sleep remains capped at four hours',
);

// A short, flat, sedentary window (sitting at a desk) must not be accepted as a
// nap unless it shows observed wake boundaries — the false 100% efficiency nap.
const shortFlatWindow = { inBedMin: 40, asleepMin: 40, signalMin: 40, motionMin: 32, stillMin: 32, movingMin: 0, efficiency: 1 };
assert(
  !naps.autoSecondarySleepIsReliable(shortFlatWindow, false),
  'a short flat sedentary window with no wake boundaries is rejected as a nap',
);
assert(
  naps.autoSecondarySleepIsReliable(shortFlatWindow, true),
  'a short nap with observed wake boundaries is still accepted',
);

// HR jaggedness: real sleep HR is smooth (low), an awake/desk trace is jagged.
const smoothSleepHr = Array.from({ length: 30 }, (_, i) => 56 + Math.round(Math.sin(i / 6)));
const jaggedDeskHr = Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 58 : 88));
assert(naps.hrJaggednessBpm(smoothSleepHr) < 4, 'a smooth sleeping HR trace has low jaggedness');
assert(naps.hrJaggednessBpm(jaggedDeskHr) > 4, 'an erratic desk HR trace has high jaggedness');

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

// Item 3 (blueprint Change 3): respiratory-rate variability refines deep vs REM
// among already-asleep epochs, without changing any sleep/wake totals.
const stageMinute = 60_000;
const stageStart = 1_800_000;
function stagingNight(withResp) {
  const rows = [];
  for (let i = 0; i < 60; i += 1) {
    rows.push({ ts: stageStart + i * stageMinute, hr: 55, motion: 0, rmssd: 70, respVar: withResp ? 4.0 : null });
  }
  for (let i = 0; i < 60; i += 1) {
    const steady = i < 20; // steady-breathing REM epochs that should reclassify to deep
    rows.push({ ts: stageStart + (60 + i) * stageMinute, hr: 62, motion: 0, rmssd: 30, respVar: withResp ? (steady ? 1.0 : 4.0) : null });
  }
  return rows;
}
const baseStaging = sleep.computeSleep(stagingNight(false), undefined, { forceWindow: true });
const respStaging = sleep.computeSleep(stagingNight(true), undefined, { forceWindow: true });
assert(baseStaging && respStaging, 'staging computes for both inputs');
assert(baseStaging.stages.deep > 0 && baseStaging.stages.rem > 0, 'baseline night has both deep and REM');
assert(
  respStaging.stages.deep + respStaging.stages.rem === baseStaging.stages.deep + baseStaging.stages.rem,
  'respiratory refinement preserves total restorative minutes',
);
assert(respStaging.asleepMin === baseStaging.asleepMin, 'respiratory refinement preserves asleep minutes');
assert(respStaging.inBedMin === baseStaging.inBedMin, 'respiratory refinement preserves time in bed');
assert(respStaging.stages.awake === baseStaging.stages.awake, 'respiratory refinement never creates or removes wake');
assert(respStaging.stages.deep > baseStaging.stages.deep, 'steady breathing reclassifies REM epochs as deep');

// An awake minute flanked by REM and deep must never be smoothed into sleep once
// respiratory refinement makes both flanks 'deep' (the ordering blocker). Build a
// long night so a genuine wake episode survives, with an isolated awake minute
// between a REM run and a deep run, and steady breathing on the REM side.
function flankNight(withResp) {
  const rows = [];
  let i = 0;
  const push = (count, hr, motion, rmssd, respVar) => {
    for (let k = 0; k < count; k += 1) {
      rows.push({ ts: stageStart + i * stageMinute, hr, motion, rmssd, respVar: withResp ? respVar : null });
      i += 1;
    }
  };
  push(40, 62, 0, 30, 1.0); // REM run, steady breathing -> would reclassify to deep
  push(1, 95, 0.9, 30, 4.0); // a single clear awake minute (high HR + motion)
  push(40, 55, 0, 70, 4.0); // deep run
  return rows;
}
const baseFlank = sleep.computeSleep(flankNight(false), undefined, { forceWindow: true });
const respFlank = sleep.computeSleep(flankNight(true), undefined, { forceWindow: true });
assert(baseFlank && respFlank, 'flank staging computes for both inputs');
assert(baseFlank.stages.awake >= 1, 'baseline flank night keeps the isolated awake minute');
assert(
  respFlank.stages.awake === baseFlank.stages.awake,
  'respiratory refinement never converts a flanked awake minute into sleep',
);
assert(respFlank.asleepMin === baseFlank.asleepMin, 'flank refinement preserves asleep minutes');
assert(
  respFlank.stages.deep + respFlank.stages.rem === baseFlank.stages.deep + baseFlank.stages.rem,
  'flank refinement preserves total restorative minutes',
);

// Proprietary Sleep Need (blueprint Change SN): science-based strain/debt terms.
const needEasy = sleep.computeSleepNeed({ baselineMin: 480, recentStrain: 6, accruedDebtMin: 0, napMin: 0 });
assert(needEasy.strainMin === 0, 'strain at or below the knee (8) adds no need');
const needMax = sleep.computeSleepNeed({ baselineMin: 480, recentStrain: 21, accruedDebtMin: 0, napMin: 0 });
assert(needMax.strainMin === 60, 'maximal strain adds the 60-minute ceiling');
const needMid = sleep.computeSleepNeed({ baselineMin: 480, recentStrain: 14, accruedDebtMin: 0, napMin: 0 });
assert(needMid.strainMin > 0 && needMid.strainMin < 60, 'mid strain adds between 0 and 60 minutes');
assert(needMid.strainMin >= needEasy.strainMin, 'the strain term is monotonic in strain');
assert(
  sleep.computeSleepNeed({ baselineMin: 480, recentStrain: null, accruedDebtMin: 60, napMin: 0 }).debtMin === 30,
  'the debt term repays half of accrued debt',
);
assert(
  sleep.computeSleepNeed({ baselineMin: 480, recentStrain: null, accruedDebtMin: 400, napMin: 0 }).debtMin === 90,
  'debt repayment is capped at 90 minutes',
);
assert(
  sleep.computeSleepNeed({ baselineMin: 480, recentStrain: null, accruedDebtMin: 0, napMin: 200 }).napMin === 120,
  'nap credit is capped at 120 minutes',
);
assert(
  sleep.computeSleepNeed({ baselineMin: 400, recentStrain: null, accruedDebtMin: 0, napMin: 200 }).neededMin === 300,
  'need never drops below the 300-minute wellbeing floor',
);
assert(
  sleep.computeSleepNeed({ baselineMin: 480, recentStrain: 21, accruedDebtMin: 400, napMin: 0 }).neededMin <= 480 + 180,
  'need never exceeds the personal baseline plus 180 minutes',
);

// Proprietary Sleep Score (blueprint Change SS): two-sided curves + confidence gate.
const sleepScore = loadTypeScriptModule(path.join('src', 'metrics', 'sleepScore.ts'));
const SLEEP_SCORE_BASE = Date.UTC(2026, 0, 1, 23, 0, 0);
function makeSleepResult(overrides = {}) {
  const base = {
    startTs: SLEEP_SCORE_BASE, endTs: SLEEP_SCORE_BASE + 480 * 60000, inBedMin: 480, asleepMin: 450,
    restorativeMin: 200, latencyMin: 15, wakeEvents: 1, efficiency: 0.94,
    stages: { awake: 30, light: 250, deep: 90, rem: 110 }, hypnogram: [{ stage: 'light', minutes: 450 }],
    unscoredMin: 0, cappedBySafetyLimit: false, performance: 0.95, neededMin: 480, source: 'auto_hr',
    signalMin: 450, hrvMin: 300, motionMin: 450, stillMin: 450, movingMin: 0,
    sleepStateMin: 0, sleepStateWakeMin: 0, sleepStateStillMin: 0, sleepStateAsleepMin: 0, sleepStateUpMin: 0,
  };
  return { ...base, ...overrides, stages: { ...base.stages, ...(overrides.stages || {}) } };
}
const scoreOf = (o) => sleepScore.computeSleepScore(makeSleepResult(o)).score;
const contribOf = (o, key) => sleepScore.computeSleepScore(makeSleepResult(o)).contributors.find((c) => c.key === key).score;
assert(scoreOf() >= 1 && scoreOf() <= 99, 'sleep score stays in range');
assert(
  contribOf({ stages: { rem: 99 } }, 'rem') > contribOf({ stages: { rem: 36 } }, 'rem') &&
    contribOf({ stages: { rem: 99 } }, 'rem') > contribOf({ stages: { rem: 180 } }, 'rem'),
  'two-sided REM penalises both too-little and too-much',
);
assert(
  contribOf({ latencyMin: 15 }, 'latency') > contribOf({ latencyMin: 2 }, 'latency') &&
    contribOf({ latencyMin: 15 }, 'latency') > contribOf({ latencyMin: 60 }, 'latency'),
  'two-sided latency penalises very short and very long',
);
assert(
  scoreOf({ source: 'manual_duration', stages: { rem: 180, deep: 20 } }) ===
    scoreOf({ source: 'manual_duration', stages: { rem: 99, deep: 90 } }),
  'with zero staging confidence, REM/deep values do not move the score',
);
assert(contribOf({ asleepMin: 480 }, 'total') >= contribOf({ asleepMin: 360 }, 'total'), 'duration adequacy is monotonic up to need');

// ---- A sustained activity block (e.g. a dog walk) breaks the night ----
const walkNight = [
  ...Array.from({ length: 60 }, (_, i) => ({ ts: start + i * minute, hr: 60, motion: 0 })),
  ...Array.from({ length: 8 }, (_, i) => ({ ts: start + (60 + i) * minute, hr: 90, motion: 1 })),
  ...Array.from({ length: 60 }, (_, i) => ({ ts: start + (68 + i) * minute, hr: 60, motion: 0 })),
];
const walk = sleep.computeSleep(walkNight, undefined, {
  forceWindow: true,
  source: 'manual_hr',
  startTs: walkNight[0].ts,
  endTs: walkNight[walkNight.length - 1].ts + minute,
});
assert(walk != null, 'scores a window with a mid-sleep activity block');
assert(walk.stages.awake >= 16, 'a sustained activity block plus its settling period is marked awake');
let episodeSplit = false;
for (let i = 1; i < walk.hypnogram.length - 1; i += 1) {
  const seg = walk.hypnogram[i];
  if (seg.stage !== 'awake' || seg.minutes < 8) continue;
  const asleepBefore = walk.hypnogram.slice(0, i).some((s) => s.stage === 'light' || s.stage === 'deep' || s.stage === 'rem');
  const asleepAfter = walk.hypnogram.slice(i + 1).some((s) => s.stage === 'light' || s.stage === 'deep' || s.stage === 'rem');
  if (asleepBefore && asleepAfter) { episodeSplit = true; break; }
}
assert(episodeSplit, 'the activity block splits the window into separate sleep episodes');

// ---- Resting-HR anchor: elevated still-time is not counted as sleep ----
// A confirmed window that is mostly still but sits ~16 bpm above the sleeping
// floor (quiet wakefulness) must not read as sleep, while the near-floor minutes
// remain asleep.
const elevatedStill = [
  ...Array.from({ length: 20 }, (_, i) => ({ ts: start + i * minute, hr: 62, motion: 0 })),
  ...Array.from({ length: 100 }, (_, i) => ({ ts: start + (20 + i) * minute, hr: 78, motion: 0 })),
];
const anchored = sleep.computeSleep(elevatedStill, undefined, {
  forceWindow: true,
  source: 'manual_hr',
  startTs: elevatedStill[0].ts,
  endTs: elevatedStill[elevatedStill.length - 1].ts + minute,
});
assert(anchored != null, 'scores a forced/confirmed window');
assert(anchored.stages.awake >= 90, 'still-time well above the sleeping floor is reclassified as awake, not sleep');
assert(anchored.asleepMin <= 40, 'only near-floor minutes remain asleep in an elevated-HR confirmed window');

// A normal night that stays close to its sleeping floor is preserved: the anchor
// never converts genuine near-floor light sleep into wake.
const nearFloorNight = Array.from({ length: 120 }, (_, i) => ({ ts: start + i * minute, hr: 58 + (i % 6), motion: 0 }));
const nearFloor = sleep.computeSleep(nearFloorNight, undefined, {
  forceWindow: true,
  source: 'manual_hr',
  startTs: nearFloorNight[0].ts,
  endTs: nearFloorNight[nearFloorNight.length - 1].ts + minute,
});
assert(nearFloor != null && nearFloor.asleepMin >= 110, 'near-floor light sleep is preserved by the resting-HR anchor');

// ---- Overnight jaggedness lowers sleep confidence (never raises it) ----
// Extract just the pure helper from appStore.ts so the whole store (and its
// native deps) need not be loaded.
function loadPureExport(relativePath, exportName) {
  const sourcePath = path.join(__dirname, '..', relativePath);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const start = source.indexOf(`export function ${exportName}`);
  assert(start >= 0, `${exportName} must be exported`);
  const open = source.indexOf('{', source.indexOf(')', start));
  let depth = 0;
  let close = -1;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) { close = i + 1; break; }
    }
  }
  assert(close > open, `${exportName} body must be balanced`);
  const snippet = source.slice(start, close);
  const out = ts.transpileModule(`${snippet}\nmodule.exports = ${exportName};`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  const loaded = new Module(sourcePath, module);
  loaded.filename = sourcePath;
  loaded.paths = module.paths;
  loaded._compile(out, sourcePath);
  return loaded.exports;
}

const downgradeSleepConfidenceForJaggedness = loadPureExport('src/state/appStore.ts', 'downgradeSleepConfidenceForJaggedness');
// A smooth night keeps its confidence.
assert(downgradeSleepConfidenceForJaggedness('high', 3, false) === 'high', 'a smooth overnight window keeps high confidence');
assert(downgradeSleepConfidenceForJaggedness('medium', 4, false) === 'medium', 'a smooth overnight window keeps medium confidence');
// A jagged night is lowered, never raised.
assert(downgradeSleepConfidenceForJaggedness('high', 7, false) === 'medium', 'a jagged overnight window downgrades high to medium');
assert(downgradeSleepConfidenceForJaggedness('medium', 7, false) === 'low', 'a jagged overnight window downgrades medium to low');
assert(downgradeSleepConfidenceForJaggedness('high', 12, false) === 'low', 'a very jagged overnight window downgrades straight to low');
assert(downgradeSleepConfidenceForJaggedness('low', 20, false) === 'low', 'confidence is never raised by the jaggedness gate');
// A hand-logged window is never downgraded by jaggedness.
assert(downgradeSleepConfidenceForJaggedness('high', 20, true) === 'high', 'a manually logged window keeps its evidence-based confidence');

// ---- Resting HR is auto-calibrated (no static assumption) ----
const calibrateRestingHr = loadPureExport('src/state/appStore.ts', 'calibrateRestingHr');
assert(calibrateRestingHr([]) === null, 'no measured nights -> keep the stored resting HR');
assert(calibrateRestingHr([66, 67]) === null, 'too few nights -> keep the stored resting HR');
assert(calibrateRestingHr([66, 68, 67, 69, 66]) === 67, 'calibrates to the median of measured overnight resting HR');
// A single anomalous night cannot drag the median; only recent nights count.
assert(calibrateRestingHr([70, 71, 69, 70, 200]) === 70, 'an outlier night does not distort the calibrated resting HR');
assert(calibrateRestingHr([200, 5, 70, 70, 70]) === 70, 'calibrated resting HR stays at the robust median');

console.log('sleep reliability regression tests passed');
