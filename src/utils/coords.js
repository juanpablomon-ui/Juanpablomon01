// WGS84 ellipsoid constants
const a  = 6378137.0;
const f  = 1 / 298.257223563;
const b  = a * (1 - f);
const e2 = 1 - (b * b) / (a * a);
const ep2 = e2 / (1 - e2);
const k0 = 0.9996;

// UTM latitude band letters (C–X, skipping I and O)
const UTM_BANDS = 'CDEFGHJKLMNPQRSTUVWX';

export function toUTM(lat, lon) {
  const zone       = Math.floor((lon + 180) / 6) + 1;
  const lonOrigin  = (zone - 1) * 6 - 180 + 3;

  const latRad       = (lat * Math.PI) / 180;
  const lonRad       = (lon * Math.PI) / 180;
  const lonOriginRad = (lonOrigin * Math.PI) / 180;

  const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) ** 2);
  const T = Math.tan(latRad) ** 2;
  const C = ep2 * Math.cos(latRad) ** 2;
  const A = Math.cos(latRad) * (lonRad - lonOriginRad);

  const M = a * (
      (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256)                   * latRad
    - (3 * e2 / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024)                  * Math.sin(2 * latRad)
    + (15 * e2 ** 2 / 256 + (45 * e2 ** 3) / 1024)                                * Math.sin(4 * latRad)
    - ((35 * e2 ** 3) / 3072)                                                      * Math.sin(6 * latRad)
  );

  const easting = k0 * N * (
    A
    + (1 - T + C)                                   * A ** 3 / 6
    + (5 - 18 * T + T ** 2 + 72 * C - 58 * ep2)    * A ** 5 / 120
  ) + 500000;

  const northingRaw = k0 * (
    M + N * Math.tan(latRad) * (
        A ** 2 / 2
      + (5 - T + 9 * C + 4 * C ** 2)               * A ** 4 / 24
      + (61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6 / 720
    )
  );

  const northing   = lat < 0 ? northingRaw + 10_000_000 : northingRaw;
  const bandIndex  = Math.min(Math.floor((lat + 80) / 8), 19);
  const band       = lat < -80 || lat > 84 ? '?' : UTM_BANDS[bandIndex];

  return {
    zone,
    band,
    easting:    Math.round(easting),
    northing:   Math.round(northing),
    hemisphere: lat >= 0 ? 'N' : 'S',
    toString() {
      return `${zone}${band} E ${this.easting.toLocaleString('es')} N ${this.northing.toLocaleString('es')}`;
    },
  };
}

export function toDMS(decimal, isLat) {
  const dir  = isLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'O');
  const abs  = Math.abs(decimal);
  const deg  = Math.floor(abs);
  const minF = (abs - deg) * 60;
  const min  = Math.floor(minF);
  const sec  = ((minF - min) * 60).toFixed(2);
  return `${deg}° ${min}' ${sec}" ${dir}`;
}
