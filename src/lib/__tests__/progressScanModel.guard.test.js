import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT = path.resolve(__dirname, '..', '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Progress Scan on-device TFLite model guard', () => {
  test('approved TFLite bridge and bundled model are present', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.dependencies['react-native-fast-tflite']).toBeDefined();
    expect(pkg.dependencies['react-native-nitro-modules']).toBeDefined();
    expect(pkg.dependencies['progress-scan-image']).toBe('file:./modules/progress-scan-image');

    const modelPath = path.join(ROOT, 'assets', 'ml', 'selfie_segmentation.tflite');
    const bytes = fs.readFileSync(modelPath);
    expect(bytes.length).toBeGreaterThan(100000);
    const hash = crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
    expect(hash).toBe('9EE168EC7C8F2A16C56FE8E1CFBC514974CBBB7E434051B455635F1BD1462F5C');
  });

  test('Metro and JS runner load .tflite through fast-tflite, not ExecuTorch', () => {
    expect(read('metro.config.js')).toMatch(/tflite/);
    const vision = read('src/lib/progressScanVision.js');
    expect(vision).toMatch(/loadTensorflowModel/);
    expect(vision).toMatch(/selfie_segmentation\.tflite/);
    expect(`${read('package.json')}\n${vision}`).not.toMatch(/executorch|react-native-pytorch-core/i);
  });

  test('iOS deployment target remains 16.0 for v1', () => {
    const app = JSON.parse(read('app.json'));
    const buildProps = app.expo.plugins.find((entry) => Array.isArray(entry) && entry[0] === 'expo-build-properties');
    expect(buildProps?.[1]?.ios?.deploymentTarget).toBe('16.0');
  });

  test('capture flow analyses scan photos before persisting scan assets', () => {
    const screen = read('src/screens/ProgressPhotosScreen.js');
    const block = screen.slice(screen.indexOf('async function onScanCaptured'));
    expect(block).toMatch(/analyseProgressScanPhoto\(\{ uri: saved\.uri, pose \}\)/);
    expect(block.indexOf('analyseProgressScanPhoto({ uri: saved.uri, pose })'))
      .toBeLessThan(block.indexOf('saveScanAssetAndContinue(flow, pose, name, saved, vision)'));
    expect(block).toMatch(/retakeCopyForVisionResult/);
  });
});
