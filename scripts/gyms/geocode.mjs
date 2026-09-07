#!/usr/bin/env node
// geocode.mjs — GD-08: fills lat/lng from postcode sector centroids when a
// record has no source coordinate (leaves coord_source 'none' and counts
// it when the sector isn't in raw/postcodes/sector-centroids.csv either),
// and fills country/region/local authority from raw/postcodes/onspd-slim.csv
// (streamed once, matched only against the postcodes this run actually
// needs) plus the small ctry/rgn/lad/bua lookup tables.
//
// GD-21: a record with coordinates but no postcode (Overture rows with no
// address match) takes sector/outward/country/region/local-authority from
// the NEAREST ONSPD sector centroid within 3 km instead (area_source =
// 'nearest_sector'; postcode itself stays null). Also writes
// data/gyms/postcode-sectors.v1.csv (sector, lat, lng, count, country,
// region_code, local_authority_code) from the same ONSPD pass, for
// seed-sql.mjs's gym_postcode_sectors table.

import path from 'node:path';
import fs from 'node:fs';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { readJsonl, writeJsonl } = require('./lib/jsonl.js');
const { parseCsvHeader, csvLineToRecord } = require('./lib/csv.js');
const { sectorCode } = require('./lib/postcode.js');
const { haversineMetres, gridCellKey, gridCellNeighbourKeys } = require('./lib/geo.js');

const DEFAULT_RAW_DIR =
  '/tmp/claude-0/-home-user-ADPhysique/8a1da388-bf6f-50f3-8ac9-99853301c7d5/scratchpad/gyms/raw';
const RAW_DIR = process.env.RAW_DIR || process.argv[2] || DEFAULT_RAW_DIR;
const WORK_DIR = path.join(__dirname, '../../data/gyms/_work');
const DATA_DIR = path.join(__dirname, '../../data/gyms');
const IN_FILE = path.join(WORK_DIR, 'normalised.v1.jsonl');
const OUT_FILE = path.join(WORK_DIR, 'geocoded.v1.jsonl');
const SECTORS_OUT_FILE = path.join(DATA_DIR, 'postcode-sectors.v1.csv');

const NEAREST_SECTOR_RADIUS_M = 3000;
const NEAREST_SECTOR_GRID_CELL_M = 3000;

function log(msg) {
  console.log(`[geocode] ${msg}`);
}

function loadCsvMap(filePath, keyField) {
  const map = new Map();
  if (!fs.existsSync(filePath)) return map;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter((l) => l.trim());
  if (lines.length === 0) return map;
  const header = parseCsvHeader(lines[0]);
  for (let i = 1; i < lines.length; i += 1) {
    const row = csvLineToRecord(header, lines[i]);
    map.set(row[keyField], row);
  }
  return map;
}

// A grid index over the sector centroids so a "nearest sector within 3km"
// lookup is a 3x3 neighbour-cell scan instead of a full 12.5k-row scan per
// record. Cell size matches the search radius, so any centroid within
// NEAREST_SECTOR_RADIUS_M of a query point is guaranteed to fall in the
// query point's own cell or one of its 8 neighbours.
function buildSectorGridIndex(sectorCentroids) {
  const grid = new Map();
  const entries = [];
  for (const [sector, row] of sectorCentroids) {
    const lat = Number(row.lat_mean);
    const lng = Number(row.long_mean);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const entry = { sector, lat, lng };
    entries.push(entry);
    const key = gridCellKey(lat, lng, NEAREST_SECTOR_GRID_CELL_M);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(entry);
  }
  return { grid, count: entries.length };
}

