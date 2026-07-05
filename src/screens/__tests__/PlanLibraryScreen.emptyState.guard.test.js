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
});
