// ── WGS84 ellipsoid ──────────────────────────────────────────────────────────
const a   = 6378137.0;
const f   = 1 / 298.257223563;
const b   = a * (1 - f);
const e2  = 1 - (b * b) / (a * a);
const ep2 = e2 / (1 - e2);
const k0  = 0.9996;

const UTM_BANDS = 'CDEFGHJKLMNPQRSTUVWX'; // C–X, no I / O

// ── UTM ──────────────────────────────────────────────────────────────────────
export function toUTM(lat, lon) {
  const zone      = Math.floor((lon + 180) / 6) + 1;
  const lonOrigin = (zone - 1) * 6 - 180 + 3;

  const φ  = (lat        * Math.PI) / 180;
  const λ  = (lon        * Math.PI) / 180;
  const λ0 = (lonOrigin  * Math.PI) / 180;

  const N   = a / Math.sqrt(1 - e2 * Math.sin(φ) ** 2);
  const T   = Math.tan(φ) ** 2;
  const C   = ep2 * Math.cos(φ) ** 2;
  const A   = Math.cos(φ) * (λ - λ0);

  const M = a * (
      (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256)      * φ
    - (3 * e2 / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024)     * Math.sin(2 * φ)
    + (15 * e2 ** 2 / 256 + (45 * e2 ** 3) / 1024)                   * Math.sin(4 * φ)
    - ((35 * e2 ** 3) / 3072)                                         * Math.sin(6 * φ)
  );

  const easting = k0 * N * (
    A
    + (1 - T + C)                                 * A ** 3 / 6
    + (5 - 18 * T + T ** 2 + 72 * C - 58 * ep2)  * A ** 5 / 120
  ) + 500000;

  const northingRaw = k0 * (
    M + N * Math.tan(φ) * (
        A ** 2 / 2
      + (5 - T + 9 * C + 4 * C ** 2)               * A ** 4 / 24
      + (61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6 / 720
    )
  );

  const northing  = lat < 0 ? northingRaw + 10_000_000 : northingRaw;
  const bandIndex = Math.min(Math.floor((lat + 80) / 8), 19);
  const band      = lat < -80 || lat > 84 ? '?' : UTM_BANDS[bandIndex];

  return {
    zone,
    band,
    easting:    Math.round(easting),
    northing:   Math.round(northing),
    hemisphere: lat >= 0 ? 'N' : 'S',
    toString() {
      return `${this.zone}${this.band} E ${this.easting.toLocaleString('es')} N ${this.northing.toLocaleString('es')}`;
    },
  };
}

// ── MGRS ─────────────────────────────────────────────────────────────────────
// Column letter sets (per zone mod 3): A–H, J–R, S–Z
const MGRS_COL = ['ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ'];
// Row letters (20 chars, no I/O); even zones offset by 5 → start at F
const MGRS_ROW_ODD  = 'ABCDEFGHJKLMNPQRSTUV';
const MGRS_ROW_EVEN = 'FGHJKLMNPQRSTUVABCDE';

export function toMGRS(lat, lon, precision = 5) {
  if (lat < -80 || lat > 84) return null;
  const utm = toUTM(lat, lon);
  const { zone, band, easting, northing } = utm;

  const colIdx = Math.floor(easting / 100_000) - 1;          // 0–7
  const rowIdx = Math.floor(northing / 100_000) % 20;        // 0–19

  const col = MGRS_COL[(zone - 1) % 3][colIdx];
  const row = (zone % 2 === 1 ? MGRS_ROW_ODD : MGRS_ROW_EVEN)[rowIdx];

  const e = Math.floor(easting  % 100_000).toString().padStart(5, '0').slice(0, precision);
  const n = Math.floor(northing % 100_000).toString().padStart(5, '0').slice(0, precision);

  return {
    gzd:  `${zone}${band}`,
    sqid: `${col}${row}`,
    e, n, precision,
    toString()  { return `${this.gzd} ${this.sqid} ${this.e} ${this.n}`; },
    compact()   { return `${this.gzd}${this.sqid}${this.e}${this.n}`; },
  };
}

// ── Geographic helpers ────────────────────────────────────────────────────────
export function toDMS(decimal, isLat) {
  const dir  = isLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'O');
  const abs  = Math.abs(decimal);
  const deg  = Math.floor(abs);
  const minF = (abs - deg) * 60;
  const min  = Math.floor(minF);
  const sec  = ((minF - min) * 60).toFixed(2);
  return `${deg}° ${min}' ${sec}" ${dir}`;
}

// ── Geodesic calculations ────────────────────────────────────────────────────
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R  = 6_371_000;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function initialBearing(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const y  = Math.sin(Δλ) * Math.cos(φ2);
  const x  = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

// Forward geodesic projection (bearing in degrees, distance in metres)
export function projectPoint(lat, lon, bearingDeg, distM) {
  const R  = 6_371_000;
  const b  = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lon * Math.PI) / 180;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(distM / R) + Math.cos(φ1) * Math.sin(distM / R) * Math.cos(b));
  const λ2 = λ1 + Math.atan2(Math.sin(b) * Math.sin(distM / R) * Math.cos(φ1), Math.cos(distM / R) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: (φ2 * 180) / Math.PI, lon: ((λ2 * 180) / Math.PI + 540) % 360 - 180 };
}

// ── Formatting ────────────────────────────────────────────────────────────────
export function formatDist(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}
