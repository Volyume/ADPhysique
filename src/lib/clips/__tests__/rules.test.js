/**
 * clips rules (D229 addendum 5 and the founder's additions of 2026-10-15): the
 * numbers and the words every video surface shares. Written to fail if any
 * ruling drifts:
 *   - up to three videos for each workout, two minutes at the longest
 *     (addendum 13: a whole set with its walkout and re-rack), a 1 second
 *     floor;
 *   - TWO ways to record: a tap (countdown 3 / 5 / 10 / 15 / 20 s, then a
 *     length of 60 / 90 s / 2 min that stops by itself) and a hold (no
 *     countdown, capped at two minutes); both remembered, defaults 3 s and
 *     90 s; the cues control's four states, remembered;
 *   - the exercise-menu row's second line for none, one, two and three videos;
 *   - a video is named by its exercise and set ("Bench press, set 3, 0:12"), or
 *     "After the workout" when it was made on the summary;
 *   - the summary row's two forms, and when it is shown at all;
 *   - D229 addendum 9, the PR moment: the More row's second line leads with
 *     "This set would be a new PR." only on an explicit wouldBePR (and never at
 *     three videos, when no video can be recorded); the summary row's third
 *     form, "Use your PR video on the share", names the newest video of a PR
 *     set and hands THAT video to the share screen, and only with the PRs the
 *     summary hands over.
 */
import {
  MAX_CLIPS_PER_WORKOUT, MAX_CLIP_SECONDS, MAX_CLIP_MS, MIN_CLIP_MS, LEAD_IN_OPTIONS,
  LENGTH_OPTIONS, DEFAULT_LEAD_IN_SECONDS, DEFAULT_LENGTH_SECONDS, CLIP_SOURCES, CLIP_STRINGS,
  LEAD_IN_KEY, LENGTH_KEY, PRIMER_SEEN_KEY, summaryClipRowVisible,
  summaryClipRowCopy, formatClipDuration, clipDisplayName, clipRowTitle, clipCountLabel,
  nextLeadIn, nextLength, parseLeadIn, parseLength, leadInLabel, leadInA11yLabel, lengthLabel,
  lengthA11yLabel, startA11yLabel, clipMatchesPR, prVideoFor,
} from '../rules';

describe('the rulings, as numbers', () => {
  test('three videos for each workout, two minutes at the longest, 1 second at the shortest', () => {
    expect(MAX_CLIPS_PER_WORKOUT).toBe(3);
    // Addendum 13: two minutes, so a whole ordinary set with its walkout
    // and re-rack fits (06-SET-LENGTH-AND-CUES-RESEARCH.md); the share's own
    // window is still 15 seconds, in the share engine.
    expect(MAX_CLIP_SECONDS).toBe(120);
    expect(MAX_CLIP_MS).toBe(120000);
    expect(MIN_CLIP_MS).toBe(1000);
  });

  test('the countdown cycles 3 / 5 / 10 / 15 / 20 seconds, default 3 (15 and 20 for a far rack, addendum 13)', () => {
    expect(LEAD_IN_OPTIONS).toEqual([3, 5, 10, 15, 20]);
    expect(DEFAULT_LEAD_IN_SECONDS).toBe(3);
  });

  test('the length cycles 60 / 90 s / 2 min, default 90, never past the cap', () => {
    expect(LENGTH_OPTIONS).toEqual([60, 90, 120]);
    expect(DEFAULT_LENGTH_SECONDS).toBe(90);
    expect(Math.max(...LENGTH_OPTIONS)).toBe(MAX_CLIP_SECONDS);
  });

  test('a video is saved as a workout video, a summary video or a share-screen video, nothing else', () => {
    expect(CLIP_SOURCES).toEqual(['workout', 'summary', 'share']);
  });

  test('the three device flags use the ruled keys', () => {
    expect(LEAD_IN_KEY).toBe('@volyume_clip_leadin');
    expect(LENGTH_KEY).toBe('@volyume_clip_length');
    expect(PRIMER_SEEN_KEY).toBe('@volyume_clip_primer_seen');
  });
});

