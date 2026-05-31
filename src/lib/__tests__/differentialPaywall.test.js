/**
 * Tests for the Move #4 differential paywall trigger detector.
 *
 * Locked spec in MOVE_4_DIFFERENTIAL_PAYWALL.md. Two locked surfaces
 * being verified here:
 *   1. Trigger gates (tier, adherence 2-of-3, context-specific signal).
 *   2. The six verbatim copy variants (acceptance check line 149).
 */
import {
  detectDifferentialTrigger,
  LOCKED_COPY,
  LOCKED_COPY_NO_TRIAL,
  TRIGGER_CONTEXTS,
} from '../differentialPaywall';

// Helper: a 3-week history with all-off-target adherence so the
// adherence gate always passes. Use this as a base and override
// signal-specific fields per test.
function baseHistory({ adherence = 'under', energy = 3, soreness = 2 } = {}) {
  return [
    { adherence, energy, soreness, hasCheckin: true, hasFoodData: false },
    { adherence, energy, soreness, hasCheckin: true, hasFoodData: false },
  ];
}

const passingAdherenceArgs = {
  calsAdherence: 'under',
  recentWeeklyHistory: baseHistory({ adherence: 'under' }),
};

// ── Tier gate ───────────────────────────────────────────────────────

describe('tier gate', () => {
  test('paid_pro never sees the differential paywall', () => {
    const r = detectDifferentialTrigger({
      userTier: 'pro',
      ...passingAdherenceArgs,
      deloadSuggested: true,
    });
    expect(r.shown).toBe(false);
  });

  test('paid_complete never sees the differential paywall', () => {
    const r = detectDifferentialTrigger({
      userTier: 'complete',
      ...passingAdherenceArgs,
      deloadSuggested: true,
    });
    expect(r.shown).toBe(false);
  });

  test('free user can see it (gate satisfied)', () => {
    const r = detectDifferentialTrigger({
      userTier: 'free',
      ...passingAdherenceArgs,
      deloadSuggested: true,
    });
    expect(r.shown).toBe(true);
  });
});

// ── Adherence 2-of-3 gate ──────────────────────────────────────────

describe('adherence 2-of-3 gate', () => {
  test('1-of-3 off target does NOT fire', () => {
    const r = detectDifferentialTrigger({
      userTier: 'free',
      calsAdherence: 'under',
      recentWeeklyHistory: [
        { adherence: 'hit', energy: 3, soreness: 2 },
        { adherence: 'hit', energy: 3, soreness: 2 },
      ],
      deloadSuggested: true,
    });
    expect(r.shown).toBe(false);
  });

  test('2-of-3 off-target ("over" + "under" mix) fires', () => {
    const r = detectDifferentialTrigger({
      userTier: 'free',
      calsAdherence: 'over',
      recentWeeklyHistory: [
        { adherence: 'under', energy: 3, soreness: 2 },
        { adherence: 'hit', energy: 3, soreness: 2 },
      ],
      deloadSuggested: true,
    });
    expect(r.shown).toBe(true);
  });

  test('3-of-3 off-target fires', () => {
    const r = detectDifferentialTrigger({
      userTier: 'free',
      calsAdherence: 'under',
      recentWeeklyHistory: [
        { adherence: 'under', energy: 3, soreness: 2 },
        { adherence: 'over', energy: 3, soreness: 2 },
      ],
      deloadSuggested: true,
    });
    expect(r.shown).toBe(true);
  });

  test('missing history fails the gate (brand new user)', () => {
    const r = detectDifferentialTrigger({
      userTier: 'free',
      calsAdherence: 'under',
      recentWeeklyHistory: null,
      deloadSuggested: true,
    });
    expect(r.shown).toBe(false);
  });

  test('only 1 week of history fails the gate (not enough data)', () => {
    const r = detectDifferentialTrigger({
      userTier: 'free',
      calsAdherence: 'under',
      recentWeeklyHistory: [
        { adherence: 'under', energy: 3, soreness: 2 },
      ],
      deloadSuggested: true,
    });
    expect(r.shown).toBe(false);
  });
});

// ── Trigger contexts ────────────────────────────────────────────────

