/**
 * phrase.js - the naming helper behind the natural coach-language order
 * (2026-08-21). What this suite pins and why: every surface that names
 * "the actual thing" leans on these fragments, so a phrase that reads
 * like an enum, a name invented for an unresolvable rule, or a subject
 * built from too many parts would put robotic or dishonest words in the
 * coach's mouth. The null contract IS the safety: callers fall back to
 * their generic wording, so null must arrive exactly when a short honest
 * name does not exist.
 */
import {
  demandPhrase, rulePhrase, subjectPhrase, draftSubjectPhrase,
} from '../phrase';
import { DEMAND_AXES, CONSTRAINT_RULE_KIND } from '../model';

describe('demand axes speak like a person, not like an enum', () => {
  it('every axis in the ontology has a lowercase sentence phrase with no underscores', () => {
    for (const axis of DEMAND_AXES) {
      const p = demandPhrase(axis.id);
      expect(typeof p).toBe('string');
      expect(p.length).toBeGreaterThan(3);
      expect(p).not.toMatch(/_/);
      expect(p).toBe(p.toLowerCase());
    }
  });

  it('the double-negative trap is out: the balance axis never reads "without balancing without support"', () => {
    expect(`training without ${demandPhrase('balance_high')}`)
      .not.toMatch(/without.*without/i);
  });
});

describe('rulePhrase names only what it honestly can', () => {
  it('demand and family rules name themselves', () => {
    expect(rulePhrase({ ruleKind: CONSTRAINT_RULE_KIND.DEMAND, ruleValue: 'overhead_position' }))
      .toBe('overhead work');
    expect(rulePhrase({ ruleKind: CONSTRAINT_RULE_KIND.FAMILY, ruleValue: 'overhead_press' }))
      .toBe('overhead pressing');
  });

  it('an exercise rule without a name resolver returns null, never an id', () => {
    expect(rulePhrase({ ruleKind: CONSTRAINT_RULE_KIND.EXERCISE, ruleValue: 'ex_123' })).toBeNull();
    expect(rulePhrase({ ruleKind: CONSTRAINT_RULE_KIND.EXERCISE, ruleValue: 'ex_123' },
      (id) => (id === 'ex_123' ? 'Bench Press' : null))).toBe('Bench Press');
  });
});

describe('subjectPhrase: the null contract', () => {
  const demand = (v) => ({ ruleKind: CONSTRAINT_RULE_KIND.DEMAND, ruleValue: v });

  it('one thing names itself; two join with "and"', () => {
    expect(subjectPhrase([demand('standing')])).toBe('standing work');
    expect(subjectPhrase([demand('standing'), demand('impact')]))
      .toBe('standing work and jumping and impact work');
  });

  it('duplicates collapse before counting', () => {
    expect(subjectPhrase([demand('standing'), demand('standing')])).toBe('standing work');
  });

  it('three distinct things, an unresolvable exercise, or an over-long join all return null', () => {
    expect(subjectPhrase([demand('standing'), demand('impact'), demand('grip_bar')])).toBeNull();
    expect(subjectPhrase([demand('standing'), { ruleKind: CONSTRAINT_RULE_KIND.EXERCISE, ruleValue: 'x' }])).toBeNull();
    const long = (id) => ({ ruleKind: CONSTRAINT_RULE_KIND.EXERCISE, ruleValue: id });
    expect(subjectPhrase(
      [long('a'), long('b')],
      { nameOf: (id) => (id === 'a' ? 'Single-Arm Landmine Press From Split Stance' : 'Bulgarian Split Squat With Front Rack Hold') },
    )).toBeNull();
    expect(subjectPhrase([])).toBeNull();
  });

  it('is deterministic for the same rules', () => {
    const rules = [demand('floor_access'), demand('axial_load')];
    expect(subjectPhrase(rules)).toBe(subjectPhrase(rules));
  });
});

describe('draftSubjectPhrase reads the add flow draft', () => {
  it('names axes, families and picked exercises from the draft itself', () => {
    expect(draftSubjectPhrase({ axes: ['overhead_position'], families: [], exercises: [] }))
      .toBe('overhead work');
    expect(draftSubjectPhrase({
      axes: [], families: [], exercises: [{ id: 'e1', name: 'Bench Press' }],
    })).toBe('Bench Press');
  });

  it('a draft with too many parts falls back to null like everything else', () => {
    expect(draftSubjectPhrase({
      axes: ['standing', 'impact'], families: ['overhead_press'], exercises: [],
    })).toBeNull();
  });
});
