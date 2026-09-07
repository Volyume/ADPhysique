// Operator branch-page feeds (verification and gap-fill, GD-02) — every
// operators/<slug>/branches.jsonl found under the raw folder. Folders with
// no branches.jsonl (a robots.txt/sitemap-only recon, or a blocked
// operator) are silently skipped: they carry no facts to import. The
// per-branch field transform lives in lib/transforms.js, unit-tested
// there.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { transformOperatorBranch } = require('../lib/transforms.js');

const OPERATORS_DIR = 'operators';

/**
 * @param {string} rawDir
 * @yields {object} common record
 */
export async function* readRecords(rawDir, log = console.log) {
  const opsDir = path.join(rawDir, OPERATORS_DIR);
  if (!fs.existsSync(opsDir)) {
    log(`operators: source not present (${opsDir}) - skipped`);
    return;
  }

  const slugs = fs
    .readdirSync(opsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  let totalEmitted = 0;
  for (const slug of slugs) {
    const branchesFile = path.join(opsDir, slug, 'branches.jsonl');
    if (!fs.existsSync(branchesFile)) continue;

    const stream = fs.createReadStream(branchesFile, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let count = 0;
    let idx = 0;
    for await (const line of rl) {
      if (!line.trim()) continue;
      idx += 1;
      let branch;
      try {
        branch = JSON.parse(line);
      } catch {
        continue;
      }
      const record = transformOperatorBranch(branch, slug, idx);
      if (!record) continue;
      count += 1;
      yield record;
    }
    totalEmitted += count;
    log(`operators:${slug}: ${count} branches emitted`);
  }
  log(`operators: ${totalEmitted} branches emitted across ${slugs.length} operator folders checked`);
}
