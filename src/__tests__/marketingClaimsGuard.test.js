/**
 * CC32 — the marketing claims guard, tied to real readiness
 * (CLAIMS-STANDARDS section 9A).
 *
 * Mechanical enforcement:
 * - R2 wording blacklist (medical-purpose terms) must not appear in
 *   marketing copy (store listings, product facts) except on exempt lines
 *   (platform metadata, "not medical" disclaimers).
 * - POPULATION_CLAIM_TERMS (disability/support population language) banned
 *   in marketing surfaces while the readiness matrix is all-NO.
 * - MARKETING-READINESS-MATRIX.md: every row's final cell must read NO while
 *   the campaign is not cleared (the guard exists so the two never drift
 *   silently when a row turns YES).
 * - CLAIMS-STANDARDS.md must contain the governing section 9A.
 */

import fs from 'fs';
import path from 'path';
import { R2_BLACKLIST, POPULATION_CLAIM_TERMS, isExemptMarketingLine } from '../lib/observability/r2Wording';

const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', '..', p), 'utf8');

describe('marketing claims guard (CC32)', () => {
  test('PLAY_STORE_LISTING.md carries no R2-blacklisted or population-claim terms in marketing copy', () => {
    const src = read('docs/PLAY_STORE_LISTING.md');
    const lines = src.split('\n');
    const violations = [];
    for (const line of lines) {
      if (isExemptMarketingLine(line)) continue;
      for (const re of R2_BLACKLIST) {
        if (re.test(line)) violations.push(line.trim());
      }
      for (const re of POPULATION_CLAIM_TERMS) {
        if (re.test(line)) violations.push(line.trim());
      }
    }
    expect(violations).toEqual([]);
  });

  test('APP_STORE_CONNECT_LISTING.md carries no R2-blacklisted or population-claim terms in marketing copy', () => {
    const src = read('docs/APP_STORE_CONNECT_LISTING.md');
    const lines = src.split('\n');
    const violations = [];
    for (const line of lines) {
      if (isExemptMarketingLine(line)) continue;
      for (const re of R2_BLACKLIST) {
        if (re.test(line)) violations.push(line.trim());
      }
      for (const re of POPULATION_CLAIM_TERMS) {
        if (re.test(line)) violations.push(line.trim());
      }
    }
    expect(violations).toEqual([]);
  });

  test('marketing/hq/PRODUCT-FACTS.md carries no R2-blacklisted or population-claim terms in marketing copy', () => {
    const src = read('marketing/hq/PRODUCT-FACTS.md');
    const lines = src.split('\n');
    const violations = [];
    for (const line of lines) {
      if (isExemptMarketingLine(line)) continue;
      for (const re of R2_BLACKLIST) {
        if (re.test(line)) violations.push(line.trim());
      }
      for (const re of POPULATION_CLAIM_TERMS) {
        if (re.test(line)) violations.push(line.trim());
      }
    }
    expect(violations).toEqual([]);
  });

  test('MARKETING-READINESS-MATRIX.md: every row final cell reads NO', () => {
    const src = read('docs/capability-campaign-25-2026-08-20/MARKETING-READINESS-MATRIX.md');
    const lines = src.split('\n');
    // Extract table rows (lines starting with '| ').
    const tableRows = lines.filter(l => /^\s*\|/.test(l));
    // Markdown table header separator starts with '|---|'
    const sepIndex = tableRows.findIndex(l => /^\s*\|[\s-|]+\|/.test(l));
    if (sepIndex < 0) throw new Error('No table separator found in MARKETING-READINESS-MATRIX.md');
    const dataRows = tableRows.slice(sepIndex + 1);

    const violations = [];
    for (const row of dataRows) {
      const cells = row.split('|').map(c => c.trim()).filter(c => c);
      // The final cell should be the MARKETING READY column (8th column, index 7).
      if (cells.length >= 8) {
        const finalCell = cells[7];
        // Should contain 'NO', not 'YES'.
        if (/\*?\*?YES\*?\*?/.test(finalCell)) {
          violations.push(row.trim());
        }
      }
    }
    // When a row legitimately turns YES, this test is updated IN THE SAME
    // commit as the matrix — the guard exists so the two never drift silently.
    expect(violations).toEqual([]);
  });

  test('CLAIMS-STANDARDS.md contains section 9A (Capability and disability claims)', () => {
    const src = read('marketing/hq/CLAIMS-STANDARDS.md');
    const hasSectionNineA = /^##\s+9A\.\s+Capability and disability claims/m.test(src);
    expect(hasSectionNineA).toBe(true);
  });
});
