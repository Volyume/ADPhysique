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

const training = loadTypeScriptModule(path.join('src', 'metrics', 'training.ts'));
const screenSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'screens', 'TrainingScreen.tsx'), 'utf8');

assert(training.trainingZoneRange(2) === '60-70% HR reserve (HRR)', 'zone ranges identify HR reserve, not max HR');
assert(training.trainingZoneTarget(2, 3) === 'Z2-Z3 (HRR)', 'zone targets carry the HRR basis');
assert(training.trainingZoneTarget(-1, 20) === 'Z0-Z5 (HRR)', 'zone targets clamp to the supported zone range');

assert(
  training.workoutActivityLabel({ activity: 'Walking', name: '4 x 4 VO2max' }) === 'Walking',
  'an explicit activity wins over a structured workout name',
);
assert(
  training.workoutSummaryLabel({ activity: 'Running', name: 'Tempo 20' }) === 'Running - Tempo 20',
  'workout summaries keep the sport visible beside the template name',
);
assert(training.workoutActivityLabel({ activity: '  ', name: 'Easy 45' }) === 'Workout', 'blank activity does not become a template name');

assert(screenSource.includes('workoutActivityLabel({ activity: c.activity })'), 'training summaries use the stored activity field');
assert(screenSource.includes('c.cadenceSpm'), 'recent workout summaries expose cadence when available');
assert(screenSource.includes('HR reserve'), 'training UI names the HR-zone basis');
assert(!screenSource.includes("sub={pr.longestDist?.activity}"), 'PR summaries do not bypass the activity identity helper');

console.log('training regression tests passed');