describe('the two small controls', () => {
  test('the countdown cycles 3 -> 5 -> 10 -> 15 -> 20 -> 3', () => {
    expect(nextLeadIn(3)).toBe(5);
    expect(nextLeadIn(5)).toBe(10);
    expect(nextLeadIn(10)).toBe(15);
    expect(nextLeadIn(15)).toBe(20);
    expect(nextLeadIn(20)).toBe(3);
  });

  test('the length cycles 5 -> 10 -> 15 -> 5', () => {
    expect(nextLength(60)).toBe(90);
    expect(nextLength(90)).toBe(120);
    expect(nextLength(120)).toBe(60);
  });

  test('a corrupt stored value cannot strand either control', () => {
    expect(nextLeadIn(7)).toBe(3);
    expect(nextLeadIn(undefined)).toBe(3);
    expect(nextLength(7)).toBe(90);
    expect(nextLength(undefined)).toBe(90);
    expect(parseLeadIn('10')).toBe(10);
    expect(parseLeadIn('5')).toBe(5);
    expect(parseLeadIn('banana')).toBe(3);
    expect(parseLeadIn(null)).toBe(3);
    expect(parseLength('60')).toBe(60);
    expect(parseLength('120')).toBe(120);
    expect(parseLength('15')).toBe(90);
    expect(parseLength(null)).toBe(90);
  });

  test('their text and accessibility words', () => {
    expect(leadInLabel(3)).toBe('3 s');
    expect(leadInLabel(10)).toBe('10 s');
    expect(lengthLabel(60)).toBe('60 s');
    expect(lengthLabel(90)).toBe('90 s');
    expect(lengthLabel(120)).toBe('2 min');
    expect(startA11yLabel(3)).toBe('Start recording in 3 seconds');
    expect(startA11yLabel(10)).toBe('Start recording in 10 seconds');
    expect(leadInA11yLabel(10)).toBe('Countdown before recording, 10 seconds');
    expect(lengthA11yLabel(90)).toBe('Recording length, 90 seconds');
    expect(lengthA11yLabel(120)).toBe('Recording length, 2 minutes');
  });

  test('each carries a plain word above its value, and the line under the button says both ways', () => {
    expect(CLIP_STRINGS.countdownCaption).toBe('Countdown');
    expect(CLIP_STRINGS.lengthCaption).toBe('Length');
    // Founder report 2026-10-19: shortened to one action per line.
    expect(CLIP_STRINGS.recordHint).toBe('Tap to start, or press and hold to film.');
  });
});

describe('lengths and names', () => {
  test('a finished video rounds, the running clock floors', () => {
    expect(formatClipDuration(12000)).toBe('0:12');
    expect(formatClipDuration(14960)).toBe('0:15');
    expect(formatClipDuration(14960, 'floor')).toBe('0:14');
    expect(formatClipDuration(0)).toBe('0:00');
    expect(formatClipDuration(-5)).toBe('0:00');
    expect(formatClipDuration(undefined)).toBe('0:00');
    expect(formatClipDuration(7000, 'floor')).toBe('0:07');
  });

  test('named by its exercise and set; the exercise alone when no set was known', () => {
    expect(clipDisplayName({ exerciseName: 'Bench press', setNumber: 3 })).toBe('Bench press, set 3');
    expect(clipDisplayName({ exerciseName: 'Bench press', setNumber: null })).toBe('Bench press');
    expect(clipDisplayName({ exerciseName: 'Bench press' })).toBe('Bench press');
    expect(clipDisplayName({ exerciseName: ' Row ', setNumber: 1 })).toBe('Row, set 1');
  });

  test('a video made on the summary is "After the workout"; anything else without an exercise is "Workout"', () => {
    expect(clipDisplayName({ exerciseName: null, source: 'summary' })).toBe('After the workout');
    expect(clipDisplayName({ exerciseName: '  ', source: 'summary' })).toBe('After the workout');
    expect(clipDisplayName({ exerciseName: null, source: 'workout' })).toBe('Workout');
    expect(clipDisplayName(null)).toBe('Workout');
  });

  test('a set number that is not a number is ignored', () => {
    for (const bad of [0, -2, NaN, 'x', undefined]) {
      expect(clipDisplayName({ exerciseName: 'Squat', setNumber: bad })).toBe('Squat');
    }
  });

  test('a sheet row reads "Bench press, set 3, 0:12" and "After the workout, 0:12"', () => {
    expect(clipRowTitle({ exerciseName: 'Bench press', setNumber: 3, durationMs: 12000 })).toBe('Bench press, set 3, 0:12');
    expect(clipRowTitle({ exerciseName: null, source: 'summary', durationMs: 12000 })).toBe('After the workout, 0:12');
  });

  test('the history count reads 1 video, 2 videos', () => {
    expect(clipCountLabel(1)).toBe('1 video');
    expect(clipCountLabel(2)).toBe('2 videos');
    expect(clipCountLabel(3)).toBe('3 videos');
  });
});

