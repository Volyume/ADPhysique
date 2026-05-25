#!/usr/bin/env node
/**
 * scripts/lint-maestro-flows.js
 *
 * Cheap structural lint for the YAML flows in e2e/. Catches the
 * mistakes that would fail under Maestro at runtime, without
 * needing Maestro installed (CI runs this on every PR; Maestro
 * itself runs only on workflow_dispatch until the smoke bundle is
 * validated).
 *
 * Checks:
 *  - File exists, has an appId header.
 *  - Header has tags listed; every blocked flow has tag "blocked".
 *  - Every blocked flow contains the __MAESTRO_TEST_HOOK_ sentinel
 *    so it can't accidentally run under --include-tags smoke/full.
 *  - No raw Windows-style line endings.
 *  - Each flow has a `---` separator between header + commands.
 *
 * Zero dependencies. Reads YAML as plain text because the
 * structural checks are line-based.
 */

const fs = require('fs');
const path = require('path');

const E2E_DIR = path.resolve(__dirname, '..', 'e2e');
const FAILURES = [];

function fail(file, msg) {
  FAILURES.push(`  ${path.relative(process.cwd(), file)}: ${msg}`);
}

function lintFile(file) {
  const raw = fs.readFileSync(file, 'utf8');

  if (raw.includes('\r')) {
    fail(file, 'CRLF line endings (use LF)');
  }

  const lines = raw.split('\n');

  // The YAML "front matter" pattern Maestro uses: header keys at top,
  // then a `---` separator, then the command list.
  const separatorIdx = lines.findIndex((l) => l.trim() === '---');
  if (separatorIdx === -1) {
    fail(file, 'missing "---" separator between header and commands');
    return;
  }
  const header = lines.slice(0, separatorIdx).join('\n');
  const commands = lines.slice(separatorIdx + 1).join('\n');

  if (!/^appId:\s+\S/m.test(header)) {
    fail(file, 'header missing appId');
  }

  if (!/^tags:/m.test(header)) {
    fail(file, 'header missing tags block');
  }

  const isBlocked = /^\s*-\s*blocked\s*$/m.test(header);
  const hasSentinel = /__MAESTRO_TEST_HOOK_/.test(commands);
  if (isBlocked && !hasSentinel) {
    fail(file, 'flow tagged "blocked" but missing __MAESTRO_TEST_HOOK_ sentinel guard');
  }
  if (!isBlocked && hasSentinel) {
    fail(file, 'flow has __MAESTRO_TEST_HOOK_ sentinel but isn\'t tagged "blocked"');
  }

  // The first command should be a launchApp. Catches accidentally-empty
  // flows or ones that forgot to declare a starting state.
  if (!/^-\s*launchApp\s*:/m.test(commands)) {
    fail(file, 'first command should be launchApp:');
  }
}

function main() {
  if (!fs.existsSync(E2E_DIR)) {
    console.error(`e2e/ directory not found at ${E2E_DIR}`);
    process.exit(1);
  }

  const flowFiles = fs.readdirSync(E2E_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => path.join(E2E_DIR, f));

  if (flowFiles.length === 0) {
    console.error('No .yaml flows found in e2e/');
    process.exit(1);
  }

  for (const file of flowFiles) {
    lintFile(file);
  }

  if (FAILURES.length > 0) {
    console.error(`Maestro flow lint failed (${FAILURES.length} issue${FAILURES.length === 1 ? '' : 's'}):`);
    for (const f of FAILURES) console.error(f);
    process.exit(1);
  }

  console.log(`Maestro flow lint OK (${flowFiles.length} flows checked).`);
}

main();
