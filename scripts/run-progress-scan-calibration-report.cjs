#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const jestBin = path.join(root, 'node_modules', 'jest', 'bin', 'jest.js');
const argFile = process.argv.slice(2).find((arg) => !arg.startsWith('-'));
const envFile = process.env.PROGRESS_SCAN_CALIBRATION_FILE;
const calibrationFile = argFile || envFile || '';

if (calibrationFile) {
  const resolved = path.resolve(process.cwd(), calibrationFile);
  if (!fs.existsSync(resolved)) {
    console.error(`Calibration file does not exist: ${resolved}`);
    process.exit(1);
  }
  process.env.PROGRESS_SCAN_CALIBRATION_FILE = resolved;
}

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
      PROGRESS_SCAN_CALIBRATION_REPORT: '1',
    },
  },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
