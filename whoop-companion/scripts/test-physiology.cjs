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

const ema = loadTypeScriptModule(path.join('src', 'metrics', 'ema.ts'));
const hrv = loadTypeScriptModule(path.join('src', 'metrics', 'hrv.ts'));
const respiratory = loadTypeScriptModule(path.join('src', 'metrics', 'respiratory.ts'));
const trust = loadTypeScriptModule(path.join('src', 'metrics', 'sleepTrustWeight.ts'));
const skinTemperature = loadTypeScriptModule(path.join('src', 'whoop', 'skinTemperature.ts'));
const historical = require(path.join(__dirname, '..', 'src', 'whoop', 'historicalParse.ts'));
const crc = require(path.join(__dirname, '..', 'src', 'whoop', 'crc.ts'));
const commands = require(path.join(__dirname, '..', 'src', 'whoop', 'commands.ts'));
const maverick = require(path.join(__dirname, '..', 'src', 'whoop', 'maverick.ts'));
const alarmSchedule = loadTypeScriptModule(path.join('src', 'util', 'alarmSchedule.ts'));
const dataQuality = loadTypeScriptModule(path.join('src', 'metrics', 'dataQuality.ts'));
const strain = loadTypeScriptModule(path.join('src', 'metrics', 'strain.ts'));
const historySyncPolicy = loadTypeScriptModule(path.join('src', 'whoop', 'historySyncPolicy.ts'));
const recovery = loadTypeScriptModule(path.join('src', 'metrics', 'recovery.ts'));
const illness = loadTypeScriptModule(path.join('src', 'metrics', 'illness.ts'));

const chronological = [
  { day: 1, value: 40 },
  { day: 2, value: 50 },
  { day: 3, value: 70 },
];
const chronologicalBaseline = ema.emaBaseline(chronological);
const reversedBaseline = ema.emaBaseline(chronological.slice().reverse());
assert(chronologicalBaseline === reversedBaseline, 'EMA must be independent of database row order');
assert(chronologicalBaseline > 40 && chronologicalBaseline < 70, 'EMA remains bounded by its samples');

const stableNights = Array.from({ length: 30 }, (_, index) => ({
  day: index + 1,
  value: 49 + (index % 3),
}));
const cleanBaseline = ema.robustBaseline(stableNights, { halfLifeDays: 7 });
const contaminatedBaseline = ema.robustBaseline(
  [...stableNights.slice(0, 29), { day: 30, value: 1000 }],
  { halfLifeDays: 7 },
);
assert(cleanBaseline.status === 'calibrated', '30 nights provide a calibrated baseline');
assert(contaminatedBaseline.rejectedSamples === 1, 'MAD baseline rejects one contaminated night');
assert(
  contaminatedBaseline.value != null && cleanBaseline.value != null &&
    Math.abs(contaminatedBaseline.value - cleanBaseline.value) < 2,
  'one extreme night has a bounded effect on the baseline',
);
const provisionalBaseline = ema.robustBaseline(stableNights.slice(0, 5));
assert(provisionalBaseline.value != null && provisionalBaseline.label === 'provisional', 'five nights are displayable but labelled provisional');
const cleanStdev = ema.robustStdev(stableNights);
const outlierStdev = ema.robustStdev([...stableNights, { day: 31, value: 1000 }]);
assert(Math.abs(outlierStdev - cleanStdev) < 0.5, 'one extreme outlier stays close to clean robustStdev');

const firstRun = Array.from({ length: 24 }, () => 1000);
const secondRun = Array.from({ length: 24 }, () => 900);
const contiguous = hrv.computeHrv([...firstRun, ...secondRun]);
const segmented = hrv.computeHrvSegments([firstRun, secondRun]);
assert((contiguous?.rmssd ?? 0) > 10, 'fixture exposes a false cross-gap successive difference');
assert(segmented?.rmssd === 0, 'segmented RMSSD excludes the missing-packet boundary');

function respiratoryFixture(rateBrpm, seconds = 600) {
  const rr = [];
  let elapsed = 0;
  while (elapsed < seconds) {
    const interval = 1000 + 80 * Math.sin(2 * Math.PI * (rateBrpm / 60) * elapsed);
    rr.push(interval);
    elapsed += interval / 1000;
  }
  return rr;
}

