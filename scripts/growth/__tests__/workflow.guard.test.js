/**
 * Source guard for .github/workflows/growth-weekly-totals.yml (LOC-661).
 *
 * Pins the rules the brief makes binding (docs/growth-totals/SPEC.md):
 * weekly timer plus manual dispatch only; no database write (no SQL, CLI or
 * writing call in the workflow, the only database access is run.mjs, whose
 * GET-only reads collect.test.js pins); never a commit or push to this
 * repository, main or otherwise (read-only token, one push to the private
 * totals repository's weekly-totals branch); only the existing database
 * secrets, the read-only crash token and the private-repository token; and nothing
 * that would publish the totals here (this repository and its Actions logs
 * and artifacts are public).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..');
const WF = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'growth-weekly-totals.yml'), 'utf8');
const code = WF.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');

describe('growth-weekly-totals.yml', () => {
  test('runs only on the weekly timer and a manual dispatch, and only from main', () => {
    const on = code.slice(code.indexOf('\non:'), code.indexOf('\npermissions:'));
    expect(on).toMatch(/schedule:\s*\n\s*- cron: '0 6 \* \* 1'/);
    expect(on).toMatch(/workflow_dispatch:/);
    expect(on).not.toMatch(/\b(push|pull_request|pull_request_target|workflow_run|repository_dispatch|issue_comment)\b/);
    expect(code).toMatch(/if: github\.ref == 'refs\/heads\/main'/);
  });

  test('its GitHub token is read-only, so it cannot write to this repository at all', () => {
    expect(code).toMatch(/\npermissions:\n {2}contents: read\n/);
    expect(code).not.toMatch(/:\s*write\b/);
    // The first checkout keeps no credentials.
    const first = code.slice(code.indexOf('- name: Checkout'), code.indexOf('- name: Setup Node'));
    expect(first).toMatch(/persist-credentials: false/);
  });

  test('the only push is to the private repository\'s weekly-totals branch', () => {
    const pushes = code.match(/git push[^\n]*/g) || [];
    expect(pushes).toEqual(['git push --quiet origin HEAD:refs/heads/weekly-totals']);
    expect(code).not.toMatch(/\bmain\b(?!')/); // the only "main" is the refs/heads/main guard
    const commitStep = code.slice(code.indexOf('- name: Commit the totals'));
    expect(commitStep).toMatch(/working-directory: totals-repo/);
    expect(code).toMatch(/repository: Volyume\/volyume-growth-totals/);
    expect(code).toMatch(/path: totals-repo/);
  });

  test('uses exactly the allowed secrets', () => {
    const secrets = [...new Set((code.match(/secrets\.[A-Z0-9_]+/g) || []).map((s) => s.slice(8)))].sort();
    expect(secrets).toEqual(['GROWTH_TOTALS_TOKEN', 'SENTRY_READ_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_URL']);
    // The totals token is used only to check out (and so push to) the private repository.
    expect(code.match(/secrets\.GROWTH_TOTALS_TOKEN/g)).toHaveLength(1);
    expect(code).toMatch(/repository: Volyume\/volyume-growth-totals\n\s+token: \$\{\{ secrets\.GROWTH_TOTALS_TOKEN \}\}/);
    expect(code).not.toMatch(/GITHUB_TOKEN|github\.token/);
  });

  test('never touches the database itself and never publishes the totals here', () => {
    expect(code).not.toMatch(/\bcurl\b|\bwget\b|\bpsql\b|supabase (db|functions|migration)/i);
    expect(code).not.toMatch(/upload-artifact|GITHUB_STEP_SUMMARY|set -x|\bcat\b|\becho \$/);
    expect(code).toMatch(/run: node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts\/growth\/run\.mjs totals-repo/);
    // The totals are built after the private checkout, so nothing is read
    // when there is nowhere to deliver to.
    expect(code.indexOf('Check out the private totals repository')).toBeLessThan(code.indexOf('Build the totals'));
  });

  test('every action is pinned to a commit', () => {
    const uses = code.match(/uses: [^\n]+/g) || [];
    expect(uses.length).toBe(3);
    uses.forEach((u) => expect(u).toMatch(/@[0-9a-f]{40} # v\d+$/));
  });

  test('a failed configured source still fails the run, after the week is saved', () => {
    const fail = code.slice(code.indexOf('- name: Fail when a configured source failed'));
    expect(fail).toMatch(/if: steps\.build\.outputs\.problems != '0'/);
    expect(fail).toMatch(/exit 1/);
    expect(code.indexOf('Commit the totals')).toBeLessThan(code.indexOf('Fail when a configured source failed'));
    expect(code).not.toMatch(/continue-on-error/);
  });
});
