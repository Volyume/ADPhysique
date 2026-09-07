// OSGB36 (Great Britain National Grid) and Irish Grid (TM75, Ireland 1965
// datum) easting/northing to WGS84 lat/lng conversion. Pure, no I/O.
//
// Method: inverse Transverse Mercator (grid -> ellipsoidal lat/lon on the
// source datum's own ellipsoid), then a 7-parameter Helmert transform
// (position-vector convention) to WGS84 cartesian, then cartesian back to
// WGS84 ellipsoidal lat/lon (Bowring's method). This is the standard method
// published by Ordnance Survey ("A guide to coordinate systems in Great
// Britain") and mirrored by widely-used open implementations (e.g.
// Chris Veness's geodesy library) for the GB case; the same machinery is
// reused for Ireland with its own ellipsoid, projection origin and Helmert
// parameters.

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

const AIRY_1830 = { a: 6377563.396, b: 6356256.909 };
const AIRY_MODIFIED = { a: 6377340.189, b: 6356034.447 };
const WGS84_ELLIPSOID = { a: 6378137, b: 6356752.314245 };

// British National Grid (OSGB36) projection origin.
const NATIONAL_GRID_PROJECTION = {
  lat0: 49 * DEG2RAD,
  lon0: -2 * DEG2RAD,
  F0: 0.9996012717,
  E0: 400000,
  N0: -100000,
  ellipsoid: AIRY_1830,
};

// Irish National Grid (TM75 / Ireland 1965 datum) projection origin.
const IRISH_GRID_PROJECTION = {
  lat0: 53.5 * DEG2RAD,
  lon0: -8 * DEG2RAD,
  F0: 1.000035,
  E0: 200000,
  N0: 250000,
  ellipsoid: AIRY_MODIFIED,
};

// Helmert transform parameters, source-datum -> WGS84 (position-vector
// convention: translations in metres, rotations in arcseconds, scale in ppm).
const OSGB36_TO_WGS84 = {
  tx: 446.448,
  ty: -125.157,
  tz: 542.06,
  s: -20.4894,
  rx: 0.1502,
  ry: 0.247,
  rz: 0.8421,
};

// Ireland 1965 (TM75) -> WGS84, the standard published 7-parameter set.
const IRISH_1965_TO_WGS84 = {
  tx: 482.53,
  ty: -130.596,
  tz: 564.557,
  s: -8.15,
  rx: -1.042,
  ry: -0.214,
  rz: -0.631,
};

/**
 * Inverse Transverse Mercator: grid easting/northing -> ellipsoidal lat/lon
 * (radians) on the projection's own source ellipsoid.
 */
function gridToLatLonRadians(easting, northing, projection) {
  const { a, b } = projection.ellipsoid;
  const { lat0, lon0, F0, E0, N0 } = projection;
  const n = (a - b) / (a + b);
  const n2 = n * n;
  const n3 = n * n * n;

  let phi = lat0;
  let M = 0;
  do {
    phi = (northing - N0 - M) / (a * F0) + phi;

    const Ma = (1 + n + (5 / 4) * n2 + (5 / 4) * n3) * (phi - lat0);
    const Mb = (3 * n + 3 * n2 + (21 / 8) * n3) * Math.sin(phi - lat0) * Math.cos(phi + lat0);
    const Mc = ((15 / 8) * n2 + (15 / 8) * n3) * Math.sin(2 * (phi - lat0)) * Math.cos(2 * (phi + lat0));
    const Md = (35 / 24) * n3 * Math.sin(3 * (phi - lat0)) * Math.cos(3 * (phi + lat0));
    M = b * F0 * (Ma - Mb + Mc - Md);
  } while (northing - N0 - M >= 0.00001);

  const e2 = 1 - (b * b) / (a * a);
  const sinPhi = Math.sin(phi);
  const nu = (a * F0) / Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const rho = (a * F0 * (1 - e2)) / Math.pow(1 - e2 * sinPhi * sinPhi, 1.5);
  const eta2 = nu / rho - 1;

  const tanPhi = Math.tan(phi);
  const tan2 = tanPhi * tanPhi;
  const tan4 = tan2 * tan2;
  const tan6 = tan4 * tan2;
  const secPhi = 1 / Math.cos(phi);

  const VII = tanPhi / (2 * rho * nu);
  const VIII = (tanPhi / (24 * rho * Math.pow(nu, 3))) * (5 + 3 * tan2 + eta2 - 9 * tan2 * eta2);
  const IX = (tanPhi / (720 * rho * Math.pow(nu, 5))) * (61 + 90 * tan2 + 45 * tan4);
  const X = secPhi / nu;
  const XI = (secPhi / (6 * Math.pow(nu, 3))) * (nu / rho + 2 * tan2);
  const XII = (secPhi / (120 * Math.pow(nu, 5))) * (5 + 28 * tan2 + 24 * tan4);
  const XIIA = (secPhi / (5040 * Math.pow(nu, 7))) * (61 + 662 * tan2 + 1320 * tan4 + 720 * tan6);

  const dE = easting - E0;
  const dE2 = dE * dE;
  const dE3 = dE2 * dE;
  const dE4 = dE3 * dE;
  const dE5 = dE4 * dE;
  const dE6 = dE5 * dE;
  const dE7 = dE6 * dE;

  const finalPhi = phi - VII * dE2 + VIII * dE4 - IX * dE6;
  const lambda = lon0 + X * dE - XI * dE3 + XII * dE5 - XIIA * dE7;

  return { phi: finalPhi, lambda };
}

