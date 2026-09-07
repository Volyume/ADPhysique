// Distance and grid-cell helpers for dedupe blocking and "near me" search.
// Pure, no I/O.

const EARTH_RADIUS_M = 6371008.8; // mean Earth radius (IUGG)
const DEG2RAD = Math.PI / 180;

/**
 * Great-circle distance between two lat/lng points, in metres.
 */
function haversineMetres(lat1, lng1, lat2, lng2) {
  const phi1 = lat1 * DEG2RAD;
  const phi2 = lat2 * DEG2RAD;
  const dPhi = (lat2 - lat1) * DEG2RAD;
  const dLambda = (lng2 - lng1) * DEG2RAD;

  const sinDPhi = Math.sin(dPhi / 2);
  const sinDLambda = Math.sin(dLambda / 2);
  const a = sinDPhi * sinDPhi + Math.cos(phi1) * Math.cos(phi2) * sinDLambda * sinDLambda;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/**
 * A stable string key for a lat/lng's cell in a square-metre grid
 * (default 250 m, per GD-06 blocking). Two points in the same cell are
 * candidates for a dedupe comparison; two points in adjacent cells near a
 * cell boundary are not guaranteed to share a key, so blocking should also
 * consider a point's own postcode/name blocks (handled in dedupe.js).
 * @param {number} lat
 * @param {number} lng
 * @param {number} [cellSizeM=250]
 * @returns {string}
 */
function gridCellKey(lat, lng, cellSizeM = 250) {
  // Equirectangular approximation, adequate at gym-directory precision
  // (errors are sub-metre at UK latitudes over a 250 m cell).
  const xMetres = lng * 111320 * Math.cos(lat * DEG2RAD);
  const yMetres = lat * 110574;
  const cellX = Math.floor(xMetres / cellSizeM);
  const cellY = Math.floor(yMetres / cellSizeM);
  return `${cellSizeM}:${cellX}:${cellY}`;
}

/**
 * All 9 grid-cell keys covering a point and its immediate neighbours, so a
 * dedupe blocking pass doesn't miss a near-duplicate that lands just across
 * a cell boundary.
 */
function gridCellNeighbourKeys(lat, lng, cellSizeM = 250) {
  const xMetres = lng * 111320 * Math.cos(lat * DEG2RAD);
  const yMetres = lat * 110574;
  const cellX = Math.floor(xMetres / cellSizeM);
  const cellY = Math.floor(yMetres / cellSizeM);
  const keys = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      keys.push(`${cellSizeM}:${cellX + dx}:${cellY + dy}`);
    }
  }
  return keys;
}

/**
 * A bounding box (in degrees) around a point for a given radius in metres.
 */
function boundingBox(lat, lng, radiusMetres) {
  const latDelta = radiusMetres / 110574;
  const lngDelta = radiusMetres / (111320 * Math.cos(lat * DEG2RAD));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

/**
 * Coarse fallback bounding-box check for "this point is plausibly within
 * the GB/NI/Ireland data extract" when a record carries no country code
 * (used by the Overture adapter, per its manifest's own UK bounding box).
 * This is deliberately NOT a GB/NI-vs-Ireland polygon — the two genuinely
 * overlap in both latitude and longitude near the border, so no simple
 * bounding test can separate them — it only rejects points clearly outside
 * the whole extract (e.g. mainland France, mid-Atlantic). A record's own
 * country code should always be preferred over this fallback when present.
 */
function isWithinGbNiBounds(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= 49.8 && lat <= 60.9 && lng >= -8.7 && lng <= 1.8;
}

module.exports = {
  haversineMetres,
  gridCellKey,
  gridCellNeighbourKeys,
  boundingBox,
  isWithinGbNiBounds,
  EARTH_RADIUS_M,
};
