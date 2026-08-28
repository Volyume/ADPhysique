import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './safeRedirect';

describe('safeRedirectPath', () => {
  it.each([
    ['/dashboard', '/dashboard'],
    ['/progress/volume?week=1#chart', '/progress/volume?week=1#chart'],
    [null, '/dashboard'],
    ['https://evil.example', '/dashboard'],
    ['//evil.example/path', '/dashboard'],
    ['/\\evil.example', '/dashboard'],
    ['javascript:alert(1)', '/dashboard'],
    [`/${'a'.repeat(3000)}`, '/dashboard'],
  ])('maps %p to %p', (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });
});
