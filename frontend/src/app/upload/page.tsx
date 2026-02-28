'use client';

import dynamic from 'next/dynamic';

const UploadForm = dynamic(() => import('@/components/UploadForm'), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-md mx-auto p-8 space-y-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800/60 rounded-[2.5rem] animate-pulse">
      <div className="h-8 bg-slate-800 rounded-xl w-3/4 mx-auto" />
      <div className="aspect-square bg-slate-800 rounded-[2rem]" />
    </div>
  ),
});

export default function UploadPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-black -z-10" />
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 drop-shadow-sm mb-2">
          MosaicWall
        </h1>
        <p className="text-slate-500 font-medium">Live Digital Mosaic Experience</p>
      </header>
      <UploadForm />
    </main>
  );
}
