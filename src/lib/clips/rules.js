/**
 * rules.js - the clip rules and the clip words, pure (no I/O, no imports).
 *
 * D229 addendum 5 (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md),
 * the rulings this file holds, as amended by the founder's additions of
 * 2026-10-15 (the camera must work hands-free for a set: the phone is propped
 * up and the person walks to the bar):
 *   - up to three clips for each workout, never replaced silently;
 *   - 15 seconds at the longest; a recording under 1 second is discarded;
 *   - TWO ways to record. TAP the record control: a countdown (3, 5 or 10
 *     seconds, remembered, default 3), then recording for a chosen length (5,
 *     10 or 15 seconds, remembered, default 15) that stops by itself, a tap
 *     during recording stopping it early. PRESS AND HOLD: records while held,
 *     no countdown, stops on release, capped at 15 seconds;
 *   - a clip recorded for a set remembers the exercise and the set's number;
 *   - the exercise menu row is "Record a video of this set"; the summary row
 *     changes with the workout ("Record a video", then "Use your video on the
 *     share").
 * Every string a clip surface shows lives here, once, so the camera, the
 * primer, the clips sheet, the More row and the summary row cannot drift
 * apart. British English, calm, plain, no em dash, no exclamation mark. The
 * words say "video", never "clip" (a person who is not technical knows what a
 * video is; "clip" stays in code names only), and never "render", "export",
 * "encode" or "AI": the person is not told how it is made.
 *
 * Clips are private device data: the table is never synced and no Community
 * file may reference clips (pinned by clips.neverSynced.guard.test.js).
 */

/** The most clips one workout can hold. */
export const MAX_CLIPS_PER_WORKOUT = 3;

/** A clip is 15 seconds at the longest, in whole milliseconds. */
export const MAX_CLIP_SECONDS = 15;
export const MAX_CLIP_MS = MAX_CLIP_SECONDS * 1000;

/** A recording shorter than this is a stray tap and is discarded silently. */
export const MIN_CLIP_MS = 1000;

/** The lead-in lengths the camera cycles between, in seconds (tap to start). */
export const LEAD_IN_OPTIONS = Object.freeze([3, 5, 10]);
export const DEFAULT_LEAD_IN_SECONDS = 3;

/** The recording lengths the camera cycles between, in seconds (tap to start;
 *  press and hold is always capped at MAX_CLIP_SECONDS). */
export const LENGTH_OPTIONS = Object.freeze([5, 10, 15]);
export const DEFAULT_LENGTH_SECONDS = 15;

/** Where a clip was recorded. The table keeps the first two only: a clip made
 *  from the share screen belongs to the workout as a whole, so it is saved as
 *  'summary'. */
export const CLIP_SOURCES = Object.freeze(['workout', 'summary']);

/** The routes the camera screen can be opened from. */
export const CAMERA_SOURCES = Object.freeze(['workout', 'summary', 'share']);

/** AsyncStorage keys (per device, not per account: a camera habit and a
 *  privacy line already read are about the phone). */
export const LEAD_IN_KEY = '@volyume_clip_leadin';
export const LENGTH_KEY = '@volyume_clip_length';
export const PRIMER_SEEN_KEY = '@volyume_clip_primer_seen';

