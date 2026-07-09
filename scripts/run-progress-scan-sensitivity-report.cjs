#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const jestBin = path.join(root, 'node_modules', 'jest', 'bin', 'jest.js');
const argFile = process.argv.slice(2).find((arg) => !arg.startsWith('-'));
const envFile = process.env.PROGRESS_SCAN_SENSITIVITY_FILE;
const sensitivityFile = argFile || envFile || '';

if (sensitivityFile) {
  const resolved = path.resolve(process.cwd(), sensitivityFile);
  if (!fs.existsSync(resolved)) {
    console.error(`Sensitivity sweep file does not exist: ${resolved}`);
    process.exit(1);
  }
  process.env.PROGRESS_SCAN_SENSITIVITY_FILE = resolved;
}

const result = spawnSync(
  process.execPath,
  [
    jestBin,
    '--runTestsByPath',
    'src/lib/__tests__/progressScanSensitivityHarness.test.js',
    '--runInBand',
    '--silent=false',
  ],
  {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      PROGRESS_SCAN_SENSITIVITY_REPORT: '1',
    },
  },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
