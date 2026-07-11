#!/usr/bin/env node

const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const readline = require('node:readline');
const ts = require('typescript');

Module._extensions['.ts'] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const capturePath = process.argv[2];
if (!capturePath) {
  console.error('Usage: node scripts/validate-capture-vitals.cjs <pulse-frames.txt>');
  process.exit(2);
}

const { FrameAssembler } = require('../src/whoop/maverick.ts');
const { decodeWhoop5HistoryFrames } = require('../src/whoop/historicalParse.ts');
const vitals = require('../src/metrics/overnightVitals.ts');
const { estimateBandStepsFromCounters } = require('../src/metrics/bandSteps.ts');

async function main() {
const assemblers = new Map();
const frames = [];
const lines = readline.createInterface({ input: fs.createReadStream(capturePath, { encoding: 'utf8' }), crlfDelay: Infinity });
for await (const line of lines) {
  if (!line || line.startsWith('#')) continue;
  const [capturedTs, source, hex] = line.split(/\t+/);
  if (!Number.isFinite(Number(capturedTs)) || !source || !/^[0-9a-f]+$/i.test(hex ?? '')) continue;
  const assembler = assemblers.get(source) ?? new FrameAssembler();
  assemblers.set(source, assembler);
  frames.push(...assembler.push(Uint8Array.from(Buffer.from(hex, 'hex'))).map((frame) => frame.raw));
}

const decoded = decodeWhoop5HistoryFrames(frames);
const v18Frames = frames.filter((frame) => frame[9] === 18);
const precisionPairs = v18Frames
  .map((frame) => ({ integer: frame[22], precise: readU16(frame, 36) / 256 }))
  .filter((pair) => pair.integer >= 30 && pair.integer <= 220 && pair.precise >= 30 && pair.precise <= 220);
const precisionErrors = precisionPairs.map((pair) => Math.abs(pair.precise - pair.integer));
const concordantPrecisionPairs = precisionPairs.filter((pair) => Math.abs(pair.precise - pair.integer) <= 3);
const preciseHrByTs = new Map();
for (const frame of v18Frames) {
  const integer = frame[22];
  const precise = readU16(frame, 36) / 256;
  const unix = readU32(frame, 15);
  if (integer >= 30 && integer <= 220 && precise >= 30 && precise <= 220 && Math.abs(precise - integer) <= 3) {
    preciseHrByTs.set(unix * 1000, precise);
  }
}
const dynamicByClass = new Map();
const v18FlagCounts = new Map();
for (const frame of v18Frames) {
  const dynamic = readF32(frame, 41);
  const activityClass = frame[63];
  if (!Number.isFinite(dynamic) || dynamic < 0 || dynamic > 8 || ![0, 1, 2].includes(activityClass)) continue;
  const values = dynamicByClass.get(activityClass) ?? [];
  values.push(dynamic);
  dynamicByClass.set(activityClass, values);
  const flagByte = frame[81];
  const key = `state${(flagByte >> 4) & 3}/quality${(flagByte >> 2) & 3}/wrist${flagByte & 3}`;
  v18FlagCounts.set(key, (v18FlagCounts.get(key) ?? 0) + 1);
}
const rowsByDay = new Map();
for (const row of decoded.hr) {
  if (row.source !== 'whoop5_v18') continue;
  const day = new Date(row.ts).toISOString().slice(0, 10);
  const rows = rowsByDay.get(day) ?? [];
  rows.push(row);
  rowsByDay.set(day, rows);
}

console.log(`capture=${path.basename(capturePath)} frames=${frames.length} v18=${decoded.v18Records}`);
console.log(
  `v18_hr_fixed_8_8 plausible=${precisionPairs.length}/${v18Frames.length} concordant=${concordantPrecisionPairs.length}/${precisionPairs.length} abs_error=${formatQuantiles(precisionErrors)}`,
);
for (const [activityClass, values] of [...dynamicByClass].sort(([a], [b]) => a - b)) {
  console.log(`v18_dynamic_acceleration class=${activityClass} n=${values.length} values=${formatQuantiles(values)}`);
}
console.log(`v18_flags ${[...v18FlagCounts].sort((a, b) => b[1] - a[1]).map(([key, count]) => `${key}=${count}`).join(' ')}`);
for (const [day, rows] of [...rowsByDay].sort(([a], [b]) => a.localeCompare(b))) {
  rows.sort((a, b) => a.ts - b.ts);
  const rr = rows.reduce((sum, row) => sum + row.rr.length, 0);
  const spanMin = rows.length > 1 ? Math.round(((rows.at(-1).ts - rows[0].ts) / 60000) * 10) / 10 : 0;
  const rrRuns = vitals.contiguousRrSegments(rows).map((run) => run.length).sort((a, b) => b - a);
  const rmssdWindows = vitals.rmssdWindowEstimates(rows);
  const preciseRows = rows.map((row) => ({ ...row, bpm: preciseHrByTs.get(row.ts) ?? row.bpm }));
  const rrBuckets = new Map();
  for (const row of rows) {
    const bucket = Math.floor(row.ts / 300000);
    const stats = rrBuckets.get(bucket) ?? { count: 0, duration: 0 };
    stats.count += row.rr.length;
    stats.duration += row.rr.reduce((sum, value) => sum + value, 0);
    rrBuckets.set(bucket, stats);
  }
  const qualifyingBuckets = [...rrBuckets.values()].filter((stats) => stats.count >= 90 && stats.duration >= 0.35 * 300000).length;
  console.log(
    `${day} rows=${rows.length} rr=${rr} span=${spanMin}m rhr=${vitals.computeRhrFromRows(rows) ?? '-'} ` +
      `rmssd=${vitals.computeRmssdFromRows(rows) ?? '-'} resp=${vitals.computeRespiratoryRateFromRows(rows) ?? '-'} ` +
      `rr_runs=${rrRuns.slice(0, 5).join(',') || '-'} qualifying_5m=${qualifyingBuckets} ` +
      `rmssd_windows=${rmssdWindows.join(',') || '-'} resp_precise=${vitals.computeRespiratoryRateFromRows(preciseRows) ?? '-'}`,
  );
}

const stepsByDay = new Map();
for (const row of decoded.steps) {
  const day = new Date(row.ts).toISOString().slice(0, 10);
  const rows = stepsByDay.get(day) ?? [];
  rows.push(row);
  stepsByDay.set(day, rows);
}
for (const [day, rows] of [...stepsByDay].sort(([a], [b]) => a.localeCompare(b))) {
  rows.sort((a, b) => a.ts - b.ts);
  const oneToOne = estimateBandStepsFromCounters(rows, 1);
  const legacyEight = estimateBandStepsFromCounters(rows, 8);
  const classes = rows.reduce((counts, row) => {
    const key = row.activityClass == null ? 'null' : String(row.activityClass);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map());
  console.log(
    `${day} step_rows=${rows.length} span=${rows.length > 1 ? Math.round(((rows.at(-1).ts - rows[0].ts) / 60000) * 10) / 10 : 0}m ` +
      `counter=${rows[0]?.counter ?? '-'}..${rows.at(-1)?.counter ?? '-'} ` +
      `active_ticks=${oneToOne?.rawTicks ?? 0} inactive_ticks=${oneToOne?.inactiveRawTicks ?? 0} ` +
      `steps_div1=${oneToOne?.steps ?? '-'} confidence_div1=${oneToOne?.confidence ?? '-'} ` +
      `steps_div8=${legacyEight?.steps ?? '-'} confidence_div8=${legacyEight?.confidence ?? '-'} ` +
      `classes=${[...classes].map(([key, count]) => `${key}:${count}`).join(',') || '-'}`,
  );
}

function readU16(bytes, offset) {
  return offset + 1 < bytes.length ? bytes[offset] | (bytes[offset + 1] << 8) : Number.NaN;
}

function readF32(bytes, offset) {
  if (offset + 4 > bytes.length) return Number.NaN;
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getFloat32(0, true);
}

function readU32(bytes, offset) {
  if (offset + 4 > bytes.length) return Number.NaN;
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function formatQuantiles(values) {
  if (!values.length) return '-';
  const sorted = values.slice().sort((a, b) => a - b);
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.round((sorted.length - 1) * p))];
  return `min=${at(0).toFixed(3)},p50=${at(0.5).toFixed(3)},p95=${at(0.95).toFixed(3)},max=${at(1).toFixed(3)}`;
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
