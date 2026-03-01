'use client';

import { useEffect, useState, useRef } from 'react';
import { Printer, Loader2, Grid } from 'lucide-react';

interface BackdropConfig {
  gridWidth?: number;
  gridHeight?: number;
  bgImageUrl?: string | null;
  gapSize?: number;
  borderRadius?: number;
}

export default function BackdropPage() {
  const [cfg, setCfg] = useState<BackdropConfig>({});
  const [loading, setLoading] = useState(true);
  const [highlight, setHighlight] = useState<string | null>(null);
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://mosaic-wall-backend.salurprabha.workers.dev';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mosaicId = params.get('mosaicId');
    const url = mosaicId 
      ? `${backend}/api/print/backdrop-config?mosaicId=${mosaicId}`
      : `${backend}/api/print/backdrop-config`;

    const token = typeof window !== 'undefined' ? localStorage.getItem('mosaic_token') : null;
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setCfg(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [backend]);

  const gw = cfg.gridWidth ?? 20;
  const gh = cfg.gridHeight ?? 15;
  const totalCells = gw * gh;

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
    </div>
  );

  return (
    <>
      {/* Toolbar */}
      <div id="bd-toolbar" className="no-print fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center gap-4 shadow-xl">
        <div>
          <h1 className="text-white font-black text-lg flex items-center gap-2"><Grid className="w-5 h-5 text-indigo-400" /> Backdrop Template</h1>
          <p className="text-slate-400 text-xs">{gw}×{gh} grid · {totalCells} cells · numbers match your sticker sheet</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <p className="text-slate-500 text-sm hidden md:block">Tip: Print at 150–300 DPI on a large-format printer</p>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all"
          >
            <Printer className="w-4 h-4" /> Print Template
          </button>
        </div>
      </div>

      {/* Grid canvas area */}
      <div className="pt-16 min-h-screen bg-slate-950 p-6 flex flex-col items-center">
        <div
          id="backdrop-grid"
          className="relative bg-slate-900 overflow-hidden"
          style={{
            width: '100%',
            maxWidth: `${gw * 60}px`,
            aspectRatio: `${gw} / ${gh}`,
            backgroundImage: cfg.bgImageUrl ? `url(${cfg.bgImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '2px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Grid overlay */}
          <div
            className="absolute inset-0"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${gw}, 1fr)`,
              gridTemplateRows: `repeat(${gh}, 1fr)`,
              gap: '1px',
            }}
          >
            {Array.from({ length: totalCells }).map((_, idx) => {
              const x = idx % gw;
              const y = Math.floor(idx / gw);
              const cellNum = idx + 1;
              const key = `${x},${y}`;
              const isHighlighted = highlight === key;
              return (
                <div
                  key={key}
                  onClick={() => setHighlight(isHighlighted ? null : key)}
                  className={`relative flex flex-col items-center justify-center cursor-pointer transition-all border ${
                    isHighlighted
                      ? 'bg-yellow-400/30 border-yellow-400/80 z-10'
                      : 'bg-black/30 border-white/10 hover:bg-white/10 hover:border-white/30'
                  }`}
                >
                  {/* Cell number */}
                  <span
                    className={`font-black text-center leading-none select-none ${isHighlighted ? 'text-yellow-300' : 'text-white/60'}`}
                    style={{ fontSize: `clamp(5px, ${100 / gw * 0.35}vw, 14px)` }}
                  >
                    {cellNum}
                  </span>
                  {/* Col·Row label */}
                  <span
                    className={`font-bold text-center leading-none select-none mt-0.5 ${isHighlighted ? 'text-yellow-200' : 'text-white/30'}`}
                    style={{ fontSize: `clamp(4px, ${100 / gw * 0.22}vw, 9px)` }}
                  >
                    C{x + 1}·R{y + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 items-center justify-center text-sm text-slate-500">
          <span>Click any cell to highlight it</span>
          <span>·</span>
          <span>Numbers correspond to your printed sticker sheet</span>
          <span>·</span>
          <span className="text-indigo-400">C = Column, R = Row</span>
        </div>
      </div>

      <style>{`
        @media print {
          #bd-toolbar { display: none !important; }
          body { margin: 0; background: white; }
          #backdrop-grid {
            max-width: 100% !important;
            width: 100% !important;
            height: auto !important;
          }
          @page { size: A3 landscape; margin: 5mm; }
        }
      `}</style>
    </>
  );
}
