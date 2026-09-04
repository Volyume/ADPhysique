/**
 * campaign2.comprehension.test.js — Campaign 2 (comprehension,
 * explanation, terminology; D93) pins.
 *
 * Pins the founder's Phase 20 minimum list: the truths that make the
 * product understandable stay true. Mixed style, matching the repo
 * convention: real-module assertions where the copy is exported,
 * source-level regex guards (fs.readFileSync) where it is inline JSX.
 * Every pin is a comprehension contract, not a wording snapshot: it
 * asserts MEANING-bearing fragments, so a rewording that keeps the
 * meaning re-anchors one line, while a change that loses the meaning
 * fails loudly.
 */
import fs from 'fs';
import path from 'path';
import { GLOSSARY } from '../lib/coachGlossary';
import { checkJargon } from '../lib/whyThisTemplates';
import { buildBlockStartLines } from '../lib/blockExplain';

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
// Copy pins must not trip on code comments that DISCUSS the rule (e.g. the
// header note "no 1,200/1,500 numbers" or a D93 rationale naming the old
// label). Strip whole-line // comments and /* */ blocks before matching.
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('TRAINING comprehension', () => {
  test('the block sheet teaches the mental model: definition, climb why, next-block learning', () => {
    const src = read('components/HomeBlockShapeSheet.js');
    expect(src).toContain('GLOSSARY.mesocycle');
    expect(src).toMatch(/Effort builds a little each week so your body keeps adapting/);
    expect(src).toMatch(/How each muscle responds can shape where your next block starts/);
  });

  test('peak week explains expected fatigue without pretending recovery is excellent', () => {
    const src = read('lib/weeklyCoach.js');
    expect(src).toMatch(/Peak-week fatigue is part of the plan, not a warning/);
  });

  test('the recovery week says it is lighter ON PURPOSE and the gloss carries the why', () => {
    expect(read('components/BlockShapeCard.js')).toMatch(/lighter on purpose/i);
    expect(GLOSSARY.deload).toMatch(/lighter planned week so you recover/i);
  });

  test('Repeat and Continue with adjustments are unmistakably different, and neither is framed as the wrong one', () => {
    // Re-anchored under FQ-2 (D96, founder ruling 2026-08-10), same meaning.
    // The two options are now a CONSTANT of the decision surface
    // (NEXT_BLOCK_OPTION_LABELS) instead of one CTA owned by whichever
    // branch the advisor picked, so the pinned RULE moved with them: the
    // choices stay unmistakably different and each states its true
    // behaviour. D93's button-honesty precedent is intact -- the repeat
    // label still says the plan runs again unchanged. What is deliberately
    // gone is 'Repeat this plan anyway': with both options offered as
    // equals, no option has to be framed as going against advice (FB-33).
    const src = read('lib/blockAdvisor.js');
    expect(src).toContain("repeat: 'Run this plan again, unchanged'");
    expect(src).toContain("adjust: 'Continue with adjustments'");
    const stripped = stripComments(src);
    // No branch may present the repeat as a plain "continue", and no branch
    // owns a CTA at all any more.
    expect(stripped).not.toContain("actionLabel: 'Continue this plan'");
    expect(stripped).not.toMatch(/actionLabel:/);
    expect(stripped).not.toContain('anyway');
    // The fresh-look recommendation keeps its own suggestion as the
    // secondary action, and marks NEITHER option as recommended.
    const rebuildBlock = stripped.slice(stripped.indexOf('consider_rebuild'));
    // Re-anchored (D139, programme creation masterpass, 2026-09-03): the
    // block-boundary secondaries ("Build a new plan", "Review with coach")
    // named one destination two ways; both now say what they do
    // ("Adjust training" is PlanUpdate's own header).
    expect(rebuildBlock).toContain("secondaryLabel: 'Change my training setup'");
  });

  test('a retained dose never reads as an increase; an increase names its evidence', () => {
    const src = read('lib/interBlock.js');
    expect(src).toMatch(/responded well at this dose/);
    expect(src).toMatch(/carries over unchanged/);
    expect(src).toMatch(/kept progressing in the higher-volume weeks with recovery to spare/);
  });

  test('insufficient data never claims learning; the research start claims research-based guidance only', () => {
    const src = read('lib/interBlock.js');
    expect(src).toMatch(/too little to judge the response/);
    expect(src).toMatch(/too rarely this block to judge/);
    const [line] = buildBlockStartLines({
      summary: { chest: { week1: 10, peak: 14, peakWeek: 4, deload: 6, source: 'template' } },
    });
    expect(line).toContain('Not enough personal history yet');
    expect(line).not.toMatch(/last block|past blocks|learned/);
  });

  test('a manual setting is identified as the user\'s own', () => {
    const src = read('lib/blockExplain.js');
    expect(src).toContain("seed_manual: 'your own setting'");
    expect(read('lib/interBlock.js')).toMatch(/Your manual volume settings stay as they are; this is a note, not a change/);
  });

  test('every glossary entry passes the jargon blocklist (deload and tonnage included)', () => {
    for (const [key, text] of Object.entries(GLOSSARY)) {
      const verdict = checkJargon(text);
      expect({ key, clean: verdict.clean }).toEqual({ key, clean: true });
    }
  });
});