// Safety: the two distress contexts were removed as conversion triggers
// (audit 2026-05-31, founder decision). They must NEVER fire a paywall,
// even when the distress signals are strong and the adherence gate passes.
describe('distress contexts are not conversion triggers', () => {
  test('high soreness alone does NOT fire a paywall', () => {
    const r = detectDifferentialTrigger({
      userTier: 'free',
      ...passingAdherenceArgs,
      sorenessScore: 5,
      recentWeeklyHistory: [
        { adherence: 'under', soreness: 5 },
        { adherence: 'under', soreness: 4 },
      ],
    });
    expect(r.shown).toBe(false);
  });

  test('two-week energy crash alone does NOT fire a paywall', () => {
    const r = detectDifferentialTrigger({
      userTier: 'free',
      ...passingAdherenceArgs,
      energyScore: 2,
      recentWeeklyHistory: [
        { adherence: 'under', energy: 2 },
        { adherence: 'under', energy: 2 },
      ],
    });
    expect(r.shown).toBe(false);
  });

  test('extreme_soreness / energy_crash are absent from the trigger list', () => {
    expect(TRIGGER_CONTEXTS).not.toContain('extreme_soreness');
    expect(TRIGGER_CONTEXTS).not.toContain('energy_crash');
  });

  test('distress signals do not override a real training trigger', () => {
    // Strong distress + a genuine deload: only the deload fires.
    const r = detectDifferentialTrigger({
      userTier: 'free',
      ...passingAdherenceArgs,
      sorenessScore: 5,
      energyScore: 2,
      deloadSuggested: true,
    });
    expect(r.shown).toBe(true);
    expect(r.trigger).toBe('deload');
  });
});

describe('trigger context: deload', () => {
  test('deloadSuggested fires', () => {
    const r = detectDifferentialTrigger({
      userTier: 'free',
      ...passingAdherenceArgs,
      deloadSuggested: true,
    });
    expect(r.shown).toBe(true);
    expect(r.trigger).toBe('deload');
  });
});

describe('trigger context: stalled_lift', () => {
  test('3-week plateau fires', () => {
    const r = detectDifferentialTrigger({
      userTier: 'free',
      ...passingAdherenceArgs,
      weeksLiftStalled: 3,
    });
    expect(r.shown).toBe(true);
    expect(r.trigger).toBe('stalled_lift');
  });

  test('2-week plateau does NOT fire (locked copy says three weeks)', () => {
    const r = detectDifferentialTrigger({
      userTier: 'free',
      ...passingAdherenceArgs,
      weeksLiftStalled: 2,
    });
    expect(r.shown).toBe(false);
  });
});

describe('trigger context: missing_tdee', () => {
  test('missingTdeeSignal fires', () => {
    const r = detectDifferentialTrigger({
      userTier: 'free',
      ...passingAdherenceArgs,
      missingTdeeSignal: true,
    });
    expect(r.shown).toBe(true);
    expect(r.trigger).toBe('missing_tdee');
  });
});

describe('trigger context: block_summary', () => {
  test('blockEnded fires', () => {
    const r = detectDifferentialTrigger({
      userTier: 'free',
      ...passingAdherenceArgs,
      blockEnded: true,
    });
    expect(r.shown).toBe(true);
    expect(r.trigger).toBe('block_summary');
  });
});

// ── Priority ordering ───────────────────────────────────────────────

describe('priority ordering when multiple contexts match', () => {
  test('deload wins over stalled_lift', () => {
    const r = detectDifferentialTrigger({
      userTier: 'free',
      ...passingAdherenceArgs,
      deloadSuggested: true,
      weeksLiftStalled: 3,
    });
    expect(r.trigger).toBe('deload');
  });

  test('stalled_lift wins over missing_tdee', () => {
    const r = detectDifferentialTrigger({
      userTier: 'free',
      ...passingAdherenceArgs,
      weeksLiftStalled: 3,
      missingTdeeSignal: true,
    });
    expect(r.trigger).toBe('stalled_lift');
  });

  test('missing_tdee wins over block_summary', () => {
    const r = detectDifferentialTrigger({
      userTier: 'free',
      ...passingAdherenceArgs,
      missingTdeeSignal: true,
      blockEnded: true,
    });
    expect(r.trigger).toBe('missing_tdee');
  });

  test('TRIGGER_CONTEXTS export matches the priority order used internally', () => {
    expect(TRIGGER_CONTEXTS).toEqual([
      'deload',
      'stalled_lift',
      'missing_tdee',
      'block_summary',
    ]);
  });
});

// ── CTA selection ──────────────────────────────────────────────────