const knownRespiratory = respiratory.respiratoryRate(respiratoryFixture(15));
assert(knownRespiratory != null && Math.abs(knownRespiratory - 15) <= 0.5, 'recovers a coherent 15 brpm RSA signal');
assert(knownRespiratory != null && Number.isInteger(knownRespiratory * 2), 'respiratory output does not claim false 0.1 brpm precision');
let noiseSeed = 123456789;
const noiseRr = Array.from({ length: 700 }, () => {
  noiseSeed = (1664525 * noiseSeed + 1013904223) >>> 0;
  return 960 + (noiseSeed / 0xffffffff) * 80;
});
const noiseRespiratory = respiratory.respiratoryRate(noiseRr);
assert(noiseRespiratory == null, `does not publish an arbitrary spectral peak from aperiodic R-R noise (got ${noiseRespiratory})`);
const edgeBiasedRr = respiratoryFixture(4.8).map((value, index) => value + ((index * 37) % 17) - 8);
assert(respiratory.respiratoryRate(edgeBiasedRr) == null, 'does not lock an out-of-band rhythm to the respiratory band edge');
const interruptedRespiratory = respiratoryFixture(15).flatMap((value, index) => (index > 0 && index % 100 === 0 ? [2500, value] : [value]));
assert(respiratory.respiratoryRate(interruptedRespiratory) == null, 'does not compress repeated missing-beat gaps into a respiratory estimate');

assert(
  trust.sleepTrustTier({ inBedMin: 480, confidence: null, coveragePct: null, signalMin: null }) === 'low',
  'legacy sleep provenance must fail closed',
);

assert(skinTemperature.decodeWhoop5SkinTemp(3057) === 30.57, 'decodes a labelled worn-skin fixture');
assert(skinTemperature.decodeWhoop5SkinTemp(2247) === 22.47, 'decodes a labelled off-wrist fixture');
assert(skinTemperature.decodeWhoop5SkinTemp(499) == null, 'rejects an implausible temperature register');
assert(dataQuality.isPlausibleHeartRate(60), 'accepts physiological heart rate');
assert(!dataQuality.isPlausibleHeartRate(255), 'rejects impossible heart rate before metrics and persistence');
assert(dataQuality.isDirectSleepHeartRateSample({ bpm: 60, source: 'whoop5_v18' }), 'direct history HR can score sleep');
assert(!dataQuality.isDirectSleepHeartRateSample({ bpm: 60, source: 'whoop5_v26_ppg' }), 'estimated PPG HR cannot score sleep');

const hrrZones = strain.hrZones(
  [
    { hr: 120, minutes: 1 },
    { hr: 130, minutes: 1 },
    { hr: 144, minutes: 1 },
  ],
  { ageYears: 30, sex: 'male', restingHr: 60, maxHr: 200 },
);
assert(hrrZones[0].minutes === 1 && hrrZones[1].minutes === 1 && hrrZones[2].minutes === 1, 'WHOOP zones use HR reserve boundaries');

assert(
  historySyncPolicy.historySyncIsDurablyComplete({ reason: 'complete', rawRecords: 20, durableEndChunks: 2, acknowledgedEndChunks: 2, failed: false }),
  'completed history requires every durable END acknowledgement',
);
assert(
  !historySyncPolicy.historySyncIsDurablyComplete({ reason: 'complete', rawRecords: 20, durableEndChunks: 2, acknowledgedEndChunks: 1, failed: false }),
  'unacknowledged history cannot advance last sync',
);
assert(
  !historySyncPolicy.historySyncIsDurablyComplete({ reason: 'complete', rawRecords: 20, durableEndChunks: 2, acknowledgedEndChunks: 2, failed: true }),
  'database failure cannot be masked by a later COMPLETE frame',
);
assert(historySyncPolicy.historyCursorAdvanced('0011', '0022'), 'a changed durable endpoint permits the next drain pass');
assert(!historySyncPolicy.historyCursorAdvanced('0011', '0011'), 'a replayed endpoint does not trigger another immediate pass');
assert(historySyncPolicy.historyRetryDelayMs(1) === 15_000, 'first failed history retry stays responsive');
assert(historySyncPolicy.historyRetryDelayMs(20) === 15 * 60_000, 'repeated history failures are rate-limited');
assert(historySyncPolicy.historyReplayDelayMs(1) === 15 * 60_000, 'the first unchanged endpoint backs off for 15 minutes');
assert(historySyncPolicy.historyReplayDelayMs(20) === 2 * 60 * 60_000, 'unchanged endpoint replay backoff is capped at two hours');
const queuedEnds = new Set(['pending']);
const acknowledgedEnds = new Set(['done']);
assert(historySyncPolicy.historyEndShouldQueue('new', queuedEnds, acknowledgedEnds), 'a new history END token is admitted');
assert(!historySyncPolicy.historyEndShouldQueue('pending', queuedEnds, acknowledgedEnds), 'a duplicate END in flight is suppressed');
assert(!historySyncPolicy.historyEndShouldQueue('done', queuedEnds, acknowledgedEnds), 'a successfully acknowledged END is suppressed for this run');
assert(historySyncPolicy.historyEndShouldQueue('done', new Set(), new Set()), 'a reconnect can retry the same END token');

