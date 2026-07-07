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
  cmdEnterHighFreqSync,
  cmdEnableDeepStreamSequence,
  cmdExitHighFreqSync,
  cmdHistoricalDataResult,
  cmdSendHistoricalData,
  cmdDisableAlarm,
  cmdRunAlarm,
  cmdSetAlarmTime,
  cmdStopHaptics,
  parseHistoryMetadata,
  HistoryMetadata,
} from '../whoop/commands';
import { decodeWhoop5HistoryFrames, HistoricalDecodeResult } from '../whoop/historicalParse';
import {
  CardioRow,
  DailyMetricRow,
  HrSampleRow,
  RawVitalSampleRow,
  SleepDetail,
  getRawVitalSamplesBetween,
  getHrSamplesBetween,
  getRecentDailyMetrics,
  getSleepStateSamplesBetween,
  insertCardio,
  insertHrSample,
  insertRawVitalSample,
  insertSleepStateSample,
  insertStepSample,
  insertJournal,
  insertRawFrame,
  insertHistoryRecord,
  countHistoryRecords,
  getStepSamplesBetween,
  kvGet,
  kvSet,
  listCardio,
  listJournal,
  deleteCardio,
  pruneHrSamples,
  upsertDailyMetric,
} from '../db/database';
import { startBgLocation, stopBgLocation } from '../sensors/bgLocation';
import { isKeepAliveRunning, startKeepAlive, stopKeepAlive } from '../sensors/keepAlive';
import { pedometerAvailable, stepsToday, watchSteps } from '../sensors/steps';
import { DEFAULT_PROFILE, loadProfile, saveProfile } from '../db/profile';
import { computeHrv } from '../metrics/hrv';
import { emaBaseline, stdev } from '../metrics/ema';
import { computeRecovery } from '../metrics/recovery';
import { computeSleep, computeSleepNeed, durationOnlySleep, SleepMinute, SleepNeed, SleepResult } from '../metrics/sleep';
import { computeSleepScore, SleepScore } from '../metrics/sleepScore';
import { sleepRegularity, SleepRegularity } from '../metrics/sleepRegularity';
import { sleepConsistency, SleepConsistency } from '../metrics/sleepConsistency';
import { sleepDebt } from '../metrics/sleepDebt';
import { computeSleepStress, SleepStress, StressEpoch } from '../metrics/sleepStress';
import { computeSleepPerformance, SleepPerformance } from '../metrics/sleepPerformance';
import { longAutoSleepNeedsCorroboration, sleepEvidencePct, sleepHasCorroboration, sleepStateWakeConflict } from '../metrics/sleepEvidence';
import { edwardsTrimp, hrZones, strainFromLoad, totalTrimp, UserProfile } from '../metrics/strain';
import { kcalPerMinute, totalKcal } from '../metrics/calories';
import { respiratoryRate } from '../metrics/respiratory';
import { computeStress } from '../metrics/stress';
import { computeHealthMonitor, HealthMonitorResult } from '../metrics/healthMonitor';
import { encodeNapDetail, napCreditMin, napDetailFromSleep, StoredNapDetail } from '../metrics/naps';
import { decodeAccel, decodeHeartbeatSteps, isAccelFrame } from '../whoop/strapEvents';
import { StepCounter } from '../metrics/stepDetect';
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
export type LiveSession = {
  kind: SessionKind;
  label: string;
  startTs: number;
  laps: number[];
  maxHr: number | null;
  startSteps: number | null;
  stepSource: 'band' | 'phone' | null;
  hasGps: boolean; // mirrors WHOOP's SportDto.has_gps — phone GPS for this sport
  distanceM: number | null; // live GPS distance (metres)
  speedMps: number | null; // latest GPS speed (m/s)
  route: Array<{ lat: number; lng: number }>; // live route trace
  plan: StructuredWorkout | null; // optional structured/interval workout to follow
};
export type SessionStats = {
  elapsedSec: number;
  avgHr: number | null;
  maxHr: number | null;
  strain: number | null;
  steps: number | null;
  cadenceSpm: number | null;
  stepSource: 'band' | 'phone' | null;
  zones: ReturnType<typeof hrZones>;
  beats: number;
};

function sessionUsesSteps(session: Pick<LiveSession, 'kind' | 'label' | 'plan'>): boolean {
  return session.kind === 'workout' && activityUsesSteps(session.plan?.activity ?? session.label);
}

export type HistorySyncReport = {
  status: string;
  rawRecords: number;
  decodedRecords: number;
  hrSamples: number;
  rrSamples: number;
  stepSamples: number;
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
};

