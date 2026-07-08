import https from 'https';
import zlib from 'zlib';
import { Buffer } from 'buffer';
import {
  analyseProgressScan,
  estimateBodyFatFromScanAssets,
} from '../progressScanAnalysis';
import { measureMaskSignals } from '../progressScanVision';

const BASE = 'https://amazon-bodym.s3.amazonaws.com/testA';
const SAMPLE_COUNT = 5;
const maybeDescribe = process.env.PROGRESS_SCAN_BODYM_SMOKE === '1' ? describe : describe.skip;

jest.setTimeout(90000);

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function fetchText(url) {
  return (await fetchBuffer(url)).toString('utf8').replace(/^\uFEFF/, '');
}

function parseCsv(text) {
  const lines = String(text || '').trim().split(/\r?\n/).filter(Boolean);
  const headers = lines.shift().split(',');
  return lines.map((line) => {
    const cells = line.split(',');
    const row = {};
    headers.forEach((header, index) => { row[header] = cells[index]; });
    return row;
  });
}

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parsePngChunks(buffer) {
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error('Unsupported PNG signature');
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idats = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idats.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += length + 12;
  }
  if (bitDepth !== 8 || colorType !== 0) {
    throw new Error(`Only 8-bit grayscale PNG masks are supported, got bitDepth=${bitDepth} colorType=${colorType}`);
  }
  return { width, height, inflated: zlib.inflateSync(Buffer.concat(idats)) };
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function decodeGrayscalePngMask(buffer) {
  const { width, height, inflated } = parsePngChunks(buffer);
  const stride = width;
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const src = y * (stride + 1);
    const filter = inflated[src];
    const out = y * stride;
    const prev = y === 0 ? null : out - stride;
    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[src + 1 + x];
      const left = x === 0 ? 0 : pixels[out + x - 1];
      const up = prev == null ? 0 : pixels[prev + x];
      const upLeft = prev == null || x === 0 ? 0 : pixels[prev + x - 1];
      let value = raw;
      if (filter === 1) value = raw + left;
      else if (filter === 2) value = raw + up;
      else if (filter === 3) value = raw + Math.floor((left + up) / 2);
      else if (filter === 4) value = raw + paethPredictor(left, up, upLeft);
      else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`);
      pixels[out + x] = value & 0xff;
    }
  }
  const mask = new Float32Array(width * height);
  for (let i = 0; i < pixels.length; i += 1) mask[i] = pixels[i] / 255;
  return { mask, width, height };
}

function assetFromBodyMMask(maskImage, pose) {
  const signals = measureMaskSignals(maskImage.mask, {
    width: maskImage.width,
    height: maskImage.height,
    lightingScore: 0.9,
    blurScore: 0.9,
    pose,
    modelBacked: true,
    engine: 'bodym_public_silhouette',
    modelVersion: 'bodym_public_silhouette_mask',
  });
  const quality = signals.quality || {};
  return {
    pose,
    qualityScore: 0.9,
    segmentationConfidence: quality.segmentationConfidence,
    framingScore: quality.framingScore,
    blurScore: quality.blurScore,
    lightingScore: quality.lightingScore,
    landmarkConfidence: quality.poseConfidence,
    cameraTiltDegrees: quality.cameraTiltDegrees,
    signals,
  };
}

function bmi(row) {
  const heightCm = finiteNumber(row.height_cm);
  const weightKg = finiteNumber(row.weight_kg);
  if (!heightCm || !weightKg) return null;
  return weightKg / ((heightCm / 100) ** 2);
}

async function bodyMSamples() {
  const [hwgRows, measurementRows, photoRows] = await Promise.all([
    fetchText(`${BASE}/hwg_metadata.csv`).then(parseCsv),
    fetchText(`${BASE}/measurements.csv`).then(parseCsv),
    fetchText(`${BASE}/subject_to_photo_map.csv`).then(parseCsv),
  ]);
  const photoBySubject = new Map();
  for (const row of photoRows) {
    if (!photoBySubject.has(row.subject_id)) photoBySubject.set(row.subject_id, row.photo_id);
  }
  const measurementsBySubject = new Map(measurementRows.map((row) => [row.subject_id, row]));
  const joined = hwgRows
    .map((row) => ({
      ...row,
      photo_id: photoBySubject.get(row.subject_id),
      measurements: measurementsBySubject.get(row.subject_id),
      bmi: bmi(row),
    }))
    .filter((row) => row.photo_id && row.measurements && row.bmi)
    .sort((a, b) => a.bmi - b.bmi);
  const indexes = [0, Math.floor(joined.length * 0.25), Math.floor(joined.length * 0.5), Math.floor(joined.length * 0.75), joined.length - 1];
  return indexes.map((index) => joined[index]).slice(0, SAMPLE_COUNT);
}

maybeDescribe('Progress Scan external BodyM silhouette smoke', () => {
  test('real public silhouettes produce finite measured ratios and bounded scores', async () => {
    const samples = await bodyMSamples();
    expect(samples).toHaveLength(SAMPLE_COUNT);

    const scored = [];
    for (const sample of samples) {
      // eslint-disable-next-line no-await-in-loop
      const frontMask = decodeGrayscalePngMask(await fetchBuffer(`${BASE}/mask/${sample.photo_id}.png`));
      // eslint-disable-next-line no-await-in-loop
      const sideMask = decodeGrayscalePngMask(await fetchBuffer(`${BASE}/mask_left/${sample.photo_id}.png`));
      const assets = [
        assetFromBodyMMask(frontMask, 'front'),
        assetFromBodyMMask(frontMask, 'back'),
        assetFromBodyMMask(sideMask, 'side'),
      ];
      const sex = sample.gender === 'female' ? 'female' : 'male';
      const heightCm = finiteNumber(sample.height_cm);
      const weightKg = finiteNumber(sample.weight_kg);
      const modelEstimate = estimateBodyFatFromScanAssets({ assets, sex, heightCm, weightKg });
      const out = analyseProgressScan({ assets, modelEstimate, sex, heightCm, weightKg });
      const score = out.physiqueAssessment?.visualLeannessScore;
      const frontRatios = assets[0].signals.silhouetteRatios;

      expect(out.analysisStatus).toBe('complete');
      expect(score).toBeGreaterThanOrEqual(25);
      expect(score).toBeLessThanOrEqual(100);
      expect(out.physiqueAssessment.scanConfidenceTier).not.toBe('not_enough');
      expect(frontRatios.waistToHeight).toBeGreaterThan(0.05);
      expect(frontRatios.waistToShoulder).toBeGreaterThan(0.35);
      expect(frontRatios.waistToShoulder).toBeLessThan(1.15);
      scored.push({
        bmi: sample.bmi,
        waistToHeight: finiteNumber(sample.measurements.waist) / finiteNumber(sample.measurements.height),
        score,
      });
    }

    const leaner = scored[0];
    const larger = scored[scored.length - 1];
    expect(larger.bmi).toBeGreaterThan(leaner.bmi);
    expect(larger.waistToHeight).toBeGreaterThan(leaner.waistToHeight);
    expect(larger.score).toBeLessThanOrEqual(leaner.score + 12);
  });
});