const stableRecovery = recovery.computeRecovery({
  rmssd: 50, rmssdBaseline: 50, rmssdSd: 8,
  restingHr: 55, rhrBaseline: 55, rhrSd: 4,
  respiratoryRate: 14, respiratoryBaseline: 14, respiratorySd: 1,
  skinTemperature: 33.2, skinTemperatureBaseline: 33.2, skinTemperatureSd: 0.3,
  sleepPerformance: 0.85,
});
const deviatedRecovery = recovery.computeRecovery({
  rmssd: 50, rmssdBaseline: 50, rmssdSd: 8,
  restingHr: 55, rhrBaseline: 55, rhrSd: 4,
  respiratoryRate: 11, respiratoryBaseline: 14, respiratorySd: 1,
  skinTemperature: 34.1, skinTemperatureBaseline: 33.2, skinTemperatureSd: 0.3,
  sleepPerformance: 0.85,
});
const fullCalibrationRecovery = recovery.computeRecovery({
  rmssd: 70, rmssdBaseline: 50, rmssdSd: 8,
  restingHr: 50, rhrBaseline: 55, rhrSd: 4,
  respiratoryRate: 14, respiratoryBaseline: 14, respiratorySd: 1,
  skinTemperature: 33.2, skinTemperatureBaseline: 33.2, skinTemperatureSd: 0.3,
  sleepPerformance: 0.85,
  baselineSampleCount: 28,
});
const provisionalRecovery = recovery.computeRecovery({
  rmssd: 70, rmssdBaseline: 50, rmssdSd: 8,
  restingHr: 50, rhrBaseline: 55, rhrSd: 4,
  respiratoryRate: 14, respiratoryBaseline: 14, respiratorySd: 1,
  skinTemperature: 33.2, skinTemperatureBaseline: 33.2, skinTemperatureSd: 0.3,
  sleepPerformance: 0.85,
  baselineSampleCount: 5,
});
assert(fullCalibrationRecovery && provisionalRecovery, 'full and provisional recovery scores are available');
assert(provisionalRecovery.calibration?.status === 'provisional', 'under-calibrated recovery reports provisional status');
assert(
  Math.abs(provisionalRecovery.score - 50) < Math.abs(fullCalibrationRecovery.score - 50),
  'provisional recovery is pulled toward neutral versus full calibration',
);
const attributedRecovery = recovery.computeRecovery({
  rmssd: 50, rmssdBaseline: contaminatedBaseline.value, rmssdSd: 8,
  restingHr: 55, rhrBaseline: 55, rhrSd: 4,
  respiratoryRate: 14, respiratoryBaseline: 14, respiratorySd: 1,
  skinTemperature: 33.2, skinTemperatureBaseline: 33.2, skinTemperatureSd: 0.3,
  sleepPerformance: 0.85,
  baselineSampleCount: contaminatedBaseline.sampleCount,
});
assert(attributedRecovery?.calibration?.label === 'calibrated', 'recovery labels a 30-night baseline as calibrated');
assert(
  attributedRecovery && new Set(attributedRecovery.contributors.map((contributor) => contributor.key)).size === attributedRecovery.contributors.length,
  'recovery attributes each signal exactly once',
);
assert(
  attributedRecovery && Math.abs(
    attributedRecovery.contributors.reduce((sum, contributor) => sum + contributor.contribution, 0) - attributedRecovery.score,
  ) <= 0.5,
  'recovery contributor attribution sums to the score',
);
assert(
  stableRecovery && deviatedRecovery && stableRecovery.score > deviatedRecovery.score,
  'large respiratory and skin-temperature deviations lower recovery',
);
const illnessWithTemp = illness.illnessRisk({
  rhr: { value: 55, baseline: 55, sd: 4 },
  hrv: { value: 50, baseline: 50, sd: 8 },
  respiratory: { value: 14, baseline: 14, sd: 1 },
  skinTemperature: { value: 34.1, baseline: 33.2, sd: 0.3 },
});
assert(
  illnessWithTemp?.signals.some((signal) => signal.metric === 'skin_temp' && signal.flagged),
  'validated skin-temperature deviation contributes to sick-risk',
);

