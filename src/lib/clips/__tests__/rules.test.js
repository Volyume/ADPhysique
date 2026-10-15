/**
 * clips rules (D229 addendum 5 and the founder's additions of 2026-10-15): the
 * numbers and the words every video surface shares. Written to fail if any
 * ruling drifts:
 *   - up to three videos for each workout, 15 seconds, a 1 second floor;
 *   - TWO ways to record: a tap (countdown 3 / 5 / 10 s, then a length of
 *     5 / 10 / 15 s that stops by itself) and a hold (no countdown, capped at
 *     15 s); both remembered, defaults 3 s and 15 s;
 *   - the exercise-menu row's second line for none, one, two and three videos;
 *   - a video is named by its exercise and set ("Bench press, set 3, 0:12"), or
 *     "After the workout" when it was made on the summary;
 *   - the summary row's two forms, and when it is shown at all.
 */
import {
  MAX_CLIPS_PER_WORKOUT, MAX_CLIP_SECONDS, MAX_CLIP_MS, MIN_CLIP_MS, LEAD_IN_OPTIONS,
  LENGTH_OPTIONS, DEFAULT_LEAD_IN_SECONDS, DEFAULT_LENGTH_SECONDS, CLIP_SOURCES, CLIP_STRINGS,
  LEAD_IN_KEY, LENGTH_KEY, PRIMER_SEEN_KEY, clipRowDescription, isFull, summaryClipRowVisible,
  summaryClipRowCopy, formatClipDuration, clipDisplayName, clipRowTitle, clipCountLabel,
  nextLeadIn, nextLength, parseLeadIn, parseLength, leadInLabel, leadInA11yLabel, lengthLabel,
  lengthA11yLabel, startA11yLabel, clipMatchesPR, prVideoFor,
} from '../rules';

describe('the rulings, as numbers', () => {
  test('three videos for each workout, 15 seconds at the longest, 1 second at the shortest', () => {
    expect(MAX_CLIPS_PER_WORKOUT).toBe(3);
    expect(MAX_CLIP_SECONDS).toBe(15);
    expect(MAX_CLIP_MS).toBe(15000);
    expect(MIN_CLIP_MS).toBe(1000);
  });

  test('the countdown cycles 3 / 5 / 10 seconds, default 3', () => {
    expect(LEAD_IN_OPTIONS).toEqual([3, 5, 10]);
    expect(DEFAULT_LEAD_IN_SECONDS).toBe(3);
  });

  test('the length cycles 5 / 10 / 15 seconds, default 15, never past the cap', () => {
    expect(LENGTH_OPTIONS).toEqual([5, 10, 15]);
    expect(DEFAULT_LENGTH_SECONDS).toBe(15);
    expect(Math.max(...LENGTH_OPTIONS)).toBe(MAX_CLIP_SECONDS);
  });

  test('a video is saved as a workout video or a summary video, nothing else', () => {
    expect(CLIP_SOURCES).toEqual(['workout', 'summary']);
  });

  test('the three device flags use the ruled keys', () => {
    expect(LEAD_IN_KEY).toBe('@volyume_clip_leadin');
    expect(LENGTH_KEY).toBe('@volyume_clip_length');
    expect(PRIMER_SEEN_KEY).toBe('@volyume_clip_primer_seen');
  });
});

describe('the exercise menu row, by how many videos the workout holds', () => {
  test.each([
    [0, 'Up to 15 seconds, no sound. Shared from the summary afterwards.'],
    [1, '1 saved. Up to 3 for each workout.'],
    [2, '2 saved. Up to 3 for each workout.'],
    [3, '3 saved, the most for one workout.'],
  ])('%i videos', (count, line) => {
    expect(clipRowDescription(count)).toBe(line);
  });

  test('anything that is not a count reads as none; more than three reads as three', () => {
    for (const bad of [undefined, null, NaN, -1, 'x']) {
      expect(clipRowDescription(bad)).toBe(CLIP_STRINGS.rowDescNone);
    }
    expect(clipRowDescription(7)).toBe(CLIP_STRINGS.rowDescThree);
  });

  test('isFull is true from three', () => {
    expect([0, 1, 2].map(isFull)).toEqual([false, false, false]);
    expect([3, 4].map(isFull)).toEqual([true, true]);
    expect(isFull(undefined)).toBe(false);
  });

  test('the row is labelled in plain words', () => {
    expect(CLIP_STRINGS.rowLabel).toBe('Record a video of this set');
    expect(CLIP_STRINGS.rowA11y).toBe('Record a video of this set');
  });
});

