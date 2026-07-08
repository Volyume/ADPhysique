#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const nodeBin = process.execPath;
const calibrationReport = path.join(root, 'scripts', 'run-progress-scan-calibration-report.cjs');
const bodymReport = path.join(root, 'scripts', 'run-progress-scan-bodym-report.cjs');

function runStep(label, scriptPath) {
  const result = spawnSync(nodeBin, [scriptPath], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env },
  });
  if (result.error) {
    console.error(`[${label}]`, result.error);
    return result.status ?? 1;
  }
  return result.status ?? 1;
}

const calibrationStatus = runStep('calibration', calibrationReport);
if (calibrationStatus !== 0) process.exit(calibrationStatus);

const bodymStatus = runStep('bodym', bodymReport);
process.exit(bodymStatus);
