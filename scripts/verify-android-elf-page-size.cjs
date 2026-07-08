#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const MIN_ALIGN = 16 * 1024;
const PT_LOAD = 1;

function fail(message) {
  console.error(`::error::${message}`);
  process.exitCode = 1;
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walk(p, out);
    else if (name.endsWith('.so')) out.push(p);
  }
  return out;
}

function extractZip(file) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'volyume-elf-'));
  const result = spawnSync('unzip', ['-qq', file, '-d', tmp], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`Could not unzip ${file}: ${result.stderr || result.stdout || 'unzip failed'}`);
  }
  return tmp;
}

function u16(buf, off, little) {
  return little ? buf.readUInt16LE(off) : buf.readUInt16BE(off);
}

function u32(buf, off, little) {
  return little ? buf.readUInt32LE(off) : buf.readUInt32BE(off);
}

function u64(buf, off, little) {
  const n = little ? buf.readBigUInt64LE(off) : buf.readBigUInt64BE(off);
  if (n > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('ELF offset exceeds JS safe integer range');
  return Number(n);
}

function loadElfInfo(file) {
  const buf = fs.readFileSync(file);
  if (buf.length < 64 || buf[0] !== 0x7f || buf[1] !== 0x45 || buf[2] !== 0x4c || buf[3] !== 0x46) {
    return null;
  }
  const klass = buf[4];
  const little = buf[5] === 1;
  const is64 = klass === 2;
  const is32 = klass === 1;
  if (!is64 && !is32) throw new Error(`Unsupported ELF class in ${file}`);

  const phoff = is64 ? u64(buf, 32, little) : u32(buf, 28, little);
  const phentsize = u16(buf, is64 ? 54 : 42, little);
  const phnum = u16(buf, is64 ? 56 : 44, little);
  const alignments = [];

  for (let i = 0; i < phnum; i += 1) {
    const off = phoff + i * phentsize;
    if (off + phentsize > buf.length) throw new Error(`Program header outside file in ${file}`);
    const type = u32(buf, off, little);
    if (type !== PT_LOAD) continue;
    const align = is64 ? u64(buf, off + 48, little) : u32(buf, off + 28, little);
    alignments.push(align);
  }

  return { alignments, is64, is32 };
}

function inputsToSharedObjects(inputs) {
  const extracted = [];
  const soFiles = [];
  for (const input of inputs) {
    const abs = path.resolve(input);
    if (!fs.existsSync(abs)) throw new Error(`Input not found: ${input}`);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      soFiles.push(...walk(abs));
    } else if (abs.endsWith('.apk') || abs.endsWith('.aab') || abs.endsWith('.zip')) {
      const dir = extractZip(abs);
      extracted.push(dir);
      soFiles.push(...walk(dir));
    } else if (abs.endsWith('.so')) {
      soFiles.push(abs);
    } else {
      throw new Error(`Unsupported input: ${input}`);
    }
  }
  return { soFiles, extracted };
}

function main() {
  const inputs = process.argv.slice(2);
  if (inputs.length === 0) {
    console.error('Usage: node scripts/verify-android-elf-page-size.cjs <apk|aab|dir|so> [...]');
    process.exit(2);
  }

  const { soFiles, extracted } = inputsToSharedObjects(inputs);
  try {
    if (soFiles.length === 0) {
      fail('No shared libraries found to verify.');
      return;
    }

    let checked = 0;
    let skipped32 = 0;
    for (const file of soFiles) {
      const info = loadElfInfo(file);
      if (!info || info.alignments.length === 0) continue;
      if (!info.is64) {
        skipped32 += 1;
        continue;
      }
      const { alignments } = info;
      checked += 1;
      const bad = alignments.filter((align) => align < MIN_ALIGN || align % MIN_ALIGN !== 0);
      if (bad.length > 0) {
        fail(`${file} is not 16 KB page-size compatible; PT_LOAD alignments: ${alignments.map((a) => `0x${a.toString(16)}`).join(', ')}`);
      }
    }

    if (checked === 0) {
      fail('No 64-bit ELF shared libraries found to verify.');
      return;
    }
    if (!process.exitCode) {
      const skipped = skipped32 > 0 ? `; skipped ${skipped32} 32-bit native libraries` : '';
      console.log(`Verified ${checked} 64-bit native libraries for 16 KB page-size compatibility${skipped}.`);
    }
  } finally {
    for (const dir of extracted) fs.rmSync(dir, { recursive: true, force: true });
  }
}

try {
  main();
} catch (e) {
  fail(e?.message || String(e));
}
