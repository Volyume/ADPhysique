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

console.log('history sync policy tests passed');
