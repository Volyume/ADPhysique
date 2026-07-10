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

const ema = loadTypeScriptModule(path.join('src', 'metrics', 'ema.ts'));
const hrv = loadTypeScriptModule(path.join('src', 'metrics', 'hrv.ts'));
const trust = loadTypeScriptModule(path.join('src', 'metrics', 'sleepTrustWeight.ts'));
const skinTemperature = loadTypeScriptModule(path.join('src', 'whoop', 'skinTemperature.ts'));

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

console.log('physiology regression tests passed');
