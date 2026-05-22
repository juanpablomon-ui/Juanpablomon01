import { useState } from 'react';
import { Navigation, Mountain, Zap, RotateCw, Target } from 'lucide-react';
import { toDMS, toUTM } from '../utils/coords';

function getCardinal(h) {
  if (h == null) return '—';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(h / 45) % 8];
}

// Vincenty-like forward projection
function projectCoords(lat, lon, bearingDeg, distM) {
  const R = 6371000;
  const b = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lon * Math.PI) / 180;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(distM / R) + Math.cos(φ1) * Math.sin(distM / R) * Math.cos(b));
  const λ2 = λ1 + Math.atan2(Math.sin(b) * Math.sin(distM / R) * Math.cos(φ1), Math.cos(distM / R) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: (φ2 * 180) / Math.PI, lon: ((λ2 * 180) / Math.PI + 540) % 360 - 180 };
}

function CompassRose({ heading }) {
  const h = heading ?? 0;
  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28 drop-shadow-lg">
      <circle cx="50" cy="50" r="48" fill="#1e293b" stroke="#334155" strokeWidth="2" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(a => {
        const r1 = 44, r2 = a % 90 === 0 ? 37 : 40;
        const rad = (a * Math.PI) / 180;
        return (
          <line key={a}
            x1={50 + r1 * Math.sin(rad)} y1={50 - r1 * Math.cos(rad)}
            x2={50 + r2 * Math.sin(rad)} y2={50 - r2 * Math.cos(rad)}
            stroke={a % 90 === 0 ? '#64748b' : '#334155'} strokeWidth={a % 90 === 0 ? 1.5 : 1}
          />
        );
      })}
      {[
        { l: 'N', a: 0,   c: '#f87171' },
        { l: 'E', a: 90,  c: '#94a3b8' },
        { l: 'S', a: 180, c: '#94a3b8' },
        { l: 'O', a: 270, c: '#94a3b8' },
      ].map(({ l, a, c }) => {
        const rad = (a * Math.PI) / 180;
        return (
          <text key={l}
            x={50 + 30 * Math.sin(rad)} y={50 - 30 * Math.cos(rad) + 4}
            textAnchor="middle" fill={c} fontSize="11" fontWeight="bold" fontFamily="sans-serif"
          >{l}</text>
        );
      })}
      {/* Needle rotates to show current heading */}
      <g transform={`rotate(${h}, 50, 50)`}>
        <polygon points="50,12 46,50 50,45 54,50" fill="#3b82f6" />
        <polygon points="50,88 46,50 50,55 54,50" fill="#475569" />
        <circle cx="50" cy="50" r="4" fill="white" stroke="#0f172a" strokeWidth="1" />
      </g>
    </svg>
  );
}

