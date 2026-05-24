/**
 * Open Food Facts write-back queue.
 *
 * When a user creates a custom food after a scan-miss + OCR (and
 * has opted in to OFF contributions), the macros + label image get
 * queued for upload to OFF's contribution API. The upload happens
 * in the background within 30s of the save; failures retry up to 3
 * times with exponential backoff. Permanent failures log but do not
 * surface to the user.
 *
 * Locked in FOOD_DATA_STRATEGY_LOCKED.md + MOVE_1_5_BARCODE_AND_OCR.md.
 * Consent toggle defaults OFF; copy:
 *   "Found this one yourself? You can share it with Open Food Facts
 *    so the next Volyume user gets a hit instead of a miss. We only
 *    send the label photo and the macros you confirmed. Off by
 *    default."
 *
 * Storage: AsyncStorage for the consent flag + queue. The queue is
 * small (label-snap events) and ephemeral; we don't need SQLite +
 * sync infrastructure for it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logWarn } from '../errorLog';
import { track as trackEvent } from '../engineTelemetry';

const CONSENT_KEY = '@volyume_off_writeback_consent_v1';
const QUEUE_KEY   = '@volyume_off_writeback_queue_v1';

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = [2000, 8000, 30000];
const OFF_CONTRIB_URL = 'https://world.openfoodfacts.org/cgi/product_jqm2.pl';
const USER_AGENT = 'Volyume/1.1 (https://volyume.app)';

export async function getConsent() {
  const v = await AsyncStorage.getItem(CONSENT_KEY).catch(() => null);
  return v === '1';
}

export async function setConsent(on) {
  await AsyncStorage.setItem(CONSENT_KEY, on ? '1' : '0').catch(() => {});
}

async function _readQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY).catch(() => null);
  if (!raw) return [];
  try { return JSON.parse(raw) || []; } catch { return []; }
}

async function _writeQueue(items) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items)).catch(() => {});
}

/**
 * Queue a contribution. Caller passes the food fields + the original
 * barcode + base64 image. Image data lives in the queue payload too
 * (small images only; UI compresses before calling).
 *
 * @param {string} userId
 * @param {object} contribution { barcode, name, brand, kcal100g,
 *   protein100g, carbs100g, fat100g, fibre100g, servingG, imageBase64? }
 */
export async function queueContribution(userId, contribution) {
  if (!(await getConsent())) return; // hard gate
  if (!contribution?.barcode) return; // no barcode = no contribution
  const queue = await _readQueue();
  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    contribution,
    attempts: 0,
    queuedAt: Date.now(),
  });
  await _writeQueue(queue);
  _scheduleFlush();
}

let _flushTimer = null;
function _scheduleFlush(delayMs = 30000) {
  if (_flushTimer) return;
  _flushTimer = setTimeout(() => {
    _flushTimer = null;
    flushQueue().catch(() => {});
  }, delayMs);
}

async function _postToOff(c) {
  // OFF accepts product additions via form-urlencoded POST. Minimal
  // payload: code + product_name + nutriments. Anonymous contribution
  // is allowed (logged username defaults to "openfoodfacts-contributors")
  // since we deliberately don't pass through Volyume credentials.
  const params = new URLSearchParams();
  params.set('code', c.barcode);
  if (c.name)  params.set('product_name', c.name);
  if (c.brand) params.set('brands', c.brand);
  if (c.servingG) params.set('serving_size', `${c.servingG} g`);
  if (Number.isFinite(c.kcal100g))    params.set('nutriment_energy-kcal_100g', String(c.kcal100g));
  if (Number.isFinite(c.protein100g)) params.set('nutriment_proteins_100g',    String(c.protein100g));
  if (Number.isFinite(c.carbs100g))   params.set('nutriment_carbohydrates_100g', String(c.carbs100g));
  if (Number.isFinite(c.fat100g))     params.set('nutriment_fat_100g',         String(c.fat100g));
  if (Number.isFinite(c.fibre100g))   params.set('nutriment_fiber_100g',       String(c.fibre100g));

  const res = await fetch(OFF_CONTRIB_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: params.toString(),
  });
  return res.ok;
}

/**
 * Flush the queue. Each item gets one attempt per flush; failures
 * remain queued with attempts++ and a per-attempt backoff scheduled
 * via _scheduleFlush. Items exceeding MAX_RETRIES drop silently
 * (the log line is the only trace; user is not bothered).
 */
export async function flushQueue() {
  if (!(await getConsent())) {
    // User flipped consent off after queuing. Drop everything.
    await _writeQueue([]);
    return;
  }
  const queue = await _readQueue();
  if (queue.length === 0) return;
  const remaining = [];
  for (const item of queue) {
    try {
      const ok = await _postToOff(item.contribution);
      if (ok) {
        if (item.userId) {
          trackEvent(item.userId, 'ocr_writeback_attempted', {
            status: 'success', attempts: item.attempts + 1,
          }).catch(() => {});
        }
        continue;
      }
      item.attempts += 1;
      if (item.attempts < MAX_RETRIES) remaining.push(item);
      else if (item.userId) {
        trackEvent(item.userId, 'ocr_writeback_attempted', {
          status: 'failure', attempts: item.attempts,
        }).catch(() => {});
        logWarn('food.writeback.dropped', 'max retries', { barcode: item.contribution.barcode });
      }
    } catch (e) {
      item.attempts += 1;
      if (item.attempts < MAX_RETRIES) remaining.push(item);
      else logWarn('food.writeback.error', e?.message, { barcode: item.contribution.barcode });
    }
  }
  await _writeQueue(remaining);
  if (remaining.length > 0) {
    const next = remaining.reduce((m, r) => Math.max(m, r.attempts), 0);
    _scheduleFlush(RETRY_BACKOFF_MS[Math.min(next, RETRY_BACKOFF_MS.length - 1)]);
  }
}