const validCommandFrame = commands.cmdGetDataRange();
assert(new maverick.FrameAssembler().push(validCommandFrame).length === 1, 'valid Maverick frames pass CRC validation');
const corruptCommandFrame = validCommandFrame.slice();
corruptCommandFrame[corruptCommandFrame.length - 5] ^= 0x01;
assert(new maverick.FrameAssembler().push(corruptCommandFrame).length === 0, 'corrupt Maverick frames are rejected before command or metadata routing');

function writeU16(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeU32(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function ppgFrame(unix, sampleOffset) {
  const frame = new Uint8Array(88);
  frame[0] = 0xaa;
  writeU16(frame, 2, frame.length - 8);
  frame[8] = 47;
  frame[9] = 26;
  writeU32(frame, 15, unix);
  for (let i = 0; i < 24; i += 1) {
    const signed = Math.round(1000 * Math.sin((2 * Math.PI * (sampleOffset + i)) / 24));
    writeU16(frame, 27 + i * 2, signed & 0xffff);
  }
  writeU16(frame, 6, crc.crc16modbus(frame.subarray(0, 6)));
  writeU32(frame, frame.length - 4, crc.crc32(frame.subarray(8, frame.length - 4)));
  return frame;
}

const ppgStart = Math.floor(Date.now() / 1000) - 1000;
const ppgFrames = Array.from({ length: 12 }, (_, i) => ppgFrame(ppgStart + i, i * 24));
const nextChunk = historical.decodeWhoop5HistoryFrames(ppgFrames.slice(6));
const withContext = historical.decodeWhoop5HistoryFrames(ppgFrames.slice(6), undefined, {
  ppgContextFrames: ppgFrames.slice(0, 6),
});
assert(withContext.records === 6 && withContext.v26Records === 6, 'PPG context is not counted as new history');
assert(withContext.hr.length > nextChunk.hr.length, 'prior PPG context repairs history chunk edges');
assert(withContext.hr.some((row) => row.ts < (ppgStart + 6) * 1000), 'context edge estimates are upserted');

function commandPayload(frame) {
  const declared = frame[2] | (frame[3] << 8);
  return frame.subarray(11, 8 + declared - 4);
}

const alarmPayload = commandPayload(commands.cmdSetAlarmTime(1_700_000_000_123));
assert(
  Buffer.from(alarmPayload).subarray(0, 20).toString('hex') === '040100f15365be0f2f980000000000000000071e',
  'WHOOP 5 alarm uses the revision-4 golden payload',
);
assert(Buffer.from(commandPayload(commands.cmdDisableAlarm())).subarray(0, 2).toString('hex') === '02ff', 'WHOOP 5 alarm disable uses revision 2');
assert(Buffer.from(commandPayload(commands.cmdRunAlarm())).subarray(0, 2).toString('hex') === '0201', 'WHOOP 5 run alarm uses revision 2');
assert(
  Buffer.from(commandPayload(commands.cmdNotificationBuzz())).subarray(0, 12).toString('hex') === '012f98000000000000000000',
  'WHOOP 5 test buzz uses the hardware-confirmed notification haptic',
);
const localSeven = new Date(2026, 6, 10, 7, 0, 0, 0).getTime();
assert(alarmSchedule.localAlarmMinuteOfDay(localSeven) === 7 * 60, 'alarm stores its intended local wall-clock minute');
const afterSeven = new Date(2026, 6, 10, 7, 1, 0, 0).getTime();
const nextSeven = alarmSchedule.nextLocalAlarmTimestamp(7 * 60, afterSeven);
assert(new Date(nextSeven).getHours() === 7 && new Date(nextSeven).getDate() === 11, 'daily alarm rolls to the next local 07:00');

console.log('physiology regression tests passed');
