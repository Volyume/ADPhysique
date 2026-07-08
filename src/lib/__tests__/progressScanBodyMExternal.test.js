import https from 'https';
import zlib from 'zlib';
import { Buffer } from 'buffer';
import {
  analyseProgressScan,
  estimateBodyFatFromScanAssets,
} from '../progressScanAnalysis';
import { measureMaskSignals } from '../progressScanVision';

const BASE = 'https://amazon-bodym.s3.amazonaws.com/testA';
const SAMPLE_COUNT = 13;
const maybeDescribe = process.env.PROGRESS_SCAN_BODYM_SMOKE === '1' ? describe : describe.skip;
const SHOULD_REPORT = process.env.PROGRESS_SCAN_BODYM_REPORT === '1';
const USE_FULL_BODYM = process.env.PROGRESS_SCAN_BODYM_FULL === '1';
const BUFFER_CACHE = new Map();

jest.setTimeout(USE_FULL_BODYM ? 420000 : 150000);

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy(new Error(`Timeout fetching ${url}`));
    });
  });
}

async function fetchText(url) {
  return (await fetchCachedBuffer(url)).toString('utf8').replace(/^\uFEFF/, '');
}

async function fetchBufferWithRetry(url, attempts = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fetchBuffer(url);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError;
}

async function fetchCachedBuffer(url) {
  if (!BUFFER_CACHE.has(url)) BUFFER_CACHE.set(url, fetchBufferWithRetry(url));
  return BUFFER_CACHE.get(url);
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

function assetFromBodyMMask(maskImage, pose, qualityOverrides = {}) {
  const signals = measureMaskSignals(maskImage.mask, {
    width: maskImage.width,
    height: maskImage.height,
    lightingScore: qualityOverrides.lightingScore ?? 0.9,
    blurScore: qualityOverrides.blurScore ?? 0.9,
    pose,
    modelBacked: true,
    engine: 'bodym_public_silhouette',
    modelVersion: 'bodym_public_silhouette_mask',
  });
  const quality = signals.quality || {};
  return {
    pose,
    qualityScore: qualityOverrides.qualityScore ?? 0.9,
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

function waistToHeight(row) {
  const waist = finiteNumber(row?.measurements?.waist);
  const height = finiteNumber(row?.measurements?.height);
  return waist && height ? waist / height : null;
}

function scaledMaskCentered(maskImage, scale) {
  const { width, height, mask } = maskImage;
  const next = new Float32Array(width * height);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = mask[y * width + x];
      if (value <= 0) continue;
      const tx = Math.round(cx + (x - cx) * scale);
      const ty = Math.round(cy + (y - cy) * scale);
      if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
        const index = ty * width + tx;
        if (value > next[index]) next[index] = value;
      }
    }
  }
  return { mask: next, width, height };
}

async function scoreBodyMSample(sample, { frontTransform = null, sideTransform = null, assetQuality = {} } = {}) {
  const frontMask = decodeGrayscalePngMask(await fetchCachedBuffer(`${BASE}/mask/${sample.photo_id}.png`));
  const sideMask = decodeGrayscalePngMask(await fetchCachedBuffer(`${BASE}/mask_left/${sample.photo_id}.png`));
  const resolvedFrontMask = frontTransform ? frontTransform(frontMask) : frontMask;
  const resolvedSideMask = sideTransform ? sideTransform(sideMask) : sideMask;
  const assets = [
    assetFromBodyMMask(resolvedFrontMask, 'front', assetQuality.front),
    assetFromBodyMMask(resolvedFrontMask, 'back', assetQuality.back),
    assetFromBodyMMask(resolvedSideMask, 'side', assetQuality.side),
  ];
  const sex = sample.gender === 'female' ? 'female' : 'male';
  const heightCm = finiteNumber(sample.height_cm);
  const weightKg = finiteNumber(sample.weight_kg);
  const modelEstimate = estimateBodyFatFromScanAssets({ assets, sex, heightCm, weightKg });
  const out = analyseProgressScan({ assets, modelEstimate, sex, heightCm, weightKg });
  return {
    sample,
    assets,
    out,
    score: out.physiqueAssessment?.visualLeannessScore,
    sex,
    heightCm,
    weightKg,
  };
}

function quantile(rows, p) {
  if (!rows.length) return null;
  return rows[Math.floor((rows.length - 1) * p)];
}

function addSelected(selected, row) {
  if (!row?.subject_id || selected.has(row.subject_id)) return;
  selected.set(row.subject_id, row);
}