describe('paywall_cta selection based on trial entitlement', () => {
  test('user with trial available -> try_pro_14d', () => {
    const r = detectDifferentialTrigger({
      userTier: 'free',
      ...passingAdherenceArgs,
      deloadSuggested: true,
      hasUsedTrial: false,
    });
    expect(r.paywall_cta).toBe('try_pro_14d');
  });

  test('user who already used trial -> buy_pro', () => {
    const r = detectDifferentialTrigger({
      userTier: 'free',
      ...passingAdherenceArgs,
      deloadSuggested: true,
      hasUsedTrial: true,
    });
    expect(r.paywall_cta).toBe('buy_pro');
  });
});

// ── Locked copy snapshot (verbatim from MOVE_4 doc lines 62-86) ────

describe('locked copy variants', () => {
  test.each(TRIGGER_CONTEXTS)(
    'LOCKED_COPY.%s is the verbatim trial-CTA variant',
    (ctx) => {
      const r = detectDifferentialTrigger({
        userTier: 'free',
        ...passingAdherenceArgs,
        hasUsedTrial: false,
        // Set the right signal for this ctx so it fires:
        sorenessScore: ctx === 'extreme_soreness' ? 4 : null,
        energyScore: ctx === 'energy_crash' ? 2 : null,
        recentWeeklyHistory: ctx === 'energy_crash'
          ? [
              { adherence: 'under', energy: 2 },
              { adherence: 'under', energy: 4 },
            ]
          : baseHistory({ adherence: 'under' }),
        deloadSuggested: ctx === 'deload',
        weeksLiftStalled: ctx === 'stalled_lift' ? 3 : null,
        missingTdeeSignal: ctx === 'missing_tdee',
        blockEnded: ctx === 'block_summary',
      });
      expect(r.shown).toBe(true);
      expect(r.trigger).toBe(ctx);
      expect(r.with_food_data_message).toBe(LOCKED_COPY[ctx]);
    },
  );

  test.each(TRIGGER_CONTEXTS)(
    'LOCKED_COPY_NO_TRIAL.%s is used when hasUsedTrial=true',
    (ctx) => {
      const r = detectDifferentialTrigger({
        userTier: 'free',
        ...passingAdherenceArgs,
        hasUsedTrial: true,
        sorenessScore: ctx === 'extreme_soreness' ? 4 : null,
        energyScore: ctx === 'energy_crash' ? 2 : null,
        recentWeeklyHistory: ctx === 'energy_crash'
          ? [
              { adherence: 'under', energy: 2 },
              { adherence: 'under', energy: 4 },
            ]
          : baseHistory({ adherence: 'under' }),
        deloadSuggested: ctx === 'deload',
        weeksLiftStalled: ctx === 'stalled_lift' ? 3 : null,
        missingTdeeSignal: ctx === 'missing_tdee',
        blockEnded: ctx === 'block_summary',
      });
      expect(r.with_food_data_message).toBe(LOCKED_COPY_NO_TRIAL[ctx]);
    },
  );

  test('locked copy never uses jargon-blocklist terms', () => {
    const allCopy = [
      ...Object.values(LOCKED_COPY),
      ...Object.values(LOCKED_COPY_NO_TRIAL),
    ].join(' ');
    // From CLAUDE.md and the locked voice synthesis. Lowercase compare.
    const blockedTerms = [
      'em dash',  // proxy: catches literal em dashes (—) below as well
      'leverage',
      'streamline',
      'comprehensive',
      'seamless',
      'robust',
      'utilise',
      'facilitate',
      'metabolic adaptation',
      'training stimulus',
    ];
    const lower = allCopy.toLowerCase();
    for (const term of blockedTerms) {
      expect(lower).not.toContain(term);
    }
    // Em dashes are banned outright.
    expect(allCopy).not.toContain('—');
  });

  test('locked copy is under 25 words per variant', () => {
    for (const [ctx, msg] of Object.entries(LOCKED_COPY)) {
      const wordCount = msg.split(/\s+/).filter(Boolean).length;
      expect(wordCount).toBeLessThanOrEqual(25);
      expect(ctx).toBeTruthy();
    }
  });
});

// ── No firing when no signal matches ───────────────────────────────

describe('no context signal -> no fire', () => {
  test('adherence gate passes but no context signal -> no fire', () => {
    const r = detectDifferentialTrigger({
      userTier: 'free',
      ...passingAdherenceArgs,
      // All signals null / false:
      sorenessScore: null,
      energyScore: null,
      deloadSuggested: false,
      weeksLiftStalled: null,
      missingTdeeSignal: false,
      blockEnded: false,
    });
    expect(r.shown).toBe(false);
  });
});