describe('the summary row changes with the workout', () => {
  test('no videos: "Record a video" with the line about recording a set from an exercise menu', () => {
    const copy = summaryClipRowCopy([]);
    expect(copy).toEqual({
      label: 'Record a video',
      sub: 'Up to two minutes, with no sound. You can also film a set from an exercise card during a workout.',
      newest: null,
    });
    expect(summaryClipRowCopy(undefined).label).toBe('Record a video');
    expect(summaryClipRowCopy(null).newest).toBeNull();
  });

  test('one video: "Use your video on the share", naming the exercise and set', () => {
    const clip = { id: 'c1', exerciseName: 'Bench press', setNumber: 3, createdAt: 5 };
    expect(summaryClipRowCopy([clip])).toEqual({
      label: 'Use your video on the share', sub: 'Your video of Bench press, set 3', newest: clip,
    });
  });

  test('one video made on the summary has no exercise to name', () => {
    expect(summaryClipRowCopy([{ id: 'c1', exerciseName: null, source: 'summary', createdAt: 1 }]).sub)
      .toBe('You recorded a video');
  });

  test('more than one: "You recorded 2 videos", and a tap hands over the NEWEST whatever order they come in', () => {
    const old = { id: 'old', exerciseName: 'Squat', setNumber: 1, createdAt: 10 };
    const fresh = { id: 'new', exerciseName: 'Row', setNumber: 2, createdAt: 99 };
    for (const list of [[old, fresh], [fresh, old]]) {
      const copy = summaryClipRowCopy(list);
      expect(copy.sub).toBe('You recorded 2 videos');
      expect(copy.label).toBe('Use your video on the share');
      expect(copy.newest.id).toBe('new');
    }
    expect(summaryClipRowCopy([old, fresh, { id: 'x', createdAt: 1 }]).sub).toBe('You recorded 3 videos');
  });
});

describe('the summary row names a PR set\'s video (addendum 9)', () => {
  const bench = { exerciseId: 'e1', exerciseName: 'Bench press', setNumber: 3, type: 'heaviest_weight' };
  const squat = { exerciseId: 'e2', exerciseName: 'Squat', setNumber: 1, type: '1rm_estimate' };

  test('"Use your PR video on the share", naming the PR set, and the tap hands over THAT video', () => {
    const prVideo = { id: 'pr', exerciseId: 'e1', exerciseName: 'Bench press', setNumber: 3, createdAt: 10 };
    const newer = { id: 'other', exerciseId: 'e1', exerciseName: 'Bench press', setNumber: 1, createdAt: 50 };
    const summary = { id: 'after', exerciseName: null, source: 'summary', createdAt: 90 };
    expect(summaryClipRowCopy([prVideo, newer, summary], [squat, bench])).toEqual({
      label: 'Use your PR video on the share',
      sub: 'Your video of Bench press, set 3, a new PR',
      newest: prVideo,
    });
  });

  test('of several videos of PR sets, the newest', () => {
    const a = { id: 'a', exerciseId: 'e1', exerciseName: 'Bench press', setNumber: 3, createdAt: 10 };
    const b = { id: 'b', exerciseId: 'e2', exerciseName: 'Squat', setNumber: 1, createdAt: 20 };
    for (const list of [[a, b], [b, a]]) {
      const copy = summaryClipRowCopy(list, [bench, squat]);
      expect(copy.newest.id).toBe('b');
      expect(copy.sub).toBe('Your video of Squat, set 1, a new PR');
    }
  });

  test('no video of a PR set, or no PRs handed over: the usual form, unchanged', () => {
    const clip = { id: 'c1', exerciseId: 'e1', exerciseName: 'Bench press', setNumber: 2, createdAt: 5 };
    const usual = { label: 'Use your video on the share', sub: 'Your video of Bench press, set 2', newest: clip };
    expect(summaryClipRowCopy([clip], [bench])).toEqual(usual);
    for (const prs of [undefined, null, []]) {
      expect(summaryClipRowCopy([{ ...clip, setNumber: 3 }], prs).label).toBe('Use your video on the share');
    }
    expect(summaryClipRowCopy([], [bench]).label).toBe('Record a video');
  });

  test('a PR video without a name of its own takes the PR\'s, and with neither says so plainly', () => {
    const unnamed = { id: 'u', exerciseId: 'e1', exerciseName: null, setNumber: 3, createdAt: 5 };
    expect(summaryClipRowCopy([unnamed], [bench]).sub).toBe('Your video of Bench press, set 3, a new PR');
    const bare = { id: 'x', exerciseId: 'e1', setNumber: 2, createdAt: 5 };
    expect(summaryClipRowCopy([bare], [{ exerciseId: 'e1', setNumber: 2 }])).toEqual({
      label: 'Use your PR video on the share', sub: 'Your video of a new PR', newest: bare,
    });
    // A record with no set number (a history reopen) never claims a video.
    expect(summaryClipRowCopy([bare], [{ exerciseId: 'e1', setNumber: null }]).label).toBe('Use your video on the share');
  });
});

