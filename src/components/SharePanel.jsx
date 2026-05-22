import { useState } from 'react';
import { Copy, Check, MessageCircle, Mail, Share2, ExternalLink } from 'lucide-react';

function toDMS(decimal, isLat) {
  const dir = isLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'O');
  const abs  = Math.abs(decimal);
  const deg  = Math.floor(abs);
  const minF = (abs - deg) * 60;
  const min  = Math.floor(minF);
  const sec  = ((minF - min) * 60).toFixed(2);
  return `${deg}° ${min}' ${sec}" ${dir}`;
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors ${
        copied ? 'bg-emerald-800 text-emerald-300' : 'bg-slate-700 text-slate-400 active:text-white'
      }`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? '¡Copiado!' : label}
    </button>
  );
}

export function SharePanel({ location, loading }) {
  const nativeShare = async (text) => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Mi ubicación', text }); } catch { /* dismissed */ }
    } else {
      try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400 text-sm animate-pulse">Obteniendo ubicación…</div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="text-5xl mb-4">📡</div>
        <div className="text-slate-400 text-sm">No hay ubicación disponible.</div>
        <div className="text-slate-500 text-xs mt-2">Activa el GPS y espera la señal.</div>
      </div>
    );
  }

  const decimal  = `${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`;
  const dms      = `${toDMS(location.lat, true)}, ${toDMS(location.lon, false)}`;
  const mapsUrl  = `https://www.google.com/maps?q=${location.lat},${location.lon}`;
  const earthUrl = `https://earth.google.com/web/@${location.lat},${location.lon},500a,1000d,35y,0h,0t,0r`;
  const wazeUrl  = `https://waze.com/ul?ll=${location.lat},${location.lon}&navigate=yes`;
  const appleMapsUrl = `https://maps.apple.com/?q=${location.lat},${location.lon}`;

  const fullMessage = `📍 Mi ubicación:\nDecimal: ${decimal}\nDMS: ${dms}\n\n🗺️ Ver en Google Maps:\n${mapsUrl}`;
  const shortMessage = `📍 ${decimal}\n${mapsUrl}`;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">

      {/* Coordinate formats */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700/50 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Decimal (WGS84)</span>
            <CopyButton value={decimal} label="Copiar" />
          </div>
          <div className="font-mono text-emerald-400 text-sm">{decimal}</div>
        </div>
        <div className="border-t border-slate-700 pt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Grados Min Seg</span>
            <CopyButton value={dms} label="Copiar" />
          </div>
          <div className="font-mono text-emerald-400 text-xs leading-relaxed">{dms}</div>
        </div>
        <div className="border-t border-slate-700 pt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Enlace Google Maps</span>
            <CopyButton value={mapsUrl} label="Copiar" />
          </div>
          <div className="font-mono text-blue-400 text-xs break-all">{mapsUrl}</div>
        </div>
      </div>

      {/* Share via apps */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700/50">
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">Compartir por</div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => nativeShare(fullMessage)}
            className="flex items-center justify-center gap-2 py-3 bg-blue-700 active:bg-blue-600 rounded-xl text-sm font-medium"
          >
            <Share2 size={16} />
            Compartir
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shortMessage)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 bg-[#25d366] active:bg-[#1da851] rounded-xl text-sm font-medium text-white"
          >
            <MessageCircle size={16} />
            WhatsApp
          </a>
          <a
            href={`sms:?body=${encodeURIComponent(shortMessage)}`}
            className="flex items-center justify-center gap-2 py-3 bg-slate-700 active:bg-slate-600 rounded-xl text-sm font-medium"
          >
            <MessageCircle size={16} />
            SMS
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent('Mi ubicación')}&body=${encodeURIComponent(fullMessage)}`}
            className="flex items-center justify-center gap-2 py-3 bg-slate-700 active:bg-slate-600 rounded-xl text-sm font-medium"
          >
            <Mail size={16} />
            Email
          </a>
        </div>
      </div>

      {/* Open in external apps */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700/50">
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">Abrir en</div>
        <div className="space-y-2">
          {[
            { icon: '🌍', label: 'Google Maps',  url: mapsUrl },
            { icon: '🌐', label: 'Google Earth', url: earthUrl },
            { icon: '🚗', label: 'Waze',         url: wazeUrl },
            { icon: '🍎', label: 'Apple Maps',   url: appleMapsUrl },
          ].map(({ icon, label, url }) => (
            <a
              key={label}
              href={url}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 bg-slate-700/60 active:bg-slate-600 rounded-xl"
            >
              <span className="text-xl">{icon}</span>
              <span className="text-sm font-medium">{label}</span>
              <ExternalLink size={13} className="ml-auto text-slate-400" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
