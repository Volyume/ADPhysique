/**
 * fixtures/choices.js -- a realistic resolved catalogue for the planner tests:
 * per muscle, the exercises a full-gym person gets, in catalogue order, with
 * the pool kind and the half credit each set gives other muscles (the shape
 * lane B1's resolveCatalogue returns, design 4.7). Test data only.
 */
module.exports = {
  chest: [
    {
      name: 'Barbell Bench Press',
      kind: 'heavy_compound',
      credits: {
        triceps: 0.5,
        front_delts: 0.5
      }
    },
    {
      name: 'Incline Dumbbell Press',
      kind: 'mod_compound',
      credits: {
        triceps: 0.5,
        front_delts: 0.5
      }
    },
    {
      name: 'Pec Deck (Machine Fly)',
      kind: 'isolation',
      credits: {}
    }
  ],
  back: [
    {
      name: 'Lat Pulldown (Wide Grip)',
      kind: 'machine',
      credits: {
        biceps: 0.5,
        rear_delts: 0.5
      }
    },
    {
      name: 'Seated Cable Row',
      kind: 'machine',
      credits: {
        biceps: 0.5,
        rear_delts: 0.5,
        traps: 0.5
      }
    },
    {
      name: 'Lat Pulldown (Neutral Grip)',
      kind: 'machine',
      credits: {
        biceps: 0.5
      }
    }
  ],
  side_delts: [
    {
      name: 'Dumbbell Lateral Raise',
      kind: 'isolation'
    },
    {
      name: 'Cable Lateral Raise',
      kind: 'isolation'
    }
  ],
  rear_delts: [
    {
      name: 'Reverse Pec Deck',
      kind: 'isolation'
    },
    {
      name: 'Face Pull',
      kind: 'isolation'
    }
  ],
  biceps: [
    {
      name: 'EZ Bar Preacher Curl',
      kind: 'isolation'
    },
    {
      name: 'Barbell Curl',
      kind: 'isolation'
    }
  ],
  triceps: [
    {
      name: 'Cable Overhead Tricep Extension',
      kind: 'isolation'
    },
    {
      name: 'Tricep Pushdown (Rope)',
      kind: 'isolation'
    }
  ],
  quads: [
    {
      name: 'Barbell Back Squat',
      kind: 'heavy_compound',
      credits: {
        glutes: 0.5,
        adductors: 0.5
      }
    },
    {
      name: 'Leg Extension',
      kind: 'isolation'
    },
    {
      name: 'Leg Press',
      kind: 'machine',
      credits: {
        glutes: 0.5,
        adductors: 0.5
      }
    }
  ],
  hamstrings: [
    {
      name: 'Seated Leg Curl',
      kind: 'isolation'
    },
    {
      name: 'Romanian Deadlift (Barbell)',
      kind: 'heavy_compound',
      credits: {
        glutes: 0.5
      }
    }
  ],
  glutes: [
    {
      name: 'Barbell Hip Thrust',
      kind: 'heavy_compound',
      credits: {
        hamstrings: 0.5
      }
    },
    {
      name: 'Walking Lunge',
      kind: 'mod_compound',
      credits: {
        quads: 0.5
      }
    },
    {
      name: 'Bulgarian Split Squat',
      kind: 'mod_compound',
      credits: {
        quads: 0.5
      }
    },
  ],
  calves: [
    {
      name: 'Standing Calf Raise (Machine)',
      kind: 'isolation'
    },
    {
      name: 'Seated Calf Raise',
      kind: 'isolation'
    }
  ],
  abs: [
    {
      name: 'Cable Crunch',
      kind: 'isolation'
    },
    {
      name: 'Hanging Knee Raise',
      kind: 'isolation'
    }
  ]
};
