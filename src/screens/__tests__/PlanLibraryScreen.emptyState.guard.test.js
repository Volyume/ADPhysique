const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'PlanLibraryScreen.js'), 'utf8');

describe('PlanLibraryScreen shared empty states', () => {
  test('uses EmptyState for load failure and genuine no-results states', () => {
    expect(source).toMatch(/import EmptyState from '\.\.\/components\/EmptyState';/);
    expect(source).toMatch(
      /<EmptyState[\s\S]*icon="cloud-offline-outline"[\s\S]*title="Couldn't load plans"[\s\S]*text="Something went wrong loading the plan library\."[\s\S]*actionLabel="Try again"[\s\S]*onAction=\{handleRetry\}/,
    );
    expect(source).toMatch(
      /<EmptyState[\s\S]*icon="library-outline"[\s\S]*title="No plans found"[\s\S]*text=\{queryLower[\s\S]*Try a different search term\.[\s\S]*No plans match this filter yet\./,
    );
    expect(source).not.toMatch(/styles\.empty(?:Title|Text)?/);
  });

  test('keeps search and category chips in one compact filter band', () => {
    expect(source).toMatch(/<View style=\{styles\.filterPanel\}>[\s\S]*<SearchBar[\s\S]*<FlatList/);
    expect(source).toMatch(/filterPanel: \{[\s\S]*backgroundColor: colors\.surface[\s\S]*borderBottomColor: colors\.borderSubtle/);
    expect(source).toMatch(/chipsList: \{ maxHeight: 38, flexShrink: 0 \}/);
    expect(source).not.toMatch(/chipsList: \{ height: 52/);
  });

  test('the plan list sits on a surface band instead of leaving a raw black void', () => {
    expect(source).toMatch(/<View style=\{styles\.listBand\}>[\s\S]*<FlashList/);
    expect(source).toMatch(/listBand: \{ flex: 1, backgroundColor: colors\.surface \}/);
  });
});
