/**
 * trialBuildPath.guard.test.js
 *
 * LOC-413 (kit trial 3). The founder tests the React Native Reusables trial from
 * the branch `trial/rn-reusables` as a SEPARATE app (`app.volyume.trial`) that
 * installs beside the store app. This suite pins the three promises that make
 * that safe, so a later edit cannot quietly break one:
 *
 *   1. A build that is not the trial gets app.json UNCHANGED (app.config.js is a
 *      pass-through unless APP_VARIANT is `trial`).
 *   2. The trial identity really is a different app: its own id, name and
 *      over-the-air channel, and nothing that belongs to the store app's links.
 *   3. The trial jobs in the two build workflows run only from the trial branch,
 *      hold no store-signing or Play material, and cannot submit anywhere unless
 *      the founder ticks the TestFlight box, and then only to the trial app.
 *
 *   4. (LOC-648) The trial reports nothing to the live app's error tracking and
 *      uploads no source maps, whatever the EAS project or the CI environment
 *      holds. The guard is in the app's own config (the Sentry plugin is dropped
 *      and the manifest says `appVariant: trial`, which src/lib/sentry.js reads),
 *      so it holds even if EXPO_PUBLIC_SENTRY_DSN or SENTRY_AUTH_TOKEN reaches the
 *      build; the eas.json profile only adds a second, non-load-bearing switch.
 *
 * Main's own jobs keep their main-only guard (also pinned in
 * workflowTrustBoundary.guard.test.js). Source-level checks parse the workflow
 * YAML, so comments cannot satisfy or break them.
 */
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const root = path.resolve(__dirname, '../..');
const APP = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const EAS = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const ANDROID = YAML.parse(read('.github/workflows/build-android.yml'));
const IOS = YAML.parse(read('.github/workflows/build-ios.yml'));

const {
  applyTrialIdentity, TRIAL_APP_ID, TRIAL_NAME, TRIAL_CHANNEL, SENTRY_PLUGIN,
} = require('../../scripts/ci/trial-identity.cjs');
const appConfig = require('../../app.config.js');

const TRIAL_REF = "github.ref == 'refs/heads/trial/rn-reusables'";
const MAIN_REF = "github.ref == 'refs/heads/main'";
const clone = (o) => JSON.parse(JSON.stringify(o));
const pluginNames = (config) => (config.plugins || []).map((p) => (Array.isArray(p) ? p[0] : p));

describe('app config: only APP_VARIANT=trial changes anything', () => {
  test.each([[{}], [{ APP_VARIANT: 'production' }], [{ APP_VARIANT: 'preview' }],
    [{ APP_VARIANT: 'development' }], [{ APP_VARIANT: 'TRIAL' }], [{ APP_VARIANT: '' }]])(
    'env %j returns the very same config object, untouched',
    (env) => {
      const input = clone(APP);
      expect(applyTrialIdentity(input, env)).toBe(input);
      expect(input).toEqual(APP);
    },
  );

  test('app.config.js hands app.json straight through for a normal build', () => {
    const before = process.env.APP_VARIANT;
    delete process.env.APP_VARIANT;
    try {
      expect(appConfig({ config: clone(APP) })).toEqual(APP);
    } finally {
      if (before !== undefined) process.env.APP_VARIANT = before;
    }
  });

  test('store identity in app.json is still app.volyume on the production channel', () => {
    expect(APP.ios.bundleIdentifier).toBe('app.volyume');
    expect(APP.android.package).toBe('app.volyume');
    expect(APP.updates.requestHeaders['expo-channel-name']).toBe('production');
  });
});