describe('the two small controls', () => {
  test('the countdown cycles 3 -> 5 -> 10 -> 3', () => {
    expect(nextLeadIn(3)).toBe(5);
    expect(nextLeadIn(5)).toBe(10);
    expect(nextLeadIn(10)).toBe(3);
  });

  test('the length cycles 5 -> 10 -> 15 -> 5', () => {
    expect(nextLength(5)).toBe(10);
    expect(nextLength(10)).toBe(15);
    expect(nextLength(15)).toBe(5);
  });

  test('a corrupt stored value cannot strand either control', () => {
    expect(nextLeadIn(7)).toBe(3);
    expect(nextLeadIn(undefined)).toBe(3);
    expect(nextLength(7)).toBe(15);
    expect(nextLength(undefined)).toBe(15);
    expect(parseLeadIn('10')).toBe(10);
    expect(parseLeadIn('5')).toBe(5);
    expect(parseLeadIn('banana')).toBe(3);
    expect(parseLeadIn(null)).toBe(3);
    expect(parseLength('5')).toBe(5);
    expect(parseLength('10')).toBe(10);
    expect(parseLength('20')).toBe(15);
    expect(parseLength(null)).toBe(15);
  });

  test('their text and accessibility words', () => {
    expect(leadInLabel(3)).toBe('3 s');
    expect(leadInLabel(10)).toBe('10 s');
    expect(lengthLabel(5)).toBe('5 s');
    expect(lengthLabel(15)).toBe('15 s');
    expect(startA11yLabel(3)).toBe('Start recording in 3 seconds');
    expect(startA11yLabel(10)).toBe('Start recording in 10 seconds');
    expect(leadInA11yLabel(10)).toBe('Countdown before recording, 10 seconds');
    expect(lengthA11yLabel(15)).toBe('Recording length, 15 seconds');
  });

  test('each carries a plain word above its value, and the line under the button says both ways', () => {
    expect(CLIP_STRINGS.countdownCaption).toBe('Countdown');
    expect(CLIP_STRINGS.lengthCaption).toBe('Length');
    expect(CLIP_STRINGS.recordHint).toBe('Tap to start with a countdown. Hold to record while you hold.');
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
      sub: "Up to 15 seconds, no sound. You can also record a set during a workout from an exercise's menu.",
      newest: null,
    });
    expect(summaryClipRowCopy(undefined).label).toBe('Record a video');
    expect(summaryClipRowCopy(null).newest).toBeNull();
  });

  test('one video: "Use your video on the share", naming the exercise and set', () => {
    const clip = { id: 'c1', exerciseName: 'Bench press', setNumber: 3, createdAt: 5 };
    expect(summaryClipRowCopy([clip])).toEqual({
      label: 'Use your video on the share', sub: 'You recorded Bench press, set 3', newest: clip,
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

  test('a side that knows no set number matches on the exercise alone', () => {
    expect(clipMatchesPR({ exerciseId: 'e1', exerciseName: 'Bench press', setNumber: null }, pr)).toBe(true);
    expect(clipMatchesPR({ exerciseId: 'e1', exerciseName: 'Bench press', setNumber: 2 }, { ...pr, setNumber: null })).toBe(true);
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
    expect(CLIP_STRINGS.primerBody).toBe('Prop your phone up, tap the button and get into position. Recording starts after the countdown and stops by itself. Up to 15 seconds, no sound. Kept with this workout, never uploaded, deleted when you delete the workout.');
    expect(CLIP_STRINGS.primerOpen).toBe('Open camera');
    expect(CLIP_STRINGS.primerNotNow).toBe('Not now');
  });

  test('the camera words', () => {
    expect(CLIP_STRINGS.permissionDenied).toBe('Camera access is needed to record a video');
    expect(CLIP_STRINGS.saved).toBe('Video saved to this workout');
    expect(CLIP_STRINGS.undo).toBe('Undo');
    expect(CLIP_STRINGS.closeA11y).toBe('Cancel recording');
    expect(CLIP_STRINGS.stopA11y).toBe('Stop recording');
  });

  test('the sheet and the history row', () => {
    expect(CLIP_STRINGS.sheetTitle).toBe('Your videos');
    expect(CLIP_STRINGS.historyLabel).toBe('Videos');
    expect(CLIP_STRINGS.afterWorkout).toBe('After the workout');
  });

  test('nothing is replaced silently: no string says a video was replaced', () => {
    for (const line of Object.values(CLIP_STRINGS)) {
      expect(line).not.toMatch(/replaced/i);
    }
    expect(CLIP_STRINGS.full).toMatch(/Delete one/);
  });
});
