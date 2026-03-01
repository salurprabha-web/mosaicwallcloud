'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const UploadForm = dynamic(() => import('@/components/UploadForm'), { ssr: false });

export default function UploadSlugPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [mosaicId, setMosaicId] = useState<string | null>(null);
  const [mosaicName, setMosaicName] = useState('Mosaic Wall');
  const [error, setError] = useState<string | null>(null);
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  useEffect(() => {
    if (!slug) return;
    // Public endpoint — look up mosaic by slug
    fetch(`${backend}/api/mosaic/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError('Event not found.'); return; }
        setMosaicId(data.id);
        setMosaicName(data.name);
      })
      .catch(() => setError('Could not reach server.'));
  }, [slug, backend]);

  if (error) return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950">
      <p className="text-rose-400 font-bold text-lg">{error}</p>
    </main>
  );

  if (!mosaicId) return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
    </main>
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ background: '#080c14' }}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-black -z-10" />
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 drop-shadow-sm mb-2">
          {mosaicName}
        </h1>
        <p className="text-slate-500 font-medium">Join the Live Mosaic</p>
      </header>
      <UploadForm mosaicId={mosaicId} />
    </main>
  );
}
