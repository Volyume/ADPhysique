/**
 * Application store + sync orchestrator. Owns the WhoopBle connection, persists
 * the live HR/R-R stream to SQLite, recomputes daily metrics (recovery, sleep,
 * strain, HRV) from the stored stream, and drives the proprietary history drain.
 *
 * The live stream is the dependable backbone: while connected (including
 * overnight via the bluetooth-central background mode) every HR notification is
 * logged, and recovery/sleep/strain are derived from that log using the pure
 * functions in src/metrics. The history drain backfills gaps; its per-second
 * record decode is still experimental (see historicalParse.ts).
 */

import { AppState as RNAppState, AppStateStatus, Share } from 'react-native';

import { Store } from './store';
import { WhoopBle, WhoopStatus, RawFrame } from '../ble/whoopBle';
import { bytesToHex, hexToBytes } from '../ble/bytes';
import { FrameAssembler, PacketType } from '../whoop/maverick';
import {
  cmdEnableDeepStreams,
  cmdEnterHighFreqSync,
  cmdHistoricalDataResult,
  cmdSendHistoricalData,
  parseHistoryEnd,
} from '../whoop/commands';
import {
  CardioRow,
  DailyMetricRow,
  getHrSamplesBetween,
  getRecentDailyMetrics,
  insertCardio,
  insertHrSample,
  insertJournal,
  insertRawFrame,
  insertHistoryRecord,
  countHistoryRecords,
  kvGet,
  kvSet,
  listCardio,
  listJournal,
  deleteCardio,
  pruneHrSamples,
  upsertDailyMetric,
} from '../db/database';
import { LocationTracker } from '../sensors/location';
import { DEFAULT_PROFILE, loadProfile, saveProfile } from '../db/profile';
import { computeHrv } from '../metrics/hrv';
import { emaBaseline, stdev } from '../metrics/ema';
import { computeRecovery } from '../metrics/recovery';
import { computeSleep, computeSleepNeed, SleepMinute, SleepNeed, SleepResult } from '../metrics/sleep';
import { computeSleepScore, SleepScore } from '../metrics/sleepScore';
import { sleepRegularity, SleepRegularity } from '../metrics/sleepRegularity';
import { edwardsTrimp, hrZones, strainFromLoad, totalTrimp, UserProfile } from '../metrics/strain';
import { respiratoryRate } from '../metrics/respiratory';
import { computeStress } from '../metrics/stress';
import { computeHealthMonitor, HealthMonitorResult } from '../metrics/healthMonitor';
import { decodeAccel, decodeHeartbeatSteps, isAccelFrame } from '../whoop/strapEvents';
import { StepCounter } from '../metrics/stepDetect';
import { hrvBalance, HrvBalance } from '../metrics/hrvBalance';
import { illnessRisk, IllnessResult } from '../metrics/illness';
import { resilience, Resilience } from '../metrics/resilience';
import { cardioAge } from '../metrics/cardioAge';
import { addDays, dayKey, epochDay, startOfDayMs } from '../util/time';

export type SessionKind = 'workout' | 'sleep' | 'nap';
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
};
export type SessionStats = {
  elapsedSec: number;
  avgHr: number | null;
  maxHr: number | null;
  strain: number | null;
  zones: ReturnType<typeof hrZones>;
  beats: number;
};

// Distance-based outdoor sports get phone GPS, mirroring WHOOP's per-sport
// SportDto.has_gps flag (court/indoor sports record HR only, no route/distance).
const GPS_SPORTS = ['run', 'walk', 'cycl', 'bike', 'hik', 'ruck'];
export function activityUsesGps(label: string): boolean {
  const l = label.toLowerCase();
  return GPS_SPORTS.some((k) => l.includes(k));
}

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
  today: DailyMetricRow | null;
  recentDays: DailyMetricRow[];
  lastSleep: SleepResult | null;
  sleepNeed: SleepNeed | null;
  sleepScore: SleepScore | null;
  sleepReg: SleepRegularity | null;
  sleepGoal: number; // target fraction of sleep need: 0.7 / 0.85 / 1.0
  // Oura-style derived insights (all HR/R-R only):
  recoveryParts: { hrvSub: number; rhrSub: number; sleepSub: number } | null;
  hrvBal: HrvBalance | null;
  illness: IllnessResult | null;
  resilience: Resilience | null;
  cardioAge: number | null;
  cardio: CardioRow[];
  session: LiveSession | null;
  bandSteps: number | null; // steps counted from the strap accelerometer (beta)
  hbStepRaw: number | null; // candidate heartbeat step byte (diagnostic, unconfirmed)
  bufferedRecords: number; // raw history records drained from the strap buffer
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
  today: null,
  recentDays: [],
  lastSleep: null,
  sleepNeed: null,
  sleepScore: null,
  sleepReg: null,
  sleepGoal: 0.85,
  recoveryParts: null,
  hrvBal: null,
  illness: null,
  resilience: null,
  cardioAge: null,
  cardio: [],
  session: null,
  bandSteps: null,
  hbStepRaw: null,
  bufferedRecords: 0,
  lastSyncTs: null,
  profile: DEFAULT_PROFILE,
  error: null,
};

