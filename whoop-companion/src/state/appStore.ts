/**
 * Application store + sync orchestrator. Owns the WhoopBle connection, persists
 * stored-history backfill and live HR/R-R into SQLite, recomputes daily metrics
 * (recovery, sleep, strain, HRV) from that local stream, and drives the WHOOP 5
 * history drain.
 *
 * The primary sleep path is reconnect sync: the strap records to flash, then
 * type-47 history is decoded into local HR/R-R rows when the app reconnects.
 * Live HR is useful while connected, but sleep does not depend on staying live
 * all night.
 */

import { AppState as RNAppState, AppStateStatus, Share } from 'react-native';

import { Store } from './store';
import { WhoopBle, WhoopStatus, RawFrame } from '../ble/whoopBle';
import { bytesToHex, hexToBytes } from '../ble/bytes';
import { FrameAssembler, MaverickFrame, PacketType } from '../whoop/maverick';
import {
  cmdAbortHistoricalTransmits,
  cmdGetDataRange,
  cmdHistoricalDataResult,
  cmdNotificationBuzz,
  cmdSendHistoricalData,
  cmdDisableAlarm,
  cmdRunAlarm,
  cmdSetAlarmTime,
  cmdStopHaptics,
  Command,
  parseHistoryMetadata,
  HistoryMetadata,
} from '../whoop/commands';
import { decodeWhoop5HistoryFrames, HistoricalDecodeResult } from '../whoop/historicalParse';
import {
  historyCursorAdvanced,
  historyEndShouldQueue,
  historyReplayDelayMs,
  historyRetryDelayMs,
  historySyncIsDurablyComplete,
} from '../whoop/historySyncPolicy';
import {
  CardioRow,
  DailyMetricRow,
  HrSampleRow,
  RawVitalSampleRow,
  SleepDetail,
  getRawVitalSamplesBetween,
  getHrSamplesBetween,
  getDailyMetric,
  getRecentDailyMetrics,
  getMotionSamplesBetween,
  getSleepStateSamplesBetween,
  insertCardio,
  insertHrSample,
  insertJournal,
  insertRawFrameBatch,
  persistHistoryBatch,
  countHistoryRecords,
  getStoredHistoryPage,
  getStoredK21HistoryPage,
  getStepSamplesBetween,
  getStepSampleBefore,
  kvGet,
  kvSet,
  listCardio,
  listCardioBetween,
  listCardioStartingBetween,
  listNapsBetween,
  listJournal,
  listJournalSince,
  deleteCardio,
  clearUntrustedLegacyData,
  pruneHrSamples,
  upsertDailyMetric,
} from '../db/database';
import { startBgLocation, stopBgLocation } from '../sensors/bgLocation';
import { localAlarmMinuteOfDay, nextLocalAlarmTimestamp } from '../util/alarmSchedule';
import { isKeepAliveRunning, setKeepAliveHeartbeat, startKeepAlive, stopKeepAlive } from '../sensors/keepAlive';
import { DEFAULT_PROFILE, loadProfile, saveProfile } from '../db/profile';
import { computeHrv, computeHrvSegments } from '../metrics/hrv';
import { robustBaseline, robustStdev } from '../metrics/ema';
import type { BaselineCalibration } from '../metrics/ema';
import { computeRecovery } from '../metrics/recovery';
import type { RecoveryContributor } from '../metrics/recovery';
import { autoSleepBoundariesCovered, computeSleep, computeSleepNeed, durationOnlySleep, SleepMinute, SleepNeed, SleepResult } from '../metrics/sleep';
import {
  buildSleepEpochMask,
  computeOvernightVitals,
  contiguousRrSegments,
  hasValidatedSleepProvenance,
  maskHrSamplesToStableEpochs,
  recoverySleepEvidence,
} from '../metrics/overnightVitals';
import type { IndependentSleepQuality } from '../metrics/overnightVitals';
import { computeSleepScore, SleepScore } from '../metrics/sleepScore';
import { sleepRegularity, SleepRegularity } from '../metrics/sleepRegularity';
import { FALLBACK_SLEEP_SCHEDULE, inferSleepSchedule, SleepSchedule } from '../metrics/sleepSchedule';
import { isDirectSleepHeartRateSample, isPlausibleHeartRate } from '../metrics/dataQuality';
import { sleepConsistency, SleepConsistency } from '../metrics/sleepConsistency';
import { sleepDebt } from '../metrics/sleepDebt';
import { computeSleepStress, SleepStress, StressEpoch } from '../metrics/sleepStress';
import { computeSleepPerformance, SleepPerformance } from '../metrics/sleepPerformance';
import { autoSleepAtSafetyCeiling, longAutoSleepNeedsCorroboration, sleepEvidencePct, sleepHasCorroboration, sleepStateWakeConflict } from '../metrics/sleepEvidence';
import { edwardsTrimp, hrZones, strainFromLoad, totalTrimp, UserProfile } from '../metrics/strain';
import { kcalPerMinute, totalKcal } from '../metrics/calories';
import { computeStress } from '../metrics/stress';
import { computeHealthMonitor, HealthMonitorResult } from '../metrics/healthMonitor';
import { encodeNapDetail, napCreditMin, napCreditMinWithin, napDetailFromSleep, parseNapDetail, StoredNapDetail } from '../metrics/naps';
import { decodeHeartbeatSteps } from '../whoop/strapEvents';
import { hrvBalance, HrvBalance } from '../metrics/hrvBalance';
import { illnessRisk, IllnessResult } from '../metrics/illness';
import { resilience, Resilience } from '../metrics/resilience';
import { cardioAge } from '../metrics/cardioAge';
import { rhythmScreen, RhythmResult } from '../metrics/afib';
import { detectActivities, DetectedActivity } from '../metrics/autoDetect';
import { trainingLoad } from '../metrics/training';
import { computeTrainingReadiness, Readiness } from '../metrics/readiness';
import { computeEnergyReserve, EnergyReserve } from '../metrics/energyReserve';
import { SLEEP_TRUST_LOW_COVERAGE_PCT, SLEEP_TRUST_LOW_SIGNAL_MIN, sleepTrustTier } from '../metrics/sleepTrustWeight';
import {
  BandStepEstimate,
  bandStepEstimateIsTrusted,
  estimateBandStepsFromCounters,
  normaliseStepDivisor,
  LEGACY_WHOOP5_STEP_TICKS_PER_STEP,
  WHOOP5_STEP_TICKS_PER_STEP,
} from '../metrics/bandSteps';
import { activityGps, activityUsesSteps } from '../data/activities';
import { StructuredWorkout } from '../data/structuredWorkouts';
import { addDays, dayKey, epochDay, startOfDayMs } from '../util/time';
import { clampPct } from '../util/number';

export type SessionKind = 'workout' | 'sleep' | 'nap';
export type SessionPause = { startTs: number; endTs: number | null };
export type LiveSession = {
  kind: SessionKind;
  label: string;
  startTs: number;
  laps: number[];
  maxHr: number | null;
  hasGps: boolean; // mirrors WHOOP's SportDto.has_gps — phone GPS for this sport
  distanceM: number | null; // live GPS distance (metres)
  speedMps: number | null; // latest GPS speed (m/s)
  route: Array<{ lat: number; lng: number }>; // live route trace
  plan: StructuredWorkout | null; // optional structured/interval workout to follow
  pausedAtTs: number | null;
  pausedMs: number;
  pauseIntervals: SessionPause[];
};
export type SessionStats = {
  elapsedSec: number;
  avgHr: number | null;
  maxHr: number | null;
  strain: number | null;
  steps: number | null;
  cadenceSpm: number | null;
  stepSource: 'band' | null;
  zones: ReturnType<typeof hrZones>;
  beats: number;
};

function sessionUsesSteps(session: Pick<LiveSession, 'kind' | 'label' | 'plan'>): boolean {
  return session.kind === 'workout' && activityUsesSteps(session.plan?.activity ?? session.label);
}

const ACTIVE_SESSION_KEY = 'activeLiveSessionV1';
const ACTIVE_SESSION_VERSION = 1;
const ACTIVE_SESSION_MAX_AGE_MS = 48 * 60 * 60 * 1000;
const MAX_SESSION_ROUTE_POINTS = 10_000;
const MAX_SESSION_PAUSES = 100;

/** Active time is wall time minus completed and currently-open pause time. */
export function activeSessionDurationMs(
  session: Pick<LiveSession, 'startTs' | 'pausedAtTs' | 'pausedMs'>,
  now = Date.now(),
): number {
  if (!Number.isFinite(session.startTs) || !Number.isFinite(now)) return 0;
  const wallMs = Math.max(0, now - session.startTs);
  const openPauseMs = session.pausedAtTs == null ? 0 : Math.max(0, now - session.pausedAtTs);
  return Math.max(0, wallMs - Math.max(0, session.pausedMs) - openPauseMs);
}

function sessionPausedAt(session: Pick<LiveSession, 'pauseIntervals'>, ts: number, now: number): boolean {
  return session.pauseIntervals.some((pause) =>
    ts >= pause.startTs && ts < (pause.endTs == null ? now : pause.endTs),
  );
}

function validPlan(value: unknown): value is StructuredWorkout {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Partial<StructuredWorkout>;
  return (
    typeof plan.id === 'string' &&
    plan.id.length > 0 &&
    typeof plan.name === 'string' &&
    plan.name.length > 0 &&
    plan.name.length <= 200 &&
    typeof plan.activity === 'string' &&
    plan.activity.length > 0 &&
    plan.activity.length <= 100 &&
    Array.isArray(plan.steps) &&
    plan.steps.length > 0 &&
    plan.steps.length <= 100 &&
    plan.steps.every((step) => {
      if (!step || typeof step !== 'object') return false;
      const candidate = step as { kind?: unknown; durationSec?: unknown; targetZone?: unknown };
      return (
        candidate.kind === 'warmup' || candidate.kind === 'work' || candidate.kind === 'rest' || candidate.kind === 'cooldown'
      ) && (
        typeof candidate.durationSec === 'number' &&
        Number.isFinite(candidate.durationSec) &&
        candidate.durationSec > 0 &&
        candidate.durationSec <= 24 * 60 * 60 &&
        (candidate.targetZone == null ||
          (typeof candidate.targetZone === 'number' && Number.isFinite(candidate.targetZone) && candidate.targetZone >= 1 && candidate.targetZone <= 5))
      );
    })
  );
}

/** Parse only snapshots produced by this tranche; malformed/stale data is discarded. */
export function restorePersistedSession(raw: string | null, now = Date.now()): LiveSession | null {
  if (!raw) return null;
  try {
    const envelope = JSON.parse(raw) as { version?: unknown; savedAt?: unknown; session?: unknown };
    if (
      envelope.version !== ACTIVE_SESSION_VERSION ||
      typeof envelope.savedAt !== 'number' ||
      !Number.isFinite(envelope.savedAt) ||
      envelope.savedAt > now + 5 * 60 * 1000 ||
      now - envelope.savedAt > ACTIVE_SESSION_MAX_AGE_MS ||
      !envelope.session ||
      typeof envelope.session !== 'object'
    ) return null;
    const value = envelope.session as Partial<LiveSession>;
    const startTs = value.startTs;
    if (
      (value.kind !== 'workout' && value.kind !== 'sleep' && value.kind !== 'nap') ||
      typeof value.label !== 'string' ||
      value.label.length === 0 ||
      value.label.length > 200 ||
      typeof startTs !== 'number' ||
      !Number.isSafeInteger(startTs) ||
      startTs <= 0 ||
      startTs > now + 5 * 60 * 1000 ||
      startTs > envelope.savedAt + 5 * 60 * 1000 ||
      now - startTs > ACTIVE_SESSION_MAX_AGE_MS
    ) return null;
    if (
      !Array.isArray(value.laps) ||
      value.laps.length > 1000 ||
      !value.laps.every((lap) => typeof lap === 'number' && Number.isSafeInteger(lap) && lap >= startTs && lap <= now + 5 * 60 * 1000) ||
      typeof value.hasGps !== 'boolean' ||
      (!value.hasGps && ((value.distanceM ?? 0) !== 0 || value.speedMps != null || value.route?.length !== 0)) ||
      (value.distanceM != null && (typeof value.distanceM !== 'number' || !Number.isFinite(value.distanceM) || value.distanceM < 0)) ||
      (value.speedMps != null && (typeof value.speedMps !== 'number' || !Number.isFinite(value.speedMps) || value.speedMps < 0)) ||
      !Array.isArray(value.route) ||
      value.route.length > MAX_SESSION_ROUTE_POINTS ||
      !value.route.every((point) =>
        point && typeof point.lat === 'number' && Number.isFinite(point.lat) && point.lat >= -90 && point.lat <= 90 &&
        typeof point.lng === 'number' && Number.isFinite(point.lng) && point.lng >= -180 && point.lng <= 180,
      ) ||
      (value.plan != null && !validPlan(value.plan))
    ) return null;
    const pausedAtTs = value.pausedAtTs == null ? null : value.pausedAtTs;
    const pausedMs = value.pausedMs ?? 0;
    const pauseIntervals = value.pauseIntervals ?? [];
    const openPause = pauseIntervals[pauseIntervals.length - 1];
    let completedPauseMs = 0;
    if (
      (pausedAtTs != null && (typeof pausedAtTs !== 'number' || !Number.isSafeInteger(pausedAtTs) || pausedAtTs < startTs || pausedAtTs > now + 5 * 60 * 1000)) ||
      typeof pausedMs !== 'number' || !Number.isFinite(pausedMs) || pausedMs < 0 || pausedMs > ACTIVE_SESSION_MAX_AGE_MS ||
      !Array.isArray(pauseIntervals) || pauseIntervals.length > MAX_SESSION_PAUSES ||
      !pauseIntervals.every((pause) =>
        pause && typeof pause.startTs === 'number' && Number.isSafeInteger(pause.startTs) && pause.startTs >= startTs && pause.startTs <= now + 5 * 60 * 1000 &&
        (pause.endTs == null || (typeof pause.endTs === 'number' && Number.isSafeInteger(pause.endTs) && pause.endTs >= pause.startTs && pause.endTs <= now + 5 * 60 * 1000)),
      ) ||
      pauseIntervals.some((pause, index) => {
        const previous = pauseIntervals[index - 1];
        if (pause.endTs == null && (index !== pauseIntervals.length - 1 || pausedAtTs !== pause.startTs)) return true;
        if (pause.endTs != null) completedPauseMs += pause.endTs - pause.startTs;
        return previous != null && (previous.endTs == null || pause.startTs < previous.endTs);
      }) ||
      (openPause?.endTs == null) !== (pausedAtTs != null) ||
      (pausedAtTs != null && openPause?.startTs !== pausedAtTs) ||
      completedPauseMs !== pausedMs ||
      pausedMs > Math.max(0, envelope.savedAt - startTs) ||
      value.kind !== 'workout' && (pausedAtTs != null || pausedMs !== 0 || pauseIntervals.length !== 0)
    ) return null;
    const maxHr = value.maxHr == null ? null : value.maxHr;
    if (maxHr != null && (typeof maxHr !== 'number' || !Number.isFinite(maxHr) || maxHr < 30 || maxHr > 220)) return null;
    return {
      kind: value.kind,
      label: value.label,
      startTs,
      laps: value.laps,
      maxHr,
      hasGps: value.hasGps,
      distanceM: value.distanceM ?? null,
      speedMps: value.speedMps ?? null,
      route: value.route,
      plan: value.plan ?? null,
      pausedAtTs,
      pausedMs,
      pauseIntervals,
    };
  } catch {
    return null;
  }
}

function activeSessionRanges(session: Pick<LiveSession, 'startTs' | 'pauseIntervals'>, endTs: number): Array<{ startTs: number; endTs: number }> {
  if (!Number.isFinite(session.startTs) || !Number.isFinite(endTs) || endTs <= session.startTs) return [];
  const ranges: Array<{ startTs: number; endTs: number }> = [];
  let cursor = session.startTs;
  for (const pause of session.pauseIntervals.slice().sort((a, b) => a.startTs - b.startTs)) {
    const pauseStart = Math.max(session.startTs, Math.min(endTs, pause.startTs));
    if (pauseStart > cursor) ranges.push({ startTs: cursor, endTs: pauseStart });
    const pauseEnd = pause.endTs == null ? endTs : Math.max(pauseStart, Math.min(endTs, pause.endTs));
    cursor = Math.max(cursor, pauseEnd);
    if (cursor >= endTs) break;
  }
  if (cursor < endTs) ranges.push({ startTs: cursor, endTs });
  return ranges;
}

export type HistorySyncReport = {
  status: string;
  rawRecords: number;
  decodedRecords: number;
  hrSamples: number;
  rrSamples: number;
  stepSamples: number;
  motionSamples: number;
  rawSensorRecords: number;
  rawVitalSamples: number;
  rejectedRecords: number;
  droppedImplausibleTs: number;
  versions: number[];
  firstSampleTs?: number;
  lastSampleTs?: number;
  finishedTs?: number;
  reason?: 'complete' | 'timeout' | 'disconnect';
  mode?: 'manual' | 'auto';
  durableChunks?: number;
  acknowledgedChunks?: number;
  cursorAdvanced?: boolean;
};

export type StrapAlarmState = {
  enabled: boolean;
  wakeTs: number | null;
  localMinuteOfDay: number | null;
  updatedAt: number | null;
  pendingWrite: 'set' | 'disable' | null;
};

// Phone-GPS gating per activity comes from the unified activity catalogue
// (mirrors WHOOP's per-sport SportDto.has_gps).
export { activityGps as activityUsesGps } from '../data/activities';

export type AppState = {
  ready: boolean;
  status: WhoopStatus;
  statusDetail: string;
  device: { id: string; name: string } | null;
  battery: number | null;
  liveHr: number | null;
  liveRr: number[];
  liveRmssd: number | null;
  liveStress: number | null; // 0..3 (Baevsky), from the rolling R-R window
  storedStress: number | null; // latest stored 5-minute R-R stress point for today
  frameCount: number;
  capturing: boolean;
  draining: boolean;
  backgroundKeepAlive: boolean; // Android foreground-service guard for background sync
  backgroundKeepAliveRunning: boolean;
  today: DailyMetricRow | null;
  recentDays: DailyMetricRow[];
  lastSleep: SleepResult | null;
  sleepNeed: SleepNeed | null;
  sleepScore: SleepScore | null;
  sleepReg: SleepRegularity | null;
  sleepConsistency: SleepConsistency | null;
  sleepSchedule: SleepSchedule;
  sleepStress: SleepStress | null; // last night's 0-3 stress breakdown
  sleepPerformance: SleepPerformance | null; // composite ring + 4 contributors
  sleepCapture: {
    windowMin: number;
    asleepMin: number;
    signalMin: number;
    hrvMin: number;
    motionMin: number;
    stillMin: number;
    movingMin: number;
    sleepStateMin: number;
    sleepStateWakeMin: number;
    sleepStateStillMin: number;
    sleepStateAsleepMin: number;
    sleepStateUpMin: number;
    coveragePct: number;
    rrCount: number;
    confidence: SleepConfidence;
    source: SleepResult['source'] | null;
    note: string;
  } | null;
  trainingReadiness: Readiness | null; // Garmin-style readiness, built on Recovery
  energyReserve: EnergyReserve | null; // all-day usable energy estimate
  sleepGoal: number; // target fraction of sleep need: 0.7 / 0.85 / 1.0
  // Oura-style derived insights (all HR/R-R only):
  recoveryParts: {
    hrvSub: number;
    rhrSub: number;
    respSub: number | null;
    tempSub: number | null;
    sleepSub: number;
    contributors: RecoveryContributor[];
    calibration: BaselineCalibration | null;
  } | null;
  recoveryBaseline: {
    hrvAccepted: number;
    rhrAccepted: number;
    acceptedNights: number;
    requiredNights: number;
  } | null;
  hrvBal: HrvBalance | null;
  illness: IllnessResult | null;
  resilience: Resilience | null;
  cardioAge: number | null;
  cardio: CardioRow[];
  session: LiveSession | null;
  steps: number | null; // trusted WHOOP device-counter total for today
  stepSource: 'band' | null;
  bandSteps: number | null; // decoded WHOOP history-counter estimate (may still be diagnostic)
  bandStepEstimate: BandStepEstimate | null;
  bandStepDivisor: number;
  hbStepRaw: number | null; // candidate heartbeat step byte (diagnostic, unconfirmed)
  bufferedRecords: number; // raw history records drained from the strap buffer
  historySync: HistorySyncReport | null;
  lastHistorySync: HistorySyncReport | null;
  lastSyncTs: number | null; // last time the strap buffer was drained
  strapAlarm: StrapAlarmState;
  profile: UserProfile;
  error: string | null;
};

const initialState: AppState = {
  ready: false,
  status: 'idle',
  statusDetail: '',
  device: null,
  battery: null,
  liveHr: null,
  liveRr: [],
  liveRmssd: null,
  liveStress: null,
  storedStress: null,
  frameCount: 0,
  capturing: false,
  draining: false,
  backgroundKeepAlive: true,
  backgroundKeepAliveRunning: false,
  today: null,
  recentDays: [],
  lastSleep: null,
  sleepNeed: null,
  sleepScore: null,
  sleepReg: null,
  sleepConsistency: null,
  sleepSchedule: FALLBACK_SLEEP_SCHEDULE,
  sleepStress: null,
  sleepPerformance: null,
  sleepCapture: null,
  trainingReadiness: null,
  energyReserve: null,
  sleepGoal: 0.85,
  recoveryParts: null,
  recoveryBaseline: null,
  hrvBal: null,
  illness: null,
  resilience: null,
  cardioAge: null,
  cardio: [],
  session: null,
  steps: null,
  stepSource: null,
  bandSteps: null,
  bandStepEstimate: null,
  bandStepDivisor: WHOOP5_STEP_TICKS_PER_STEP,
  hbStepRaw: null,
  bufferedRecords: 0,
  historySync: null,
  lastHistorySync: null,
  lastSyncTs: null,
  strapAlarm: { enabled: false, wakeTs: null, localMinuteOfDay: null, updatedAt: null, pendingWrite: null },
  profile: DEFAULT_PROFILE,
  error: null,
};

const HR_RETENTION_DAYS = 21;
const DERIVED_METRICS_REVISION = 'sleep-vitals-2026-07-11-v2';
const DERIVED_METRICS_REVISION_KEY = 'derivedMetricsRevision';
const CARDIO_RECENT_LIMIT = 250;
const ROLLING_RR_WINDOW = 120; // keep last ~120 R-R intervals for live HRV
// How often to recompute + persist derived metrics from the stored stream while
// the app is alive, so every screen reflects ongoing data without being opened.
const RECOMPUTE_INTERVAL_MS = 60 * 1000;
const HISTORY_IDLE_TIMEOUT_MS = 3 * 60 * 1000;
const HISTORY_STALL_TIMEOUT_MS = 45 * 1000;
const HISTORY_STALL_NUDGE_LIMIT = 2;
const HISTORY_WATCHDOG_INTERVAL_MS = 30 * 1000;
const HISTORY_RECORD_FLUSH_COUNT = 500;
const RAW_CAPTURE_FLUSH_COUNT = 250;
const RAW_CAPTURE_FLUSH_MS = 1000;
const AUTO_HISTORY_SYNC_RETRY_MS = 15000;
const AUTO_HISTORY_SYNC_MIN_INTERVAL_MS = 5 * 60 * 1000;
const AUTO_HISTORY_MAX_CONTINUOUS_PASSES = 6;
const AUTO_SYNC_SUPERVISOR_INTERVAL_MS = 45 * 1000;
const KEEP_ALIVE_PERMISSION_RETRY_MS = 10 * 60 * 1000;
const CONNECT_IN_FLIGHT_STALE_MS = 20 * 1000;
const LAST_DEVICE_ID_KEY = 'lastWhoopDeviceId';
const STEP_DIVISOR_KEY = 'whoopStepTicksPerStep';
const STEP_DIVISOR_MIGRATION_KEY = 'whoopStepDivisorCaptureDefaultV2';
const STEP_TRUST_RECOMPUTE_KEY = 'whoopStepTrustRecomputeV1';
const K21_MOTION_BACKFILL_KEY = 'whoopK21MotionBackfillV1';
const HISTORY_BIOMETRIC_REDECODE_KEY = 'whoopHistoryBiometricMergeV4';
const SLEEP_EVIDENCE_RECOMPUTE_KEY = 'sleepEvidenceRecomputeV11';
const STRAP_ALARM_KEY = 'strapAlarm';
const HISTORY_REPLAY_COUNT_KEY = 'whoopHistoryReplayCountV1';
const HISTORY_NEXT_AUTO_SYNC_KEY = 'whoopHistoryNextAutoSyncV1';

