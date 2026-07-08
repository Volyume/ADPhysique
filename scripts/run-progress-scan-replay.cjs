#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const jestBin = path.join(root, 'node_modules', 'jest', 'bin', 'jest.js');
const file = process.argv.slice(2).find((arg) => !arg.startsWith('-')) || process.env.PROGRESS_SCAN_CALIBRATION_FILE || '';

if (!file) {
  console.error('Usage: npm run progress-scan:replay -- /path/to/real-progress-scan-cases.json');
  process.exit(1);
}

const resolved = path.resolve(process.cwd(), file);
if (!fs.existsSync(resolved)) {
  console.error(`Replay file does not exist: ${resolved}`);
  process.exit(1);
}

console.log(`Progress Scan replay: ${resolved}`);

const result = spawnSync(
  process.execPath,
  [
    jestBin,
    '--runTestsByPath',
    'src/lib/__tests__/progressScanCalibrationCorpus.test.js',
    '--runInBand',
    '--silent=false',
  ],
  {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      PROGRESS_SCAN_CALIBRATION_FILE: resolved,
      PROGRESS_SCAN_CALIBRATION_REPORT: '1',
    },
  },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
if ((result.status ?? 1) === 0) {
  console.log('Progress Scan replay completed');
}
process.exit(result.status ?? 1);