function selectBodyMSamples(joined) {
  if (USE_FULL_BODYM) return joined;
  const selected = new Map();
  [0, 0.25, 0.5, 0.75, 1].forEach((p) => addSelected(selected, quantile(joined, p)));

  for (const gender of ['female', 'male']) {
    const group = joined.filter((row) => row.gender === gender);
    [0, 0.5, 1].forEach((p) => addSelected(selected, quantile(group, p)));
  }

  const byWaistToHeight = joined
    .filter((row) => waistToHeight(row) != null)
    .sort((a, b) => waistToHeight(a) - waistToHeight(b));
  addSelected(selected, quantile(byWaistToHeight, 0));
  addSelected(selected, quantile(byWaistToHeight, 1));

  const fillQuantiles = [0.1, 0.18, 0.32, 0.42, 0.58, 0.68, 0.82, 0.9];
  for (const p of fillQuantiles) {
    if (selected.size >= SAMPLE_COUNT) break;
    addSelected(selected, quantile(joined, p));
  }

  return [...selected.values()]
    .sort((a, b) => a.bmi - b.bmi)
    .slice(0, SAMPLE_COUNT);
}

async function loadBodyMRows() {
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
  return joined;
}

async function bodyMSamples() {
  return selectBodyMSamples(await loadBodyMRows());
}