function historyReplayCountKey(deviceId: string): string {
  return `${HISTORY_REPLAY_COUNT_KEY}:${deviceId}`;
}

function historyNextAutoSyncKey(deviceId: string): string {
  return `${HISTORY_NEXT_AUTO_SYNC_KEY}:${deviceId}`;
}

function bandStepsAreTrusted(estimate: BandStepEstimate | null | undefined, divisor: number): boolean {
  void divisor;
  return bandStepEstimateIsTrusted(estimate);
}

class AppStore extends Store<AppState> {
  private ble: WhoopBle | null = null;
  private rollingRr: number[] = [];
  private lastPersistTs = 0;
  private historyRecords: Uint8Array[] = [];
  private historyCommitQueue: Promise<void> = Promise.resolve();
  private historyDrainActive = false;
  private historySessionStats: HistoricalDecodeResult | null = null;
  private historyDrainMode: 'manual' | 'auto' = 'manual';
  private historyIdleTimer: ReturnType<typeof setTimeout> | null = null;
  private historyWatchdogTimer: ReturnType<typeof setInterval> | null = null;
  private historyLastActivityTs = 0;
  private historyStopQueued = false;
  private historyQueuedEndKeys = new Set<string>();
  private historyAckedEndKeys = new Set<string>();
  private historyAckedChunks = 0;
  private historyDurableEndChunks = 0;
  private historyCommitError: Error | null = null;
  private historyRunStartAckEndKey: string | null = null;
  private historyLastAckEndKey: string | null = null;
  private historyConnectionSessionId = -1;
  private historyTransferId = 0;
  private historyRetryFailures = 0;
  private historyReplayCount = 0;
  private nextAutoHistorySyncTs = 0;
  private historyStallRecoveries = 0;
  private historyNudgeInFlight = false;
  private historyPersisting = false;
  private historyPpgContext: Uint8Array[] = [];
  private rawCaptureBuffer: RawFrame[] = [];
  private rawCaptureFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private commandResponseWaiters = new Map<
    string,
    Array<{
      sequence: number;
      command: number;
      connectionSessionId: number;
      transferId: number;
      timer: ReturnType<typeof setTimeout>;
      resolve: (result: number) => void;
      reject: (error: Error) => void;
    }>
  >();
  private eventAssemblers = new Map<string, FrameAssembler>();
  private gpsActive = false;
  private gpsServiceRequested = false;
  private gpsGeneration = 0;
  private gpsTransition: Promise<void> = Promise.resolve();
  private recomputeTimer: ReturnType<typeof setInterval> | null = null;
  private connectedSyncTimer: ReturnType<typeof setInterval> | null = null;
  private autoSyncSupervisorTimer: ReturnType<typeof setInterval> | null = null;
  private appStateSub: { remove: () => void } | null = null;
  private autoDrainedFor = ''; // device id we've already auto-drained this connection
  private autoSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private autoSyncAttempts = 0;
  private commandChannelAttempts = 0;
  private lastStatus: WhoopStatus = 'idle';
  private preferredDeviceId: string | null = null;
  private connectInFlight = false;
  private connectStartedAt = 0;
  private autoConnectEnabled = true;
  private connectionIntentId = 0;
  private keepAliveRetryAfterTs = 0;
  private pendingHistoryDrainMode: 'manual' | 'auto' | null = null;
  private pendingHistoryDrainTimer: ReturnType<typeof setTimeout> | null = null;
  private initInFlight: Promise<void> | null = null;
  private sessionPersistenceQueue: Promise<void> = Promise.resolve();
  private derivedMetricsQueue: Promise<void> = Promise.resolve();
  private sessionPersistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super(initialState);
  }

  private persistSessionSnapshot(session: LiveSession | null = this.getState().session): Promise<void> {
    if (session === null && this.sessionPersistTimer) {
      clearTimeout(this.sessionPersistTimer);
      this.sessionPersistTimer = null;
    }
    const value = session
      ? JSON.stringify({ version: ACTIVE_SESSION_VERSION, savedAt: Date.now(), session })
      : '';
    const next = this.sessionPersistenceQueue.then(
      () => kvSet(ACTIVE_SESSION_KEY, value),
      () => kvSet(ACTIVE_SESSION_KEY, value),
    );
    this.sessionPersistenceQueue = next.then(() => undefined, () => undefined);
    return next;
  }

  private enqueueDerivedMetrics<T>(operation: () => Promise<T>): Promise<T> {
    const queued = this.derivedMetricsQueue.then(operation, operation);
    this.derivedMetricsQueue = queued.then(() => undefined, () => undefined);
    return queued;
  }

  private scheduleSessionPersistence(): void {
    if (this.sessionPersistTimer) clearTimeout(this.sessionPersistTimer);
    this.sessionPersistTimer = setTimeout(() => {
      this.sessionPersistTimer = null;
      void this.persistSessionSnapshot().catch(() => {});
    }, 500);
  }

  init(): Promise<void> {
    if (this.getState().ready) return Promise.resolve();
    if (!this.initInFlight) {
      this.initInFlight = this.initialise().finally(() => {
        this.initInFlight = null;
      });
    }
    return this.initInFlight;
  }

  private async initialise(): Promise<void> {
    const profile = await loadProfile();
    const goalRaw = await kvGet('sleepGoal');
    const sleepGoal = goalRaw ? Number(goalRaw) : 0.85;
    const keepAliveRaw = await kvGet('backgroundKeepAlive');
    const keepAlive = keepAliveRaw !== '0';
    const lastSyncRaw = await kvGet('lastSyncTs');
    const lastSyncTs = lastSyncRaw ? Number(lastSyncRaw) : null;
    const lastHistorySync = parseHistorySyncReport(await kvGet('lastHistorySync'));
    const activeSessionRaw = await kvGet(ACTIVE_SESSION_KEY);
    const restoredSession = restorePersistedSession(activeSessionRaw);
    if (activeSessionRaw && !restoredSession) await kvSet(ACTIVE_SESSION_KEY, '');
    this.preferredDeviceId = await kvGet(LAST_DEVICE_ID_KEY);
    const replayCountRaw = this.preferredDeviceId ? await kvGet(historyReplayCountKey(this.preferredDeviceId)) : null;
    const nextAutoSyncRaw = this.preferredDeviceId ? await kvGet(historyNextAutoSyncKey(this.preferredDeviceId)) : null;
    const replayCount = replayCountRaw ? Number(replayCountRaw) : 0;
    const nextAutoSyncTs = nextAutoSyncRaw ? Number(nextAutoSyncRaw) : 0;
    this.historyReplayCount = Number.isFinite(replayCount) ? Math.max(0, Math.floor(replayCount)) : 0;
    this.nextAutoHistorySyncTs = Number.isFinite(nextAutoSyncTs) ? Math.max(0, nextAutoSyncTs) : 0;
    const stepDivisorRaw = await kvGet(STEP_DIVISOR_KEY);
    const stepDivisorMigrationRaw = await kvGet(STEP_DIVISOR_MIGRATION_KEY);
    let bandStepDivisor = normaliseStepDivisor(stepDivisorRaw ? Number(stepDivisorRaw) : WHOOP5_STEP_TICKS_PER_STEP);
    if (
      stepDivisorMigrationRaw !== '1' &&
      Math.abs(bandStepDivisor - LEGACY_WHOOP5_STEP_TICKS_PER_STEP) < 0.01
    ) {
      bandStepDivisor = WHOOP5_STEP_TICKS_PER_STEP;
      await kvSet(STEP_DIVISOR_KEY, String(bandStepDivisor));
    }
    if (stepDivisorMigrationRaw !== '1') await kvSet(STEP_DIVISOR_MIGRATION_KEY, '1');
    const strapAlarm = parseStrapAlarm(await kvGet(STRAP_ALARM_KEY));
    this.setState({
      profile,
      sleepGoal: Number.isFinite(sleepGoal) ? sleepGoal : 0.85,
      backgroundKeepAlive: keepAlive,
      lastSyncTs: Number.isFinite(lastSyncTs) ? lastSyncTs : null,
      lastHistorySync,
      bandStepDivisor,
      strapAlarm,
      session: restoredSession,
    });
    await clearUntrustedLegacyData();
    try {
      await this.rebuildRetainedDerivedMetricsIfNeeded();
    } catch (error) {
      // A failed optional rebuild must not prevent BLE startup. Leave the
      // revision unset so the next launch retries from local raw history.
      this.setState({ error: `Local sleep and recovery refresh will retry: ${String(error)}` });
    }
    await this.refreshBandSteps();
    await this.refreshDerived();
    await pruneHrSamples(addDays(Date.now(), -HR_RETENTION_DAYS));
    this.setState({ bufferedRecords: await countHistoryRecords() });

    // Create native resources only after every fallible startup read/migration
    // succeeds. A Retry therefore cannot leak a BLE manager or app listener.
    this.ble = new WhoopBle({
      onStatus: (status, detail) => this.onStatus(status, detail),
      onDevice: (device) => this.onDevice(device),
      onBattery: (battery) => this.setState({ battery }),
      onError: (error) => this.setState({ error }),
      onHeartRate: (s) => void this.onHeartRate(s.bpm, s.rrMs),
      onRawFrame: (f) => this.onRawFrame(f),
    });
    if (restoredSession?.hasGps && restoredSession.pausedAtTs == null) void this.startGps();

    // Keep every metric area current without needing its screen opened: recompute
    // + persist on a steady cadence while the app is alive, and again whenever the
    // app returns to the foreground (so re-opening shows complete, fresh graphs).
    this.startBackgroundRecompute();
    setKeepAliveHeartbeat(() => {
      void this.superviseAutoSync('background heartbeat').catch(() => {});
    });
    this.startAutoSyncSupervisor();
    this.appStateSub = RNAppState.addEventListener('change', (s) => this.onAppState(s));

    this.setState({ ready: true });
    setTimeout(() => this.connect(), 750);
    this.scheduleDeferredSleepMaintenance();
  }

  private scheduleDeferredSleepMaintenance(delayMs = 30 * 1000): void {
    setTimeout(() => {
      if (this.getState().draining || this.historyPersisting) {
        this.scheduleDeferredSleepMaintenance(30 * 1000);
        return;
      }
      void this.backfillStoredK21Motion()
        .then(() => this.redecodeStoredHistoryBiometrics())
        .then(() => this.recomputeRecentSleepEvidence())
        .then(() => this.recomputeRecentStepTrust())
        .then(() => this.refreshDerived())
        .catch(() => this.scheduleDeferredSleepMaintenance(60 * 1000));
    }, delayMs);
  }

  private onDevice(device: { id: string; name: string }): void {
    const previousDeviceId = this.getState().device?.id;
    if (previousDeviceId !== device.id) {
      this.historyTransferId += 1;
      this.historyReplayCount = 0;
      this.nextAutoHistorySyncTs = 0;
      this.clearCommandResponseWaiters(new Error('WHOOP device changed while awaiting a command response'));
      void this.loadHistoryReplayState(device.id);
    }
    this.preferredDeviceId = device.id;
    void kvSet(LAST_DEVICE_ID_KEY, device.id);
    this.setState({ device });
    const state = this.getState();
    if (state.status === 'connected' && this.autoDrainedFor !== device.id) {
      this.scheduleAutoHistoryDrain(device.id, 1000);
    }
  }

  private async loadHistoryReplayState(deviceId: string): Promise<void> {
    const [countRaw, nextRaw] = await Promise.all([
      kvGet(historyReplayCountKey(deviceId)),
      kvGet(historyNextAutoSyncKey(deviceId)),
    ]);
    if (this.getState().device?.id !== deviceId) return;
    const count = countRaw ? Number(countRaw) : 0;
    const next = nextRaw ? Number(nextRaw) : 0;
    this.historyReplayCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    this.nextAutoHistorySyncTs = Number.isFinite(next) ? Math.max(0, next) : 0;
  }

  /** Connection-status transitions. On a fresh connect, auto-drain the strap's
   *  on-device buffer so anything recorded while we were away is pulled in. */
  private onStatus(status: WhoopStatus, detail?: string): void {
    if (status === 'connected' && !this.autoConnectEnabled) {
      void this.ble?.stop().catch(() => {});
      return;
    }
    this.setState({ status, statusDetail: detail ?? '' });
    const device = this.getState().device;
    if (status === 'connected' && device && this.autoDrainedFor !== device.id) {
      this.scheduleAutoHistoryDrain(device.id, 3500);
    }
    if (
      (status === 'scanning' || status === 'discovering' || status === 'connected') &&
      this.getState().backgroundKeepAlive
    ) {
      // Bluetooth permission is available by these phases, so an earlier
      // pre-permission attempt must not delay the native connected-device FGS.
      this.keepAliveRetryAfterTs = 0;
      void this.ensureBackgroundSyncKeepAlive('Background auto-sync');
    }
    if (status === 'connected') {
      void this.flushPendingStrapAlarm('connection');
      this.startConnectedAutoSync();
      this.schedulePendingHistoryDrain();
    }
    if (status === 'disconnected' || status === 'idle') {
      this.clearCommandResponseWaiters(new Error('WHOOP disconnected while awaiting a command response'));
      this.autoDrainedFor = '';
      this.clearAutoSyncTimer();
      this.stopConnectedAutoSync();
      this.autoSyncAttempts = 0;
      if (this.getState().draining) {
        if (status === 'disconnected' && this.autoConnectEnabled) this.pendingHistoryDrainMode = this.historyDrainMode;
        this.enqueueHistoryStop('disconnect');
      }
    }
    this.lastStatus = status;
  }

  private scheduleAutoHistoryDrain(deviceId: string, delayMs = AUTO_HISTORY_SYNC_RETRY_MS): void {
    if (!this.autoConnectEnabled || this.autoSyncTimer || this.autoDrainedFor === deviceId) return;
    this.autoSyncTimer = setTimeout(() => {
      this.autoSyncTimer = null;
      void this.runAutoHistoryDrain(deviceId);
    }, delayMs);
  }

  private async runAutoHistoryDrain(deviceId: string): Promise<void> {
    const intentId = this.connectionIntentId;
    if (!this.autoConnectEnabled) return;
    const replayDelayMs = this.nextAutoHistorySyncTs - Date.now();
    if (replayDelayMs > 0) {
      this.scheduleAutoHistoryDrain(deviceId, replayDelayMs);
      return;
    }
    const state = this.getState();
    if (state.device?.id !== deviceId || state.status !== 'connected') return;
    if (state.draining) {
      this.scheduleAutoHistoryDrain(deviceId, AUTO_HISTORY_SYNC_RETRY_MS);
      return;
    }
    if (!this.ble?.canSendCommands) {
      const commandReady = (await this.ble?.refreshCommandChannel()) === true;
      if (!this.autoConnectEnabled || intentId !== this.connectionIntentId) return;
      if (commandReady) {
        await this.flushPendingStrapAlarm('auto sync');
        if (!this.autoConnectEnabled || intentId !== this.connectionIntentId) return;
        this.scheduleAutoHistoryDrain(deviceId, 250);
        return;
      }
      this.commandChannelAttempts += 1;
      this.setState((s) => ({
        historySync: s.historySync
          ? { ...s.historySync, status: `Auto sync waiting for command channel (${this.commandChannelAttempts})` }
          : {
              status: `Auto sync waiting for command channel (${this.commandChannelAttempts})`,
              rawRecords: 0,
              decodedRecords: 0,
              hrSamples: 0,
              rrSamples: 0,
              stepSamples: 0,
              motionSamples: 0,
              rawSensorRecords: 0,
              rawVitalSamples: 0,
              rejectedRecords: 0,
              droppedImplausibleTs: 0,
              versions: [],
            },
      }));
      const retryMs = Math.min(60 * 1000, AUTO_HISTORY_SYNC_RETRY_MS + this.commandChannelAttempts * 1000);
      this.scheduleAutoHistoryDrain(deviceId, retryMs);
      return;
    }
    this.commandChannelAttempts = 0;
    await this.flushPendingStrapAlarm('auto sync');
    if (!this.autoConnectEnabled || intentId !== this.connectionIntentId) return;
    this.autoDrainedFor = deviceId;
    this.autoSyncAttempts += 1;
    await this.runHistoryDrain('auto');
    if (!this.getState().draining && this.getState().status === 'connected' && this.getState().device?.id === deviceId) {
      this.autoDrainedFor = '';
      if (!this.autoSyncTimer) this.scheduleAutoHistoryDrain(deviceId, AUTO_HISTORY_SYNC_RETRY_MS);
    }
  }

  private retryAutoHistoryDrain(): void {
    if (!this.autoConnectEnabled) return;
    const deviceId = this.getState().device?.id;
    if (!deviceId) return;
    this.historyRetryFailures += 1;
    this.autoDrainedFor = '';
    this.scheduleAutoHistoryDrain(deviceId, historyRetryDelayMs(this.historyRetryFailures));
  }

  private schedulePendingHistoryDrain(delayMs = 750): void {
    if (!this.autoConnectEnabled || !this.pendingHistoryDrainMode || this.pendingHistoryDrainTimer) return;
    this.pendingHistoryDrainTimer = setTimeout(() => {
      this.pendingHistoryDrainTimer = null;
      const mode = this.pendingHistoryDrainMode;
      if (!mode || this.getState().status !== 'connected') return;
      if (this.historyDrainActive || this.getState().draining) {
        this.schedulePendingHistoryDrain(750);
        return;
      }
      this.pendingHistoryDrainMode = null;
      void this.runHistoryDrain(mode);
    }, delayMs);
  }

  private async reconnectForHistory(mode: 'manual' | 'auto', detail: string): Promise<void> {
    if (!this.autoConnectEnabled) {
      this.historyDrainActive = false;
      this.setState({ draining: false });
      return;
    }
    const intentId = this.connectionIntentId;
    this.historyDrainActive = false;
    this.clearHistoryTimeout();
    this.stopHistoryWatchdog();
    this.pendingHistoryDrainMode = mode;
    this.setState((state) => ({
      draining: false,
      status: 'disconnected',
      statusDetail: detail,
      error: null,
      historySync: state.historySync
        ? { ...state.historySync, status: 'History sync queued while the WHOOP link reconnects' }
        : state.historySync,
    }));
    if (this.ble?.isConnected) await this.ble.stop().catch(() => {});
    if (this.autoConnectEnabled && intentId === this.connectionIntentId) void this.connectAsync(intentId);
  }

  private clearAutoSyncTimer(): void {
    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }

  private startBackgroundRecompute(): void {
    if (this.recomputeTimer) return;
    this.recomputeTimer = setInterval(() => {
      void this.refreshDerived().catch(() => {});
    }, RECOMPUTE_INTERVAL_MS);
  }

  private startConnectedAutoSync(): void {
    if (this.connectedSyncTimer) return;
    this.connectedSyncTimer = setInterval(() => {
      const state = this.getState();
      if (
        state.status === 'connected' &&
        state.device &&
        !state.draining &&
        (!state.lastSyncTs || Date.now() - state.lastSyncTs > AUTO_HISTORY_SYNC_MIN_INTERVAL_MS)
      ) {
        this.autoDrainedFor = '';
        this.scheduleAutoHistoryDrain(state.device.id, 1000);
      }
    }, AUTO_HISTORY_SYNC_MIN_INTERVAL_MS);
  }

  private startAutoSyncSupervisor(): void {
    if (this.autoSyncSupervisorTimer) return;
    this.autoSyncSupervisorTimer = setInterval(() => {
      void this.superviseAutoSync('supervisor').catch(() => {});
    }, AUTO_SYNC_SUPERVISOR_INTERVAL_MS);
    void this.superviseAutoSync('startup').catch(() => {});
  }

  private async superviseAutoSync(source: string): Promise<void> {
    if (!this.autoConnectEnabled) return;
    const state = this.getState();
    if (state.backgroundKeepAlive) {
      const ok = await this.ensureBackgroundSyncKeepAlive(`WHOOP ${source} auto-sync`);
      if (!ok && state.status === 'connected') {
        this.setState((s) => ({
          historySync: s.historySync
            ? { ...s.historySync, status: 'Connected, but background keep-alive permission is not active' }
            : s.historySync,
        }));
      }
    }

    const fresh = this.getState();
    if (fresh.status === 'idle' || fresh.status === 'disconnected' || fresh.status === 'error') {
      void this.connectAsync();
      return;
    }
    if (fresh.status === 'connected' && fresh.device) {
      if (fresh.draining) {
        this.recoverStaleHistoryDrain(source);
        return;
      }
      if (!fresh.lastSyncTs || Date.now() - fresh.lastSyncTs > AUTO_HISTORY_SYNC_MIN_INTERVAL_MS) {
        this.autoDrainedFor = '';
        this.scheduleAutoHistoryDrain(fresh.device.id, 1000);
      }
    }
  }

  private stopConnectedAutoSync(): void {
    if (this.connectedSyncTimer) {
      clearInterval(this.connectedSyncTimer);
      this.connectedSyncTimer = null;
    }
  }

  private onAppState(s: AppStateStatus): void {
    if (s === 'active') {
      void this.refreshBandSteps().catch(() => {});
      void this.refreshDerived().catch(() => {});
      this.recoverStaleHistoryDrain('foreground wake');
      if (!this.autoConnectEnabled) return;
      const state = this.getState();
      if (state.status === 'idle' || state.status === 'disconnected' || state.status === 'error') {
        void this.connectAsync();
      }
      if (
        state.status === 'connected' &&
        state.device &&
        !state.draining &&
        (!state.lastSyncTs || Date.now() - state.lastSyncTs > AUTO_HISTORY_SYNC_MIN_INTERVAL_MS)
      ) {
        this.autoDrainedFor = '';
        this.scheduleAutoHistoryDrain(state.device.id, 1000);
      }
      return;
    }

    if (s === 'background' || s === 'inactive') {
      if (!this.autoConnectEnabled) return;
      const state = this.getState();
      if (state.backgroundKeepAlive) {
        void this.ensureBackgroundSyncKeepAlive('Background auto-sync');
      }
      if (state.status === 'idle' || state.status === 'disconnected' || state.status === 'error') {
        void this.connectAsync();
      }
      if (state.status === 'connected' && state.device && !state.draining) {
        this.autoDrainedFor = '';
        this.scheduleAutoHistoryDrain(state.device.id, 1000);
      }
    }
  }

  private async refreshBandSteps(): Promise<number | null> {
    const now = Date.now();
    const start = startOfDayMs(now);
    const estimate = estimateBandStepsFromCounters(
      await stepRowsForRange(start, now),
      this.getState().bandStepDivisor,
      { countFromTs: start, countToTs: now },
    );
    const bandEstimate = estimate?.steps ?? null;
    const trustedSteps = bandStepsAreTrusted(estimate, this.getState().bandStepDivisor) ? bandEstimate : null;
    this.setState({
      bandStepEstimate: estimate,
      bandSteps: bandEstimate,
      steps: trustedSteps,
      stepSource: trustedSteps != null ? 'band' : null,
    });
    return trustedSteps;
  }

  private async backfillStoredK21Motion(): Promise<void> {
    if ((await kvGet(K21_MOTION_BACKFILL_KEY)) === '1') return;
    let afterRowId = 0;
    for (;;) {
      const page = await getStoredK21HistoryPage(afterRowId);
      if (!page.length) break;
      const decoded = decodeWhoop5HistoryFrames(page.map((row) => hexToBytes(row.hex)));
      if (decoded.motion.length) {
        await persistHistoryBatch({
          rawTs: Date.now(),
          framesHex: [],
          hr: [],
          steps: [],
          sleepStates: [],
          motion: decoded.motion,
          rawVitals: [],
        });
      }
      afterRowId = page[page.length - 1]!.rowId;
    }
    await kvSet(K21_MOTION_BACKFILL_KEY, '1');
  }

  private async recomputeRecentSleepEvidence(): Promise<void> {
    if ((await kvGet(SLEEP_EVIDENCE_RECOMPUTE_KEY)) === '1') return;
    const today = dayKey(Date.now());
    // Rebuild chronologically so each day's debt and personal-baseline inputs
    // see the already-upgraded nights before it. Newest-first leaves recent
    // rows dependent on stale scores from the previous algorithm.
    const recent = (await getRecentDailyMetrics(30)).slice().reverse();
    for (const row of recent) {
      if (row.day === today) continue;
      await this.backfillDailyMetric(row.day);
    }
    await kvSet(SLEEP_EVIDENCE_RECOMPUTE_KEY, '1');
  }

  private async redecodeStoredHistoryBiometrics(): Promise<void> {
    if ((await kvGet(HISTORY_BIOMETRIC_REDECODE_KEY)) === '1') return;
    let afterRowId = 0;
    let ppgOverlap: Uint8Array[] = [];
    for (;;) {
      const page = await getStoredHistoryPage(afterRowId);
      if (!page.length) break;
      const frames = page.map((row) => hexToBytes(row.hex));
      const decoded = decodeWhoop5HistoryFrames(frames, undefined, { ppgContextFrames: ppgOverlap });
      if (decoded.hr.length || decoded.motion.length || decoded.rawVitals.length) {
        await persistHistoryBatch({
          rawTs: Date.now(),
          framesHex: [],
          hr: decoded.hr,
          steps: [],
          sleepStates: [],
          motion: decoded.motion,
          rawVitals: decoded.rawVitals,
        });
      }
      ppgOverlap = [...ppgOverlap, ...frames.filter((frame) => frame[9] === 26)].slice(-16);
      afterRowId = page[page.length - 1]!.rowId;
    }
    await kvSet(HISTORY_BIOMETRIC_REDECODE_KEY, '1');
  }

  private async recomputeRecentStepTrust(): Promise<void> {
    if ((await kvGet(STEP_TRUST_RECOMPUTE_KEY)) === '1') return;
    await this.reestimateRecentBandStepDays(14);
    await this.backfillCardioStepsFromHistory();
    await kvSet(STEP_TRUST_RECOMPUTE_KEY, '1');
  }

  private async sessionStepStats(
    session: LiveSession,
    now = Date.now(),
  ): Promise<Pick<SessionStats, 'steps' | 'cadenceSpm' | 'stepSource'>> {
    if (!sessionUsesSteps(session)) return { steps: null, cadenceSpm: null, stepSource: null };
    const ranges = activeSessionRanges(session, now);
    const estimates = await Promise.all(ranges.map(async (range) => {
      const rows = await stepRowsForRange(range.startTs, range.endTs);
      return estimateBandStepsFromCounters(rows, this.getState().bandStepDivisor, {
        countFromTs: range.startTs,
        countToTs: range.endTs,
      });
    }));
    const trusted = estimates.filter((estimate): estimate is BandStepEstimate => bandStepsAreTrusted(estimate, this.getState().bandStepDivisor));
    if (!trusted.length) {
      return { steps: null, cadenceSpm: null, stepSource: null };
    }
    const steps = trusted.reduce((sum, estimate) => sum + estimate.steps, 0);
    const minutes = Math.max(1 / 60, activeSessionDurationMs(session, now) / 60000);
    return {
      steps,
      cadenceSpm: Math.round(steps / minutes),
      stepSource: 'band',
    };
  }

  private async sessionHrRows(session: LiveSession, endTs: number): Promise<HrSampleRow[]> {
    const ranges = activeSessionRanges(session, endTs);
    const rows = (await Promise.all(ranges.map((range) => getHrSamplesBetween(range.startTs, range.endTs).catch(() => [])))).flat();
    const byTs = new Map<number, HrSampleRow>();
    rows.forEach((row) => byTs.set(row.ts, row));
    return [...byTs.values()].sort((a, b) => a.ts - b.ts);
  }

  connect = (): void => {
    this.autoConnectEnabled = true;
    this.connectionIntentId += 1;
    void this.connectAsync(this.connectionIntentId);
  };

  private async connectAsync(intentId = this.connectionIntentId): Promise<void> {
    if (!this.autoConnectEnabled || intentId !== this.connectionIntentId) return;
    const status = this.getState().status;
    const staleConnect = this.connectInFlight && Date.now() - this.connectStartedAt > CONNECT_IN_FLIGHT_STALE_MS;
    if (staleConnect) this.connectInFlight = false;
    if (this.connectInFlight || status === 'scanning' || status === 'connecting' || status === 'discovering') {
      this.setState({ status: 'connecting', statusDetail: 'Connect already starting...' });
      return;
    }
    if (status === 'connected') {
      const deviceId = this.getState().device?.id;
      if (deviceId) {
        this.autoDrainedFor = '';
        this.scheduleAutoHistoryDrain(deviceId, 1000);
      }
      return;
    }
    this.setState({ status: 'connecting', statusDetail: 'Starting WHOOP scan...', error: null });
    this.connectInFlight = true;
    this.connectStartedAt = Date.now();
    try {
      await this.ensureBackgroundSyncKeepAlive('WHOOP auto-connect');
      if (!this.autoConnectEnabled || intentId !== this.connectionIntentId) return;
      await this.ble?.start(this.preferredDeviceId);
      if (!this.autoConnectEnabled || intentId !== this.connectionIntentId) {
        await this.ble?.stop().catch(() => {});
      }
    } catch (e) {
      if (this.autoConnectEnabled && intentId === this.connectionIntentId) {
        this.setState({ status: 'error', statusDetail: 'Connect failed', error: String(e) });
      }
    } finally {
      this.connectInFlight = false;
      this.connectStartedAt = 0;
      if (this.autoConnectEnabled && intentId !== this.connectionIntentId) {
        void this.connectAsync(this.connectionIntentId);
      }
    }
  };

  disconnect = (): void => {
    this.autoConnectEnabled = false;
    this.connectionIntentId += 1;
    this.historyTransferId += 1;
    this.historyDrainActive = false;
    this.historyStopQueued = true;
    this.historyRecords = [];
    this.clearHistoryTimeout();
    this.stopHistoryWatchdog();
    this.clearAutoSyncTimer();
    this.stopConnectedAutoSync();
    this.clearCommandResponseWaiters(new Error('WHOOP disconnected by user'));
    this.pendingHistoryDrainMode = null;
    if (this.pendingHistoryDrainTimer) {
      clearTimeout(this.pendingHistoryDrainTimer);
      this.pendingHistoryDrainTimer = null;
    }
    void this.ble?.stop();
    // User asked to disconnect → tear down the keep-alive service too (it only
    // exists to hold the connection open; auto-reconnect keeps it during drops).
    void stopKeepAlive();
    this.setState({
      status: 'idle',
      statusDetail: 'Disconnected by you',
      draining: false,
      liveHr: null,
      liveRr: [],
    });
  };

  forgetDeviceAndRescan = async (): Promise<void> => {
    this.clearAutoSyncTimer();
    this.autoDrainedFor = '';
    this.commandChannelAttempts = 0;
    this.preferredDeviceId = null;
    await kvSet(LAST_DEVICE_ID_KEY, '');
    this.ble?.forgetKnownDevice();
    await this.ble?.stop();
    this.setState({
      device: null,
      liveHr: null,
      liveRr: [],
      status: 'idle',
      statusDetail: 'Saved strap cleared',
      error: null,
    });
    setTimeout(() => this.connect(), 300);
  };

  private async requireCommandChannel(action: string): Promise<WhoopBle> {
    const ble = this.ble;
    if (!ble || !ble.isConnected) {
      throw new Error(`${action} needs the strap connected first.`);
    }
    const ready = ble.canSendCommands || (await ble.refreshCommandChannel());
    if (!ready) {
      throw new Error(`${action} needs the WHOOP command channel (fd4b0002), but it is not available on this connection.`);
    }
    return ble;
  }

  private async optionalCommandChannel(): Promise<WhoopBle | null> {
    const ble = this.ble;
    if (!ble || !ble.isConnected) return null;
    const ready = ble.canSendCommands || (await ble.refreshCommandChannel());
    return ready ? ble : null;
  }

  private async saveStrapAlarm(alarm: StrapAlarmState, statusDetail: string): Promise<void> {
    await kvSet(STRAP_ALARM_KEY, JSON.stringify(alarm));
    this.setState({ strapAlarm: alarm, error: null, statusDetail });
  }

  private async flushPendingStrapAlarm(context: string): Promise<void> {
    let alarm = this.getState().strapAlarm;
    const now = Date.now();
    const missedQueuedAlarm = alarm.pendingWrite === 'set' && alarm.wakeTs != null && alarm.wakeTs <= now;
    const firedAlarmPastGrace = alarm.pendingWrite == null && alarm.wakeTs != null && alarm.wakeTs <= now - 5 * 60 * 1000;
    const localClockShifted =
      alarm.wakeTs != null &&
      alarm.localMinuteOfDay != null &&
      localAlarmMinuteOfDay(alarm.wakeTs) !== alarm.localMinuteOfDay;
    if (
      alarm.enabled &&
      alarm.pendingWrite !== 'disable' &&
      (missedQueuedAlarm || firedAlarmPastGrace || localClockShifted)
    ) {
      const localMinuteOfDay = alarm.localMinuteOfDay ?? localAlarmMinuteOfDay(alarm.wakeTs as number);
      alarm = {
        ...alarm,
        wakeTs: nextLocalAlarmTimestamp(localMinuteOfDay, now),
        localMinuteOfDay,
        updatedAt: now,
        pendingWrite: 'set',
      };
      await this.saveStrapAlarm(alarm, `Daily wake alarm rolled forward during ${context}`);
    }
    if (!alarm.pendingWrite) return;
    const ble = await this.optionalCommandChannel();
    if (!ble) return;
    try {
      if (alarm.pendingWrite === 'set') {
        if (!alarm.wakeTs || alarm.wakeTs <= Date.now()) {
          await this.saveStrapAlarm(
            { enabled: false, wakeTs: null, localMinuteOfDay: null, updatedAt: Date.now(), pendingWrite: null },
            'Queued wake alarm expired before the strap connected',
          );
          return;
        }
        await withTimeout(ble.writeCommand(cmdSetAlarmTime(alarm.wakeTs)), 8000, 'Queued wake alarm');
        await this.saveStrapAlarm(
          { enabled: true, wakeTs: alarm.wakeTs, localMinuteOfDay: alarm.localMinuteOfDay, updatedAt: Date.now(), pendingWrite: null },
          `Queued WHOOP 5 wake-alarm arm command sent on ${context}`,
        );
        return;
      }
      await withTimeout(ble.writeCommand(cmdDisableAlarm()), 8000, 'Queued wake alarm disable');
      await withTimeout(ble.writeCommand(cmdStopHaptics()), 8000, 'Stop haptics').catch(() => {});
      await this.saveStrapAlarm(
        { enabled: false, wakeTs: null, localMinuteOfDay: null, updatedAt: Date.now(), pendingWrite: null },
        `Queued wake alarm disable sent on ${context}`,
      );
    } catch (e) {
      this.setState({ error: `Queued wake alarm write failed: ${String(e)}` });
    }
  }

  setStrapWakeAlarm = async (wakeTs: number): Promise<'sent' | 'queued'> => {
    if (!Number.isFinite(wakeTs) || wakeTs <= Date.now() + 30 * 1000) {
      throw new Error('Choose a wake time at least 30 seconds in the future.');
    }
    const alarm: StrapAlarmState = {
      enabled: true,
      wakeTs: Math.round(wakeTs),
      localMinuteOfDay: localAlarmMinuteOfDay(wakeTs),
      updatedAt: Date.now(),
      pendingWrite: null,
    };
    const ble = await this.optionalCommandChannel();
    if (!ble) {
      const queued = { ...alarm, pendingWrite: 'set' as const };
      await this.saveStrapAlarm(queued, 'Wake alarm queued for next strap connection');
      this.connect();
      return 'queued';
    }
    try {
      await withTimeout(ble.writeCommand(cmdSetAlarmTime(wakeTs)), 8000, 'Wake alarm');
      await this.saveStrapAlarm(alarm, 'WHOOP 5 wake-alarm arm command sent');
      return 'sent';
    } catch {
      const queued = { ...alarm, pendingWrite: 'set' as const };
      await this.saveStrapAlarm(queued, 'Wake alarm write failed; queued for next strap connection');
      this.connect();
      return 'queued';
    }
  };

  disableStrapAlarm = async (): Promise<'sent' | 'queued'> => {
    const alarm: StrapAlarmState = { enabled: false, wakeTs: null, localMinuteOfDay: null, updatedAt: Date.now(), pendingWrite: null };
    const ble = await this.optionalCommandChannel();
    if (!ble) {
      const queued = { ...alarm, pendingWrite: 'disable' as const };
      await this.saveStrapAlarm(queued, 'Wake alarm disable queued for next strap connection');
      this.connect();
      return 'queued';
    }
    try {
      await withTimeout(ble.writeCommand(cmdDisableAlarm()), 8000, 'Wake alarm disable');
      await withTimeout(ble.writeCommand(cmdStopHaptics()), 8000, 'Stop haptics').catch(() => {});
      await this.saveStrapAlarm(alarm, 'Wake alarm disabled on strap');
      return 'sent';
    } catch {
      const queued = { ...alarm, pendingWrite: 'disable' as const };
      await this.saveStrapAlarm(queued, 'Wake alarm disable failed; queued for next strap connection');
      this.connect();
      return 'queued';
    }
  };

  stopStrapHaptics = async (): Promise<void> => {
    const ble = await this.requireCommandChannel('Stop haptics');
    await withTimeout(ble.writeCommand(cmdStopHaptics()), 8000, 'Stop haptics');
    this.setState({ error: null, statusDetail: 'Stop haptics command sent' });
  };

  testStrapAlarm = async (): Promise<void> => {
    const ble = await this.requireCommandChannel('Test alarm');
    await withTimeout(ble.writeCommand(cmdNotificationBuzz()), 8000, 'Test haptic');
    await withTimeout(ble.writeCommand(cmdRunAlarm()), 8000, 'Test alarm');
    await delay(1200);
    await withTimeout(ble.writeCommand(cmdStopHaptics()), 8000, 'Stop haptics').catch(() => {});
    this.setState({ error: null, statusDetail: 'Test alarm buzz sent' });
  };

  /** Start the foreground-service guard used by Android background sync. */
  private async ensureBackgroundSyncKeepAlive(context: string): Promise<boolean> {
    if (!this.getState().backgroundKeepAlive) {
      this.setState({ backgroundKeepAliveRunning: false });
      return false;
    }
    if (!isKeepAliveRunning() && this.keepAliveRetryAfterTs > Date.now()) {
      this.setState({ backgroundKeepAliveRunning: false });
      return false;
    }
    const ok = await startKeepAlive();
    this.setState({ backgroundKeepAliveRunning: ok || isKeepAliveRunning() });
    this.keepAliveRetryAfterTs = ok ? 0 : Date.now() + KEEP_ALIVE_PERMISSION_RETRY_MS;
    if (!ok) {
      this.setState({
        error:
          `${context} needs Bluetooth and notification permission so Android can keep WHOOP sync running in the background. ` +
          'Grant those permissions and leave background sync enabled; otherwise keep the app open during sync.',
      });
    }
    return ok;
  }

  setBackgroundKeepAlive = async (on: boolean): Promise<void> => {
    this.setState({ backgroundKeepAlive: on });
    await kvSet('backgroundKeepAlive', on ? '1' : '0');
    if (on) {
      this.keepAliveRetryAfterTs = 0;
      await this.ensureBackgroundSyncKeepAlive('Background auto-sync');
      if (this.getState().status === 'connected') {
        const ok = await startKeepAlive();
        if (!ok) {
          this.setState({
            error:
              'Background sync needs Bluetooth and notification permission. Grant them in Settings, then toggle again.',
          });
        }
      }
    } else {
      await stopKeepAlive();
      this.setState({ backgroundKeepAliveRunning: false });
    }
  };

  setBandStepDivisor = async (value: number): Promise<number> => {
    const divisor = normaliseStepDivisor(value);
    await kvSet(STEP_DIVISOR_KEY, String(divisor));
    this.setState({ bandStepDivisor: divisor });
    await this.refreshBandSteps();
    await this.recomputeToday();
    await this.reestimateRecentBandStepDays();
    await this.backfillCardioStepsFromHistory();
    this.setState({ recentDays: await getRecentDailyMetrics(30), cardio: await listCardio(CARDIO_RECENT_LIMIT) });
    return divisor;
  };

  calibrateBandSteps = async (actualSteps: number): Promise<number> => {
    const actual = Math.max(1, Math.round(actualSteps));
    const estimate = this.getState().bandStepEstimate;
    if (estimate == null || !bandStepsAreTrusted(estimate, this.getState().bandStepDivisor)) {
      throw new Error('No trusted movement-confirmed WHOOP band step range is available. Sync a stable range without inactive drift or counter resets, then enter the real steps for that range.');
    }
    return this.setBandStepDivisor(estimate.rawTicks / actual);
  };

  private async onHeartRate(bpm: number, rr: number[]): Promise<void> {
    if (!isPlausibleHeartRate(bpm)) return;
    // Live UI values.
    this.rollingRr.push(...rr);
    if (this.rollingRr.length > ROLLING_RR_WINDOW) {
      this.rollingRr.splice(0, this.rollingRr.length - ROLLING_RR_WINDOW);
    }
    const hrv = computeHrv(this.rollingRr);
    const stress = computeStress(this.rollingRr);
    this.setState({
      liveHr: bpm,
      liveRr: rr,
      liveRmssd: hrv?.rmssd ?? null,
      liveStress: stress?.score ?? null,
    });

    // Track peak HR during a live session.
    const sess = this.getState().session;
    if (sess && sess.pausedAtTs == null && (sess.maxHr == null || bpm > sess.maxHr)) {
      this.setState({ session: { ...sess, maxHr: bpm } });
      this.scheduleSessionPersistence();
    }

    // Persist at most one row per second.
    const now = Date.now();
    if (now - this.lastPersistTs >= 1000 && !this.historyPersisting) {
      this.lastPersistTs = now;
      try {
        await insertHrSample({ ts: now, bpm, rr });
      } catch (e) {
        // Non-fatal: keep streaming even if a write fails.
      }
    }
  }

  private onRawFrame(f: RawFrame): void {
    this.setState((s) => ({ frameCount: s.frameCount + 1 }));

    // Persist raw frames only while capturing (keeps storage bounded).
    if (this.getState().capturing) this.enqueueCapturedFrame(f);

    // Always parse proprietary frames for command responses, band counters and status.
    if (f.source.startsWith('fd4b')) {
      let asm = this.eventAssemblers.get(f.source);
      if (!asm) {
        asm = new FrameAssembler();
        this.eventAssemblers.set(f.source, asm);
      }
      try {
        for (const frame of asm.push(hexToBytes(f.hex))) {
          if (
            frame.packetType === PacketType.COMMAND_RESPONSE ||
            frame.packetType === PacketType.PUFFIN_COMMAND_RESPONSE
          ) {
            this.handleCommandResponse(frame);
          }
          const hb = decodeHeartbeatSteps(frame);
          if (hb != null) this.setState({ hbStepRaw: hb });
          // Raw accelerometer counting stays disabled. The validated source is
          // the cumulative counter in synced WHOOP history, not noisy live IMU.
          if (this.getState().draining && isHistoryDrainFrame(frame.packetType)) {
            this.handleHistoryFrame(frame);
          }
        }
      } catch {
        // Malformed frame — ignore.
      }
    }
  }

  private enqueueCapturedFrame(frame: RawFrame): void {
    this.rawCaptureBuffer.push(frame);
    if (this.rawCaptureBuffer.length >= RAW_CAPTURE_FLUSH_COUNT) {
      this.flushCapturedFrames();
      return;
    }
    if (!this.rawCaptureFlushTimer) {
      this.rawCaptureFlushTimer = setTimeout(() => this.flushCapturedFrames(), RAW_CAPTURE_FLUSH_MS);
    }
  }

  private flushCapturedFrames(): void {
    if (this.rawCaptureFlushTimer) {
      clearTimeout(this.rawCaptureFlushTimer);
      this.rawCaptureFlushTimer = null;
    }
    if (!this.rawCaptureBuffer.length) return;
    const batch = this.rawCaptureBuffer;
    this.rawCaptureBuffer = [];
    void insertRawFrameBatch(batch).catch(() => {});
  }

  private handleHistoryFrame(frame: MaverickFrame): void {
    if (this.historyStopQueued) return;
    this.markHistoryActivity();

    if (frame.packetType === PacketType.HISTORICAL_DATA) {
      this.historyRecords.push(frame.raw);
      this.setState((s) => ({
        bufferedRecords: s.bufferedRecords + 1,
        historySync: s.historySync
          ? {
              ...s.historySync,
              rawRecords: s.historySync.rawRecords + 1,
              status: `Receiving history (${s.historySync.rawRecords + 1} records)`,
            }
          : s.historySync,
      }));
      if (this.historyRecords.length >= HISTORY_RECORD_FLUSH_COUNT) {
        const chunk = this.historyRecords;
        this.historyRecords = [];
        this.enqueueHistoryPersistChunk(chunk);
      }
      return;
    }

    const meta = parseHistoryMetadata(frame.inner);
    if (!meta) return;

    if (meta.kind === 'start') {
      if (this.historyRecords.length) {
        const unflushed = this.historyRecords;
        this.historyRecords = [];
        this.enqueueHistoryPersistChunk(unflushed);
      }
      this.setState((s) => ({
        historySync: s.historySync
          ? { ...s.historySync, status: 'History started' }
          : {
              status: 'History started',
              rawRecords: 0,
              decodedRecords: 0,
              hrSamples: 0,
              rrSamples: 0,
              stepSamples: 0,
              motionSamples: 0,
              rawSensorRecords: 0,
              rawVitalSamples: 0,
              rejectedRecords: 0,
              droppedImplausibleTs: 0,
              versions: [],
            },
      }));
    } else if (meta.kind === 'end') {
      const chunk = this.historyRecords;
      this.historyRecords = [];
      const endKey = bytesToHex(meta.endData);
      if (!historyEndShouldQueue(endKey, this.historyQueuedEndKeys, this.historyAckedEndKeys)) return;
      this.historyQueuedEndKeys.add(endKey);
      this.enqueueHistoryChunk(chunk, meta);
    } else if (meta.kind === 'complete') {
      this.enqueueHistoryStop('complete');
    }
  }

  private handleCommandResponse(frame: MaverickFrame): void {
    if (frame.inner.length < 5) return;
    const command = frame.inner[2] as number;
    const originSequence = frame.inner[3] as number;
    const result = frame.inner[4] as number;
    const key = commandResponseWaiterKey(originSequence, command);
    const waiters = this.commandResponseWaiters.get(key);
    const connectionSessionId = this.ble?.connectionSessionId ?? -1;
    const waiter = waiters?.find(
      (candidate) =>
        candidate.connectionSessionId === connectionSessionId && candidate.transferId === this.historyTransferId,
    );
    if (!waiter) return;
    if (result === 2) {
      this.setState((s) => ({
        historySync: s.historySync
          ? { ...s.historySync, status: 'WHOOP is preparing the stored data range' }
          : s.historySync,
      }));
      return;
    }
    clearTimeout(waiter.timer);
    this.removeCommandResponseWaiter(key, waiter);
    waiter.resolve(result);
  }

  private async writeCommandAwaitFinalResult(
    ble: WhoopBle,
    bytes: Uint8Array,
    command: number,
    responseTimeoutMs: number,
    label: string,
  ): Promise<number> {
    const sequence = bytes[9];
    if (sequence == null) throw new Error(`${label} command sequence is missing`);
    const key = commandResponseWaiterKey(sequence, command);
    const connectionSessionId = ble.connectionSessionId;
    const transferId = this.historyTransferId;
    let waiter: {
      sequence: number;
      command: number;
      connectionSessionId: number;
      transferId: number;
      timer: ReturnType<typeof setTimeout>;
      resolve: (result: number) => void;
      reject: (error: Error) => void;
    } | undefined;
    const response = new Promise<number>((resolve, reject) => {
      waiter = {
        sequence,
        command,
        connectionSessionId,
        transferId,
        timer: null as unknown as ReturnType<typeof setTimeout>,
        resolve,
        reject,
      };
      waiter.timer = setTimeout(() => {
        const registeredWaiter = waiter;
        if (!registeredWaiter) return;
        if (!this.removeCommandResponseWaiter(key, registeredWaiter)) return;
        reject(new Error(`${label} final response timed out`));
      }, responseTimeoutMs);
      const waiters = this.commandResponseWaiters.get(key) ?? [];
      waiters.push(waiter);
      this.commandResponseWaiters.set(key, waiters);
    });
    const registeredWaiter = waiter;
    if (!registeredWaiter) throw new Error(`${label} command response waiter was not registered`);
    try {
      await withTimeout(ble.writeCommand(bytes), 8000, label);
    } catch (error) {
      this.rejectCommandResponseWaiter(registeredWaiter, error);
      await response.catch(() => {});
      throw error;
    }
    return response;
  }

  private rejectCommandResponseWaiter(
    waiter: {
      sequence: number;
      command: number;
      connectionSessionId: number;
      transferId: number;
      timer: ReturnType<typeof setTimeout>;
      resolve: (result: number) => void;
      reject: (error: Error) => void;
    },
    error: unknown,
  ): void {
    const key = commandResponseWaiterKey(waiter.sequence, waiter.command);
    if (!this.removeCommandResponseWaiter(key, waiter)) return;
    clearTimeout(waiter.timer);
    waiter.reject(error instanceof Error ? error : new Error(String(error)));
  }

  private clearCommandResponseWaiters(error: Error): void {
    const waiters = [...this.commandResponseWaiters.values()].flat();
    for (const waiter of waiters) {
      this.rejectCommandResponseWaiter(waiter, error);
    }
  }

  private removeCommandResponseWaiter(
    key: string,
    waiter: {
      sequence: number;
      command: number;
      connectionSessionId: number;
      transferId: number;
      timer: ReturnType<typeof setTimeout>;
      resolve: (result: number) => void;
      reject: (error: Error) => void;
    },
  ): boolean {
    const waiters = this.commandResponseWaiters.get(key);
    if (!waiters) return false;
    const index = waiters.indexOf(waiter);
    if (index < 0) return false;
    waiters.splice(index, 1);
    if (waiters.length) this.commandResponseWaiters.set(key, waiters);
    else this.commandResponseWaiters.delete(key);
    return true;
  }

  private enqueueHistoryPersistChunk(frames: Uint8Array[]): void {
    if (!frames.length || this.historyStopQueued) return;
    const transferId = this.historyTransferId;
    this.enqueueHistoryCommit(transferId, async () => {
      await this.persistHistoryFrames(frames, transferId);
    });
  }

  private enqueueHistoryChunk(frames: Uint8Array[], meta: Extract<HistoryMetadata, { kind: 'end' }>): void {
    if (this.historyStopQueued) return;
    const transferId = this.historyTransferId;
    const endKey = bytesToHex(meta.endData);
    const connectionSessionId = this.ble?.connectionSessionId ?? -1;
    this.enqueueHistoryCommit(transferId, async () => {
      try {
        await this.persistHistoryFrames(frames, transferId);
        if (transferId !== this.historyTransferId) return;
        this.historyDurableEndChunks += 1;
        const ble = this.ble;
        if (!ble || !ble.isConnected || ble.connectionSessionId !== connectionSessionId) {
          throw new Error('WHOOP connection changed before the durable history acknowledgement');
        }
        const commandReady = ble.canSendCommands || (await ble.refreshCommandChannel()) === true;
        if (transferId !== this.historyTransferId) return;
        if (!commandReady) throw new Error('WHOOP command channel unavailable for history acknowledgement');
        const ack = cmdHistoricalDataResult(meta.endData);
        const result = await this.writeCommandAwaitFinalResult(
          ble,
          ack,
          Command.HISTORICAL_DATA_RESULT,
          10_000,
          'History acknowledgement',
        );
        if (transferId !== this.historyTransferId) return;
        if (result !== 1) throw new Error(`WHOOP rejected the history acknowledgement (result ${result})`);
        this.historyAckedChunks += 1;
        this.historyAckedEndKeys.add(endKey);
        this.historyLastAckEndKey = endKey;
        const deviceId = this.getState().device?.id;
        if (deviceId) {
          void kvSet(historyAckCursorKey(deviceId), JSON.stringify({
            endKey,
            trim: meta.trim,
            unix: meta.unix,
            acknowledgedAt: Date.now(),
          })).catch(() => {});
        }
      } finally {
        // Suppress duplicate END notifications only while this exact durable
        // write/ack is in flight. A later retransmit is safe to acknowledge
        // again and must not be blocked forever by a session-wide cache.
        if (transferId === this.historyTransferId) this.historyQueuedEndKeys.delete(endKey);
      }
    });
  }

  private enqueueHistoryStop(reason: 'complete' | 'timeout' | 'disconnect'): void {
    if (this.historyStopQueued) return;
    const transferId = this.historyTransferId;
    this.historyStopQueued = true;
    const mode = this.historyDrainMode;
    const tail = this.historyRecords;
    this.historyRecords = [];
    this.enqueueHistoryCommit(transferId, async () => {
      if (tail.length) await this.persistHistoryFrames(tail, transferId);
      if (transferId !== this.historyTransferId) return;
      const current = this.getState().historySync;
      const durablyComplete = historySyncIsDurablyComplete({
        reason,
        rawRecords: current?.rawRecords ?? 0,
        durableEndChunks: this.historyDurableEndChunks,
        acknowledgedEndChunks: this.historyAckedChunks,
        failed: this.historyCommitError != null,
      });
      const finalReason = reason === 'complete' && !durablyComplete ? 'timeout' : reason;
      const cursorAdvanced = historyCursorAdvanced(this.historyRunStartAckEndKey, this.historyLastAckEndKey);
      await this.finishHistoryMode(finalReason);
      await this.backfillHistoryDays(this.historySessionStats);
      await this.backfillCardioStepsFromHistory();
      if (transferId !== this.historyTransferId) return;
      const finishedTs = Date.now();
      const replayedEndpoint = durablyComplete && (current?.rawRecords ?? 0) > 0 && !cursorAdvanced;
      if (replayedEndpoint) {
        this.historyReplayCount += 1;
        this.nextAutoHistorySyncTs = finishedTs + historyReplayDelayMs(this.historyReplayCount);
      } else if (durablyComplete) {
        this.historyReplayCount = 0;
        this.nextAutoHistorySyncTs = 0;
      }
      if (durablyComplete) {
        await kvSet('lastSyncTs', String(finishedTs));
        const deviceId = this.getState().device?.id;
        if (deviceId) {
          await kvSet(historyReplayCountKey(deviceId), String(this.historyReplayCount));
          await kvSet(historyNextAutoSyncKey(deviceId), String(this.nextAutoHistorySyncTs));
        }
      }
      const finalReport = current
        ? {
            ...current,
            status: historyStopStatus(finalReason, current, cursorAdvanced),
            finishedTs,
            reason: finalReason,
            mode,
            durableChunks: this.historyDurableEndChunks,
            acknowledgedChunks: this.historyAckedChunks,
            cursorAdvanced,
          }
        : null;
      if (finalReport) await kvSet('lastHistorySync', JSON.stringify(finalReport));
      this.clearHistoryTimeout();
      this.stopHistoryWatchdog();
      this.setState({
        draining: false,
        lastSyncTs: durablyComplete ? finishedTs : this.getState().lastSyncTs,
        historySync: finalReport,
        lastHistorySync: finalReport,
      });
      await this.refreshBandSteps();
      if (transferId !== this.historyTransferId) return;
      await this.refreshDerived();
      if (transferId !== this.historyTransferId) return;
      const stats = this.historySessionStats;
      const shouldContinueAutoDrain =
        mode === 'auto' &&
        finalReason === 'complete' &&
        (stats?.decodedRecords ?? 0) > 0 &&
        this.historyAckedChunks > 0 &&
        cursorAdvanced &&
        this.autoSyncAttempts < AUTO_HISTORY_MAX_CONTINUOUS_PASSES &&
        this.getState().status === 'connected' &&
        this.getState().device != null;
      if (durablyComplete) this.historyRetryFailures = 0;
      if (finalReason === 'timeout') {
        if (mode === 'auto') {
          this.retryAutoHistoryDrain();
        } else {
          const deviceId = this.getState().device?.id;
          if (deviceId && this.getState().status === 'connected') {
            this.autoDrainedFor = '';
            this.scheduleAutoHistoryDrain(deviceId, AUTO_HISTORY_SYNC_RETRY_MS);
          }
        }
      }
      this.historyDrainActive = false;
      if (shouldContinueAutoDrain) {
        const deviceId = this.getState().device?.id;
        if (deviceId) {
          this.autoDrainedFor = '';
          this.scheduleAutoHistoryDrain(deviceId, 1500);
        }
      } else if (mode === 'auto' && finalReason === 'complete') {
        this.autoSyncAttempts = 0;
      }
    });
  }

  private enqueueHistoryCommit(transferId: number, operation: () => Promise<void>): void {
    const queued = this.historyCommitQueue.then(async () => {
      if (transferId !== this.historyTransferId || this.historyCommitError) return;
      await operation();
    });
    // Keep the chain rejected after the first failed operation. Subsequent
    // batches are skipped by Promise chaining and cannot touch the strap or DB.
    this.historyCommitQueue = queued;
    void queued.catch((error) => this.failHistoryCommit(transferId, error));
  }

  private failHistoryCommit(transferId: number, error: unknown): void {
    if (transferId !== this.historyTransferId || this.historyCommitError) return;
    this.historyCommitError = error instanceof Error ? error : new Error(String(error));
    this.historyRecords = [];
    this.historyQueuedEndKeys.clear();
    this.clearHistoryTimeout();
    this.stopHistoryWatchdog();
    this.historyStopQueued = true;
    this.historyDrainActive = false;
    this.setState({ draining: false, error: `History sync failed: ${this.historyCommitError.message}` });
    if (this.historyDrainMode === 'auto') this.retryAutoHistoryDrain();
  }

  private async persistHistoryFrames(frames: Uint8Array[], transferId: number): Promise<HistoricalDecodeResult> {
    const rawTs = Date.now();
    const current = transferId === this.historyTransferId;
    if (current) {
      this.historyPersisting = true;
      this.markHistoryActivity();
      this.setState((s) => ({
        historySync: s.historySync
          ? { ...s.historySync, status: `Committing ${frames.length} history records` }
          : s.historySync,
      }));
    }
    let decoded: HistoricalDecodeResult;
    try {
      const ppgContextFrames = this.historyPpgContext;
      decoded = decodeWhoop5HistoryFrames(frames, undefined, { ppgContextFrames });
      await persistHistoryBatch({
        rawTs,
        framesHex: frames.map(bytesToHex),
        hr: decoded.hr,
        steps: decoded.steps,
        sleepStates: decoded.sleepStates,
        motion: decoded.motion,
        rawVitals: decoded.rawVitals,
      });
      if (transferId === this.historyTransferId) {
        this.historyPpgContext = [...ppgContextFrames, ...frames.filter((frame) => frame[9] === 26)].slice(-16);
      }
    } finally {
      if (transferId === this.historyTransferId) {
        this.historyPersisting = false;
        this.markHistoryActivity();
      }
    }

    if (transferId !== this.historyTransferId) return decoded;

    this.historySessionStats = mergeHistoryStats(this.historySessionStats, decoded);
    const stats = this.historySessionStats;
    const bounds = historySampleBounds(stats);
    this.setState({
      historySync: {
        status: `Stored ${decoded.hr.length} HR and ${decoded.motion.length} IMU samples from ${frames.length} records`,
        rawRecords: stats.records,
        decodedRecords: stats.decodedRecords,
        hrSamples: stats.hr.length,
        rrSamples: stats.hr.reduce((a, s) => a + s.rr.length, 0),
        stepSamples: stats.steps.length,
        motionSamples: stats.motion.length,
        rawSensorRecords: stats.rawSensorRecords,
        rawVitalSamples: stats.rawVitals.length,
        rejectedRecords: stats.rejectedRecords,
        droppedImplausibleTs: stats.droppedImplausibleTs,
        versions: stats.versions,
        ...bounds,
      },
    });

    return decoded;
  }

  private async backfillHistoryDays(stats: HistoricalDecodeResult | null): Promise<void> {
    if (!stats) return;
    const days = new Set<string>();
    const today = dayKey(Date.now());
    const addOvernightDay = (ts: number) => {
      days.add(dayKey(ts));
      const hour = new Date(ts).getHours();
      if (hour >= 16) days.add(dayKey(localDayStartOffset(ts, 1)));
      if (hour < 12) days.add(dayKey(ts));
    };
    for (const sample of stats.hr) {
      addOvernightDay(sample.ts);
    }
    for (const sample of stats.steps) days.add(dayKey(sample.ts));
    for (const sample of stats.sleepStates) addOvernightDay(sample.ts);
    for (const sample of stats.motion) addOvernightDay(sample.ts);
    for (const sample of stats.rawVitals) addOvernightDay(sample.ts);
    const earliest = [...days].sort((a, b) => a.localeCompare(b))[0];
    if (earliest) {
      for (const row of await getRecentDailyMetrics(HR_RETENTION_DAYS)) {
        if (row.day >= earliest && row.day < today) days.add(row.day);
      }
    }
    const ordered = [...days].filter((d) => d !== today).sort((a, b) => a.localeCompare(b));
    for (const day of ordered) {
      await this.backfillDailyMetric(day);
    }
  }

  private async reestimateRecentBandStepDays(days = 14): Promise<void> {
    const now = Date.now();
    for (let i = 1; i <= days; i += 1) {
      const day = dayKey(addDays(now, -i));
      const sod = dayStartFromKey(day);
      const existing = await getDailyMetric(day);
      if (!existing) continue;
      const end = Math.min(localDayStartOffset(sod, 1), now);
      const rows = await stepRowsForRange(sod, end);
      const estimate = estimateBandStepsFromCounters(rows, this.getState().bandStepDivisor, {
        countFromTs: sod,
        countToTs: end,
      });
      const steps = bandStepsAreTrusted(estimate, this.getState().bandStepDivisor)
        ? estimate?.steps ?? null
        : null;
      const stepSource = steps != null ? 'band' : null;
      if (existing.steps === steps && existing.stepSource === stepSource) continue;
      await upsertDailyMetric({ ...existing, steps, stepSource, updatedAt: Date.now() });
    }
  }

  private async backfillDailyMetric(day: string): Promise<void> {
    const profile = this.getState().profile;
    const now = Date.now();
    const sod = dayStartFromKey(day);
    const dayEnd = Math.min(localDayStartOffset(sod, 1), now);
    if (dayEnd <= sod) return;

    const dayHr = await getHrSamplesBetween(sod, dayEnd);
    const perMin = perMinuteHr(dayHr);
    const strainSamples = perMin.map((p) => ({ hr: p.hr, minutes: 1 }));
    const load = edwardsTrimp(strainSamples, profile);
    const strain = strainSamples.length ? strainFromLoad(load) : null;
    const stepEstimate = estimateBandStepsFromCounters(await stepRowsForRange(sod, dayEnd), this.getState().bandStepDivisor, {
      countFromTs: sod,
      countToTs: dayEnd,
    });
    const steps = bandStepsAreTrusted(stepEstimate, this.getState().bandStepDivisor) ? stepEstimate?.steps ?? null : null;

    const manualRaw = await kvGet(`manualSleep:${day}`);
    const manual = manualRaw ? (JSON.parse(manualRaw) as { startTs: number; endTs: number }) : null;
    const wakeDayEnd = localDayStartOffset(sod, 1);
    const winStart = manual ? manual.startTs : localDayHour(sod, -1, 10);
    const winEnd = manual ? manual.endTs : Math.min(localDayHour(sod, 1, 2), now);
    const nightHr = sleepDetectionHrSamples(await getHrSamplesBetween(winStart, winEnd));
    const nightPerMin = perMinuteHr(nightHr);
    const sleepInput = await buildSleepInput(nightPerMin, winStart, winEnd, nightHr);
    let candidateSleep = manual
      ? computeSleep(sleepInput, undefined, {
          forceWindow: true,
          startTs: manual.startTs,
          endTs: manual.endTs,
          source: nightPerMin.length >= 10 ? 'manual_hr' : 'manual_duration',
        })
      : computeSleep(sleepInput, undefined, { endAfterTs: sod, endBeforeTs: wakeDayEnd });
    if (manual && !candidateSleep) candidateSleep = durationOnlySleep(manual.startTs, manual.endTs);
    const sleep =
      sleepIsReliable(candidateSleep, !!manual, sleepInput) && sleepBelongsToDay(candidateSleep, day, !!manual)
        ? candidateSleep
        : null;

    let rmssd: number | null = null;
    let rhr: number | null = null;
    let resp: number | null = null;
    let spo2: number | null = null;
    let skinTempC: number | null = null;
    const overnightMask = sleep
      ? buildSleepEpochMask(sleep, independentSleepQuality(sleepInput))
      : [];
    const scoredNightHr = sleep
      ? maskHrSamplesToStableEpochs(
          nightHr.filter((s) => s.ts >= sleep.startTs && s.ts < sleep.endTs),
          sleep,
          overnightMask,
        )
      : [];
    if (sleep) {
      const vitals = computeOvernightVitals(scoredNightHr, sleep, overnightMask);
      rmssd = vitals.rmssd;
      rhr = vitals.rhr;
      resp = vitals.resp;
    }
    const rawVitalWindow = sleep;
    if (rawVitalWindow) {
      const rawVitals = averageRawVitals(
        await getRawVitalSamplesBetween(rawVitalWindow.startTs - 30 * 60000, rawVitalWindow.endTs + 30 * 60000),
      );
      spo2 = rawVitals.spo2;
      skinTempC = rawVitals.skinTempC;
    }

    const recent = (await getRecentDailyMetrics(60)).filter((d) => d.day < day);
    const debtNights = recent
      .filter(isUsableDebtNight)
      .slice(0, 14)
      .reverse()
      .map((d) => ({ neededMin: debtAccrualTarget(d), asleepMin: d.sleepMin as number }));
    const accruedDebtMin = sleepDebt(debtNights);
    await this.autoDetectNapsForDay(sod, dayEnd, sleep);
    const completedLoadWindow = sleepNeedLoadWindow(recent, sleep, sod);
    const completedStrain = await strainBetween(completedLoadWindow.startTs, completedLoadWindow.endTs, profile);
    const completedNapMin = dedupedNapCreditMin(
      await listNapsBetween(completedLoadWindow.startTs, completedLoadWindow.endTs),
      completedLoadWindow.startTs,
      completedLoadWindow.endTs,
    );
    const need = computeSleepNeed({
      baselineMin: personalSleepBaseline(recent),
      recentStrain: completedStrain,
      accruedDebtMin,
      napMin: completedNapMin,
    });
    if (sleep) applySleepNeed(sleep, need);

    const sleepStressResult = sleep ? buildSleepStress(scoredNightHr, sleep.inBedMin) : null;

    let sleepDetail: SleepDetail | null = null;
    let sleepPerformanceResult: SleepPerformance | null = null;
    let stagesTrusted = false;
    if (sleep) {
      const priorWindows = recent
        .filter(isUsableSleepTrendNight)
        .map((d) => ({ startTs: d.sleepStart as number, endTs: d.sleepEnd as number }));
      priorWindows.push({ startTs: sleep.startTs, endTs: sleep.endTs });
      const consistency = sleepConsistency(priorWindows);
      const scored = buildSleepDetail({
        sleep,
        need,
        consistencyPct: consistency?.score ?? null,
        sleepStress: sleepStressResult,
        manual: !!manual,
        includeQualityScore: false,
      });
      sleepPerformanceResult = scored.performance;
      sleepDetail = scored.detail;
      stagesTrusted = scored.stagesTrusted;
    } else if (manual) {
      sleepDetail = manualTimingOnlyDetail(manual.startTs, manual.endTs);
    }

    const trustedRecoveryNights = recent.filter(isUsableRecoveryNight).slice(0, 30);
    const toDayValues = (pick: (d: DailyMetricRow) => number | null) =>
      trustedRecoveryNights
        .filter((d) => pick(d) != null)
        .map((d) => ({ day: epochDay(Date.parse(`${d.day}T00:00:00`)), value: pick(d) as number }));
    const rmssdSamples = toDayValues((d) => d.rmssd);
    const rhrSamples = toDayValues((d) => d.rhr);
    const respSamples = toDayValues((d) => d.resp);
    const skinTempSamples = toDayValues((d) => d.skinTempC);
    const rawRecovery = recoveryEstimate({
      rmssd,
      rhr,
      resp,
      skinTempC,
      sleepPerformance: recoverySleepEvidence(sleep, need.neededMin),
      rmssdSamples,
      rhrSamples,
      respSamples,
      skinTempSamples,
    }).score;
    const recovery = applyRecoveryConfidenceCap(rawRecovery, sleepDetail);

    await upsertDailyMetric({
      day,
      recovery,
      rmssd,
      rhr,
      resp,
      spo2,
      skinTempC,
      sleepMin: sleep?.asleepMin ?? null,
      sleepPerf: sleepPerformanceResult ? sleepPerformanceResult.score / 100 : (sleep?.performance ?? null),
      strain,
      steps,
      stepSource: steps != null ? 'band' : null,
      sleepStart: sleep?.startTs ?? manual?.startTs ?? null,
      sleepEnd: sleep?.endTs ?? manual?.endTs ?? null,
      deepMin: sleep && stagesTrusted ? sleep.stages.deep : null,
      remMin: sleep && stagesTrusted ? sleep.stages.rem : null,
      lightMin: sleep && stagesTrusted ? sleep.stages.light : null,
      awakeMin: sleep && stagesTrusted ? sleep.stages.awake : null,
      sleepDetail,
      updatedAt: now,
    });
  }

  private async rebuildRetainedDerivedMetricsIfNeeded(): Promise<void> {
    if ((await kvGet(DERIVED_METRICS_REVISION_KEY)) === DERIVED_METRICS_REVISION) return;
    const today = dayKey(Date.now());
    const retainedDays = (await getRecentDailyMetrics(HR_RETENTION_DAYS))
      .filter((row) => row.day < today)
      .map((row) => row.day)
      .sort((a, b) => a.localeCompare(b));
    for (const day of retainedDays) await this.backfillDailyMetric(day);
    await kvSet(DERIVED_METRICS_REVISION_KEY, DERIVED_METRICS_REVISION);
  }

  private async backfillCardioStepsFromHistory(): Promise<void> {
    const rows = await listCardio(200);
    let changed = false;
    for (const row of rows) {
      if (row.source === 'nap') continue;
      if (row.stepSource === 'manual') continue;
      if (!activityUsesSteps(row.activity)) {
        if (row.steps != null || row.cadenceSpm != null || row.stepSource === 'band') {
          await insertCardio({ ...row, steps: null, cadenceSpm: null, stepSource: null });
          changed = true;
        }
        continue;
      }
      const estimates = await Promise.all(
        activeSessionRanges({ startTs: row.startTs, pauseIntervals: row.pauseIntervals ?? [] }, row.endTs)
          .map(async (range) => estimateBandStepsFromCounters(
            await stepRowsForRange(range.startTs, range.endTs),
            this.getState().bandStepDivisor,
            { countFromTs: range.startTs, countToTs: range.endTs },
          )),
      );
      const estimate = estimates.reduce<BandStepEstimate | null>((total, next) => {
        if (!next) return total;
        if (!total) return next;
        return {
          ...total,
          steps: total.steps + next.steps,
          rawTicks: total.rawTicks + next.rawTicks,
          sampleCount: total.sampleCount + next.sampleCount,
        };
      }, null);
      if (!bandStepsAreTrusted(estimate, this.getState().bandStepDivisor)) {
        if (row.stepSource === 'band' && (row.steps != null || row.cadenceSpm != null)) {
          await insertCardio({ ...row, steps: null, cadenceSpm: null, stepSource: null });
          changed = true;
        }
        continue;
      }
      const bandSteps = estimate?.steps ?? null;
      if (bandSteps == null || bandSteps <= 0) continue;
      if (row.steps != null && Math.abs(row.steps - bandSteps) <= 1) continue;
      const durationMin = Math.max(1 / 60, row.activeDurationMin ?? (row.endTs - row.startTs) / 60000);
      await insertCardio({
        ...row,
        steps: bandSteps,
        cadenceSpm: Math.round(bandSteps / durationMin),
        stepSource: 'band',
      });
      changed = true;
    }
    if (changed) this.setState({ cardio: await listCardio(CARDIO_RECENT_LIMIT) });
  }

  private armHistoryTimeout(): void {
    this.clearHistoryTimeout();
    this.historyIdleTimer = setTimeout(() => this.enqueueHistoryStop('timeout'), HISTORY_IDLE_TIMEOUT_MS);
  }

  private markHistoryActivity(): void {
    this.historyLastActivityTs = Date.now();
    this.historyStallRecoveries = 0;
    this.armHistoryTimeout();
  }

  private startHistoryWatchdog(): void {
    if (this.historyWatchdogTimer) return;
    this.historyWatchdogTimer = setInterval(
      () => this.recoverStaleHistoryDrain('watchdog'),
      HISTORY_WATCHDOG_INTERVAL_MS,
    );
  }

  private stopHistoryWatchdog(): void {
    if (this.historyWatchdogTimer) {
      clearInterval(this.historyWatchdogTimer);
      this.historyWatchdogTimer = null;
    }
  }

  private recoverStaleHistoryDrain(source: string): void {
    const state = this.getState();
    if (!state.draining || this.historyStopQueued) return;
    if (this.historyPersisting) {
      this.historyLastActivityTs = Date.now();
      this.armHistoryTimeout();
      this.setState((s) => ({
        historySync: s.historySync
          ? { ...s.historySync, status: `Committing history records (${source}); sync is still active` }
          : s.historySync,
      }));
      return;
    }
    const last = this.historyLastActivityTs || 0;
    if (!last) return;
    const stalledMs = Date.now() - last;
    if (stalledMs < HISTORY_STALL_TIMEOUT_MS) return;
    const stalledSec = Math.round(stalledMs / 1000);
    if (this.historyStallRecoveries < HISTORY_STALL_NUDGE_LIMIT && !this.historyNudgeInFlight) {
      void this.nudgeStalledHistoryDrain(source, stalledSec);
      return;
    }
    this.setState((s) => ({
      historySync: s.historySync
        ? { ...s.historySync, status: `Sync stalled after ${stalledSec}s (${source}); retrying` }
        : s.historySync,
    }));
    this.enqueueHistoryStop('timeout');
  }

  private async nudgeStalledHistoryDrain(source: string, stalledSec: number): Promise<void> {
    const ble = this.ble;
    const attempt = this.historyStallRecoveries + 1;
    this.historyStallRecoveries = attempt;
    this.historyNudgeInFlight = true;
    this.setState((s) => ({
      historySync: s.historySync
        ? { ...s.historySync, status: `Sync stalled after ${stalledSec}s (${source}); nudging strap ${attempt}/${HISTORY_STALL_NUDGE_LIMIT}` }
        : s.historySync,
    }));
    try {
      const commandReady = ble && (ble.canSendCommands || (await ble.refreshCommandChannel()) === true);
      if (!commandReady) {
        this.setState((s) => ({
          historySync: s.historySync
            ? { ...s.historySync, status: 'Sync stalled and command channel is unavailable; committing partial data' }
            : s.historySync,
        }));
        this.enqueueHistoryStop('timeout');
        return;
      }
      await withTimeout(ble.writeCommand(cmdSendHistoricalData()), 8000, 'History nudge');
      this.historyLastActivityTs = Date.now();
      this.armHistoryTimeout();
      this.setState((s) => ({
        historySync: s.historySync
          ? { ...s.historySync, status: `History request re-sent after stall (${attempt}/${HISTORY_STALL_NUDGE_LIMIT})` }
          : s.historySync,
      }));
    } catch (e) {
      this.setState((s) => ({
        historySync: s.historySync
          ? { ...s.historySync, status: `Sync nudge failed: ${String(e)}; committing partial data` }
          : s.historySync,
      }));
      this.enqueueHistoryStop('timeout');
    } finally {
      this.historyNudgeInFlight = false;
    }
  }

  private async finishHistoryMode(reason: 'complete' | 'timeout' | 'disconnect'): Promise<void> {
    const ble = this.ble;
    if (!ble?.isConnected || ble.connectionSessionId !== this.historyConnectionSessionId) return;
    const ready = ble.canSendCommands || (await ble.refreshCommandChannel()) === true;
    if (!ready) return;
    if (reason !== 'complete') {
      await withTimeout(ble.writeCommand(cmdAbortHistoricalTransmits()), 8000, 'History abort').catch(() => {});
    }
  }

  private clearHistoryTimeout(): void {
    if (this.historyIdleTimer) {
      clearTimeout(this.historyIdleTimer);
      this.historyIdleTimer = null;
    }
  }

  toggleCapture = (): void => {
    const capturing = !this.getState().capturing;
    this.setState({ capturing });
    if (!capturing) this.flushCapturedFrames();
  };

  /**
   * Run the historical drain handshake and backfill decoded WHOOP 5 history into
   * the local HR/R-R and step-counter tables.
   */
  runHistoryDrain = async (mode: 'manual' | 'auto' = 'manual'): Promise<void> => {
    if (this.historyDrainActive || this.getState().draining) return;
    if (mode === 'manual' && !this.autoConnectEnabled) {
      this.autoConnectEnabled = true;
      this.connectionIntentId += 1;
    }
    const intentId = this.connectionIntentId;
    this.historyTransferId += 1;
    // Preserve ordering with a prior run that is still unwinding, but do not
    // let its rejected promise poison this fresh transfer's commit chain.
    this.historyCommitQueue = this.historyCommitQueue.catch(() => {});
    this.historyDrainActive = true;
    this.clearAutoSyncTimer();
    this.clearHistoryTimeout();
    this.clearCommandResponseWaiters(new Error('A newer history sync replaced this command wait'));
    this.eventAssemblers.forEach((asm) => asm.reset());
    this.historyRecords = [];
    this.historySessionStats = null;
    this.historyStopQueued = false;
    this.historyQueuedEndKeys.clear();
    this.historyAckedEndKeys.clear();
    this.historyAckedChunks = 0;
    this.historyDurableEndChunks = 0;
    this.historyCommitError = null;
    this.historyRunStartAckEndKey = null;
    this.historyLastAckEndKey = null;
    this.historyConnectionSessionId = -1;
    this.historyStallRecoveries = 0;
    this.historyNudgeInFlight = false;
    this.historyPersisting = false;
    this.historyPpgContext = [];
    this.historyDrainMode = mode;
    this.historyLastActivityTs = Date.now();
    this.setState({ draining: true, error: null });
    const ble = this.ble;
    if (!ble || !ble.isConnected) {
      await this.reconnectForHistory(mode, 'Bluetooth link dropped; reconnecting before history sync');
      return;
    }
    this.historyConnectionSessionId = ble.connectionSessionId;
    this.historyRunStartAckEndKey = await loadHistoryAckEndKey(this.getState().device?.id ?? null).catch(() => null);
    if (!this.autoConnectEnabled || intentId !== this.connectionIntentId) return;
    if (!ble.canSendCommands) {
      const commandReady = await ble.refreshCommandChannel().catch(() => false);
      if (!this.historyDrainActive || this.historyStopQueued || !this.autoConnectEnabled || intentId !== this.connectionIntentId) return;
      if (!ble.isConnected) {
        await this.reconnectForHistory(mode, 'Bluetooth link changed during command discovery; reconnecting');
        return;
      }
      if (commandReady) {
        await this.flushPendingStrapAlarm(`${mode} sync`);
        if (!this.autoConnectEnabled || intentId !== this.connectionIntentId) return;
        this.setState((s) => ({
          historySync: s.historySync
            ? { ...s.historySync, status: 'Command channel rediscovered; starting history transfer' }
            : s.historySync,
        }));
      } else {
        await this.reconnectForHistory(mode, 'WHOOP command channel went stale; reconnecting before history sync');
        return;
      }
    }
    await this.flushPendingStrapAlarm(`${mode} sync`);
    if (!this.historyDrainActive || this.historyStopQueued || !ble.isConnected || !this.autoConnectEnabled || intentId !== this.connectionIntentId) return;
    void this.ensureBackgroundSyncKeepAlive(mode === 'auto' ? 'Automatic history sync' : 'Manual history sync').catch(() => {});
    this.setState({
      draining: true,
      error: null,
      historySync: {
        status: mode === 'auto' ? 'Auto sync: requesting stored history' : 'Requesting stored history',
        rawRecords: 0,
        decodedRecords: 0,
        hrSamples: 0,
        rrSamples: 0,
        stepSamples: 0,
        motionSamples: 0,
        rawSensorRecords: 0,
        rawVitalSamples: 0,
        rejectedRecords: 0,
        droppedImplausibleTs: 0,
        versions: [],
      },
    });
    this.armHistoryTimeout();
    this.startHistoryWatchdog();
    try {
      try {
        const rangeResult = await this.writeCommandAwaitFinalResult(
          ble,
          cmdGetDataRange(),
          Command.GET_DATA_RANGE,
          35000,
          'History range request',
        );
        if (rangeResult !== 1) throw new Error(`WHOOP rejected the history range request (result ${rangeResult})`);
        this.setState((s) => ({
          historySync: s.historySync
            ? { ...s.historySync, status: 'Stored data range ready; starting history transfer' }
            : s.historySync,
        }));
        await delay(100);
      } catch {
        this.setState((s) => ({
          historySync: s.historySync
            ? { ...s.historySync, status: 'Data range unavailable; requesting history anyway' }
            : s.historySync,
        }));
        await delay(250);
      }
      await withTimeout(ble.writeCommand(cmdSendHistoricalData()), 8000, 'History request');
      this.setState((s) => ({
        historySync: s.historySync
          ? { ...s.historySync, status: mode === 'auto' ? 'Auto sync: waiting for stored history' : 'Waiting for stored history' }
          : s.historySync,
      }));
      this.armHistoryTimeout();
    } catch (e) {
      if (this.historyStopQueued) return;
      this.clearHistoryTimeout();
      this.stopHistoryWatchdog();
      this.historyStopQueued = true;
      this.historyDrainActive = false;
      this.setState({ draining: false, error: `History drain failed: ${String(e)}` });
      if (mode === 'auto') this.retryAutoHistoryDrain();
    }
  };

  shareFrames = async (): Promise<void> => {
    // Export is handled from raw_frames in the DB via the Device screen; here we
    // just surface the most recent captured frames.
    await Share.share({ message: 'Open the Device screen to export captured frames.' });
  };

  // ---- profile ----
  updateProfile = async (p: UserProfile): Promise<void> => {
    await saveProfile(p);
    this.setState({ profile: p });
    await this.recomputeToday();
  };

  // ---- cardio ----
  addCardio = async (input: {
    id?: string;
    activity: string;
    startTs: number;
    endTs: number;
    avgHr: number | null;
    maxHr?: number | null;
    distanceM?: number | null;
    route?: Array<{ lat: number; lng: number }> | null;
    steps?: number | null;
    cadenceSpm?: number | null;
    stepSource?: 'band' | 'manual' | null;
    lapCount?: number | null;
    activeDurationMin?: number | null;
    pauseIntervals?: SessionPause[];
    notes?: string;
    source?: string;
  }): Promise<void> => {
    const profile = this.getState().profile;
    const isNap = input.source === 'nap';
    if (input.endTs <= input.startTs) throw new Error('Cardio interval must have a positive duration.');
    if (isNap) {
      const overlappingNaps = (await listNapsBetween(input.startTs, input.endTs))
        .filter((row) => row.id !== (input.id ?? `c_${input.startTs}`));
      if (overlappingNaps.length) throw new Error('Nap overlaps an existing nap and was not saved.');
    }
    const usesSteps = !isNap && activityUsesSteps(input.activity);
    const durationMin = Math.max(1 / 60, input.activeDurationMin ?? (input.endTs - input.startTs) / 60000);
    const minutes = Math.max(1, Math.round(durationMin));
    const hrRows = (await getHrSamplesBetween(input.startTs, input.endTs).catch(() => []))
      .filter((row) => !input.pauseIntervals?.some((pause) =>
        row.ts >= pause.startTs && row.ts < (pause.endTs ?? input.endTs),
      ));
    const bpms = hrRows.map((r) => r.bpm);
    const avgHr = bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : input.avgHr;
    const maxHr = bpms.length ? Math.max(...bpms) : input.maxHr ?? null;
    const perMinSamples = perMinuteHr(hrRows).map((p) => ({ hr: p.hr, minutes: 1 }));
    const load = isNap
      ? null
      : perMinSamples.length
      ? edwardsTrimp(perMinSamples, profile)
      : input.avgHr
        ? edwardsTrimp([{ hr: input.avgHr, minutes }], profile)
        : null;
    const strain = load !== null ? strainFromLoad(load) : null;
    // Calories from HR (Keytel) — the WHOOP-style HR-driven energy estimate.
    const kcal = isNap
      ? null
      : perMinSamples.length
      ? totalKcal(perMinSamples, profile)
      : input.avgHr
        ? Math.round(kcalPerMinute(input.avgHr, profile) * minutes)
        : null;
    const bandActivityEstimate =
      usesSteps && input.steps == null
        ? (await Promise.all(
            activeSessionRanges(
              { startTs: input.startTs, pauseIntervals: input.pauseIntervals ?? [] },
              input.endTs,
            ).map(async (range) => estimateBandStepsFromCounters(
              await stepRowsForRange(range.startTs, range.endTs),
              this.getState().bandStepDivisor,
              { countFromTs: range.startTs, countToTs: range.endTs },
            )))
          ).reduce<BandStepEstimate | null>((total, estimate) => {
            if (!estimate) return total;
            if (!total) return estimate;
            return {
              ...total,
              steps: total.steps + estimate.steps,
              rawTicks: total.rawTicks + estimate.rawTicks,
              sampleCount: total.sampleCount + estimate.sampleCount,
            };
          }, null)
        : null;
    const bandActivitySteps = bandStepsAreTrusted(bandActivityEstimate, this.getState().bandStepDivisor)
      ? bandActivityEstimate?.steps ?? null
      : null;
    const activitySteps = usesSteps ? (input.stepSource ? input.steps ?? null : bandActivitySteps) : null;
    const stepSource = usesSteps ? input.stepSource ?? (bandActivitySteps != null ? 'band' : null) : null;
    const row: CardioRow = {
      id: input.id ?? `c_${input.startTs}`,
      startTs: input.startTs,
      endTs: input.endTs,
      activity: input.activity,
      avgHr,
      maxHr,
      trimp: load !== null ? Math.round(load) : null,
      strain,
      kcal,
      distanceM: input.distanceM ?? null,
      route: input.route ?? null,
      steps: activitySteps,
      cadenceSpm: usesSteps ? input.cadenceSpm ?? (activitySteps != null ? Math.round(activitySteps / durationMin) : null) : null,
      stepSource,
      lapCount: input.lapCount ?? null,
      activeDurationMin: input.activeDurationMin ?? durationMin,
      pauseIntervals: input.pauseIntervals ?? null,
      source: input.source ?? 'manual',
      notes: input.notes ?? null,
    };
    await insertCardio(row);
    this.setState({ cardio: await listCardio(CARDIO_RECENT_LIMIT) });
    await this.recomputeToday();
  };

  removeCardio = async (id: string): Promise<void> => {
    await deleteCardio(id);
    this.setState({ cardio: await listCardio(CARDIO_RECENT_LIMIT) });
    await this.recomputeToday();
  };

  convertNapToSleep = async (id: string): Promise<void> => {
    const nap = this.getState().cardio.find((row) => row.id === id && row.source === 'nap');
    if (!nap) throw new Error('Nap is no longer available.');
    const wakeDay = dayKey(nap.endTs);
    // Remove nap credit before scoring the same interval as main sleep. Doing
    // both operations before one recompute avoids a transient double count.
    const overlappingNaps = await listNapsBetween(nap.startTs, nap.endTs);
    for (const overlappingNap of overlappingNaps) await deleteCardio(overlappingNap.id);
    await kvSet(`manualSleep:${wakeDay}`, JSON.stringify({ startTs: nap.startTs, endTs: nap.endTs }));
    this.setState({ cardio: await listCardio(CARDIO_RECENT_LIMIT) });
    await this.recomputeDay(wakeDay);
  };

  // ---- manual / adjusted sleep window ----
  setManualSleep = async (startTs: number, endTs: number, day = dayKey(Date.now())): Promise<void> => {
    await kvSet(`manualSleep:${day}`, JSON.stringify({ startTs, endTs }));
    await this.recomputeDay(day);
  };

  clearManualSleep = async (day = dayKey(Date.now())): Promise<void> => {
    await kvSet(`manualSleep:${day}`, '');
    await this.recomputeDay(day);
  };

  private async scoreNapWindow(startTs: number, endTs: number, autoDetected: boolean): Promise<StoredNapDetail | null> {
    if (endTs - startTs < 5 * 60000) return null;
    const hrRows = directPhysiologyHrSamples(await getHrSamplesBetween(startTs, endTs).catch(() => []));
    const perMin = perMinuteHr(hrRows);
    const sleepInput = await buildSleepInput(perMin, startTs, endTs, hrRows);
    const sleep = computeSleep(sleepInput, undefined, {
      forceWindow: true,
      startTs,
      endTs,
      source: perMin.length >= 5 ? 'manual_hr' : 'manual_duration',
    });
    return sleep ? napDetailFromSleep(sleep, autoDetected) : null;
  }

  private async autoDetectNapsForDay(sod: number, dayEnd: number, mainSleep: SleepResult | null): Promise<void> {
    const scanStart = localDayHour(sod, 0, 5);
    const scanEnd = Math.min(dayEnd, localDayHour(sod, 0, 22));
    if (scanEnd - scanStart < 20 * 60000) return;

    const allHr = directPhysiologyHrSamples(await getHrSamplesBetween(scanStart, scanEnd).catch(() => []));
    let existing = await listCardioBetween(scanStart, scanEnd);
    if (perMinuteHr(allHr).length >= 120) {
      const staleAutoNaps = existing.filter((row) => row.source === 'nap' && parseNapDetail(row.notes)?.autoDetected === true);
      for (const nap of staleAutoNaps) await deleteCardio(nap.id);
      if (staleAutoNaps.length) existing = await listCardioBetween(scanStart, scanEnd);
    }
    const napRanges = existing.filter((c) => c.source === 'nap').map((c) => ({ startTs: c.startTs, endTs: c.endTs }));
    const blocked = existing
      .filter((c) => c.source !== 'nap')
      .map((c) => ({ startTs: c.startTs - 10 * 60000, endTs: c.endTs + 10 * 60000 }));
    if (mainSleep) {
      blocked.push({ startTs: mainSleep.startTs - 30 * 60000, endTs: mainSleep.endTs + 30 * 60000 });
    }

    const allPerMin = perMinuteHr(allHr).filter((p) => !blocked.some((b) => rangesOverlap(p.tsMs, p.tsMs + 60000, b.startTs, b.endTs)));
    if (allPerMin.length < 120) return;
    const dayMedianHr = median(allPerMin.map((p) => p.hr));
    const segments = splitContiguousMinutes(allPerMin, 20);

    for (const segment of segments) {
      if (segment.length < 20) continue;
      const startTs = segment[0]!.tsMs;
      const endTs = segment[segment.length - 1]!.tsMs + 60000;
      if (napRanges.some((n) => rangesOverlap(startTs, endTs, n.startTs, n.endTs))) continue;

      const sleepInput = await buildSleepInput(
        segment,
        startTs,
        endTs,
        allHr.filter((row) => row.ts >= startTs && row.ts < endTs),
      );
      const nap = computeSleep(sleepInput, undefined, { minWindowMin: 20, maxWindowMin: 90 });
      if (!nap || !napIsReliable(nap)) continue;
      if (blocked.some((b) => rangesOverlap(nap.startTs, nap.endTs, b.startTs, b.endTs))) continue;
      if (napRanges.some((n) => rangesOverlap(nap.startTs, nap.endTs, n.startTs, n.endTs))) continue;

      const napHr = await getHrSamplesBetween(nap.startTs, nap.endTs).catch(() => []);
      const bpms = napHr.map((r) => r.bpm).filter((v) => v >= 30 && v <= 160);
      const avgHr = bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : null;
      if (avgHr != null && avgHr > dayMedianHr - 2 && avgHr > 75) continue;

      await insertCardio({
        id: `nap_${nap.startTs}`,
        startTs: nap.startTs,
        endTs: nap.endTs,
        activity: 'Nap',
        avgHr,
        maxHr: bpms.length ? Math.max(...bpms) : null,
        trimp: null,
        strain: null,
        kcal: null,
        distanceM: null,
        route: null,
        steps: null,
        cadenceSpm: null,
        stepSource: null,
        lapCount: null,
        source: 'nap',
        notes: encodeNapDetail(napDetailFromSleep(nap, true)),
      });
      napRanges.push({ startTs: nap.startTs, endTs: nap.endTs });
    }
  }

  // ---- live session (start / track / log) ----
  startSession = async (kind: SessionKind, label: string, hasGps = false, plan: StructuredWorkout | null = null): Promise<void> => {
    this.setState({
      session: {
        kind,
        label,
        startTs: Date.now(),
        laps: [],
        maxHr: null,
        hasGps,
        distanceM: hasGps ? 0 : null,
        speedMps: null,
        route: [],
        plan,
        pausedAtTs: null,
        pausedMs: 0,
        pauseIntervals: [],
      },
    });
    await this.persistSessionSnapshot();
    if (hasGps) void this.startGps();
  };

  /** Start a live workout that follows a structured/interval plan. */
  startPlannedSession = async (workout: StructuredWorkout): Promise<void> => {
    await this.startSession('workout', workout.name, activityGps(workout.activity), workout);
  };

  pauseSession = async (): Promise<void> => {
    const s = this.getState().session;
    if (!s || s.kind !== 'workout' || s.pausedAtTs != null) return;
    const now = Date.now();
    this.setState({
      session: {
        ...s,
        pausedAtTs: now,
        pauseIntervals: [...s.pauseIntervals, { startTs: now, endTs: null }].slice(-MAX_SESSION_PAUSES),
      },
    });
    await this.persistSessionSnapshot();
    await this.stopGps();
  };

  resumeSession = async (): Promise<void> => {
    const s = this.getState().session;
    if (!s || s.kind !== 'workout' || s.pausedAtTs == null) return;
    const now = Date.now();
    const pauseMs = Math.max(0, now - s.pausedAtTs);
    const pauseIntervals = s.pauseIntervals.slice();
    const last = pauseIntervals[pauseIntervals.length - 1];
    if (last && last.endTs == null) pauseIntervals[pauseIntervals.length - 1] = { ...last, endTs: now };
    this.setState({
      session: {
        ...s,
        pausedAtTs: null,
        pausedMs: s.pausedMs + pauseMs,
        pauseIntervals,
      },
    });
    await this.persistSessionSnapshot();
    if (this.getState().session?.hasGps) void this.startGps();
  };

  // ---- structured workout templates (persisted) ----
  listWorkoutTemplates = async (): Promise<StructuredWorkout[]> => {
    const raw = await kvGet('workoutTemplates');
    if (!raw) return [];
    try {
      return JSON.parse(raw) as StructuredWorkout[];
    } catch {
      return [];
    }
  };

  saveWorkoutTemplate = async (w: StructuredWorkout): Promise<void> => {
    const list = await this.listWorkoutTemplates();
    const next = [w, ...list.filter((t) => t.id !== w.id)];
    await kvSet('workoutTemplates', JSON.stringify(next));
  };

  deleteWorkoutTemplate = async (id: string): Promise<void> => {
    const list = await this.listWorkoutTemplates();
    await kvSet('workoutTemplates', JSON.stringify(list.filter((t) => t.id !== id)));
  };

  /** Begin phone-GPS tracking for the active session (WHOOP uses the phone, not
   *  the strap, for GPS). Runs as a foreground service so distance/pace/route
   *  keep streaming with the phone pocketed and the screen off. */
  private async startGps(): Promise<void> {
    const generation = ++this.gpsGeneration;
    const transition = this.gpsTransition.then(async () => {
      const session = this.getState().session;
      if (generation !== this.gpsGeneration || !session || session.pausedAtTs != null || !session.hasGps) return;
      this.gpsServiceRequested = true;
      const ok = await startBgLocation((u) => {
      const s = this.getState().session;
      if (generation !== this.gpsGeneration || !s || s.pausedAtTs != null) return;
      this.setState({
        session: {
          ...s,
          distanceM: u.distanceM,
          speedMps: u.speedMps,
          route: [...s.route, { lat: u.point.lat, lng: u.point.lng }],
        },
      });
      this.scheduleSessionPersistence();
    });
    if (ok && generation === this.gpsGeneration && this.getState().session?.pausedAtTs == null) {
      this.gpsActive = true;
      return;
    }
    if (ok) {
      this.gpsActive = false;
        try {
          await stopBgLocation();
          this.gpsServiceRequested = false;
        } catch {
        // The queued stop transition will retry the stop request.
      }
      return;
    } else {
      // Permission denied / GPS unavailable — keep recording HR, just no distance.
      const s = this.getState().session;
      if (s) {
        this.setState({ session: { ...s, hasGps: false, distanceM: null } });
        void this.persistSessionSnapshot().catch(() => {});
      }
    }
    });
    this.gpsTransition = transition.then(() => undefined, () => undefined);
    await transition;
  }

  private async stopGps(): Promise<number | null> {
    ++this.gpsGeneration;
    const transition = this.gpsTransition.then(async () => {
      if (!this.gpsActive && !this.gpsServiceRequested) return null;
      this.gpsActive = false;
      try {
        const { distanceM } = await stopBgLocation();
        this.gpsServiceRequested = false;
        return distanceM > 0 ? distanceM : null;
      } finally {
        this.gpsActive = false;
      }
    });
    this.gpsTransition = transition.then(() => undefined, () => undefined);
    return transition;
  }

  addLap = (): void => {
    const s = this.getState().session;
    if (s) {
      this.setState({ session: { ...s, laps: [...s.laps, Date.now()] } });
      void this.persistSessionSnapshot().catch(() => {});
    }
  };

  discardSession = async (): Promise<void> => {
    if (!this.getState().session) return;
    await this.stopGps();
    try {
      await this.persistSessionSnapshot(null);
    } catch (error) {
      this.setState({ error: `Could not finish discarding the session: ${String(error)}` });
      throw error;
    }
    this.setState({ session: null });
  };

  /** Live stats for the active session, derived from the persisted HR stream. */
  sessionStats = async (): Promise<SessionStats | null> => {
    const s = this.getState().session;
    if (!s) return null;
    const now = Date.now();
    const rows = await this.sessionHrRows(s, now);
    const perMin = perMinuteHr(rows);
    const bpms = rows.map((r) => r.bpm);
    const avgHr = bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : null;
    const maxHr = bpms.length ? Math.max(...bpms) : s.maxHr;
    const zones = hrZones(perMin.map((p) => ({ hr: p.hr, minutes: 1 })), this.getState().profile);
    const load = edwardsTrimp(perMin.map((p) => ({ hr: p.hr, minutes: 1 })), this.getState().profile);
    const strain = perMin.length ? strainFromLoad(load) : null;
    const stepStats = await this.sessionStepStats(s, now);
    return {
      elapsedSec: Math.round(activeSessionDurationMs(s, now) / 1000),
      avgHr,
      maxHr,
      strain,
      ...stepStats,
      zones,
      beats: rows.length,
    };
  };

  /** Stop the session and (optionally) save it: workout/nap → cardio, sleep → manual window. */
  stopSession = async (save = true): Promise<void> => {
    const s = this.getState().session;
    if (!s) return;
    const endTs = Date.now();
    // Capture stats while the session is still active, then clear it.
    const stats = save ? await this.sessionStats().catch(() => null) : null;
    const gpsDistance = (await this.stopGps()) ?? s.distanceM;
    if (!save) {
      try {
        await this.persistSessionSnapshot(null);
      } catch (error) {
        this.setState({ error: `Could not finish stopping the session: ${String(error)}` });
        throw error;
      }
      this.setState({ session: null });
      return;
    }
    if (s.kind === 'sleep') {
      await this.setManualSleep(s.startTs, endTs);
    } else if (s.kind === 'nap') {
      const napDetail = await this.scoreNapWindow(s.startTs, endTs, false);
      await this.addCardio({
        id: `c_${s.startTs}`,
        activity: s.label,
        startTs: napDetail?.startTs ?? s.startTs,
        endTs: napDetail?.endTs ?? endTs,
        avgHr: stats?.avgHr ?? s.maxHr ?? null,
        maxHr: stats?.maxHr ?? s.maxHr ?? null,
        activeDurationMin: activeSessionDurationMs(s, endTs) / 60000,
        pauseIntervals: s.pauseIntervals,
        source: 'nap',
        notes: encodeNapDetail(napDetail) ?? undefined,
      });
    } else {
      const usesSteps = sessionUsesSteps(s);
      await this.addCardio({
        id: `c_${s.startTs}`,
        activity: s.plan?.activity ?? s.label,
        startTs: s.startTs,
        endTs,
        avgHr: stats?.avgHr ?? s.maxHr ?? null,
        maxHr: stats?.maxHr ?? s.maxHr ?? null,
        distanceM: gpsDistance,
        route: s.route.length ? s.route : null,
        steps: usesSteps ? stats?.steps ?? null : null,
        cadenceSpm: usesSteps ? stats?.cadenceSpm ?? null : null,
        stepSource: usesSteps ? stats?.stepSource ?? null : null,
        lapCount: s.laps.length,
        activeDurationMin: activeSessionDurationMs(s, endTs) / 60000,
        pauseIntervals: s.pauseIntervals,
        source: 'live',
      });
    }
    try {
      await this.persistSessionSnapshot(null);
    } catch (error) {
      this.setState({ error: `Saved session, but could not clear its recovery snapshot: ${String(error)}` });
      throw error;
    }
    this.setState({ session: null });
  };

  // ---- journal ----
  addJournal = async (behaviour: string, value: string): Promise<void> => {
    const now = Date.now();
    const day = dayKey(now);
    // Deterministic id per behaviour per day → re-answering updates in place.
    await insertJournal({ id: `j_${day}_${behaviour}`, day, behaviour, value, createdAt: now });
  };

  // ---- derived metrics ----
  refreshDerived = (): Promise<void> => {
    return this.enqueueDerivedMetrics(async () => {
      if (this.historyPersisting || this.getState().draining) return;
      await this.recomputeTodayNow();
      const recentDays = await getRecentDailyMetrics(30);
      this.setState({
        recentDays,
        cardio: await listCardio(CARDIO_RECENT_LIMIT),
        sleepSchedule: inferSleepSchedule([this.getState().today, ...recentDays].filter((d): d is DailyMetricRow => d != null)),
      });
    });
  };

  recomputeDay = (day: string): Promise<void> => {
    return this.enqueueDerivedMetrics(async () => {
      if (day === dayKey(Date.now())) {
        await this.recomputeTodayNow();
        return;
      }
      await this.backfillDailyMetric(day);
      const today = dayKey(Date.now());
      const dependents = (await getRecentDailyMetrics(HR_RETENTION_DAYS))
        .filter((row) => row.day > day && row.day < today)
        .map((row) => row.day)
        .sort((a, b) => a.localeCompare(b));
      for (const dependentDay of dependents) await this.backfillDailyMetric(dependentDay);
      await this.recomputeTodayNow();
      const recentDays = await getRecentDailyMetrics(30);
      this.setState({
        recentDays,
        cardio: await listCardio(CARDIO_RECENT_LIMIT),
        sleepSchedule: inferSleepSchedule([this.getState().today, ...recentDays].filter((d): d is DailyMetricRow => d != null)),
      });
    });
  };

  recomputeToday = (): Promise<void> => this.enqueueDerivedMetrics(() => this.recomputeTodayNow());

  private async recomputeTodayNow(): Promise<void> {
    const profile = this.getState().profile;
    const now = Date.now();
    const sod = startOfDayMs(now);
    const today = dayKey(now);

    // Daytime strain from per-minute HR.
    const dayHr = await getHrSamplesBetween(sod, now);
    const perMin = perMinuteHr(dayHr);
    const storedStressSeries = stressSeriesFromRows(dayHr);
    const storedStress = storedStressSeries[storedStressSeries.length - 1]?.score ?? null;
    const strainSamples = perMin.map((p) => ({ hr: p.hr, minutes: 1 }));
    const load = edwardsTrimp(strainSamples, profile);
    const strain = strainSamples.length ? strainFromLoad(load) : null;
    const bestSteps = await this.refreshBandSteps();

    // Last night's window. A manual override (logged/adjusted by the user) takes
    // precedence and is scored over exactly those bounds; otherwise auto-detect
    // Scan late morning on the previous day through two hours after this wake
    // day, then
    // require the detected block to end on this day. The wider search supports
    // late sleepers and shift workers without writing one night twice.
    const manualRaw = await kvGet(`manualSleep:${today}`);
    const manual = manualRaw ? (JSON.parse(manualRaw) as { startTs: number; endTs: number }) : null;
    const wakeDayEnd = localDayStartOffset(sod, 1);
    const winStart = manual ? manual.startTs : localDayHour(sod, -1, 10);
    const winEnd = manual ? manual.endTs : Math.min(localDayHour(sod, 1, 2), now);
    const nightHr = sleepDetectionHrSamples(await getHrSamplesBetween(winStart, winEnd));
    const nightPerMin = perMinuteHr(nightHr);
    const captureWindowMin = Math.max(1, Math.round((winEnd - winStart) / 60000));
    const sleepInput = await buildSleepInput(nightPerMin, winStart, winEnd, nightHr);
    let candidateSleep = manual
      ? computeSleep(sleepInput, undefined, {
          forceWindow: true,
          startTs: manual.startTs,
          endTs: manual.endTs,
          source: nightPerMin.length >= 10 ? 'manual_hr' : 'manual_duration',
        })
      : computeSleep(sleepInput, undefined, { endAfterTs: sod, endBeforeTs: wakeDayEnd });
    if (manual && !candidateSleep) {
      candidateSleep = durationOnlySleep(manual.startTs, manual.endTs);
    }
    const sleep =
      sleepIsReliable(candidateSleep, !!manual, sleepInput) && sleepBelongsToDay(candidateSleep, today, !!manual)
        ? candidateSleep
        : null;

    // Overnight RMSSD + RHR + respiratory rate within the detected sleep window.
    let rmssd: number | null = null;
    let rhr: number | null = null;
    let resp: number | null = null;
    let spo2: number | null = null;
    let skinTempC: number | null = null;
    const overnightMask = sleep
      ? buildSleepEpochMask(sleep, independentSleepQuality(sleepInput))
      : [];
    const scoredNightHr = sleep
      ? maskHrSamplesToStableEpochs(
          nightHr.filter((s) => s.ts >= sleep.startTs && s.ts < sleep.endTs),
          sleep,
          overnightMask,
        )
      : [];
    if (sleep) {
      const vitals = computeOvernightVitals(scoredNightHr, sleep, overnightMask);
      rmssd = vitals.rmssd;
      rhr = vitals.rhr;
      resp = vitals.resp;
    }
    const rawVitalWindow = sleep;
    if (rawVitalWindow) {
      const rawVitals = averageRawVitals(
        await getRawVitalSamplesBetween(rawVitalWindow.startTs - 30 * 60000, rawVitalWindow.endTs + 30 * 60000),
      );
      spo2 = rawVitals.spo2;
      skinTempC = rawVitals.skinTempC;
    }

    // Baselines from prior days (exclude today).
    const recent = (await getRecentDailyMetrics(30)).filter((d) => d.day !== today);

    // Sleep Debt: rolling deficit over the trailing nights (needed − asleep),
    // Use each night's debt-free requirement so carried debt is accumulated once.
    const debtNights = recent
      .filter(isUsableDebtNight)
      .slice(0, 14)
      .reverse() // oldest → newest for the rolling carry
      .map((d) => ({ neededMin: debtAccrualTarget(d), asleepMin: d.sleepMin as number }));
    const accruedDebtMin = sleepDebt(debtNights);
    await this.autoDetectNapsForDay(sod, now, sleep);
    const completedLoadWindow = sleepNeedLoadWindow(recent, sleep, sod);
    const completedStrain = await strainBetween(completedLoadWindow.startTs, completedLoadWindow.endTs, profile);
    const completedNapMin = dedupedNapCreditMin(
      await listNapsBetween(completedLoadWindow.startTs, completedLoadWindow.endTs),
      completedLoadWindow.startTs,
      completedLoadWindow.endTs,
    );
    const napMin = dedupedNapCreditMin(await listNapsBetween(sod, now), sod, now);
    const need = computeSleepNeed({
      baselineMin: personalSleepBaseline(recent),
      recentStrain: completedStrain,
      accruedDebtMin,
      napMin: completedNapMin,
    });
    if (sleep) applySleepNeed(sleep, need);
    const tonightDebtMin = sleep
      ? sleepDebt([
          ...debtNights,
          {
            neededMin: Math.max(0, need.baselineMin + need.strainMin - need.napMin),
            asleepMin: sleep.asleepMin,
          },
        ].slice(-14))
      : accruedDebtMin;
    const tonightNeed = computeSleepNeed({
      baselineMin: personalSleepBaseline(recent),
      recentStrain: strain,
      accruedDebtMin: tonightDebtMin,
      napMin,
    });
    const captureSleep = candidateSleep ?? sleep;
    const captureEvidence = captureSleep
      ? sleepResultCaptureEvidence(captureSleep)
      : sleepInputCaptureEvidence(sleepInput, captureWindowMin);
    const captureTrustEvidence = captureSleep ?? sleepCaptureEvidenceAsSleepEvidence(captureEvidence);
    const sleepCoveragePct = captureSleep
      ? Math.round((captureSleep.signalMin / Math.max(1, captureSleep.inBedMin)) * 100)
      : Math.round((nightPerMin.length / captureWindowMin) * 100);
    const boundedSleepCoveragePct = Math.max(0, Math.min(100, sleepCoveragePct));
    const captureNightHr = captureSleep ? nightHr.filter((s) => s.ts >= captureSleep.startTs && s.ts < captureSleep.endTs) : nightHr;
    const captureConfidence = sleepConfidence(captureEvidence.signalMin, boundedSleepCoveragePct, !!manual, captureTrustEvidence);
    const sleepCapture: AppState['sleepCapture'] = {
      ...captureEvidence,
      coveragePct: boundedSleepCoveragePct,
      rrCount: captureNightHr.reduce((a, s) => a + s.rr.length, 0),
      confidence: captureConfidence,
      source: captureSleep?.source ?? null,
      note: sleepCaptureNote({
        hasSleep: !!sleep,
        hasCandidate: !!candidateSleep,
        manual: !!manual,
        signalMin: captureEvidence.signalMin,
        coveragePct: boundedSleepCoveragePct,
        evidence: captureTrustEvidence,
      }),
    };
    let sleepScoreResult: SleepScore | null = null;

    // Sleep regularity / consistency over stored windows (prior nights + tonight).
    const priorWindows = recent
      .filter(isUsableSleepTrendNight)
      .map((d) => ({ startTs: d.sleepStart as number, endTs: d.sleepEnd as number }));
    if (sleep) priorWindows.push({ startTs: sleep.startTs, endTs: sleep.endTs });
    const sleepReg = sleepRegularity(priorWindows);
    const consistency = sleepConsistency(priorWindows);

    // ---- WHOOP-style Sleep Stress (0-3) over time-in-bed, from R-R + HR ----
    const sleepStressResult = sleep ? buildSleepStress(scoredNightHr, sleep.inBedMin) : null;

    // ---- WHOOP-style Sleep Performance composite + 4 contributors ----
    let sleepPerformanceResult: SleepPerformance | null = null;
    let sleepDetail: SleepDetail | null = null;
    let stagesTrusted = false;
    if (sleep) {
      const scored = buildSleepDetail({
        sleep,
        need,
        consistencyPct: consistency?.score ?? null,
        sleepStress: sleepStressResult,
        manual: !!manual,
        includeQualityScore: true,
      });
      sleepPerformanceResult = scored.performance;
      sleepScoreResult = scored.score;
      sleepDetail = scored.detail;
      stagesTrusted = scored.stagesTrusted;
    } else if (manual) {
      sleepDetail = manualTimingOnlyDetail(manual.startTs, manual.endTs);
    }
    const trustedRecoveryNights = recent.filter(isUsableRecoveryNight).slice(0, 30);
    const toDayValues = (pick: (d: DailyMetricRow) => number | null) =>
      trustedRecoveryNights
        .filter((d) => pick(d) != null)
        .map((d) => ({ day: epochDay(Date.parse(`${d.day}T00:00:00`)), value: pick(d) as number }));
    const rmssdSamples = toDayValues((d) => d.rmssd);
    const rhrSamples = toDayValues((d) => d.rhr);
    const respSamples = toDayValues((d) => d.resp);
    const skinTempSamples = toDayValues((d) => d.skinTempC);

    const baselineOptions = recoveryBaselineOptions();
    const rmssdBaseline = robustBaseline(rmssdSamples, baselineOptions).value;
    const rhrBaseline = robustBaseline(rhrSamples, baselineOptions).value;
    const respBaseline = robustBaseline(respSamples, baselineOptions).value;
    const skinTempBaseline = robustBaseline(skinTempSamples, baselineOptions).value;
    const rmssdSd = robustStdev(rmssdSamples, baselineOptions) || 1;
    const rhrSd = robustStdev(rhrSamples, baselineOptions) || 1;
    const respSd = robustStdev(respSamples, baselineOptions) || 1;
    const skinTempSd = Math.max(0.2, robustStdev(skinTempSamples, baselineOptions) || 0);

    let recovery: number | null = null;
    let recoveryParts: AppState['recoveryParts'] = null;
    const recoveryResult = recoveryEstimate({
      rmssd,
      rhr,
      resp,
      skinTempC,
      sleepPerformance: recoverySleepEvidence(sleep, need.neededMin),
      rmssdSamples,
      rhrSamples,
      respSamples,
      skinTempSamples,
    });
    recovery = applyRecoveryConfidenceCap(recoveryResult.score, sleepDetail);
    recoveryParts = recoveryResult.parts;

    // ---- Oura-style insights (HR/R-R only) ----
    const hrvBal = hrvBalance(rmssdSamples);
    const illness = illnessRisk({
      rhr: { value: rhr, baseline: rhrBaseline, sd: rhrSd },
      hrv: { value: rmssd, baseline: rmssdBaseline, sd: rmssdSd },
      respiratory: { value: resp, baseline: respBaseline, sd: respSd },
      skinTemperature: { value: skinTempC, baseline: skinTempBaseline, sd: skinTempSd },
    });
    const recoveryHistory = [...recent].reverse().map((d) => d.recovery).filter((v): v is number => v != null);
    if (recovery != null) recoveryHistory.push(recovery);
    const resilienceResult = resilience(recoveryHistory);
    const cardioAgeResult = cardioAge({ age: profile.ageYears, rhr, rmssd });

    // ---- Garmin-style synthesis: Training Readiness (built on Recovery) ----
    const sleepPerfPct = sleepPerformanceResult?.score ?? null;
    const energySleepPerfPct = sleepTrustTier(sleepDetail) === 'low' ? null : sleepPerfPct;
    const trimps = this.getState().cardio.filter((c) => c.trimp != null).map((c) => ({ ts: c.startTs, trimp: c.trimp as number }));
    const loadStatus = trainingLoad(trimps, now);
    const trainingReadiness = computeTrainingReadiness({
      recovery,
      sleepPerformance: sleepPerfPct,
      sleepDebtMin: tonightNeed.debtMin,
      hrvBalance: hrvBal?.score ?? null,
      acwr: loadStatus.acwr,
      sleepConfidence: sleepDetail?.confidence ?? null,
      sleepCoveragePct: sleepDetail?.coveragePct ?? null,
      sleepSignalMin: sleepDetail?.signalMin ?? null,
    });
    const energyReserve = computeEnergyReserve({
      recovery,
      sleepPerformance: energySleepPerfPct,
      sleepDebtMin: tonightNeed.debtMin,
      hrvBalance: hrvBal?.score ?? null,
      strain,
      stress: this.getState().liveStress ?? storedStress,
    });

    const row: DailyMetricRow = {
      day: today,
      recovery,
      rmssd,
      rhr,
      resp,
      spo2,
      skinTempC,
      sleepMin: sleep?.asleepMin ?? null,
      sleepPerf: sleepPerformanceResult ? sleepPerformanceResult.score / 100 : (sleep?.performance ?? null),
      strain,
      steps: bestSteps,
      stepSource: bestSteps != null ? 'band' : null,
      sleepStart: sleep?.startTs ?? manual?.startTs ?? null,
      sleepEnd: sleep?.endTs ?? manual?.endTs ?? null,
      deepMin: sleep && stagesTrusted ? sleep.stages.deep : null,
      remMin: sleep && stagesTrusted ? sleep.stages.rem : null,
      lightMin: sleep && stagesTrusted ? sleep.stages.light : null,
      awakeMin: sleep && stagesTrusted ? sleep.stages.awake : null,
      sleepDetail,
      updatedAt: now,
    };
    await upsertDailyMetric(row);
    this.setState({
      today: row,
      lastSleep: sleep,
      sleepNeed: tonightNeed,
      sleepScore: sleepScoreResult,
      sleepReg,
      sleepConsistency: consistency,
      sleepSchedule: inferSleepSchedule([row, ...recent]),
      sleepStress: sleepStressResult,
      sleepPerformance: sleepPerformanceResult,
      sleepCapture,
      storedStress,
      steps: bestSteps,
      stepSource: bestSteps != null ? 'band' : null,
      trainingReadiness,
      energyReserve,
      recoveryParts,
      recoveryBaseline: recoveryResult.baseline,
      hrvBal,
      illness,
      resilience: resilienceResult,
      cardioAge: cardioAgeResult,
      recentDays: await getRecentDailyMetrics(30),
      cardio: await listCardio(CARDIO_RECENT_LIMIT),
    });
  }

  // ---- Health Monitor ----
  /** WHOOP-style five-vital health monitor (today's values vs personal ranges). */
  healthMonitor = (): HealthMonitorResult => {
    const today = this.getState().today;
    const recent = this.getState().recentDays.filter((d) => d.day !== today?.day);
    const hist = (pick: (d: DailyMetricRow) => number | null): number[] =>
      recent.map(pick).filter((v): v is number => v != null);
    return computeHealthMonitor({
      rhr: { value: today?.rhr ?? null, history: hist((d) => d.rhr) },
      hrv: { value: today?.rmssd ?? null, history: hist((d) => d.rmssd) },
      respiratory: { value: today?.resp ?? null, history: hist((d) => d.resp) },
      spo2: { value: today?.spo2 ?? null, history: hist((d) => d.spo2) },
      skinTemp: { value: today?.skinTempC ?? null, history: hist((d) => d.skinTempC) },
    });
  };

  // ---- Stress Monitor ----
  /**
   * Daytime stress over today, sampled in ~5-minute windows from the stored R-R
   * stream (Baevsky SI → 0–3). Mirrors WHOOP's day-stress trend graph.
   */
  stressSeries = async (): Promise<Array<{ tsMs: number; score: number }>> => {
    const sod = startOfDayMs(Date.now());
    const rows = await getHrSamplesBetween(sod, Date.now());
    return stressSeriesFromRows(rows);
  };

  // ---- Trends / history ----
  /** Load up to `days` of daily metrics (oldest→newest) for the Trends screen. */
  loadHistory = async (days: number): Promise<DailyMetricRow[]> => {
    const rows = await getRecentDailyMetrics(days);
    return rows.slice().reverse(); // chronological
  };

  loadDay = async (day: string): Promise<DailyMetricRow | null> => getDailyMetric(day);

  loadActivitiesForDay = async (day: string): Promise<CardioRow[]> => {
    const start = dayStartFromKey(day);
    return listCardioStartingBetween(start, localDayStartOffset(start, 1));
  };

  // ---- Sleep goal (Get By / Perform / Peak) ----
  setSleepGoal = async (goal: number): Promise<void> => {
    await kvSet('sleepGoal', String(goal));
    this.setState({ sleepGoal: goal });
  };

  // ---- Journal ----
  journalForDay = async (day: string) => listJournal(day);

  journalHistory = async (days = 60) => listJournalSince(dayKey(addDays(Date.now(), -(Math.max(1, days) - 1))));

  /** Today's HR-zone breakdown for the Strain screen. */
  todayZones = async () => {
    const profile = this.getState().profile;
    const sod = startOfDayMs(Date.now());
    const dayHr = await getHrSamplesBetween(sod, Date.now());
    const perMin = perMinuteHr(dayHr).map((p) => ({ hr: p.hr, minutes: 1 }));
    return hrZones(perMin, profile);
  };

  /**
   * Suggested (auto-detected) activities from today's HR that aren't already
   * logged — the user confirms before they're saved (no false auto-logging).
   */
  suggestedActivities = async (): Promise<DetectedActivity[]> => {
    const sod = startOfDayMs(Date.now());
    const rows = await getHrSamplesBetween(sod, Date.now());
    const perMin = perMinuteHr(rows).map((p) => ({ tsMs: p.tsMs, hr: p.hr }));
    const existing = this.getState().cardio.filter((c) => c.startTs >= sod);
    const detected = detectActivities(perMin, this.getState().profile, existing);
    return Promise.all(detected.map((d) => this.enrichDetectedActivity(d)));
  };

  private async enrichDetectedActivity(d: DetectedActivity): Promise<DetectedActivity> {
    const estimate = estimateBandStepsFromCounters(
      await stepRowsForRange(d.startTs, d.endTs),
      this.getState().bandStepDivisor,
      { countFromTs: d.startTs, countToTs: d.endTs },
    );
    const steps = bandStepsAreTrusted(estimate, this.getState().bandStepDivisor) ? estimate?.steps ?? null : null;
    if (steps == null || steps <= 0) return { ...d, label: 'Workout', steps: null, cadenceSpm: null };
    const minutes = Math.max(1 / 60, (d.endTs - d.startTs) / 60000);
    const cadenceSpm = Math.round(steps / minutes);
    return {
      ...d,
      label: cadenceSpm >= 130 ? 'Running' : cadenceSpm >= 60 ? 'Walking' : 'Workout',
      steps,
      cadenceSpm,
    };
  }

  /**
   * Weekly Intensity Minutes (WHO guideline): minutes of moderate (HR zones 2–3)
   * and vigorous (zones 4–5) activity over the last 7 days, from the stored HR
   * stream. Vigorous counts double toward the goal (Garmin/WHO convention).
   */
  weeklyIntensity = async (): Promise<{ moderate: number; vigorous: number; total: number; goal: number }> => {
    const profile = this.getState().profile;
    const now = Date.now();
    const rows = await getHrSamplesBetween(now - 7 * 86400000, now);
    const perMin = perMinuteHr(rows).map((p) => ({ hr: p.hr, minutes: 1 }));
    const zones = hrZones(perMin, profile);
    const moderate = zones.filter((z) => z.zone >= 2 && z.zone <= 3).reduce((a, z) => a + z.minutes, 0);
    const vigorous = zones.filter((z) => z.zone >= 4).reduce((a, z) => a + z.minutes, 0);
    return { moderate, vigorous, total: moderate + vigorous * 2, goal: 150 };
  };

  /** HR-zone breakdown + per-minute HR for one logged activity (detail screen). */
  activityDetail = async (
    startTs: number,
    endTs: number,
  ): Promise<{ zones: ReturnType<typeof hrZones>; hr: number[] }> => {
    const profile = this.getState().profile;
    const rows = await getHrSamplesBetween(startTs, endTs);
    const perMin = perMinuteHr(rows);
    const zones = hrZones(perMin.map((p) => ({ hr: p.hr, minutes: 1 })), profile);
    return { zones, hr: perMin.map((p) => Math.round(p.hr)) };
  };

  /** Cumulative strain over today, for the WHOOP-style strain curve. */
  todayStrainCurve = async (): Promise<Array<{ tsMs: number; strain: number }>> => {
    const profile = this.getState().profile;
    const sod = startOfDayMs(Date.now());
    const dayHr = await getHrSamplesBetween(sod, Date.now());
    const perMin = perMinuteHr(dayHr);
    const out: Array<{ tsMs: number; strain: number }> = [];
    let cumLoad = 0;
    for (const p of perMin) {
      cumLoad += edwardsTrimp([{ hr: p.hr, minutes: 1 }], profile);
      out.push({ tsMs: p.tsMs, strain: strainFromLoad(cumLoad) });
    }
    return out;
  };

  /** Irregular-rhythm (AFib) screen from last night's resting R-R intervals. */
  rhythmScreen = async (): Promise<RhythmResult> => {
    const sleep = this.getState().lastSleep;
    const now = Date.now();
    const from = sleep ? sleep.startTs : startOfDayMs(now) - 4 * 3600 * 1000;
    const to = sleep ? sleep.endTs + 60000 : now;
    const rows = await getHrSamplesBetween(from, to);
    return rhythmScreen(rows.flatMap((r) => r.rr));
  };

  /** Per-minute HR across last night's detected sleep window, for the graph. */
  lastNightHr = async (): Promise<number[]> => {
    const sleep = this.getState().lastSleep;
    if (!sleep) return [];
    const rows = await getHrSamplesBetween(sleep.startTs, sleep.endTs);
    return perMinuteHr(rows).map((p) => Math.round(p.hr));
  };
}

