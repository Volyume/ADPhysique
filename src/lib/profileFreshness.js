const DAY_MS = 24 * 60 * 60 * 1000;

function ageDays(lastAt, nowMs) {
  if (!lastAt) return null;
  const ms = Number(lastAt);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return Math.max(0, Math.floor((nowMs - ms) / DAY_MS));
}

function stateForAge(days, dueDays, warnDays) {
  if (days == null) return 'missing';
  if (days >= dueDays) return 'due';
  if (days >= warnDays) return 'soon';
  return 'fresh';
}

function copyForAge(days, fresh, soon, due, missing) {
  if (days == null) return missing;
  if (days === 0) return fresh.today;
  if (days === 1) return fresh.yesterday;
  return fresh.days(days, soon, due);
}

export function buildProfileFreshness({ latestMetricAt, latestScanAt, latestWorkoutAt, keyLiftCount = 0 }, nowMs = Date.now()) {
  const metricDays = ageDays(latestMetricAt, nowMs);
  const scanDays = ageDays(latestScanAt, nowMs);
  const liftDays = ageDays(latestWorkoutAt, nowMs);
  const hasEnoughLifts = Number(keyLiftCount) >= 3;

  return {
    bodyMetrics: {
      state: stateForAge(metricDays, 14, 7),
      days: metricDays,
      label: 'Body metrics',
      sub: copyForAge(
        metricDays,
        {
          today: 'Logged today. Keep weight regular and measurements weekly.',
          yesterday: 'Logged yesterday. Measurements stay useful when updated weekly.',
          days: (days, soon, due) => days >= 14 ? due(days) : days >= 7 ? soon(days) : `Last updated ${days} days ago. Still fresh.`,
        },
        (days) => `Last updated ${days} days ago. Check weight or measurements this week.`,
        (days) => `Last updated ${days} days ago. Add a current metric so the coach has fresh context.`,
        'No metric logged yet. Add weight, body fat or measurements to anchor your profile.',
      ),
    },
    progressScan: {
      state: stateForAge(scanDays, 28, 21),
      days: scanDays,
      label: 'Progress photos and Physique Scan',
      sub: copyForAge(
        scanDays,
        {
          today: 'Scanned today. Retake only when light, pose and body weight are comparable.',
          yesterday: 'Scanned yesterday. Keep the next scan 2 to 4 weeks away unless you are correcting quality.',
          days: (days, soon, due) => days >= 28 ? due(days) : days >= 21 ? soon(days) : `Last scan ${days} days ago. Keep the next one comparable.`,
        },
        (days) => `Last scan ${days} days ago. Plan your next comparable photos soon.`,
        (days) => `Last scan ${days} days ago. Retake when light, pose and timing are consistent.`,
        'No scan yet. Start with consistent front, side and back photos.',
      ),
    },
    lifts: {
      state: hasEnoughLifts ? stateForAge(liftDays, 21, 14) : 'missing',
      days: liftDays,
      label: 'Lift progress',
      sub: hasEnoughLifts
        ? copyForAge(
          liftDays,
          {
            today: 'Updated today. Strength baselines are current.',
            yesterday: 'Updated yesterday. Strength baselines are current.',
            days: (days, soon, due) => days >= 21 ? due(days) : days >= 14 ? soon(days) : `Last hard data ${days} days ago. Baselines are current.`,
          },
          (days) => `Last hard data ${days} days ago. Keep core lifts moving through the plan.`,
          (days) => `Last hard data ${days} days ago. Log key compounds to refresh baselines.`,
          'No completed workout date found yet. Finish sessions to build baselines.',
        )
        : 'Log at least three core lifts with body weight to make standards useful.',
    },
  };
}

export function freshnessTone(state) {
  if (state === 'due' || state === 'missing') return 'attention';
  if (state === 'soon') return 'soon';
  return 'fresh';
}