export function LocationPanel({ location, error, loading, heading, requestCompassPermission }) {
  const [bearing,   setBearing]   = useState('');
  const [distance,  setDistance]  = useState('');
  const [projected, setProjected] = useState(null);

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
          <p className="text-slate-400 text-xs mt-3">Activa la ubicación del dispositivo y recarga la página.</p>
        </div>
      </div>
    );
  }

  const handleProject = () => {
    if (!location || !bearing || !distance) return;
    setProjected(projectCoords(location.lat, location.lon, parseFloat(bearing), parseFloat(distance)));
  };

  const copyToClipboard = (text) => navigator.clipboard?.writeText(text).catch(() => {});

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">

      {/* Coordinates */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <Navigation size={16} className="text-blue-400" />
          <span className="font-semibold text-sm">Coordenadas GPS</span>
          {location && (
            <button
              onClick={() => copyToClipboard(`${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`)}
              className="ml-auto text-xs text-slate-400 active:text-white px-2 py-0.5 rounded-lg bg-slate-700"
            >
              📋 Copiar
            </button>
          )}
        </div>
        {location ? (() => {
          const utm = toUTM(location.lat, location.lon);
          return (
            <div className="space-y-3">
              {/* Geographic decimal */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">Geográficas Decimales (GD)</div>
                  <button
                    onClick={() => copyToClipboard(`${location.lat.toFixed(7)}, ${location.lon.toFixed(7)}`)}
                    className="text-xs text-slate-500 active:text-white"
                  >📋</button>
                </div>
                <div className="font-mono text-emerald-400 text-sm leading-snug mt-0.5">
                  {location.lat.toFixed(7)}°&nbsp;&nbsp;{location.lat >= 0 ? 'N' : 'S'}<br />
                  {location.lon.toFixed(7)}°&nbsp;&nbsp;{location.lon >= 0 ? 'E' : 'O'}
                </div>
              </div>

              {/* DMS */}
              <div className="border-t border-slate-700 pt-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">Geográficas GMS (°&nbsp;′&nbsp;″)</div>
                  <button
                    onClick={() => copyToClipboard(`${toDMS(location.lat, true)}, ${toDMS(location.lon, false)}`)}
                    className="text-xs text-slate-500 active:text-white"
                  >📋</button>
                </div>
                <div className="font-mono text-emerald-400 text-xs leading-relaxed mt-0.5">
                  {toDMS(location.lat, true)}<br />
                  {toDMS(location.lon, false)}
                </div>
              </div>

              {/* UTM */}
              <div className="border-t border-slate-700 pt-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">UTM (WGS84)</div>
                  <button
                    onClick={() => copyToClipboard(
                      `${utm.zone}${utm.band} ${utm.hemisphere} E:${utm.easting} N:${utm.northing}`
                    )}
                    className="text-xs text-slate-500 active:text-white"
                  >📋</button>
                </div>
                <div className="font-mono text-cyan-400 text-sm leading-relaxed mt-0.5">
                  <span className="text-slate-400 text-xs">Zona </span>{utm.zone}{utm.band}
                  &nbsp;·&nbsp;
                  <span className="text-slate-400 text-xs">H </span>{utm.hemisphere}<br />
                  <span className="text-slate-400 text-xs">E&nbsp;</span>
                  {utm.easting.toLocaleString('es')} m<br />
                  <span className="text-slate-400 text-xs">N&nbsp;</span>
                  {utm.northing.toLocaleString('es')} m
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Precisión GPS: ±{location.accuracy ? Math.round(location.accuracy) : '—'} m
              </div>
            </div>
          );
        })() : (
          <div className="text-slate-500 text-sm">Sin señal GPS</div>
        )}
      </div>

      {/* Compass */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-amber-400 text-base">🧭</span>
          <span className="font-semibold text-sm">Brújula</span>
          <button
            onClick={requestCompassPermission}
            className="ml-auto flex items-center gap-1 text-xs text-slate-400 active:text-white"
          >
            <RotateCw size={12} />
            Activar
          </button>
        </div>
        <div className="flex items-center gap-5">
          <CompassRose heading={heading} />
          <div>
            <div className="text-4xl font-bold tabular-nums">
              {heading != null ? `${Math.round(heading)}°` : '—°'}
            </div>
            <div className="text-xl text-slate-400 font-semibold mt-0.5">
              {getCardinal(heading)}
            </div>
            {heading == null && (
              <div className="text-xs text-slate-500 mt-1">
                Activa la brújula arriba
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Altitude & Speed */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Mountain size={14} className="text-purple-400" />
            <span className="text-xs font-semibold text-slate-300">Altitud</span>
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {location?.alt != null ? `${Math.round(location.alt)}` : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            metros{location?.altAccuracy ? ` (±${Math.round(location.altAccuracy)}m)` : ''}
          </div>
        </div>
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap size={14} className="text-amber-400" />
            <span className="text-xs font-semibold text-slate-300">Velocidad</span>
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {location?.speed != null ? (location.speed * 3.6).toFixed(1) : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">km/h</div>
        </div>
      </div>

      {/* Coordinate Projection */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-cyan-400" />
          <span className="font-semibold text-sm text-cyan-400">Proyectar Coordenadas</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">Calcula las coordenadas de un punto según rumbo y distancia desde tu posición.</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">Rumbo (0–360°)</label>
            <input
              type="number" min="0" max="360"
              value={bearing} onChange={e => setBearing(e.target.value)}
              placeholder="ej. 45"
              className="w-full mt-1 bg-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 border border-slate-600"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Distancia (metros)</label>
            <input
              type="number" min="0"
              value={distance} onChange={e => setDistance(e.target.value)}
              placeholder="ej. 500"
              className="w-full mt-1 bg-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 border border-slate-600"
            />
          </div>
          <button
            onClick={handleProject}
            disabled={!location || !bearing || !distance}
            className="w-full bg-cyan-600 active:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-2.5 text-sm font-semibold transition-colors"
          >
            Calcular punto proyectado
          </button>
          {projected && (
            <div className="bg-slate-700/70 rounded-xl p-3 border border-cyan-800/50">
              <div className="text-xs text-slate-400 mb-1">Coordenadas del punto objetivo</div>
              <div className="font-mono text-emerald-400 text-sm leading-relaxed">
                {projected.lat.toFixed(7)}°<br />
                {projected.lon.toFixed(7)}°
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => copyToClipboard(`${projected.lat.toFixed(6)}, ${projected.lon.toFixed(6)}`)}
                  className="text-xs text-slate-400 active:text-white"
                >
                  📋 Copiar
                </button>
                <a
                  href={`https://www.google.com/maps?q=${projected.lat},${projected.lon}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-400 active:text-blue-300 ml-auto"
                >
                  Ver en Maps ↗
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
