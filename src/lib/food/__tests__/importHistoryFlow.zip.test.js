/**
 * importHistoryFlow.zip.test.js
 *
 * Wave 4 hostile review of the food level-up (2026-10-16), item 10b.
 * MyFitnessPal emails its export as a zip of three CSVs. A zip is not a file
 * the import can read, and before this a zip that reached the reader (a file
 * provider labelling it as text) was read as text and met "That file does not
 * look like a MyFitnessPal or Cronometer export", which never said to unzip
 * it. pickHistoryFile now knows a zip by its name, its type or its first bytes
 * ("PK", 3, 4) and refuses it with one calm sentence naming the file inside to
 * choose. Each pin fails on the code before the fix. A real CSV still reads.
 */
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, size: 100 })),
  readAsStringAsync: jest.fn(),
  EncodingType: { UTF8: 'utf8' },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(() => Promise.resolve(null)) }));
jest.mock('../db', () => ({}));

const DocumentPicker = require('expo-document-picker');
const FileSystem = require('expo-file-system/legacy');
const flow = require('../importHistoryFlow');

const ZIP = 'That is a zip file. Unzip it first, then choose the file starting Nutrition-Summary.';
const picked = (asset) => ({ canceled: false, assets: [{ uri: 'file:///picked', size: 100, ...asset }] });

beforeEach(() => jest.clearAllMocks());

describe('a picked zip is refused with one calm sentence', () => {
  test('the sentence', () => {
    expect(flow.ZIP_PICKED).toBe(ZIP);
  });

  test('by its name, before it is read', async () => {
    DocumentPicker.getDocumentAsync.mockResolvedValueOnce(picked({ name: 'File-Export-2025-03-03-to-2026-10-14.ZIP', mimeType: 'text/plain' }));
    await expect(flow.pickHistoryFile()).rejects.toMatchObject({ code: 'zip', sentence: ZIP });
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
  });

  test('by its type, before it is read', async () => {
    DocumentPicker.getDocumentAsync.mockResolvedValueOnce(picked({ name: 'export', mimeType: 'application/zip' }));
    await expect(flow.pickHistoryFile()).rejects.toMatchObject({ code: 'zip', sentence: ZIP });
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
  });

  test('by its first bytes, when a provider labels it as text', async () => {
    DocumentPicker.getDocumentAsync.mockResolvedValueOnce(picked({ name: 'export.csv', mimeType: 'text/csv' }));
    FileSystem.readAsStringAsync.mockResolvedValueOnce('PK\u0003\u0004\u0014\u0000\u0008\u0000garbage');
    await expect(flow.pickHistoryFile()).rejects.toMatchObject({ code: 'zip', sentence: ZIP });
  });

  test('a real CSV, even one whose text mentions a zip, still reads', async () => {
    const csv = 'Date,Meal,Calories\n2026-10-01,Breakfast,400\n';
    DocumentPicker.getDocumentAsync.mockResolvedValueOnce(picked({ name: 'Nutrition-Summary-2025-03-03-to-2026-10-14.csv', mimeType: 'text/csv' }));
    FileSystem.readAsStringAsync.mockResolvedValueOnce(csv);
    await expect(flow.pickHistoryFile()).resolves.toEqual({ text: csv });
    expect(flow.looksLikeZip({ name: 'notes about a zip.csv', text: 'PK is not at the start' })).toBe(false);
  });
});
