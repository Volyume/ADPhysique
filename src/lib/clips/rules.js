/**
 * rules.js - the clip rules and the clip words, pure (no I/O, no imports).
 *
 * D229 addendum 5 (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md),
 * the rulings this file holds, as amended by the founder's additions of
 * 2026-10-15 (the camera must work hands-free for a set: the phone is propped
 * up and the person walks to the bar):
 *   - up to three videos for each workout, never replaced silently;
 *   - a video is two minutes at the longest (addendum 13); the share uses up
 *     to 15 seconds of it; a recording under 1 second is discarded;
 *   - TWO ways to record. TAP the record control: a countdown (3, 5, 10, 15
 *     or 20 seconds, remembered, default 3), then recording for a chosen
 *     length (60 seconds, 90 seconds or 2 minutes, remembered, default 90)
 *     that stops by itself, a tap during recording stopping it early, and a
 *     tap during the countdown cancelling it. PRESS AND HOLD: records while
 *     held, no countdown, stops on release, capped at two minutes;
 *   - a video recorded for a set remembers the exercise and the set's number;
 *   - the exercise card's footer carries the Film action for every set
 *     (addendum 11); the summary row changes with the workout ("Record a
 *     video", then "Use your video on the share").
 * D229 addendum 9 (share one PR set with its video) adds the PR moment's
 * words: "This set would be a new PR" with "Film it" before the set, "Share"
 * on the record row after it, "Use your PR video on the share" on the
 * summary. The PR is the set's own record (detectPR's, on the logger), never
 * a claim about the video: every video still goes on every card.
 * Every string a video surface shows lives here, once, so the camera, the
 * primer, the Your videos sheet, the More row and the summary row cannot
 * drift apart. British English, calm, plain, no em dash, no exclamation mark.
 * The words say "video", never "clip" (a person who is not technical knows
 * what a video is; "clip" stays in code names only), and never "render",
 * "export", "encode" or "AI": the person is not told how it is made. One verb
 * for removing a video: "deleted" when the person does it, "removed" when the
 * keep window does it.
 *
 * Clips are private device data: the table is never synced and no Community
 * file may reference clips (pinned by clips.neverSynced.guard.test.js).
 */

import { CAMERA_TIPS } from './cameraTips';

/** The most videos one workout can hold. */

export const MAX_CLIPS_PER_WORKOUT = 3;

/** A recording is two minutes at the longest, in whole milliseconds (addendum
 *  13: the longest Length; a hold films the whole set too). The share card's
 *  own window is MAX_VIDEO_MS in the share engine, 15 seconds, unchanged. */
export const MAX_CLIP_SECONDS = 120;
export const MAX_CLIP_MS = MAX_CLIP_SECONDS * 1000;

/** A recording shorter than this is a stray tap and is discarded silently. */
export const MIN_CLIP_MS = 1000;

/** The lead-in lengths the camera cycles between, in seconds (tap to start).
 *  15 and 20 (addendum 13, D) are for a rack a few steps from the phone. */
export const LEAD_IN_OPTIONS = Object.freeze([3, 5, 10, 15, 20]);
export const DEFAULT_LEAD_IN_SECONDS = 3;

/** The recording lengths the camera cycles between, in seconds (tap to start;
 *  press and hold is always capped at MAX_CLIP_SECONDS).
 *  Addendum 13 (the founder: "My sets aren't often within 15 seconds"): the
 *  research in docs/audit/video-shares-2026-10-15/06-SET-LENGTH-AND-CUES-RESEARCH.md
 *  puts the 99th percentile of a whole ordinary set, walkout and re-rack
 *  included, at 89 to 106 seconds, so 90 seconds is the default (it cuts one
 *  to four sets in a hundred), two minutes keeps essentially every set and a
 *  myo-rep or drop-set run, and 60 seconds is there for singles, machine
 *  work and smaller files. The share card's window stays 15 seconds; its
 *  trim bar picks the window from the longer video. */
