#!/usr/bin/env node
/**
 * scripts/exercise-library/audit/runAll.mjs — runs every report script in
 * this directory in order and writes all 8 JSON files under
 * docs/exercise-library-expansion-2026-09-05/data/audit/. Deterministic:
 * re-running overwrites the same files with the same content given the
 * same seed source.
 */
import './count.mjs';
import './duplicates.mjs';
import './naming.mjs';
import './aliases.mjs';
import './coverage.mjs';
import './eligibility.mjs';
import './anomalies.mjs';
import './detailQuality.mjs';
