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

import { Share } from 'react-native';

import { Store } from './store';
import { WhoopBle, WhoopStatus, RawFrame } from '../ble/whoopBle';
import { hexToBytes } from '../ble/bytes';
import { FrameAssembler, PacketType } from '../whoop/maverick';
import {
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
  listCardio,
  pruneHrSamples,
  upsertDailyMetric,
} from '../db/database';
import { DEFAULT_PROFILE, loadProfile, saveProfile } from '../db/profile';
import { computeHrv } from '../metrics/hrv';
import { emaBaseline, stdev } from '../metrics/ema';
import { computeRecovery } from '../metrics/recovery';
import { computeSleep, SleepMinute, SleepResult } from '../metrics/sleep';
import { hrZones, totalTrimp, trimpToStrain, UserProfile } from '../metrics/strain';
import { addDays, dayKey, epochDay, startOfDayMs } from '../util/time';

export type AppState = {
  ready: boolean;
  status: WhoopStatus;
  statusDetail: string;
  device: { id: string; name: string } | null;
  battery: number | null;
  liveHr: number | null;
  liveRr: number[];
  liveRmssd: number | null;
  frameCount: number;
  capturing: boolean;
  draining: boolean;
  today: DailyMetricRow | null;
  recentDays: DailyMetricRow[];
  lastSleep: SleepResult | null;
  cardio: CardioRow[];
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
  frameCount: 0,
  capturing: false,
  draining: false,
  today: null,
  recentDays: [],
  lastSleep: null,
  cardio: [],
  profile: DEFAULT_PROFILE,
  error: null,
};

const HR_RETENTION_DAYS = 21;
const ROLLING_RR_WINDOW = 120; // keep last ~120 R-R intervals for live HRV

class AppStore extends Store<AppState> {
  private ble: WhoopBle | null = null;
  private assembler = new FrameAssembler();
  private rollingRr: number[] = [];
  private lastPersistTs = 0;
  private historyRecords: Uint8Array[] = [];

  constructor() {
    super(initialState);
  }

