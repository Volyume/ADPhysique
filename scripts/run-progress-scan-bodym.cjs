#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const jestBin = path.join(root, 'node_modules', 'jest', 'bin', 'jest.js');

const result = spawnSync(
  process.execPath,
  [
    jestBin,
    '--runTestsByPath',
    'src/lib/__tests__/progressScanBodyMExternal.test.js',
    '--runInBand',
    ...process.argv.slice(2),
  ],
  {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      PROGRESS_SCAN_BODYM_SMOKE: '1',
    },
  },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
