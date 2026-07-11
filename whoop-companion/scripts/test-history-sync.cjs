const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

function loadTypeScriptModule(relativePath) {
  const filename = path.join(__dirname, '..', relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = module.paths;
  loaded._compile(output, filename);
  return loaded.exports;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadDatabaseWithMock(sqliteMock) {
  const originalLoad = Module._load;
  const originalResolve = Module._resolveFilename;
  const originalTsExtension = Module._extensions['.ts'];
  const databaseFilename = path.join(__dirname, '..', 'src', 'db', 'database.ts');

  Module._load = function (request, parent, isMain) {
    if (request === 'expo-sqlite') return sqliteMock;
    return originalLoad.call(this, request, parent, isMain);
  };
  Module._extensions['.ts'] = function (loaded, filename) {
    const source = fs.readFileSync(filename, 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
      fileName: filename,
    }).outputText;
    loaded._compile(output, filename);
  };
  Module._resolveFilename = function (request, parent, isMain, options) {
    if (parent && typeof request === 'string' && !path.extname(request)) {
      const tsFilename = path.resolve(path.dirname(parent.filename), `${request}.ts`);
      if (fs.existsSync(tsFilename)) return tsFilename;
    }
    return originalResolve.call(this, request, parent, isMain, options);
  };

  delete require.cache[databaseFilename];
  try {
    return require(databaseFilename);
  } finally {
    Module._load = originalLoad;
    Module._resolveFilename = originalResolve;
    if (originalTsExtension) Module._extensions['.ts'] = originalTsExtension;
    else delete Module._extensions['.ts'];
  }
}

function createDatabaseMock() {
  const state = {
    failAt: null,
    prepareAttempt: 0,
    prepareError: null,
    finalized: [],
    preparedSql: [],
    executions: [],
    transactionCount: 0,
    runArgs: null,
    dailyRow: null,
  };
  const db = {
    async execAsync() {},
    async getFirstAsync() {
      return state.dailyRow || { value: '1' };
    },
    async runAsync(...args) {
      state.runArgs = args;
    },
    async withTransactionAsync(task) {
      state.transactionCount += 1;
      return task();
    },
    async prepareAsync(sql) {
      const index = ++state.prepareAttempt;
      state.preparedSql.push(sql);
      if (state.failAt === index) {
        state.prepareError = new Error(`history prepare ${index} failed`);
        throw state.prepareError;
      }
      return {
        async executeAsync(...params) {
          state.executions.push({ index, params });
        },
        async finalizeAsync() {
          state.finalized.push(index);
        },
      };
    },
  };
  return {
    sqlite: { __esModule: true, openDatabaseAsync: async () => db },
    state,
    configure(failAt) {
      state.failAt = failAt;
      state.prepareAttempt = 0;
      state.prepareError = null;
      state.finalized = [];
      state.preparedSql = [];
      state.executions = [];
      state.runArgs = null;
      state.dailyRow = null;
    },
  };
}

const policy = loadTypeScriptModule(path.join('src', 'whoop', 'historySyncPolicy.ts'));

assert(policy.historySyncIsDurablyComplete({
  reason: 'complete', rawRecords: 12, durableEndChunks: 2, acknowledgedEndChunks: 2, failed: false,
}), 'a complete transfer needs every durable chunk acknowledged');
assert(!policy.historySyncIsDurablyComplete({
  reason: 'complete', rawRecords: 12, durableEndChunks: 2, acknowledgedEndChunks: 1, failed: false,
}), 'a partial acknowledgement cannot mark the cursor complete');
assert(policy.historySyncIsDurablyComplete({
  reason: 'complete', rawRecords: 0, durableEndChunks: 0, acknowledgedEndChunks: 0, failed: false,
}), 'an empty complete transfer is complete');
assert(policy.historyCursorAdvanced('old', 'new'), 'a changed endpoint permits another pass');
assert(!policy.historyCursorAdvanced('same', 'same'), 'an unchanged endpoint does not permit an immediate pass');
assert(policy.historyRetryDelayMs(1) === 15_000, 'the first failed retry is responsive');
assert(policy.historyRetryDelayMs(99) === 15 * 60_000, 'failed retries are capped');
assert(policy.historyReplayDelayMs(1) === 15 * 60_000, 'the first replay waits 15 minutes');
assert(policy.historyReplayDelayMs(99) === 2 * 60 * 60_000, 'replay backoff is capped at two hours');
assert(policy.historyEndShouldQueue('new', new Set(), new Set()), 'a new END is admitted');
assert(!policy.historyEndShouldQueue('', new Set(), new Set()), 'an empty END is ignored');
assert(!policy.historyEndShouldQueue('queued', new Set(['queued']), new Set()), 'an in-flight END is suppressed');
assert(!policy.historyEndShouldQueue('acked', new Set(), new Set(['acked'])), 'an acknowledged END is suppressed');

async function runDatabaseRegressionTests() {
  const databaseMock = createDatabaseMock();
  const database = loadDatabaseWithMock(databaseMock.sqlite);
  const emptyHistoryBatch = {
  rawTs: 1_700_000_000_000,
  framesHex: [],
  hr: [],
  steps: [],
  sleepStates: [],
  motion: [],
  rawVitals: [],
  };

  for (let failAt = 1; failAt <= 6; failAt += 1) {
    databaseMock.configure(failAt);
    let caught = null;
    try {
      await database.persistHistoryBatch(emptyHistoryBatch);
    } catch (error) {
      caught = error;
    }
    assert(caught === databaseMock.state.prepareError, `prepare ${failAt} error must propagate`);
    assert(
      JSON.stringify(databaseMock.state.finalized) === JSON.stringify(Array.from({ length: failAt - 1 }, (_, i) => i + 1)),
      `prepare ${failAt} must finalize every earlier statement`,
    );
  }

  databaseMock.configure(null);
  await database.persistHistoryBatch(emptyHistoryBatch);
  assert(
    JSON.stringify(databaseMock.state.finalized) === JSON.stringify([1, 2, 3, 4, 5, 6]),
    'a successful history batch must finalize all statements',
  );

  databaseMock.configure(null);
  await database.upsertDailyMetric({
  day: '2026-07-11',
  recovery: null,
  rmssd: null,
  rhr: null,
  resp: null,
  spo2: null,
  skinTempC: null,
  sleepMin: 29 * 60,
  sleepPerf: null,
  strain: null,
  steps: null,
  stepSource: null,
  sleepStart: 1_000,
  sleepEnd: 1_000 + 29 * 60 * 60 * 1_000,
  deepMin: 500,
  remMin: 500,
  lightMin: 740,
  awakeMin: 0,
  sleepDetail: {
    performance: null,
    hoursVsNeeded: null,
    needMin: null,
    baselineMin: null,
    napMin: null,
    strainMin: null,
    debtMin: null,
    efficiency: null,
    consistency: null,
    restorativeMin: null,
    restorativePct: null,
    latencyMin: null,
    wakeEvents: null,
    inBedMin: 29 * 60,
    stressHigh: null,
    stressMed: null,
    stressLow: null,
    cappedBySafetyLimit: true,
    stageEstimate: [
      { stage: 'unknown', minutes: 3 },
      { stage: 'awake', minutes: 1 },
      { stage: 'light', minutes: 0 },
      { stage: 'invalid', minutes: 2 },
      { stage: 'deep', minutes: -1 },
      { stage: 'rem', minutes: Infinity },
      { stage: 'deep', minutes: '4' },
    ],
  },
  updatedAt: 1_700_000_000_000,
  });
  const sleepJson = databaseMock.state.runArgs.find((value) => typeof value === 'string' && value.startsWith('{'));
  const cleanedStageEstimate = JSON.parse(sleepJson).stageEstimate;
  assert(databaseMock.state.runArgs.includes(29 * 60), 'sleep_min must allow a 29-hour manual window');
  assert(
    databaseMock.state.runArgs.includes(1_000 + 29 * 60 * 60 * 1_000),
    'cleanSleepWindow must allow a 29-hour manual window',
  );
  assert(JSON.parse(sleepJson).cappedBySafetyLimit === true, 'a strict truncation flag must be retained');
  assert(
    JSON.stringify(cleanedStageEstimate) ===
      JSON.stringify([
        { stage: 'unknown', minutes: 3 },
        { stage: 'awake', minutes: 1 },
        { stage: 'light', minutes: 0 },
      ]),
    'sleep detail stage estimates must retain unknown and drop malformed entries',
  );

  databaseMock.state.dailyRow = {
    day: '2026-07-11',
    recovery: null,
    rmssd: null,
    rhr: null,
    resp: null,
    spo2: null,
    skin_temp_c: null,
    sleep_min: 29 * 60,
    sleep_perf: null,
    strain: null,
    steps: null,
    step_source: null,
    sleep_start: 1_000,
    sleep_end: 1_000 + 29 * 60 * 60 * 1_000,
    deep_min: 500,
    rem_min: 500,
    light_min: 740,
    awake_min: 0,
    sleep_json: sleepJson,
    updated_at: 1_700_000_000_000,
  };
  const readMetric = await database.getDailyMetric('2026-07-11');
  assert(readMetric.sleepMin === 29 * 60, 'read sleep_min must preserve a 29-hour manual window');
  assert(
    readMetric.sleepStart === 1_000 && readMetric.sleepEnd === 1_000 + 29 * 60 * 60 * 1_000,
    'read cleanSleepWindow must preserve a 29-hour manual window',
  );
  databaseMock.state.dailyRow.sleep_json = JSON.stringify({ ...JSON.parse(sleepJson), cappedBySafetyLimit: 'yes' });
  const malformedFlagMetric = await database.getDailyMetric('2026-07-11');
  assert(
    malformedFlagMetric.sleepDetail.cappedBySafetyLimit === null,
    'a malformed persisted truncation flag must normalize to null',
  );

  console.log('history sync policy and database regression tests passed');
}

runDatabaseRegressionTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
