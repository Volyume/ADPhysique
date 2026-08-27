/**
 * Release observability gate (adversarial audit 2026-08-26).
 *
 * WHAT THIS COST. Build 57 shipped to real users with SENTRY_AUTH_TOKEN unset.
 * The workflow noticed, pushed SENTRY_DISABLE_AUTO_UPLOAD, printed a tick and
 * carried on. So when that build died with EXC_BREAKPOINT on a background
 * queue, Sentry had no dSYM: every app frame read <redacted>, and the nearest
 * symbol it could offer pointed 137 KB away at unrelated Fabric code. The only
 * way to identify the faulting function was to download the .ipa, confirm its
 * LC_UUID matched the crash image, and disassemble the crash address by hand.
 *
 * A production build with its observability switched off must not be something
 * that happens quietly. It is now a hard failure on both platforms, with a
 * dispatch-time opt-out for anyone who accepts the cost deliberately, which is
 * the same distinct-intentional-path shape the sync work uses for destructive
 * discard.
 *
 * These are source guards on the workflow files, because CI configuration
 * cannot be exercised from Jest.
 */

const fs = require('fs');
const path = require('path');

const WF = path.join(__dirname, '..', '..', '.github', 'workflows');
const IOS = fs.readFileSync(path.join(WF, 'build-ios.yml'), 'utf8');
const ANDROID = fs.readFileSync(path.join(WF, 'build-android.yml'), 'utf8');

describe.each([['iOS', IOS], ['Android', ANDROID]])('%s release build', (_name, WORKFLOW) => {
  test('refuses to build when SENTRY_AUTH_TOKEN is missing', () => {
    // The exit is the whole fix. A warning would have printed on build 57 too.
    expect(WORKFLOW).toMatch(/Refusing to build without crash symbols/);
    expect(WORKFLOW).toMatch(/exit 1/);
  });

  test('offers a deliberate, named opt-out rather than failing open', () => {
    // Without this the gate would block an urgent build, and someone would
    // delete the gate rather than the token requirement.
    expect(WORKFLOW).toMatch(/allow_unsymbolicated:/);
    expect(WORKFLOW).toMatch(/inputs\.allow_unsymbolicated \}\}" = "true"/);
  });

  test('the opt-out is loud about what it costs', () => {
    expect(WORKFLOW).toMatch(/::warning title=Unsymbolicated build::/);
    expect(WORKFLOW).toMatch(/unreadable/i);
  });

  test('the opt-out defaults to false, so silence is never the default', () => {
    const block = WORKFLOW.slice(WORKFLOW.indexOf('allow_unsymbolicated:'));
    expect(block.slice(0, 260)).toMatch(/default:\s*false/);
  });

  test('the token itself is never echoed', () => {
    // Presence is tested with -n; the value must never reach the log.
    expect(WORKFLOW).not.toMatch(/echo\s+"?\$SENTRY_AUTH_TOKEN/);
    expect(WORKFLOW).not.toMatch(/echo .*\$\{\{ secrets\.SENTRY_AUTH_TOKEN \}\}/);
  });
});

describe('the iOS workflow no longer fails soft', () => {
  test('the old always-continue branch is gone', () => {
    // The exact line that shipped build 57 unsymbolicated.
    expect(IOS).not.toMatch(/No SENTRY_AUTH_TOKEN; disabled source-map upload so the build can't fail on it/);
  });

  test('why the gate exists is recorded next to it', () => {
    expect(IOS).toMatch(/build 57/);
    expect(IOS).toMatch(/LC_UUID|disassembl/i);
  });
});