describe('the trial identity is a different app', () => {
  const input = clone(APP);
  const trial = applyTrialIdentity(input, { APP_VARIANT: 'trial', TRIAL_VERSION_CODE: '4321' });

  test('own ids, name and update channel; input not mutated', () => {
    expect(trial.ios.bundleIdentifier).toBe('app.volyume.trial');
    expect(trial.android.package).toBe('app.volyume.trial');
    expect(TRIAL_APP_ID).toBe('app.volyume.trial');
    expect(trial.name).toBe(TRIAL_NAME);
    expect(trial.name).not.toBe(APP.name);
    expect(trial.updates.requestHeaders['expo-channel-name']).toBe(TRIAL_CHANNEL);
    expect(TRIAL_CHANNEL).not.toBe('production');
    expect(input).toEqual(APP);
  });

  test('versionCode follows the CI run number only when it is a positive integer', () => {
    expect(trial.android.versionCode).toBe(4321);
    for (const bad of [undefined, '', 'abc', '0', '-5']) {
      const t = applyTrialIdentity(clone(APP), { APP_VARIANT: 'trial', TRIAL_VERSION_CODE: bad });
      expect(t.android.versionCode).toBe(APP.android.versionCode);
    }
  });

  test('no https App Link or Associated Domain that belongs to the store app', () => {
    for (const f of trial.android.intentFilters) {
      expect(f.data.some((d) => d.scheme === 'https')).toBe(false);
    }
    expect(trial.ios.associatedDomains).toBeUndefined();
    expect(JSON.stringify(trial)).not.toMatch(/"app\.volyume"/);
  });

  test('everything else is carried over, including the project link', () => {
    expect(trial.slug).toBe(APP.slug);
    expect(trial.scheme).toBe(APP.scheme);
    expect(trial.extra.eas.projectId).toBe(APP.extra.eas.projectId);
    // Every plugin but the Sentry upload plugin (LOC-648, see the error-tracking block below).
    expect(trial.plugins).toEqual(APP.plugins.filter((p) => (Array.isArray(p) ? p[0] : p) !== SENTRY_PLUGIN));
    expect(trial.runtimeVersion).toEqual(APP.runtimeVersion);
    expect(trial.updates.url).toBe(APP.updates.url);
  });
});

describe('the trial reports nothing to the live app\'s error tracking (LOC-648)', () => {
  const trial = applyTrialIdentity(clone(APP), { APP_VARIANT: 'trial' });

  test('the live app really does carry the Sentry upload plugin, so dropping it is trial-only', () => {
    expect(pluginNames(APP)).toContain(SENTRY_PLUGIN);
    for (const env of [{}, { APP_VARIANT: 'production' }, { APP_VARIANT: 'preview' }]) {
      expect(pluginNames(applyTrialIdentity(clone(APP), env))).toContain(SENTRY_PLUGIN);
      expect(applyTrialIdentity(clone(APP), env).extra.appVariant).toBeUndefined();
    }
  });

  test('the trial config drops the Sentry plugin, so no native build step can upload source maps or symbols', () => {
    expect(pluginNames(trial)).not.toContain(SENTRY_PLUGIN);
    expect(JSON.stringify(trial.plugins)).not.toMatch(/sentry/i);
    expect(pluginNames(trial)).toHaveLength(pluginNames(APP).length - 1);
  });

  test('the manifest says this is the trial, and nothing else in extra changes', () => {
    expect(trial.extra.appVariant).toBe('trial');
    expect({ ...trial.extra, appVariant: undefined }).toEqual({ ...APP.extra, appVariant: undefined });
  });

  test('a leaked token or DSN in the build environment changes nothing: the config is the same', () => {
    const leaky = applyTrialIdentity(clone(APP), {
      APP_VARIANT: 'trial',
      SENTRY_AUTH_TOKEN: 'sntrys_leaked',
      EXPO_PUBLIC_SENTRY_DSN: 'https://key@o0.ingest.sentry.io/1',
      SENTRY_DISABLE_AUTO_UPLOAD: 'false',
    });
    expect(leaky).toEqual(trial);
  });

  test('app.config.js applies it end to end', () => {
    const before = process.env.APP_VARIANT;
    process.env.APP_VARIANT = 'trial';
    try {
      const evaluated = appConfig({ config: clone(APP) });
      expect(pluginNames(evaluated)).not.toContain(SENTRY_PLUGIN);
      expect(evaluated.extra.appVariant).toBe('trial');
    } finally {
      if (before === undefined) delete process.env.APP_VARIANT; else process.env.APP_VARIANT = before;
    }
  });

  test('eas.json: the trial profile also switches the upload off; the production profile is untouched', () => {
    expect(EAS.build.trial.env.SENTRY_DISABLE_AUTO_UPLOAD).toBe('true');
    expect(EAS.build.production.env).toEqual({
      APP_VARIANT: 'production',
      EAS_SKIP_AUTO_FINGERPRINT: '1',
      RCT_USE_PREBUILT_RNCORE: '0',
      RCT_USE_RN_DEP: '0',
    });
  });

  test('both trial jobs refuse to build if the prebuilt or evaluated config still carries Sentry', () => {
    const androidVerify = ANDROID.jobs['build-trial'].steps.find((s) => /Verify the trial identity before compiling/.test(s.name));
    expect(androidVerify.run).toMatch(/grep -rli sentry android/);
    const iosVerify = IOS.jobs['build-trial'].steps.find((s) => /Verify the trial identity before building/.test(s.name));
    expect(iosVerify.run).toMatch(/sentry/i);
    expect(iosVerify.run).toContain("c.extra.appVariant !== 'trial'");
  });
});

