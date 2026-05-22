import { useState, useRef, useEffect } from 'react';
import {
  MapContainer, TileLayer, CircleMarker, Polyline,
  Popup, Tooltip, useMap, useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Layers, ExternalLink, Ruler, Trash2, Undo2 } from 'lucide-react';
import { haversineDistance, formatDist, initialBearing } from '../utils/coords';

// ── Map helpers ──────────────────────────────────────────────────────────────
function AutoCenter({ location }) {
  const map     = useMap();
  const done    = useRef(false);
  useEffect(() => {
    if (location && !done.current) {
      map.setView([location.lat, location.lon], 16);
      done.current = true;
    }
  }, [location]);
  return null;
}

function ManualCenter({ trigger }) {
  const map = useMap();
  useEffect(() => {
    if (trigger) map.setView(trigger, Math.max(map.getZoom(), 16));
  }, [trigger]);
  return null;
}

function MeasureClickHandler({ onAdd }) {
  const map = useMap();
  useEffect(() => {
    map.getContainer().style.cursor = 'crosshair';
    return () => { map.getContainer().style.cursor = ''; };
  }, []);
  useMapEvents({ click: (e) => onAdd([e.latlng.lat, e.latlng.lng]) });
  return null;
}

// ── Tile layers ──────────────────────────────────────────────────────────────
const TILES = {
  osm:       { label: 'Mapa',      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',                                                    attribution: '© OpenStreetMap contributors' },
  satellite: { label: 'Satélite',  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',          attribution: '© Esri' },
  topo:      { label: 'Topo',      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                                                      attribution: '© OpenTopoMap' },
};

// ── Component ────────────────────────────────────────────────────────────────
export function MapView({ location, error, loading, route, projectedPoint }) {
  const [tile,          setTile]          = useState('osm');
  const [showLayers,    setShowLayers]    = useState(false);
  const [centerTrigger, setCenterTrigger] = useState(null);
  const [measureMode,   setMeasureMode]   = useState(false);
  const [measurePts,    setMeasurePts]    = useState([]);

  const openGoogleMaps  = () => location && window.open(`https://www.google.com/maps?q=${location.lat},${location.lon}`, '_blank');
  const openGoogleEarth = () => location && window.open(`https://earth.google.com/web/@${location.lat},${location.lon},500a,1000d,35y,0h,0t,0r`, '_blank');

  // Build measure segments
  const segments = measurePts.slice(1).map((pt, i) => ({
    from: measurePts[i],
    to:   pt,
    dist: haversineDistance(measurePts[i][0], measurePts[i][1], pt[0], pt[1]),
  }));
  const totalDist = segments.reduce((s, seg) => s + seg.dist, 0);

  const toggleMeasure = () => {
    setMeasureMode(v => !v);
    setMeasurePts([]);
  };

  const defaultCenter = [19.4326, -99.1332]; // CDMX fallback

  return (
    <div className="relative h-full">
      <MapContainer
        center={location ? [location.lat, location.lon] : defaultCenter}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer key={tile} url={TILES[tile].url} attribution={TILES[tile].attribution} />
        <AutoCenter location={location} />
        <ManualCenter trigger={centerTrigger} />

        {/* Measurement click handler */}
        {measureMode && (
          <MeasureClickHandler onAdd={pt => setMeasurePts(prev => [...prev, pt])} />
        )}

        {/* ── Current location ── */}
        {location && (
          <>
            <CircleMarker
              center={[location.lat, location.lon]}
              radius={28}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1, dashArray: '4 4' }}
            />
            <CircleMarker
              center={[location.lat, location.lon]}
              radius={9}
              pathOptions={{ color: 'white', fillColor: '#3b82f6', fillOpacity: 1, weight: 3 }}
            >
              <Popup>
                <div className="text-sm font-medium">📍 Tu ubicación</div>
                <div className="font-mono text-xs text-gray-600 mt-1">
                  {location.lat.toFixed(6)}°<br />
                  {location.lon.toFixed(6)}°
                </div>
              </Popup>
            </CircleMarker>
          </>
        )}

        {/* ── Route ── */}
        {route?.geometry && (
          <Polyline
            positions={route.geometry.coordinates.map(([lon, lat]) => [lat, lon])}
            pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.85, lineCap: 'round' }}
          />
        )}
        {route?.destination && (
          <CircleMarker
            center={[route.destination.lat, route.destination.lon]}
            radius={9}
            pathOptions={{ color: 'white', fillColor: '#ef4444', fillOpacity: 1, weight: 3 }}
          >
            <Popup><div className="text-sm font-medium">🎯 {route.destinationName || 'Destino'}</div></Popup>
          </CircleMarker>
        )}

        {/* ── Projected point ── */}
        {projectedPoint && location && (
          <>
            <Polyline
              positions={[[location.lat, location.lon], [projectedPoint.lat, projectedPoint.lon]]}
              pathOptions={{ color: '#f59e0b', weight: 2, dashArray: '8 5', opacity: 0.9 }}
            />
            <CircleMarker
              center={[projectedPoint.lat, projectedPoint.lon]}
              radius={9}
              pathOptions={{ color: 'white', fillColor: '#f59e0b', fillOpacity: 1, weight: 3 }}
            >
              <Popup>
                <div className="text-sm font-medium">🎯 Punto proyectado</div>
                <div className="font-mono text-xs text-gray-600 mt-1">
                  {projectedPoint.lat.toFixed(6)}°<br />
                  {projectedPoint.lon.toFixed(6)}°
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Rumbo: {Math.round(initialBearing(location.lat, location.lon, projectedPoint.lat, projectedPoint.lon))}°
                  &nbsp;·&nbsp;
                  {formatDist(haversineDistance(location.lat, location.lon, projectedPoint.lat, projectedPoint.lon))}
                </div>
              </Popup>
            </CircleMarker>
          </>
        )}

        {/* ── Measurement points & lines ── */}
        {measurePts.length > 1 && (
          <Polyline
            positions={measurePts}
            pathOptions={{ color: '#fb923c', weight: 2.5, dashArray: '6 4', opacity: 0.9 }}
          />
        )}
        {measurePts.map((pt, i) => (
          <CircleMarker
            key={i}
            center={pt}
            radius={6}
            pathOptions={{ color: 'white', fillColor: i === 0 ? '#22c55e' : '#fb923c', fillOpacity: 1, weight: 2 }}
          >
            <Tooltip permanent direction="top" offset={[0, -8]}
              className="!bg-orange-900/90 !text-orange-100 !border-orange-600 !text-xs !px-1.5 !py-0.5 !rounded">
              {i === 0 ? 'Inicio' : formatDist(segments.slice(0, i).reduce((s, seg) => s + seg.dist, 0))}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* ── Map controls ── */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        {/* Tile switcher */}
        <div className="relative">
          <button onClick={() => setShowLayers(v => !v)}
            className="bg-white rounded-lg p-2.5 shadow-lg text-slate-700 active:bg-slate-100">
            <Layers size={18} />
          </button>
          {showLayers && (
            <div className="absolute right-0 top-12 bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
              {Object.entries(TILES).map(([key, { label }]) => (
                <button key={key}
                  onClick={() => { setTile(key); setShowLayers(false); }}
                  className={`block w-full px-5 py-2.5 text-sm text-left whitespace-nowrap ${
                    tile === key ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center on me */}
        {location && (
          <button
            onClick={() => setCenterTrigger({ pos: [location.lat, location.lon], ts: Date.now() })}
            className="bg-white rounded-lg p-2.5 shadow-lg text-slate-700 active:bg-slate-100">
            <Crosshair size={18} />
          </button>
        )}

        {/* Measure toggle */}
        <button
          onClick={toggleMeasure}
          className={`rounded-lg p-2.5 shadow-lg transition-colors ${
            measureMode
              ? 'bg-orange-500 text-white'
              : 'bg-white text-slate-700 active:bg-slate-100'
          }`}
          title="Medir distancia">
          <Ruler size={18} />
        </button>
      </div>

      {/* ── External maps ── */}
      {location && (
        <div className="absolute bottom-3 left-3 z-[1000] flex gap-2">
          <button onClick={openGoogleMaps}
            className="bg-white rounded-lg px-3 py-1.5 shadow-lg text-slate-700 text-xs flex items-center gap-1 active:bg-slate-100">
            <ExternalLink size={11} /> Google Maps
          </button>
          <button onClick={openGoogleEarth}
            className="bg-white rounded-lg px-3 py-1.5 shadow-lg text-slate-700 text-xs flex items-center gap-1 active:bg-slate-100">
            <ExternalLink size={11} /> Google Earth
          </button>
        </div>
      )}

      {/* ── Measurement panel ── */}
      {measureMode && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] w-72 max-w-[92vw]">
          <div className="bg-slate-900/95 backdrop-blur border border-orange-600/60 rounded-2xl p-3 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Ruler size={14} className="text-orange-400" />
              <span className="text-xs font-semibold text-orange-400">Medición de distancia</span>
              <div className="ml-auto flex gap-1">
                <button
                  onClick={() => setMeasurePts(pts => pts.slice(0, -1))}
                  disabled={measurePts.length === 0}
                  className="p-1 rounded text-slate-400 active:text-white disabled:opacity-30"
                  title="Deshacer">
                  <Undo2 size={14} />
                </button>
                <button
                  onClick={() => setMeasurePts([])}
                  disabled={measurePts.length === 0}
                  className="p-1 rounded text-slate-400 active:text-red-400 disabled:opacity-30"
                  title="Limpiar">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {measurePts.length === 0 && (
              <div className="text-xs text-slate-400 text-center py-1">
                Toca el mapa para añadir puntos
              </div>
            )}

            {segments.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {segments.map((seg, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-slate-400">Seg {i + 1}</span>
                    <span className="text-orange-300 font-mono">{formatDist(seg.dist)}</span>
                  </div>
                ))}
                <div className="border-t border-slate-700 pt-1 flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Total</span>
                  <span className="text-orange-400 font-mono">{formatDist(totalDist)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center z-[999]">
          <div className="bg-slate-800 rounded-2xl p-6 text-center shadow-2xl">
            <div className="text-4xl mb-3 animate-bounce">📍</div>
            <div className="text-sm text-slate-300">Obteniendo ubicación GPS…</div>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="absolute bottom-16 left-3 right-3 z-[999]">
          <div className="bg-red-900/90 backdrop-blur rounded-xl p-3 text-sm text-red-200 border border-red-700">
            ⚠️ {error}
          </div>
        </div>
      )}
    </div>
  );
}
