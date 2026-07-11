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
const rowsByDay = new Map();
for (const row of decoded.hr) {
  if (row.source !== 'whoop5_v18') continue;
  const day = new Date(row.ts).toISOString().slice(0, 10);
  const rows = rowsByDay.get(day) ?? [];
  rows.push(row);
  rowsByDay.set(day, rows);
}

console.log(`capture=${path.basename(capturePath)} frames=${frames.length} v18=${decoded.v18Records}`);
for (const [day, rows] of [...rowsByDay].sort(([a], [b]) => a.localeCompare(b))) {
  rows.sort((a, b) => a.ts - b.ts);
  const rr = rows.reduce((sum, row) => sum + row.rr.length, 0);
  const spanMin = rows.length > 1 ? Math.round(((rows.at(-1).ts - rows[0].ts) / 60000) * 10) / 10 : 0;
  const rrRuns = vitals.contiguousRrSegments(rows).map((run) => run.length).sort((a, b) => b - a);
  const rmssdWindows = vitals.rmssdWindowEstimates(rows);
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
      `rmssd_windows=${rmssdWindows.join(',') || '-'}`,
  );
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