describe('the trial starts no error-tracking client, even if a DSN reaches the bundle (LOC-648)', () => {
  const DSN = 'https://publicKey@o0.ingest.sentry.io/123';
  let init;
  let manifestExtra;

  function loadSentry() {
    jest.resetModules();
    init = jest.fn();
    jest.doMock('@sentry/react-native', () => ({
      init, setUser: jest.fn(), withScope: jest.fn(), captureException: jest.fn(),
      captureMessage: jest.fn(), addBreadcrumb: jest.fn(),
    }));
    jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: manifestExtra } } }));
    return require('../lib/sentry');
  }

  beforeEach(() => { process.env.EXPO_PUBLIC_SENTRY_DSN = DSN; });
  afterEach(() => { delete process.env.EXPO_PUBLIC_SENTRY_DSN; jest.dontMock('@sentry/react-native'); jest.dontMock('expo-constants'); });

  test('a trial manifest with a valid DSN present: initSentry never calls the SDK', () => {
    manifestExtra = { appVariant: 'trial' };
    const sentry = loadSentry();
    expect(sentry.isTrialBuild()).toBe(true);
    sentry.initSentry({ environment: 'test' });
    expect(init).not.toHaveBeenCalled();
  });

  test('a normal build, same DSN: initSentry starts the client exactly as before', () => {
    for (const extra of [{}, { appVariant: 'production' }, undefined]) {
      manifestExtra = extra;
      const sentry = loadSentry();
      expect(sentry.isTrialBuild()).toBe(false);
      sentry.initSentry({ environment: 'test' });
      expect(init).toHaveBeenCalledTimes(1);
      expect(init.mock.calls[0][0].dsn).toBe(DSN);
    }
  });
});

describe('eas.json trial profile', () => {
  test('is its own profile on its own channel, selecting the trial identity', () => {
    const p = EAS.build.trial;
    expect(p.channel).toBe('trial');
    expect(p.env.APP_VARIANT).toBe('trial');
    expect(EAS.build.production.channel).toBe('production');
    expect(EAS.build.production.env.APP_VARIANT).toBe('production');
  });
});

