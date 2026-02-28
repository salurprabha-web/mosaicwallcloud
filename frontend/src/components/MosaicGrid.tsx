"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
// Removed socket.io-client for raw WebSockets compatible with Cloudflare Durable Objects

interface Tile {
  id: string;
  imageUrl: string;
  gridX: number;
  gridY: number;
  status: string;
  uploader?: string;
}

interface Config {
  gridWidth: number;
  gridHeight: number;
  gapSize: number;
  borderRadius: number;
  bgImageUrl?: string | null;
  bgOpacity: number;
  animationSpeed: number;
  entryAnimation: string;
}

const DEFAULT_CONFIG: Config = {
  gridWidth: 20,
  gridHeight: 15,
  gapSize: 2,
  borderRadius: 4,
  bgImageUrl: null,
  bgOpacity: 0.5,
  animationSpeed: 0.8,
  entryAnimation: 'scale',
};

const SPOTLIGHT_DURATION = 4500;

function cellBgStyle(cx: number, cy: number, cfg: Config): React.CSSProperties {
  if (!cfg.bgImageUrl) return {};
  const { gridWidth, gridHeight, bgImageUrl } = cfg;
  return {
    backgroundImage: `url(${bgImageUrl})`,
    backgroundSize: `${gridWidth * 100}% ${gridHeight * 100}%`,
    backgroundPosition: `${cx === 0 ? 0 : (cx / (gridWidth - 1)) * 100}% ${cy === 0 ? 0 : (cy / (gridHeight - 1)) * 100}%`,
    backgroundRepeat: 'no-repeat',
  };
}

