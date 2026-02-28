'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const MosaicGrid = dynamic(() => import('@/components/MosaicGrid'), { ssr: false });

export default function DisplaySlugPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [mosaicId, setMosaicId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8787';

  useEffect(() => {
    if (!slug) return;
    fetch(`${backend}/api/mosaic/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError('Event not found.'); return; }
        setMosaicId(data.id);
      })
      .catch(() => setError('Could not reach server.'));
  }, [slug, backend]);

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
