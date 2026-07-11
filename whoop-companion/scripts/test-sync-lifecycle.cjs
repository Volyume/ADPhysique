const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function loadPureExport(relativePath, exportName) {
  const filename = path.join(root, relativePath);
  const source = read(relativePath);
  const marker = `export function ${exportName}`;
  const start = source.indexOf(marker);
  assert(start >= 0, `${exportName} must remain exported for deterministic coverage`);
  const signatureEnd = source.indexOf('):', start);
  const open = source.indexOf('{', signatureEnd);
  assert(open >= 0, `${exportName} must have a function body`);
  let depth = 0;
  let close = -1;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        close = index + 1;
        break;
      }
    }
  }
  assert(close > open, `${exportName} function body must be balanced`);
  const snippet = source.slice(start, close);
  const output = ts.transpileModule(
    `${snippet}\nmodule.exports = ${exportName};`,
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, fileName: filename },
  ).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = module.paths;
  loaded._compile(output, filename);
  return loaded.exports;
}

const appStoreSource = read('src/state/appStore.ts');
const bleSource = read('src/ble/whoopBle.ts');
const packageJson = JSON.parse(read('package.json'));
const workflow = read('../.github/workflows/build-whoop-android.yml');

const historyPassFollowUp = loadPureExport('src/state/appStore.ts', 'historyPassFollowUp');
const commandRediscoveryAction = loadPureExport('src/ble/whoopBle.ts', 'commandRediscoveryAction');

assert.equal(historyPassFollowUp({
  reason: 'complete',
  durablyComplete: true,
  rawRecords: 0,
  decodedRecords: 0,
  acknowledgedChunks: 0,
  cursorAdvanced: false,
  continuousPasses: 0,
}), 'complete', 'an empty successful pass must be terminal');
assert.equal(historyPassFollowUp({
  reason: 'complete',
  durablyComplete: true,
  rawRecords: 20,
  decodedRecords: 20,
  acknowledgedChunks: 1,
  cursorAdvanced: false,
  continuousPasses: 0,
}), 'complete', 'a replay-only successful pass must be terminal');
assert.equal(historyPassFollowUp({
  reason: 'complete',
  durablyComplete: true,
  rawRecords: 20,
  decodedRecords: 20,
  acknowledgedChunks: 1,
  cursorAdvanced: true,
  continuousPasses: 0,
}), 'continue', 'a newly advanced endpoint may continue immediately');
assert.equal(historyPassFollowUp({
  reason: 'timeout',
  durablyComplete: false,
  rawRecords: 20,
  decodedRecords: 20,
  acknowledgedChunks: 0,
  cursorAdvanced: false,
  continuousPasses: 0,
}), 'retry', 'an incomplete pass must use retry handling');

assert.equal(commandRediscoveryAction(1), 'retry', 'early rediscovery failures remain bounded retries');
assert.equal(commandRediscoveryAction(2), 'retry', 'the penultimate rediscovery failure remains a retry');
assert.equal(commandRediscoveryAction(3), 'reconnect', 'the rediscovery limit forces reconnect');

assert.match(appStoreSource, /this\.autoDrainedFor !== deviceId/);
assert.match(appStoreSource, /void this\.probeConnectedLinkOnForeground\(state\.device\.id\)/);
assert.match(appStoreSource, /await cleanup\.catch\(\(\) => \{\}\)/);
assert.match(appStoreSource, /this\.clearCommandResponseWaiters\(new Error\('History commit failed; reconnecting before retry'\)\)/);
assert.match(appStoreSource, /History commit failed; cleaning up the transfer and reconnecting/);
assert.match(bleSource, /healthProbe\(\): Promise<boolean>/);
assert.match(bleSource, /commandRediscoveryAction\(this\.commandRediscoveryFailures\)/);
assert.match(bleSource, /this\.recoverStaleLink\('WHOOP command channel rediscovery failed - reconnecting\.\.\.'/);
assert.match(bleSource, /if \(critical\) \{\s*throw new Error\(`Critical WHOOP history notification subscription failed/);
assert.match(bleSource, /fd4b0005 history notification subscription was not installed/);
assert.equal(typeof packageJson.scripts['test:sync-lifecycle'], 'string');
assert.match(workflow, /npm run test:sync-lifecycle/);

console.log('sync lifecycle regression tests passed');