export const CLIP_STRINGS = Object.freeze({
  // The exercise menu row (it records the set the person is on).
  rowLabel: 'Record a video of this set',
  rowA11y: 'Record a video of this set',
  rowDescNone: 'Up to 15 seconds, no sound. Shared from the summary afterwards.',
  rowDescThree: '3 saved, the most for one workout.',

  // The summary row, in its two forms.
  summaryLabelNone: 'Record a video',
  summarySubNone: "Up to 15 seconds, no sound. You can also record a set during a workout from an exercise's menu.",
  summaryLabelUse: 'Use your video on the share',

  // The privacy primer, once per device before the first camera open. It is
  // the only explanation a person is ever given.
  primerTitle: 'Videos stay on this phone',
  primerBody: 'Prop your phone up, tap the button and get into position. Recording starts after the countdown and stops by itself. Up to 15 seconds, no sound. Kept with this workout, never uploaded, deleted when you delete the workout.',
  primerOpen: 'Open camera',
  primerNotNow: 'Not now',

  // The camera.
  recordHint: 'Tap to start with a countdown. Hold to record while you hold.',
  // The two small controls each carry a word, so nobody has to guess what a
  // bare "3 s" or "15 s" changes.
  countdownCaption: 'Countdown',
  lengthCaption: 'Length',
  permissionDenied: 'Camera access is needed to record a video',
  closeA11y: 'Cancel recording',
  stopA11y: 'Stop recording',
  flipA11y: 'Flip camera',
  saved: 'Video saved to this workout',
  undo: 'Undo',
  undoFailed: "Couldn't remove that video. Try again.",
  saveFailed: "Couldn't save that video. Try again.",
  // Said when the workout already holds the most clips. Nothing is replaced
  // silently, so the person is shown the clips and can delete one.
  full: 'This workout already has 3 videos. Delete one to record another.',

  // The clips sheet.
  sheetTitle: 'Your videos',
  afterWorkout: 'After the workout',
  sheetWorkoutName: 'Workout',
  sheetEmpty: 'No videos saved for this workout.',
  deleteLabel: 'Delete',
  deleted: 'Video deleted',
  deleteFailed: "Couldn't delete that video. Try again.",

  // The history row.
  historyLabel: 'Videos',
});

/** "Start recording in 3 seconds" (the record control, accessibility). */
export function startA11yLabel(leadInSeconds) {
  const n = Number(leadInSeconds) || DEFAULT_LEAD_IN_SECONDS;
  return `Start recording in ${n} seconds`;
}

/** The lead-in control's own text: "3 s", "5 s" or "10 s". */
export function leadInLabel(leadInSeconds) {
  return `${Number(leadInSeconds) || DEFAULT_LEAD_IN_SECONDS} s`;
}

/** The lead-in control's accessibility label. */
export function leadInA11yLabel(leadInSeconds) {
  const n = Number(leadInSeconds) || DEFAULT_LEAD_IN_SECONDS;
  return `Countdown before recording, ${n} seconds`;
}

/** The length control's own text: "5 s", "10 s" or "15 s". */
export function lengthLabel(lengthSeconds) {
  return `${Number(lengthSeconds) || DEFAULT_LENGTH_SECONDS} s`;
}

/** The length control's accessibility label. */
export function lengthA11yLabel(lengthSeconds) {
  const n = Number(lengthSeconds) || DEFAULT_LENGTH_SECONDS;
  return `Recording length, ${n} seconds`;
}

function nextInCycle(options, current, fallback) {
  const i = options.indexOf(Number(current));
  if (i === -1) return fallback;
  return options[(i + 1) % options.length];
}

/** The next lead-in when its control is tapped: 3 -> 5 -> 10 -> 3. Anything
 *  that is not a known option falls back to the default, so a corrupt stored
 *  value can never strand the control. */
export function nextLeadIn(current) {
  return nextInCycle(LEAD_IN_OPTIONS, current, DEFAULT_LEAD_IN_SECONDS);
}

/** The next length when its control is tapped: 5 -> 10 -> 15 -> 5. */
export function nextLength(current) {
  return nextInCycle(LENGTH_OPTIONS, current, DEFAULT_LENGTH_SECONDS);
}

/** A stored value back to a usable lead-in (3, 5 or 10), else the default. */
export function parseLeadIn(raw) {
  const n = Number(raw);
  return LEAD_IN_OPTIONS.includes(n) ? n : DEFAULT_LEAD_IN_SECONDS;
}

/** A stored value back to a usable length (5, 10 or 15), else the default. */
export function parseLength(raw) {
  const n = Number(raw);
  return LENGTH_OPTIONS.includes(n) ? n : DEFAULT_LENGTH_SECONDS;
}

/**
 * The More-sheet row's second line for a workout holding `count` clips:
 * none "Up to 15 seconds, no sound. Shared from the summary afterwards.", one
 * or two "1 saved. Up to 3 for each workout.", three "3 saved, the most for one
 * workout.". Anything that is not a count reads as none.
 */
