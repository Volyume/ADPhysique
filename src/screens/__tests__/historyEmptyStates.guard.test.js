/**
 * Source guard: history/reflection empty states should use the shared
 * EmptyState component instead of local empty-card typography.
 */
const fs = require('fs');
const path = require('path');

const blockReflection = fs.readFileSync(path.join(__dirname, '..', 'BlockReflectionScreen.js'), 'utf8');
const coachHistory = fs.readFileSync(path.join(__dirname, '..', 'CoachHeldHistoryScreen.js'), 'utf8');

describe('history empty states', () => {
  test('BlockReflectionScreen uses shared EmptyState for the no-data state', () => {
    expect(blockReflection).toMatch(/import EmptyState from '\.\.\/components\/EmptyState';/);
    expect(blockReflection).toMatch(
      /<EmptyState[\s\S]*icon="calendar-outline"[\s\S]*title="No data found"[\s\S]*text="This block doesn't have any logged sessions yet\."[\s\S]*compact/,
    );
    expect(blockReflection).not.toMatch(/styles\.empty(?:Card|Title|Body)/);
  });

  test('CoachHeldHistoryScreen uses shared EmptyState for the no-history state', () => {
    expect(coachHistory).toMatch(/import EmptyState from '\.\.\/components\/EmptyState';/);
    expect(coachHistory).toMatch(
      /<EmptyState[\s\S]*icon="book-outline"[\s\S]*title="No entries yet"[\s\S]*text="After your first weekly check-in, decisions and holds will appear here\."[\s\S]*compact/,
    );
    expect(coachHistory).not.toMatch(/styles\.empty(?:Card|Title|Body)/);
  });
});