describe('the summary row gate (calm mode or an open flag hides it, fail closed; never in history)', () => {
  const live = {
    readOnly: false, workoutId: 'w1', settled: true, suppressed: false, shareable: true,
  };

  test('shown only when every input says yes', () => {
    expect(summaryClipRowVisible(live)).toBe(true);
  });

  test('hidden in the read-only history view', () => {
    expect(summaryClipRowVisible({ ...live, readOnly: true })).toBe(false);
  });

  test('hidden under calm mode or an open ED flag (suppressed true)', () => {
    expect(summaryClipRowVisible({ ...live, suppressed: true })).toBe(false);
  });

  test('hidden until the calm and flag read has settled, whatever the flag currently says', () => {
    expect(summaryClipRowVisible({ ...live, settled: false })).toBe(false);
    expect(summaryClipRowVisible({ ...live, settled: false, suppressed: false })).toBe(false);
    expect(summaryClipRowVisible({ ...live, settled: undefined })).toBe(false);
  });

  test('hidden for a session with nothing to share', () => {
    expect(summaryClipRowVisible({ ...live, shareable: false })).toBe(false);
    expect(summaryClipRowVisible({ ...live, shareable: undefined })).toBe(false);
  });

  test('unknown means hidden: any input that is not an explicit yes hides it', () => {
    for (const bad of [undefined, null, 0, '', 'false']) {
      expect(summaryClipRowVisible({ ...live, suppressed: bad })).toBe(false);
    }
    for (const bad of [undefined, null, 0, '']) {
      expect(summaryClipRowVisible({ ...live, readOnly: bad })).toBe(false);
    }
    expect(summaryClipRowVisible({ ...live, workoutId: null })).toBe(false);
    expect(summaryClipRowVisible({ ...live, workoutId: '' })).toBe(false);
    expect(summaryClipRowVisible({})).toBe(false);
    expect(summaryClipRowVisible()).toBe(false);
  });
});

describe('a video and the PR set it was recorded for (addendum 9)', () => {
  const pr = { exerciseId: 'e1', exerciseName: 'Bench press', setNumber: 3 };

  test('the same exercise by id, and the same set number when both know one', () => {
    expect(clipMatchesPR({ exerciseId: 'e1', exerciseName: 'Bench press', setNumber: 3 }, pr)).toBe(true);
    expect(clipMatchesPR({ exerciseId: 'e1', exerciseName: 'Bench press', setNumber: 2 }, pr)).toBe(false);
    expect(clipMatchesPR({ exerciseId: 'e2', exerciseName: 'Bench press', setNumber: 3 }, pr)).toBe(false);
  });

  test('a side that knows no set number never matches: a history record carries none, and its exercise\'s videos are not claimed as the PR set', () => {
    expect(clipMatchesPR({ exerciseId: 'e1', exerciseName: 'Bench press', setNumber: null }, pr)).toBe(false);
    expect(clipMatchesPR({ exerciseId: 'e1', exerciseName: 'Bench press', setNumber: 2 }, { ...pr, setNumber: null })).toBe(false);
    expect(clipMatchesPR({ exerciseId: 'e1', exerciseName: 'Bench press', setNumber: 0 }, { ...pr, setNumber: 0 })).toBe(false);
  });

  test('without ids on both sides the names decide, case and spacing aside', () => {
    expect(clipMatchesPR({ exerciseName: ' bench press ', setNumber: 3 }, { exerciseName: 'Bench press', setNumber: 3 })).toBe(true);
    expect(clipMatchesPR({ exerciseName: 'Squat', setNumber: 3 }, { exerciseName: 'Bench press', setNumber: 3 })).toBe(false);
    expect(clipMatchesPR({ exerciseName: '', setNumber: 3 }, { exerciseName: '', setNumber: 3 })).toBe(false);
  });

  test('a summary video (no exercise) never matches a PR; missing inputs never match', () => {
    expect(clipMatchesPR({ source: 'summary', exerciseName: null }, pr)).toBe(false);
    expect(clipMatchesPR(null, pr)).toBe(false);
    expect(clipMatchesPR({ exerciseId: 'e1' }, null)).toBe(false);
  });

  test('prVideoFor: the newest video of any PR set, with its PR and index in the list', () => {
    const prs = [{ exerciseId: 'e9', exerciseName: 'Squat', setNumber: 1 }, pr];
    const clips = [
      { id: 'a', exerciseId: 'e1', setNumber: 3, createdAt: 10 },
      { id: 'b', exerciseId: 'e1', setNumber: 3, createdAt: 20 },
      { id: 'c', exerciseId: 'e1', setNumber: 1, createdAt: 30 },
      { id: 'd', source: 'summary', createdAt: 40 },
    ];
    expect(prVideoFor(clips, prs)).toEqual({ clip: clips[1], pr, prIndex: 1 });
    expect(prVideoFor([clips[3]], prs)).toBeNull();
    expect(prVideoFor(clips, [])).toBeNull();
    expect(prVideoFor(null, prs)).toBeNull();
  });
});

