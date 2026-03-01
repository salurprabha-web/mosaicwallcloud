'use client';

import { useEffect, useState, useRef } from 'react';
import { Printer, ChevronDown, Loader2, Download } from 'lucide-react';

interface StickerTile {
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

const STICKER_SIZES: { label: string; mm: number; perRow: number }[] = [
  { label: '5 × 5 cm', mm: 50, perRow: 4 },
  { label: '7 × 7 cm', mm: 70, perRow: 3 },
  { label: '10 × 10 cm', mm: 100, perRow: 2 },
];

function StickerCell({ tile, sizeMm }: { tile: StickerTile; sizeMm: number }) {
  return (
    <div
      className="sticker-cell relative overflow-hidden bg-slate-900 border border-dashed border-slate-400"
      style={{
        width: `${sizeMm}mm`,
        height: `${sizeMm}mm`,
        flexShrink: 0,
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
      }}
    >
      {/* Photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tile.imageUrl}
        alt={tile.uploader || ''}
        className="absolute inset-0 w-full h-full object-cover"
        crossOrigin="anonymous"
      />
      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 flex items-center justify-between px-1" style={{ padding: '1.5mm 2mm' }}>
        <span className="text-white font-black truncate" style={{ fontSize: `${Math.max(5, sizeMm * 0.11)}mm`, maxWidth: '55%' }}>
          {tile.uploader || 'Guest'}
        </span>
        <span className="text-yellow-300 font-black shrink-0" style={{ fontSize: `${Math.max(4, sizeMm * 0.10)}mm` }}>
          #{tile.cellNumber}
        </span>
      </div>
      {/* Position badge top-right */}
      <div className="absolute top-0 right-0 bg-black/75 text-yellow-300 font-black leading-none" style={{ fontSize: `${Math.max(4, sizeMm * 0.09)}mm`, padding: '1mm 1.5mm' }}>
        {tile.colLabel}·{tile.rowLabel}
      </div>
    </div>
  );
}

export default function StickerSheetPage() {
  const [tiles, setTiles] = useState<StickerTile[]>([]);
  const [config, setConfig] = useState<PrintConfig>({ gridWidth: 20, gridHeight: 15 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sizeIdx, setSizeIdx] = useState(1); // default 7cm
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  const selected = STICKER_SIZES[sizeIdx];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mosaicId = params.get('mosaicId');
    const url = mosaicId 
      ? `${backend}/api/print/sticker-sheet?mosaicId=${mosaicId}`
      : `${backend}/api/print/sticker-sheet`;

    const token = typeof window !== 'undefined' ? localStorage.getItem('mosaic_token') : null;
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setTiles(data.tiles || []);
        if (data.config) setConfig(data.config);
        setLoading(false);
      })
      .catch(() => { setError('Could not reach backend'); setLoading(false); });
  }, [backend]);

  const handlePrint = () => window.print();

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <p className="text-rose-400 font-bold">{error}</p>
    </div>
  );

  return (
    <>
      {/* Print-hidden toolbar */}
      <div id="print-toolbar" className="no-print fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center gap-4 shadow-xl">
        <div>
          <h1 className="text-white font-black text-lg">Sticker Sheet</h1>
          <p className="text-slate-400 text-xs">{tiles.length} stickers · {config.gridWidth}×{config.gridHeight} grid</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {/* Size picker */}
          <div className="relative">
            <select
              value={sizeIdx}
              onChange={e => setSizeIdx(Number(e.target.value))}
              className="bg-slate-800 text-white text-sm font-bold border border-slate-700 rounded-xl px-4 py-2 pr-8 appearance-none cursor-pointer"
            >
              {STICKER_SIZES.map((s, i) => (
                <option key={i} value={i}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all"
          >
            <Printer className="w-4 h-4" /> Print Sticker Sheet
          </button>
        </div>
      </div>

      {/* Print area */}
      <div id="print-area" className="pt-16 no-print-padding bg-slate-950 min-h-screen p-8">
        {tiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-24 text-center">
            <p className="text-slate-400 font-bold text-lg">No approved tiles yet.</p>
            <p className="text-slate-600 text-sm mt-2">Upload photos first, then come back to print stickers.</p>
          </div>
        ) : (
          <div id="sticker-pages">
            {/* Chunk tiles into pages */}
            {chunkArray(tiles, selected.perRow * 4).map((page, pi) => (
              <div
                key={pi}
                className="sticker-page bg-white mb-4"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  padding: '10mm',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4mm',
                  alignContent: 'flex-start',
                  pageBreakAfter: 'always',
                  breakAfter: 'page',
                  boxSizing: 'border-box',
                }}
              >
                {/* Page header (print-only) */}
                <div className="print-only-header w-full mb-2" style={{ borderBottom: '0.5mm solid #ddd', paddingBottom: '2mm', marginBottom: '3mm' }}>
                  <p style={{ fontFamily: 'sans-serif', fontSize: '8pt', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Mosaic Wall — Sticker Sheet (Page {pi + 1})</span>
                    <span>Sticker size: {selected.label} · Each sticker = one grid position</span>
                  </p>
                </div>
                {page.map(tile => (
                  <StickerCell key={tile.id} tile={tile} sizeMm={selected.mm} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Print-optimised CSS */}
      <style>{`
        @media print {
          #print-toolbar { display: none !important; }
          #print-area { background: white !important; padding: 0 !important; }
          body { margin: 0; }
          .sticker-page {
            page-break-after: always;
            break-after: page;
            box-shadow: none !important;
          }
          @page { size: A4 portrait; margin: 0; }
        }
        @media screen {
          .sticker-page {
            box-shadow: 0 4px 40px rgba(0,0,0,0.6);
            border-radius: 4px;
          }
          .print-only-header { display: none; }
        }
      `}</style>
    </>
  );
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}
