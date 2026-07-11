const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

function loadTypeScriptModule(relativePath) {
  const sourcePath = path.join(__dirname, '..', relativePath);
  const originalResolveFilename = Module._resolveFilename;
  const originalTypeScriptExtension = Module._extensions['.ts'];

  // Keep the harness dependency-free while allowing TS modules to require other
  // TS modules using normal relative imports.
  Module._extensions['.ts'] = function compileTypeScript(moduleInstance, filename) {
    const source = fs.readFileSync(filename, 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
      fileName: filename,
    }).outputText;
    moduleInstance._compile(compiled, filename);
  };
  Module._resolveFilename = function resolveTypeScriptFilename(request, parent, isMain, options) {
    try {
      return originalResolveFilename.call(this, request, parent, isMain, options);
    } catch (error) {
      if (typeof request === 'string' && request.startsWith('.') && !path.extname(request)) {
        const candidate = path.resolve(path.dirname(parent.filename), `${request}.ts`);
        if (fs.existsSync(candidate)) return candidate;
      }
      throw error;
    }
  };

  try {
    return require(sourcePath);
  } finally {
    Module._resolveFilename = originalResolveFilename;
    if (originalTypeScriptExtension) Module._extensions['.ts'] = originalTypeScriptExtension;
    else delete Module._extensions['.ts'];
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const readiness = loadTypeScriptModule(path.join('src', 'metrics', 'readiness.ts'));
const training = loadTypeScriptModule(path.join('src', 'metrics', 'training.ts'));

const base = {
  recovery: null,
  sleepPerformance: null,
  sleepDebtMin: 0,
  hrvBalance: null,
  acwr: null,
};

assert(
  readiness.computeTrainingReadiness({ ...base, recovery: 90 }) === null,
  'Recovery alone must not manufacture sleep and HRV evidence',
);

const sparse = readiness.computeTrainingReadiness({ ...base, recovery: 90, hrvBalance: 90, acwr: 1.0 });
assert(sparse != null, 'two independent primary signals should produce a cautious result');
assert(sparse.score <= 65 && sparse.cappedByConfidence, 'sparse evidence must be strictly capped');
assert(sparse.missingInputs.includes('sleep performance'), 'missing sleep must remain visible');

const complete = readiness.computeTrainingReadiness({
  ...base,
  recovery: 100,
  sleepPerformance: 100,
  hrvBalance: 100,
  sleepConfidence: 'high',
  sleepCoveragePct: 95,
  sleepSignalMin: 420,
  acwr: 1.0,
});
assert(complete != null && complete.score === 100 && complete.scoreCap === null && !complete.cappedByConfidence, 'complete high-quality evidence must not use an artificial ceiling');
assert(complete.confidence === 'high', 'complete trusted evidence should be high confidence');

const untrustedSleep = readiness.computeTrainingReadiness({
  ...base,
  recovery: 90,
  sleepPerformance: 10,
  hrvBalance: null,
  sleepConfidence: 'low',
  sleepCoveragePct: 30,
  sleepSignalMin: 90,
});
assert(untrustedSleep === null, 'low-trust sleep must not stand in for missing HRV');

const now = 1_800_000_000_000;
const highRelativeLoad = training.trainingLoad([
  { ts: now - 1 * 86400000, trimp: 100 },
  { ts: now - 14 * 86400000, trimp: 100 },
  { ts: now - 21 * 86400000, trimp: 100 },
  { ts: now - 27 * 86400000, trimp: 100 },
], now);
assert(highRelativeLoad.acwr === 1, 'ACWR fixture should be deterministic');
assert(highRelativeLoad.status === 'Near recent baseline', 'ACWR status should describe the personal baseline');
assert(!highRelativeLoad.statusDetail.includes('optimal range'), 'ACWR must not claim a universal optimal range');

const spike = training.trainingLoad([
  { ts: now - 1 * 86400000, trimp: 160 },
  { ts: now - 14 * 86400000, trimp: 20 },
  { ts: now - 21 * 86400000, trimp: 20 },
  { ts: now - 27 * 86400000, trimp: 20 },
], now);
assert(spike.acwr > 1.5 && spike.status === 'Well above recent baseline', 'high ACWR should be a descriptive high-load status');
assert(!spike.statusDetail.includes('high injury'), 'ACWR must not state a universal injury-risk conclusion');

console.log('readiness regression tests passed');