describe('the ruled words', () => {
  test('the primer, exactly: the only explanation anywhere', () => {
    expect(CLIP_STRINGS.primerTitle).toBe('Videos stay on this phone');
    // Addendum 12: the light line and the clear band are said once, here.
    // Addenda 13 and 14: the length, the light, the clear band, and where
    // the videos are kept, said once.
    expect(CLIP_STRINGS.primerBody).toBe('Prop your phone up, tap the button, and get into position. Recording starts after the countdown and stops by itself at the length you choose, up to two minutes, with no sound. Your share uses up to 15 seconds of it; you choose which. Your videos are kept with the workout on this phone and are never uploaded. During a workout, find them under the three dots on the exercise, in Your videos; after it, under the workout in History. Each video is removed after 7 days unless you tap Keep on it there. You can change the 7 days in Settings, under Your data. Keep bright lights behind the phone, not behind you. The clear band across the middle of the picture is where the share shows your lift best.');
    expect(CLIP_STRINGS.primerOpen).toBe('Open camera');
    expect(CLIP_STRINGS.primerNotNow).toBe('Not now');
  });

  test('the camera words', () => {
    expect(CLIP_STRINGS.permissionDenied).toBe("Volyume needs camera access to film a set. You can turn it on for Volyume in your phone's settings.");
    expect(CLIP_STRINGS.cameraMissing).toBe('Filming a set needs a newer version of Volyume. Update the app and try again.');
    // Addendum 14: where it went and where to find it, in the toast itself.
    expect(CLIP_STRINGS.saved).toBe('Saved for 7 days with this workout. Find it under the three dots on this exercise, in Your videos, where tapping Keep keeps it until you delete it. You can change the 7 days in Settings, under Your data.');
    expect(CLIP_STRINGS.undo).toBe('Undo');
    expect(CLIP_STRINGS.closeIdleA11y).toBe('Close camera');
    expect(CLIP_STRINGS.closeBusyA11y).toBe('Cancel recording');
    expect(CLIP_STRINGS.cancelCountdownA11y).toBe('Cancel the countdown');
    // Founder report 2026-10-19: shortened ("Tap the button again to cancel.").
    expect(CLIP_STRINGS.countdownHint).toBe('Tap to cancel.');
    expect(CLIP_STRINGS.stopA11y).toBe('Stop recording');
  });

  test('the sheet and the history row', () => {
    expect(CLIP_STRINGS.sheetTitle).toBe('Your videos');
    // One key for the history row too (it reads "Your videos" there).
    expect(CLIP_STRINGS.yourVideos).toBe('Your videos');
    expect(CLIP_STRINGS.historyLabel).toBeUndefined();
    expect(CLIP_STRINGS.afterWorkout).toBe('After the workout');
  });

  test('the PR moment, as the founder ruled it (addendum 9)', () => {
    expect(CLIP_STRINGS.prOfferText).toBe('This set would be a new PR');
    expect(CLIP_STRINGS.prOfferAction).toBe('Film it');
    expect(CLIP_STRINGS.prShareAction).toBe('Share');
    expect(CLIP_STRINGS.prShareA11y).toBe('Share this PR with its video');
    expect(CLIP_STRINGS.summaryLabelPR).toBe('Use your PR video on the share');
    // The offer's action films this set: the Film action's spoken label.
    expect(CLIP_STRINGS.rowA11y).toBe('Film this set');
  });

  test('nothing is replaced silently: no string says a video was replaced', () => {
    for (const line of Object.values(CLIP_STRINGS)) {
      expect(line).not.toMatch(/replaced/i);
    }
    expect(CLIP_STRINGS.full).toMatch(/Delete one/);
  });
});

