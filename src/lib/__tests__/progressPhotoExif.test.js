/**
 * stripJpegExifBytes (safety-privacy-blueprint.md §6.2, wave 5) — the pure-JS
 * JPEG marker-segment strip that replaces a byte-for-byte copy on every
 * progress-photo save path. `progressPhotos.test.js` covers the wiring
 * (saveProgressPhoto calls this on write); this file pins the byte-level
 * behaviour in isolation: a GPS-tagged fixture in must come out with no APP1
 * (Exif/GPS) or COM segment, byte-identical everywhere else, and the walker
 * must never corrupt a file it can't confidently parse.
 */
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/doc/',
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
  getInfoAsync: jest.fn(async () => ({ exists: true })),
  makeDirectoryAsync: jest.fn(async () => {}),
  readDirectoryAsync: jest.fn(async () => []),
  readAsStringAsync: jest.fn(async () => ''),
  writeAsStringAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async () => {}),
  deleteAsync: jest.fn(async () => {}),
}));
jest.mock('progress-scan-image', () => ({ setExcludedFromBackup: jest.fn(async () => true) }));

import { stripJpegExifBytes, bytesToBase64, base64ToBytes } from '../progressPhotos';

function u8(...vals) { return Uint8Array.from(vals); }
function ascii(str) { return Array.from(str).map((c) => c.charCodeAt(0)); }
function concatBytes(arrays) {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const a of arrays) { out.set(a, pos); pos += a.length; }
  return out;
}
function segment(marker, payloadBytes) {
  const length = payloadBytes.length + 2;
  return concatBytes([u8(0xFF, marker, (length >> 8) & 0xff, length & 0xff), u8(...payloadBytes)]);
}
function bytesContainMarker(bytes, marker) {
  for (let i = 0; i < bytes.length - 1; i += 1) {
    if (bytes[i] === 0xFF && bytes[i + 1] === marker) return true;
  }
  return false;
}
function bytesToAscii(bytes) {
  return Array.from(bytes).map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
}

// Realistic-shaped fixture: SOI, APP0/JFIF, APP1/Exif carrying a fake TIFF
// header + a recognisable "GPS tag" marker string (standing in for the real
// GPS IFD bytes a camera/picker would embed), a second APP1 (some devices
// emit a separate XMP-in-APP1 block after the Exif one), a COM comment,
// SOF0, DHT, SOS header + entropy data (including a stuffed 0xFF 0x00 pair,
// which must survive untouched), EOI.
function buildGpsTaggedFixture() {
  const exifApp1 = ascii('Exif\0\0MM\0*\0GPS_TAG_IFD_LAT_51.507_LON_-0.128');
  const xmpApp1 = ascii('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>device-serial-XYZ</x:xmpmeta>');
  const jfif = ascii('JFIF\x01\x02');
  const comment = ascii('Camera Software v3.2, MakerNote redacted');
  const sof0 = ascii('SOF0-stub');
  const dht = ascii('DHT-stub');
  const sosHeader = ascii('SS');
  const entropy = [0x9A, 0xFF, 0x00, 0x1B, 0x2C, 0xFF, 0x00, 0x3D];

  return concatBytes([
    u8(0xFF, 0xD8),
    segment(0xE0, jfif),
    segment(0xE1, exifApp1),
    segment(0xE1, xmpApp1),
    segment(0xFE, comment),
    segment(0xC4, dht),
    segment(0xC0, sof0),
    segment(0xDA, sosHeader),
    u8(...entropy),
    u8(0xFF, 0xD9),
  ]);
}