function perMinuteHr(samples: { ts: number; bpm: number }[]): { tsMs: number; hr: number }[] {
  const buckets = new Map<number, { sum: number; n: number }>();
  for (const s of samples) {
    if (!isPlausibleHeartRate(s.bpm) || !Number.isFinite(s.ts) || s.ts <= 0) continue;
    const minute = Math.floor(s.ts / 60000);
    const b = buckets.get(minute) ?? { sum: 0, n: 0 };
    b.sum += s.bpm;
    b.n += 1;
    buckets.set(minute, b);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([minute, b]) => ({ tsMs: minute * 60000, hr: b.sum / b.n }));
}

/** Sleep scoring uses direct firmware/GATT HR, never autocorrelation-estimated PPG HR. */
function sleepDetectionHrSamples(samples: HrSampleRow[]): HrSampleRow[] {
  return samples.filter(isDirectSleepHeartRateSample);
}

function directPhysiologyHrSamples(samples: HrSampleRow[]): HrSampleRow[] {
  return samples.filter(isDirectSleepHeartRateSample);
}

async function stepRowsForRange(startTs: number, endTs: number): Promise<import('../db/database').StepSampleRow[]> {
  if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || endTs <= startTs) return [];
  const [previous, rows] = await Promise.all([
    getStepSampleBefore(startTs).catch(() => null),
    getStepSamplesBetween(startTs, endTs).catch(() => []),
  ]);
  return previous ? [previous, ...rows] : rows;
}

