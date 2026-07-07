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
  cmdGetDataRange,
  cmdHistoricalDataResult,
  cmdSendHistoricalData,
  parseHistoryMetadata,
  HistoryMetadata,
} from '../whoop/commands';
import { decodeWhoop5HistoryFrames, HistoricalDecodeResult } from '../whoop/historicalParse';
import {
  CardioRow,
  DailyMetricRow,
  SleepDetail,
  getHrSamplesBetween,
  getRecentDailyMetrics,
  insertCardio,
  insertHrSample,
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
import { startKeepAlive, stopKeepAlive } from '../sensors/keepAlive';
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
import { edwardsTrimp, hrZones, strainFromLoad, totalTrimp, UserProfile } from '../metrics/strain';
import { kcalPerMinute, totalKcal } from '../metrics/calories';
import { respiratoryRate } from '../metrics/respiratory';
import { computeStress } from '../metrics/stress';
import { computeHealthMonitor, HealthMonitorResult } from '../metrics/healthMonitor';
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
import { activityGps } from '../data/activities';
import { StructuredWorkout } from '../data/structuredWorkouts';
import { addDays, dayKey, epochDay, startOfDayMs } from '../util/time';

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

export type HistorySyncReport = {
  status: string;
  rawRecords: number;
  decodedRecords: number;
  hrSamples: number;
  rrSamples: number;
  stepSamples: number;
  rawSensorRecords: number;
  rejectedRecords: number;
  droppedImplausibleTs: number;
  versions: number[];
  finishedTs?: number;
  reason?: 'complete' | 'timeout' | 'disconnect';
  mode?: 'manual' | 'auto';
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
  frameCount: number;
  capturing: boolean;
  draining: boolean;
  backgroundKeepAlive: boolean; // opt-in foreground service for live diagnostics
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
    coveragePct: number;
    rrCount: number;
    source: SleepResult['source'] | null;
    note: string;
  } | null;
  trainingReadiness: Readiness | null; // Garmin-style readiness, built on Recovery
  sleepGoal: number; // target fraction of sleep need: 0.7 / 0.85 / 1.0
  // Oura-style derived insights (all HR/R-R only):
  recoveryParts: { hrvSub: number; rhrSub: number; sleepSub: number } | null;
  hrvBal: HrvBalance | null;
  illness: IllnessResult | null;
  resilience: Resilience | null;
  cardioAge: number | null;
  cardio: CardioRow[];
  session: LiveSession | null;
  steps: number | null; // best available today step count (band when trusted, phone fallback otherwise)
  stepSource: 'band' | 'phone' | null;
  bandSteps: number | null; // steps counted from the strap accelerometer (beta)
  hbStepRaw: number | null; // candidate heartbeat step byte (diagnostic, unconfirmed)
  bufferedRecords: number; // raw history records drained from the strap buffer
  historySync: HistorySyncReport | null;
  lastHistorySync: HistorySyncReport | null;
  lastSyncTs: number | null; // last time the strap buffer was drained
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
  frameCount: 0,
  capturing: false,
  draining: false,
  backgroundKeepAlive: false,
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
  hbStepRaw: null,
  bufferedRecords: 0,
  historySync: null,
  lastHistorySync: null,
  lastSyncTs: null,
  profile: DEFAULT_PROFILE,
  error: null,
};

const HR_RETENTION_DAYS = 21;
const ROLLING_RR_WINDOW = 120; // keep last ~120 R-R intervals for live HRV
// How often to recompute + persist derived metrics from the stored stream while
// the app is alive, so every screen reflects ongoing data without being opened.
const RECOMPUTE_INTERVAL_MS = 60 * 1000;
const HISTORY_IDLE_TIMEOUT_MS = 60 * 1000;
const AUTO_HISTORY_SYNC_RETRY_MS = 5000;
const AUTO_HISTORY_SYNC_MAX_ATTEMPTS = 6;
const AUTO_HISTORY_SYNC_MIN_INTERVAL_MS = 5 * 60 * 1000;

class AppStore extends Store<AppState> {
  private ble: WhoopBle | null = null;
  private rollingRr: number[] = [];
  private lastPersistTs = 0;
  private historyRecords: Uint8Array[] = [];
  private historyCommitQueue: Promise<void> = Promise.resolve();
  private historySessionStats: HistoricalDecodeResult | null = null;
  private historyDrainMode: 'manual' | 'auto' = 'manual';
  private historyIdleTimer: ReturnType<typeof setTimeout> | null = null;
  private historyStopQueued = false;
  private eventAssemblers = new Map<string, FrameAssembler>();
  private gpsActive = false;
  private recomputeTimer: ReturnType<typeof setInterval> | null = null;
  private appStateSub: { remove: () => void } | null = null;
  private stepSub: { remove: () => void } | null = null;
  private autoDrainedFor = ''; // device id we've already auto-drained this connection
  private autoSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private autoSyncAttempts = 0;
  private lastStatus: WhoopStatus = 'idle';
  private stepCounter = new StepCounter();
  private stepDay = '';
  private stepBase = 0;
  private stepLiveOffset = 0;
  private lastLiveStepCount = 0;
  private lastAccelTs = 0;

