/**
 * restSound.js
 * Audio beep helper for the rest timer countdown.
 *
 * Synthesises four short sine-wave beeps as WAVs at module init:
 *   3s → 660 Hz  (low pip)
 *   2s → 770 Hz  (mid pip)
 *   1s → 880 Hz  (high pip)
 *   0s → 1100 Hz (longer 280 ms "GO" tone)
 *
 * The WAVs are written to FileSystem.cacheDirectory on first use and loaded
 * as Audio.Sound instances which are kept warm for the workout. Each beep
 * is ~110 ms, ~5 KB on disk — negligible.
 *
 * Both expo-av and expo-file-system are dynamically required so this module
 * silently no-ops on builds where expo-av hasn't yet been installed
 * (running on a binary built before the dep landed). Haptics in RestTimer
 * still fire either way, so the countdown is felt even without sound.
 */

let Audio;
let FileSystem;
try { Audio = require('expo-av').Audio; } catch (_) {}
try { FileSystem = require('expo-file-system'); } catch (_) {}

// Lazy cache — populated on first playBeep() call. Survives the whole app
// session because preloading is async and we'd rather pay it once than
// once per set.
let soundsCache = null;
let preloadPromise = null;

// ─── WAV synthesis ───────────────────────────────────────────────────────────

function generateBeepBase64(freq, durationMs) {
  const sampleRate = 22050;
  const numSamples = Math.floor((durationMs / 1000) * sampleRate);
  const dataSize = numSamples * 2; // 16-bit mono samples
  const fileSize = 44 + dataSize;

  // ArrayBuffer + DataView gives us little-endian binary writes for the
  // standard 44-byte RIFF/WAVE header.
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // "RIFF" + chunk size + "WAVE"
  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, fileSize - 8, true);
  view.setUint32(8, 0x57415645, false);
  // "fmt " sub-chunk: PCM mono 16-bit
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);             // fmt chunk size
  view.setUint16(20, 1, true);              // PCM format
  view.setUint16(22, 1, true);              // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate (sr * blockAlign)
  view.setUint16(32, 2, true);              // block align (channels * bytes)
  view.setUint16(34, 16, true);             // bits per sample
  // "data" sub-chunk
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, dataSize, true);

  // Apply a short fade-in/out (8 ms each side) so the beep doesn't pop.
  const fadeSamples = Math.floor((8 / 1000) * sampleRate);
  for (let i = 0; i < numSamples; i++) {
    let amp = 0.5;
    if (i < fadeSamples) amp *= i / fadeSamples;
    if (i > numSamples - fadeSamples) amp *= (numSamples - i) / fadeSamples;
    const sample = Math.sin(2 * Math.PI * freq * i / sampleRate) * amp * 32767;
    view.setInt16(44 + i * 2, sample | 0, true);
  }

  // Convert ArrayBuffer → base64 (no Buffer in RN; manual chunked btoa).
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  // global.btoa exists in RN's JSCore via polyfill (used by Supabase too).
  // Fallback path in case some custom runtime lacks it.
  if (typeof btoa === 'function') return btoa(bin);
  // Minimal manual base64 fallback
  const tbl = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bin.length; i += 3) {
    const a = bin.charCodeAt(i);
    const b = i + 1 < bin.length ? bin.charCodeAt(i + 1) : 0;
    const c = i + 2 < bin.length ? bin.charCodeAt(i + 2) : 0;
    const tri = (a << 16) | (b << 8) | c;
    out += tbl[(tri >> 18) & 63] + tbl[(tri >> 12) & 63] +
           (i + 1 < bin.length ? tbl[(tri >> 6) & 63] : '=') +
           (i + 2 < bin.length ? tbl[tri & 63] : '=');
  }
  return out;
}

// ─── Preload + play ──────────────────────────────────────────────────────────

const BEEP_SPECS = {
  three: { freq: 660, dur: 110 },
  two:   { freq: 770, dur: 110 },
  one:   { freq: 880, dur: 110 },
  go:    { freq: 1100, dur: 280 },
};

async function preload() {
  if (!Audio || !FileSystem) return; // expo-av not installed yet
  if (soundsCache) return;
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    const dir = (FileSystem.cacheDirectory || '') + 'volyume-beeps/';
    try {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    } catch (_) { /* exists */ }

    // Allow audio to mix with music apps and play even when the device is on
    // silent. Without setAudioModeAsync, iOS mutes synthesised audio when the
    // ringer switch is silent — which is most lifters at the gym.
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: false,
      });
    } catch (_) {}

    const cache = {};
    for (const [key, spec] of Object.entries(BEEP_SPECS)) {
      const path = dir + key + '.wav';
      try {
        const info = await FileSystem.getInfoAsync(path);
        if (!info.exists) {
          const b64 = generateBeepBase64(spec.freq, spec.dur);
          await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
        }
        const { sound } = await Audio.Sound.createAsync({ uri: path }, { shouldPlay: false });
        cache[key] = sound;
      } catch (_) {
        // Per-beep failure is non-fatal — others can still play.
      }
    }
    soundsCache = cache;
    preloadPromise = null;
  })();

  return preloadPromise;
}

/**
 * Play a beep by key ('three' | 'two' | 'one' | 'go'). Safe to call
 * synchronously from any UI handler — fires off the preload + replay
 * asynchronously and never throws.
 */
export function playRestBeep(key) {
  if (!Audio) return; // build doesn't have expo-av — silent fallback
  (async () => {
    try {
      if (!soundsCache) await preload();
      const sound = soundsCache && soundsCache[key];
      if (!sound) return;
      await sound.replayAsync();
    } catch (_) {
      // Don't surface playback errors during a workout — haptics still fire.
    }
  })();
}

/**
 * Preload sounds explicitly (e.g. when the workout starts) so the first
 * countdown doesn't pay the synth + disk-write cost mid-tick. Optional;
 * playRestBeep() preloads lazily on first call too.
 */
export function preloadRestBeeps() {
  preload().catch(() => {});
}

/**
 * Release sound resources. Called when the workout ends to free native
 * audio buffers. Idempotent — safe to call when nothing is loaded.
 */
export async function unloadRestBeeps() {
  if (!soundsCache) return;
  const cache = soundsCache;
  soundsCache = null;
  for (const sound of Object.values(cache)) {
    try { await sound.unloadAsync(); } catch (_) {}
  }
}
