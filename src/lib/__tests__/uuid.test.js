import { generateUUID } from '../uuid';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generateUUID', () => {
  test('produces a v4-shaped id (version 4, variant 8-b)', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateUUID()).toMatch(V4);
    }
  });

  test('ids are unique across many calls', () => {
    const seen = new Set();
    for (let i = 0; i < 5000; i++) seen.add(generateUUID());
    expect(seen.size).toBe(5000);
  });

  test('a prefix char replaces the first character only, keeping the shape', () => {
    const id = generateUUID('q');
    expect(id[0]).toBe('q');
    expect(id).toHaveLength(36);
    // The rest after the prefix is still hex + the v4 dashes/markers.
    expect(id.slice(1)).toMatch(/^[0-9a-f]{7}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test('the q-prefixed queue id matches the format the inline copy produced', () => {
    // The old syncQueue uid() built 'qxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.
    expect(generateUUID('q')).toMatch(/^q[0-9a-f]{7}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
