#!/usr/bin/env node
// run-all.mjs — runs the full pipeline in order. Idempotent: every stage
// reads its own input file and overwrites its own output file, so
// re-running from scratch always reproduces the same result for
// unchanged raw data (bar wall-clock timestamps like retrieved_at).

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STAGES = ['normalise.mjs', 'geocode.mjs', 'classify.mjs', 'dedupe.mjs', 'build.mjs', 'audit.mjs', 'seed-sql.mjs'];

for (const stage of STAGES) {
  const scriptPath = path.join(__dirname, stage);
  console.log(`\n=== running ${stage} ===`);
  const result = spawnSync(process.execPath, [scriptPath], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`[run-all] ${stage} failed with exit code ${result.status}`);
    process.exit(result.status || 1);
  }
}

console.log('\n[run-all] pipeline complete.');
