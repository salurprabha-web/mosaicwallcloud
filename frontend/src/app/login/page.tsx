'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://mosaic-wall-backend.salurprabha.workers.dev';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${backend}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      if (data.role === 'super_admin') {
        router.push('/superadmin');
      } else if (data.mosaicSlug) {
        router.push(`/admin/${data.mosaicSlug}`);
      } else {
        setError('No mosaic assigned to your account. Contact your administrator.');
      }
    } catch {
      setError('Cannot reach server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.15) 1px, transparent 1px)',
        backgroundSize: '44px 44px'
      }} />
      {/* Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-purple-600/10 rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl mb-4 shadow-[0_0_40px_rgba(99,102,241,0.3)]">
            <div className="grid grid-cols-3 gap-0.5 w-7 h-7">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={`rounded-sm ${[0,4,8,2,6].includes(i) ? 'bg-indigo-400' : 'bg-indigo-800'}`} />
              ))}
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Mosaic Wall</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800/60 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-600 font-medium focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-950/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-600 font-medium focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm font-semibold">
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white rounded-xl font-black text-base transition-all shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Signing in…</> : 'Sign In →'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
