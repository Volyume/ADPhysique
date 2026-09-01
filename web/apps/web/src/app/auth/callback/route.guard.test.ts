import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('auth callback redirect parameter ambiguity', () => {
  it('requires one code and refuses duplicate next parameters', () => {
    const source = fs.readFileSync(new URL('./route.ts', import.meta.url), 'utf8');
    expect(source).toContain("searchParams.getAll('code')");
    expect(source).toContain("searchParams.getAll('next')");
    expect(source).toMatch(/codes\.length === 1/);
    expect(source).toMatch(/nextValues\.length <= 1/);
  });
});
