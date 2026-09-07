/**
 * TrainingProfileLine (spec 1.3: the age band joins the preview line when
 * the card carries one, exactly as `CommunityTrainingProfileScreen`'s own
 * preview does -- one function, `previewLine`, builds both).
 */

jest.mock('../../../lib/community', () => {
  const actual = jest.requireActual('../../../lib/community');
  return { ...actual, previewLine: jest.fn(actual.previewLine) };
});

const { previewLine } = require('../../../lib/community');
const { trainingProfileLine } = require('../TrainingProfileLine');

beforeEach(() => { previewLine.mockClear(); });

describe('trainingProfileLine', () => {
  test('no card: empty string, previewLine never called', () => {
    expect(trainingProfileLine(null)).toBe('');
    expect(previewLine).not.toHaveBeenCalled();
  });

  test('a card with an age band: the label joins the line', () => {
    const line = trainingProfileLine({
      tp_experience_band: 'intermediate', age_band: '25_34',
    });
    expect(line).toContain('Intermediate');
    expect(line).toContain('25 to 34');
  });

  test('tp_age_band is read for a card shaped before the age_band key existed', () => {
    const line = trainingProfileLine({ tp_experience_band: 'new', tp_age_band: '18_24' });
    expect(line).toContain('18 to 24');
  });

  test('age_band wins over tp_age_band when a card somehow carries both', () => {
    const line = trainingProfileLine({ age_band: '18_24', tp_age_band: '55_plus' });
    expect(line).toContain('18 to 24');
    expect(line).not.toContain('55 or over');
  });

  test('no age band on the card: the line is unaffected, not "· "', () => {
    const line = trainingProfileLine({ tp_experience_band: 'experienced' });
    expect(line).toBe('Experienced');
  });
});
