// Node-runnable guard for the progress-scan replay CLI.
// Run: node scripts/ci/run-progress-scan-replay.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const script = path.join(root, 'scripts', 'run-progress-scan-replay.cjs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'volyume-replay-'));
const replayFile = path.join(tmpDir, 'cases.json');

fs.writeFileSync(replayFile, JSON.stringify([
  {
    id: 'real_progress_scan_20260708',
    label: 'Replay smoke case',
    sex: 'male',
    heightCm: 180,
    weightKg: 82,
    ratios: {
      waistToShoulder: 0.63,
      waistToHip: 0.78,
      waistToHeight: 0.19,
      bodyAreaRatio: 0.3,
      frontBackWaistSpread: 0.01,
      bboxHeightRatio: 0.74,
      bboxWidthRatio: 0.34,
    },
    quality: {
      qualityScore: 0.9,
      segmentationConfidence: 0.9,
      framingScore: 0.88,
      blurScore: 0.86,
      lightingScore: 0.92,
      poseConfidence: 0.9,
      backgroundSeparation: 0.9,
    },
    expected: {
      min: 80,
      max: 94,
      bands: ['Lean', 'Very Lean'],
      minConfidence: 'moderate',
    },
  },
], null, 2));

const ok = spawnSync(process.execPath, [script, replayFile], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, CI: '1' },
});

assert.equal(ok.status, 0, ok.stderr || ok.stdout);
assert.match(ok.stdout, /Progress Scan replay:/);
assert.match(ok.stdout, /Progress Scan replay completed/);

const missing = spawnSync(process.execPath, [script, path.join(tmpDir, 'missing.json')], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, CI: '1' },
});

assert.notEqual(missing.status, 0);
assert.match(`${missing.stderr}${missing.stdout}`, /Replay file does not exist/);

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('  ok - progress-scan replay CLI guards passed');