// ── Keeping and clearing (D229 addendum 15) ──────────────────────────────────
const {
  KEEP_OPTIONS, DEFAULT_KEEP_DAYS, DAY_MS, MIN_FREE_BYTES, keepLabel, parseKeepDays, keepRuleLine,
  formatBytes, storageLine, clipExpired,
} = require('../rules');

describe('the keep window (addendum 15: "A, default 7 days but they can have an option for longer")', () => {
  test('7 days by default, with 30, 90 and until I delete them as the choices', () => {
    expect(KEEP_OPTIONS).toEqual([7, 30, 90, 0]);
    expect(DEFAULT_KEEP_DAYS).toBe(7);
    expect(keepLabel(7)).toBe('7 days');
    expect(keepLabel(90)).toBe('90 days');
    expect(keepLabel(0)).toBe('Until I delete them');
    expect(keepLabel(12)).toBe('7 days');
  });

  test('nothing stored, blank or nonsense reads as 7, never as "until I delete them"', () => {
    expect(parseKeepDays(null)).toBe(7);
    expect(parseKeepDays(undefined)).toBe(7);
    expect(parseKeepDays('')).toBe(7);
    expect(parseKeepDays('banana')).toBe(7);
    expect(parseKeepDays('0')).toBe(0);
    expect(parseKeepDays('30')).toBe(30);
  });

  test('the sheet says the rule in the person\'s own setting, and where to change it', () => {
    expect(keepRuleLine(7)).toBe('Each video is removed after 7 days unless you tap Keep on it here. You can change the 7 days in Settings, under Your data.');
    expect(keepRuleLine(0)).toBe('Videos stay until you delete them. You can change this in Settings, under Your data.');
    expect(keepRuleLine(null)).toBe(keepRuleLine(7));
  });

  test('sizes in plain words', () => {
    expect(formatBytes(68 * 1024 * 1024)).toBe('68 MB');
    expect(formatBytes(1.25 * 1024 * 1024 * 1024)).toBe('1.3 GB');
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2 GB');
    expect(storageLine(0, 0)).toBe('No videos on this phone.');
    expect(storageLine(1, 70 * 1024 * 1024)).toBe('1 video, 70 MB');
    expect(storageLine(3, 210 * 1024 * 1024)).toBe('3 videos, 210 MB');
  });

  test('a video is due when it is not kept and older than the window counted from the later of its recording and the rule\'s arrival; 0 is never', () => {
    const now = 1_800_000_000_000;
    const since = now - 100 * DAY_MS;
    expect(clipExpired({ createdAt: now - 8 * DAY_MS, keptAt: null }, { keepDays: 7, since, now })).toBe(true);
    expect(clipExpired({ createdAt: now - 6 * DAY_MS, keptAt: null }, { keepDays: 7, since, now })).toBe(false);
    expect(clipExpired({ createdAt: now - 8 * DAY_MS, keptAt: now }, { keepDays: 7, since, now })).toBe(false);
    expect(clipExpired({ createdAt: now - 400 * DAY_MS, keptAt: null }, { keepDays: 0, since, now })).toBe(false);
    // Recorded long before the rule arrived: the window runs from the arrival.
    expect(clipExpired({ createdAt: now - 400 * DAY_MS, keptAt: null }, { keepDays: 7, since: now - 6 * DAY_MS, now })).toBe(false);
    expect(clipExpired({ createdAt: now - 400 * DAY_MS, keptAt: null }, { keepDays: 7, since: now - 7 * DAY_MS, now })).toBe(true);
    expect(clipExpired({ createdAt: now - 31 * DAY_MS, keptAt: null }, { keepDays: 30, since, now })).toBe(true);
  });

  test('recording refuses under 500 MB free', () => {
    expect(MIN_FREE_BYTES).toBe(500 * 1024 * 1024);
  });
});