// ── Small tile locked into the grid ──────────────────────────────────────────
function GridTile({ tile, cfg }: { tile: Tile; cfg: Config }) {
  const radius = `${cfg.borderRadius ?? 4}px`;
  return (
    <motion.div
      layoutId={`tile-${tile.id}`}
      className="relative overflow-hidden"
      style={{ gridColumn: tile.gridX + 1, gridRow: tile.gridY + 1, borderRadius: radius }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
    >
      {cfg.bgImageUrl && (
        <div
          className="absolute inset-0"
          style={{ ...cellBgStyle(tile.gridX, tile.gridY, cfg), opacity: 0.85 }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tile.imageUrl}
        alt={tile.uploader || 'photo'}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          mixBlendMode: cfg.bgImageUrl ? 'overlay' : 'normal',
          opacity: cfg.bgImageUrl ? 0.78 : 1,
        }}
        crossOrigin="anonymous"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent h-1/3 pointer-events-none" />
      {tile.uploader && (
        <p
          className="absolute bottom-0.5 left-0 right-0 px-1 text-white font-black truncate text-center leading-none pointer-events-none"
          style={{ fontSize: 'clamp(5px, 1.1vw, 10px)', textShadow: '0 1px 4px rgba(0,0,0,1)' }}
        >
          {tile.uploader}
        </p>
      )}
    </motion.div>
  );
}

// ── Full-screen spotlight overlay ─────────────────────────────────────────────
function Spotlight({ tile, onDone }: { tile: Tile; onDone: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');
  const doneFired = useRef(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 600);
    const t2 = setTimeout(() => setPhase('exit'), SPOTLIGHT_DURATION);
    const t3 = setTimeout(() => {
      if (!doneFired.current) { doneFired.current = true; onDone(); }
    }, SPOTLIGHT_DURATION + 400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <AnimatePresence>
      {phase !== 'exit' && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />

          {/* 
            Centering wrapper: fixed inset-0 + flex centers the card perfectly.
            The layoutId is on the inner motion.div so Framer can animate
            it into the grid tile without the centering interfering.
          */}
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none">
            <motion.div
              layoutId={`tile-${tile.id}`}
              className="flex flex-col items-center"
              initial={{ scale: 0.15, opacity: 0, filter: 'blur(24px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              exit={{ scale: 0.12, opacity: 0, filter: 'blur(12px)' }}
              transition={{
                duration: 0.65,
                ease: [0.16, 1, 0.3, 1],
                layout: { type: 'spring', stiffness: 150, damping: 20 },
              }}
            >
              {/* Photo card */}
              <div
                className="relative overflow-hidden border-2 border-white/25"
                style={{
                  width: 'min(50vw, 58vh)',
                  height: 'min(50vw, 58vh)',
                  borderRadius: '1.75rem',
                  boxShadow: '0 0 80px rgba(255,255,255,0.18), 0 30px 80px rgba(0,0,0,0.6)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tile.imageUrl}
                  alt={tile.uploader || 'guest'}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
                {/* Sheen sweep on entry */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 1.4, delay: 0.3 }}
                />
              </div>

              {/* Name and label — always visible below photo */}
              <motion.div
                className="mt-6 text-center px-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: 0.35, duration: 0.55, ease: 'easeOut' }}
              >
                <h2
                  className="font-black text-white leading-tight"
                  style={{ fontSize: 'clamp(1.8rem, 5vw, 4rem)', textShadow: '0 2px 24px rgba(0,0,0,0.9)' }}
                >
                  {tile.uploader || 'Guest'}
                </h2>
                <p
                  className="text-white/55 font-semibold tracking-[0.25em] uppercase mt-2"
                  style={{ fontSize: 'clamp(0.65rem, 1.3vw, 1.05rem)' }}
                >
                  joining the mosaic ✦
                </p>
              </motion.div>
            </motion.div>
          </div>

          {/* Progress bar */}
          <motion.div
            key="progress"
            className="fixed bottom-0 left-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-400 to-pink-400 z-50 origin-left"
            style={{ width: '100%' }}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: SPOTLIGHT_DURATION / 1000, ease: 'linear' }}
          />
        </>
      )}
    </AnimatePresence>
  );
}

// ── Main mosaic grid ──────────────────────────────────────────────────────────
export default function MosaicGrid({ mosaicId, mosaicSlug = 'default' }: { mosaicId?: string; mosaicSlug?: string } = {}) {
  const [allTiles, setAllTiles] = useState<Map<string, Tile>>(new Map());
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [queue, setQueue] = useState<string[]>([]);
  const [spotlightId, setSpotlightId] = useState<string | null>(null);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [ready, setReady] = useState(false);
  const [prizeWinner, setPrizeWinner] = useState<{ tile: Tile; winner: string } | null>(null);
  const processingRef = useRef(false);
  const prizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processQueue = useCallback(() => {
    if (processingRef.current) return;
    setQueue((prev) => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      processingRef.current = true;
      setSpotlightId(next);
      return rest;
    });
  }, []);

  const handleSpotlightDone = useCallback((id: string) => {
    setPlacedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSpotlightId(null);
    processingRef.current = false;
    setTimeout(processQueue, 500);
  }, [processQueue]);

  useEffect(() => {
    if (queue.length > 0 && !processingRef.current && !spotlightId) {
      processQueue();
    }
  }, [queue, spotlightId, processQueue]);

  useEffect(() => {
    const backendAbsoluteUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8787';
    const wsUrl = backendAbsoluteUrl.replace('http', 'ws') + `/api/ws?mosaicId=${mosaicId}`;
    const sock = new WebSocket(wsUrl);

    const on = (type: string, handler: (data: any) => void) => {
      sock.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === type) handler(data.payload);
        } catch (e) {}
      });
    };

    sock.onopen = () => {
      sock.send(JSON.stringify({ type: 'display:ready', payload: { mosaicId, mosaicSlug } }));
    };

    on('display:init', (data: { config: Config; tiles: Tile[] }) => {
      setConfig(data.config ?? DEFAULT_CONFIG);
      const map = new Map<string, Tile>();
      const ids: string[] = [];
      for (const t of (data.tiles ?? [])) { map.set(t.id, t); ids.push(t.id); }
      setAllTiles(map);
      setPlacedIds(ids);
      setReady(true);
    });

    on('display:config_updated', (cfg: Config) => setConfig(cfg));

    on('display:new_tile', (tile: Tile) => {
      setAllTiles((prev) => {
        if (prev.has(tile.id)) return prev;
        return new Map(prev).set(tile.id, tile);
      });
      setQueue((prev) => [...prev, tile.id]);
    });

    on('display:clear', (payload: { mosaicId: string }) => {
      if (mosaicId && payload.mosaicId !== mosaicId) return;
      setAllTiles(new Map());
      setPlacedIds([]);
      setQueue([]);
      setSpotlightId(null);
      setPrizeWinner(null);
      processingRef.current = false;
    });

    on('display:prize_won', (data: { tile: Tile; winner: string }) => {
      setPrizeWinner(data);
      if (prizeTimer.current) clearTimeout(prizeTimer.current);
      prizeTimer.current = setTimeout(() => setPrizeWinner(null), 8000);
    });

    const fallback = setTimeout(() => setReady(true), 2500);
    return () => { 
      clearTimeout(fallback); 
      if (prizeTimer.current) clearTimeout(prizeTimer.current); 
      sock.close(); 
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-black text-white">
        <div className="flex flex-col items-center space-y-5">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin" />
          </div>
          <p className="text-slate-400 text-xl font-semibold tracking-widest uppercase animate-pulse">
            Connecting…
          </p>
        </div>
      </div>
    );
  }

  const { gridWidth, gridHeight, bgImageUrl, bgOpacity } = config;

  return (
    <LayoutGroup>
      <div className="relative w-full h-screen overflow-hidden bg-black">


        {/* Grid */}
        <div
          className="absolute inset-0"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridWidth}, 1fr)`,
            gridTemplateRows: `repeat(${gridHeight}, 1fr)`,
            gap: `${config.gapSize ?? 2}px`,
            padding: `${config.gapSize ?? 2}px`,
          }}
        >
          {/* Empty placeholder cells */}
          {Array.from({ length: gridWidth * gridHeight }).map((_, idx) => {
            const cx = idx % gridWidth;
            const cy = Math.floor(idx / gridWidth);
            return (
              <div key={`cell-${cx}-${cy}`} style={{ gridColumn: cx + 1, gridRow: cy + 1 }} className="relative">
                <div className="absolute inset-0 border border-white/[0.04] rounded-sm" />
              </div>
            );
          })}

          {/* Placed tiles */}
          <AnimatePresence>
            {placedIds.map((id) => {
              const tile = allTiles.get(id);
              if (!tile) return null;
              return <GridTile key={tile.id} tile={tile} cfg={config} />;
            })}
          </AnimatePresence>
        </div>

        {/* Queue badge */}
        <AnimatePresence>
          {queue.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 right-6 z-30 flex items-center gap-2 bg-black/70 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-white text-sm font-bold"
            >
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              {queue.length} more queued
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spotlight */}
        {spotlightId && allTiles.has(spotlightId) && (
          <Spotlight
            key={spotlightId}
            tile={allTiles.get(spotlightId)!}
            onDone={() => handleSpotlightDone(spotlightId)}
          />
        )}

        {/* Prize Win Celebration */}
        <AnimatePresence>
          {prizeWinner && (
            <>
              {/* Gold vignette backdrop */}
              <motion.div
                key="prize-backdrop"
                className="fixed inset-0 z-[60] pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                style={{ background: 'radial-gradient(ellipse at center, rgba(234,179,8,0.18) 0%, rgba(0,0,0,0.88) 70%)' }}
              />

              {/* Confetti particles */}
              <div className="fixed inset-0 z-[61] pointer-events-none overflow-hidden">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-3 rounded-sm animate-confetti opacity-80"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `-${Math.random() * 20 + 5}%`,
                      backgroundColor: ['#facc15','#f97316','#ec4899','#a78bfa','#34d399','#60a5fa'][i % 6],
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${2.5 + Math.random() * 2}s`,
                      transform: `rotate(${Math.random() * 360}deg)`,
                    }}
                  />
                ))}
              </div>

              {/* Central winner card */}
              <div className="fixed inset-0 z-[62] flex flex-col items-center justify-center pointer-events-none">
                <motion.div
                  key="prize-card"
                  className="flex flex-col items-center"
                  initial={{ scale: 0.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.1, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                >
                  {/* 🎁 WINNER text */}
                  <motion.p
                    className="font-black text-transparent bg-clip-text mb-6 tracking-widest uppercase"
                    style={{
                      fontSize: 'clamp(1.5rem, 5vw, 4rem)',
                      backgroundImage: 'linear-gradient(135deg, #fde68a, #f59e0b, #fbbf24, #fde68a)',
                      textShadow: 'none',
                      filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.8))',
                    }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.4 }}
                  >
                    🎁 Prize Winner!
                  </motion.p>

                  {/* Winner photo in gold ring */}
                  <motion.div
                    className="relative"
                    animate={{ rotate: [0, 2, -2, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                  >
                    <div
                      className="overflow-hidden border-4 border-yellow-400"
                      style={{
                        width: 'min(44vw, 50vh)',
                        height: 'min(44vw, 50vh)',
                        borderRadius: '50%',
                        boxShadow: '0 0 0 8px rgba(234,179,8,0.2), 0 0 60px rgba(234,179,8,0.5)',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={prizeWinner.tile.imageUrl}
                        alt={prizeWinner.winner}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                      />
                    </div>
                    {/* Gold star badge */}
                    <div className="absolute -top-3 -right-3 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(234,179,8,0.8)]">
                      ⭐
                    </div>
                  </motion.div>

                  {/* Winner name */}
                  <motion.h2
                    className="font-black text-white mt-6"
                    style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', textShadow: '0 2px 24px rgba(0,0,0,0.9)' }}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    {prizeWinner.winner}
                  </motion.h2>
                  <p className="text-yellow-300/70 font-semibold tracking-[0.3em] uppercase mt-2" style={{ fontSize: 'clamp(0.6rem, 1.2vw, 1rem)' }}>
                    Congratulations! You&apos;ve won a prize ✦
                  </p>
                </motion.div>
              </div>

              {/* Countdown bar */}
              <motion.div
                key="prize-bar"
                className="fixed bottom-0 left-0 h-1 z-[63] origin-left"
                style={{ background: 'linear-gradient(to right, #fde68a, #f59e0b)' }}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 8, ease: 'linear' }}
              />

              {/* Dismiss button */}
              <button
                className="fixed top-6 right-6 z-[64] w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold transition-all flex items-center justify-center text-lg"
                onClick={() => setPrizeWinner(null)}
              >
                ×
              </button>
            </>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}