describe('EFFORT comprehension', () => {
  test('the reps-short instruction is explained in the founder\'s register, without failure worship', () => {
    expect(GLOSSARY.rir).toMatch(/finish the set when you believe you could still do about 2 good reps/);
    expect(GLOSSARY.rir).toMatch(/never depends on taking every set to failure/);
  });

  test('the working-sets count is by set type, never by how the set felt', () => {
    const src = read('screens/WorkoutSummaryScreen.js');
    expect(src).toMatch(/Warm-ups are left out; every other logged set counts, however it felt/);
    expect(src).not.toMatch(/is what makes a working set effective/);
  });
});

describe('PR comprehension', () => {
  test('PR has one reachable definition and it covers all three record kinds', () => {
    expect(GLOSSARY.pr).toMatch(/personal record/i);
    expect(GLOSSARY.pr).toMatch(/heaviest weight/);
    expect(GLOSSARY.pr).toMatch(/most reps/);
    expect(GLOSSARY.pr).toMatch(/estimated max/);
    expect(GLOSSARY.pr).toMatch(/never needs a one-rep max attempt/);
    expect(read('screens/ExerciseDetailScreen.js')).toContain('GLOSSARY.pr');
    // Re-anchored under FB-16 (D96): BlockReflection's list is no longer
    // presented as records. Its rows are the best estimated max per
    // exercise WITHIN the block -- never compared against a prior block or
    // any record store -- so glossing them with the PR definition ("the
    // clearest sign your training is working") taught the wrong meaning,
    // and on a first block every row is a first-ever performance. The rows
    // are unchanged; they now carry the definition of what they are.
    const reflection = read('screens/BlockReflectionScreen.js');
    expect(reflection).toContain('GLOSSARY.estMax');
    expect(reflection).not.toContain('Records set this block');
  });

  test('the record-type labels are canonical everywhere: Est. max / Heaviest weight / Most reps', () => {
    for (const p of ['screens/ExerciseDetailScreen.js', 'screens/BlockReflectionScreen.js', 'screens/LiftProgressScreen.js']) {
      const src = read(p);
      expect(src).not.toContain("'Est. 1RM'");
      expect(src).not.toContain("'Heaviest set'");
      expect(src).not.toContain("label: 'Best set'");
    }
  });
});

describe('READINESS comprehension', () => {
  test('both subjective-input surfaces state their purpose', () => {
    // C10C sharpened the PRE-SESSION line: it now names the direction of
    // effect, which was the part a user needed in order to answer
    // honestly. Both surfaces still say what the answers are for, and both
    // still keep the "when coaching is active" truthfulness caveat.
    expect(read('screens/HomeScreen.js')).toMatch(/When coaching is active, poor sleep or heavy soreness can ease today's session/);
    expect(read('screens/WorkoutSummaryScreen.js')).toMatch(/when coaching is active, whether next session's workload still makes sense/);
  });

  test('the purpose lines never teach direction (no set-count rewards revealed)', () => {
    // "Direction" here means the MECHANICS a user could game - set counts
    // and loads - never the honest statement that poor recovery can ease a
    // session. C10C requires that statement; this still forbids the
    // mechanics, on both surfaces.
    const home = read('screens/HomeScreen.js').match(/Takes a second\.[^<]*/)[0];
    const summary = read('screens/WorkoutSummaryScreen.js').match(/Your answers shape how your recovery[^<]*/)[0];
    for (const s of [home, summary]) {
      expect(s).not.toMatch(/fewer sets|more sets|adds? a set|extra set/i);
    }
    // And the pre-session line must never imply good answers earn more.
    expect(home).toMatch(/never makes it harder than planned/);
  });
});

describe('NUTRITION comprehension', () => {
  test('the data hold demands distinct mornings, matching the engine\'s count', () => {
    expect(read('lib/weeklyCoach.js')).toMatch(/Need morning weights from at least 3 different days/);
    expect(read('lib/coachLedger.js')).toMatch(/mornings with a weigh-in in the last 7 days/);
  });

  test('the displayed trend never claims to be the decision metric', () => {
    // D93 required the scale chip to disclose that the decision used a
    // different number. C10F went further and SHOWS that number, so the
    // requirement is now met by a labelled "Coaching trend" chip beside
    // it rather than by a disclaimer alone. Both halves are pinned: the
    // scale chip says what it is, and the decision rate is on screen.
    const src = read('screens/CoachOutputScreen.js');
    expect(src).toMatch(/This is the scale reading\./);
    expect(src).toMatch(/label="Coaching trend"/);
    expect(src).toMatch(/value=\{trend\.coachingRateLabel\}/);
  });

  test('Methodology never publishes the absolute calorie floors', () => {
    const src = stripComments(read('screens/MethodologyScreen.js'));
    expect(src).not.toMatch(/\b1[,.]?[25]00\b/);
    expect(src).toMatch(/fixed minimum[\s\S]{0,20}below which Precision Coaching never suggests cutting/);
  });
});

describe('RECOVERY comprehension', () => {
  test('Methodology states both recovery-week sizing states and the proposal-only rule', () => {
    const src = read('screens/MethodologyScreen.js');
    expect(src).toMatch(/scaled from[\s\S]{0,80}the work it actually completed/);
    expect(src).toMatch(/simpler protective week/);
    expect(src).toMatch(/only ever proposed, never started for you/);
  });
});

describe('AUTOMATION comprehension', () => {
  test('Coached mode discloses that safety waits for confirmation (D16 made user-visible)', () => {
    expect(read('screens/SettingsCoachingScreen.js'))
      .toMatch(/Anything safety-related still waits for your confirmation/);
  });

  test('holds are stated as the coach WORKING, not asleep (not-changing is a decision)', () => {
    expect(read('screens/MethodologyScreen.js')).toMatch(/A held week is Precision Coaching working, not asleep/);
  });
});