  constructor() {
    super(initialState);
  }

  async init(): Promise<void> {
    const profile = await loadProfile();
    const goalRaw = await kvGet('sleepGoal');
    const sleepGoal = goalRaw ? Number(goalRaw) : 0.85;
    const keepAlive = (await kvGet('backgroundKeepAlive')) === '1';
    const lastSyncRaw = await kvGet('lastSyncTs');
    const lastSyncTs = lastSyncRaw ? Number(lastSyncRaw) : null;
    const lastHistorySync = parseHistorySyncReport(await kvGet('lastHistorySync'));
    this.setState({
      profile,
      sleepGoal: Number.isFinite(sleepGoal) ? sleepGoal : 0.85,
      backgroundKeepAlive: keepAlive,
      lastSyncTs: Number.isFinite(lastSyncTs) ? lastSyncTs : null,
      lastHistorySync,
    });
    this.ble = new WhoopBle({
      onStatus: (status, detail) => this.onStatus(status, detail),
      onDevice: (device) => this.onDevice(device),
      onBattery: (battery) => this.setState({ battery }),
      onError: (error) => this.setState({ error }),
      onHeartRate: (s) => void this.onHeartRate(s.bpm, s.rrMs),
      onRawFrame: (f) => this.onRawFrame(f),
    });
    await this.startStepTracking();
    await this.refreshBandSteps();
    await this.refreshDerived();
    await pruneHrSamples(addDays(Date.now(), -HR_RETENTION_DAYS));
    this.setState({ bufferedRecords: await countHistoryRecords() });

    // Keep every metric area current without needing its screen opened: recompute
    // + persist on a steady cadence while the app is alive, and again whenever the
    // app returns to the foreground (so re-opening shows complete, fresh graphs).
    this.startBackgroundRecompute();
    this.appStateSub = RNAppState.addEventListener('change', (s) => this.onAppState(s));

    this.setState({ ready: true });
  }

  private onDevice(device: { id: string; name: string }): void {
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
    // Optional live-diagnostic keep-alive. Sleep uses stored-history backfill.
    if (status === 'connected' && this.getState().backgroundKeepAlive) {
      void startKeepAlive();
    }
    if (status === 'disconnected' || status === 'idle') {
      this.autoDrainedFor = '';
      this.clearAutoSyncTimer();
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
      this.autoSyncAttempts += 1;
      if (this.autoSyncAttempts <= AUTO_HISTORY_SYNC_MAX_ATTEMPTS) {
        this.setState((s) => ({
          historySync: s.historySync
            ? { ...s.historySync, status: `Auto sync waiting for command channel (${this.autoSyncAttempts})` }
            : {
                status: `Auto sync waiting for command channel (${this.autoSyncAttempts})`,
                rawRecords: 0,
                decodedRecords: 0,
                hrSamples: 0,
                rrSamples: 0,
                stepSamples: 0,
                rawSensorRecords: 0,
                rejectedRecords: 0,
                droppedImplausibleTs: 0,
                versions: [],
              },
        }));
        this.scheduleAutoHistoryDrain(deviceId, AUTO_HISTORY_SYNC_RETRY_MS);
      }
      return;
    }
    this.autoDrainedFor = deviceId;
    this.autoSyncAttempts += 1;
    await this.runHistoryDrain('auto');
  }

