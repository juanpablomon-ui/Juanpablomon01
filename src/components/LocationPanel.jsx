import { useState } from 'react';
import { Navigation, Mountain, Zap, RotateCw, Target, Map } from 'lucide-react';
import { toDMS, toUTM, toMGRS, projectPoint, haversineDistance, initialBearing, formatDist } from '../utils/coords';

function getCardinal(h) {
  if (h == null) return '—';
  return ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(h / 45) % 8];
}

function CompassRose({ heading }) {
  const h = heading ?? 0;
  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28 drop-shadow-lg">
      <circle cx="50" cy="50" r="48" fill="#1e293b" stroke="#334155" strokeWidth="2" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(a => {
        const r1  = 44, r2 = a % 90 === 0 ? 37 : 40;
        const rad = (a * Math.PI) / 180;
        return (
          <line key={a}
            x1={50 + r1 * Math.sin(rad)} y1={50 - r1 * Math.cos(rad)}
            x2={50 + r2 * Math.sin(rad)} y2={50 - r2 * Math.cos(rad)}
            stroke={a % 90 === 0 ? '#64748b' : '#334155'}
            strokeWidth={a % 90 === 0 ? 1.5 : 1}
          />
        );
      })}
      {[{ l: 'N', a: 0, c: '#f87171' }, { l: 'E', a: 90, c: '#94a3b8' }, { l: 'S', a: 180, c: '#94a3b8' }, { l: 'O', a: 270, c: '#94a3b8' }].map(({ l, a, c }) => {
        const rad = (a * Math.PI) / 180;
        return (
          <text key={l} x={50 + 30 * Math.sin(rad)} y={50 - 30 * Math.cos(rad) + 4}
            textAnchor="middle" fill={c} fontSize="11" fontWeight="bold" fontFamily="sans-serif"
          >{l}</text>
        );
      })}
      <g transform={`rotate(${h}, 50, 50)`}>
        <polygon points="50,12 46,50 50,45 54,50" fill="#3b82f6" />
        <polygon points="50,88 46,50 50,55 54,50" fill="#475569" />
        <circle cx="50" cy="50" r="4" fill="white" stroke="#0f172a" strokeWidth="1" />
      </g>
    </svg>
  );
}