async function strainBetween(fromTs: number, toTs: number, profile: UserProfile): Promise<number | null> {
  if (toTs <= fromTs) return null;
  const rows = await getHrSamplesBetween(fromTs, toTs);
  const samples = perMinuteHr(rows).map((point) => ({ hr: point.hr, minutes: 1 }));
  if (!samples.length) return null;
  return strainFromLoad(edwardsTrimp(samples, profile));
}

async function buildSleepInput(
  nightPerMin: Array<{ tsMs: number; hr: number }>,
  winStart: number,
  winEnd: number,
  hrRows: HrSampleRow[] = [],
): Promise<SleepMinute[]> {
  const sleepStates = await getSleepStateSamplesBetween(winStart, winEnd).catch(() => []);
  const imuRows = await getMotionSamplesBetween(winStart, winEnd).catch(() => []);
  const stepRows = await getStepSamplesBetween(winStart, winEnd).catch(() => []);
  const hrByMinute = new Map(nightPerMin.map((p) => [Math.floor(p.tsMs / 60000), p.hr]));
  const rmssdByMinute = perMinuteRmssd(hrRows);
  const stateByMinute = minuteMode(sleepStates, (s) => s.state);
  const motionByMinute = sleepMotionByMinute(stepRows);
  for (const [minute, intensity] of imuMotionByMinute(imuRows)) {
    motionByMinute.set(minute, Math.max(motionByMinute.get(minute) ?? 0, intensity));
  }
  const minutes = new Set<number>([
    ...hrByMinute.keys(),
    ...stateByMinute.keys(),
    ...motionByMinute.keys(),
  ]);

  return [...minutes]
    .sort((a, b) => a - b)
    .map((minute) => {
      return {
        ts: minute * 60000,
        hr: hrByMinute.get(minute) ?? null,
        motion: motionByMinute.get(minute) ?? null,
        rmssd: rmssdByMinute.get(minute) ?? null,
        bandSleepState: stateByMinute.get(minute) ?? null,
      };
    });
}

