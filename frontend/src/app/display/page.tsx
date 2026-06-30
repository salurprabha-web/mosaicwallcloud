'use client';

import dynamic from 'next/dynamic';

const MosaicGrid = dynamic(() => import('@/components/MosaicGrid'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-screen bg-black">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-lg font-medium tracking-wide animate-pulse">Initializing Mosaic Canvas...</p>
      </div>
    </div>
  ),
});

export default function DisplayPage() {
  return (
    <main className="w-full h-screen bg-black overflow-hidden">
      <MosaicGrid />
    </main>
  );
}
