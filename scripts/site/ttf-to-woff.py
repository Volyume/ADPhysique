#!/usr/bin/env python3
"""
scripts/site/ttf-to-woff.py: wrap TrueType fonts as WOFF 1.0.

The site serves Inter and Inter Display from /assets/fonts/. A .ttf is the
font as the app ships it; a .woff is the same tables, each one deflated, so it
is roughly half the size and loads faster on a phone. tokens.css lists the
.woff first and the .ttf as the fallback (scripts/site/build.mjs writes it).

Usage:
  python3 scripts/site/ttf-to-woff.py FONT.ttf [FONT.ttf ...]
      writes FONT.woff beside each input and prints the bytes saved
  python3 scripts/site/ttf-to-woff.py --out-dir DIR FONT.ttf [...]
      writes the .woff files into DIR instead

Python standard library only (struct and zlib). No dependency to install.

The format is WOFF 1.0, https://www.w3.org/TR/WOFF/ :
  header   44 bytes: 'wOFF', the font's own version tag (flavor), the file
           length, the table count, a reserved zero, the size the font would
           have unpacked, a WOFF version (1.0), and the metadata and private
           block offsets and lengths (both unused here: zero).
  table directory   20 bytes per table, sorted by tag: tag, offset, compressed
           length, original length, original checksum.
  tables   each deflated with zlib when that is smaller (stored as it is
           when deflating does not help), each starting on a 4-byte boundary.
The glyph data, hinting and checksums are copied byte for byte; nothing is
re-drawn, subset or re-hinted, so the .woff renders exactly as the .ttf.
Fonts that are TrueType collections (.ttc) are refused.
"""
import os
import struct
import sys
import zlib

SFNT_HEADER = struct.Struct('>4sHHHH')       # flavor, numTables, searchRange, entrySelector, rangeShift
SFNT_ENTRY = struct.Struct('>4sIII')         # tag, checksum, offset, length
WOFF_HEADER = struct.Struct('>4sIIHHIHHIIIII')
WOFF_ENTRY = struct.Struct('>4sIIII')        # tag, offset, compLength, origLength, origChecksum

SIGNATURE = b'wOFF'
COLLECTION = b'ttcf'


def pad4(n):
    return (n + 3) & ~3


def to_woff(data):
    """Return the WOFF 1.0 bytes for a TrueType / OpenType (sfnt) font."""
    if data[:4] == COLLECTION:
        raise ValueError('a font collection cannot be wrapped as one WOFF')
    if len(data) < SFNT_HEADER.size + 4:
        raise ValueError('not a font: too short')
    # The first four bytes of an sfnt are its version: 0x00010000 (TrueType)
    # or 'OTTO' (OpenType with CFF outlines). WOFF carries it as the flavor.
    flavor, num_tables, _search, _selector, _shift = SFNT_HEADER.unpack_from(data, 0)
    if flavor not in (b'\x00\x01\x00\x00', b'OTTO', b'true'):
        raise ValueError('not a TrueType or OpenType font (version %r)' % (flavor,))

    entries = []
    for i in range(num_tables):
        tag, checksum, offset, length = SFNT_ENTRY.unpack_from(data, SFNT_HEADER.size + i * SFNT_ENTRY.size)
        if offset + length > len(data):
            raise ValueError('table %r runs past the end of the file' % (tag,))
        entries.append((tag, checksum, data[offset:offset + length]))
    entries.sort(key=lambda e: e[0])           # WOFF wants the directory in tag order

    total_sfnt = SFNT_HEADER.size + SFNT_ENTRY.size * num_tables
    packed = []
    for tag, checksum, table in entries:
        total_sfnt += pad4(len(table))
        deflated = zlib.compress(table, 9)
        body = deflated if len(deflated) < len(table) else table
        packed.append((tag, checksum, len(table), body))

    directory_end = WOFF_HEADER.size + WOFF_ENTRY.size * num_tables
    offset = directory_end
    directory = []
    blob = bytearray()
    for tag, checksum, orig_length, body in packed:
        directory.append(WOFF_ENTRY.pack(tag, offset, len(body), orig_length, checksum))
        blob += body
        blob += b'\x00' * (pad4(len(body)) - len(body))
        offset += pad4(len(body))

    length = directory_end + len(blob)
    header = WOFF_HEADER.pack(
        SIGNATURE, int.from_bytes(flavor, 'big'), length, num_tables, 0,
        total_sfnt, 1, 0,      # WOFF 1.0 (majorVersion, minorVersion)
        0, 0, 0,               # metadata block: none
        0, 0,                  # private data block: none
    )
    return header + b''.join(directory) + bytes(blob)


def from_woff(data):
    """Unpack a WOFF back to its tables as {tag: bytes} (used by --verify)."""
    (signature, _flavor, length, num_tables, _reserved, _total, _major, _minor,
     _meta_off, _meta_len, _meta_orig, _priv_off, _priv_len) = WOFF_HEADER.unpack_from(data, 0)
    if signature != SIGNATURE:
        raise ValueError('not a WOFF file')
    if length != len(data):
        raise ValueError('WOFF length field %d does not match the file (%d bytes)' % (length, len(data)))
    tables = {}
    for i in range(num_tables):
        tag, offset, comp, orig, _checksum = WOFF_ENTRY.unpack_from(data, WOFF_HEADER.size + i * WOFF_ENTRY.size)
        raw = data[offset:offset + comp]
        table = zlib.decompress(raw) if comp < orig else raw
        if len(table) != orig:
            raise ValueError('table %r unpacks to %d bytes, expected %d' % (tag, len(table), orig))
        tables[tag] = table
    return tables


def ttf_tables(data):
    _, num_tables, _, _, _ = SFNT_HEADER.unpack_from(data, 0)
    out = {}
    for i in range(num_tables):
        tag, _checksum, offset, length = SFNT_ENTRY.unpack_from(data, SFNT_HEADER.size + i * SFNT_ENTRY.size)
        out[tag] = data[offset:offset + length]
    return out


def main(argv):
    out_dir = None
    args = list(argv)
    if args[:1] == ['--out-dir']:
        if len(args) < 2:
            print(__doc__.strip().splitlines()[0], file=sys.stderr)
            return 2
        out_dir = args[1]
        args = args[2:]
    if not args or args[0] in ('-h', '--help'):
        print(__doc__.strip())
        return 0 if args else 2
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    saved_total = 0
    before_total = 0
    for path in args:
        with open(path, 'rb') as f:
            data = f.read()
        woff = to_woff(data)
        if from_woff(woff) != ttf_tables(data):      # prove the tables survive the round trip
            raise SystemExit('%s: the WOFF does not unpack to the same tables' % path)
        target_dir = out_dir or os.path.dirname(path) or '.'
        target = os.path.join(target_dir, os.path.splitext(os.path.basename(path))[0] + '.woff')
        with open(target, 'wb') as f:
            f.write(woff)
        saved = len(data) - len(woff)
        saved_total += saved
        before_total += len(data)
        print('%s: %d -> %d bytes (%d saved, %.1f%%)' % (target, len(data), len(woff), saved, 100.0 * saved / len(data)))
    if len(args) > 1:
        print('total: %d -> %d bytes (%d saved, %.1f%%)' % (before_total, before_total - saved_total, saved_total, 100.0 * saved_total / before_total))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