export function clipRowDescription(count) {
  const n = Math.floor(Number(count));
  if (!Number.isFinite(n) || n <= 0) return CLIP_STRINGS.rowDescNone;
  if (n >= MAX_CLIPS_PER_WORKOUT) return CLIP_STRINGS.rowDescThree;
  return `${n} saved. Up to ${MAX_CLIPS_PER_WORKOUT} for each workout.`;
}

/** True when a workout holding `count` clips can take no more. */
export function isFull(count) {
  return Number(count) >= MAX_CLIPS_PER_WORKOUT;
}

/**
 * A clip's length as "0:12" (minutes, then two-digit seconds). `mode` is
 * 'round' for a finished clip (a 14.96 s clip is "0:15") and 'floor' for the
 * running clock on the camera (it counts up and never runs ahead).
 */
export function formatClipDuration(ms, mode = 'round') {
  const raw = Math.max(0, Number(ms) || 0) / 1000;
  const whole = mode === 'floor' ? Math.floor(raw) : Math.round(raw);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function setSuffix(clip) {
  const n = Math.floor(Number(clip?.setNumber));
  return Number.isFinite(n) && n > 0 ? `, set ${n}` : '';
}

/**
 * What a clip is called: the exercise and the set it was recorded for
 * ("Bench press, set 3"), the exercise alone when no set was known, "After the
 * workout" for a clip made from the summary, else "Workout".
 */
export function clipDisplayName(clip) {
  const name = typeof clip?.exerciseName === 'string' ? clip.exerciseName.trim() : '';
  if (name) return `${name}${setSuffix(clip)}`;
  if (clip?.source === 'summary') return CLIP_STRINGS.afterWorkout;
  return CLIP_STRINGS.sheetWorkoutName;
}

/** A clip's row in the clips sheet: "Bench press, set 3, 0:12". */
export function clipRowTitle(clip) {
  return `${clipDisplayName(clip)}, ${formatClipDuration(clip?.durationMs)}`;
}

/** "1 video" / "2 videos" for the history row's second line. */
export function clipCountLabel(count) {
  const n = Math.max(0, Math.floor(Number(count)) || 0);
  return `${n} ${n === 1 ? 'video' : 'videos'}`;
}

/**
 * The summary row's words, which change with the workout:
 *   no clips   "Record a clip" / "Up to 15 seconds, no sound. You can also
 *              record a set during a workout from an exercise's menu."
 *   clips      "Use your clip on the share" / "You recorded Bench press, set 3"
 *              (the newest clip), or "You recorded 2 clips" when there are more.
 * `newest` is the clip a tap on the second form hands to the share screen.
 * @param {Array<object>} clips this workout's clips, any order
 */
export function summaryClipRowCopy(clips) {
  const list = Array.isArray(clips) ? clips.filter(Boolean) : [];
  if (list.length === 0) {
    return { label: CLIP_STRINGS.summaryLabelNone, sub: CLIP_STRINGS.summarySubNone, newest: null };
  }
  const newest = list.reduce((a, b) => ((Number(b.createdAt) || 0) > (Number(a.createdAt) || 0) ? b : a));
  let sub;
  if (list.length > 1) {
    sub = `You recorded ${list.length} videos`;
  } else {
    const name = typeof newest.exerciseName === 'string' ? newest.exerciseName.trim() : '';
    sub = name ? `You recorded ${name}${setSuffix(newest)}` : 'You recorded a video';
  }
  return { label: CLIP_STRINGS.summaryLabelUse, sub, newest };
}

/**
 * Whether the workout summary shows its clip row (hidden under calm mode or an
 * open ED flag, FAIL CLOSED, and never in the read-only history view). Every
 * input must say yes explicitly:
 *   readOnly    false           (the live summary, not a history reopen)
 *   workoutId   present
 *   settled     true            (the calm and flag read has finished)
 *   suppressed  false           (calm mode off and no open flag; undefined,
 *                                null or a failed read all hide the row)
 *   shareable   true            (the session has a Share to use a clip on)
 * No explanation is shown in its place.
 */
export function summaryClipRowVisible({
  readOnly, workoutId, settled, suppressed, shareable,
} = {}) {
  return readOnly === false && !!workoutId && settled === true
    && suppressed === false && shareable === true;
}