describe('the saved toast says the window (addendum 15, the founder: "display in the app as well where they are viewed or recorded")', () => {
  const { savedLine, CLIP_STRINGS: STR } = require('../rules');
  test('in the person\'s own setting, the default being 7 days', () => {
    expect(savedLine(null)).toBe(STR.saved);
    expect(savedLine(7)).toBe(STR.saved);
    expect(savedLine(90)).toMatch(/^Saved for 90 days with this workout\. Find it under the three dots/);
    expect(savedLine(0)).toBe('Saved with this workout until you delete it. Find it under the three dots on this exercise, in Your videos.');
  });
  test('the primer says the rule and where to change it', () => {
    expect(STR.primerBody).toContain('Each video is removed after 7 days unless you tap Keep on it there. You can change the 7 days in Settings, under Your data.');
  });
  test('the primer follows the setting; 7 is the constant, 0 swaps the two keep sentences', () => {
    const { primerBody } = require('../rules');
    expect(primerBody(7)).toBe(STR.primerBody);
    expect(primerBody(null)).toBe(STR.primerBody);
    expect(primerBody(30)).toContain('Each video is removed after 30 days unless you tap Keep on it there. You can change the 30 days in Settings, under Your data.');
    expect(primerBody(90)).toContain('after 90 days');
    const zero = primerBody(0);
    expect(zero).toContain('Your videos stay until you delete them. You can change this in Settings, under Your data.');
    expect(zero).not.toMatch(/removed after|\d days/);
    expect(zero.startsWith('Prop your phone up')).toBe(true);
    expect(zero.endsWith('shows your lift best.')).toBe(true);
  });
  test('the summary variant of the saved toast finds it under the workout in History', () => {
    expect(savedLine(7, { place: 'summary' })).toBe('Saved for 7 days with this workout. Find it under this workout in History, in Your videos, where tapping Keep keeps it until you delete it. You can change the 7 days in Settings, under Your data.');
    expect(savedLine(0, { place: 'summary' })).toBe('Saved with this workout until you delete it. Find it under this workout in History, in Your videos.');
    expect(savedLine(30)).toContain('You can change the 30 days in Settings');
  });
  test('the Settings line, the removal confirm and the stop-keeping confirm', () => {
    const { settingsKeepSub, removeNowTitle, removeNowBody, stopKeepBody } = require('../rules');
    expect(settingsKeepSub(7)).toBe("Older videos are removed from this phone. Tap Keep on a video, in Your videos under the exercise's three dots during a workout or under the workout in History, and it stays until you delete it. A video of a PR set is kept for you.");
    expect(settingsKeepSub(0)).toBe('Videos stay on this phone until you delete them. A video of a PR set is kept for you.');
    expect(removeNowTitle(3)).toBe('Remove 3 videos now?');
    expect(removeNowTitle(1)).toBe('Remove 1 video now?');
    expect(removeNowBody(3, 7)).toBe('3 videos older than 7 days will be removed from this phone. Videos you have kept, and videos of PR sets, stay.');
    expect(stopKeepBody(7)).toBe('It is older than 7 days, so it will be removed the next time the app opens.');
    expect(CLIP_STRINGS.stopKeepTitle).toBe('Stop keeping this video?');
    expect(CLIP_STRINGS.stopKeepCancel).toBe('Keep it');
    expect(CLIP_STRINGS.stopKeepConfirm).toBe('Stop keeping it');
    expect(CLIP_STRINGS.removeNowConfirm).toBe('Remove them');
    expect(CLIP_STRINGS.deleteConfirmCancel).toBe('Cancel');
  });
  test('every toast sentence ends with a full stop, and none says "couldn\'t"', () => {
    for (const key of ['deleted', 'deleteFailed', 'saveFailed', 'undoFailed', 'keepFailed', 'deleteAllDone', 'deleteAllFailed', 'permissionDenied', 'cameraMissing', 'shareVideoGone', 'shareVideoCannotOpen', 'shareNotPrepared', 'noSpace']) {
      expect({ key, stop: /\.$/.test(STR[key]) }).toEqual({ key, stop: true });
    }
    for (const line of Object.values(STR)) expect(line).not.toMatch(/n't\b/);
  });
});
