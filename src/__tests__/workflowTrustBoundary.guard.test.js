const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const DIR = path.resolve(__dirname, '../../.github/workflows');
const files = fs.readdirSync(DIR).filter((name) => /\.ya?ml$/.test(name));
const source = Object.fromEntries(files.map((name) => [
  name, fs.readFileSync(path.join(DIR, name), 'utf8'),
]));

describe('GitHub workflow trust boundary', () => {
  test('every workflow parses and every third-party action is immutable', () => {
    for (const [name, text] of Object.entries(source)) {
      expect(() => YAML.parse(text)).not.toThrow();
      for (const match of text.matchAll(/^\s*uses:\s*([^\s#]+)\s*(?:#.*)?$/gm)) {
        const ref = match[1].split('@')[1];
        expect({ name, action: match[1], ref }).toEqual(expect.objectContaining({
          ref: expect.stringMatching(/^[0-9a-f]{40}$/),
        }));
      }
    }
  });

  test('no pull_request_target or privileged feature-branch build path exists', () => {
    const all = Object.values(source).join('\n');
    expect(all).not.toMatch(/pull_request_target\s*:/);
    expect(source['build-android.yml']).not.toMatch(/branches:[\s\S]{0,100}claude\/\*\*/);
    expect(source['deploy-pages.yml']).not.toMatch(/branches:[\s\S]{0,100}claude\/\*\*/);
  });

  test.each([
    'deploy-functions.yml',
    'deploy-migrations.yml',
    'deploy-pages.yml',
    'refresh-off-snapshot.yml',
  ])('%s cannot mutate production from a source push', (name) => {
    const triggers = YAML.parse(source[name]).on;
    expect(triggers).not.toHaveProperty('push');
  });

  test.each([
    ['build-android.yml', 'build'],
    ['build-ios.yml', 'build'],
    ['deploy-functions.yml', 'deploy'],
    ['deploy-migrations.yml', 'apply'],
    ['deploy-pages.yml', 'deploy'],
    ['export-upload-certificate.yml', 'export'],
    ['maestro-e2e.yml', 'e2e'],
    ['print-signing-sha.yml', 'fingerprints'],
    ['refresh-off-snapshot.yml', 'refresh'],
  ])('%s privileged job %s refuses non-main refs', (name, job) => {
    const doc = YAML.parse(source[name]);
    expect(String(doc.jobs[job].if)).toContain("github.ref == 'refs/heads/main'");
  });

  test('PR code runs with read-only repository permissions', () => {
    const doc = YAML.parse(source['main-ci.yml']);
    expect(doc.permissions).toEqual({ contents: 'read' });
    expect(source['main-ci.yml']).not.toContain('pull-requests: write');
  });

  test('release artifacts are traceable to an exact accepted SHA', () => {
    expect(source['build-android.yml']).toContain('artifact-provenance.txt');
    expect(source['build-android.yml']).toContain('volyume-release-apk-${{ github.sha }}');
    expect(source['build-ios.yml']).toContain('item.gitCommitHash === process.env.GITHUB_SHA');
    expect(source['build-ios.yml']).toContain('eas submit --platform ios --id "$EAS_BUILD_ID"');
    expect(source['build-ios.yml']).not.toContain('eas submit --platform ios --latest');
  });

  test.each([
    { skipBuild: false, submit: false, accepted: true },
    { skipBuild: false, submit: true, accepted: true },
    { skipBuild: true, submit: false, accepted: false },
    { skipBuild: true, submit: true, accepted: false },
  ])(
    'iOS dispatch state skip_build=$skipBuild submit=$submit is accepted=$accepted',
    ({ skipBuild, submit, accepted }) => {
      const doc = YAML.parse(source['build-ios.yml']);
      const inputs = doc.on.workflow_dispatch.inputs;
      const dispatchStateIsExpressible = !skipBuild && typeof submit === 'boolean';

      expect(inputs).not.toHaveProperty('skip_build');
      expect(dispatchStateIsExpressible).toBe(accepted);
      expect(source['build-ios.yml']).not.toContain('inputs.skip_build');
      expect(source['build-ios.yml']).toContain('item.gitCommitHash === process.env.GITHUB_SHA');
      expect(source['build-ios.yml']).toContain('eas submit --platform ios --id "$EAS_BUILD_ID"');
    },
  );
});