describe('Android workflow', () => {
  const main = ANDROID.jobs.build;
  const trial = ANDROID.jobs['build-trial'];
  const trialText = JSON.stringify(trial);

  test('main job still runs from main only; trial job from the trial branch only', () => {
    expect(main.if).toBe(MAIN_REF);
    expect(trial.if).toBe(TRIAL_REF);
  });

  test('trial job carries no store-signing, Play or Sentry-upload material', () => {
    for (const forbidden of [
      'ANDROID_KEYSTORE', 'ANDROID_KEY_', 'upload.keystore', 'VOLYUME_UPLOAD',
      'SENTRY_AUTH_TOKEN', 'EXPO_PUBLIC_SENTRY_DSN', 'bundleRelease', '.aab',
      'submit', 'eas update', 'play.google', 'r0adkll', 'supply',
    ]) {
      // "upload.keystore" appears once, in the refusal check that it is absent.
      if (forbidden === 'upload.keystore') continue;
      expect(trialText).not.toContain(forbidden);
    }
    expect(trialText).toContain('assembleRelease');
    expect(trial.env.APP_VARIANT).toBe('trial');
  });

  test('it refuses to build or ship an APK that is not app.volyume.trial', () => {
    expect(trialText).toContain('applicationId');
    expect(trialText).toContain('dump packagename');
    expect(trialText).toContain('app.volyume.trial');
    expect(trialText).toContain('An upload keystore is present in the trial tree');
  });

  test('its Android SDK and NDK list matches the main job, so it cannot drift', () => {
    const pkgs = (job) => [...JSON.stringify(job).matchAll(/install_sdk_package \\"([^\\"]+)\\"/g)]
      .map((m) => m[1]).sort();
    expect(pkgs(trial).length).toBeGreaterThan(0);
    expect(pkgs(trial)).toEqual(pkgs(main));
  });
});

describe('iOS workflow', () => {
  const main = IOS.jobs.build;
  const trial = IOS.jobs['build-trial'];
  const trialText = JSON.stringify(trial);
  const submitSteps = trial.steps.filter((s) => /eas submit/.test(s.run || ''));

  test('main job still runs from main only; trial job from the trial branch only', () => {
    expect(main.if).toBe(MAIN_REF);
    expect(trial.if).toBe(TRIAL_REF);
  });

  test('the TestFlight box is its own input and is off by default', () => {
    const inputs = IOS.on.workflow_dispatch.inputs;
    expect(inputs.trial_testflight.default).toBe(false);
    expect(inputs.trial_testflight.type).toBe('boolean');
    expect(trialText).not.toContain('inputs.submit');
  });

  test('every submit step is behind the TestFlight box and targets only the trial app', () => {
    expect(submitSteps).toHaveLength(1);
    for (const s of submitSteps) expect(String(s.if)).toContain('inputs.trial_testflight');
    const resolvers = trial.steps.filter((x) => /resolve-asc-app-id\.mjs/.test(x.run || ''));
    expect(resolvers.length).toBeGreaterThan(0);
    for (const s of resolvers) {
      expect(String(s.if)).toContain('inputs.trial_testflight');
      expect(s.env.IOS_BUNDLE_ID).toBe('app.volyume.trial');
    }
    expect(trialText).not.toContain('--latest');
  });

  test('it builds the trial profile only: never production, never an OTA publish', () => {
    expect(trialText).toContain('--profile trial');
    expect(trialText).not.toContain('--profile production');
    expect(trialText).not.toMatch(/eas update/);
    expect(trialText).not.toMatch(/--platform android/);
    expect(trial.env.APP_VARIANT).toBe('trial');
    expect(trial.env.TRIAL_BUNDLE_ID).toBe('app.volyume.trial');
  });

  test('it stops before any build credit is spent if the config is not the trial identity', () => {
    const idx = (re) => trial.steps.findIndex((s) => re.test(`${s.name} ${s.run || ''}`));
    const verify = idx(/Verify the trial identity/);
    const build = idx(/spawn eas build/);
    expect(verify).toBeGreaterThan(-1);
    expect(build).toBeGreaterThan(verify);
  });

  test('it never touches the live Sentry settings in EAS', () => {
    expect(trialText).not.toContain('SENTRY');
  });
});