export const LENGTH_OPTIONS = Object.freeze([60, 90, 120]);
export const DEFAULT_LENGTH_SECONDS = 90;

/** The countdown cues when the phone is propped away from the lifter
 *  (addendum 13, A): sound (the rest timer's own pips), light (the torch
 *  with the back camera, a screen pulse with the front), both, or neither.
 *  Remembered on the phone; the default is both, because earbuds and a loud
 *  gym make either alone unreliable. */
export const CUE_OPTIONS = Object.freeze(['both', 'light', 'sound', 'off']);
export const DEFAULT_CUES = 'both';
export const CUES_KEY = '@volyume_clip_cues';

/** How long a video is kept before the phone clears it on its own (D229
 *  addendum 15, the founder: "A, default 7 days but they can have an option
 *  for longer"). In days; 0 is "until I delete it". A video the person marks
 *  Keep, and a video of a PR set, is never cleared. Remembered on the phone. */
export const KEEP_OPTIONS = Object.freeze([7, 30, 90, 0]);
export const DEFAULT_KEEP_DAYS = 7;
export const KEEP_DAYS_KEY = '@volyume_clip_keep_days';
/** The first sweep notes when the rule arrived, so a video recorded before
 *  the update gets the full window from then, never a surprise clear. */
export const KEEP_SINCE_KEY = '@volyume_clip_keep_since';
export const DAY_MS = 24 * 60 * 60 * 1000;
/** Recording refuses calmly under this much free space (a two minute video
 *  is about 90 MB; the recorder and the export both need headroom). */
export const MIN_FREE_BYTES = 500 * 1024 * 1024;

/** Where a video was recorded: for a set ('workout'), on the summary after the
 *  workout ('summary'), or from the share screen ('share', which can be during
 *  the workout, so it is not "after"). A clip with no exercise reads "After
 *  the workout" for 'summary' and "Workout" otherwise. */
export const CLIP_SOURCES = Object.freeze(['workout', 'summary', 'share']);

/** The routes the camera screen can be opened from. */
export const CAMERA_SOURCES = Object.freeze(['workout', 'summary', 'share']);

/** AsyncStorage keys (per device, not per account: a camera habit and a
 *  privacy line already read are about the phone). */
export const LEAD_IN_KEY = '@volyume_clip_leadin';
export const LENGTH_KEY = '@volyume_clip_length';
export const PRIMER_SEEN_KEY = '@volyume_clip_primer_seen';
/** Whether the guide lines show while setting the camera up (on until turned off). */
export const GUIDES_KEY = '@volyume_clip_guides';

