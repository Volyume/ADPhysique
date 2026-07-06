import {
  PROGRESS_PHOTO_TIMELINE_COLS,
  buildCheckInTimeline,
  buildTimeline,
  filterAndSort,
} from '../progressPhotoTimeline';

const day = (y, m, d) => new Date(y, m - 1, d, 12).getTime();

describe('progressPhotoTimeline', () => {
  test('buildTimeline groups contiguous months into fixed-width rows', () => {
    const photos = [
      { name: 'jun-4', takenAt: day(2026, 6, 4) },
      { name: 'jun-3', takenAt: day(2026, 6, 3) },
      { name: 'jun-2', takenAt: day(2026, 6, 2) },
      { name: 'jun-1', takenAt: day(2026, 6, 1) },
      { name: 'may-1', takenAt: day(2026, 5, 31) },
    ];

    expect(PROGRESS_PHOTO_TIMELINE_COLS).toBe(3);
    expect(buildTimeline(photos)).toEqual([
      { type: 'header', key: 'h-2026-5', label: 'June 2026' },
      { type: 'row', key: 'row-jun-4', photos: photos.slice(0, 3) },
      { type: 'row', key: 'row-jun-1', photos: photos.slice(3, 4) },
      { type: 'header', key: 'h-2026-4', label: 'May 2026' },
      { type: 'row', key: 'row-may-1', photos: photos.slice(4) },
    ]);
  });

  test('buildCheckInTimeline groups same-day photos into pose-ordered check-ins', () => {
    const photos = [
      { name: 'jun-side', takenAt: day(2026, 6, 4), pose: 'side', note: '', weightKg: null },
      { name: 'jun-front', takenAt: day(2026, 6, 4), pose: 'front', note: 'Same setup', weightKg: 82.4 },
      { name: 'jun-back', takenAt: day(2026, 6, 4), pose: 'back', note: '', weightKg: null },
      { name: 'may-front', takenAt: day(2026, 5, 31), pose: 'front', note: '', weightKg: null },
    ];

    expect(buildCheckInTimeline(photos)).toEqual([
      { type: 'header', key: 'h-2026-5', label: 'June 2026' },
      {
        type: 'checkin',
        key: 'checkin-2026-5-4',
        dayKey: '2026-5-4',
        label: '4 Jun 2026',
        takenAt: photos[1].takenAt,
        cover: photos[1],
        photos: [photos[1], photos[0], photos[2]],
        poses: ['front', 'side', 'back'],
        note: 'Same setup',
        weightKg: 82.4,
        setupQuality: {
          key: 'complete',
          label: 'Strong setup',
          helper: 'Front, side and back are saved for like-for-like comparison.',
        },
      },
      { type: 'header', key: 'h-2026-4', label: 'May 2026' },
      {
        type: 'checkin',
        key: 'checkin-2026-4-31',
        dayKey: '2026-4-31',
        label: '31 May 2026',
        takenAt: photos[3].takenAt,
        cover: photos[3],
        photos: [photos[3]],
        poses: ['front'],
        note: null,
        weightKg: null,
        setupQuality: {
          key: 'partial',
          label: 'Partial setup',
          helper: 'Add the other poses before relying on comparisons.',
        },
      },
    ]);
  });

  test('filterAndSort is newest-first by default and oldest-first when asked', () => {
    const items = [
      { name: 'a', takenAt: 100, pose: 'front' },
      { name: 'b', takenAt: 200, pose: 'side' },
      { name: 'c', takenAt: 300, pose: 'front' },
    ];

    expect(filterAndSort(items).map((p) => p.name)).toEqual(['c', 'b', 'a']);
    expect(filterAndSort(items, { sortOrder: 'oldest' }).map((p) => p.name)).toEqual(['a', 'b', 'c']);
  });

  test('filterAndSort composes pose and inclusive date bounds', () => {
    const items = [
      { name: 'a', takenAt: 100, pose: 'front' },
      { name: 'b', takenAt: 200, pose: 'side' },
      { name: 'c', takenAt: 300, pose: 'front' },
    ];

    expect(filterAndSort(items, { rangeFrom: 150, rangeTo: 250 }).map((p) => p.name)).toEqual(['b']);
    expect(filterAndSort(items, { poseFilter: 'front', rangeFrom: 150, sortOrder: 'oldest' }).map((p) => p.name))
      .toEqual(['c']);
  });
});