function average(rows, selector) {
  const values = rows.map(selector).filter((value) => value != null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function bandCounts(rows) {
  return rows.reduce((counts, row) => {
    const key = row.band || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function scoreRange(rows) {
  const scores = rows.map((row) => row.score).filter((score) => score != null).sort((a, b) => a - b);
  return {
    min: scores[0] ?? null,
    median: scores.length ? scores[Math.floor((scores.length - 1) * 0.5)] : null,
    max: scores[scores.length - 1] ?? null,
  };
}

function summariseBodyMScores(scored) {
  const bySex = {};
  for (const sex of ['female', 'male']) {
    const rows = scored.filter((row) => row.sex === sex);
    bySex[sex] = {
      count: rows.length,
      averageScore: average(rows, (row) => row.score),
      averageBmi: average(rows, (row) => row.bmi),
      bandCounts: bandCounts(rows),
    };
  }
  const largeReferenceGroup = scored
    .filter((row) => row.waistToHeight != null && (row.waistToHeight >= 0.60 || row.bmi >= 30));
  const leanReferenceGroup = scored
    .filter((row) => row.waistToHeight != null && row.waistToHeight < 0.46 && row.bmi < 23);
  const leanBandLargeBody = largeReferenceGroup
    .filter((row) => ['Defined', 'Lean', 'Very Lean', 'Peak Condition'].includes(row.band));
  return {
    count: scored.length,
    fullDataset: USE_FULL_BODYM,
    bySex,
    scoreRange: scoreRange(scored),
    leanReferenceAverage: average(leanReferenceGroup, (row) => row.score),
    largeReferenceAverage: average(largeReferenceGroup, (row) => row.score),
    largeReferenceCount: largeReferenceGroup.length,
    leanBandLargeBody: leanBandLargeBody.map((row) => ({
      subjectId: row.subjectId,
      sex: row.sex,
      bmi: row.bmi,
      waistToHeight: row.waistToHeight,
      score: row.score,
      band: row.band,
      indexInputs: row.indexInputs,
    })),
  };
}

maybeDescribe('Progress Scan external BodyM silhouette smoke', () => {
  test('real public silhouettes produce finite measured ratios and bounded scores', async () => {
    const samples = await bodyMSamples();
    if (USE_FULL_BODYM) expect(samples.length).toBeGreaterThanOrEqual(80);
    else expect(samples).toHaveLength(SAMPLE_COUNT);

    const scored = [];
    for (const sample of samples) {
      // eslint-disable-next-line no-await-in-loop
      const result = await scoreBodyMSample(sample);
      const { out, score, sex, assets } = result;
      const frontRatios = assets[0].signals.silhouetteRatios;

      expect(out.analysisStatus).toBe('complete');
      expect(score).toBeGreaterThanOrEqual(25);
      expect(score).toBeLessThanOrEqual(100);
      expect(out.physiqueAssessment.scanConfidenceTier).not.toBe('not_enough');
      expect(frontRatios.waistToHeight).toBeGreaterThan(0.05);
      expect(frontRatios.waistToShoulder).toBeGreaterThan(0.35);
      expect(frontRatios.waistToShoulder).toBeLessThan(1.15);
      scored.push({
        subjectId: sample.subject_id,
        sex,
        bmi: sample.bmi,
        waistToHeight: waistToHeight(sample),
        score,
        band: out.physiqueAssessment?.leannessBandLabel,
        confidence: out.physiqueAssessment?.scanConfidenceTier,
        frontRatios,
        estimatorInputs: out.modelEstimate?.inputs ?? null,
        indexInputs: out.physiqueAssessment?.indexInputs ?? null,
      });
    }

    if (SHOULD_REPORT) {
      // eslint-disable-next-line no-console
      console.info(JSON.stringify({
        summary: summariseBodyMScores(scored),
        rows: USE_FULL_BODYM ? [] : scored,
      }, null, 2));
    }

    expect(new Set(scored.map((row) => row.sex))).toEqual(new Set(['female', 'male']));
    expect(scored.some((row) => row.bmi < 18.5)).toBe(true);
    expect(scored.some((row) => row.bmi >= 30)).toBe(true);

    const leaner = scored[0];
    const larger = scored[scored.length - 1];
    expect(larger.bmi).toBeGreaterThan(leaner.bmi);
    expect(larger.waistToHeight).toBeGreaterThan(leaner.waistToHeight);
    expect(larger.score).toBeLessThanOrEqual(leaner.score + 12);
    if (larger.bmi >= 35 && larger.waistToHeight >= 0.60) {
      expect(larger.score).toBeLessThanOrEqual(64);
      expect(['Foundation', 'Active', 'Athletic']).toContain(larger.band);
    }

    const leanReferenceGroup = scored
      .filter((row) => row.waistToHeight != null && row.waistToHeight < 0.46 && row.bmi < 23);
    const largeReferenceGroup = scored
      .filter((row) => row.waistToHeight != null && (row.waistToHeight >= 0.60 || row.bmi >= 30));
    const averageScore = (rows) => rows.reduce((sum, row) => sum + row.score, 0) / rows.length;
    expect(leanReferenceGroup.length).toBeGreaterThanOrEqual(3);
    expect(largeReferenceGroup.length).toBeGreaterThanOrEqual(2);
    expect(averageScore(leanReferenceGroup)).toBeGreaterThanOrEqual(averageScore(largeReferenceGroup) + 10);

    for (const row of largeReferenceGroup) {
      expect(row.score).toBeLessThanOrEqual(69);
      expect(['Foundation', 'Active', 'Athletic']).toContain(row.band);
    }
  });

  test('real public silhouette score stays stable when camera distance changes inside usable framing', async () => {
    const sample = (await bodyMSamples())[Math.floor(SAMPLE_COUNT / 2)];
    const normal = await scoreBodyMSample(sample);
    const slightlyFurtherAway = await scoreBodyMSample(sample, {
      frontTransform: (mask) => scaledMaskCentered(mask, 0.92),
      sideTransform: (mask) => scaledMaskCentered(mask, 0.92),
    });
    const furtherAway = await scoreBodyMSample(sample, {
      frontTransform: (mask) => scaledMaskCentered(mask, 0.84),
      sideTransform: (mask) => scaledMaskCentered(mask, 0.84),
    });

    expect(normal.out.analysisStatus).toBe('complete');
    expect(slightlyFurtherAway.out.analysisStatus).toBe('complete');
    expect(furtherAway.out.analysisStatus).toBe('complete');
    expect(Math.abs(slightlyFurtherAway.score - normal.score)).toBeLessThanOrEqual(5);
    expect(Math.abs(furtherAway.score - normal.score)).toBeLessThanOrEqual(5);
    expect(slightlyFurtherAway.out.physiqueAssessment.scanConfidenceTier).not.toBe('not_enough');
    expect(furtherAway.out.physiqueAssessment.scanConfidenceTier).not.toBe('not_enough');
  });

  test('real public silhouette too close to frame is withheld instead of forced into a score', async () => {
    const sample = (await bodyMSamples())[Math.floor(SAMPLE_COUNT / 2)];
    const tooClose = await scoreBodyMSample(sample, {
      frontTransform: (mask) => scaledMaskCentered(mask, 1.03),
      sideTransform: (mask) => scaledMaskCentered(mask, 1.03),
    });

    expect(tooClose.out.analysisStatus).toBe('abstained');
    expect(tooClose.out.abstentionReasons.length).toBeGreaterThan(0);
    expect(tooClose.out.physiqueAssessment.visualLeannessScore).toBeNull();
  });

  test('real public silhouette quality softness lowers confidence without changing the body read', async () => {
    const sample = (await bodyMSamples())[Math.floor(SAMPLE_COUNT / 2)];
    const strong = await scoreBodyMSample(sample);
    const softer = await scoreBodyMSample(sample, {
      assetQuality: {
        front: { qualityScore: 0.58, lightingScore: 0.46, blurScore: 0.54 },
        back: { qualityScore: 0.58, lightingScore: 0.46, blurScore: 0.54 },
        side: { qualityScore: 0.58, lightingScore: 0.46, blurScore: 0.54 },
      },
    });

    const confidenceRank = { not_enough: 0, unknown: 0, low: 1, moderate: 2, high: 3 };
    expect(strong.out.analysisStatus).toBe('complete');
    expect(softer.out.analysisStatus).toBe('complete');
    expect(Math.abs(softer.score - strong.score)).toBeLessThanOrEqual(2);
    expect(confidenceRank[softer.out.physiqueAssessment.scanConfidenceTier])
      .toBeLessThanOrEqual(confidenceRank[strong.out.physiqueAssessment.scanConfidenceTier]);
  });
});