function ellipsoidalToCartesian(phi, lambda, ellipsoid) {
  const { a, b } = ellipsoid;
  const e2 = 1 - (b * b) / (a * a);
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const sinLambda = Math.sin(lambda);
  const cosLambda = Math.cos(lambda);
  const nu = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const x = nu * cosPhi * cosLambda;
  const y = nu * cosPhi * sinLambda;
  const z = (1 - e2) * nu * sinPhi;
  return { x, y, z };
}

function applyHelmert(cartesian, t) {
  const { x, y, z } = cartesian;
  const s1 = 1 + t.s / 1e6;
  const rx = (t.rx / 3600) * DEG2RAD;
  const ry = (t.ry / 3600) * DEG2RAD;
  const rz = (t.rz / 3600) * DEG2RAD;

  return {
    x: t.tx + x * s1 - y * rz + z * ry,
    y: t.ty + x * rz + y * s1 - z * rx,
    z: t.tz - x * ry + y * rx + z * s1,
  };
}

// Bowring's method: cartesian -> ellipsoidal lat/lon on the given ellipsoid.
function cartesianToEllipsoidal(cartesian, ellipsoid) {
  const { x, y, z } = cartesian;
  const { a, b } = ellipsoid;
  const e2 = 1 - (b * b) / (a * a);
  const epsilon2 = e2 / (1 - e2);
  const p = Math.sqrt(x * x + y * y);
  const R = Math.sqrt(p * p + z * z);

  const tanBeta = ((b * z) / (a * p)) * (1 + (epsilon2 * b) / R);
  const sinBeta = tanBeta / Math.sqrt(1 + tanBeta * tanBeta);
  const cosBeta = tanBeta === 0 ? 1 : sinBeta / tanBeta;

  const phi = Math.atan2(
    z + epsilon2 * b * sinBeta * sinBeta * sinBeta,
    p - e2 * a * cosBeta * cosBeta * cosBeta,
  );
  const lambda = Math.atan2(y, x);
  return { phi, lambda };
}

function convert(easting, northing, projection, helmert) {
  if (!Number.isFinite(easting) || !Number.isFinite(northing)) return null;
  const source = gridToLatLonRadians(easting, northing, projection);
  const sourceCartesian = ellipsoidalToCartesian(source.phi, source.lambda, projection.ellipsoid);
  const wgs84Cartesian = applyHelmert(sourceCartesian, helmert);
  const wgs84 = cartesianToEllipsoidal(wgs84Cartesian, WGS84_ELLIPSOID);
  return { lat: wgs84.phi * RAD2DEG, lng: wgs84.lambda * RAD2DEG };
}

/**
 * OSGB36 National Grid easting/northing (metres) -> WGS84 {lat, lng}.
 */
function osgb36ToWgs84(easting, northing) {
  return convert(easting, northing, NATIONAL_GRID_PROJECTION, OSGB36_TO_WGS84);
}

/**
 * Irish Grid (TM75, Ireland 1965 datum) easting/northing (metres) -> WGS84
 * {lat, lng}. Used for Active Places NI, whose EASTING/NORTHING columns are
 * Irish Grid references, not OSGB36.
 */
function irishGridToWgs84(easting, northing) {
  return convert(easting, northing, IRISH_GRID_PROJECTION, IRISH_1965_TO_WGS84);
}

module.exports = { osgb36ToWgs84, irishGridToWgs84 };