function independentSleepQuality(samples: SleepMinute[]): IndependentSleepQuality[] {
  return samples.map((sample) => ({
    startTs: sample.ts,
    endTs: sample.ts + 60000,
    motion: sample.motion,
    bandSleepState: sample.bandSleepState,
  }));
}

function imuMotionByMinute(rows: Array<{ ts: number; intensity: number }>): Map<number, number> {
  const buckets = new Map<number, number[]>();
  for (const row of rows) {
    if (!Number.isFinite(row.intensity) || row.intensity < 0 || row.intensity > 1) continue;
    const minute = Math.floor(row.ts / 60000);
    const values = buckets.get(minute) ?? [];
    values.push(row.intensity);
    buckets.set(minute, values);
  }

  const out = new Map<number, number>();
  for (const [minute, values] of buckets) {
    if (values.length < 5) continue;
    values.sort((a, b) => a - b);
    const p75 = values[Math.min(values.length - 1, Math.round((values.length - 1) * 0.75))] ?? 0;
    out.set(minute, p75);
  }
  return out;
}

function perMinuteRmssd(rows: HrSampleRow[]): Map<number, number> {
  const rowsByMinute = new Map<number, HrSampleRow[]>();
  for (const row of rows) {
    const minute = Math.floor(row.ts / 60000);
    const minuteRows = rowsByMinute.get(minute) ?? [];
    minuteRows.push(row);
    rowsByMinute.set(minute, minuteRows);
  }
  const out = new Map<number, number>();
  for (const [minute, minuteRows] of rowsByMinute) {
    const hrv = computeHrvSegments(contiguousRrSegments(minuteRows));
    if (hrv && hrv.rmssd >= 5 && hrv.rmssd <= 180) out.set(minute, hrv.rmssd);
  }
  return out;
}

