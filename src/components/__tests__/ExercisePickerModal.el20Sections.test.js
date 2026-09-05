/**
 * Exercise-library-expansion-2026-09-05 (EL-20, 05-DECISIONS.md EL-20):
 * pins the picker's search/empty-query wiring at the SOURCE level, same
 * style as ExercisePickerModal.firstOpenGate.test.js (fs.readFileSync +
 * regex, not a full RN render -- FlashList/expo/keyboard-controller are
 * heavy to mount and the actual ordering/ranking logic already has direct
 * unit coverage in exercisePickerSections.test.js and
 * exerciseFuzzySearch.test.js; this file only pins that the COMPONENT
 * actually wires them in, and cannot silently drift back to the old
 * "fuzzySearch(base, query, e => e.name)" call with no alias/tier options
 * or the old flat alphabetical empty-query list).
 */
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'ExercisePickerModal.js'), 'utf8');

describe('ExercisePickerModal — EL-20 search and empty-query sectioning', () => {
  test('imports the alias-aware search and the empty-query section builders', () => {
    expect(source).toMatch(/import \{ fuzzySearch, findCanonicalNameMatch \} from '\.\.\/lib\/exerciseFuzzySearch'/);
    expect(source).toMatch(/import \{ tierRank \} from '\.\.\/lib\/exercise\/canonicality'/);
    expect(source).toMatch(
      /import \{ buildRecentAndFrequentIds, buildEmptyQuerySections, flattenSectionsForList \} from '\.\.\/lib\/exercisePickerSections'/,
    );
  });

  test('a non-empty query search passes BOTH getAliases and getTier (aliases are searchable, staples outrank specialists)', () => {
    expect(source).toMatch(/fuzzySearch\(base, query, e => e\.name, \{\s*\n\s*getAliases: e => e\.aliases,\s*\n\s*getTier: e => tierRank\(e\.name\),\s*\n\s*\}\)/);
  });

  test('an empty query (add mode) builds sections rather than falling back to a flat alphabetical list', () => {
    expect(source).toMatch(/buildEmptyQuerySections\(\{ base, recentAndFrequentIds, planExercises \}\)/);
    expect(source).toMatch(/flattenSectionsForList\(sections\)/);
  });

  test('recent-and-frequent ids are built from BOTH getRecentlyUsedExerciseIds and getExerciseUsageStats', () => {
    expect(source).toMatch(/getRecentlyUsedExerciseIds, getExerciseUsageStats/);
    expect(source).toMatch(/getExerciseUsageStats\(userId\)\.then\(setUsageStats\)/);
    expect(source).toMatch(/buildRecentAndFrequentIds\(recentIds, usageStats\)/);
  });

  test('accepts an optional planExercises prop (EL-20: "the active plan\'s exercises, if the caller passes them")', () => {
    expect(source).toMatch(/planExercises,?\s*\n?\s*\}\)\s*\{/);
  });

  test('the FlashList renders a SectionLabel header for a __section marker, distinct from an exercise row', () => {
    expect(source).toMatch(/if \(item\.__section\) \{\s*\n\s*return \(\s*\n\s*<SectionLabel/);
    expect(source).toMatch(/getItemType=\{item => \(item\.__section \? 'sectionHeader' : 'row'\)\}/);
  });

  test('the base equipment/muscle/intent/capability filter is its own memo, independent of `query`', () => {
    // Perf (EL-20: "no work on every keystroke beyond the ranked filter"):
    // `base`'s useMemo dependency array must NOT include `query` -- typing
    // a character must never re-run the equipment/muscle/intent filter.
    const baseMemoMatch = source.match(/const base = useMemo\(\(\) => allExercises\.filter\([\s\S]*?\), \[([^\]]*)\]\);/);
    expect(baseMemoMatch).not.toBeNull();
    expect(baseMemoMatch[1]).not.toMatch(/\bquery\b/);
  });

  test('EL-18: the creation form offers "use it instead" for an existing canonical match', () => {
    expect(source).toMatch(/findCanonicalNameMatch\(createName, allExercises\)/);
    expect(source).toMatch(/Looks like <Text[\s\S]{0,120}>\{existingMatch\.name\}<\/Text> already exists\. Use it instead\?/);
    expect(source).toMatch(/function useExistingInstead\(\)/);
  });
});
