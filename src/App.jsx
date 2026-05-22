import { useState } from 'react';
import { Map, Navigation, Camera, Share2, Route } from 'lucide-react';
import { useGeolocation } from './hooks/useGeolocation';
import { MapView }        from './components/MapView';
import { LocationPanel }  from './components/LocationPanel';
import { CameraPanel }    from './components/CameraPanel';
import { SharePanel }     from './components/SharePanel';
import { RoutePanel }     from './components/RoutePanel';

const TABS = [
  { id: 'map',      label: 'Mapa',      Icon: Map },
  { id: 'location', label: 'Ubicación', Icon: Navigation },
  { id: 'camera',   label: 'Cámara',    Icon: Camera },
  { id: 'share',    label: 'Compartir', Icon: Share2 },
  { id: 'routes',   label: 'Rutas',     Icon: Route },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [route, setRoute]         = useState(null);
  const geo = useGeolocation();

  const switchTo = (id) => setActiveTab(id);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white select-none">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5"
        style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)' }}>
        <span className="text-xl">🧭</span>
        <span className="font-bold text-base tracking-wide">GeoOrient</span>
        <div className="ml-auto flex items-center gap-2">
          {geo.location ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              GPS
            </span>
          ) : geo.loading ? (
            <span className="text-xs text-amber-400">Buscando GPS…</span>
          ) : (
            <span className="text-xs text-red-400">Sin GPS</span>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden tab-content">
        {activeTab === 'map'      && <MapView      {...geo} route={route} />}
        {activeTab === 'location' && <LocationPanel {...geo} />}
        {activeTab === 'camera'   && <CameraPanel  location={geo.location} />}
        {activeTab === 'share'    && <SharePanel   {...geo} />}
        {activeTab === 'routes'   && (
          <RoutePanel {...geo} route={route} setRoute={setRoute} onViewMap={() => switchTo('map')} />
        )}
      </main>

      {/* Bottom navigation */}
      <nav className="flex-shrink-0 bg-slate-800 border-t border-slate-700/60">
        <div className="flex">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => switchTo(id)}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
                activeTab === id
                  ? 'text-blue-400'
                  : 'text-slate-500 active:text-slate-300'
              }`}
            >
              <Icon size={20} strokeWidth={activeTab === id ? 2.2 : 1.8} />
              <span className="text-[10px] leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