export const CLIP_STRINGS = Object.freeze({
  // The exercise card's footer action, for every set (addendum 11): the
  // word on the card, and what a screen reader says.
  filmLabel: 'Film',
  rowLabel: 'Record a video of this set',
  rowA11y: 'Film this set',

  // D229 addendum 9 (words corrected in addendum 10): the PR moment, on the
  // exercise card's record row before the set (the action opens the primer
  // or the camera for that set).
  prOfferText: 'This set would be a new PR',
  prOfferAction: 'Film it',
  // After the set, on the record row, when a video of that set is saved.
  prShareAction: 'Share',
  prShareA11y: 'Share this PR with its video',

  // The summary row, in its three forms.
  summaryLabelNone: 'Record a video',
  summarySubNone: 'Up to two minutes, with no sound. You can also film a set from an exercise card during a workout.',
  summaryLabelUse: 'Use your video on the share',
  summaryLabelPR: 'Use your PR video on the share',
  summarySubPRTail: ', a new PR',
  summarySubPRUnnamed: 'Your video of a new PR',

  // The privacy primer, once per device before the first camera open. It is
  // the only explanation a person is ever given (addendum 12 added the two
  // sentences about light and the clear band: said once, here, never on the
  // camera itself).
  primerTitle: 'Videos stay on this phone',
  // The 7 day form; the primer itself is built by primerBody(keepDays) so it
  // follows the person's own keep setting.
  primerBody: primerBody(7),
  primerOpen: 'Open camera',
  primerNotNow: 'Not now',

  // The camera. Setting up first (addendum 10): the line at the top while the
  // camera is idle, with the guide lines over the live view. Addendum 12:
  // the line is the exercise's own camera tip (cameraTips.js) when the
  // camera knows the exercise; this is the general line it falls back to.
  setupHint: CAMERA_TIPS.general,
  // Founder report 2026-10-19: one action per line, short, on a pill.
  recordHint: 'Tap to start, or press and hold to film.',
  // The second, smaller line under the idle hint: see autoStopLine().
  savingHint: 'Saving your video',
  getIntoPosition: 'Get into position',
  // The hint while recording: after a tap, the square stops it early; during
  // a hold, letting go stops it.
  recordingHintTap: 'Tap to stop.',
  recordingHintHold: 'Let go to stop.',
  // The small controls each carry a word, so nobody has to guess what a bare
  // "3 s", "15 s" or "On" changes.
  countdownCaption: 'Countdown',
  lengthCaption: 'Length',
  guidesCaption: 'Guides',
  guidesOn: 'On',
  guidesOff: 'Off',
  // Addendum 13 (A): the countdown cues control, and its four states.
  cuesCaption: 'Cues',
  cuesBoth: 'Sound and light',
  cuesLight: 'Light only',
  cuesSound: 'Sound only',
  cuesOff: 'Off',
  // Addendum 13 (E): the wider lens, where the phone has one.
  viewCaption: 'View',
  viewNormal: 'Normal',
  viewWide: 'Wide',
  viewNormalA11y: 'View: normal.',
  viewWideA11y: 'View: wide. Fits more of the room into the video.',
  // Addendum 14: the logger's door to the videos a workout holds.
  yourVideos: 'Your videos',
  // Addendum 15: keeping, clearing and space.
  keepLabel: 'Keep',
  keptLabel: 'Kept',
  keepA11y: 'Keep this video until you delete it',
  keptA11y: 'Kept until you delete it. Double tap to stop keeping it',
  keptPRA11y: 'Kept, a PR set',
  keptPRLabel: 'Kept, a PR set',
  keepFailed: 'That change was not saved. You can try again.',
  noSpace: 'There is not enough space on this phone to record a video. Free up some space and try again.',
  settingsVideosLabel: 'Videos on this phone',
  settingsKeepLabel: 'Keep videos for',
  // The PR sentence of the Settings line (see settingsKeepSub()).
  settingsKeepPR: 'A video of a PR set is kept for you.',
  settingsDeleteAllLabel: 'Delete all videos',
  settingsDeleteAllSub: 'Deletes every workout video from this phone. The workouts themselves stay.',
  settingsDeleteAllNone: 'No videos on this phone.',
  settingsDeletingLabel: 'Deleting...',
  settingsWorkingOut: 'Working it out...',
  deleteAllConfirmTitle: 'Delete all videos?',
  deleteAllConfirmBody: 'Every workout video on this phone will be deleted. The workouts themselves stay. This cannot be undone.',
  deleteAllDone: 'Your videos have been deleted.',
  deleteAllFailed: 'Some videos could not be deleted. You can try again.',
  // Camera access refused: the cause, then what to do. No link to settings
  // (the house rule: no Linking, no second prompt).
  permissionDenied: "Volyume needs camera access to film a set. You can turn it on for Volyume in your phone's settings.",
  // The camera module is missing from this build (a stale binary).
  cameraMissing: 'Filming a set needs a newer version of Volyume. Update the app and try again.',
  // The camera was left (the app closed, the phone locked) during the
  // countdown or a recording: it stopped, and nothing was kept.
  stoppedByClosing: 'Recording stopped because Volyume was closed.',
  // The camera card shown in place of the camera when access is refused.
  permissionBack: 'Back',
  closeIdleA11y: 'Close camera',
  closeBusyA11y: 'Cancel recording',
  // The record control while the countdown runs, and the line under it.
  cancelCountdownA11y: 'Cancel the countdown',
  countdownHint: 'Tap to cancel.',
  stopA11y: 'Stop recording',
  flipA11y: 'Flip camera',
  // Addendum 14 (founder: "make it clear when they record a video on set
  // where it goes and where they can find it after"): the toast says both.
  // Addendum 15 (founder: say the window where a video is recorded too): the
  // first sentence carries the person's own setting; see savedLine().
  saved: 'Saved for 7 days with this workout. Find it under the three dots on this exercise, in Your videos, where tapping Keep keeps it until you delete it. You can change the 7 days in Settings, under Your data.',
  undo: 'Undo',
  // Addendum 13 (F): the second action on the saved toast, which opens the
  // videos sheet with that video playing.
  watch: 'Watch',
  watchA11y: 'Watch the video you just recorded',
  undoFailed: 'That video could not be deleted. You can try again.',
  saveFailed: 'That video could not be saved. You can try again.',
  // Said when the workout already holds the most clips. Nothing is replaced
  // silently, so the person is shown the clips and can delete one.
  full: 'This workout already has 3 videos, the most it can hold. Delete one if you want to record another.',

  // The clips sheet.
  sheetTitle: 'Your videos',
  afterWorkout: 'After the workout',
  sheetWorkoutName: 'Workout',
  sheetEmpty: 'There are no videos saved for this workout yet.',
  deleteLabel: 'Delete',
  // A person's own video goes only after one plain question (the house
  // confirms before deleting a progress photo too).
  deleteConfirmTitle: 'Delete this video?',
  deleteConfirmBody: 'It will be deleted from your phone.',
  deleteConfirmCancel: 'Cancel',
  // Releasing Keep on a video that is already past the window (addendum 15).
  stopKeepTitle: 'Stop keeping this video?',
  stopKeepCancel: 'Keep it',
  stopKeepConfirm: 'Stop keeping it',
  removeNowConfirm: 'Remove them',
  // The PR sentence of the removal confirm (see removeNowBody()).
  removeNowStay: 'Videos you have kept, and videos of PR sets, stay.',
  removeNowCancel: 'Cancel',
  playA11y: 'Play video',
  playStopA11y: 'Stop video',
  deleted: 'That video has been deleted.',
  deleteFailed: 'That video could not be deleted. You can try again.',

  // The share screen (a video as its background).
  shareVideoCannotOpen: 'That video could not be opened. Try another.',
  shareNotPrepared: 'The share could not be prepared. Try again in a moment.',
  shareVideoGone: 'That video has been deleted, so this share is an image.',
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

/** The length control's own text: "60 s", "90 s" or "2 min". */
export function lengthLabel(lengthSeconds) {
  const n = Number(lengthSeconds) || DEFAULT_LENGTH_SECONDS;
  return n >= 120 && n % 60 === 0 ? `${n / 60} min` : `${n} s`;
}

/** The idle hint's second line: "Stops by itself at 90 s" (the length control's own text). */
export function autoStopLine(lengthSeconds) {
  return `Stops by itself at ${lengthLabel(lengthSeconds)}`;
}

/** The length control's accessibility label. */
export function lengthA11yLabel(lengthSeconds) {
  const n = Number(lengthSeconds) || DEFAULT_LENGTH_SECONDS;
  return n >= 120 && n % 60 === 0
    ? `Recording length, ${n / 60} minutes`
    : `Recording length, ${n} seconds`;
}

/** The keep setting's words: "7 days", "30 days", "90 days", "Until I delete them". */
export function keepLabel(days) {
  const n = Number(days);
  if (!KEEP_OPTIONS.includes(n)) return keepLabel(DEFAULT_KEEP_DAYS);
  return n === 0 ? 'Until I delete them' : `${n} days`;
}

/** The saved toast in the person's own keep setting: "Saved for 30 days
 *  with this workout. Find it under the three dots on this exercise, in Your
 *  videos, where tapping Keep keeps it until you delete it. You can change the
 *  30 days in Settings, under Your data." (the founder: say HOW). `place` is
 *  'summary' for the workout summary's own toast, where the video is found
 *  under the workout in History instead. */
export function savedLine(keepDays, { place = 'exercise' } = {}) {
  const n = parseKeepDays(keepDays);
  const where = place === 'summary'
    ? 'Find it under this workout in History, in Your videos'
    : 'Find it under the three dots on this exercise, in Your videos';
  if (n === 0) return `Saved with this workout until you delete it. ${where}.`;
  return `Saved for ${n} days with this workout. ${where}, where tapping Keep keeps it until you delete it. You can change the ${n} days in Settings, under Your data.`;
}

/** A stored value back to a keep setting, else the default. */
export function parseKeepDays(raw) {
  // Nothing stored is the default, never "until I delete them" (Number(null)
  // is 0, which is that option's value).
  if (raw == null || raw === '') return DEFAULT_KEEP_DAYS;
  const n = Number(raw);
  return KEEP_OPTIONS.includes(n) ? n : DEFAULT_KEEP_DAYS;
}

/** The line under a workout's videos that says the rule and how to keep one,
 *  in the person's own setting: "Each video is removed after 7 days unless you
 *  tap Keep on it here. You can change the 7 days in Settings, under Your data." */
export function keepRuleLine(days) {
  const n = parseKeepDays(days);
  if (n === 0) return 'Videos stay until you delete them. You can change this in Settings, under Your data.';
  return `Each video is removed after ${n} days unless you tap Keep on it here. You can change the ${n} days in Settings, under Your data.`;
}

/** The privacy primer's body, in the person's own keep setting (the 7 day
 *  form is CLIP_STRINGS.primerBody). Said once, here, and nowhere else. */
export function primerBody(keepDays) {
  const n = parseKeepDays(keepDays);
  const keep = n === 0
    ? 'Your videos stay until you delete them. You can change this in Settings, under Your data.'
    : `Each video is removed after ${n} days unless you tap Keep on it there. You can change the ${n} days in Settings, under Your data.`;
  return 'Prop your phone up, tap the button, and get into position. '
    + 'Recording starts after the countdown and stops by itself at the length you choose, up to two minutes, with no sound. '
    + 'Your share uses up to 15 seconds of it; you choose which. '
    + 'Your videos are kept with the workout on this phone and are never uploaded. '
    + 'During a workout, find them under the three dots on the exercise, in Your videos; after it, under the workout in History. '
    + `${keep} `
    + 'Keep bright lights behind the phone, not behind you. '
    + 'The clear band across the middle of the picture is where the share shows your lift best.';
}

/** The Settings line under "Keep videos for", in the person's own setting. */
export function settingsKeepSub(keepDays) {
  const n = parseKeepDays(keepDays);
  if (n === 0) return `Videos stay on this phone until you delete them. ${CLIP_STRINGS.settingsKeepPR}`;
  return `Older videos are removed from this phone. Tap Keep on a video, in Your videos under the exercise's three dots during a workout or under the workout in History, and it stays until you delete it. ${CLIP_STRINGS.settingsKeepPR}`;
}

/** The confirm before a shorter window removes videos now. */
export function removeNowTitle(count) {
  return `Remove ${count} ${count === 1 ? 'video' : 'videos'} now?`;
}
export function removeNowBody(count, days) {
  return `${count} ${count === 1 ? 'video' : 'videos'} older than ${days} days will be removed from this phone. ${CLIP_STRINGS.removeNowStay}`;
}

/** The confirm before releasing Keep on a video already past the window. */
export function stopKeepBody(days) {
  return `It is older than ${days} days, so it will be removed the next time the app opens.`;
}

/** Bytes in plain words: "68 MB", "1.2 GB". */
export function formatBytes(bytes) {
  const b = Math.max(0, Number(bytes) || 0);
  if (b >= 1024 * 1024 * 1024) return `${(b / (1024 * 1024 * 1024)).toFixed(1).replace(/\.0$/, '')} GB`;
  return `${Math.round(b / (1024 * 1024))} MB`;
}

/** "3 videos, 210 MB" for a settings row or the sheet's foot. */
export function storageLine(count, bytes) {
  const n = Number(count) || 0;
  if (n === 0) return 'No videos on this phone.';
  return `${n} ${n === 1 ? 'video' : 'videos'}, ${formatBytes(bytes)}`;
}

/** Whether a video is due to be cleared: not kept, and older than the window
 *  counted from the later of its recording and the rule's arrival. 0 days
 *  means never. Pure. */
export function clipExpired({ createdAt, keptAt }, { keepDays, since, now }) {
  const days = parseKeepDays(keepDays);
  if (days === 0) return false;
  if (keptAt) return false;
  const from = Math.max(Number(createdAt) || 0, Number(since) || 0);
  return from + days * DAY_MS <= now;
}

/** The cues control's own text and accessibility label. */
export function cuesLabel(mode) {
  switch (mode) {
    case 'light': return CLIP_STRINGS.cuesLight;
    case 'sound': return CLIP_STRINGS.cuesSound;
    case 'off': return CLIP_STRINGS.cuesOff;
    default: return CLIP_STRINGS.cuesBoth;
  }
}
export function cuesA11yLabel(mode) {
  return `Countdown cues, ${cuesLabel(mode).toLowerCase()}`;
}

/** The next cues state when its control is tapped: both, light, sound, off. */
export function nextCues(current) {
  return nextInCycle(CUE_OPTIONS, current, DEFAULT_CUES);
}

/** A stored value back to a usable cues state, else the default. */
export function parseCues(raw) {
  return CUE_OPTIONS.includes(raw) ? raw : DEFAULT_CUES;
}

/** Whether a cues state carries sound, and whether it carries light. */
export function cuesHaveSound(mode) { return mode === 'both' || mode === 'sound'; }
export function cuesHaveLight(mode) { return mode === 'both' || mode === 'light'; }

/** The guides control's own text ("On" / "Off") and its accessibility label. */
export function guidesLabel(on) {
  return on ? CLIP_STRINGS.guidesOn : CLIP_STRINGS.guidesOff;
}
export function guidesA11yLabel(on) {
  return `Guide lines, ${on ? 'on' : 'off'}`;
}

/** A stored guides flag back to a boolean: only an explicit 'false' turns them off. */
export function parseGuides(raw) {
  return raw !== 'false';
}

function nextInCycle(options, current, fallback) {
  const i = options.indexOf(typeof options[0] === 'number' ? Number(current) : current);
  if (i === -1) return fallback;
  return options[(i + 1) % options.length];
}

/** The next lead-in when its control is tapped: 3 -> 5 -> 10 -> 15 -> 20 -> 3. Anything
 *  that is not a known option falls back to the default, so a corrupt stored
 *  value can never strand the control. */
export function nextLeadIn(current) {
  return nextInCycle(LEAD_IN_OPTIONS, current, DEFAULT_LEAD_IN_SECONDS);
}

/** The next length when its control is tapped: 60 s -> 90 s -> 2 min -> 60 s. */
export function nextLength(current) {
  return nextInCycle(LENGTH_OPTIONS, current, DEFAULT_LENGTH_SECONDS);
}

/** A stored value back to a usable lead-in (3, 5, 10, 15 or 20), else the default. */
export function parseLeadIn(raw) {
  const n = Number(raw);
  return LEAD_IN_OPTIONS.includes(n) ? n : DEFAULT_LEAD_IN_SECONDS;
}

/** A stored value back to a usable length (60, 90 or 120), else the default. */
export function parseLength(raw) {
  const n = Number(raw);
  return LENGTH_OPTIONS.includes(n) ? n : DEFAULT_LENGTH_SECONDS;
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

function trimmedName(name) {
  return typeof name === 'string' ? name.trim() : '';
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
 *   no videos  "Record a video" / "Up to two minutes, with no sound. You can
 *              also film a set from an exercise card during a workout."
 *   a PR set's video (D229 addendum 9: `prVideoFor` finds one in `prs`)
 *              "Use your PR video on the share" / "Your video of Bench press,
 *              set 3, a new PR" (the newest such video, which is `newest`, so
 *              the share screen opens with it and pairs it with its PR card).
 *   videos     "Use your video on the share" / "Your video of Bench press,
 *              set 3" (the newest video), or "You recorded 2 videos" when
 *              there are more.
 * `newest` is the video a tap on the second or third form hands to the share
 * screen.
 * @param {Array<object>} clips this workout's clips, any order
 * @param {Array<object>} [prs] the PRs the summary hands the share screen
 *   (its `prList`); without them the PR form never shows.
 */
export function summaryClipRowCopy(clips, prs) {
  const list = Array.isArray(clips) ? clips.filter(Boolean) : [];
  if (list.length === 0) {
    return { label: CLIP_STRINGS.summaryLabelNone, sub: CLIP_STRINGS.summarySubNone, newest: null };
  }
  const prVideo = prVideoFor(list, prs);
  if (prVideo) {
    const { clip, pr } = prVideo;
    const name = trimmedName(clip.exerciseName) || trimmedName(pr.exerciseName);
    const sub = name
      ? `Your video of ${name}${setSuffix(clip) || setSuffix(pr)}${CLIP_STRINGS.summarySubPRTail}`
      : CLIP_STRINGS.summarySubPRUnnamed;
    return { label: CLIP_STRINGS.summaryLabelPR, sub, newest: clip };
  }
  const newest = list.reduce((a, b) => ((Number(b.createdAt) || 0) > (Number(a.createdAt) || 0) ? b : a));
  let sub;
  if (list.length > 1) {
    sub = `You recorded ${list.length} videos`;
  } else {
    const name = typeof newest.exerciseName === 'string' ? newest.exerciseName.trim() : '';
    sub = name ? `Your video of ${name}${setSuffix(newest)}` : 'You recorded a video';
  }
  return { label: CLIP_STRINGS.summaryLabelUse, sub, newest };
}

/**
 * Whether `clip` was recorded for the set that earned `pr` (D229 addendum 9).
 * The same exercise (by id when both carry one, else by name) AND the same
 * set number, both known: a record from a history reopen carries no set
 * number, and a video of that exercise is then NOT claimed as "your PR set"
 * (fresh-eyes review 2026-10-15, should-fix 17: the loose match over-claimed).
 * Used by the logger's PR moment, the summary's "Use your PR video on the
 * share" and the share screen's PR pairing, so the three agree by
 * construction.
 */
export function clipMatchesPR(clip, pr) {
  if (!clip || !pr) return false;
  const clipId = clip.exerciseId ?? null;
  const prId = pr.exerciseId ?? null;
  let sameExercise;
  if (clipId && prId) {
    sameExercise = clipId === prId;
  } else {
    const a = typeof clip.exerciseName === 'string' ? clip.exerciseName.trim().toLowerCase() : '';
    const b = typeof pr.exerciseName === 'string' ? pr.exerciseName.trim().toLowerCase() : '';
    sameExercise = !!a && a === b;
  }
  if (!sameExercise) return false;
  const cs = Math.floor(Number(clip.setNumber));
  const ps = Math.floor(Number(pr.setNumber));
  if (!Number.isFinite(cs) || cs <= 0 || !Number.isFinite(ps) || ps <= 0) return false;
  return cs === ps;
}

/**
 * The newest clip recorded for any of `prs`, with the PR it belongs to and
 * that PR's index in `prs` (the share screen's `prList` order), or null.
 */
export function prVideoFor(clips, prs) {
  const list = Array.isArray(clips) ? clips.filter(Boolean) : [];
  const records = Array.isArray(prs) ? prs : [];
  let best = null;
  list.forEach((clip) => {
    const prIndex = records.findIndex((pr) => clipMatchesPR(clip, pr));
    if (prIndex === -1) return;
    if (!best || (Number(clip.createdAt) || 0) > (Number(best.clip.createdAt) || 0)) {
      best = { clip, pr: records[prIndex], prIndex };
    }
  });
  return best;
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
