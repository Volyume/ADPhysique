import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './safeRedirect';

describe('safeRedirectPath', () => {
  it.each([
    ['/dashboard', '/dashboard'],
    ['/progress/volume?week=1#chart', '/progress/volume?week=1#chart'],
    [null, '/dashboard'],
    ['https://evil.example', '/dashboard'],
    ['//evil.example/path', '/dashboard'],
    ['/%2f%2fevil.example/path', '/dashboard'],
    ['/%252f%252fevil.example/path', '/dashboard'],
    ['/\\evil.example', '/dashboard'],
    ['/safe%5cevil', '/dashboard'],
    ['/safe%0d%0aLocation:%20https://evil.example', '/dashboard'],
    ['/safe\u0000tail', '/dashboard'],
    ['/%zz', '/dashboard'],
    ['javascript:alert(1)', '/dashboard'],
    [`/${'a'.repeat(3000)}`, '/dashboard'],
  ])('maps %p to %p', (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });
});
