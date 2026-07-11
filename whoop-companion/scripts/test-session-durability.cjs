const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

function loadStoreHelpers() {
  const filename = path.join(__dirname, '..', 'src', 'state', 'appStore.ts');
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  }).outputText;
  const originalLoad = Module._load;
  const storeStub = {
    Store: class Store {
      constructor(initial) { this.state = initial; }
      getState() { return this.state; }
      setState(patch) { this.state = { ...this.state, ...(typeof patch === 'function' ? patch(this.state) : patch) }; }
    },
  };
  Module._load = function load(request, parent, isMain) {
    if (parent && path.resolve(parent.filename) === path.resolve(filename)) {
      if (request === './store') return storeStub;
      if (request === 'react-native') return { AppState: { addEventListener: () => ({ remove() {} }) }, Share: {} };
      if (request.startsWith('.')) return {};
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    const loaded = new Module(filename, module);
    loaded.filename = filename;
    loaded.paths = module.paths;
    loaded._compile(output, filename);
    return loaded.exports;
  } finally {
    Module._load = originalLoad;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const helpers = loadStoreHelpers();
const now = 1_700_000_000_000;
const storeSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'state', 'appStore.ts'), 'utf8');
const detailSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'screens', 'ActivityDetailScreen.tsx'), 'utf8');
const session = {
  kind: 'workout',
  label: 'Running',
  startTs: now - 10 * 60 * 1000,
  laps: [],
  maxHr: 150,
  hasGps: false,
  distanceM: null,
  speedMps: null,
  route: [],
  plan: null,
  pausedAtTs: now - 5 * 60 * 1000,
  pausedMs: 0,
  pauseIntervals: [{ startTs: now - 5 * 60 * 1000, endTs: null }],
};

assert(helpers.activeSessionDurationMs(session, now) === 5 * 60 * 1000, 'open pause must stop active duration');
assert(JSON.stringify(helpers.activeSessionRanges({
  startTs: now - 10 * 60 * 1000,
  pauseIntervals: [{ startTs: now - 7 * 60 * 1000, endTs: now - 3 * 60 * 1000 }],
}, now)) === JSON.stringify([
  { startTs: now - 10 * 60 * 1000, endTs: now - 7 * 60 * 1000 },
  { startTs: now - 3 * 60 * 1000, endTs: now },
]), 'active ranges must omit completed pause windows');
assert(/activityDetail[\s\S]*activeSessionRanges/.test(storeSource), 'activity detail must use active session ranges');
assert(/appStore\.activityDetail\(activity\.startTs, activity\.endTs, activity\.pauseIntervals\)/.test(detailSource), 'activity detail screen must pass pause intervals');

const saved = JSON.stringify({ version: 1, savedAt: now, session });
const restored = helpers.restorePersistedSession(saved, now);
assert(restored && restored.pausedAtTs === session.pausedAtTs, 'a valid paused session must restore');
assert(helpers.restorePersistedSession('{not json', now) === null, 'corrupt snapshots must fail closed');
assert(helpers.restorePersistedSession(JSON.stringify({ version: 1, savedAt: now - 48 * 60 * 60 * 1000 - 1, session }), now) === null, 'stale snapshots must fail closed');

console.log('session durability tests passed');