  async init(): Promise<void> {
    const profile = await loadProfile();
    this.setState({ profile });
    this.ble = new WhoopBle({
      onStatus: (status, detail) => this.setState({ status, statusDetail: detail ?? '' }),
      onDevice: (device) => this.setState({ device }),
      onBattery: (battery) => this.setState({ battery }),
      onError: (error) => this.setState({ error }),
      onHeartRate: (s) => void this.onHeartRate(s.bpm, s.rrMs),
      onRawFrame: (f) => this.onRawFrame(f),
    });
    await this.refreshDerived();
    await pruneHrSamples(addDays(Date.now(), -HR_RETENTION_DAYS));
    this.setState({ ready: true });
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
    this.setState({ liveHr: bpm, liveRr: rr, liveRmssd: hrv?.rmssd ?? null });

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

    // Feed the data channel into the Maverick assembler for the history drain.
    if (f.source === 'fd4b0005' && this.getState().draining) {
      const frames = this.assembler.push(hexToBytes(f.hex));
      for (const frame of frames) {
        if (frame.packetType === PacketType.HISTORICAL_DATA) {
          this.historyRecords.push(frame.payload);
        } else if (frame.packetType === PacketType.METADATA) {
          const end = parseHistoryEnd(frame.inner.subarray(2));
          if (end && this.ble) {
            void this.ble.writeCommand(cmdHistoricalDataResult(end.startId, end.endId));
            // History segment complete.
            this.setState({ draining: false });
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
    notes?: string;
    source?: string;
  }): Promise<void> => {
    const profile = this.getState().profile;
    const minutes = Math.max(1, Math.round((input.endTs - input.startTs) / 60000));
    const trimp = input.avgHr ? totalTrimp([{ hr: input.avgHr, minutes }], profile) : null;
    const strain = trimp !== null ? trimpToStrain(trimp) : null;
    const row: CardioRow = {
      id: `c_${input.startTs}`,
      startTs: input.startTs,
      endTs: input.endTs,
      activity: input.activity,
      avgHr: input.avgHr,
      trimp: trimp !== null ? Math.round(trimp) : null,
      strain,
      kcal: null,
      source: input.source ?? 'manual',
      notes: input.notes ?? null,
    };
    await insertCardio(row);
    this.setState({ cardio: await listCardio() });
  };

  // ---- journal ----
  addJournal = async (behaviour: string, value: string): Promise<void> => {
    const now = Date.now();
    await insertJournal({ id: `j_${now}`, day: dayKey(now), behaviour, value, createdAt: now });
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
    const trimp = totalTrimp(strainSamples, profile);
    const strain = strainSamples.length ? trimpToStrain(trimp) : null;

    // Last night's window: 20:00 previous day -> noon today (clamped to now).
    const nightStart = sod - 4 * 3600 * 1000;
    const nightEnd = Math.min(sod + 12 * 3600 * 1000, now);
    const nightHr = await getHrSamplesBetween(nightStart, nightEnd);
    const nightPerMin = perMinuteHr(nightHr);
    const sleepInput: SleepMinute[] = nightPerMin.map((p) => ({ ts: p.tsMs, hr: p.hr, motion: null }));
    const sleep = computeSleep(sleepInput);

    // Overnight RMSSD + RHR within the detected sleep window.
    let rmssd: number | null = null;
    let rhr: number | null = null;
    if (sleep) {
      const inWindow = nightHr.filter((s) => s.ts >= sleep.startTs && s.ts <= sleep.endTs);
      const rr = inWindow.flatMap((s) => s.rr);
      rmssd = computeHrv(rr)?.rmssd ?? null;
      const windowMin = perMinuteHr(inWindow);
      rhr = windowMin.length ? Math.round(Math.min(...windowMin.map((p) => p.hr))) : null;
    }

    // Baselines from prior days (exclude today).
    const recent = (await getRecentDailyMetrics(30)).filter((d) => d.day !== today);
    const rmssdSamples = recent
      .filter((d) => d.rmssd != null)
      .map((d) => ({ day: epochDay(Date.parse(`${d.day}T00:00:00`)), value: d.rmssd as number }));
    const rhrSamples = recent
      .filter((d) => d.rhr != null)
      .map((d) => ({ day: epochDay(Date.parse(`${d.day}T00:00:00`)), value: d.rhr as number }));

    let recovery: number | null = null;
    if (rmssd != null && rhr != null && rmssdSamples.length >= 2 && rhrSamples.length >= 2) {
      const r = computeRecovery({
        rmssd,
        rmssdBaseline: emaBaseline(rmssdSamples) ?? rmssd,
        rmssdSd: stdev(rmssdSamples.map((s) => s.value)) || 1,
        restingHr: rhr,
        rhrBaseline: emaBaseline(rhrSamples) ?? rhr,
        rhrSd: stdev(rhrSamples.map((s) => s.value)) || 1,
        sleepPerformance: sleep?.performance ?? null,
      });
      recovery = r.score;
    }

    const row: DailyMetricRow = {
      day: today,
      recovery,
      rmssd,
      rhr,
      sleepMin: sleep?.asleepMin ?? null,
      sleepPerf: sleep?.performance ?? null,
      strain,
      steps: null, // from band IMU — pending history decode (see historicalParse.ts)
      updatedAt: now,
    };
    await upsertDailyMetric(row);
    this.setState({ today: row, lastSleep: sleep, recentDays: await getRecentDailyMetrics(30) });
  };

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
    let cumulativeTrimp = 0;
    for (const p of perMin) {
      cumulativeTrimp += totalTrimp([{ hr: p.hr, minutes: 1 }], profile);
      out.push({ tsMs: p.tsMs, strain: trimpToStrain(cumulativeTrimp) });
    }
    return out;
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
