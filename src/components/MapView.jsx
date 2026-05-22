import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Layers, ExternalLink } from 'lucide-react';

const TILES = {
  osm: {
    label: 'Mapa',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
  satellite: {
    label: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
  },
  topo: {
    label: 'Topo',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap',
  },
};

function RecenterMap({ pos }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.setView(pos, Math.max(map.getZoom(), 16));
  }, [pos]);
  return null;
}

export function MapView({ location, error, loading, route }) {
  const [tile, setTile]             = useState('osm');
  const [showLayers, setShowLayers] = useState(false);
  const [centerKey, setCenterKey]   = useState(0);

  const center = location
    ? [location.lat, location.lon]
    : [19.4326, -99.1332]; // CDMX default

  const openGoogleMaps  = () => location && window.open(`https://www.google.com/maps?q=${location.lat},${location.lon}`, '_blank');
  const openGoogleEarth = () => location && window.open(`https://earth.google.com/web/@${location.lat},${location.lon},500a,1000d,35y,0h,0t,0r`, '_blank');

  return (
    <div className="relative h-full">
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          key={tile}
          url={TILES[tile].url}
          attribution={TILES[tile].attribution}
        />

        {/* Auto-center on first fix */}
        {location && centerKey === 0 && (
          <RecenterMap pos={[location.lat, location.lon]} />
        )}

        {/* Accuracy ring */}
        {location && (
          <CircleMarker
            center={[location.lat, location.lon]}
            radius={28}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.12, weight: 1, dashArray: '4 4' }}
          />
        )}

        {/* Location dot */}
        {location && (
          <CircleMarker
            center={[location.lat, location.lon]}
            radius={9}
            pathOptions={{ color: 'white', fillColor: '#3b82f6', fillOpacity: 1, weight: 3 }}
          >
            <Popup>
              <div className="text-sm font-medium">📍 Tu ubicación</div>
              <div className="text-xs text-gray-600 font-mono mt-1">
                {location.lat.toFixed(6)}°<br />
                {location.lon.toFixed(6)}°
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* Route polyline */}
        {route?.geometry && (
          <Polyline
            positions={route.geometry.coordinates.map(([lon, lat]) => [lat, lon])}
            pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
          />
        )}

        {/* Destination marker */}
        {route?.destination && (
          <CircleMarker
            center={[route.destination.lat, route.destination.lon]}
            radius={9}
            pathOptions={{ color: 'white', fillColor: '#ef4444', fillOpacity: 1, weight: 3 }}
          >
            <Popup><div className="text-sm font-medium">🎯 {route.destinationName || 'Destino'}</div></Popup>
          </CircleMarker>
        )}
      </MapContainer>

      {/* Layer switcher */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <div className="relative">
          <button
            onClick={() => setShowLayers(v => !v)}
            className="bg-white rounded-lg p-2.5 shadow-lg text-slate-700 active:bg-slate-100"
          >
            <Layers size={18} />
          </button>
          {showLayers && (
            <div className="absolute right-0 top-12 bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
              {Object.entries(TILES).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => { setTile(key); setShowLayers(false); }}
                  className={`block w-full px-5 py-2.5 text-sm text-left whitespace-nowrap ${
                    tile === key ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {location && (
          <button
            onClick={() => setCenterKey(k => k + 1)}
            className="bg-white rounded-lg p-2.5 shadow-lg text-slate-700 active:bg-slate-100"
            title="Centrar en mi ubicación"
          >
            <Crosshair size={18} />
          </button>
        )}

        {/* Hidden helper to recenter */}
        {location && centerKey > 0 && (
          <MapContainer
            key={`helper-${centerKey}`}
            center={[location.lat, location.lon]}
            zoom={16}
            style={{ display: 'none' }}
          />
        )}
      </div>

      {/* External maps */}
      {location && (
        <div className="absolute bottom-3 left-3 z-[1000] flex gap-2">
          <button
            onClick={openGoogleMaps}
            className="bg-white rounded-lg px-3 py-1.5 shadow-lg text-slate-700 text-xs flex items-center gap-1 active:bg-slate-100"
          >
            <ExternalLink size={11} />
            Google Maps
          </button>
          <button
            onClick={openGoogleEarth}
            className="bg-white rounded-lg px-3 py-1.5 shadow-lg text-slate-700 text-xs flex items-center gap-1 active:bg-slate-100"
          >
            <ExternalLink size={11} />
            Google Earth
          </button>
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