function sleepMotionByMinute(rows: Array<{ ts: number; counter: number; activityClass: number | null }>): Map<number, number> {
  const out = new Map<number, number>();
  const mark = (minute: number, motion: number) => {
    out.set(minute, Math.max(out.get(minute) ?? 0, motion));
  };

  const sorted = [...rows].sort((a, b) => a.ts - b.ts);
  for (const row of sorted) {
    const minute = Math.floor(row.ts / 60000);
    if (row.activityClass === 0) mark(minute, 0);
    else if (row.activityClass === 1 || row.activityClass === 2) mark(minute, 1);
  }

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    const gapMin = Math.max(1, Math.round((cur.ts - prev.ts) / 60000));
    if (gapMin > 30) continue;

    const delta = cur.counter - prev.counter;
    if (delta <= 0) continue;

    const stepRate = delta / gapMin;
    if (stepRate < 1 && !(delta >= 10 && gapMin <= 15)) continue;

    const motion = stepRate >= 8 ? 1 : 0.55;
    const startMinute = Math.floor(prev.ts / 60000) + 1;
    const endMinute = Math.floor(cur.ts / 60000);
    const fillInterval = gapMin <= 8 || stepRate >= 5;
    if (fillInterval) {
      for (let minute = startMinute; minute <= endMinute; minute += 1) mark(minute, motion);
    } else {
      mark(endMinute, motion);
    }
  }

  return out;
}

