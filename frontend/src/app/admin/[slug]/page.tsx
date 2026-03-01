'use client';

import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const AdminDashboard = dynamic(() => import('@/components/AdminDashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-medium">Loading Admin Panel...</p>
      </div>
    </div>
  ),
});

export default function AdminSlugPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [mosaicId, setMosaicId] = useState<string | null>(null);
  const [mosaicName, setMosaicName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const backend = 'https://mosaic-wall-backend.salurprabha.workers.dev';

  useEffect(() => {
    if (!slug) return;
    const token = localStorage.getItem('mosaic_token');
    // Verify the mosaic exists and get its ID
    fetch(`${backend}/api/superadmin/mosaics`, { 
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include' 
    })
      .then(r => {
        if (r.status === 401 || r.status === 403) { router.push('/login'); return null; }
        return r.json();
      })
      .then((mosaics: { id: string; slug: string; name: string }[] | null) => {
        if (!mosaics) return;
        const found = mosaics.find(m => m.slug === slug);
        if (!found) {
          setError(`Mosaic "/${slug}" not found.`);
        } else {
          setMosaicId(found.id);
          setMosaicName(found.name);
        }
      })
      .catch(() => setError('Could not reach backend.'));
  }, [slug, backend, router]);

  if (error) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-rose-400 font-bold text-lg">{error}</p>
        <button onClick={() => router.push('/login')} className="mt-4 px-5 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-all">Back to Login</button>
      </div>
    </div>
  );

  if (!mosaicId) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
    </div>
  );

  return <AdminDashboard mosaicId={mosaicId} mosaicName={mosaicName} mosaicSlug={slug} />;
}
