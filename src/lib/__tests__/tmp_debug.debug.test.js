const { assessDurationOptions, PLAN_FIT } = require('../planFit');
const { generatePlan } = require('../planEngine');
const { LIBRARY, inputs } = require('./campaign16.helpers.js');
const generate = (i) => generatePlan({ ...i, exerciseLibrary: LIBRARY });

test('debug labels', () => {
  for (const over of [{}, { goal: 'bikini' }, { goal: 'wellness' }, { goal: 'figure' }, { goal: 'classic_physique' }, { goal: 'mens_physique' }, { experience: 'beginner' }, { daysPerWeek: 5 }, { daysPerWeek: 3 }]) {
    const d = assessDurationOptions({ inputs: inputs({ daysPerWeek: 4, sessionLengthMinutes: 60, ...over }), generate }).find(x => x.minutes === 60);
    console.log(JSON.stringify(over), d.state, d.label);
  }
});
