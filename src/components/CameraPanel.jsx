import { useState, useRef, useEffect } from 'react';
import { Camera, Download, Share2, RotateCcw, X } from 'lucide-react';
import { toDMS, toUTM, toMGRS } from '../utils/coords';

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function CameraPanel({ location }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const [stream,   setStream]   = useState(null);
  const [captured, setCaptured] = useState(null);
  const [error,    setError]    = useState(null);
  const [facing,   setFacing]   = useState('environment');

  const startCamera = async (facingMode = facing) => {
    try {
      const prev = stream;
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (prev) prev.getTracks().forEach(t => t.stop());
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
      setCaptured(null);
      setError(null);
    } catch (err) {
      setError(`No se pudo acceder a la cámara: ${err.message}`);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  };

  const flipCamera = async () => {
    const next = facing === 'environment' ? 'user' : 'environment';
    setFacing(next);
    await startCamera(next);
  };

  const capturePhoto = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (location) {
      const now      = new Date();
      const utm      = toUTM(location.lat, location.lon);
      const mgrs     = toMGRS(location.lat, location.lon);
      const fontSize = Math.max(20, Math.floor(canvas.width * 0.022));
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;

      const lines = [
        '── Geográficas (WGS84) ──',
        `LAT: ${location.lat.toFixed(6)}°`,
        `LON: ${location.lon.toFixed(6)}°`,
        '── UTM ──',
        `Z ${utm.zone}${utm.band} ${utm.hemisphere}`,
        `E: ${utm.easting.toLocaleString('es')} m`,
        `N: ${utm.northing.toLocaleString('es')} m`,
        ...(mgrs ? [
          '── MGRS ──',
          `${mgrs.gzd} ${mgrs.sqid} ${mgrs.e} ${mgrs.n}`,
        ] : []),
        '─────────────────────────',
        ...(location.alt != null ? [`ALT: ${Math.round(location.alt)} m`] : []),
        `ACC: ±${Math.round(location.accuracy || 0)} m`,
        now.toLocaleString('es-MX'),
      ];

      const lineH   = fontSize * 1.65;
      const pad     = fontSize * 0.7;
      const maxW    = Math.max(...lines.map(l => ctx.measureText(l).width));
      const boxW    = maxW + pad * 2.5;
      const boxH    = lines.length * lineH + pad * 1.5;
      const boxX    = pad;
      const boxY    = canvas.height - boxH - pad;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
      drawRoundRect(ctx, boxX, boxY, boxW, boxH, 10);
      ctx.fill();

      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth   = 1.5;
      drawRoundRect(ctx, boxX, boxY, boxW, boxH, 10);
      ctx.stroke();

      ctx.fillStyle = '#00ff88';
      lines.forEach((line, i) => {
        ctx.fillText(line, boxX + pad, boxY + pad + (i + 1) * lineH - fontSize * 0.3);
      });
    }

    setCaptured(canvas.toDataURL('image/jpeg', 0.92));
    stopCamera();
  };

  const downloadPhoto = () => {
    if (!captured) return;
    const a = document.createElement('a');
    a.href     = captured;
    a.download = `GeoOrient_${Date.now()}.jpg`;
    a.click();
  };

  const sharePhoto = async () => {
    if (!captured) return;
    if (navigator.share) {
      try {
        const blob = await (await fetch(captured)).blob();
        const file = new File([blob], 'ubicacion.jpg', { type: 'image/jpeg' });
        await navigator.share({
          title: 'Mi ubicación – GeoOrient',
          text:  location ? `📍 ${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}` : '',
          files: [file],
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    downloadPhoto();
  };

  useEffect(() => () => stopCamera(), []);

  return (
    <div className="h-full flex flex-col bg-black">
      <canvas ref={canvasRef} className="hidden" />

      {/* Initial screen */}
      {!stream && !captured && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
          <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center">
            <Camera size={36} className="text-blue-400" />
          </div>
          <div className="text-center">
            <h2 className="font-bold text-lg">Foto con Coordenadas</h2>
            <p className="text-slate-400 text-sm mt-1">
              Toma una foto y las coordenadas GPS<br />quedarán grabadas en la imagen
            </p>
          </div>
          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-xl p-3 text-red-300 text-sm text-center max-w-xs">
              {error}
            </div>
          )}
          {!location && (
            <div className="bg-amber-900/40 border border-amber-700 rounded-xl p-3 text-amber-300 text-xs text-center max-w-xs">
              ⚠️ Sin GPS activo. La foto no tendrá coordenadas.
            </div>
          )}
          <button
            onClick={() => startCamera()}
            className="bg-blue-600 active:bg-blue-700 px-8 py-3 rounded-full font-semibold flex items-center gap-2 text-sm"
          >
            <Camera size={18} />
            Abrir Cámara
          </button>
        </div>
      )}

      {/* Camera view */}
      {stream && !captured && (
        <div className="flex-1 relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay playsInline muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Live GPS overlay */}
          {location && (() => {
            const u = toUTM(location.lat, location.lon);
            const m = toMGRS(location.lat, location.lon);
            return (
              <div className="absolute bottom-24 left-3 font-mono text-xs leading-relaxed
                bg-black/70 border border-green-500/70 rounded-xl px-3 py-2 text-green-400 space-y-0.5">
                <div className="text-green-600 text-[10px]">─ Geográficas ─</div>
                <div>LAT: {location.lat.toFixed(6)}°</div>
                <div>LON: {location.lon.toFixed(6)}°</div>
                <div className="text-green-600 text-[10px] pt-0.5">─ UTM ─</div>
                <div>Z {u.zone}{u.band} {u.hemisphere}</div>
                <div>E: {u.easting.toLocaleString('es')} m</div>
                <div>N: {u.northing.toLocaleString('es')} m</div>
                {m && (
                  <>
                    <div className="text-green-600 text-[10px] pt-0.5">─ MGRS ─</div>
                    <div className="text-violet-300">{m.gzd} {m.sqid} {m.e} {m.n}</div>
                  </>
                )}
                {location.alt != null && (
                  <div className="pt-0.5">ALT: {Math.round(location.alt)} m</div>
                )}
                <div>ACC: ±{Math.round(location.accuracy || 0)} m</div>
              </div>
            );
          })()}

          {/* Camera controls */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around py-5
            bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            <button onClick={stopCamera}
              className="w-11 h-11 rounded-full bg-slate-800/80 flex items-center justify-center">
              <X size={20} />
            </button>
            <button onClick={capturePhoto}
              className="w-18 h-18 rounded-full border-4 border-white bg-white/20 active:scale-95 transition-transform"
              style={{ width: 68, height: 68 }}
            >
              <div className="w-full h-full rounded-full bg-white/80" />
            </button>
            <button onClick={flipCamera}
              className="w-11 h-11 rounded-full bg-slate-800/80 flex items-center justify-center">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Captured preview */}
      {captured && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-black flex items-center justify-center">
            <img src={captured} alt="Captura GPS" className="max-w-full max-h-full object-contain" />
          </div>
          <div className="flex gap-3 p-4 bg-slate-900">
            <button
              onClick={() => { setCaptured(null); startCamera(); }}
              className="flex-1 py-3 bg-slate-700 active:bg-slate-600 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Camera size={17} />
              Nueva foto
            </button>
            <button
              onClick={downloadPhoto}
              className="flex-1 py-3 bg-blue-700 active:bg-blue-600 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Download size={17} />
              Guardar
            </button>
            <button
              onClick={sharePhoto}
              className="flex-1 py-3 bg-emerald-700 active:bg-emerald-600 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Share2 size={17} />
              Compartir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