export type StrapAlarmState = {
  enabled: boolean;
  wakeTs: number | null;
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
  sleepStress: SleepStress | null; // last night's 0-3 stress breakdown
  sleepPerformance: SleepPerformance | null; // composite ring + 4 contributors
  sleepCapture: {
    windowMin: number;
    signalMin: number;
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
  recoveryParts: { hrvSub: number; rhrSub: number; respSub: number | null; sleepSub: number } | null;
  hrvBal: HrvBalance | null;
  illness: IllnessResult | null;
  resilience: Resilience | null;
  cardioAge: number | null;
  cardio: CardioRow[];
  session: LiveSession | null;
  steps: number | null; // best available today step count (band when trusted, phone fallback otherwise)
  stepSource: 'band' | 'phone' | null;
  bandSteps: number | null; // steps counted from the strap accelerometer (beta)
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
  sleepStress: null,
  sleepPerformance: null,
  sleepCapture: null,
  trainingReadiness: null,
  energyReserve: null,
  sleepGoal: 0.85,
  recoveryParts: null,
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
  strapAlarm: { enabled: false, wakeTs: null, updatedAt: null, pendingWrite: null },
  profile: DEFAULT_PROFILE,
  error: null,
};

const HR_RETENTION_DAYS = 21;
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
const AUTO_HISTORY_SYNC_RETRY_MS = 15000;
const AUTO_HISTORY_SYNC_MIN_INTERVAL_MS = 60 * 1000;
const AUTO_SYNC_SUPERVISOR_INTERVAL_MS = 45 * 1000;
const KEEP_ALIVE_PERMISSION_RETRY_MS = 10 * 60 * 1000;
const CONNECT_IN_FLIGHT_STALE_MS = 20 * 1000;
const BAND_STEP_FRESH_MS = 30 * 60 * 1000;
const BAND_STEP_UNCALIBRATED_AGREE_RATIO = 1.35;
const BAND_STEP_CALIBRATED_AGREE_RATIO = 1.8;
const BAND_STEP_PHONE_COMPARE_MIN = 50;
const PHONE_STEP_CUMULATIVE_ANCHOR_MIN = 50;
const PHONE_STEP_MAX_RATE_PER_SEC = 4;
const LAST_DEVICE_ID_KEY = 'lastWhoopDeviceId';
const STEP_DIVISOR_KEY = 'whoopStepTicksPerStep';
const STEP_DIVISOR_MIGRATION_KEY = 'whoopStepDivisorCaptureDefaultV2';
const STRAP_ALARM_KEY = 'strapAlarm';

function bandStepsAreTrusted(estimate: BandStepEstimate | null | undefined, divisor: number): boolean {
  if (!estimate || estimate.steps <= 0) return false;
  const calibrated = Math.abs(divisor - WHOOP5_STEP_TICKS_PER_STEP) > 0.05;
  return calibrated;
}

class AppStore extends Store<AppState> {
  private ble: WhoopBle | null = null;
  private rollingRr: number[] = [];
  private lastPersistTs = 0;
  private historyRecords: Uint8Array[] = [];
  private historyCommitQueue: Promise<void> = Promise.resolve();
  private historySessionStats: HistoricalDecodeResult | null = null;
  private historyDrainMode: 'manual' | 'auto' = 'manual';
  private historyIdleTimer: ReturnType<typeof setTimeout> | null = null;
  private historyWatchdogTimer: ReturnType<typeof setInterval> | null = null;
  private historyLastActivityTs = 0;
  private historyStopQueued = false;
  private historyEndAckSentThisBurst = false;
  private historyStallRecoveries = 0;
  private historyNudgeInFlight = false;
  private historyPersisting = false;
  private deepHistoryPreparedFor = '';
  private eventAssemblers = new Map<string, FrameAssembler>();
  private gpsActive = false;
  private recomputeTimer: ReturnType<typeof setInterval> | null = null;
  private connectedSyncTimer: ReturnType<typeof setInterval> | null = null;
  private autoSyncSupervisorTimer: ReturnType<typeof setInterval> | null = null;
  private appStateSub: { remove: () => void } | null = null;
  private stepSub: { remove: () => void } | null = null;
  private autoDrainedFor = ''; // device id we've already auto-drained this connection
  private autoSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private autoSyncAttempts = 0;
  private commandChannelAttempts = 0;
  private lastStatus: WhoopStatus = 'idle';
  private stepCounter = new StepCounter();
  private stepDay = '';
  private stepBase = 0;
  private stepLiveOffset = 0;
  private lastLiveStepCount = 0;
  private lastLiveStepTs = 0;
  private lastAccelTs = 0;
  private preferredDeviceId: string | null = null;
  private connectInFlight = false;
  private connectStartedAt = 0;
  private keepAliveRetryAfterTs = 0;

  constructor() {
    super(initialState);
  }

  async init(): Promise<void> {
    const profile = await loadProfile();
    const goalRaw = await kvGet('sleepGoal');
    const sleepGoal = goalRaw ? Number(goalRaw) : 0.85;
    const keepAliveRaw = await kvGet('backgroundKeepAlive');
    const keepAlive = keepAliveRaw !== '0';
    const lastSyncRaw = await kvGet('lastSyncTs');
    const lastSyncTs = lastSyncRaw ? Number(lastSyncRaw) : null;
    const lastHistorySync = parseHistorySyncReport(await kvGet('lastHistorySync'));
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
    this.preferredDeviceId = await kvGet(LAST_DEVICE_ID_KEY);
    this.setState({
      profile,
      sleepGoal: Number.isFinite(sleepGoal) ? sleepGoal : 0.85,
      backgroundKeepAlive: keepAlive,
      lastSyncTs: Number.isFinite(lastSyncTs) ? lastSyncTs : null,
      lastHistorySync,
      bandStepDivisor,
      strapAlarm,
    });
    this.ble = new WhoopBle({
      onStatus: (status, detail) => this.onStatus(status, detail),
      onDevice: (device) => this.onDevice(device),
      onBattery: (battery) => this.setState({ battery }),
      onError: (error) => this.setState({ error }),
      onHeartRate: (s) => void this.onHeartRate(s.bpm, s.rrMs),
      onRawFrame: (f) => this.onRawFrame(f),
    });
    await this.refreshBandSteps();
    await this.startStepTracking();
    await this.refreshDerived();
    await pruneHrSamples(addDays(Date.now(), -HR_RETENTION_DAYS));
    this.setState({ bufferedRecords: await countHistoryRecords() });

    // Keep every metric area current without needing its screen opened: recompute
    // + persist on a steady cadence while the app is alive, and again whenever the
    // app returns to the foreground (so re-opening shows complete, fresh graphs).
    this.startBackgroundRecompute();
    this.startAutoSyncSupervisor();
    this.appStateSub = RNAppState.addEventListener('change', (s) => this.onAppState(s));
    if (keepAlive) void this.ensureBackgroundSyncKeepAlive('Startup auto-sync');

    this.setState({ ready: true });
    setTimeout(() => this.connect(), 750);
  }

  private onDevice(device: { id: string; name: string }): void {
    this.preferredDeviceId = device.id;
    void kvSet(LAST_DEVICE_ID_KEY, device.id);
    this.setState({ device });
    const state = this.getState();
    if (state.status === 'connected' && this.autoDrainedFor !== device.id) {
      this.scheduleAutoHistoryDrain(device.id, 1000);
    }
  }

  /** Connection-status transitions. On a fresh connect, auto-drain the strap's
   *  on-device buffer so anything recorded while we were away is pulled in. */
  private onStatus(status: WhoopStatus, detail?: string): void {
    this.setState({ status, statusDetail: detail ?? '' });
    const device = this.getState().device;
    if (status === 'connected' && device && this.autoDrainedFor !== device.id) {
      this.scheduleAutoHistoryDrain(device.id, 3500);
    }
    if (status === 'connected' && this.getState().backgroundKeepAlive) {
      void this.ensureBackgroundSyncKeepAlive('Background auto-sync');
    }
    if (status === 'connected') {
      void this.flushPendingStrapAlarm('connection');
      this.startConnectedAutoSync();
    }
    if (status === 'disconnected' || status === 'idle') {
      this.autoDrainedFor = '';
      this.deepHistoryPreparedFor = '';
      this.clearAutoSyncTimer();
      this.stopConnectedAutoSync();
      if (this.getState().draining) this.enqueueHistoryStop('disconnect');
    }
    this.lastStatus = status;
  }

  private scheduleAutoHistoryDrain(deviceId: string, delayMs = AUTO_HISTORY_SYNC_RETRY_MS): void {
    if (this.autoSyncTimer || this.autoDrainedFor === deviceId) return;
    this.autoSyncTimer = setTimeout(() => {
      this.autoSyncTimer = null;
      void this.runAutoHistoryDrain(deviceId);
    }, delayMs);
  }

  private async runAutoHistoryDrain(deviceId: string): Promise<void> {
    const state = this.getState();
    if (state.device?.id !== deviceId || state.status !== 'connected') return;
    if (state.draining) {
      this.scheduleAutoHistoryDrain(deviceId, AUTO_HISTORY_SYNC_RETRY_MS);
      return;
    }
    if (!this.ble?.canSendCommands) {
      const commandReady = (await this.ble?.refreshCommandChannel()) === true;
      if (commandReady) {
        await this.flushPendingStrapAlarm('auto sync');
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
    this.autoDrainedFor = deviceId;
    this.autoSyncAttempts += 1;
    await this.runHistoryDrain('auto');
    if (!this.getState().draining && this.getState().status === 'connected' && this.getState().device?.id === deviceId) {
      this.autoDrainedFor = '';
      if (!this.autoSyncTimer) this.scheduleAutoHistoryDrain(deviceId, AUTO_HISTORY_SYNC_RETRY_MS);
    }
  }

  private retryAutoHistoryDrain(): void {
    const deviceId = this.getState().device?.id;
    if (!deviceId) return;
    this.autoDrainedFor = '';
    this.scheduleAutoHistoryDrain(deviceId, AUTO_HISTORY_SYNC_RETRY_MS);
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
      void this.refreshStepCount().catch(() => {});
      void this.refreshDerived().catch(() => {});
      this.recoverStaleHistoryDrain('foreground wake');
      const state = this.getState();
      if (state.status === 'idle' || state.status === 'disconnected' || state.status === 'error') {
        this.connect();
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

  private async startStepTracking(): Promise<void> {
    try {
      const ok = await pedometerAvailable();
      if (!ok) return;

      await this.refreshStepCount();
      if (this.stepSub) return;
      this.stepDay = dayKey(Date.now());
      this.stepBase = this.getState().steps ?? 0;
      this.stepLiveOffset = 0;
      this.lastLiveStepCount = 0;
      this.lastLiveStepTs = 0;
      this.stepSub = watchSteps((stepsSinceStart) => {
        const liveSteps = Math.max(0, Math.round(stepsSinceStart));
        const now = Date.now();
        const today = dayKey(now);
        if (this.stepDay !== today) {
          this.stepDay = today;
          this.stepBase = 0;
          this.stepLiveOffset = liveSteps;
          this.lastLiveStepTs = now;
          void this.refreshStepCount().catch(() => {});
        }
        let effectiveLiveSteps = liveSteps;
        if (
          this.lastLiveStepCount === 0 &&
          this.stepBase > 0 &&
          liveSteps >= PHONE_STEP_CUMULATIVE_ANCHOR_MIN
        ) {
          this.stepLiveOffset = liveSteps;
          effectiveLiveSteps = liveSteps;
        } else if (this.lastLiveStepTs > 0 && liveSteps > this.lastLiveStepCount) {
          const dtSec = Math.max(1, (now - this.lastLiveStepTs) / 1000);
          const delta = liveSteps - this.lastLiveStepCount;
          const maxDelta = Math.max(20, dtSec * PHONE_STEP_MAX_RATE_PER_SEC);
          if (delta > maxDelta) {
            this.stepLiveOffset += delta;
            effectiveLiveSteps = liveSteps;
          }
        }
        this.lastLiveStepCount = liveSteps;
        this.lastLiveStepTs = now;
        const phone = this.stepBase + Math.max(0, effectiveLiveSteps - this.stepLiveOffset);
        const band = this.getState().bandSteps;
        const chosen = this.bestStepTotal(band, phone);
        this.setState({ steps: chosen.steps, stepSource: chosen.source });
      });
    } catch (e) {
      this.setState({ error: `Phone step tracking unavailable: ${String(e)}` });
    }
  }

  private async refreshStepCount(): Promise<number | null> {
    const phoneSteps = await stepsToday();
    if (phoneSteps != null) {
      const rounded = Math.max(0, Math.round(phoneSteps));
      const liveSinceDayStart = Math.max(0, this.lastLiveStepCount - this.stepLiveOffset);
      this.stepDay = dayKey(Date.now());
      this.stepBase = Math.max(0, rounded - liveSinceDayStart);
      const band = this.getState().bandSteps;
      const chosen = this.bestStepTotal(band, rounded);
      this.setState({ steps: chosen.steps, stepSource: chosen.source });
      return rounded;
    }
    return null;
  }

  private async refreshBandSteps(): Promise<number | null> {
    const now = Date.now();
    const estimate = estimateBandStepsFromCounters(
      await getStepSamplesBetween(startOfDayMs(now), now),
      this.getState().bandStepDivisor,
    );
    const band = estimate?.steps ?? null;
    if (estimate) {
      const chosen = this.bestStepTotal(band);
      this.setState({ bandStepEstimate: estimate, bandSteps: band, steps: chosen.steps, stepSource: chosen.source });
    } else {
      const state = this.getState();
      const phoneSteps = state.stepSource === 'phone' ? state.steps : null;
      this.setState({
        bandStepEstimate: null,
        bandSteps: null,
        steps: phoneSteps,
        stepSource: phoneSteps != null ? 'phone' : null,
      });
    }
    return band;
  }

  private bestStepTotal(
    band: number | null,
    phone?: number | null,
  ): { steps: number | null; source: 'band' | 'phone' | null } {
    const state = this.getState();
    const phoneForCompare = phone ?? (state.stepSource === 'phone' ? state.steps : null);
    const liveSteps = phone ?? state.steps;
    const liveSource = phone != null ? 'phone' : state.stepSource;
    const sessionSource = state.session?.stepSource;
    if (sessionSource === 'phone' && liveSteps != null && liveSource === 'phone') {
      return { steps: liveSteps, source: 'phone' };
    }
    if (
      sessionSource === 'band' &&
      band != null &&
      band > 0 &&
      (liveSteps == null || liveSteps <= 0) &&
      bandStepsAreTrusted(state.bandStepEstimate, state.bandStepDivisor)
    ) {
      return { steps: band, source: 'band' };
    }
    if (band != null && band > 0) {
      const bandLastTs = state.bandStepEstimate?.lastTs ?? null;
      const bandIsStale = bandLastTs != null && Date.now() - bandLastTs > BAND_STEP_FRESH_MS;
      if (bandIsStale && phoneForCompare != null && phoneForCompare > band) {
        return { steps: phoneForCompare, source: 'phone' };
      }
      if (phoneForCompare != null && phoneForCompare >= BAND_STEP_PHONE_COMPARE_MIN) {
        const divisor = state.bandStepDivisor;
        const calibrated = Math.abs(divisor - WHOOP5_STEP_TICKS_PER_STEP) > 0.05;
        const agreeRatio = calibrated ? BAND_STEP_CALIBRATED_AGREE_RATIO : BAND_STEP_UNCALIBRATED_AGREE_RATIO;
        const high = phoneForCompare * agreeRatio;
        const low = phoneForCompare / agreeRatio;
        const bandConfidence = state.bandStepEstimate?.confidence ?? 'low';
        if (band > high || (!calibrated && band < low) || (!calibrated && bandConfidence === 'low')) {
          return { steps: phoneForCompare, source: 'phone' };
        }
      }
      if (!bandStepsAreTrusted(state.bandStepEstimate, state.bandStepDivisor)) {
        return phoneForCompare != null ? { steps: phoneForCompare, source: 'phone' } : { steps: null, source: null };
      }
      return { steps: band, source: 'band' };
    }
    if (phone != null && phone > 0) {
      return { steps: phone, source: 'phone' };
    }
    if (liveSteps != null) return { steps: liveSteps, source: liveSource ?? 'phone' };
    return { steps: null, source: null };
  }

  private currentStepSnapshot(): { steps: number | null; source: 'band' | 'phone' | null } {
    const state = this.getState();
    if (state.steps != null) {
      const source =
        state.stepSource ?? (state.bandSteps != null && state.steps === state.bandSteps ? 'band' : 'phone');
      return { steps: state.steps, source };
    }
    if (bandStepsAreTrusted(state.bandStepEstimate, state.bandStepDivisor) && state.bandSteps != null) {
      return { steps: state.bandSteps, source: 'band' };
    }
    return { steps: null, source: null };
  }

  private sessionStepStats(
    session: LiveSession,
    now = Date.now(),
  ): Pick<SessionStats, 'steps' | 'cadenceSpm' | 'stepSource'> {
    if (!sessionUsesSteps(session)) return { steps: null, cadenceSpm: null, stepSource: null };
    const current = this.currentStepSnapshot();
    let startSteps = session.startSteps;
    let source = session.stepSource;

    if (startSteps == null && current.steps != null) {
      startSteps = current.steps;
      source = current.source;
      const live = this.getState().session;
      if (live && live.startTs === session.startTs) {
        this.setState({ session: { ...live, startSteps, stepSource: source } });
      }
    }

    if (startSteps == null || current.steps == null) {
      return { steps: null, cadenceSpm: null, stepSource: source ?? current.source };
    }
    if (source != null && current.source != null && source !== current.source) {
      return { steps: null, cadenceSpm: null, stepSource: source };
    }

    const steps = Math.max(0, Math.round(current.steps - startSteps));
    const minutes = Math.max(1 / 60, (now - session.startTs) / 60000);
    return {
      steps,
      cadenceSpm: Math.round(steps / minutes),
      stepSource: source ?? current.source,
    };
  }

  connect = (): void => {
    void this.connectAsync();
  };

  private async connectAsync(): Promise<void> {
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
      await this.ble?.start(this.preferredDeviceId);
    } catch (e) {
      this.setState({ status: 'error', statusDetail: 'Connect failed', error: String(e) });
    } finally {
      this.connectInFlight = false;
      this.connectStartedAt = 0;
    }
  };

  disconnect = (): void => {
    void this.ble?.stop();
    // User asked to disconnect → tear down the keep-alive service too (it only
    // exists to hold the connection open; auto-reconnect keeps it during drops).
    void stopKeepAlive();
    this.setState({ liveHr: null, liveRr: [] });
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
    const alarm = this.getState().strapAlarm;
    if (!alarm.pendingWrite) return;
    const ble = await this.optionalCommandChannel();
    if (!ble) return;
    try {
      if (alarm.pendingWrite === 'set') {
        if (!alarm.wakeTs || alarm.wakeTs <= Date.now() + 30 * 1000) {
          await this.saveStrapAlarm(
            { enabled: false, wakeTs: null, updatedAt: Date.now(), pendingWrite: null },
            'Queued wake alarm expired before the strap connected',
          );
          return;
        }
        await withTimeout(ble.writeCommand(cmdSetAlarmTime(alarm.wakeTs)), 8000, 'Queued wake alarm');
        await this.saveStrapAlarm(
          { enabled: true, wakeTs: alarm.wakeTs, updatedAt: Date.now(), pendingWrite: null },
          `Queued wake alarm sent on ${context}`,
        );
        return;
      }
      await withTimeout(ble.writeCommand(cmdDisableAlarm()), 8000, 'Queued wake alarm disable');
      await withTimeout(ble.writeCommand(cmdStopHaptics()), 8000, 'Stop haptics').catch(() => {});
      await this.saveStrapAlarm(
        { enabled: false, wakeTs: null, updatedAt: Date.now(), pendingWrite: null },
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
    const alarm: StrapAlarmState = { enabled: true, wakeTs: Math.round(wakeTs), updatedAt: Date.now(), pendingWrite: null };
    const ble = await this.optionalCommandChannel();
    if (!ble) {
      const queued = { ...alarm, pendingWrite: 'set' as const };
      await this.saveStrapAlarm(queued, 'Wake alarm queued for next strap connection');
      this.connect();
      return 'queued';
    }
    try {
      await withTimeout(ble.writeCommand(cmdSetAlarmTime(wakeTs)), 8000, 'Wake alarm');
      await this.saveStrapAlarm(alarm, 'Wake alarm set on strap');
      return 'sent';
    } catch {
      const queued = { ...alarm, pendingWrite: 'set' as const };
      await this.saveStrapAlarm(queued, 'Wake alarm write failed; queued for next strap connection');
      this.connect();
      return 'queued';
    }
  };

  disableStrapAlarm = async (): Promise<'sent' | 'queued'> => {
    const alarm: StrapAlarmState = { enabled: false, wakeTs: null, updatedAt: Date.now(), pendingWrite: null };
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
          `${context} needs location permission so Android can keep the WHOOP sync running in the background. ` +
          'Grant location/notification permission and leave background sync enabled; otherwise keep the app open during sync.',
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
              'Keep-alive needs the “Allow all the time” location permission. Grant it in Settings, then toggle again.',
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
    const rawTicks = this.getState().bandStepEstimate?.rawTicks ?? null;
    if (rawTicks == null || rawTicks <= 0) {
      throw new Error('No WHOOP step ticks are available for the synced range yet. Sync history until the band counter range appears, then enter the real steps for that range.');
    }
    return this.setBandStepDivisor(rawTicks / actual);
  };

  private async onHeartRate(bpm: number, rr: number[]): Promise<void> {
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
    if (sess && (sess.maxHr == null || bpm > sess.maxHr)) {
      this.setState({ session: { ...sess, maxHr: bpm } });
    }

    // Persist at most one row per second.
    const now = Date.now();
    if (now - this.lastPersistTs >= 1000) {
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
    if (this.getState().capturing) {
      void insertRawFrame(f.ts, f.source, f.hex);
    }

    // Always parse proprietary frames for steps + status (band step counting).
    if (f.source.startsWith('fd4b')) {
      let asm = this.eventAssemblers.get(f.source);
      if (!asm) {
        asm = new FrameAssembler();
        this.eventAssemblers.set(f.source, asm);
      }
      try {
        for (const frame of asm.push(hexToBytes(f.hex))) {
          const hb = decodeHeartbeatSteps(frame);
          if (hb != null) this.setState({ hbStepRaw: hb });
          // Band step counting is DISABLED pending on-strap calibration. The
          // accelerometer byte layout is reverse-engineered and unconfirmed, and
          // on this firmware it decodes to noise even at rest — which produced a
          // false climbing step count. We won't show a number we can't trust;
          // bandSteps stays null until a capture confirms the format. Raw frames
          // are still captured above for that calibration.
          void isAccelFrame;
          void decodeAccel;
          if (this.getState().draining && isHistoryDrainFrame(frame.packetType)) {
            this.handleHistoryFrame(frame);
          }
        }
      } catch {
        // Malformed frame — ignore.
      }
    }

  }

  private handleHistoryFrame(frame: MaverickFrame): void {
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
      this.historyRecords = [];
      this.historyStopQueued = false;
      this.historyEndAckSentThisBurst = false;
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
      if (this.historyEndAckSentThisBurst) {
        if (chunk.length) {
          this.enqueueHistoryPersistChunk(chunk);
        }
        return;
      }
      this.historyEndAckSentThisBurst = true;
      this.enqueueHistoryChunk(chunk, meta);
    } else if (meta.kind === 'complete') {
      this.enqueueHistoryStop('complete');
    }
  }

  private enqueueHistoryPersistChunk(frames: Uint8Array[]): void {
    if (!frames.length || this.historyStopQueued) return;
    this.historyCommitQueue = this.historyCommitQueue
      .then(async () => {
        await this.persistHistoryFrames(frames);
      })
      .catch((e) => {
        this.clearHistoryTimeout();
        this.stopHistoryWatchdog();
        this.historyStopQueued = true;
        this.setState({ draining: false, capturing: false, error: `History sync failed: ${String(e)}` });
        if (this.historyDrainMode === 'auto') this.retryAutoHistoryDrain();
      });
  }

  private enqueueHistoryChunk(frames: Uint8Array[], meta: Extract<HistoryMetadata, { kind: 'end' }>): void {
    if (this.historyStopQueued) return;
    this.historyCommitQueue = this.historyCommitQueue
      .then(async () => {
        await this.persistHistoryFrames(frames);
        const ble = this.ble;
        if (!ble) return;
        const commandReady = ble.canSendCommands || (await ble.refreshCommandChannel()) === true;
        if (commandReady) {
          await withTimeout(ble.writeCommand(cmdHistoricalDataResult(meta.endData)), 8000, 'History acknowledgement');
        }
      })
      .catch((e) => {
        this.clearHistoryTimeout();
        this.stopHistoryWatchdog();
        this.historyStopQueued = true;
        this.setState({ draining: false, capturing: false, error: `History sync failed: ${String(e)}` });
        if (this.historyDrainMode === 'auto') this.retryAutoHistoryDrain();
      });
  }

  private enqueueHistoryStop(reason: 'complete' | 'timeout' | 'disconnect'): void {
    if (this.historyStopQueued) return;
    this.historyStopQueued = true;
    const mode = this.historyDrainMode;
    const tail = this.historyRecords;
    this.historyRecords = [];
    this.historyCommitQueue = this.historyCommitQueue
      .then(async () => {
        if (tail.length) await this.persistHistoryFrames(tail);
        await this.finishHistoryMode(reason);
        await this.backfillHistoryDays(this.historySessionStats);
        await this.backfillCardioStepsFromHistory();
        const syncTs = Date.now();
        await kvSet('lastSyncTs', String(syncTs));
        const current = this.getState().historySync;
        const finalReport = current
          ? {
              ...current,
              status: historyStopStatus(reason, current),
              finishedTs: syncTs,
              reason,
              mode,
            }
          : null;
        if (finalReport) await kvSet('lastHistorySync', JSON.stringify(finalReport));
        this.clearHistoryTimeout();
        this.stopHistoryWatchdog();
        this.setState({
          draining: false,
          capturing: false,
          lastSyncTs: syncTs,
          historySync: finalReport,
          lastHistorySync: finalReport,
        });
        await this.refreshBandSteps();
        await this.refreshDerived();
        const stats = this.historySessionStats;
        if (mode === 'auto' && reason === 'complete') this.autoSyncAttempts = 0;
        if (reason === 'timeout') {
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
      })
      .catch((e) => {
        this.clearHistoryTimeout();
        this.stopHistoryWatchdog();
        this.setState({ draining: false, capturing: false, error: `History sync failed: ${String(e)}` });
        if (mode === 'auto') this.retryAutoHistoryDrain();
      });
  }

  private async persistHistoryFrames(frames: Uint8Array[]): Promise<HistoricalDecodeResult> {
    const rawTs = Date.now();
    this.historyPersisting = true;
    this.markHistoryActivity();
    this.setState((s) => ({
      historySync: s.historySync
        ? { ...s.historySync, status: `Committing ${frames.length} history records` }
        : s.historySync,
    }));
    let decoded: HistoricalDecodeResult;
    try {
      for (const frame of frames) {
        await insertHistoryRecord(rawTs, bytesToHex(frame));
      }

      decoded = decodeWhoop5HistoryFrames(frames);
      for (const sample of decoded.hr) {
        await insertHrSample({ ts: sample.ts, bpm: sample.bpm, rr: sample.rr });
      }
      for (const sample of decoded.steps) {
        await insertStepSample({ ts: sample.ts, counter: sample.counter, activityClass: sample.activityClass });
      }
      for (const sample of decoded.sleepStates) {
        await insertSleepStateSample({ ts: sample.ts, state: sample.state });
      }
      for (const sample of decoded.rawVitals) {
        await insertRawVitalSample({ ts: sample.ts, spo2: sample.spo2, skinTempC: sample.skinTempC });
      }
    } finally {
      this.historyPersisting = false;
      this.markHistoryActivity();
    }

    this.historySessionStats = mergeHistoryStats(this.historySessionStats, decoded);
    const stats = this.historySessionStats;
    const bounds = historySampleBounds(stats);
    this.setState({
      historySync: {
        status: `Stored ${decoded.hr.length} HR samples and ${decoded.sleepStates.length} sleep-state hints from ${frames.length} records`,
        rawRecords: stats.records,
        decodedRecords: stats.decodedRecords,
        hrSamples: stats.hr.length,
        rrSamples: stats.hr.reduce((a, s) => a + s.rr.length, 0),
        stepSamples: stats.steps.length,
        rawSensorRecords: stats.rawSensorRecords,
        rawVitalSamples: stats.rawVitals.length,
        rejectedRecords: stats.rejectedRecords,
        droppedImplausibleTs: stats.droppedImplausibleTs,
        versions: stats.versions,
        ...bounds,
      },
    });

    await this.refreshBandSteps();
    return decoded;
  }

  private async backfillHistoryDays(stats: HistoricalDecodeResult | null): Promise<void> {
    if (!stats) return;
    const days = new Set<string>();
    const today = dayKey(Date.now());
    const addOvernightDay = (ts: number) => {
      days.add(dayKey(ts));
      const hour = new Date(ts).getHours();
      if (hour >= 20) days.add(dayKey(addDays(ts, 1)));
      if (hour < 12) days.add(dayKey(ts));
    };
    for (const sample of stats.hr) {
      addOvernightDay(sample.ts);
    }
    for (const sample of stats.steps) days.add(dayKey(sample.ts));
    for (const sample of stats.sleepStates) addOvernightDay(sample.ts);
    for (const sample of stats.rawVitals) addOvernightDay(sample.ts);
    const ordered = [...days].filter((d) => d !== today).sort((a, b) => a.localeCompare(b));
    for (const day of ordered) {
      await this.backfillDailyMetric(day);
    }
  }

  private async reestimateRecentBandStepDays(days = 14): Promise<void> {
    const now = Date.now();
    const today = dayKey(now);
    for (let i = 1; i <= days; i += 1) {
      const day = dayKey(addDays(now, -i));
      if (day === today) continue;
      const sod = dayStartFromKey(day);
      const rows = await getStepSamplesBetween(sod, Math.min(sod + 24 * 60 * 60 * 1000, now));
      if (rows.length < 2) continue;
      await this.backfillDailyMetric(day);
    }
  }

  private async backfillDailyMetric(day: string): Promise<void> {
    const profile = this.getState().profile;
    const now = Date.now();
    const sod = dayStartFromKey(day);
    const dayEnd = Math.min(sod + 24 * 60 * 60 * 1000, now);
    if (dayEnd <= sod) return;

    const dayHr = await getHrSamplesBetween(sod, dayEnd);
    const perMin = perMinuteHr(dayHr);
    const strainSamples = perMin.map((p) => ({ hr: p.hr, minutes: 1 }));
    const load = edwardsTrimp(strainSamples, profile);
    const strain = strainSamples.length ? strainFromLoad(load) : null;
    const stepEstimate = estimateBandStepsFromCounters(await getStepSamplesBetween(sod, dayEnd), this.getState().bandStepDivisor);
    const steps = bandStepsAreTrusted(stepEstimate, this.getState().bandStepDivisor) ? stepEstimate?.steps ?? null : null;

    const manualRaw = await kvGet(`manualSleep:${day}`);
    const manual = manualRaw ? (JSON.parse(manualRaw) as { startTs: number; endTs: number }) : null;
    const winStart = manual ? manual.startTs : sod - 4 * 3600 * 1000;
    const winEnd = manual ? manual.endTs : Math.min(sod + 12 * 3600 * 1000, now);
    const nightHr = await getHrSamplesBetween(winStart, winEnd);
    const nightPerMin = perMinuteHr(nightHr);
    const sleepInput = await buildSleepInput(nightPerMin, winStart, winEnd);
    let candidateSleep = manual
      ? computeSleep(sleepInput, undefined, {
          forceWindow: true,
          startTs: manual.startTs,
          endTs: manual.endTs,
          source: nightPerMin.length >= 10 ? 'manual_hr' : 'manual_duration',
        })
      : computeSleep(sleepInput);
    if (manual && !candidateSleep) candidateSleep = durationOnlySleep(manual.startTs, manual.endTs);
    const sleep = sleepIsReliable(candidateSleep, !!manual) ? candidateSleep : null;

    let rmssd: number | null = null;
    let rhr: number | null = null;
    let resp: number | null = null;
    let spo2: number | null = null;
    let skinTempC: number | null = null;
    const scoredNightHr = sleep ? nightHr.filter((s) => s.ts >= sleep.startTs && s.ts < sleep.endTs) : [];
    if (sleep) {
      const vitals = computeOvernightVitals(scoredNightHr, sleep);
      rmssd = vitals.rmssd;
      rhr = vitals.rhr;
      resp = vitals.resp;
    }
    const rawVitalWindow = sleep ?? candidateSleep;
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
      .map((d) => ({ neededMin: d.sleepDetail?.needMin ?? 480, asleepMin: d.sleepMin as number }));
    const accruedDebtMin = sleepDebt(debtNights);
    await this.autoDetectNapsForDay(sod, dayEnd, sleep);
    const napMin = (await listCardio(CARDIO_RECENT_LIMIT))
      .filter((c) => c.source === 'nap' && c.startTs >= sod && c.startTs < dayEnd)
      .reduce((a, c) => a + napCreditMin(c), 0);
    const need = computeSleepNeed({ recentStrain: strain, accruedDebtMin, napMin });
    if (sleep) applySleepNeed(sleep, need);

    const sleepStressResult = sleep ? buildSleepStress(scoredNightHr) : null;

    let sleepDetail: SleepDetail | null = null;
    let sleepPerformanceResult: SleepPerformance | null = null;
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
    }

    const toDayValues = (pick: (d: DailyMetricRow) => number | null) =>
      recent
        .filter((d) => pick(d) != null)
        .map((d) => ({ day: epochDay(Date.parse(`${d.day}T00:00:00`)), value: pick(d) as number }));
    const rmssdSamples = toDayValues((d) => d.rmssd);
    const rhrSamples = toDayValues((d) => d.rhr);
    const respSamples = toDayValues((d) => d.resp);
    const rawRecovery = recoveryEstimate({
      rmssd,
      rhr,
      resp,
      sleepPerformance: sleepPerformanceResult ? sleepPerformanceResult.score / 100 : (sleep?.performance ?? null),
      rmssdSamples,
      rhrSamples,
      respSamples,
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
      sleepStart: sleep?.startTs ?? null,
      sleepEnd: sleep?.endTs ?? null,
      deepMin: sleep?.stages.deep ?? null,
      remMin: sleep?.stages.rem ?? null,
      lightMin: sleep?.stages.light ?? null,
      awakeMin: sleep?.stages.awake ?? null,
      sleepDetail,
      updatedAt: now,
    });
  }

  private async backfillCardioStepsFromHistory(): Promise<void> {
    const rows = await listCardio(200);
    let changed = false;
    for (const row of rows) {
      if (row.source === 'nap') continue;
      if (row.stepSource === 'manual' || row.stepSource === 'phone') continue;
      const estimate = estimateBandStepsFromCounters(
        await getStepSamplesBetween(row.startTs, row.endTs),
        this.getState().bandStepDivisor,
      );
      if (!bandStepsAreTrusted(estimate, this.getState().bandStepDivisor)) continue;
      const bandSteps = estimate?.steps ?? null;
      if (bandSteps == null || bandSteps <= 0) continue;
      if (row.steps != null && Math.abs(row.steps - bandSteps) <= 1) continue;
      const durationMin = Math.max(1 / 60, (row.endTs - row.startTs) / 60000);
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

  private async prepareDeepHistoryStreams(mode: 'manual' | 'auto'): Promise<void> {
    const ble = this.ble;
    const deviceId = this.getState().device?.id ?? '';
    if (!ble?.isConnected || !deviceId || this.deepHistoryPreparedFor === deviceId) return;
    const ready = ble.canSendCommands || (await ble.refreshCommandChannel()) === true;
    if (!ready) return;

    const commands = cmdEnableDeepStreamSequence();
    let sent = 0;
    this.setState((s) => ({
      historySync: s.historySync
        ? { ...s.historySync, status: mode === 'auto' ? 'Auto sync: preparing deep history streams' : 'Preparing deep history streams' }
        : s.historySync,
    }));
    for (const command of commands) {
      try {
        await withTimeout(ble.writeCommand(command), 8000, 'Deep history prep');
        sent += 1;
        await delay(65);
      } catch (e) {
        this.deepHistoryPreparedFor = deviceId;
        await ble.refreshCommandChannel().catch(() => false);
        this.setState((s) => ({
          historySync: s.historySync
            ? { ...s.historySync, status: `Deep history prep partial (${sent}/${commands.length}); syncing anyway` }
            : s.historySync,
        }));
        return;
      }
    }

    this.deepHistoryPreparedFor = deviceId;
    this.setState((s) => ({
      historySync: s.historySync
        ? { ...s.historySync, status: `Deep history streams prepared (${sent}/${commands.length})` }
        : s.historySync,
    }));
  }

  private async finishHistoryMode(reason: 'complete' | 'timeout' | 'disconnect'): Promise<void> {
    const ble = this.ble;
    if (!ble?.isConnected) return;
    const ready = ble.canSendCommands || (await ble.refreshCommandChannel()) === true;
    if (!ready) return;
    if (reason !== 'complete') {
      await withTimeout(ble.writeCommand(cmdAbortHistoricalTransmits()), 8000, 'History abort').catch(() => {});
      await delay(80);
    }
    await withTimeout(ble.writeCommand(cmdExitHighFreqSync()), 8000, 'Exit history sync').catch(() => {});
  }

  private clearHistoryTimeout(): void {
    if (this.historyIdleTimer) {
      clearTimeout(this.historyIdleTimer);
      this.historyIdleTimer = null;
    }
  }

  toggleCapture = (): void => {
    this.setState((s) => ({ capturing: !s.capturing }));
  };

  /**
   * Run the historical drain handshake and backfill decoded WHOOP 5 history into
   * the local HR/R-R and step-counter tables.
   */
  runHistoryDrain = async (mode: 'manual' | 'auto' = 'manual'): Promise<void> => {
    const ble = this.ble;
    if (!ble || !ble.isConnected) {
      this.setState({ error: 'History drain needs an active WHOOP Bluetooth connection.' });
      this.connect();
      return;
    }
    if (!ble.canSendCommands) {
      const commandReady = (await ble.refreshCommandChannel()) === true;
      if (commandReady) {
        await this.flushPendingStrapAlarm(`${mode} sync`);
        this.setState((s) => ({
          historySync: s.historySync
            ? { ...s.historySync, status: 'Command channel rediscovered; starting history transfer' }
            : s.historySync,
        }));
      } else {
        this.setState({ error: 'History drain needs the WHOOP command channel (fd4b0002), not found on this device/firmware.' });
        return;
      }
    }
    await this.flushPendingStrapAlarm(`${mode} sync`);
    void this.ensureBackgroundSyncKeepAlive(mode === 'auto' ? 'Automatic history sync' : 'Manual history sync').catch(() => {});
    this.clearAutoSyncTimer();
    this.clearHistoryTimeout();
    this.eventAssemblers.forEach((asm) => asm.reset());
    this.historyRecords = [];
    this.historySessionStats = null;
    this.historyCommitQueue = Promise.resolve();
    this.historyStopQueued = false;
    this.historyEndAckSentThisBurst = false;
    this.historyStallRecoveries = 0;
    this.historyNudgeInFlight = false;
    this.historyPersisting = false;
    this.historyDrainMode = mode;
    this.historyLastActivityTs = Date.now();
    this.setState({
      draining: true,
      capturing: mode === 'manual',
      error: null,
      historySync: {
        status: mode === 'auto' ? 'Auto sync: requesting stored history' : 'Requesting stored history',
        rawRecords: 0,
        decodedRecords: 0,
        hrSamples: 0,
        rrSamples: 0,
        stepSamples: 0,
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
      await this.prepareDeepHistoryStreams(mode);
      try {
        await withTimeout(ble.writeCommand(cmdEnterHighFreqSync()), 8000, 'Enter history sync');
        this.setState((s) => ({
          historySync: s.historySync
            ? { ...s.historySync, status: 'High-frequency history sync enabled' }
            : s.historySync,
        }));
        await delay(750);
      } catch {
        this.setState((s) => ({
          historySync: s.historySync
            ? { ...s.historySync, status: 'High-frequency sync unavailable; requesting history anyway' }
            : s.historySync,
        }));
        await delay(250);
      }
      try {
        await withTimeout(ble.writeCommand(cmdGetDataRange()), 8000, 'History range request');
        this.setState((s) => ({
          historySync: s.historySync
            ? { ...s.historySync, status: 'Data range requested; starting history transfer' }
            : s.historySync,
        }));
        await delay(500);
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
      this.clearHistoryTimeout();
      this.stopHistoryWatchdog();
      this.historyStopQueued = true;
      this.setState({ draining: false, capturing: false, error: `History drain failed: ${String(e)}` });
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
    activity: string;
    startTs: number;
    endTs: number;
    avgHr: number | null;
    maxHr?: number | null;
    distanceM?: number | null;
    route?: Array<{ lat: number; lng: number }> | null;
    steps?: number | null;
    cadenceSpm?: number | null;
    stepSource?: string | null;
    lapCount?: number | null;
    notes?: string;
    source?: string;
  }): Promise<void> => {
    const profile = this.getState().profile;
    const isNap = input.source === 'nap';
    const durationMin = Math.max(1 / 60, (input.endTs - input.startTs) / 60000);
    const minutes = Math.max(1, Math.round(durationMin));
    const hrRows = await getHrSamplesBetween(input.startTs, input.endTs).catch(() => []);
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
      !isNap && input.steps == null
        ? estimateBandStepsFromCounters(
            await getStepSamplesBetween(input.startTs, input.endTs).catch(() => []),
            this.getState().bandStepDivisor,
          )
        : null;
    const bandActivitySteps = bandStepsAreTrusted(bandActivityEstimate, this.getState().bandStepDivisor)
      ? bandActivityEstimate?.steps ?? null
      : null;
    const activitySteps = input.steps ?? bandActivitySteps;
    const stepSource = input.stepSource ?? (bandActivitySteps != null ? 'band' : null);
    const row: CardioRow = {
      id: `c_${input.startTs}`,
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
      steps: isNap ? null : activitySteps ?? null,
      cadenceSpm: isNap ? null : input.cadenceSpm ?? (activitySteps != null ? Math.round(activitySteps / durationMin) : null),
      stepSource: isNap ? null : stepSource,
      lapCount: input.lapCount ?? null,
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
    const hrRows = await getHrSamplesBetween(startTs, endTs).catch(() => []);
    const perMin = perMinuteHr(hrRows);
    const sleepInput = await buildSleepInput(perMin, startTs, endTs);
    const sleep = computeSleep(sleepInput, undefined, {
      forceWindow: true,
      startTs,
      endTs,
      source: perMin.length >= 5 ? 'manual_hr' : 'manual_duration',
    });
    return sleep ? napDetailFromSleep(sleep, autoDetected) : null;
  }

  private async autoDetectNapsForDay(sod: number, dayEnd: number, mainSleep: SleepResult | null): Promise<void> {
    const scanStart = sod + 5 * 3600 * 1000;
    const scanEnd = Math.min(dayEnd, sod + 22 * 3600 * 1000);
    if (scanEnd - scanStart < 20 * 60000) return;

    const existing = (await listCardio(CARDIO_RECENT_LIMIT)).filter((c) => c.startTs < scanEnd && c.endTs > scanStart);
    const napRanges = existing.filter((c) => c.source === 'nap').map((c) => ({ startTs: c.startTs, endTs: c.endTs }));
    const blocked = existing
      .filter((c) => c.source !== 'nap')
      .map((c) => ({ startTs: c.startTs - 10 * 60000, endTs: c.endTs + 10 * 60000 }));
    if (mainSleep) {
      blocked.push({ startTs: mainSleep.startTs - 30 * 60000, endTs: mainSleep.endTs + 30 * 60000 });
    }

    const allHr = await getHrSamplesBetween(scanStart, scanEnd).catch(() => []);
    const allPerMin = perMinuteHr(allHr).filter((p) => !blocked.some((b) => rangesOverlap(p.tsMs, p.tsMs + 60000, b.startTs, b.endTs)));
    if (allPerMin.length < 120) return;
    const dayMedianHr = median(allPerMin.map((p) => p.hr));
    const segments = splitContiguousMinutes(allPerMin, 20);

    for (const segment of segments) {
      if (segment.length < 20) continue;
      const startTs = segment[0]!.tsMs;
      const endTs = segment[segment.length - 1]!.tsMs + 60000;
      if (napRanges.some((n) => overlapMinutes(startTs, endTs, n.startTs, n.endTs) >= 10)) continue;

      const sleepInput = await buildSleepInput(segment, startTs, endTs);
      const nap = computeSleep(sleepInput, undefined, { minWindowMin: 20, maxWindowMin: 180 });
      if (!nap || !napIsReliable(nap)) continue;
      if (blocked.some((b) => rangesOverlap(nap.startTs, nap.endTs, b.startTs, b.endTs))) continue;
      if (napRanges.some((n) => overlapMinutes(nap.startTs, nap.endTs, n.startTs, n.endTs) >= 10)) continue;

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
    const tracksSteps = kind === 'workout' && activityUsesSteps(plan?.activity ?? label);
    let stepSnapshot: { steps: number | null; source: 'band' | 'phone' | null } = { steps: null, source: null };
    if (tracksSteps) {
      const phoneSteps = await this.refreshStepCount().catch(() => null);
      stepSnapshot = phoneSteps != null
        ? { steps: phoneSteps, source: 'phone' }
        : this.currentStepSnapshot();
    }
    this.setState({
      session: {
        kind,
        label,
        startTs: Date.now(),
        laps: [],
        maxHr: null,
        startSteps: stepSnapshot.steps,
        stepSource: stepSnapshot.source,
        hasGps,
        distanceM: hasGps ? 0 : null,
        speedMps: null,
        route: [],
        plan,
      },
    });
    if (hasGps) void this.startGps();
  };

  /** Start a live workout that follows a structured/interval plan. */
  startPlannedSession = async (workout: StructuredWorkout): Promise<void> => {
    await this.startSession('workout', workout.name, activityGps(workout.activity), workout);
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
    this.gpsActive = false;
    const ok = await startBgLocation((u) => {
      const s = this.getState().session;
      if (!s) return;
      this.setState({
        session: {
          ...s,
          distanceM: u.distanceM,
          speedMps: u.speedMps,
          route: [...s.route, { lat: u.point.lat, lng: u.point.lng }],
        },
      });
    });
    if (ok) {
      this.gpsActive = true;
    } else {
      // Permission denied / GPS unavailable — keep recording HR, just no distance.
      const s = this.getState().session;
      if (s) this.setState({ session: { ...s, hasGps: false, distanceM: null } });
    }
  }

  private async stopGps(): Promise<number | null> {
    if (!this.gpsActive) return null;
    this.gpsActive = false;
    const { distanceM } = await stopBgLocation();
    return distanceM > 0 ? distanceM : null;
  }

  addLap = (): void => {
    const s = this.getState().session;
    if (s) this.setState({ session: { ...s, laps: [...s.laps, Date.now()] } });
  };

  discardSession = (): void => {
    void this.stopGps();
    this.setState({ session: null });
  };

  /** Live stats for the active session, derived from the persisted HR stream. */
  sessionStats = async (): Promise<SessionStats | null> => {
    const s = this.getState().session;
    if (!s) return null;
    const now = Date.now();
    const rows = await getHrSamplesBetween(s.startTs, now);
    const perMin = perMinuteHr(rows);
    const bpms = rows.map((r) => r.bpm);
    const avgHr = bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : null;
    const maxHr = bpms.length ? Math.max(...bpms) : s.maxHr;
    const zones = hrZones(perMin.map((p) => ({ hr: p.hr, minutes: 1 })), this.getState().profile);
    const load = edwardsTrimp(perMin.map((p) => ({ hr: p.hr, minutes: 1 })), this.getState().profile);
    const strain = perMin.length ? strainFromLoad(load) : null;
    const stepStats = this.sessionStepStats(s, now);
    return {
      elapsedSec: Math.round((now - s.startTs) / 1000),
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
    this.setState({ session: null });
    if (!save) return;
    if (s.kind === 'sleep') {
      await this.setManualSleep(s.startTs, endTs);
      return;
    }
    if (s.kind === 'nap') {
      const napDetail = await this.scoreNapWindow(s.startTs, endTs, false);
      await this.addCardio({
        activity: s.label,
        startTs: napDetail?.startTs ?? s.startTs,
        endTs: napDetail?.endTs ?? endTs,
        avgHr: stats?.avgHr ?? s.maxHr ?? null,
        maxHr: stats?.maxHr ?? s.maxHr ?? null,
        source: 'nap',
        notes: encodeNapDetail(napDetail) ?? undefined,
      });
      return;
    }
    const usesSteps = sessionUsesSteps(s);
    await this.addCardio({
      activity: s.label,
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
      source: 'live',
    });
  };

  // ---- journal ----
  addJournal = async (behaviour: string, value: string): Promise<void> => {
    const now = Date.now();
    const day = dayKey(now);
    // Deterministic id per behaviour per day → re-answering updates in place.
    await insertJournal({ id: `j_${day}_${behaviour}`, day, behaviour, value, createdAt: now });
  };

  // ---- derived metrics ----
  refreshDerived = async (): Promise<void> => {
    await this.recomputeToday();
    this.setState({ recentDays: await getRecentDailyMetrics(30), cardio: await listCardio(CARDIO_RECENT_LIMIT) });
  };

  recomputeDay = async (day: string): Promise<void> => {
    if (day === dayKey(Date.now())) {
      await this.recomputeToday();
      return;
    }
    await this.backfillDailyMetric(day);
    this.setState({
      recentDays: await getRecentDailyMetrics(30),
      cardio: await listCardio(CARDIO_RECENT_LIMIT),
    });
  };

  recomputeToday = async (): Promise<void> => {
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
    const bandStepsToday = await this.refreshBandSteps();
    const stepChoice = this.bestStepTotal(bandStepsToday);
    const bestSteps = stepChoice.steps;

    // Last night's window. A manual override (logged/adjusted by the user) takes
    // precedence and is scored over exactly those bounds; otherwise auto-detect
    // within 20:00 previous day -> noon today.
    const manualRaw = await kvGet(`manualSleep:${today}`);
    const manual = manualRaw ? (JSON.parse(manualRaw) as { startTs: number; endTs: number }) : null;
    const winStart = manual ? manual.startTs : sod - 4 * 3600 * 1000;
    const winEnd = manual ? manual.endTs : Math.min(sod + 12 * 3600 * 1000, now);
    const nightHr = await getHrSamplesBetween(winStart, winEnd);
    const nightPerMin = perMinuteHr(nightHr);
    const captureWindowMin = Math.max(1, Math.round((winEnd - winStart) / 60000));
    const sleepInput = await buildSleepInput(nightPerMin, winStart, winEnd);
    let candidateSleep = manual
      ? computeSleep(sleepInput, undefined, {
          forceWindow: true,
          startTs: manual.startTs,
          endTs: manual.endTs,
          source: nightPerMin.length >= 10 ? 'manual_hr' : 'manual_duration',
        })
      : computeSleep(sleepInput);
    if (manual && !candidateSleep) {
      candidateSleep = durationOnlySleep(manual.startTs, manual.endTs);
    }
    const sleep = sleepIsReliable(candidateSleep, !!manual) ? candidateSleep : null;

    // Overnight RMSSD + RHR + respiratory rate within the detected sleep window.
    let rmssd: number | null = null;
    let rhr: number | null = null;
    let resp: number | null = null;
    let spo2: number | null = null;
    let skinTempC: number | null = null;
    const scoredNightHr = sleep ? nightHr.filter((s) => s.ts >= sleep.startTs && s.ts < sleep.endTs) : [];
    if (sleep) {
      const vitals = computeOvernightVitals(scoredNightHr, sleep);
      rmssd = vitals.rmssd;
      rhr = vitals.rhr;
      resp = vitals.resp;
    }
    const rawVitalWindow = sleep ?? candidateSleep;
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
    // using each night's stored Sleep Need where available, else the baseline.
    const debtNights = recent
      .filter(isUsableDebtNight)
      .slice(0, 14)
      .reverse() // oldest → newest for the rolling carry
      .map((d) => ({ neededMin: d.sleepDetail?.needMin ?? 480, asleepMin: d.sleepMin as number }));
    const accruedDebtMin = sleepDebt(debtNights);
    await this.autoDetectNapsForDay(sod, now, sleep);
    const cardioAfterNapDetect = await listCardio(CARDIO_RECENT_LIMIT);
    const napMin = cardioAfterNapDetect
      .filter((c) => c.source === 'nap' && c.startTs >= sod)
      .reduce((a, c) => a + napCreditMin(c), 0);
    const need = computeSleepNeed({ recentStrain: strain, accruedDebtMin, napMin });
    if (sleep) applySleepNeed(sleep, need);
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
    const sleepStressResult = sleep ? buildSleepStress(scoredNightHr) : null;

    // ---- WHOOP-style Sleep Performance composite + 4 contributors ----
    let sleepPerformanceResult: SleepPerformance | null = null;
    let sleepDetail: SleepDetail | null = null;
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
    }
    const toDayValues = (pick: (d: DailyMetricRow) => number | null) =>
      recent
        .filter((d) => pick(d) != null)
        .map((d) => ({ day: epochDay(Date.parse(`${d.day}T00:00:00`)), value: pick(d) as number }));
    const rmssdSamples = toDayValues((d) => d.rmssd);
    const rhrSamples = toDayValues((d) => d.rhr);
    const respSamples = toDayValues((d) => d.resp);

    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    const rmssdBaseline = emaBaseline(rmssdSamples) ?? null;
    const rhrBaseline = emaBaseline(rhrSamples) ?? null;
    const respBaseline = mean(respSamples.map((s) => s.value));
    const rmssdSd = stdev(rmssdSamples.map((s) => s.value)) || 1;
    const rhrSd = stdev(rhrSamples.map((s) => s.value)) || 1;
    const respSd = stdev(respSamples.map((s) => s.value)) || 1;

    let recovery: number | null = null;
    let recoveryParts: AppState['recoveryParts'] = null;
    const recoveryResult = recoveryEstimate({
      rmssd,
      rhr,
      resp,
      sleepPerformance: sleepPerformanceResult ? sleepPerformanceResult.score / 100 : (sleep?.performance ?? null),
      rmssdSamples,
      rhrSamples,
      respSamples,
    });
    recovery = applyRecoveryConfidenceCap(recoveryResult.score, sleepDetail);
    recoveryParts = recoveryResult.parts;

    // ---- Oura-style insights (HR/R-R only) ----
    const hrvBal = hrvBalance(rmssdSamples);
    const illness = illnessRisk({
      rhr: { value: rhr, baseline: rhrBaseline, sd: rhrSd },
      hrv: { value: rmssd, baseline: rmssdBaseline, sd: rmssdSd },
      respiratory: { value: resp, baseline: respBaseline, sd: respSd },
    });
    const recoveryHistory = [...recent].reverse().map((d) => d.recovery).filter((v): v is number => v != null);
    if (recovery != null) recoveryHistory.push(recovery);
    const resilienceResult = resilience(recoveryHistory);
    const cardioAgeResult = cardioAge({ age: profile.ageYears, rhr, rmssd });

    // ---- Garmin-style synthesis: Training Readiness (built on Recovery) ----
    const sleepPerfPct = sleepPerformanceResult?.score ?? null;
    const trimps = this.getState().cardio.filter((c) => c.trimp != null).map((c) => ({ ts: c.startTs, trimp: c.trimp as number }));
    const loadStatus = trainingLoad(trimps, now);
    const trainingReadiness = computeTrainingReadiness({
      recovery,
      sleepPerformance: sleepPerfPct,
      sleepDebtMin: need.debtMin,
      hrvBalance: hrvBal?.score ?? null,
      acwr: loadStatus.acwr,
      sleepConfidence: sleepDetail?.confidence ?? null,
      sleepCoveragePct: sleepDetail?.coveragePct ?? null,
      sleepSignalMin: sleepDetail?.signalMin ?? null,
    });
    const energyReserve = computeEnergyReserve({
      recovery,
      sleepPerformance: sleepPerfPct,
      sleepDebtMin: need.debtMin,
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
      sleepStart: sleep?.startTs ?? null,
      sleepEnd: sleep?.endTs ?? null,
      deepMin: sleep?.stages.deep ?? null,
      remMin: sleep?.stages.rem ?? null,
      lightMin: sleep?.stages.light ?? null,
      awakeMin: sleep?.stages.awake ?? null,
      sleepDetail,
      updatedAt: now,
    };
    await upsertDailyMetric(row);
    this.setState({
      today: row,
      lastSleep: sleep,
      sleepNeed: need,
      sleepScore: sleepScoreResult,
      sleepReg,
      sleepConsistency: consistency,
      sleepStress: sleepStressResult,
      sleepPerformance: sleepPerformanceResult,
      sleepCapture,
      storedStress,
      bandSteps: bandStepsToday ?? this.getState().bandSteps,
      steps: bestSteps,
      stepSource: stepChoice.source ?? this.getState().stepSource,
      trainingReadiness,
      energyReserve,
      recoveryParts,
      hrvBal,
      illness,
      resilience: resilienceResult,
      cardioAge: cardioAgeResult,
      recentDays: await getRecentDailyMetrics(30),
      cardio: await listCardio(CARDIO_RECENT_LIMIT),
    });
  };

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

  // ---- Sleep goal (Get By / Perform / Peak) ----
  setSleepGoal = async (goal: number): Promise<void> => {
    await kvSet('sleepGoal', String(goal));
    this.setState({ sleepGoal: goal });
  };

  // ---- Journal ----
  journalForDay = async (day: string) => listJournal(day);

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
    const estimate = estimateBandStepsFromCounters(await getStepSamplesBetween(d.startTs, d.endTs), this.getState().bandStepDivisor);
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

async function buildSleepInput(
  nightPerMin: Array<{ tsMs: number; hr: number }>,
  winStart: number,
  winEnd: number,
): Promise<SleepMinute[]> {
  const sleepStates = await getSleepStateSamplesBetween(winStart, winEnd).catch(() => []);
  const stepRows = await getStepSamplesBetween(winStart, winEnd).catch(() => []);
  const hrByMinute = new Map(nightPerMin.map((p) => [Math.floor(p.tsMs / 60000), p.hr]));
  const stateByMinute = minuteMode(sleepStates, (s) => s.state);
  const motionByMinute = sleepMotionByMinute(stepRows);
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
        bandSleepState: stateByMinute.get(minute) ?? null,
      };
    });
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
  const stateSleepLikeMin = (nap.sleepStateAsleepMin ?? 0) + (nap.sleepStateStillMin ?? 0);
  const hasStateProof = (nap.sleepStateMin ?? 0) >= 12 && stateSleepLikeMin / Math.max(1, nap.sleepStateMin ?? 0) >= 0.3;
  const hasMotionProof = nap.motionMin >= 12 && corroborationPct >= 20;
  return (
    !sleepStateWakeConflict(nap) &&
    nap.inBedMin >= 20 &&
    nap.inBedMin <= 180 &&
    nap.asleepMin >= 15 &&
    nap.signalMin >= 20 &&
    coveragePct >= 60 &&
    (hasMotionProof || hasStateProof) &&
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

type OvernightVitals = {
  rmssd: number | null;
  rhr: number | null;
  resp: number | null;
};

function averageRawVitals(rows: RawVitalSampleRow[]): { spo2: number | null; skinTempC: number | null } {
  const MIN_RAW_VITAL_SAMPLES = 6;
  const spo2 = rows.map((r) => r.spo2).filter((v): v is number => v != null && v >= 70 && v <= 100);
  const skin = rows.map((r) => r.skinTempC).filter((v): v is number => v != null && v >= 15 && v <= 45);
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

const MIN_VITAL_SIGNAL_MIN = 90;
const MIN_VITAL_COVERAGE_PCT = 55;
const MIN_SLEEP_SCORE_SIGNAL_MIN = 150;
const MIN_SLEEP_SCORE_COVERAGE_PCT = 50;

function applySleepNeed(sleep: SleepResult, need: SleepNeed): void {
  sleep.neededMin = need.neededMin;
  sleep.performance = Math.min(1, sleep.asleepMin / need.neededMin);
}

function isUsableDebtNight(day: DailyMetricRow): boolean {
  if (day.sleepMin == null) return false;
  return sleepTrustTier(day.sleepDetail) !== 'low';
}

function isUsableSleepTrendNight(day: DailyMetricRow): boolean {
  if (day.sleepStart == null || day.sleepEnd == null) return false;
  return sleepTrustTier(day.sleepDetail) !== 'low';
}

function sleepCoveragePct(sleep: SleepResult): number {
  return Math.round((sleep.signalMin / Math.max(1, sleep.inBedMin)) * 100);
}

function boundedSleepCoveragePct(sleep: SleepResult): number {
  return Math.max(0, Math.min(100, sleepCoveragePct(sleep)));
}

function buildSleepStress(samples: HrSampleRow[]): SleepStress | null {
  const byMin = new Map<number, { hrs: number[]; rr: number[] }>();
  for (const s of samples) {
    const m = Math.floor(s.ts / 60000);
    const b = byMin.get(m) ?? { hrs: [], rr: [] };
    b.hrs.push(s.bpm);
    b.rr.push(...s.rr);
    byMin.set(m, b);
  }
  const epochs: StressEpoch[] = [...byMin.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => ({
      hr: v.hrs.reduce((a, b) => a + b, 0) / v.hrs.length,
      rmssd: computeHrv(v.rr)?.rmssd ?? null,
    }));
  return computeSleepStress(epochs);
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
  confidence: SleepConfidence;
  coveragePct: number;
} {
  const { sleep, need, consistencyPct, sleepStress, manual } = input;
  const coveragePct = boundedSleepCoveragePct(sleep);
  const confidence = sleepConfidence(sleep.signalMin, coveragePct, manual, sleep);
  const hoursVsNeededPct = clampPct(Math.round((sleep.asleepMin / need.neededMin) * 100));
  const efficiencyPct = clampPct(Math.round(sleep.efficiency * 100));
  const restorativePct = sleep.asleepMin > 0 ? Math.round((sleep.restorativeMin / sleep.asleepMin) * 100) : 0;
  const performance = computeSleepPerformance({
    hoursVsNeededPct,
    efficiencyPct,
    consistencyPct,
    highStressPct: sleepStress?.highPct ?? 0,
    confidenceCapPct: sleepPerformanceCap(confidence, coveragePct, sleep),
  });
  const score = input.includeQualityScore
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
      restorativeMin: sleep.restorativeMin,
      restorativePct,
      latencyMin: sleep.latencyMin,
      wakeEvents: sleep.wakeEvents,
      inBedMin: sleep.inBedMin,
      stressHigh: sleepStress?.highPct ?? null,
      stressMed: sleepStress?.medPct ?? null,
      stressLow: sleepStress?.lowPct ?? null,
      source: sleep.source,
      signalMin: sleep.signalMin,
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
    },
    performance,
    score,
    confidence,
    coveragePct,
  };
}

function sleepIsReliable(sleep: SleepResult | null, manual: boolean): sleep is SleepResult {
  if (!sleep) return false;
  if (sleepStateWakeConflict(sleep)) return false;
  if (manual) return sleep.signalMin >= MIN_SLEEP_SCORE_SIGNAL_MIN && sleepCoveragePct(sleep) >= MIN_SLEEP_SCORE_COVERAGE_PCT;
  if (longAutoSleepNeedsCorroboration(sleep, manual)) return false;
  if (sleep.motionMin >= Math.max(30, sleep.inBedMin * 0.15)) {
    const stillPct = Math.round((sleep.stillMin / Math.max(1, sleep.inBedMin)) * 100);
    if (stillPct < 10 && sleep.movingMin > sleep.stillMin) return false;
  }
  return sleep.signalMin >= MIN_SLEEP_SCORE_SIGNAL_MIN && sleepCoveragePct(sleep) >= MIN_SLEEP_SCORE_COVERAGE_PCT;
}

function sleepConfidence(
  signalMin: number,
  coveragePct: number,
  manual: boolean,
  evidence?: SleepEvidence | null,
): SleepConfidence {
  const evidencePct = sleepEvidencePct(evidence);
  const corroborated = sleepHasCorroboration(evidence);
  const stateConflict = sleepStateWakeConflict(evidence);
  const longUncorroboratedAuto = longAutoSleepNeedsCorroboration(evidence, manual);
  if (!manual && stateConflict && (coveragePct < 90 || signalMin < 420)) return 'low';
  if (signalMin >= 300 && coveragePct >= 85 && (manual || corroborated)) return 'high';
  if (longUncorroboratedAuto) return 'low';
  if (signalMin >= SLEEP_TRUST_LOW_SIGNAL_MIN && coveragePct >= SLEEP_TRUST_LOW_COVERAGE_PCT) return 'medium';
  return 'low';
}

function sleepPerformanceCap(
  confidence: SleepConfidence,
  coveragePct: number,
  evidence?: SleepEvidence | null,
): number {
  if (confidence === 'high') return 100;
  if (sleepStateWakeConflict(evidence)) return Math.max(45, Math.min(68, coveragePct + 8));
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
  if (sleepStateWakeConflict(evidence)) return Math.max(40, Math.min(62, coveragePct + 4));
  const corroborated = sleepHasCorroboration(evidence);
  if (confidence === 'medium') return Math.max(72, Math.min(corroborated ? 90 : 84, coveragePct + (corroborated ? 12 : 6)));
  return Math.max(40, Math.min(62, coveragePct + 18));
}

function applyRecoveryConfidenceCap(recovery: number | null, detail: SleepDetail | null): number | null {
  if (recovery == null || !detail) return recovery;
  const tier = sleepTrustTier(detail);
  if (tier === 'low') return Math.min(recovery, 66);
  if (tier === 'medium') return Math.min(recovery, 85);
  return recovery;
}

type SleepEvidence = Pick<
  SleepResult,
  | 'inBedMin'
  | 'motionMin'
  | 'stillMin'
  | 'movingMin'
  | 'sleepStateMin'
  | 'sleepStateWakeMin'
  | 'sleepStateStillMin'
  | 'sleepStateAsleepMin'
  | 'sleepStateUpMin'
>;

type SleepCaptureEvidence = Pick<
  NonNullable<AppState['sleepCapture']>,
  | 'windowMin'
  | 'signalMin'
  | 'motionMin'
  | 'stillMin'
  | 'movingMin'
  | 'sleepStateMin'
  | 'sleepStateWakeMin'
  | 'sleepStateStillMin'
  | 'sleepStateAsleepMin'
  | 'sleepStateUpMin'
>;

function sleepResultCaptureEvidence(sleep: SleepResult): SleepCaptureEvidence {
  return {
    windowMin: sleep.inBedMin,
    signalMin: sleep.signalMin,
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
    signalMin: samples.filter((s) => s.hr != null).length,
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

function computeOvernightVitals(samples: HrSampleRow[], sleep: SleepResult | null): OvernightVitals {
  if (!sleep) return { rmssd: null, rhr: null, resp: null };
  const coveragePct = sleepCoveragePct(sleep);
  if (sleep.signalMin < MIN_VITAL_SIGNAL_MIN || coveragePct < MIN_VITAL_COVERAGE_PCT) {
    return { rmssd: null, rhr: null, resp: null };
  }

  const resp = overnightRespiratoryRate(samples);
  const rhr = restingHrFromSleep(samples);
  return {
    rmssd: overnightRmssd(samples, rhr),
    rhr,
    resp,
  };
}

function overnightRespiratoryRate(samples: HrSampleRow[]): number | null {
  type Segment = { rr: number[]; startTs: number; endTs: number };
  const segments: Segment[] = [];
  let current: Segment | null = null;
  let lastTs: number | null = null;

  const close = () => {
    if (current && current.rr.length >= 300) segments.push(current);
    current = null;
  };

  for (const sample of samples) {
    const rr = cleanSampleRr(sample);
    if (!rr.length) continue;
    if (lastTs != null && sample.ts - lastTs > 15 * 1000) close();
    if (!current) current = { rr: [], startTs: sample.ts, endTs: sample.ts };
    current.rr.push(...rr);
    current.endTs = sample.ts;
    lastTs = sample.ts;
  }
  close();

  const estimates = segments
    .filter((seg) => rrCoverageRatio(seg) >= 0.6)
    .map((seg) => respiratoryRate(seg.rr))
    .filter((v): v is number => v != null && v >= 9 && v <= 24);

  if (estimates.length === 0) return null;
  return round1(median(estimates));
}

function rrCoverageRatio(segment: { rr: number[]; startTs: number; endTs: number }): number {
  const rrMs = segment.rr.reduce((a, v) => a + v, 0);
  const wallMs = Math.max(1, segment.endTs - segment.startTs + 60000);
  return rrMs / wallMs;
}

function restingHrFromSleep(samples: HrSampleRow[]): number | null {
  const mins = perMinuteHr(samples).filter((p) => p.hr >= 30 && p.hr <= 130);
  if (mins.length < 30) return null;

  const hrValues = mins.map((p) => p.hr).sort((a, b) => a - b);
  const medianHr = median(hrValues);
  const artifactFloor = Math.max(42, medianHr - Math.max(6, medianHr * 0.12));
  const artifactCeiling = medianHr + Math.max(10, medianHr * 0.18);
  const rolling: number[] = [];
  const window = 20;
  for (let i = 0; i + window <= mins.length; i += 1) {
    const slice = mins.slice(i, i + window);
    const spanMin = ((slice[slice.length - 1]?.tsMs ?? 0) - (slice[0]?.tsMs ?? 0)) / 60000;
    if (spanMin > 28) continue;
    const cleanSlice = slice.map((p) => p.hr).filter((hr) => hr >= artifactFloor && hr <= artifactCeiling);
    if (cleanSlice.length < 16) continue;
    const meanHr = cleanSlice.reduce((a, hr) => a + hr, 0) / cleanSlice.length;
    if (meanHr < artifactFloor || meanHr > artifactCeiling) continue;
    rolling.push(meanHr);
  }

  const candidates =
    rolling.length >= 3
      ? rolling
      : mins.map((p) => p.hr).filter((hr) => hr >= artifactFloor && hr <= artifactCeiling);
  if (!candidates.length) return null;
  const sorted = candidates.slice().sort((a, b) => a - b);
  // Use the stable middle of the resting window distribution rather than the
  // absolute lowest slices. Low tails are vulnerable to optical dropouts.
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * 0.5)));
  const cleanMinuteHrs = mins
    .map((p) => p.hr)
    .filter((hr) => hr >= artifactFloor && hr <= artifactCeiling)
    .sort((a, b) => a - b);
  const p45Idx = Math.min(cleanMinuteHrs.length - 1, Math.max(0, Math.floor((cleanMinuteHrs.length - 1) * 0.45)));
  const distributionFloor = cleanMinuteHrs[p45Idx] ?? artifactFloor;
  return Math.round(Math.max(artifactFloor, distributionFloor, sorted[idx] as number));
}

function overnightRmssd(samples: HrSampleRow[], rhr: number | null): number | null {
  const buckets = new Map<number, { rr: number[]; hrs: number[] }>();
  for (const s of samples) {
    const cleanRr = cleanSampleRr(s);
    if (!cleanRr.length) continue;
    const bucket = Math.floor(s.ts / (5 * 60000));
    const cur = buckets.get(bucket) ?? { rr: [], hrs: [] };
    cur.rr.push(...cleanRr);
    cur.hrs.push(s.bpm);
    buckets.set(bucket, cur);
  }

  const windows = [...buckets.values()]
    .map((b) => {
      const avgHr = b.hrs.reduce((a, v) => a + v, 0) / b.hrs.length;
      const hrv = b.rr.length >= 90 ? computeHrv(b.rr) : null;
      if (!hrv) return null;
      if (hrv.rmssd < 5 || hrv.rmssd > 180) return null;
      if (Math.abs(hrv.meanHr - avgHr) > Math.max(8, avgHr * 0.12)) return null;
      return {
        rmssd: hrv.rmssd,
        avgHr,
        hrSamples: b.hrs.length,
        rrCount: hrv.count,
      };
    })
    .filter((v): v is { rmssd: number; avgHr: number; hrSamples: number; rrCount: number } => {
      if (!v || v.hrSamples < 4 || v.rrCount < 90) return false;
      return rhr == null || v.avgHr <= rhr + 18;
    });

  if (windows.length < 3) return null;
  const restingWindows = rhr == null ? windows : windows.filter((w) => w.avgHr <= rhr + 10);
  const source = restingWindows.length >= 3 ? restingWindows : windows;
  const rmssd = source.map((w) => w.rmssd).sort((a, b) => a - b);
  const med = median(rmssd);
  const deviations = rmssd.map((v) => Math.abs(v - med)).sort((a, b) => a - b);
  const mad = median(deviations);
  const upper = Math.min(160, med + Math.max(18, mad * 3));
  const filtered = rmssd.filter((v) => v <= upper);
  return round1(median((filtered.length >= 3 ? filtered : rmssd).sort((a, b) => a - b)));
}

function cleanSampleRr(sample: HrSampleRow): number[] {
  if (!sample.rr.length || sample.bpm < 30 || sample.bpm > 220) return [];
  const expectedRr = 60000 / sample.bpm;
  const clean = sample.rr.filter((rr) => {
    if (rr < 300 || rr > 2000) return false;
    const beatHr = 60000 / rr;
    return Math.abs(beatHr - sample.bpm) <= Math.max(10, sample.bpm * 0.18);
  });
  if (!clean.length) return [];
  const medRr = median(clean.slice().sort((a, b) => a - b));
  const robust = clean.filter((rr) => Math.abs(rr - medRr) <= Math.max(180, medRr * 0.22));
  if (!robust.length) return [];
  const meanRr = robust.reduce((a, b) => a + b, 0) / robust.length;
  if (Math.abs(meanRr - expectedRr) > Math.max(140, expectedRr * 0.22)) return [];
  return robust;
}

function recoveryEstimate(input: {
  rmssd: number | null;
  rhr: number | null;
  resp: number | null;
  sleepPerformance: number | null;
  rmssdSamples: Array<{ day: number; value: number }>;
  rhrSamples: Array<{ day: number; value: number }>;
  respSamples: Array<{ day: number; value: number }>;
}): { score: number | null; parts: AppState['recoveryParts'] } {
  const { rmssd, rhr, resp, sleepPerformance, rmssdSamples, rhrSamples, respSamples } = input;
  if (rmssd == null || rhr == null) return { score: null, parts: null };

  const rmssdBaseline = emaBaseline(rmssdSamples) ?? null;
  const rhrBaseline = emaBaseline(rhrSamples) ?? null;
  const respBaseline = respSamples.length ? respSamples.reduce((a, b) => a + b.value, 0) / respSamples.length : null;
  const rmssdSd = stdev(rmssdSamples.map((s) => s.value)) || 1;
  const rhrSd = stdev(rhrSamples.map((s) => s.value)) || 1;
  const respSd = stdev(respSamples.map((s) => s.value)) || 1;

  if (rmssdSamples.length >= 2 && rhrSamples.length >= 2) {
    const r = computeRecovery({
      rmssd,
      rmssdBaseline: rmssdBaseline ?? rmssd,
      rmssdSd,
      restingHr: rhr,
      rhrBaseline: rhrBaseline ?? rhr,
      rhrSd,
      respiratoryRate: resp,
      respiratoryBaseline: respBaseline,
      respiratorySd: respSd,
      sleepPerformance,
    });
    return { score: r.score, parts: { hrvSub: r.hrvSub, rhrSub: r.rhrSub, respSub: r.respSub, sleepSub: r.sleepSub } };
  }

  const sleepSub = Math.round(Math.max(0, Math.min(100, (sleepPerformance ?? 0.5) * 100)));
  const score = Math.round(0.5 * 50 + 0.25 * 50 + 0.25 * sleepSub);
  return { score, parts: { hrvSub: 50, rhrSub: 50, respSub: null, sleepSub } };
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

function sleepCaptureNote(input: {
  hasSleep: boolean;
  hasCandidate?: boolean;
  manual: boolean;
  signalMin: number;
  coveragePct: number;
  evidence?: SleepEvidence | null;
}): string {
  const confidence = sleepConfidence(input.signalMin, input.coveragePct, input.manual, input.evidence);
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
    return 'A long HR-only sleep window was found, but it needs still-worn or decoded band-state corroboration before Pulse scores it as sleep.';
  }
  if (!input.hasSleep && input.hasCandidate && input.manual) {
    return 'Manual sleep window saved, but HR coverage is too sparse to score sleep, stages, vitals or recovery yet.';
  }
  if (!input.hasSleep && input.hasCandidate) {
    return 'Partial overnight sync found a possible sleep window, but coverage is too sparse to score sleep accurately yet.';
  }
  if (input.hasSleep && (input.signalMin < MIN_VITAL_SIGNAL_MIN || input.coveragePct < MIN_VITAL_COVERAGE_PCT)) {
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

function historyStopStatus(
  reason: 'complete' | 'timeout' | 'disconnect',
  sync: NonNullable<AppState['historySync']>,
): string {
  const summary = `${sync.hrSamples} HR, ${sync.stepSamples} step rows, ${sync.rawVitalSamples} raw vitals from ${sync.rawRecords} records`;
  if (reason === 'complete') {
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
  for (const sample of stats.rawVitals) visit(sample.ts);
  if (!Number.isFinite(firstSampleTs) || !Number.isFinite(lastSampleTs)) return {};
  return { firstSampleTs, lastSampleTs };
}

function parseStrapAlarm(raw: string | null): StrapAlarmState {
  if (!raw) return initialState.strapAlarm;
  try {
    const parsed = JSON.parse(raw) as Partial<StrapAlarmState>;
    return {
      enabled: parsed.enabled === true,
      wakeTs: typeof parsed.wakeTs === 'number' && Number.isFinite(parsed.wakeTs) ? Math.round(parsed.wakeTs) : null,
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
      hr: [...next.hr],
      steps: [...next.steps],
      sleepStates: [...next.sleepStates],
      rawVitals: [...next.rawVitals],
      versions: [...next.versions],
    };
  }
  const versions = new Set([...prev.versions, ...next.versions]);
  return {
    hr: [...prev.hr, ...next.hr],
    steps: [...prev.steps, ...next.steps],
    sleepStates: [...prev.sleepStates, ...next.sleepStates],
    rawVitals: [...prev.rawVitals, ...next.rawVitals],
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
