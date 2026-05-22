import { useState, useRef } from 'react';
import { Search, MapPin, Clock, Navigation, X, ChevronRight } from 'lucide-react';

function formatDist(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function formatTime(s) {
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const STEP_ICONS = {
  depart:          '🚶',
  arrive:          '📍',
  turn:            { left: '↰', right: '↱', 'slight left': '↙', 'slight right': '↘', 'sharp left': '↩', 'sharp right': '↪', straight: '↑', uturn: '↩' },
  continue:        '↑',
  'new name':      '↑',
  merge:           '↗',
  roundabout:      '⭕',
  'exit roundabout':'↱',
  fork:            '⑂',
  'end of road':   '⊥',
};

function getStepIcon(type, mod) {
  const icon = STEP_ICONS[type];
  if (typeof icon === 'object') return icon[mod] ?? '↑';
  return icon ?? '↑';
}

function getStepLabel(type, mod, name) {
  const street = name ? ` en ${name}` : '';
  const dir = { left: 'a la izquierda', right: 'a la derecha', 'slight left': 'ligeramente a la izq.', 'slight right': 'ligeramente a la der.', 'sharp left': 'brusco a la izq.', 'sharp right': 'brusco a la der.', straight: 'recto', uturn: 'en U' };
  switch (type) {
    case 'depart':   return `Partir${street}`;
    case 'arrive':   return 'Llegaste al destino';
    case 'turn':     return `Girar ${dir[mod] ?? mod}${street}`;
    case 'continue':
    case 'new name': return `Continuar${street}`;
    case 'merge':    return `Incorporarse${street}`;
    case 'roundabout': return `Rotonda${street}`;
    case 'exit roundabout': return `Salir de rotonda${street}`;
    case 'fork':     return `Tomar ramal${mod?.includes('left') ? ' izq.' : ' der.'}${street}`;
    default:         return name || 'Continuar';
  }
}

export function RoutePanel({ location, route, setRoute, onViewMap }) {
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [steps,       setSteps]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const debounceRef = useRef(null);

  const searchPlace = (q) => {
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&accept-language=es`);
        const data = await res.json();
        setSuggestions(data);
      } catch { /* network error */ }
    }, 400);
  };

  const getRoute = async (destLat, destLon, destName) => {
    if (!location) { setError('Activa el GPS para calcular rutas'); return; }
    setLoading(true);
    setError(null);
    setSuggestions([]);
    try {
      const res  = await fetch(
        `https://router.project-osrm.org/route/v1/foot/${location.lon},${location.lat};${destLon},${destLat}?overview=full&geometries=geojson&steps=true`
      );
      const data = await res.json();
      if (data.code !== 'Ok') throw new Error('No se pudo calcular la ruta a pie.');
      const r = data.routes[0];
      setRoute({
        geometry:        r.geometry,
        distance:        r.distance,
        duration:        r.duration,
        destination:     { lat: destLat, lon: destLon },
        destinationName: destName,
      });
      setSteps(
        r.legs[0].steps
          .filter(s => s.maneuver.type !== 'notification')
          .map(s => ({
            type:     s.maneuver.type,
            modifier: s.maneuver.modifier,
            name:     s.name,
            distance: s.distance,
          }))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearRoute = () => {
    setRoute(null);
    setSteps([]);
    setQuery('');
    setError(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search bar */}
      <div className="flex-shrink-0 p-3 bg-slate-800 border-b border-slate-700/60">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => searchPlace(e.target.value)}
            placeholder="Buscar destino…"
            className="w-full bg-slate-700 rounded-xl pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setSuggestions([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 active:text-white"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="mt-2 bg-slate-700 rounded-xl overflow-hidden shadow-xl">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(s.display_name.split(',')[0]);
                  getRoute(parseFloat(s.lat), parseFloat(s.lon), s.display_name.split(',').slice(0, 2).join(','));
                }}
                className="w-full text-left px-3 py-2.5 text-sm active:bg-slate-600 border-b border-slate-600/60 last:border-0 flex items-start gap-2"
              >
                <MapPin size={13} className="mt-0.5 flex-shrink-0 text-red-400" />
                <span className="text-slate-200 line-clamp-2 leading-tight">{s.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="text-3xl animate-spin">🗺️</div>
            <div className="text-slate-400 text-sm">Calculando ruta a pie…</div>
          </div>
        )}

        {route && !loading && (
          <>
            {/* Route summary */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={15} className="text-red-400 flex-shrink-0" />
                <span className="font-medium text-sm truncate flex-1">{route.destinationName}</span>
                <button onClick={clearRoute} className="text-slate-400 active:text-white">
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-slate-700/60 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold">{formatDist(route.distance)}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Distancia</div>
                </div>
                <div className="bg-slate-700/60 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold flex items-center justify-center gap-1">
                    <Clock size={15} />
                    {formatTime(route.duration)}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">A pie</div>
                </div>
              </div>
              <button
                onClick={onViewMap}
                className="w-full py-2.5 bg-blue-600 active:bg-blue-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Navigation size={15} />
                Ver ruta en mapa
              </button>
            </div>

            {/* Turn-by-turn */}
            {steps.length > 0 && (
              <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700/50">
                <div className="px-4 py-3 border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Instrucciones paso a paso
                </div>
                {steps.map((step, i) => (
                  <div key={i}
                    className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/40 last:border-0">
                    <div className="w-9 h-9 flex-shrink-0 bg-slate-700 rounded-full flex items-center justify-center text-base">
                      {getStepIcon(step.type, step.modifier)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm leading-snug">
                        {getStepLabel(step.type, step.modifier, step.name)}
                      </div>
                      {step.distance > 0 && (
                        <div className="text-xs text-slate-500 mt-0.5">{formatDist(step.distance)}</div>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!route && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">🥾</div>
            <p className="text-slate-300 font-medium">Rutas a pie</p>
            <p className="text-slate-500 text-sm mt-1 max-w-xs">
              Busca un destino arriba para calcular tu ruta caminando con instrucciones paso a paso.
            </p>
            {!location && (
              <div className="mt-4 text-amber-400 text-xs bg-amber-900/30 border border-amber-700/50 rounded-xl px-4 py-2">
                ⚠️ Activa el GPS para calcular rutas
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