export function LocationPanel({ location, error, loading, heading, requestCompassPermission, onProjectedPoint, onViewMap }) {
  const [bearing,   setBearing]   = useState('');
  const [distance,  setDistance]  = useState('');
  const [projected, setProjected] = useState(null);

  // Distance calculator state
  const [destLat,  setDestLat]  = useState('');
  const [destLon,  setDestLon]  = useState('');
  const [distInfo, setDistInfo] = useState(null);

  const copy = (text) => navigator.clipboard?.writeText(text).catch(() => {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-pulse">📍</div>
          <div className="text-slate-400 text-sm">Obteniendo señal GPS…</div>
        </div>
      </div>
    );
  }

  if (!location && error) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="bg-red-900/30 border border-red-700/50 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <div className="text-red-300 text-sm">{error}</div>
          <p className="text-slate-400 text-xs mt-3">Activa la ubicación del dispositivo y recarga.</p>
        </div>
      </div>
    );
  }

  const handleProject = () => {
    if (!location || !bearing || !distance) return;
    const pt = projectPoint(location.lat, location.lon, parseFloat(bearing), parseFloat(distance));
    setProjected(pt);
    onProjectedPoint?.(pt);
  };

  const handleDistCalc = () => {
    const lat2 = parseFloat(destLat), lon2 = parseFloat(destLon);
    if (isNaN(lat2) || isNaN(lon2) || !location) return;
    setDistInfo({
      dist:    haversineDistance(location.lat, location.lon, lat2, lon2),
      bearing: initialBearing(location.lat, location.lon, lat2, lon2),
    });
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">

      {/* ── Coordinates card ── */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <Navigation size={16} className="text-blue-400" />
          <span className="font-semibold text-sm">Sistemas de Coordenadas</span>
        </div>

        {location ? (() => {
          const utm  = toUTM(location.lat, location.lon);
          const mgrs = toMGRS(location.lat, location.lon);
          return (
            <div className="space-y-3">
              {/* GD */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Geográficas Decimales (GD)</span>
                  <button onClick={() => copy(`${location.lat.toFixed(7)}, ${location.lon.toFixed(7)}`)} className="text-slate-500 active:text-white text-xs">📋</button>
                </div>
                <div className="font-mono text-emerald-400 text-sm leading-snug">
                  {location.lat.toFixed(7)}°&nbsp;&nbsp;{location.lat >= 0 ? 'N' : 'S'}<br />
                  {location.lon.toFixed(7)}°&nbsp;&nbsp;{location.lon >= 0 ? 'E' : 'O'}
                </div>
              </div>

              {/* GMS */}
              <div className="border-t border-slate-700 pt-3">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Geog. GMS (° ′ ″)</span>
                  <button onClick={() => copy(`${toDMS(location.lat, true)}, ${toDMS(location.lon, false)}`)} className="text-slate-500 active:text-white text-xs">📋</button>
                </div>
                <div className="font-mono text-emerald-400 text-xs leading-relaxed">
                  {toDMS(location.lat, true)}<br />
                  {toDMS(location.lon, false)}
                </div>
              </div>

              {/* UTM */}
              <div className="border-t border-slate-700 pt-3">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">UTM (WGS84)</span>
                  <button onClick={() => copy(`${utm.zone}${utm.band} ${utm.hemisphere} E:${utm.easting} N:${utm.northing}`)} className="text-slate-500 active:text-white text-xs">📋</button>
                </div>
                <div className="font-mono text-cyan-400 text-sm leading-relaxed">
                  <span className="text-slate-500 text-xs">Zona </span>{utm.zone}{utm.band}&nbsp;·&nbsp;
                  <span className="text-slate-500 text-xs">H </span>{utm.hemisphere}<br />
                  <span className="text-slate-500 text-xs">E&nbsp;</span>{utm.easting.toLocaleString('es')} m<br />
                  <span className="text-slate-500 text-xs">N&nbsp;</span>{utm.northing.toLocaleString('es')} m
                </div>
              </div>

              {/* MGRS */}
              {mgrs && (
                <div className="border-t border-slate-700 pt-3">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">MGRS (Coord. Militares)</span>
                    <button onClick={() => copy(mgrs.toString())} className="text-slate-500 active:text-white text-xs">📋</button>
                  </div>
                  <div className="font-mono text-violet-400 text-sm leading-relaxed">
                    <span className="text-slate-500 text-xs">GZD </span>{mgrs.gzd}&nbsp;
                    <span className="text-slate-500 text-xs">ID </span>{mgrs.sqid}<br />
                    <span className="text-slate-500 text-xs">E&nbsp;</span>{mgrs.e}&nbsp;&nbsp;
                    <span className="text-slate-500 text-xs">N&nbsp;</span>{mgrs.n}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5">Compacto: {mgrs.compact()}</div>
                </div>
              )}

              <div className="text-xs text-slate-500 pt-1">
                Precisión GPS: ±{location.accuracy ? Math.round(location.accuracy) : '—'} m
              </div>
            </div>
          );
        })() : (
          <div className="text-slate-500 text-sm">Sin señal GPS</div>
        )}
      </div>

      {/* ── Compass ── */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-amber-400">🧭</span>
          <span className="font-semibold text-sm">Brújula</span>
          <button onClick={requestCompassPermission}
            className="ml-auto flex items-center gap-1 text-xs text-slate-400 active:text-white">
            <RotateCw size={12} /> Activar
          </button>
        </div>
        <div className="flex items-center gap-5">
          <CompassRose heading={heading} />
          <div>
            <div className="text-4xl font-bold tabular-nums">{heading != null ? `${Math.round(heading)}°` : '—°'}</div>
            <div className="text-xl text-slate-400 font-semibold">{getCardinal(heading)}</div>
            {heading == null && <div className="text-xs text-slate-500 mt-1">Activa la brújula</div>}
          </div>
        </div>
      </div>

      {/* ── Altitude & Speed ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Mountain size={14} className="text-purple-400" />
            <span className="text-xs font-semibold text-slate-300">Altitud</span>
          </div>
          <div className="text-2xl font-bold">{location?.alt != null ? `${Math.round(location.alt)}` : '—'}</div>
          <div className="text-xs text-slate-500">metros{location?.altAccuracy ? ` (±${Math.round(location.altAccuracy)}m)` : ''}</div>
        </div>
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap size={14} className="text-amber-400" />
            <span className="text-xs font-semibold text-slate-300">Velocidad</span>
          </div>
          <div className="text-2xl font-bold">{location?.speed != null ? (location.speed * 3.6).toFixed(1) : '—'}</div>
          <div className="text-xs text-slate-500">km/h</div>
        </div>
      </div>

      {/* ── Proyección ── */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-2">
          <Target size={16} className="text-cyan-400" />
          <span className="font-semibold text-sm text-cyan-400">Proyección de punto</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Desde tu posición, con rumbo y distancia → calcula las coordenadas del punto.
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Rumbo (0–360°)</label>
              <input type="number" min="0" max="360" value={bearing} onChange={e => setBearing(e.target.value)}
                placeholder="ej. 45"
                className="w-full mt-1 bg-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 border border-slate-600" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Distancia (m)</label>
              <input type="number" min="0" value={distance} onChange={e => setDistance(e.target.value)}
                placeholder="ej. 500"
                className="w-full mt-1 bg-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 border border-slate-600" />
            </div>
          </div>
          <button onClick={handleProject}
            disabled={!location || !bearing || !distance}
            className="w-full bg-cyan-700 active:bg-cyan-600 disabled:opacity-40 rounded-xl py-2.5 text-sm font-semibold">
            Calcular punto
          </button>

          {projected && (
            <div className="bg-slate-700/70 rounded-xl p-3 border border-cyan-800/50 space-y-1">
              <div className="text-xs text-slate-400">Resultado</div>
              {(() => {
                const u = toUTM(projected.lat, projected.lon);
                const m = toMGRS(projected.lat, projected.lon);
                return (
                  <>
                    <div className="font-mono text-emerald-400 text-xs">
                      GD&nbsp; {projected.lat.toFixed(6)}°, {projected.lon.toFixed(6)}°
                    </div>
                    <div className="font-mono text-cyan-400 text-xs">
                      UTM&nbsp; {u.zone}{u.band} E{u.easting} N{u.northing}
                    </div>
                    {m && (
                      <div className="font-mono text-violet-400 text-xs">
                        MGRS {m.toString()}
                      </div>
                    )}
                  </>
                );
              })()}
              <div className="flex gap-3 pt-1">
                <button onClick={() => copy(`${projected.lat.toFixed(6)}, ${projected.lon.toFixed(6)}`)}
                  className="text-xs text-slate-400 active:text-white">📋 Copiar GD</button>
                <button onClick={() => { onProjectedPoint?.(projected); onViewMap?.(); }}
                  className="flex items-center gap-1 text-xs text-blue-400 active:text-blue-300 ml-auto">
                  <Map size={12} /> Ver en mapa
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Medir distancia ── */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-orange-400 text-base">📏</span>
          <span className="font-semibold text-sm text-orange-400">Medir distancia</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Ingresa las coordenadas del punto destino para calcular distancia y rumbo desde tu posición.
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Latitud destino</label>
              <input type="number" step="any" value={destLat} onChange={e => setDestLat(e.target.value)}
                placeholder="ej. 19.432600"
                className="w-full mt-1 bg-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 border border-slate-600" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Longitud destino</label>
              <input type="number" step="any" value={destLon} onChange={e => setDestLon(e.target.value)}
                placeholder="ej. -99.133200"
                className="w-full mt-1 bg-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 border border-slate-600" />
            </div>
          </div>
          <button onClick={handleDistCalc}
            disabled={!location || !destLat || !destLon}
            className="w-full bg-orange-700 active:bg-orange-600 disabled:opacity-40 rounded-xl py-2.5 text-sm font-semibold">
            Calcular
          </button>
          {distInfo && (
            <div className="bg-slate-700/70 rounded-xl p-3 border border-orange-800/50 grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-xs text-slate-400 mb-1">Distancia</div>
                <div className="font-mono text-orange-400 font-bold text-lg">{formatDist(distInfo.dist)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-400 mb-1">Rumbo</div>
                <div className="font-mono text-orange-400 font-bold text-lg">{Math.round(distInfo.bearing)}°</div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