const HR_RETENTION_DAYS = 21;
const ROLLING_RR_WINDOW = 120; // keep last ~120 R-R intervals for live HRV
// How often to recompute + persist derived metrics from the stored stream while
// the app is alive, so every screen reflects ongoing data without being opened.
const RECOMPUTE_INTERVAL_MS = 60 * 1000;

class AppStore extends Store<AppState> {
  private ble: WhoopBle | null = null;
  private assembler = new FrameAssembler();
  private rollingRr: number[] = [];
  private lastPersistTs = 0;
  private historyRecords: Uint8Array[] = [];
  private eventAssemblers = new Map<string, FrameAssembler>();
  private locTracker: LocationTracker | null = null;
  private recomputeTimer: ReturnType<typeof setInterval> | null = null;
  private appStateSub: { remove: () => void } | null = null;
  private autoDrainedFor = ''; // device id we've already auto-drained this connection
  private lastStatus: WhoopStatus = 'idle';
  private stepCounter = new StepCounter();
  private stepDay = '';

  constructor() {
    super(initialState);
  }

  async init(): Promise<void> {
    const profile = await loadProfile();
    const goalRaw = await kvGet('sleepGoal');
    const sleepGoal = goalRaw ? Number(goalRaw) : 0.85;
    this.setState({ profile, sleepGoal: Number.isFinite(sleepGoal) ? sleepGoal : 0.85 });
    this.ble = new WhoopBle({
      onStatus: (status, detail) => this.onStatus(status, detail),
      onDevice: (device) => this.setState({ device }),
      onBattery: (battery) => this.setState({ battery }),
      onError: (error) => this.setState({ error }),
      onHeartRate: (s) => void this.onHeartRate(s.bpm, s.rrMs),
      onRawFrame: (f) => this.onRawFrame(f),
    });
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

  /** Connection-status transitions. On a fresh connect, auto-drain the strap's
   *  on-device buffer so anything recorded while we were away is pulled in. */
  private onStatus(status: WhoopStatus, detail?: string): void {
    this.setState({ status, statusDetail: detail ?? '' });
    const device = this.getState().device;
    if (status === 'connected' && device && this.autoDrainedFor !== device.id) {
      this.autoDrainedFor = device.id;
      // Give the link a moment to settle, then backfill from the strap buffer.
      setTimeout(() => void this.runHistoryDrain().catch(() => {}), 1500);
    }
    if (status === 'disconnected' || status === 'idle') {
      this.autoDrainedFor = '';
    }
    this.lastStatus = status;
  }

  private startBackgroundRecompute(): void {
    if (this.recomputeTimer) return;
    this.recomputeTimer = setInterval(() => {
      void this.refreshDerived().catch(() => {});
    }, RECOMPUTE_INTERVAL_MS);
  }

  private onAppState(s: AppStateStatus): void {
    if (s === 'active') void this.refreshDerived().catch(() => {});
  }

  connect = (): void => {
    this.setState({ error: null });
    void this.ble?.start();
  };

  disconnect = (): void => {
    void this.ble?.stop();
    this.setState({ liveHr: null, liveRr: [] });
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
          if (isAccelFrame(frame)) {
            const day = dayKey(Date.now());
            if (day !== this.stepDay) {
              this.stepCounter.reset();
              this.stepDay = day;
            }
            const t = Date.now();
            for (const a of decodeAccel(frame)) this.stepCounter.add(a.x, a.y, a.z, t);
            this.setState({ bandSteps: this.stepCounter.count });
          }
        }
      } catch {
        // Malformed frame — ignore.
      }
    }

    // Feed the data channel into the Maverick assembler for the history drain.
    if (f.source === 'fd4b0005' && this.getState().draining) {
      const frames = this.assembler.push(hexToBytes(f.hex));
      for (const frame of frames) {
        if (frame.packetType === PacketType.HISTORICAL_DATA) {
          this.historyRecords.push(frame.payload);
          // Persist the raw buffered record LOSSLESSLY so nothing recorded by the
          // strap while we were away is ever discarded — even before the
          // per-second byte layout is confirmed, these can be re-decoded later.
          void insertHistoryRecord(Date.now(), bytesToHex(frame.payload));
          this.setState((s) => ({ bufferedRecords: s.bufferedRecords + 1 }));
        } else if (frame.packetType === PacketType.METADATA) {
          const end = parseHistoryEnd(frame.inner.subarray(2));
          if (end && this.ble) {
            void this.ble.writeCommand(cmdHistoricalDataResult(end.startId, end.endId));
            // History segment complete.
            this.setState({ draining: false, lastSyncTs: Date.now() });
            // Re-derive every metric now that the buffer has been folded in.
            void this.refreshDerived().catch(() => {});
          }
        }
      }
    }
  }

  toggleCapture = (): void => {
    this.setState((s) => ({ capturing: !s.capturing }));
  };

  /**
   * Run the historical drain handshake (EXPERIMENTAL — per-second record decode
   * is not finalised; this collects raw history records for offline decoding).
   */
  runHistoryDrain = async (): Promise<void> => {
    if (!this.ble?.canSendCommands) {
      this.setState({ error: 'History drain needs the WHOOP command channel (fd4b0002), not found on this device/firmware.' });
      return;
    }
    this.assembler.reset();
    this.historyRecords = [];
    this.setState({ draining: true, capturing: true, error: null });
    try {
      // Unlock the deep optical/PPG + history streams first (see commands.ts);
      // without this a fresh client only gets live HR. Hello-handshake bytes
      // still need on-hardware validation, so this is best-effort.
      await this.ble.writeCommand(cmdEnableDeepStreams());
      await delay(300);
      await this.ble.writeCommand(cmdEnterHighFreqSync());
      await delay(500);
      await this.ble.writeCommand(cmdSendHistoricalData());
    } catch (e) {
      this.setState({ draining: false, error: `History drain failed: ${String(e)}` });
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
    distanceM?: number | null;
    notes?: string;
    source?: string;
  }): Promise<void> => {
    const profile = this.getState().profile;
    const minutes = Math.max(1, Math.round((input.endTs - input.startTs) / 60000));
    const load = input.avgHr ? edwardsTrimp([{ hr: input.avgHr, minutes }], profile) : null;
    const strain = load !== null ? strainFromLoad(load) : null;
    const row: CardioRow = {
      id: `c_${input.startTs}`,
      startTs: input.startTs,
      endTs: input.endTs,
      activity: input.activity,
      avgHr: input.avgHr,
      trimp: load !== null ? Math.round(load) : null,
      strain,
      kcal: null,
      distanceM: input.distanceM ?? null,
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
  startSession = (kind: SessionKind, label: string, hasGps = false): void => {
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
      },
    });
    if (hasGps) void this.startGps();
  };

  /** Begin phone-GPS tracking for the active session (WHOOP uses the phone, not
   *  the strap, for GPS). Distance/pace/route stream into the session state. */
  private async startGps(): Promise<void> {
    this.locTracker?.stop();
    this.locTracker = new LocationTracker();
    const ok = await this.locTracker.start((u) => {
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
    if (!ok) {
      // Permission denied / GPS unavailable — keep recording HR, just no distance.
      const s = this.getState().session;
      if (s) this.setState({ session: { ...s, hasGps: false, distanceM: null } });
    }
  }

  private stopGps(): number | null {
    if (!this.locTracker) return null;
    const { distanceM } = this.locTracker.stop();
    this.locTracker = null;
    return distanceM > 0 ? distanceM : null;
  }

  addLap = (): void => {
    const s = this.getState().session;
    if (s) this.setState({ session: { ...s, laps: [...s.laps, Date.now()] } });
  };

  discardSession = (): void => {
    this.stopGps();
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
    return { elapsedSec: Math.round((now - s.startTs) / 1000), avgHr, maxHr, strain, zones, beats: rows.length };
  };

  /** Stop the session and (optionally) save it: workout/nap → cardio, sleep → manual window. */
  stopSession = async (save = true): Promise<void> => {
    const s = this.getState().session;
    if (!s) return;
    const endTs = Date.now();
    // Capture stats while the session is still active, then clear it.
    const stats = save ? await this.sessionStats().catch(() => null) : null;
    const gpsDistance = this.stopGps() ?? s.distanceM;
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
      distanceM: gpsDistance,
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

    // Last night's window. A manual override (logged/adjusted by the user) takes
    // precedence and is scored over exactly those bounds; otherwise auto-detect
    // within 20:00 previous day -> noon today.
    const manualRaw = await kvGet(`manualSleep:${today}`);
    const manual = manualRaw ? (JSON.parse(manualRaw) as { startTs: number; endTs: number }) : null;
    const winStart = manual ? manual.startTs : sod - 4 * 3600 * 1000;
    const winEnd = manual ? manual.endTs : Math.min(sod + 12 * 3600 * 1000, now);
    const nightHr = await getHrSamplesBetween(winStart, winEnd);
    const nightPerMin = perMinuteHr(nightHr);
    const sleepInput: SleepMinute[] = nightPerMin.map((p) => ({ ts: p.tsMs, hr: p.hr, motion: null }));
    let sleep = computeSleep(sleepInput, undefined, { forceWindow: !!manual });
    if (manual && !sleep) {
      // Manual window with no strap data: record the duration only (no stages).
      const inBedMin = Math.max(1, Math.round((manual.endTs - manual.startTs) / 60000));
      const asleepMin = Math.round(inBedMin * 0.9);
      sleep = {
        startTs: manual.startTs,
        endTs: manual.endTs,
        inBedMin,
        asleepMin,
        efficiency: 0.9,
        stages: { awake: inBedMin - asleepMin, light: asleepMin, deep: 0, rem: 0 },
        hypnogram: [{ stage: 'light', minutes: asleepMin }],
        performance: null,
        neededMin: 480,
      };
    }

    // Overnight RMSSD + RHR + respiratory rate within the detected sleep window.
    let rmssd: number | null = null;
    let rhr: number | null = null;
    let resp: number | null = null;
    if (sleep) {
      const inWindow = nightHr.filter((s) => s.ts >= sleep.startTs && s.ts <= sleep.endTs);
      const rr = inWindow.flatMap((s) => s.rr);
      rmssd = computeHrv(rr)?.rmssd ?? null;
      resp = respiratoryRate(rr);
      const windowMin = perMinuteHr(inWindow);
      rhr = windowMin.length ? Math.round(Math.min(...windowMin.map((p) => p.hr))) : null;
    }

    // Baselines from prior days (exclude today).
    const recent = (await getRecentDailyMetrics(30)).filter((d) => d.day !== today);

    // Dynamic Sleep Need: baseline + recent strain + accrued debt − naps.
    const recentNights = recent.filter((d) => d.sleepMin != null).slice(0, 3);
    const accruedDebtMin = recentNights.reduce(
      (a, d) => a + Math.max(0, 480 - (d.sleepMin as number)),
      0,
    );
    const napMin = (await listCardio())
      .filter((c) => c.source === 'nap' && c.startTs >= sod)
      .reduce((a, c) => a + Math.round((c.endTs - c.startTs) / 60000), 0);
    const need = computeSleepNeed({ recentStrain: strain, accruedDebtMin, napMin });
    if (sleep) {
      sleep.neededMin = need.neededMin;
      sleep.performance = Math.min(1, sleep.asleepMin / need.neededMin);
    }
    const sleepScoreResult = sleep ? computeSleepScore(sleep) : null;

    // Sleep regularity over stored windows (prior nights + tonight).
    const priorWindows = recent
      .filter((d) => d.sleepStart != null && d.sleepEnd != null)
      .map((d) => ({ startTs: d.sleepStart as number, endTs: d.sleepEnd as number }));
    if (sleep) priorWindows.push({ startTs: sleep.startTs, endTs: sleep.endTs });
    const sleepReg = sleepRegularity(priorWindows);
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

    const row: DailyMetricRow = {
      day: today,
      recovery,
      rmssd,
      rhr,
      resp,
      sleepMin: sleep?.asleepMin ?? null,
      sleepPerf: sleep?.performance ?? null,
      strain,
      steps: this.getState().bandSteps, // counted from the strap accelerometer (beta)
      sleepStart: sleep?.startTs ?? null,
      sleepEnd: sleep?.endTs ?? null,
      deepMin: sleep?.stages.deep ?? null,
      remMin: sleep?.stages.rem ?? null,
      lightMin: sleep?.stages.light ?? null,
      awakeMin: sleep?.stages.awake ?? null,
      updatedAt: now,
    };
    await upsertDailyMetric(row);
    this.setState({
      today: row,
      lastSleep: sleep,
      sleepNeed: need,
      sleepScore: sleepScoreResult,
      sleepReg,
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const appStore = new AppStore();
