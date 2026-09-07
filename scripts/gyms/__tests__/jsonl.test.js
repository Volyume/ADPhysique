// GD-24: the canonical file, merge decisions and both review files are
// committed gzipped, read/written through node:zlib. Pins the gzip
// roundtrip and that a missing file reads back as [] like the plain form.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { writeJsonl, readJsonl, writeJsonlGz, readJsonlGz } = require('../lib/jsonl');

describe('jsonl gzip helpers', () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-jsonl-test-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('round-trips records through gzip identically to the plain form', () => {
    const records = [{ id: 'a', n: 1 }, { id: 'b', n: 2 }];
    const plainPath = path.join(dir, 'x.jsonl');
    const gzPath = path.join(dir, 'x.jsonl.gz');

    writeJsonl(plainPath, records);
    writeJsonlGz(gzPath, records);

    expect(readJsonl(plainPath)).toEqual(records);
    expect(readJsonlGz(gzPath)).toEqual(records);
  });

  it('a missing .jsonl.gz file reads back as an empty array', () => {
    expect(readJsonlGz(path.join(dir, 'missing.jsonl.gz'))).toEqual([]);
  });

  it('an empty record set still produces a valid (empty-body) gzip file', () => {
    const gzPath = path.join(dir, 'empty.jsonl.gz');
    writeJsonlGz(gzPath, []);
    expect(readJsonlGz(gzPath)).toEqual([]);
  });
});