function minuteMode<T extends { ts: number }>(rows: T[], pick: (row: T) => number): Map<number, number> {
  const buckets = new Map<number, Map<number, number>>();
  for (const row of rows) {
    const value = pick(row);
    if (!Number.isFinite(value)) continue;
    const minute = Math.floor(row.ts / 60000);
    const counts = buckets.get(minute) ?? new Map<number, number>();
    counts.set(value, (counts.get(value) ?? 0) + 1);
    buckets.set(minute, counts);
  }
  const out = new Map<number, number>();
  for (const [minute, counts] of buckets) {
    let bestValue: number | null = null;
    let bestCount = -1;
    for (const [value, count] of counts) {
      if (count > bestCount) {
        bestValue = value;
        bestCount = count;
      }
    }
    if (bestValue != null) out.set(minute, bestValue);
  }
  return out;
}

function splitContiguousMinutes(
  rows: Array<{ tsMs: number; hr: number }>,
  maxGapMin: number,
): Array<Array<{ tsMs: number; hr: number }>> {
  if (!rows.length) return [];
  const out: Array<Array<{ tsMs: number; hr: number }>> = [];
  let cur: Array<{ tsMs: number; hr: number }> = [];
  for (const row of rows) {
    const prev = cur[cur.length - 1];
    if (prev && row.tsMs - prev.tsMs > maxGapMin * 60000) {
      out.push(cur);
      cur = [];
    }
    cur.push(row);
  }
  if (cur.length) out.push(cur);
  return out;
}

function napIsReliable(nap: SleepResult): boolean {
  const coveragePct = Math.round((nap.signalMin / Math.max(1, nap.inBedMin)) * 100);
  const corroborationPct = sleepEvidencePct(nap);
  const hasMotionProof = nap.motionMin >= 12 && corroborationPct >= 20;
  return (
    nap.inBedMin >= 20 &&
    nap.inBedMin <= 90 &&
    nap.asleepMin >= 15 &&
    nap.signalMin >= 20 &&
    coveragePct >= 60 &&
    hasMotionProof &&
    nap.efficiency >= 0.6
  );
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function overlapMinutes(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  const ms = Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
  return Math.round(ms / 60000);
}

function averageRawVitals(rows: RawVitalSampleRow[]): { spo2: number | null; skinTempC: number | null } {
  const MIN_RAW_VITAL_SAMPLES = 6;
  const spo2 = rows.map((r) => r.spo2).filter((v): v is number => v != null && v >= 70 && v <= 100);
  // The v18 register remains populated off wrist (captures include room-like
  // values near 22 C). Only the worn-skin band may feed overnight recovery.
  const skin = rows.map((r) => r.skinTempC).filter((v): v is number => v != null && v >= 28 && v <= 40);
  const robustAverage = (values: number[], decimals = 0): number | null => {
    if (values.length < MIN_RAW_VITAL_SAMPLES) return null;
    const sorted = values.slice().sort((a, b) => a - b);
    const trim = sorted.length >= 12 ? Math.floor(sorted.length * 0.1) : 0;
    const trimmed = sorted.slice(trim, sorted.length - trim);
    const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
    const factor = 10 ** decimals;
    return Math.round(avg * factor) / factor;
  };
  return {
    spo2: robustAverage(spo2),
    skinTempC: robustAverage(skin, 1),
  };
}

type SleepConfidence = 'high' | 'medium' | 'low';

const MIN_VITAL_SIGNAL_MIN = 240;
const MIN_VITAL_COVERAGE_PCT = 70;
const MIN_SLEEP_SCORE_SIGNAL_MIN = 240;
const MIN_SLEEP_SCORE_COVERAGE_PCT = 70;
// WHOOP withholds Recovery for the first four days; score from the next
// trustworthy night once four prior robust baseline nights are available.
const MIN_RECOVERY_BASELINE_NIGHTS = 4;
const FULL_RECOVERY_BASELINE_NIGHTS = 28;
const MIN_RMSSD_BASELINE_SD_MS = 8;
const MIN_RHR_BASELINE_SD_BPM = 3;
const MIN_RESP_BASELINE_SD_RPM = 0.5;

function recoveryBaselineOptions() {
  return {
    halfLifeDays: 7,
    method: 'mad' as const,
    minimumSamples: MIN_RECOVERY_BASELINE_NIGHTS,
    calibrationSamples: FULL_RECOVERY_BASELINE_NIGHTS,
    windowDays: null,
  };
}

/** A logged window is useful for schedule learning and history, but it must not
 * create invented sleep minutes, stages, recovery, or overnight vitals. */
function manualTimingOnlyDetail(startTs: number, endTs: number): SleepDetail {
  return {
    performance: null,
    hoursVsNeeded: null,
    needMin: null,
    baselineMin: null,
    napMin: null,
    strainMin: null,
    debtMin: null,
    efficiency: null,
    consistency: null,
    restorativeMin: null,
    restorativePct: null,
    latencyMin: null,
    wakeEvents: null,
    inBedMin: Math.max(1, Math.round((endTs - startTs) / 60000)),
    stressHigh: null,
    stressMed: null,
    stressLow: null,
    source: 'manual_duration',
    signalMin: 0,
    hrvMin: 0,
    motionMin: 0,
    stillMin: 0,
    movingMin: 0,
    sleepStateMin: 0,
    sleepStateWakeMin: 0,
    sleepStateStillMin: 0,
    sleepStateAsleepMin: 0,
    sleepStateUpMin: 0,
    coveragePct: 0,
    confidence: 'low',
  };
}

function applySleepNeed(sleep: SleepResult, need: SleepNeed): void {
  sleep.neededMin = need.neededMin;
  sleep.performance = Math.min(1, sleep.asleepMin / need.neededMin);
}

function isUsableDebtNight(day: DailyMetricRow): boolean {
  if (day.sleepMin == null) return false;
  return sleepTrustIsUsable(day);
}

/** Debt accrues against the debt-free requirement for that night. Stored
 * needMin already includes carried debt; feeding it back into the accumulator
 * would count yesterday's debt a second time on every following night. */
function debtAccrualTarget(day: DailyMetricRow): number {
  const detail = day.sleepDetail;
  if (detail?.baselineMin != null) {
    return Math.max(0, Math.round(detail.baselineMin + (detail.strainMin ?? 0) - (detail.napMin ?? 0)));
  }
  if (detail?.needMin != null) {
    return Math.max(0, Math.round(detail.needMin - (detail.debtMin ?? 0)));
  }
  return 480;
}

/**
 * A personal sleep baseline should be learned from enough credible, well-
 * recovered nights, not from every night someone happened to spend in bed.
 * This lets the need adapt to the wearer without normalising a short-sleep run.
 */
function personalSleepBaseline(days: DailyMetricRow[]): number {
  const restorativeNights = days
    .filter((day) =>
      isUsableDebtNight(day) &&
      (day.recovery ?? 0) >= 67 &&
      (day.sleepMin ?? 0) >= 300 &&
      (day.sleepMin ?? 0) <= 11 * 60,
    )
    .map((day) => day.sleepMin as number)
    .slice(0, 28);
  if (restorativeNights.length < 5) return 480;
  const baseline = median(restorativeNights.slice().sort((a, b) => a - b));
  // Keep a personal baseline within a wellbeing-oriented, non-prescriptive
  // range. Debt remains a separate add-on, so it cannot be learned away.
  return Math.round(Math.max(420, Math.min(540, baseline)));
}

function isUsableSleepTrendNight(day: DailyMetricRow): boolean {
  if (day.sleepStart == null || day.sleepEnd == null) return false;
  return sleepTrustIsUsable(day);
}

/** Recovery baselines must come from nights with trustworthy sleep and vitals.
 * Including partial historical rows makes a single bad PPG/R-R decode redefine
 * the personal baseline and produces implausible green/red swings. */
function isUsableRecoveryNight(day: DailyMetricRow): boolean {
  return (
    day.rmssd != null &&
    day.rhr != null &&
    sleepTrustIsUsable(day)
  );
}

function sleepTrustIsUsable(day: DailyMetricRow): boolean {
  if (!hasValidatedSleepProvenanceFromDetail(day.sleepDetail)) return false;
  const tier = sleepTrustTier(day.sleepDetail);
  return tier === 'high' || tier === 'medium';
}

function hasValidatedSleepProvenanceFromDetail(detail: SleepDetail | null): boolean {
  return detail?.source === 'auto_hr' || detail?.source === 'manual_hr';
}

function sleepCoveragePct(sleep: SleepResult): number {
  return Math.round((sleep.signalMin / Math.max(1, sleep.inBedMin)) * 100);
}

function durationAwareSignalMin(
  inBedMin: number,
  maximum: number,
  minimum: number,
  coverageRatio: number,
): number {
  return Math.min(maximum, Math.max(minimum, Math.ceil(inBedMin * coverageRatio)));
}

function boundedSleepCoveragePct(sleep: SleepResult): number {
  return Math.max(0, Math.min(100, sleepCoveragePct(sleep)));
}

function buildSleepStress(samples: HrSampleRow[], inBedMin: number): SleepStress | null {
  const directSamples = directPhysiologyHrSamples(samples);
  const byMin = new Map<number, HrSampleRow[]>();
  for (const s of directSamples) {
    const m = Math.floor(s.ts / 60000);
    const b = byMin.get(m) ?? [];
    b.push(s);
    byMin.set(m, b);
  }
  const epochs: StressEpoch[] = [...byMin.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, minuteRows]) => ({
      hr: minuteRows.reduce((sum, row) => sum + row.bpm, 0) / minuteRows.length,
      rmssd: computeHrvSegments(contiguousRrSegments(minuteRows))?.rmssd ?? null,
    }));
  if (epochs.length < Math.max(60, Math.ceil(inBedMin * 0.8))) return null;
  return computeSleepStress(epochs, null, inBedMin);
}

function buildSleepDetail(input: {
  sleep: SleepResult;
  need: SleepNeed;
  consistencyPct: number | null;
  sleepStress: SleepStress | null;
  manual: boolean;
  includeQualityScore: boolean;
}): {
  detail: SleepDetail;
  performance: SleepPerformance;
  score: SleepScore | null;
  stagesTrusted: boolean;
  confidence: SleepConfidence;
  coveragePct: number;
} {
  const { sleep, need, consistencyPct, sleepStress, manual } = input;
  const coveragePct = boundedSleepCoveragePct(sleep);
  const confidence = sleepConfidence(sleep.signalMin, coveragePct, manual, sleep);
  const hoursVsNeededPct = clampPct(Math.round((sleep.asleepMin / need.neededMin) * 100));
  const efficiencyPct = clampPct(Math.round(sleep.efficiency * 100));
  const restorativePct = sleep.asleepMin > 0 ? Math.round((sleep.restorativeMin / sleep.asleepMin) * 100) : 0;
  const stagesTrusted = sleepStagesAreTrusted(sleep, confidence, coveragePct);
  const performance = computeSleepPerformance({
    hoursVsNeededPct,
    efficiencyPct,
    consistencyPct,
    highStressPct: sleepStress?.highPct ?? null,
    confidenceCapPct: sleepPerformanceCap(confidence, coveragePct, sleep),
  });
  const score = input.includeQualityScore && stagesTrusted
    ? computeSleepScore(sleep, {
        confidenceCapPct: sleepQualityCap(confidence, coveragePct, sleep),
      })
    : null;

  return {
    detail: {
      performance: performance.score,
      hoursVsNeeded: hoursVsNeededPct,
      needMin: need.neededMin,
      baselineMin: need.baselineMin,
      napMin: need.napMin,
      strainMin: need.strainMin,
      debtMin: need.debtMin,
      efficiency: efficiencyPct,
      consistency: consistencyPct,
      restorativeMin: stagesTrusted ? sleep.restorativeMin : null,
      restorativePct: stagesTrusted ? restorativePct : null,
      latencyMin: sleep.latencyMin,
      wakeEvents: sleep.wakeEvents,
      inBedMin: sleep.inBedMin,
      stressHigh: sleepStress?.highPct ?? null,
      stressMed: sleepStress?.medPct ?? null,
      stressLow: sleepStress?.lowPct ?? null,
      source: sleep.source,
      signalMin: sleep.signalMin,
      hrvMin: sleep.hrvMin,
      motionMin: sleep.motionMin,
      stillMin: sleep.stillMin,
      movingMin: sleep.movingMin,
      sleepStateMin: sleep.sleepStateMin,
      sleepStateWakeMin: sleep.sleepStateWakeMin,
      sleepStateStillMin: sleep.sleepStateStillMin,
      sleepStateAsleepMin: sleep.sleepStateAsleepMin,
      sleepStateUpMin: sleep.sleepStateUpMin,
      coveragePct,
      confidence,
      stageEstimate: sleep.hypnogram,
    },
    performance,
    score,
    stagesTrusted,
    confidence,
    coveragePct,
  };
}

function sleepStagesAreTrusted(
  _sleep: SleepResult,
  _confidence: SleepConfidence,
  _coveragePct: number,
): boolean {
  // Stages are inferred from HR/RR/motion, not a validated firmware stage
  // channel or PSG-labelled model. Keep them visible as estimates, but never
  // let them create a trusted restorative metric or stage-weighted score.
  return false;
}