describe('stripJpegExifBytes', () => {
  test('a GPS-tagged fixture comes out with no APP1 (Exif/GPS) segment', () => {
    const fixture = buildGpsTaggedFixture();
    const out = stripJpegExifBytes(fixture);

    expect(bytesContainMarker(out, 0xE1)).toBe(false);
    expect(bytesToAscii(out)).not.toMatch(/GPS_TAG_IFD_LAT/);
    expect(bytesToAscii(out)).not.toMatch(/xap\/1\.0/);
  });

  test('also strips the COM (free-text comment) segment', () => {
    const out = stripJpegExifBytes(buildGpsTaggedFixture());
    expect(bytesContainMarker(out, 0xFE)).toBe(false);
    expect(bytesToAscii(out)).not.toMatch(/Camera Software/);
  });

  test('preserves colour/decode-relevant segments and the JFIF marker byte-for-byte', () => {
    const out = stripJpegExifBytes(buildGpsTaggedFixture());
    expect(bytesContainMarker(out, 0xE0)).toBe(true); // APP0/JFIF kept
    expect(bytesContainMarker(out, 0xC4)).toBe(true); // DHT kept
    expect(bytesContainMarker(out, 0xC0)).toBe(true); // SOF0 kept
    expect(bytesToAscii(out)).toMatch(/JFIF/);
  });

  test('the entropy-coded scan data (including stuffed FF 00) and EOI survive untouched', () => {
    const fixture = buildGpsTaggedFixture();
    const out = stripJpegExifBytes(fixture);
    // Last 10 bytes of the fixture are the SOS header (4) + entropy (8) minus overlap;
    // simplest robust check: the exact trailing entropy+EOI byte sequence appears intact.
    const tail = [0x9A, 0xFF, 0x00, 0x1B, 0x2C, 0xFF, 0x00, 0x3D, 0xFF, 0xD9];
    const outTail = Array.from(out.slice(out.length - tail.length));
    expect(outTail).toEqual(tail);
  });

  test('output is strictly shorter than the input by exactly the size of the dropped segments', () => {
    const fixture = buildGpsTaggedFixture();
    const out = stripJpegExifBytes(fixture);
    // 2 APP1 segments + 1 COM segment were dropped; every other byte is kept.
    const exifApp1Len = ascii('Exif\0\0MM\0*\0GPS_TAG_IFD_LAT_51.507_LON_-0.128').length + 4;
    const xmpApp1Len = ascii('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>device-serial-XYZ</x:xmpmeta>').length + 4;
    const comLen = ascii('Camera Software v3.2, MakerNote redacted').length + 4;
    expect(fixture.length - out.length).toBe(exifApp1Len + xmpApp1Len + comLen);
  });

  test('a byte sequence without a JPEG SOI is returned unchanged (never touches non-JPEG data)', () => {
    const notAJpeg = u8(0x89, 0x50, 0x4E, 0x47, 0x00, 0x01, 0x02); // PNG-ish magic
    expect(stripJpegExifBytes(notAJpeg)).toEqual(notAJpeg);
  });

  test('empty / too-short input is returned unchanged rather than throwing', () => {
    expect(stripJpegExifBytes(u8())).toEqual(u8());
    expect(stripJpegExifBytes(u8(0xFF, 0xD8))).toEqual(u8(0xFF, 0xD8));
  });

  test('a truncated marker length falls back to the ORIGINAL bytes, never corrupts', () => {
    // A well-formed SOI + APP1 marker claiming a length that runs past the
    // buffer end (malformed/truncated file) must not produce a mangled output.
    const malformed = concatBytes([
      u8(0xFF, 0xD8),
      u8(0xFF, 0xE1, 0x00, 0xFF), // claims 253 bytes of payload that don't exist
      u8(0x01, 0x02, 0x03),
    ]);
    expect(stripJpegExifBytes(malformed)).toEqual(malformed);
  });

  test('an unexpected byte where a marker was expected falls back safely', () => {
    const malformed = concatBytes([u8(0xFF, 0xD8), u8(0x12, 0x34, 0x56)]);
    expect(stripJpegExifBytes(malformed)).toEqual(malformed);
  });

  test('accepts a plain array-like as well as a Uint8Array', () => {
    const fixture = Array.from(buildGpsTaggedFixture());
    const out = stripJpegExifBytes(fixture);
    expect(bytesContainMarker(out, 0xE1)).toBe(false);
  });
});

describe('bytesToBase64 / base64ToBytes round trip (no Buffer in RN; house pattern)', () => {
  test('round-trips arbitrary bytes, including 0x00 and 0xFF', () => {
    const bytes = u8(0, 1, 2, 254, 255, 128, 127, 10, 13, 65, 90);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  test('round-trips a realistic-sized fixture unchanged', () => {
    const fixture = buildGpsTaggedFixture();
    expect(base64ToBytes(bytesToBase64(fixture))).toEqual(fixture);
  });

  test('round-trips lengths that are not a multiple of 3 (padding edge cases)', () => {
    for (const len of [0, 1, 2, 3, 4, 5, 31]) {
      const bytes = u8(...Array.from({ length: len }, (_, i) => (i * 7) % 256));
      expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
    }
  });
});