  private retryAutoHistoryDrain(): void {
    const deviceId = this.getState().device?.id;
    if (!deviceId || this.autoSyncAttempts >= AUTO_HISTORY_SYNC_MAX_ATTEMPTS) return;
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

  private onAppState(s: AppStateStatus): void {
    if (s === 'active') {
      void this.refreshStepCount().catch(() => {});
      void this.refreshDerived().catch(() => {});
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
      this.stepSub = watchSteps((stepsSinceStart) => {
        const liveSteps = Math.max(0, Math.round(stepsSinceStart));
        const today = dayKey(Date.now());
        if (this.stepDay !== today) {
          this.stepDay = today;
          this.stepBase = 0;
          this.stepLiveOffset = liveSteps;
          void this.refreshStepCount().catch(() => {});
        }
        this.lastLiveStepCount = liveSteps;
        const phone = this.stepBase + Math.max(0, liveSteps - this.stepLiveOffset);
        const band = this.getState().bandSteps;
        const chosen = this.bestStepTotal(band, phone);
        this.setState({ steps: chosen.steps, stepSource: chosen.source });
      });
    } catch (e) {
      this.setState({ error: `Phone step tracking unavailable: ${String(e)}` });
    }
  }

  private async refreshStepCount(): Promise<void> {
    const phoneSteps = await stepsToday();
    if (phoneSteps != null) {
      const rounded = Math.max(0, Math.round(phoneSteps));
      const liveSinceDayStart = Math.max(0, this.lastLiveStepCount - this.stepLiveOffset);
      this.stepDay = dayKey(Date.now());
      this.stepBase = Math.max(0, rounded - liveSinceDayStart);
      const band = this.getState().bandSteps;
      const chosen = this.bestStepTotal(band, rounded);
      this.setState({ steps: chosen.steps, stepSource: chosen.source });
    }
  }

  private async refreshBandSteps(): Promise<number | null> {
    const now = Date.now();
    const band = estimateStepsFromCounters(await getStepSamplesBetween(startOfDayMs(now), now));
    if (band != null) {
      const chosen = this.bestStepTotal(band);
      this.setState({ bandSteps: band, steps: chosen.steps, stepSource: chosen.source });
    }
    return band;
  }

  private bestStepTotal(
    band: number | null,
    phone?: number | null,
  ): { steps: number | null; source: 'band' | 'phone' | null } {
    const state = this.getState();
    const liveSteps = phone ?? state.steps;
    const liveSource = phone != null ? 'phone' : state.stepSource;
    const sessionSource = state.session?.stepSource;
    if (sessionSource === 'phone' && liveSteps != null && liveSource !== 'band') {
      return { steps: liveSteps, source: 'phone' };
    }
    if (sessionSource === 'band' && band != null && band > 0) return { steps: band, source: 'band' };
    if (band != null && band > 0 && (liveSteps == null || band >= liveSteps || liveSource === 'band')) {
      return { steps: band, source: 'band' };
    }
    if (liveSteps != null) return { steps: liveSteps, source: liveSource ?? 'phone' };
    if (state.bandSteps != null) return { steps: state.bandSteps, source: 'band' };
    return { steps: null, source: null };
  }

  private currentStepSnapshot(): { steps: number | null; source: 'band' | 'phone' | null } {
    const state = this.getState();
    if (state.steps != null) {
      const source =
        state.stepSource ?? (state.bandSteps != null && state.steps === state.bandSteps ? 'band' : 'phone');
      return { steps: state.steps, source };
    }
    if (state.bandSteps != null) return { steps: state.bandSteps, source: 'band' };
    return { steps: null, source: null };
  }

  private sessionStepStats(
    session: LiveSession,
    now = Date.now(),
  ): Pick<SessionStats, 'steps' | 'cadenceSpm' | 'stepSource'> {
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
    this.setState({ error: null });
    void this.ble?.start();
  };

  disconnect = (): void => {
    void this.ble?.stop();
    // User asked to disconnect → tear down the keep-alive service too (it only
    // exists to hold the connection open; auto-reconnect keeps it during drops).
    void stopKeepAlive();
    this.setState({ liveHr: null, liveRr: [] });
  };

  /** Opt in/out of the live-diagnostic foreground service. When turned on
   *  while already connected, start it immediately; when turned off, stop it. */
  setBackgroundKeepAlive = async (on: boolean): Promise<void> => {
    this.setState({ backgroundKeepAlive: on });
    await kvSet('backgroundKeepAlive', on ? '1' : '0');
    if (on) {
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
    }
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
    this.armHistoryTimeout();

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
      return;
    }

    const meta = parseHistoryMetadata(frame.inner);
    if (!meta) return;

    if (meta.kind === 'start') {
      this.historyRecords = [];
      this.historyStopQueued = false;
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
              rejectedRecords: 0,
              droppedImplausibleTs: 0,
              versions: [],
            },
      }));
    } else if (meta.kind === 'end') {
      const chunk = this.historyRecords;
      this.historyRecords = [];
      this.enqueueHistoryChunk(chunk, meta);
    } else if (meta.kind === 'complete') {
      this.enqueueHistoryStop('complete');
    }
  }

  private enqueueHistoryChunk(frames: Uint8Array[], meta: Extract<HistoryMetadata, { kind: 'end' }>): void {
    if (this.historyStopQueued) return;
    this.historyCommitQueue = this.historyCommitQueue
      .then(async () => {
        await this.persistHistoryFrames(frames);
        if (this.ble?.canSendCommands) {
          await this.ble.writeCommand(cmdHistoricalDataResult(meta.endData));
        }
      })
      .catch((e) => {
        this.clearHistoryTimeout();
        this.historyStopQueued = true;
        this.setState({ draining: false, capturing: false, error: `History sync failed: ${String(e)}` });
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
        if (mode === 'auto' && reason === 'timeout' && (!stats || stats.records === 0)) {
          this.retryAutoHistoryDrain();
        }
      })
      .catch((e) => {
        this.clearHistoryTimeout();
        this.setState({ draining: false, capturing: false, error: `History sync failed: ${String(e)}` });
      });
  }

  private async persistHistoryFrames(frames: Uint8Array[]): Promise<HistoricalDecodeResult> {
    const rawTs = Date.now();
    for (const frame of frames) {
      await insertHistoryRecord(rawTs, bytesToHex(frame));
    }

    const decoded = decodeWhoop5HistoryFrames(frames);
    for (const sample of decoded.hr) {
      await insertHrSample({ ts: sample.ts, bpm: sample.bpm, rr: sample.rr });
    }
    for (const sample of decoded.steps) {
      await insertStepSample({ ts: sample.ts, counter: sample.counter, activityClass: sample.activityClass });
    }

    this.historySessionStats = mergeHistoryStats(this.historySessionStats, decoded);
    const stats = this.historySessionStats;
    this.setState({
      historySync: {
        status: `Stored ${decoded.hr.length} HR samples from ${frames.length} records`,
        rawRecords: stats.records,
        decodedRecords: stats.decodedRecords,
        hrSamples: stats.hr.length,
        rrSamples: stats.hr.reduce((a, s) => a + s.rr.length, 0),
        stepSamples: stats.steps.length,
        rawSensorRecords: stats.rawSensorRecords,
        rejectedRecords: stats.rejectedRecords,
        droppedImplausibleTs: stats.droppedImplausibleTs,
        versions: stats.versions,
      },
    });

    await this.refreshBandSteps();
    return decoded;
  }

  private async backfillHistoryDays(stats: HistoricalDecodeResult | null): Promise<void> {
    if (!stats) return;
    const days = new Set<string>();
    const today = dayKey(Date.now());
    for (const sample of stats.hr) {
      days.add(dayKey(sample.ts));
      const hour = new Date(sample.ts).getHours();
      if (hour >= 20) days.add(dayKey(addDays(sample.ts, 1)));
      if (hour < 12) days.add(dayKey(sample.ts));
    }
    for (const sample of stats.steps) days.add(dayKey(sample.ts));
    const ordered = [...days].filter((d) => d !== today).sort((a, b) => a.localeCompare(b));
    for (const day of ordered) {
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
    const steps = estimateStepsFromCounters(await getStepSamplesBetween(sod, dayEnd));

    const manualRaw = await kvGet(`manualSleep:${day}`);
    const manual = manualRaw ? (JSON.parse(manualRaw) as { startTs: number; endTs: number }) : null;
    const winStart = manual ? manual.startTs : sod - 4 * 3600 * 1000;
    const winEnd = manual ? manual.endTs : Math.min(sod + 12 * 3600 * 1000, now);
    const nightHr = await getHrSamplesBetween(winStart, winEnd);
    const nightPerMin = perMinuteHr(nightHr);
    const sleepInput: SleepMinute[] = nightPerMin.map((p) => ({ ts: p.tsMs, hr: p.hr, motion: null }));
    let sleep = manual
      ? computeSleep(sleepInput, undefined, {
          forceWindow: true,
          startTs: manual.startTs,
          endTs: manual.endTs,
          source: nightPerMin.length >= 10 ? 'manual_hr' : 'manual_duration',
        })
      : computeSleep(sleepInput);
    if (manual && !sleep) sleep = durationOnlySleep(manual.startTs, manual.endTs);

    let rmssd: number | null = null;
    let rhr: number | null = null;
    let resp: number | null = null;
    const scoredNightHr = sleep ? nightHr.filter((s) => s.ts >= sleep.startTs && s.ts < sleep.endTs) : [];
    if (sleep) {
      const rr = scoredNightHr.flatMap((s) => s.rr);
      rmssd = computeHrv(rr)?.rmssd ?? null;
      resp = respiratoryRate(rr);
      const windowMin = perMinuteHr(scoredNightHr);
      rhr = windowMin.length ? Math.round(Math.min(...windowMin.map((p) => p.hr))) : null;
    }

    const recent = (await getRecentDailyMetrics(60)).filter((d) => d.day < day);
    const debtNights = recent
      .filter((d) => d.sleepMin != null)
      .slice(0, 14)
      .reverse()
      .map((d) => ({ neededMin: d.sleepDetail?.needMin ?? 480, asleepMin: d.sleepMin as number }));
    const accruedDebtMin = sleepDebt(debtNights);
    const napMin = (await listCardio())
      .filter((c) => c.source === 'nap' && c.startTs >= sod && c.startTs < dayEnd)
      .reduce((a, c) => a + Math.round((c.endTs - c.startTs) / 60000), 0);
    const need = computeSleepNeed({ recentStrain: strain, accruedDebtMin, napMin });
    if (sleep) {
      sleep.neededMin = need.neededMin;
      sleep.performance = Math.min(1, sleep.asleepMin / need.neededMin);
    }

    let sleepStressResult: SleepStress | null = null;
    if (sleep) {
      const byMin = new Map<number, { hrs: number[]; rr: number[] }>();
      for (const s of scoredNightHr) {
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
      sleepStressResult = computeSleepStress(epochs);
    }

    let sleepDetail: SleepDetail | null = null;
    if (sleep) {
      const priorWindows = recent
        .filter((d) => d.sleepStart != null && d.sleepEnd != null)
        .map((d) => ({ startTs: d.sleepStart as number, endTs: d.sleepEnd as number }));
      priorWindows.push({ startTs: sleep.startTs, endTs: sleep.endTs });
      const consistency = sleepConsistency(priorWindows);
      const sleepCoveragePct = Math.round((sleep.signalMin / Math.max(1, sleep.inBedMin)) * 100);
      const hoursVsNeededPct = Math.round((sleep.asleepMin / need.neededMin) * 100);
      const efficiencyPct = Math.round(sleep.efficiency * 100);
      const restorativePct = sleep.asleepMin > 0 ? Math.round((sleep.restorativeMin / sleep.asleepMin) * 100) : 0;
      const sleepPerformanceResult = computeSleepPerformance({
        hoursVsNeededPct,
        efficiencyPct,
        consistencyPct: consistency?.score ?? null,
        highStressPct: sleepStressResult?.highPct ?? 0,
      });
      sleepDetail = {
        performance: sleepPerformanceResult.score,
        hoursVsNeeded: hoursVsNeededPct,
        needMin: need.neededMin,
        baselineMin: need.baselineMin,
        napMin: need.napMin,
        strainMin: need.strainMin,
        debtMin: need.debtMin,
        efficiency: efficiencyPct,
        consistency: consistency?.score ?? null,
        restorativeMin: sleep.restorativeMin,
        restorativePct,
        latencyMin: sleep.latencyMin,
        wakeEvents: sleep.wakeEvents,
        inBedMin: sleep.inBedMin,
        stressHigh: sleepStressResult?.highPct ?? null,
        stressMed: sleepStressResult?.medPct ?? null,
        stressLow: sleepStressResult?.lowPct ?? null,
        source: sleep.source,
        signalMin: sleep.signalMin,
        coveragePct: Math.max(0, Math.min(100, sleepCoveragePct)),
      };
    }

    const toDayValues = (pick: (d: DailyMetricRow) => number | null) =>
      recent
        .filter((d) => pick(d) != null)
        .map((d) => ({ day: epochDay(Date.parse(`${d.day}T00:00:00`)), value: pick(d) as number }));
    const rmssdSamples = toDayValues((d) => d.rmssd);
    const rhrSamples = toDayValues((d) => d.rhr);
    const rmssdBaseline = emaBaseline(rmssdSamples) ?? null;
    const rhrBaseline = emaBaseline(rhrSamples) ?? null;
    const rmssdSd = stdev(rmssdSamples.map((s) => s.value)) || 1;
    const rhrSd = stdev(rhrSamples.map((s) => s.value)) || 1;

    let recovery: number | null = null;
    if (rmssd != null && rhr != null && rmssdSamples.length >= 2 && rhrSamples.length >= 2) {
      recovery = computeRecovery({
        rmssd,
        rmssdBaseline: rmssdBaseline ?? rmssd,
        rmssdSd,
        restingHr: rhr,
        rhrBaseline: rhrBaseline ?? rhr,
        rhrSd,
        sleepPerformance: sleep?.performance ?? null,
      }).score;
    }

    await upsertDailyMetric({
      day,
      recovery,
      rmssd,
      rhr,
      resp,
      sleepMin: sleep?.asleepMin ?? null,
      sleepPerf: sleep?.performance ?? null,
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
      const bandSteps = estimateStepsFromCounters(await getStepSamplesBetween(row.startTs, row.endTs));
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
    if (changed) this.setState({ cardio: await listCardio() });
  }

  private armHistoryTimeout(): void {
    this.clearHistoryTimeout();
    this.historyIdleTimer = setTimeout(() => this.enqueueHistoryStop('timeout'), HISTORY_IDLE_TIMEOUT_MS);
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
    if (!this.ble?.canSendCommands) {
      this.setState({ error: 'History drain needs the WHOOP command channel (fd4b0002), not found on this device/firmware.' });
      return;
    }
    this.clearAutoSyncTimer();
    this.clearHistoryTimeout();
    this.eventAssemblers.forEach((asm) => asm.reset());
    this.historyRecords = [];
    this.historySessionStats = null;
    this.historyCommitQueue = Promise.resolve();
    this.historyStopQueued = false;
    this.historyDrainMode = mode;
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
        rejectedRecords: 0,
        droppedImplausibleTs: 0,
        versions: [],
      },
    });
    this.armHistoryTimeout();
    try {
      try {
        await this.ble.writeCommand(cmdGetDataRange());
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
      await this.ble.writeCommand(cmdSendHistoricalData());
      this.setState((s) => ({
        historySync: s.historySync
          ? { ...s.historySync, status: mode === 'auto' ? 'Auto sync: waiting for stored history' : 'Waiting for stored history' }
          : s.historySync,
      }));
      this.armHistoryTimeout();
    } catch (e) {
      this.clearHistoryTimeout();
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
    const durationMin = Math.max(1 / 60, (input.endTs - input.startTs) / 60000);
    const minutes = Math.max(1, Math.round(durationMin));
    const hrRows = await getHrSamplesBetween(input.startTs, input.endTs).catch(() => []);
    const bpms = hrRows.map((r) => r.bpm);
    const avgHr = bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : input.avgHr;
    const maxHr = bpms.length ? Math.max(...bpms) : input.maxHr ?? null;
    const perMinSamples = perMinuteHr(hrRows).map((p) => ({ hr: p.hr, minutes: 1 }));
    const load = perMinSamples.length
      ? edwardsTrimp(perMinSamples, profile)
      : input.avgHr
        ? edwardsTrimp([{ hr: input.avgHr, minutes }], profile)
        : null;
    const strain = load !== null ? strainFromLoad(load) : null;
    // Calories from HR (Keytel) — the WHOOP-style HR-driven energy estimate.
    const kcal = perMinSamples.length
      ? totalKcal(perMinSamples, profile)
      : input.avgHr
        ? Math.round(kcalPerMinute(input.avgHr, profile) * minutes)
        : null;
    const bandActivitySteps =
      input.steps == null
        ? estimateStepsFromCounters(await getStepSamplesBetween(input.startTs, input.endTs).catch(() => []))
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
      steps: activitySteps ?? null,
      cadenceSpm: input.cadenceSpm ?? (activitySteps != null ? Math.round(activitySteps / durationMin) : null),
      stepSource,
      lapCount: input.lapCount ?? null,
      source: input.source ?? 'manual',
      notes: input.notes ?? null,
    };
    await insertCardio(row);
    this.setState({ cardio: await listCardio() });
    await this.recomputeToday();
  };

  removeCardio = async (id: string): Promise<void> => {
    await deleteCardio(id);
    this.setState({ cardio: await listCardio() });
    await this.recomputeToday();
  };

  // ---- manual / adjusted sleep window ----
  setManualSleep = async (startTs: number, endTs: number): Promise<void> => {
    await kvSet(`manualSleep:${dayKey(Date.now())}`, JSON.stringify({ startTs, endTs }));
    await this.recomputeToday();
  };

  clearManualSleep = async (): Promise<void> => {
    await kvSet(`manualSleep:${dayKey(Date.now())}`, '');
    await this.recomputeToday();
  };

  // ---- live session (start / track / log) ----
  startSession = (kind: SessionKind, label: string, hasGps = false, plan: StructuredWorkout | null = null): void => {
    const stepSnapshot = this.currentStepSnapshot();
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
  startPlannedSession = (workout: StructuredWorkout): void => {
    this.startSession('workout', workout.name, activityGps(workout.activity), workout);
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
    await this.addCardio({
      activity: s.label,
      startTs: s.startTs,
      endTs,
      avgHr: stats?.avgHr ?? s.maxHr ?? null,
      maxHr: stats?.maxHr ?? s.maxHr ?? null,
      distanceM: gpsDistance,
      route: s.route.length ? s.route : null,
      steps: stats?.steps ?? null,
      cadenceSpm: stats?.cadenceSpm ?? null,
      stepSource: stats?.stepSource ?? null,
      lapCount: s.laps.length,
      source: s.kind === 'nap' ? 'nap' : 'live',
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
    this.setState({ recentDays: await getRecentDailyMetrics(30), cardio: await listCardio() });
  };

  recomputeToday = async (): Promise<void> => {
    const profile = this.getState().profile;
    const now = Date.now();
    const sod = startOfDayMs(now);
    const today = dayKey(now);

    // Daytime strain from per-minute HR.
    const dayHr = await getHrSamplesBetween(sod, now);
    const perMin = perMinuteHr(dayHr);
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
    const sleepInput: SleepMinute[] = nightPerMin.map((p) => ({ ts: p.tsMs, hr: p.hr, motion: null }));
    let sleep = manual
      ? computeSleep(sleepInput, undefined, {
          forceWindow: true,
          startTs: manual.startTs,
          endTs: manual.endTs,
          source: nightPerMin.length >= 10 ? 'manual_hr' : 'manual_duration',
        })
      : computeSleep(sleepInput);
    if (manual && !sleep) {
      sleep = durationOnlySleep(manual.startTs, manual.endTs);
    }

    // Overnight RMSSD + RHR + respiratory rate within the detected sleep window.
    let rmssd: number | null = null;
    let rhr: number | null = null;
    let resp: number | null = null;
    const scoredNightHr = sleep ? nightHr.filter((s) => s.ts >= sleep.startTs && s.ts < sleep.endTs) : [];
    if (sleep) {
      const inWindow = scoredNightHr;
      const rr = inWindow.flatMap((s) => s.rr);
      rmssd = computeHrv(rr)?.rmssd ?? null;
      resp = respiratoryRate(rr);
      const windowMin = perMinuteHr(inWindow);
      rhr = windowMin.length ? Math.round(Math.min(...windowMin.map((p) => p.hr))) : null;
    }

    // Baselines from prior days (exclude today).
    const recent = (await getRecentDailyMetrics(30)).filter((d) => d.day !== today);

    // Sleep Debt: rolling deficit over the trailing nights (needed − asleep),
    // using each night's stored Sleep Need where available, else the baseline.
    const debtNights = recent
      .filter((d) => d.sleepMin != null)
      .slice(0, 14)
      .reverse() // oldest → newest for the rolling carry
      .map((d) => ({ neededMin: d.sleepDetail?.needMin ?? 480, asleepMin: d.sleepMin as number }));
    const accruedDebtMin = sleepDebt(debtNights);
    const napMin = (await listCardio())
      .filter((c) => c.source === 'nap' && c.startTs >= sod)
      .reduce((a, c) => a + Math.round((c.endTs - c.startTs) / 60000), 0);
    const need = computeSleepNeed({ recentStrain: strain, accruedDebtMin, napMin });
    if (sleep) {
      sleep.neededMin = need.neededMin;
      sleep.performance = Math.min(1, sleep.asleepMin / need.neededMin);
    }
    const sleepCoveragePct = sleep
      ? Math.round((sleep.signalMin / Math.max(1, sleep.inBedMin)) * 100)
      : Math.round((nightPerMin.length / captureWindowMin) * 100);
    const sleepCapture: AppState['sleepCapture'] = {
      windowMin: sleep?.inBedMin ?? captureWindowMin,
      signalMin: sleep?.signalMin ?? nightPerMin.length,
      coveragePct: Math.max(0, Math.min(100, sleepCoveragePct)),
      rrCount: (sleep ? scoredNightHr : nightHr).reduce((a, s) => a + s.rr.length, 0),
      source: sleep?.source ?? null,
      note: sleepCaptureNote({
        hasSleep: !!sleep,
        manual: !!manual,
        signalMin: sleep?.signalMin ?? nightPerMin.length,
        coveragePct: Math.max(0, Math.min(100, sleepCoveragePct)),
      }),
    };
    const sleepScoreResult = sleep ? computeSleepScore(sleep) : null;

    // Sleep regularity / consistency over stored windows (prior nights + tonight).
    const priorWindows = recent
      .filter((d) => d.sleepStart != null && d.sleepEnd != null)
      .map((d) => ({ startTs: d.sleepStart as number, endTs: d.sleepEnd as number }));
    if (sleep) priorWindows.push({ startTs: sleep.startTs, endTs: sleep.endTs });
    const sleepReg = sleepRegularity(priorWindows);
    const consistency = sleepConsistency(priorWindows);

    // ---- WHOOP-style Sleep Stress (0-3) over time-in-bed, from R-R + HR ----
    let sleepStressResult: SleepStress | null = null;
    if (sleep) {
      const winSamples = nightHr.filter((s) => s.ts >= sleep.startTs && s.ts < sleep.endTs);
      const byMin = new Map<number, { hrs: number[]; rr: number[] }>();
      for (const s of winSamples) {
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
      sleepStressResult = computeSleepStress(epochs);
    }

    // ---- WHOOP-style Sleep Performance composite + 4 contributors ----
    let sleepPerformanceResult: SleepPerformance | null = null;
    let sleepDetail: SleepDetail | null = null;
    if (sleep) {
      const hoursVsNeededPct = Math.round((sleep.asleepMin / need.neededMin) * 100);
      const efficiencyPct = Math.round(sleep.efficiency * 100);
      const restorativePct =
        sleep.asleepMin > 0 ? Math.round((sleep.restorativeMin / sleep.asleepMin) * 100) : 0;
      const highStressPct = sleepStressResult?.highPct ?? 0;
      sleepPerformanceResult = computeSleepPerformance({
        hoursVsNeededPct,
        efficiencyPct,
        consistencyPct: consistency?.score ?? null,
        highStressPct,
      });
      sleepDetail = {
        performance: sleepPerformanceResult.score,
        hoursVsNeeded: hoursVsNeededPct,
        needMin: need.neededMin,
        baselineMin: need.baselineMin,
        napMin: need.napMin,
        strainMin: need.strainMin,
        debtMin: need.debtMin,
        efficiency: efficiencyPct,
        consistency: consistency?.score ?? null,
        restorativeMin: sleep.restorativeMin,
        restorativePct,
        latencyMin: sleep.latencyMin,
        wakeEvents: sleep.wakeEvents,
        inBedMin: sleep.inBedMin,
        stressHigh: sleepStressResult?.highPct ?? null,
        stressMed: sleepStressResult?.medPct ?? null,
        stressLow: sleepStressResult?.lowPct ?? null,
        source: sleep.source,
        signalMin: sleep.signalMin,
        coveragePct: sleepCoveragePct,
      };
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
    if (rmssd != null && rhr != null && rmssdSamples.length >= 2 && rhrSamples.length >= 2) {
      const r = computeRecovery({
        rmssd,
        rmssdBaseline: rmssdBaseline ?? rmssd,
        rmssdSd,
        restingHr: rhr,
        rhrBaseline: rhrBaseline ?? rhr,
        rhrSd,
        sleepPerformance: sleep?.performance ?? null,
      });
      recovery = r.score;
      recoveryParts = { hrvSub: r.hrvSub, rhrSub: r.rhrSub, sleepSub: r.sleepSub };
    }

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
    });

    const row: DailyMetricRow = {
      day: today,
      recovery,
      rmssd,
      rhr,
      resp,
      sleepMin: sleep?.asleepMin ?? null,
      sleepPerf: sleep?.performance ?? null,
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
      bandSteps: bandStepsToday ?? this.getState().bandSteps,
      steps: bestSteps,
      stepSource: stepChoice.source ?? this.getState().stepSource,
      trainingReadiness,
      recoveryParts,
      hrvBal,
      illness,
      resilience: resilienceResult,
      cardioAge: cardioAgeResult,
      recentDays: await getRecentDailyMetrics(30),
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
    const steps = estimateStepsFromCounters(await getStepSamplesBetween(d.startTs, d.endTs));
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

function dayStartFromKey(day: string): number {
  return new Date(`${day}T00:00:00`).getTime();
}

function sleepCaptureNote(input: {
  hasSleep: boolean;
  manual: boolean;
  signalMin: number;
  coveragePct: number;
}): string {
  if (input.hasSleep && input.signalMin >= 120 && input.coveragePct >= 60) {
    return 'Strong synced overnight HR coverage.';
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
  const summary = `${sync.hrSamples} HR, ${sync.stepSamples} step rows from ${sync.rawRecords} records`;
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
      rejectedRecords: safeInt(r.rejectedRecords),
      droppedImplausibleTs: safeInt(r.droppedImplausibleTs),
      versions: Array.isArray(r.versions) ? r.versions.filter((v): v is number => typeof v === 'number') : [],
      finishedTs: typeof r.finishedTs === 'number' ? r.finishedTs : undefined,
      reason: r.reason,
      mode: r.mode,
    };
  } catch {
    return null;
  }
}

function safeInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0;
}

function mergeHistoryStats(prev: HistoricalDecodeResult | null, next: HistoricalDecodeResult): HistoricalDecodeResult {
  if (!prev) return { ...next, hr: [...next.hr], steps: [...next.steps], versions: [...next.versions] };
  const versions = new Set([...prev.versions, ...next.versions]);
  return {
    hr: [...prev.hr, ...next.hr],
    steps: [...prev.steps, ...next.steps],
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

function estimateStepsFromCounters(rows: Array<{ ts: number; counter: number }>): number | null {
  if (rows.length < 2) return null;
  const sorted = rows.slice().sort((a, b) => a.ts - b.ts);
  let total = 0;
  let usable = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (!prev || !cur) continue;
    const dtSec = Math.max(1, (cur.ts - prev.ts) / 1000);
    let delta = cur.counter - prev.counter;
    if (delta < 0 && prev.counter > 60_000 && cur.counter < 5_000) {
      delta += 65_536;
    }
    if (delta < 0) continue;
    // Keep plausible human cadence only; this is a raw band counter, not a
    // number to trust blindly after a corrupted chunk or firmware layout shift.
    if (delta / dtSec > 6 || delta > 5_000) continue;
    total += delta;
    usable += 1;
  }
  return usable > 0 ? Math.max(0, Math.round(total)) : null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const appStore = new AppStore();
