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
const trust = loadTypeScriptModule(path.join('src', 'metrics', 'sleepTrustWeight.ts'));
const skinTemperature = loadTypeScriptModule(path.join('src', 'whoop', 'skinTemperature.ts'));
const historical = require(path.join(__dirname, '..', 'src', 'whoop', 'historicalParse.ts'));
const crc = require(path.join(__dirname, '..', 'src', 'whoop', 'crc.ts'));
const commands = require(path.join(__dirname, '..', 'src', 'whoop', 'commands.ts'));
const alarmSchedule = loadTypeScriptModule(path.join('src', 'util', 'alarmSchedule.ts'));

const chronological = [
  { day: 1, value: 40 },
  { day: 2, value: 50 },
  { day: 3, value: 70 },
];
const chronologicalBaseline = ema.emaBaseline(chronological);
const reversedBaseline = ema.emaBaseline(chronological.slice().reverse());
assert(chronologicalBaseline === reversedBaseline, 'EMA must be independent of database row order');
assert(chronologicalBaseline > 40 && chronologicalBaseline < 70, 'EMA remains bounded by its samples');

const firstRun = Array.from({ length: 24 }, () => 1000);
const secondRun = Array.from({ length: 24 }, () => 900);
const contiguous = hrv.computeHrv([...firstRun, ...secondRun]);
const segmented = hrv.computeHrvSegments([firstRun, secondRun]);
assert((contiguous?.rmssd ?? 0) > 10, 'fixture exposes a false cross-gap successive difference');
assert(segmented?.rmssd === 0, 'segmented RMSSD excludes the missing-packet boundary');

assert(
  trust.sleepTrustTier({ inBedMin: 480, confidence: null, coveragePct: null, signalMin: null }) === 'low',
  'legacy sleep provenance must fail closed',
);

assert(skinTemperature.decodeWhoop5SkinTemp(3057) === 30.57, 'decodes a labelled worn-skin fixture');
assert(skinTemperature.decodeWhoop5SkinTemp(2247) === 22.47, 'decodes a labelled off-wrist fixture');
assert(skinTemperature.decodeWhoop5SkinTemp(499) == null, 'rejects an implausible temperature register');

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
