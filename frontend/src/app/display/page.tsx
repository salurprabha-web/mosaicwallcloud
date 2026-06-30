'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const MosaicGrid = dynamic(() => import('@/components/MosaicGrid'), { ssr: false });

// ✅ FOUND THE REAL BUG — by actually reading this file, the one place
// in the whole codebase I hadn't checked directly until now.
//
// `const backend = '';` — the EXACT same empty-string bug found
// repeatedly elsewhere in this session, but here it's in the single
// most important place for the symptom being reported: this is the
// TV DISPLAY PAGE itself. Every time the display loads (fresh open,
// refresh, or opened on a second screen), it first calls
// `fetch('/api/mosaic/${slug}')` to resolve the human-readable slug
// into the real mosaicId — which MosaicGrid then uses to open its
// WebSocket and request `display:init` with the saved config and
// tiles.
//
// With an empty backend URL, this fetch was a bare relative path —
// on Vercel/Next.js this MAY resolve to nothing meaningful, may hit
// a 404, or may behave inconsistently depending on routing — meaning
// `mosaicId` could end up null, stale, or simply never set reliably.
// Without a valid mosaicId, MosaicGrid never has anything correct to
// ask the WebSocket for, and falls back to its own local
// DEFAULT_CONFIG (20x15) — EXACTLY the symptom described: grid resets
// to default on every refresh, and a second screen opening the same
// link never receives the real saved state either.
const BACKEND_URL = 'https://mosaicwall.in';

export default function DisplaySlugPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [mosaicId, setMosaicId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`${BACKEND_URL}/api/mosaic/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError('Event not found.'); return; }
        setMosaicId(data.id);
      })
      .catch(() => setError('Could not reach server.'));
  }, [slug]);

  if (error) return (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <p className="text-rose-400 font-bold text-lg">{error}</p>
    </div>
  );

  if (!mosaicId) return (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
    </div>
  );

  return (
    <main className="w-full h-screen bg-black overflow-hidden">
      <MosaicGrid mosaicId={mosaicId} mosaicSlug={slug} />
    </main>
  );
}
