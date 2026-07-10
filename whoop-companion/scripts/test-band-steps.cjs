const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const sourcePath = path.join(__dirname, '..', 'src', 'metrics', 'bandSteps.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: sourcePath,
}).outputText;
const loaded = new Module(sourcePath, module);
loaded.filename = sourcePath;
loaded.paths = module.paths;
loaded._compile(compiled, sourcePath);

const { estimateBandStepsFromCounters, bandStepEstimateIsTrusted } = loaded.exports;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const batched = Array.from({ length: 27 }, (_, i) => ({
  ts: i * 1000,
  counter: i * 8,
  activityClass: i <= 14 ? 1 : 0,
}));
const batchedEstimate = estimateBandStepsFromCounters(batched, 1);
assert(batchedEstimate?.steps === 208, 'preserves legitimate batched increments');
assert(batchedEstimate?.movementLinkedPct === 58, 'measures movement-linked ticks');
assert(batchedEstimate?.confidence === 'high', 'trusts capture-like counter movement');

const inactiveDrift = Array.from({ length: 21 }, (_, i) => ({
  ts: i * 1000,
  counter: i * 5,
  activityClass: i === 0 ? 1 : 0,
}));
const driftEstimate = estimateBandStepsFromCounters(inactiveDrift, 1);
assert(driftEstimate?.confidence === 'low', 'rejects mostly inactive counter drift');
assert(!bandStepEstimateIsTrusted(driftEstimate), 'does not publish inactive drift');

const rolloverEstimate = estimateBandStepsFromCounters(
  [
    { ts: 0, counter: 65_530, activityClass: 1 },
    { ts: 3000, counter: 14, activityClass: 1 },
    { ts: 4000, counter: 15, activityClass: 1 },
  ],
  1,
);
assert(rolloverEstimate?.steps === 21, 'handles a 16-bit counter rollover');

const dailyRows = [
  { ts: 0, counter: 0, activityClass: 1 },
  { ts: 1000, counter: 100, activityClass: 1 },
  { ts: 10_000, counter: 100, activityClass: 1 },
  { ts: 20_000, counter: 150, activityClass: 1 },
  { ts: 30_000, counter: 200, activityClass: 1 },
];
const workoutEstimate = estimateBandStepsFromCounters(dailyRows.filter((row) => row.ts >= 10_000), 1);
assert(workoutEstimate?.steps === 100, 'isolates workout steps from the daily total');

const midnightRange = estimateBandStepsFromCounters(
  [
    { ts: 59_000, counter: 100, activityClass: 1 },
    { ts: 61_000, counter: 112, activityClass: 1 },
    { ts: 62_000, counter: 120, activityClass: 1 },
  ],
  1,
  { countFromTs: 60_000, countToTs: 120_000 },
);
assert(midnightRange?.steps === 20, 'counts the first post-midnight delta from its predecessor');

const sparse = estimateBandStepsFromCounters(
  [
    { ts: 0, counter: 0, activityClass: 1 },
    { ts: 1000, counter: 4, activityClass: 1 },
    { ts: 2000, counter: 8, activityClass: 1 },
  ],
  1,
);
assert(sparse?.confidence === 'low' && !bandStepEstimateIsTrusted(sparse), 'does not publish two-interval step guesses');

const reset = estimateBandStepsFromCounters(
  [
    { ts: 0, counter: 100, activityClass: 1 },
    { ts: 60_000, counter: 110, activityClass: 1 },
    { ts: 120_000, counter: 5, activityClass: 1 },
    { ts: 180_000, counter: 15, activityClass: 1 },
    { ts: 240_000, counter: 25, activityClass: 1 },
    { ts: 300_000, counter: 35, activityClass: 1 },
    { ts: 360_000, counter: 45, activityClass: 1 },
  ],
  1,
);
assert(reset?.resetCount === 1 && !bandStepEstimateIsTrusted(reset), 'counter resets prevent publication');

console.log('band step regression tests passed');
