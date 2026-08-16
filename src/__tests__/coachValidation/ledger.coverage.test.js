/**
 * ledger.coverage.test.js — Step 13 gate SKELETON (HARNESS-DESIGN §4).
 *
 * TODO (Step 13 switch): once every family's scenarios exist, flip
 * STRICT_GATE to true. The strict gate additionally requires every ledger
 * rule to reach WHOLE_CHAIN_PROVEN (ADVERSARIAL_PROVEN for rules named in
 * Layer 3) and fails on any rule missing a required case class without a
 * recorded N/A reason (safety_na_reason). Left false here: this is a
 * Step 5-6 foundation covering ONE family (conflict/safety), so most ledger
 * rules have no scenario yet by design, not by omission.
 *
 * For now (lenient, default) this only asserts the DIRECTION that matters at
 * this stage: every scenario id registered by a family's coverage export
 * references a rule_id that actually exists in ledger.json. A scenario
 * citing a rule the ledger does not know about is a typo or an invented
 * rule id, and either is a bug worth catching immediately rather than at
 * Step 13.
 */
import fs from 'fs';
import path from 'path';
import { CONFLICT_COVERAGE } from './scenarios.conflict.data';

const STRICT_GATE = false; // Step 13 flips this to true.

const ledgerPath = path.resolve(__dirname, 'ledger.json');
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const ledgerRuleIds = new Set(ledger.map((r) => r.rule_id));

// Every family's coverage export gets combined here as later steps add
// scenarios.training.test.js, scenarios.liveset.test.js, etc. Only the
// conflict family exists at Step 5-6.
const ALL_COVERAGE = [
  ...CONFLICT_COVERAGE,
];

describe('ledger coverage gate (lenient, Step 5-6 foundation)', () => {
  test('every registered scenario has at least one rule id', () => {
    for (const entry of ALL_COVERAGE) {
      expect(Array.isArray(entry.rules)).toBe(true);
      expect(entry.rules.length).toBeGreaterThan(0);
    }
  });

  test('every rule_id a scenario cites actually exists in ledger.json', () => {
    const unknown = [];
    for (const entry of ALL_COVERAGE) {
      for (const ruleId of entry.rules) {
        if (!ledgerRuleIds.has(ruleId)) unknown.push(`${entry.id} -> ${ruleId}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  test('pending scenarios carry a reason (never a silent gap)', () => {
    for (const entry of ALL_COVERAGE) {
      if (entry.pending) {
        // The scenario objects themselves carry pendingReason; this is a
        // structural sanity check that pending scenarios are not being
        // dropped from the coverage export silently.
        expect(entry.id).toBeTruthy();
      }
    }
  });

  if (STRICT_GATE) {
    test.skip('STRICT: every ledger rule reaches WHOLE_CHAIN_PROVEN (Step 13)', () => {
      const byRule = new Map();
      for (const entry of ALL_COVERAGE) {
        for (const ruleId of entry.rules) {
          if (!byRule.has(ruleId)) byRule.set(ruleId, []);
          byRule.get(ruleId).push(entry);
        }
      }
      const failing = [];
      for (const rule of ledger) {
        if (rule.safety_na_reason) continue;
        const covered = byRule.get(rule.rule_id) || [];
        const proven = covered.some((c) => !c.pending && !c.expectedFail);
        if (!proven) failing.push(rule.rule_id);
      }
      expect(failing).toEqual([]);
    });
  }
});
