#!/usr/bin/env node
/**
 * Entry point for .github/workflows/growth-weekly-totals.yml (LOC-661).
 * Usage: node scripts/growth/run.mjs <output directory>
 * Everything it does is in collect.js; this file only wires Node's fetch,
 * app.json's Sentry entry and the GitHub step outputs to it.
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { main } = await import(pathToFileURL(join(root, 'scripts', 'growth', 'collect.js')).href);
const { sentryConfigFromAppJson } = await import(pathToFileURL(join(root, 'scripts', 'growth', 'sentryCrashes.js')).href);

const appJson = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8'));
const setOutput = (name, value) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
};

process.exitCode = await main({
  env: process.env,
  fetchImpl: fetch,
  outDir: process.argv[2],
  sentry: sentryConfigFromAppJson(appJson),
  setOutput,
});
