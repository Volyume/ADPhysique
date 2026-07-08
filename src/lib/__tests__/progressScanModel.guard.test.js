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

    const estimatorPath = path.join(ROOT, 'assets', 'ml', 'progress_scan_bf_estimator_v1.json');
    const estimatorBytes = fs.readFileSync(estimatorPath);
    const estimatorHash = crypto.createHash('sha256').update(estimatorBytes).digest('hex').toUpperCase();
    const estimator = JSON.parse(estimatorBytes.toString('utf8'));
    expect(estimator.id).toBe('progress_scan_bf_estimator_v1');
    expect(estimator.status).toBe('provisional_validation_pending');
    expect(estimator.requiredInputs).toEqual(expect.arrayContaining(['sex', 'heightCm', 'weightKg']));
    expect(estimator.optionalInputs).toEqual(['side.silhouetteRatios']);
    expect(estimator.limitations).toContain('never_authoritative_for_safety_floors');
    expect(estimatorHash).toBe('2E971BBE14D5969FF1F158DEEF47C4D74685A89DA8059D1BC9968A61AF1BAFB5');
  });

  test('Metro and JS runner load .tflite through fast-tflite, not ExecuTorch', () => {
    expect(read('metro.config.js')).toMatch(/tflite/);
    const vision = read('src/lib/progressScanVision.js');
    expect(vision).toMatch(/loadTensorflowModel/);
    expect(vision).toMatch(/selfie_segmentation\.tflite/);
    expect(vision).toMatch(/Asset\.fromModule\(source\)/);
    expect(vision).toMatch(/normaliseFastTfliteUri/);
    expect(vision).toMatch(/resolveBundledModel\?\.\(MODEL_FILE_NAME\)/);
    expect(vision).toMatch(/diagnoseBundledModel\?\.\(MODEL_FILE_NAME\)/);
    expect(vision).toMatch(/let modelSource = null/);
    expect(vision).toMatch(/modelSource = await resolveProgressScanModelSource\(\)/);
    expect(vision).toMatch(/if \(!modelSource\)/);
    expect(vision).toMatch(/const safeSource = safeFastTfliteSource\(modelSource\)/);
    expect(vision).toMatch(/if \(!safeSource\)/);
    expect(vision).toMatch(/loadTensorflowModel\(safeSource, \[\]\)/);
    expect(vision).not.toMatch(/loadTensorflowModel\(MODEL_SOURCE\(\), \[\]\)/);
    expect(vision).not.toMatch(/loadTensorflowModel\(modelSource, \[\]\)/);
    expect(`${read('package.json')}\n${vision}`).not.toMatch(/executorch|react-native-pytorch-core/i);
  });

  test('native model resolver copies release assets before fast-tflite sees them', () => {
    const androidModule = read('modules/progress-scan-image/android/src/main/java/expo/modules/progressscanimage/ProgressScanImageModule.kt');
    const iosModule = read('modules/progress-scan-image/ios/ProgressScanImageModule.swift');
    expect(androidModule).toMatch(/AsyncFunction\("resolveBundledModel"\)/);
    expect(androidModule).toMatch(/AsyncFunction\("diagnoseBundledModel"\)/);
    expect(androidModule).toMatch(/bundledModelMinimumBytes = 100_000L/);
    expect(androidModule).toMatch(/copyFirstBundledModelAsset/);
    expect(androidModule).toMatch(/assets_ml_\$base/);
    expect(androidModule).toMatch(/discoveredBundledModelAssetCandidates/);
    expect(androidModule).toMatch(/context\.assets\.list/);
    expect(androidModule).toMatch(/Uri\.fromFile\(target\)\.toString\(\)/);
    expect(iosModule).toMatch(/AsyncFunction\("resolveBundledModel"\)/);
    expect(iosModule).toMatch(/AsyncFunction\("diagnoseBundledModel"\)/);
    expect(iosModule).toMatch(/bundledModelMinimumBytes = 100_000/);
    expect(iosModule).toMatch(/progress_scan_models/);
    expect(iosModule).toMatch(/assets_ml_\\\(base\)_\\\(ext\)/);
    expect(iosModule).toMatch(/urls\(forResourcesWithExtension: nil/);
    expect(iosModule).toMatch(/target\.absoluteString/);
  });

  test('iOS native module exposes Apple Vision person-mask fallback for scan reliability', () => {
    const iosModule = read('modules/progress-scan-image/ios/ProgressScanImageModule.swift');
    expect(iosModule).toMatch(/import Vision/);
    expect(iosModule).toMatch(/AsyncFunction\("segmentPersonMask"\)/);
    expect(iosModule).toMatch(/VNGeneratePersonSegmentationRequest/);
    expect(iosModule).toMatch(/kCVPixelFormatType_OneComponent8/);
    expect(iosModule).toMatch(/vision_person_segmentation/);
    expect(iosModule).toMatch(/maskBase64\(from: pixelBuffer\)/);
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

  test('visible physique score layer is separate from the legacy internal estimator asset', () => {
    const analysis = read('src/lib/progressScanAnalysis.js');
    const store = read('src/lib/progressScanStore.js');
    expect(analysis).toMatch(/progress_scan_bf_estimator_v1\.json/);
    expect(analysis).toMatch(/estimateBodyFatFromScanAssets/);
    expect(store).toMatch(/estimateBodyFatFromScanAssets/);
    expect(analysis).toMatch(/export function estimateBodyFatFromScanAssets/);
    expect(analysis).toMatch(/PROGRESS_SCAN_SCORE_VERSION/);
    expect(analysis).toMatch(/buildPhysiqueAssessment/);
    expect(analysis).toMatch(/not_body_fat_estimate/);
    expect(analysis).not.toMatch(/return null;\s*}\s*function modelEstimateValue/);
  });

  test('Android release workflow verifies native 16 KB page-size compatibility', () => {
    const verifier = read('scripts/verify-android-elf-page-size.cjs');
    expect(verifier).toMatch(/PT_LOAD/);
    expect(verifier).toMatch(/64-bit native libraries/);
    expect(verifier).toMatch(/skipped32/);
    expect(read('package.json')).toMatch(/verify:android:16kb/);
    expect(read('.github/workflows/build-android.yml')).toMatch(/verify:android:16kb/);
    expect(read('.github/workflows/build-android.yml')).toMatch(/app-release\.aab/);
    expect(read('.github/workflows/build-android.yml')).toMatch(/timeout-minutes:\s*45/);
  });
});
