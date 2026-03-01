'use client';

import { useEffect, useState, useRef } from 'react';
import { Printer, ChevronDown, Loader2, Grid, Download } from 'lucide-react';

interface CardTile {
  id: string;
  imageUrl: string;
  uploader: string | null;
  gridX: number;
  gridY: number;
  cellNumber: number;
  colLabel: string;
  rowLabel: string;
}

interface PrintConfig {
  gridWidth: number;
  gridHeight: number;
  bgImageUrl?: string | null;
}

const PHOTO_SIZES = [
  { label: 'Full Card (6×4")', w: 152.4, h: 101.6 },
  { label: 'Large (5×3.5")', w: 127, h: 88.9 },
  { label: 'Medium (4×3")', w: 101.6, h: 76.2 },
  { label: 'Small (3×2")', w: 76.2, h: 50.8 },
  { label: 'Square (3×3")', w: 76.2, h: 76.2 },
];

export default function PhotoCardPage() {
  const [tiles, setTiles] = useState<CardTile[]>([]);
  const [config, setConfig] = useState<PrintConfig>({ gridWidth: 20, gridHeight: 15 });
  const [loading, setLoading] = useState(true);
  const [blending, setBlending] = useState(true);
  const [photoSizeIdx, setPhotoSizeIdx] = useState(2); // Default to Medium
  const [blendedUrls, setBlendedUrls] = useState<Record<string, string>>({});
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://mosaic-wall-backend.salurprabha.workers.dev';
  
  const selectedSize = PHOTO_SIZES[photoSizeIdx];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mosaicId = params.get('mosaicId');
    const url = mosaicId 
      ? `${backend}/api/print/sticker-sheet?mosaicId=${mosaicId}`
      : `${backend}/api/print/sticker-sheet`;

    const token = typeof window !== 'undefined' ? localStorage.getItem('mosaic_token') : null;
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(async data => {
        setTiles(data.tiles || []);
        if (data.config) setConfig(data.config);
        
        // If background image exists, perform blending
        if (data.config?.bgImageUrl && data.tiles?.length > 0) {
          await generateBlendedImages(data.tiles, data.config);
        }
        
        setLoading(false);
        setBlending(false);
      })
      .catch(() => { setLoading(false); setBlending(false); });
  }, [backend]);

  const generateBlendedImages = async (tiles: CardTile[], cfg: PrintConfig) => {
    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.src = cfg.bgImageUrl!;
    
    await new Promise((res) => { bgImg.onload = res; bgImg.onerror = res; });
    if (!bgImg.complete) return;

    const urls: Record<string, string> = {};
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use a high-quality resolution (e.g., 1800x1200 for 6x4 at 300dpi)
    canvas.width = 1800;
    canvas.height = 1200;

    for (const tile of tiles) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Background segment
      // Calculate source rect for this grid cell
      const sw = bgImg.width / cfg.gridWidth;
      const sh = bgImg.height / cfg.gridHeight;
      const sx = tile.gridX * sw;
      const sy = tile.gridY * sh;
      
      ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      // 2. Overlay Guest Photo with blending
      const guestImg = new Image();
      guestImg.crossOrigin = 'anonymous';
      guestImg.src = tile.imageUrl;
      
      await new Promise((res) => { guestImg.onload = res; guestImg.onerror = res; });
      
      if (guestImg.complete) {
        ctx.globalAlpha = 0.65; // Adjust reveal opacity
        
        // Fit guest image to canvas
        const scale = Math.max(canvas.width / guestImg.width, canvas.height / guestImg.height);
        const x = (canvas.width - guestImg.width * scale) / 2;
        const y = (canvas.height - guestImg.height * scale) / 2;
        ctx.drawImage(guestImg, x, y, guestImg.width * scale, guestImg.height * scale);
        ctx.globalAlpha = 1.0;
      }

      urls[tile.id] = canvas.toDataURL('image/jpeg', 0.9);
    }
    setBlendedUrls(urls);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center flex-col gap-4">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      <p className="text-slate-400 font-bold">{blending ? 'Generating blended photos...' : 'Loading tiles...'}</p>
    </div>
  );

  return (
    <>
      <div id="print-toolbar" className="no-print fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center gap-4 shadow-xl">
        <div>
          <h1 className="text-white font-black text-lg flex items-center gap-2">6×4 Photo Cards</h1>
          <p className="text-slate-400 text-xs">{tiles.length} cards · {config.gridWidth}×{config.gridHeight} grid</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <label className="absolute -top-1.5 left-2 px-1 bg-slate-900 text-[10px] text-slate-500 font-bold uppercase tracking-wider">Photo Size</label>
            <select
              value={photoSizeIdx}
              onChange={e => setPhotoSizeIdx(Number(e.target.value))}
              className="bg-slate-800 text-white text-sm font-bold border border-slate-700 rounded-xl px-4 py-2.5 pr-8 appearance-none cursor-pointer"
            >
              {PHOTO_SIZES.map((s, i) => (
                <option key={i} value={i}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all"
          >
            <Printer className="w-4 h-4" /> Print Cards
          </button>
        </div>
      </div>

      <div className="pt-20 min-h-screen bg-slate-950 p-8 flex flex-col items-center gap-8 no-print-padding">
        {tiles.length === 0 ? (
          <div className="mt-20 text-center">
            <p className="text-slate-500 font-bold text-lg">No photos to print.</p>
          </div>
        ) : (
          tiles.map(tile => (
            <div
              key={tile.id}
              className="card-page bg-white shadow-2xl relative flex items-center justify-center overflow-hidden"
              style={{
                width: '152.4mm',
                height: '101.6mm',
                pageBreakAfter: 'always',
                breakAfter: 'page',
              }}
            >
              {/* The Photo Container */}
              <div 
                className="relative overflow-hidden bg-slate-100"
                style={{
                  width: `${selectedSize.w}mm`,
                  height: `${selectedSize.h}mm`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={blendedUrls[tile.id] || tile.imageUrl}
                  alt={tile.uploader || ''}
                  className="w-full h-full object-cover"
                />
                
                {/* Labeling overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/70 flex justify-between items-end">
                  <div>
                    <p className="text-white font-black text-sm leading-none mb-1">{tile.uploader || 'Guest'}</p>
                    <p className="text-slate-300 font-bold text-[10px] uppercase tracking-widest">{tile.colLabel} · {tile.rowLabel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 font-black text-xl leading-none">#{tile.cellNumber}</p>
                  </div>
                </div>
              </div>

              {/* Cutting guides (screen only) */}
              <div className="absolute inset-0 border-[0.5mm] border-dashed border-slate-200 pointer-events-none no-print" />
            </div>
          ))
        )}
      </div>

      <style>{`
        @media print {
          #print-toolbar { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .card-page {
            box-shadow: none !important;
            margin: 0 !important;
          }
          @page { size: 6in 4in landscape; margin: 0; }
        }
        @media screen {
          .card-page {
            border-radius: 4px;
          }
        }
      `}</style>
    </>
  );
}