function sleepIsReliable(sleep: SleepResult | null, manual: boolean, samples: SleepMinute[]): sleep is SleepResult {
  if (!sleep) return false;
  // A manually selected all-awake window is not sleep. Fail closed before any
  // coverage/provenance rule can turn its HR coverage into a reliable night.
  if (sleep.asleepMin <= 0) return false;
  if (!hasValidatedSleepProvenance(sleep)) return false;
  const requiredSignalMin = durationAwareSignalMin(sleep.inBedMin, MIN_SLEEP_SCORE_SIGNAL_MIN, 90, 0.7);
  if (manual) return sleep.signalMin >= requiredSignalMin && sleepCoveragePct(sleep) >= MIN_SLEEP_SCORE_COVERAGE_PCT;
  if (!autoSleepBoundariesCovered(sleep, samples)) return false;
  if (!sleepHasCorroboration(sleep)) return false;
  if (longAutoSleepNeedsCorroboration(sleep, manual)) return false;
  if (sleep.motionMin >= Math.max(30, sleep.inBedMin * 0.15)) {
    const stillPct = Math.round((sleep.stillMin / Math.max(1, sleep.inBedMin)) * 100);
    if (stillPct < 10 && sleep.movingMin > sleep.stillMin) return false;
  }
  return sleep.signalMin >= requiredSignalMin && sleepCoveragePct(sleep) >= MIN_SLEEP_SCORE_COVERAGE_PCT;
}

function sleepConfidence(
  signalMin: number,
  coveragePct: number,
  manual: boolean,
  evidence?: SleepEvidence | null,
): SleepConfidence {
  if ((evidence?.asleepMin ?? 0) <= 0) return 'low';
  const evidencePct = sleepEvidencePct(evidence);
  const corroborated = sleepHasCorroboration(evidence);
  const longUncorroboratedAuto = longAutoSleepNeedsCorroboration(evidence, manual);
  const inBedMin = evidence?.inBedMin ?? 0;
  const highSignalMin = inBedMin > 0 ? durationAwareSignalMin(inBedMin, 300, 90, 0.75) : 300;
  const mediumSignalMin = inBedMin > 0 ? durationAwareSignalMin(inBedMin, SLEEP_TRUST_LOW_SIGNAL_MIN, 60, 0.5) : SLEEP_TRUST_LOW_SIGNAL_MIN;
  if (autoSleepAtSafetyCeiling(evidence, manual)) return 'low';
  if (signalMin >= highSignalMin && coveragePct >= 85 && (manual || corroborated)) return 'high';
  if (longUncorroboratedAuto) return 'low';
  if (signalMin >= mediumSignalMin && coveragePct >= SLEEP_TRUST_LOW_COVERAGE_PCT) return 'medium';
  return 'low';
}

function sleepPerformanceCap(
  confidence: SleepConfidence,
  coveragePct: number,
  evidence?: SleepEvidence | null,
): number {
  if (confidence === 'high') return 100;
  if (confidence === 'medium') {
    const corroborated = sleepHasCorroboration(evidence);
    const ceiling = corroborated ? 92 : 86;
    return Math.max(70, Math.min(ceiling, coveragePct + (corroborated ? 15 : 8)));
  }
  return Math.max(45, Math.min(65, coveragePct + 20));
}

function sleepQualityCap(
  confidence: SleepConfidence,
  coveragePct: number,
  evidence?: SleepEvidence | null,
): number {
  if (confidence === 'high') return 99;
  const corroborated = sleepHasCorroboration(evidence);
  if (confidence === 'medium') return Math.max(72, Math.min(corroborated ? 90 : 84, coveragePct + (corroborated ? 12 : 6)));
  return Math.max(40, Math.min(62, coveragePct + 18));
}

function applyRecoveryConfidenceCap(recovery: number | null, detail: SleepDetail | null): number | null {
  if (recovery == null) return null;
  // A recovery score without sleep provenance is not interpretable. Keep the
  // value visibly conservative rather than allowing vitals alone to imply a
  // high-confidence overnight result.
  if (!detail || !hasValidatedSleepProvenanceFromDetail(detail) || detail.confidence == null || detail.coveragePct == null || detail.signalMin == null) {
    return Math.min(recovery, 50);
  }
  const tier = sleepTrustTier(detail);
  if (tier === 'low') return Math.min(recovery, 66);
  if (tier === 'medium') return Math.min(recovery, 85);
  return recovery;
}

type SleepEvidence = Pick<
  SleepResult,
  | 'inBedMin'
  | 'asleepMin'
  | 'motionMin'
  | 'stillMin'
  | 'movingMin'
  | 'sleepStateMin'
  | 'sleepStateWakeMin'
  | 'sleepStateStillMin'
  | 'sleepStateAsleepMin'
  | 'sleepStateUpMin'
>;

type SleepCaptureEvidence = {
  windowMin: number;
  asleepMin: number;
  signalMin: number;
  hrvMin: number;
  motionMin: number;
  stillMin: number;
  movingMin: number;
  sleepStateMin: number;
  sleepStateWakeMin: number;
  sleepStateStillMin: number;
  sleepStateAsleepMin: number;
  sleepStateUpMin: number;
};

function sleepResultCaptureEvidence(sleep: SleepResult): SleepCaptureEvidence {
  return {
    windowMin: sleep.inBedMin,
    asleepMin: sleep.asleepMin,
    signalMin: sleep.signalMin,
    hrvMin: sleep.hrvMin,
    motionMin: sleep.motionMin,
    stillMin: sleep.stillMin,
    movingMin: sleep.movingMin,
    sleepStateMin: sleep.sleepStateMin,
    sleepStateWakeMin: sleep.sleepStateWakeMin,
    sleepStateStillMin: sleep.sleepStateStillMin,
    sleepStateAsleepMin: sleep.sleepStateAsleepMin,
    sleepStateUpMin: sleep.sleepStateUpMin,
  };
}

function sleepInputCaptureEvidence(samples: SleepMinute[], windowMin: number): SleepCaptureEvidence {
  return {
    windowMin,
    asleepMin: 0,
    signalMin: samples.filter((s) => s.hr != null).length,
    hrvMin: samples.filter((s) => s.rmssd != null).length,
    motionMin: samples.filter((s) => s.motion != null).length,
    stillMin: samples.filter((s) => s.motion != null && s.motion < 0.2).length,
    movingMin: samples.filter((s) => s.motion != null && s.motion >= 0.4).length,
    sleepStateMin: samples.filter((s) => s.bandSleepState != null).length,
    sleepStateWakeMin: samples.filter((s) => s.bandSleepState === 0).length,
    sleepStateStillMin: samples.filter((s) => s.bandSleepState === 1).length,
    sleepStateAsleepMin: samples.filter((s) => s.bandSleepState === 2).length,
    sleepStateUpMin: samples.filter((s) => s.bandSleepState === 3).length,
  };
}

function sleepCaptureEvidenceAsSleepEvidence(evidence: SleepCaptureEvidence): SleepEvidence {
  return {
    inBedMin: evidence.windowMin,
    asleepMin: evidence.asleepMin,
    motionMin: evidence.motionMin,
    stillMin: evidence.stillMin,
    movingMin: evidence.movingMin,
    sleepStateMin: evidence.sleepStateMin,
    sleepStateWakeMin: evidence.sleepStateWakeMin,
    sleepStateStillMin: evidence.sleepStateStillMin,
    sleepStateAsleepMin: evidence.sleepStateAsleepMin,
    sleepStateUpMin: evidence.sleepStateUpMin,
  };
}

function recoveryEstimate(input: {
  rmssd: number | null;
  rhr: number | null;
  resp: number | null;
  skinTempC: number | null;
  sleepPerformance: number | null;
  rmssdSamples: Array<{ day: number; value: number }>;
  rhrSamples: Array<{ day: number; value: number }>;
  respSamples: Array<{ day: number; value: number }>;
  skinTempSamples: Array<{ day: number; value: number }>;
}): {
  score: number | null;
  parts: AppState['recoveryParts'];
  baseline: NonNullable<AppState['recoveryBaseline']>;
} {
  const { rmssd, rhr, resp, skinTempC, sleepPerformance, rmssdSamples, rhrSamples, respSamples, skinTempSamples } = input;
  const baselineOptions = recoveryBaselineOptions();
  const rmssdEstimate = robustBaseline(rmssdSamples, baselineOptions);
  const rhrEstimate = robustBaseline(rhrSamples, baselineOptions);
  const respEstimate = robustBaseline(respSamples, baselineOptions);
  const skinTempEstimate = robustBaseline(skinTempSamples, baselineOptions);
  const rmssdBaseline = rmssdEstimate.value;
  const rhrBaseline = rhrEstimate.value;
  const respBaseline = respEstimate.value;
  const skinTempBaseline = skinTempEstimate.value;
  const rmssdSd = Math.max(MIN_RMSSD_BASELINE_SD_MS, robustStdev(rmssdSamples, baselineOptions) || 0);
  const rhrSd = Math.max(MIN_RHR_BASELINE_SD_BPM, robustStdev(rhrSamples, baselineOptions) || 0);
  const respSd = Math.max(MIN_RESP_BASELINE_SD_RPM, robustStdev(respSamples, baselineOptions) || 0);
  const skinTempSd = Math.max(0.2, robustStdev(skinTempSamples, baselineOptions) || 0);
  const baseline = {
    hrvAccepted: rmssdEstimate.acceptedSamples,
    rhrAccepted: rhrEstimate.acceptedSamples,
    acceptedNights: Math.min(rmssdEstimate.acceptedSamples, rhrEstimate.acceptedSamples),
    requiredNights: MIN_RECOVERY_BASELINE_NIGHTS,
  };

  if (rmssd == null || rhr == null || !Number.isFinite(rmssd) || !Number.isFinite(rhr)) {
    return { score: null, parts: null, baseline };
  }

  if (
    rmssdEstimate.acceptedSamples >= MIN_RECOVERY_BASELINE_NIGHTS &&
    rhrEstimate.acceptedSamples >= MIN_RECOVERY_BASELINE_NIGHTS &&
    rmssdBaseline != null &&
    rhrBaseline != null
  ) {
    const r = computeRecovery({
      rmssd,
      rmssdBaseline,
      rmssdSd,
      restingHr: rhr,
      rhrBaseline,
      rhrSd,
      respiratoryRate: resp,
      respiratoryBaseline: respBaseline,
      respiratorySd: respSd,
      skinTemperature: skinTempC,
      skinTemperatureBaseline: skinTempBaseline,
      skinTemperatureSd: skinTempBaseline == null ? null : skinTempSd,
      sleepPerformance,
      baselineSampleCount: Math.min(rmssdEstimate.acceptedSamples, rhrEstimate.acceptedSamples),
      minimumBaselineSamples: MIN_RECOVERY_BASELINE_NIGHTS,
      calibrationSamples: FULL_RECOVERY_BASELINE_NIGHTS,
    });
    if (!r) return { score: null, parts: null, baseline };
    return {
      score: r.score,
      parts: {
        hrvSub: r.hrvSub,
        rhrSub: r.rhrSub,
        respSub: r.respSub,
        tempSub: r.tempSub,
        sleepSub: r.sleepSub,
        contributors: r.contributors,
        calibration: r.calibration,
      },
      baseline,
    };
  }

  // Until a personal baseline exists, showing a numerical readiness value would
  // be false precision. Sleep performance remains visible independently.
  return { score: null, parts: null, baseline };
}

function stressSeriesFromRows(rows: HrSampleRow[]): Array<{ tsMs: number; score: number }> {
  const WIN_MS = 5 * 60 * 1000;
  const buckets = new Map<number, number[]>();
  for (const r of rows) {
    const b = Math.floor(r.ts / WIN_MS);
    const arr = buckets.get(b) ?? [];
    arr.push(...r.rr);
    buckets.set(b, arr);
  }
  const out: Array<{ tsMs: number; score: number }> = [];
  for (const [b, rr] of [...buckets.entries()].sort((a, c) => a[0] - c[0])) {
    const s = computeStress(rr);
    if (s) out.push({ tsMs: b * WIN_MS, score: s.score });
  }
  return out;
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? (xs[mid] as number) : ((xs[mid - 1] as number) + (xs[mid] as number)) / 2;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function dayStartFromKey(day: string): number {
  return new Date(`${day}T00:00:00`).getTime();
}

function localDayStartOffset(fromTs: number, days: number): number {
  const date = new Date(fromTs);
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function localDayHour(fromDayTs: number, days: number, hour: number): number {
  const date = new Date(fromDayTs);
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.getTime();
}

function sleepNeedLoadWindow(
  recent: DailyMetricRow[],
  sleep: SleepResult | null,
  wakeDayStart: number,
): { startTs: number; endTs: number } {
  const endTs = sleep?.startTs ?? wakeDayStart;
  const priorWake = recent
    .filter(isUsableSleepTrendNight)
    .map((row) => row.sleepEnd as number)
    .filter((ts) => ts < endTs && endTs - ts <= 36 * 60 * 60 * 1000)
    .sort((a, b) => b - a)[0];
  return {
    startTs: priorWake ?? localDayStartOffset(wakeDayStart, -1),
    endTs,
  };
}

function sleepBelongsToDay(sleep: SleepResult, day: string, manual: boolean): boolean {
  return manual || dayKey(sleep.endTs) === day;
}

/** Sum nap credit over the union of intervals, so legacy overlapping rows can
 * never double-credit sleep need. Within an overlap, the strongest credit
 * density wins and the elapsed union remains the hard upper bound. */
function dedupedNapCreditMin(rows: CardioRow[], startTs: number, endTs: number): number {
  if (endTs <= startTs) return 0;
  const clipped = rows
    .filter((row) => row.source === 'nap' && row.startTs < endTs && row.endTs > startTs && row.endTs > row.startTs)
    .map((row) => ({
      row,
      startTs: Math.max(startTs, row.startTs),
      endTs: Math.min(endTs, row.endTs),
      rate: napCreditMin(row) / (row.endTs - row.startTs),
    }))
    .filter((item) => item.endTs > item.startTs && item.rate > 0);
  if (!clipped.length) return 0;
  const points = [...new Set([
    startTs,
    endTs,
    ...clipped.flatMap((item) => [item.startTs, item.endTs]),
  ])].sort((a, b) => a - b);
  let credit = 0;
  let coveredMs = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const segmentStart = points[i] as number;
    const segmentEnd = points[i + 1] as number;
    if (segmentEnd <= segmentStart) continue;
    const active = clipped.filter((item) => item.startTs < segmentEnd && item.endTs > segmentStart);
    if (!active.length) continue;
    coveredMs += segmentEnd - segmentStart;
    credit += Math.max(...active.map((item) => item.rate)) * (segmentEnd - segmentStart) / 60000;
  }
  return Math.max(0, Math.min(Math.floor(credit), Math.floor(coveredMs / 60000)));
}

function sleepCaptureNote(input: {
  hasSleep: boolean;
  hasCandidate?: boolean;
  manual: boolean;
  signalMin: number;
  coveragePct: number;
  evidence?: SleepEvidence | null;
}): string {
  const confidence = sleepConfidence(input.signalMin, input.coveragePct, input.manual, input.evidence);
  const vitalSignalMin = input.evidence?.inBedMin
    ? durationAwareSignalMin(input.evidence.inBedMin, MIN_VITAL_SIGNAL_MIN, 120, 0.7)
    : MIN_VITAL_SIGNAL_MIN;
  if (input.hasSleep && sleepStateWakeConflict(input.evidence) && !input.manual) {
    return 'Sleep is capped because decoded strap-state evidence is mostly wake; review the window after auto sync finishes.';
  }
  if (input.hasSleep && confidence === 'high') {
    return 'High-confidence sleep: HR coverage is strong and corroborated by still-worn band evidence.';
  }
  if (input.hasSleep && confidence === 'medium') {
    if (!sleepHasCorroboration(input.evidence) && !input.manual) {
      return 'Medium-confidence HR-only sleep estimate; still-worn corroboration is sparse, so the score is capped.';
    }
    return 'Medium-confidence sleep estimate; more synced coverage can still refine the score.';
  }
  if (!input.hasSleep && input.hasCandidate && sleepStateWakeConflict(input.evidence) && !input.manual) {
    return 'A possible sleep window was rejected because decoded strap-state evidence is mostly wake. Review the window or let auto sync finish before trusting it.';
  }
  if (!input.hasSleep && input.hasCandidate && longAutoSleepNeedsCorroboration(input.evidence, input.manual)) {
    return 'A long HR-only sleep window was found, but it needs independent band-motion corroboration before Pulse scores it as sleep.';
  }
  if (!input.hasSleep && input.hasCandidate && input.manual) {
    return 'Manual sleep window saved, but HR coverage is too sparse to score sleep, stages, vitals or recovery yet.';
  }
  if (!input.hasSleep && input.hasCandidate) {
    return 'Partial overnight sync found a possible sleep window, but coverage is too sparse to score sleep accurately yet.';
  }
  if (input.hasSleep && (input.signalMin < vitalSignalMin || input.coveragePct < MIN_VITAL_COVERAGE_PCT)) {
    return 'Partial history only; not enough synced overnight coverage to score vitals or recovery yet.';
  }
  if (input.hasSleep && input.signalMin >= 30) {
    return input.manual
      ? 'Sleep saved from your window with partial HR coverage.'
      : 'Sleep detected from partial synced overnight HR.';
  }
  if (input.hasSleep) {
    return 'Sleep saved from your window; HR coverage was too sparse for detailed stages.';
  }
  if (input.signalMin < 30) {
    return 'Not enough synced overnight HR samples yet.';
  }
  return 'HR samples were present, but no stable sleep window was found.';
}

function isHistoryDrainFrame(packetType: number): boolean {
  return (
    packetType === PacketType.HISTORICAL_DATA ||
    packetType === PacketType.METADATA ||
    packetType === PacketType.PUFFIN_METADATA
  );
}

function historyAckCursorKey(deviceId: string): string {
  return `historyAckCursor:${deviceId}`;
}

function commandResponseWaiterKey(sequence: number, command: number): string {
  return `${sequence}:${command}`;
}

async function loadHistoryAckEndKey(deviceId: string | null): Promise<string | null> {
  if (!deviceId) return null;
  const raw = await kvGet(historyAckCursorKey(deviceId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { endKey?: unknown };
    return typeof parsed.endKey === 'string' && /^[0-9a-f]+$/i.test(parsed.endKey) ? parsed.endKey : null;
  } catch {
    return null;
  }
}

function historyStopStatus(
  reason: 'complete' | 'timeout' | 'disconnect',
  sync: NonNullable<AppState['historySync']>,
  cursorAdvanced = false,
): string {
  const summary = `${sync.hrSamples} HR, ${sync.motionSamples} IMU, ${sync.stepSamples} step rows from ${sync.rawRecords} records`;
  if (reason === 'complete') {
    if (sync.rawRecords > 0 && !cursorAdvanced) return `Complete: replay acknowledged; ${summary}`;
    return sync.rawRecords > 0 ? `Complete: ${summary}` : 'Complete: no stored history returned';
  }
  if (reason === 'disconnect') {
    return sync.rawRecords > 0 ? `Disconnected after partial sync: ${summary}` : 'Disconnected before history arrived';
  }
  return sync.rawRecords > 0
    ? `Idle timeout after partial sync: ${summary}`
    : 'No history response before idle timeout';
}

function parseHistorySyncReport(raw: string | null): HistorySyncReport | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Partial<HistorySyncReport>;
    if (typeof r.status !== 'string') return null;
    return {
      status: r.status,
      rawRecords: safeInt(r.rawRecords),
      decodedRecords: safeInt(r.decodedRecords),
      hrSamples: safeInt(r.hrSamples),
      rrSamples: safeInt(r.rrSamples),
      stepSamples: safeInt(r.stepSamples),
      motionSamples: safeInt(r.motionSamples),
      rawSensorRecords: safeInt(r.rawSensorRecords),
      rawVitalSamples: safeInt(r.rawVitalSamples),
      rejectedRecords: safeInt(r.rejectedRecords),
      droppedImplausibleTs: safeInt(r.droppedImplausibleTs),
      versions: Array.isArray(r.versions) ? r.versions.filter((v): v is number => typeof v === 'number') : [],
      firstSampleTs:
        typeof r.firstSampleTs === 'number' && Number.isFinite(r.firstSampleTs) ? Math.round(r.firstSampleTs) : undefined,
      lastSampleTs:
        typeof r.lastSampleTs === 'number' && Number.isFinite(r.lastSampleTs) ? Math.round(r.lastSampleTs) : undefined,
      finishedTs: typeof r.finishedTs === 'number' ? r.finishedTs : undefined,
      reason: r.reason,
      mode: r.mode,
      durableChunks: r.durableChunks == null ? undefined : safeInt(r.durableChunks),
      acknowledgedChunks: r.acknowledgedChunks == null ? undefined : safeInt(r.acknowledgedChunks),
      cursorAdvanced: typeof r.cursorAdvanced === 'boolean' ? r.cursorAdvanced : undefined,
    };
  } catch {
    return null;
  }
}

function historySampleBounds(stats: HistoricalDecodeResult): Pick<HistorySyncReport, 'firstSampleTs' | 'lastSampleTs'> {
  let firstSampleTs = Number.POSITIVE_INFINITY;
  let lastSampleTs = Number.NEGATIVE_INFINITY;
  const visit = (ts: number) => {
    if (!Number.isFinite(ts)) return;
    firstSampleTs = Math.min(firstSampleTs, ts);
    lastSampleTs = Math.max(lastSampleTs, ts);
  };
  for (const sample of stats.hr) visit(sample.ts);
  for (const sample of stats.steps) visit(sample.ts);
  for (const sample of stats.sleepStates) visit(sample.ts);
  for (const sample of stats.motion) visit(sample.ts);
  for (const sample of stats.rawVitals) visit(sample.ts);
  if (!Number.isFinite(firstSampleTs) || !Number.isFinite(lastSampleTs)) return {};
  return { firstSampleTs, lastSampleTs };
}

function parseStrapAlarm(raw: string | null): StrapAlarmState {
  if (!raw) return initialState.strapAlarm;
  try {
    const parsed = JSON.parse(raw) as Partial<StrapAlarmState>;
    const wakeTs = typeof parsed.wakeTs === 'number' && Number.isFinite(parsed.wakeTs) ? Math.round(parsed.wakeTs) : null;
    const localMinuteOfDay =
      typeof parsed.localMinuteOfDay === 'number' && Number.isFinite(parsed.localMinuteOfDay)
        ? Math.max(0, Math.min(24 * 60 - 1, Math.round(parsed.localMinuteOfDay)))
        : wakeTs == null
          ? null
          : localAlarmMinuteOfDay(wakeTs);
    return {
      enabled: parsed.enabled === true,
      wakeTs,
      localMinuteOfDay,
      updatedAt: typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt) ? Math.round(parsed.updatedAt) : null,
      pendingWrite: parsed.pendingWrite === 'set' || parsed.pendingWrite === 'disable' ? parsed.pendingWrite : null,
    };
  } catch {
    return initialState.strapAlarm;
  }
}

function safeInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0;
}

function mergeHistoryStats(prev: HistoricalDecodeResult | null, next: HistoricalDecodeResult): HistoricalDecodeResult {
  if (!prev) {
    return {
      ...next,
      hr: dedupeHistoryRows(next.hr),
      steps: dedupeHistoryRows(next.steps),
      sleepStates: dedupeHistoryRows(next.sleepStates),
      motion: dedupeHistoryRows(next.motion),
      rawVitals: dedupeHistoryRows(next.rawVitals),
      versions: [...next.versions],
    };
  }
  const versions = new Set([...prev.versions, ...next.versions]);
  return {
    hr: dedupeHistoryRows([...prev.hr, ...next.hr]),
    steps: dedupeHistoryRows([...prev.steps, ...next.steps]),
    sleepStates: dedupeHistoryRows([...prev.sleepStates, ...next.sleepStates]),
    motion: dedupeHistoryRows([...prev.motion, ...next.motion]),
    rawVitals: dedupeHistoryRows([...prev.rawVitals, ...next.rawVitals]),
    records: prev.records + next.records,
    decodedRecords: prev.decodedRecords + next.decodedRecords,
    rejectedRecords: prev.rejectedRecords + next.rejectedRecords,
    droppedImplausibleTs: prev.droppedImplausibleTs + next.droppedImplausibleTs,
    v18Records: prev.v18Records + next.v18Records,
    v20Records: prev.v20Records + next.v20Records,
    v21Records: prev.v21Records + next.v21Records,
    v26Records: prev.v26Records + next.v26Records,
    rawSensorRecords: prev.rawSensorRecords + next.rawSensorRecords,
    versions: [...versions].sort((a, b) => a - b),
  };
}

function dedupeHistoryRows<T extends { ts: number }>(rows: T[]): T[] {
  const byTs = new Map<number, T>();
  for (const row of rows) byTs.set(row.ts, row);
  return [...byTs.values()].sort((a, b) => a.ts - b.ts);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export const appStore = new AppStore();