function findNearestSector(gridIndex, lat, lng) {
  let best = null;
  let bestDist = Infinity;
  for (const key of gridCellNeighbourKeys(lat, lng, NEAREST_SECTOR_GRID_CELL_M)) {
    const candidates = gridIndex.grid.get(key);
    if (!candidates) continue;
    for (const c of candidates) {
      const d = haversineMetres(lat, lng, c.lat, c.lng);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
  }
  if (best && bestDist <= NEAREST_SECTOR_RADIUS_M) return { sector: best.sector, distanceM: bestDist };
  return null;
}

// Single streaming pass over onspd-slim.csv (2.7M rows): picks up the exact
// postcode rows this run needs (as before) AND, in the same pass, tallies a
// per-sector mode of ctry/rgn/oslaua so GD-21's nearest-sector fallback and
// postcode-sectors.v1.csv can both give a sector-level hierarchy without a
// second full scan. onspd-slim's columns (pcds,lat,long,ctry,rgn,oslaua,bua)
// carry no commas/quoting, so a plain split is safe and avoids the full
// RFC4180 parser's overhead on 2.7M lines.
async function streamOnspd(onspdPath, neededPostcodes) {
  const postcodeRows = new Map();
  const sectorTally = new Map(); // sector -> Map(tripleKey -> count)

  if (!fs.existsSync(onspdPath)) return { postcodeRows, sectorTally };

  const stream = fs.createReadStream(onspdPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let header = null;
  let scanned = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    if (!header) {
      header = parseCsvHeader(line);
      continue;
    }
    scanned += 1;
    const fields = line.split(',');
    const pcds = fields[0];
    const ctry = fields[3];
    const rgn = fields[4];
    const oslaua = fields[5];

    if (neededPostcodes.has(pcds)) {
      const row = csvLineToRecord(header, line);
      postcodeRows.set(row.pcds, row);
    }

    const sector = sectorCode(pcds);
    if (sector) {
      const tripleKey = `${ctry}|${rgn}|${oslaua}`;
      if (!sectorTally.has(sector)) sectorTally.set(sector, new Map());
      const tally = sectorTally.get(sector);
      tally.set(tripleKey, (tally.get(tripleKey) || 0) + 1);
    }
  }
  log(`onspd-slim.csv: ${scanned} rows scanned, ${postcodeRows.size}/${neededPostcodes.size} needed postcodes matched`);
  return { postcodeRows, sectorTally };
}

// The most frequent (ctry, rgn, oslaua) triple seen for a sector — a
// sector very rarely straddles a boundary, so the mode is effectively
// exact; where it does straddle, the mode is the best single answer for a
// sector-level (not postcode-level) hierarchy row.
function modeTriple(tally) {
  let bestKey = null;
  let bestCount = -1;
  for (const [key, count] of tally) {
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  }
  if (!bestKey) return null;
  const [ctry, rgn, oslaua] = bestKey.split('|');
  return { ctry: ctry || null, rgn: rgn || null, oslaua: oslaua || null };
}

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function run() {
  const records = readJsonl(IN_FILE);
  log(`loaded ${records.length} normalised records`);

  const sectorCentroids = loadCsvMap(path.join(RAW_DIR, 'postcodes/sector-centroids.csv'), 'sector');
  const ctryLookup = loadCsvMap(path.join(RAW_DIR, 'postcodes/lookups/ctry-lookup.csv'), 'CTRY25CD');
  const rgnLookup = loadCsvMap(path.join(RAW_DIR, 'postcodes/lookups/rgn-lookup.csv'), 'RGN25CD');
  const ladLookup = loadCsvMap(path.join(RAW_DIR, 'postcodes/lookups/lad-lookup.csv'), 'LAD25CD');
  const buaLookup = loadCsvMap(path.join(RAW_DIR, 'postcodes/lookups/bua-lookup.csv'), 'BUA24CD');
  log(
    `loaded lookups: ${sectorCentroids.size} sector centroids, ${ctryLookup.size} countries, ` +
      `${rgnLookup.size} regions, ${ladLookup.size} local authorities, ${buaLookup.size} built-up areas`,
  );

  const gridIndex = buildSectorGridIndex(sectorCentroids);
  log(`sector grid index: ${gridIndex.count} centroids indexed for GD-21 nearest-sector lookup (radius ${NEAREST_SECTOR_RADIUS_M}m)`);

  const neededPostcodes = new Set();
  for (const r of records) {
    if (r.postcode) neededPostcodes.add(r.postcode);
  }
  const { postcodeRows: onspd, sectorTally } = await streamOnspd(path.join(RAW_DIR, 'postcodes/onspd-slim.csv'), neededPostcodes);

  let sectorFilled = 0;
  let coordUnresolved = 0;
  let onspdMatched = 0;
  let onspdUnresolved = 0;
  let nearestSectorFilled = 0;
  let nearestSectorNoneWithin3km = 0;

  const out = records.map((r) => {
    const rec = { ...r };

    if (rec.coord_source !== 'source' && rec.postcode) {
      const sector = sectorCode(rec.postcode);
      const centroid = sector ? sectorCentroids.get(sector) : null;
      if (centroid) {
        rec.lat = Number(centroid.lat_mean);
        rec.lng = Number(centroid.long_mean);
        rec.coord_source = 'postcode_sector';
        sectorFilled += 1;
      } else {
        rec.coord_source = 'none';
        coordUnresolved += 1;
      }
    } else if (rec.coord_source !== 'source') {
      coordUnresolved += 1;
    }

    if (rec.postcode) {
      rec.sector = sectorCode(rec.postcode);
      rec.area_source = 'postcode';
      const onspdRow = onspd.get(rec.postcode);
      if (onspdRow) {
        onspdMatched += 1;
        const ctry = ctryLookup.get(onspdRow.ctry);
        const rgn = rgnLookup.get(onspdRow.rgn);
        const lad = ladLookup.get(onspdRow.oslaua);
        const bua = buaLookup.get(onspdRow.bua);
        rec.country = ctry ? ctry.CTRY25NM : null;
        rec.region_code = onspdRow.rgn || null;
        rec.region_name = rgn ? rgn.RGN25NM : null;
        rec.local_authority_code = onspdRow.oslaua || null;
        rec.local_authority_name = lad ? lad.LAD25NM : null;
        rec.bua_name = bua ? bua.BUA24NM : null;
      } else {
        onspdUnresolved += 1;
        rec.country = null;
        rec.region_code = null;
        rec.region_name = null;
        rec.local_authority_code = null;
        rec.local_authority_name = null;
        rec.bua_name = null;
      }
    } else if (Number.isFinite(rec.lat) && Number.isFinite(rec.lng)) {
      // GD-21: no postcode, but a source coordinate — nearest ONSPD sector
      // within 3km stands in for postcode-derived hierarchy. `postcode`
      // stays null; only sector/outward/hierarchy are filled.
      const nearest = findNearestSector(gridIndex, rec.lat, rec.lng);
      if (nearest) {
        nearestSectorFilled += 1;
        rec.sector = nearest.sector;
        rec.area_source = 'nearest_sector';
        rec.nearest_sector_distance_m = Math.round(nearest.distanceM);
        const tally = sectorTally.get(nearest.sector);
        const triple = tally ? modeTriple(tally) : null;
        const ctry = triple ? ctryLookup.get(triple.ctry) : null;
        const rgn = triple ? rgnLookup.get(triple.rgn) : null;
        const lad = triple ? ladLookup.get(triple.oslaua) : null;
        rec.country = ctry ? ctry.CTRY25NM : null;
        rec.region_code = triple ? triple.rgn : null;
        rec.region_name = rgn ? rgn.RGN25NM : null;
        rec.local_authority_code = triple ? triple.oslaua : null;
        rec.local_authority_name = lad ? lad.LAD25NM : null;
        rec.bua_name = null;
      } else {
        nearestSectorNoneWithin3km += 1;
        rec.sector = null;
        rec.area_source = null;
        rec.country = null;
        rec.region_code = null;
        rec.region_name = null;
        rec.local_authority_code = null;
        rec.local_authority_name = null;
        rec.bua_name = null;
      }
    } else {
      rec.sector = null;
      rec.area_source = null;
      rec.country = null;
      rec.region_code = null;
      rec.region_name = null;
      rec.local_authority_code = null;
      rec.local_authority_name = null;
      rec.bua_name = null;
    }

    rec.outward = rec.postcode
      ? (rec.sector || sectorCode(rec.postcode) || '').split(' ')[0] || null
      : rec.sector
        ? rec.sector.split(' ')[0]
        : null;

    return rec;
  });

  fs.mkdirSync(WORK_DIR, { recursive: true });
  writeJsonl(OUT_FILE, out);
  log(
    `wrote ${out.length} geocoded records: ${sectorFilled} filled from sector centroid, ` +
      `${coordUnresolved} coord_source=none, ${onspdMatched} matched in ONSPD, ${onspdUnresolved} postcode not in ONSPD`,
  );
  log(
    `GD-21 nearest-sector fallback: ${nearestSectorFilled} rows (coords, no postcode) resolved to a sector within ` +
      `${NEAREST_SECTOR_RADIUS_M}m, ${nearestSectorNoneWithin3km} had no sector within range`,
  );

  // GD-24: data/gyms/postcode-sectors.v1.csv from ONSPD (sector, lat, lng,
  // count, country, region_code, local_authority_code).
  const sectorRows = [];
  for (const [sector, row] of sectorCentroids) {
    const tally = sectorTally.get(sector);
    const triple = tally ? modeTriple(tally) : null;
    const ctry = triple ? ctryLookup.get(triple.ctry) : null;
    sectorRows.push({
      sector,
      lat: row.lat_mean,
      lng: row.long_mean,
      count: row.count,
      country: ctry ? ctry.CTRY25NM : '',
      region_code: triple ? triple.rgn || '' : '',
      local_authority_code: triple ? triple.oslaua || '' : '',
    });
  }
  const sectorsCsv = [
    'sector,lat,lng,count,country,region_code,local_authority_code',
    ...sectorRows.map((r) =>
      [r.sector, r.lat, r.lng, r.count, r.country, r.region_code, r.local_authority_code].map(csvEscape).join(','),
    ),
  ].join('\n');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SECTORS_OUT_FILE, `${sectorsCsv}\n`);
  log(`wrote ${sectorRows.length} sectors -> ${SECTORS_OUT_FILE}`);
}

run().catch((e) => {
  console.error('[geocode] FATAL', e);
  process.exit(1);
});
