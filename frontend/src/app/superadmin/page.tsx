'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, Users, LogOut, Plus, Trash2, ExternalLink,
  Loader2, X, Check, ChevronDown, Activity, Eye, Edit3,
  Lock, Mail, User as UserIcon, Tag, Archive, Globe
} from 'lucide-react';
import dynamic from 'next/dynamic';

const WebsitePanel = dynamic(() => import('@/components/WebsitePanel'), { ssr: false });

const backend = 'https://mosaic-wall-backend.salurprabha.workers.dev';

interface Mosaic {
  id: string; name: string; slug: string; description?: string;
  status: string; createdAt: string;
  admins: { user: { id: string; name: string; email: string } }[];
  _count: { tiles: number };
}
interface Admin {
  id: string; email: string; name: string; role: string; createdAt: string;
  assignments: { mosaic: { id: string; name: string; slug: string } }[];
}

type Panel = 'overview' | 'mosaics' | 'users' | 'website';

// ── Reusable Modal ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl p-6 space-y-5 z-10"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-black text-white text-lg">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

// ── SuperAdmin Dashboard ───────────────────────────────────────────────────────
export default function SuperAdminPage() {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>('overview');
  const [mosaics, setMosaics] = useState<Mosaic[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [stats, setStats] = useState({ mosaics: 0, admins: 0, tiles: 0 });
  const [loading, setLoading] = useState(true);

  // Create mosaic modal
  const [showCreateMosaic, setShowCreateMosaic] = useState(false);
  const [newMosaicName, setNewMosaicName] = useState('');
  const [newMosaicDesc, setNewMosaicDesc] = useState('');
  const [createMosaicLoading, setCreateMosaicLoading] = useState(false);

  // Create admin modal
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: '', name: '', password: '', mosaicIds: [] as string[] });
  const [createAdminLoading, setCreateAdminLoading] = useState(false);

  const apiFetch = useCallback(async (path: string, opts?: RequestInit) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mosaic_token') : null;
    const res = await fetch(`${backend}${path}`, { 
      ...opts,
      headers: { 
        ...opts?.headers,
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include' 
    });
    if (res.status === 401 || res.status === 403) { router.push('/login'); throw new Error('Unauthorized'); }
    return res.json();
  }, [router]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [m, u, s] = await Promise.all([
        apiFetch('/api/superadmin/mosaics'),
        apiFetch('/api/superadmin/users'),
        apiFetch('/api/superadmin/stats'),
      ]);
      setMosaics(m);
      setAdmins(u);
      setStats(s);
    } catch { /* handled */ } finally { setLoading(false); }
  }, [apiFetch]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleLogout = async () => {
    // Use apiFetch for logout, it handles token and credentials
    await apiFetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('mosaic_token');
    document.cookie = "mosaic_jwt=; Path=/; Max-Age=0";
    router.push('/login');
  };

  const handleCreateMosaic = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMosaicLoading(true);
    try {
      await apiFetch('/api/superadmin/mosaics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMosaicName, description: newMosaicDesc }),
      });
      setShowCreateMosaic(false); setNewMosaicName(''); setNewMosaicDesc('');
      loadAll();
    } catch { /* handled */ } finally { setCreateMosaicLoading(false); }
  };

  const handleDeleteMosaic = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will permanently remove all its tiles and config.`)) return;
    await apiFetch(`/api/superadmin/mosaics/${id}`, { method: 'DELETE' });
    loadAll();
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateAdminLoading(true);
    try {
      await apiFetch('/api/superadmin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin),
      });
      setShowCreateAdmin(false);
      setNewAdmin({ email: '', name: '', password: '', mosaicIds: [] });
      loadAll();
    } catch { /* handled */ } finally { setCreateAdminLoading(false); }
  };

  const handleDeleteAdmin = async (id: string, name: string) => {
    if (!confirm(`Delete admin "${name}"?`)) return;
    await apiFetch(`/api/superadmin/users/${id}`, { method: 'DELETE' });
    loadAll();
  };

  const toggleMosaicForAdmin = (mosaicId: string) => {
    setNewAdmin(prev => ({
      ...prev,
      mosaicIds: prev.mosaicIds.includes(mosaicId)
        ? prev.mosaicIds.filter(id => id !== mosaicId)
        : [...prev.mosaicIds, mosaicId]
    }));
  };

  const navItems: { id: Panel; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'mosaics', label: 'Mosaics', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'users', label: 'Admins', icon: <Users className="w-4 h-4" /> },
    { id: 'website', label: 'Website / CMS', icon: <Globe className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#080c14] flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-slate-800/60 flex flex-col bg-slate-950/50 backdrop-blur-xl">
        {/* Brand */}
        <div className="p-6 border-b border-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center">
              <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`rounded-sm ${i === 0 || i === 3 ? 'bg-indigo-400' : 'bg-indigo-800'}`} />
                ))}
              </div>
            </div>
            <div>
              <p className="font-black text-white text-sm">Mosaic Wall</p>
              <p className="text-slate-500 text-xs">Super Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setPanel(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                panel === item.id
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-800/40">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-5xl">

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {!loading && panel === 'overview' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-black text-white">Super Admin Dashboard</h1>
                <p className="text-slate-500 mt-1">Manage all mosaics, events, and admin users</p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Mosaics', value: stats.mosaics, icon: '🎨', color: 'from-indigo-600/20 to-indigo-600/5' },
                  { label: 'Admin Users', value: stats.admins, icon: '👥', color: 'from-violet-600/20 to-violet-600/5' },
                  { label: 'Total Uploads', value: stats.tiles, icon: '📸', color: 'from-emerald-600/20 to-emerald-600/5' },
                ].map(s => (
                  <div key={s.label} className={`bg-gradient-to-br ${s.color} border border-slate-800/60 rounded-2xl p-6`}>
                    <span className="text-3xl">{s.icon}</span>
                    <p className="text-4xl font-black text-white mt-3">{s.value}</p>
                    <p className="text-slate-400 text-sm font-bold mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Recent mosaics */}
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6">
                <h3 className="font-black text-white mb-4">Recent Mosaics</h3>
                {mosaics.slice(0, 5).map(m => (
                  <div key={m.id} className="flex items-center justify-between py-3 border-b border-slate-800/40 last:border-0">
                    <div>
                      <p className="font-bold text-white">{m.name}</p>
                      <p className="text-slate-500 text-xs">/{m.slug} · {m._count.tiles} tiles · {m.admins.length} admin{m.admins.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${m.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 border-slate-700 text-slate-400'}`}>
                        {m.status}
                      </span>
                      <button onClick={() => window.open(`/admin/${m.slug}`, '_blank')} className="p-1.5 text-slate-400 hover:text-indigo-400 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {mosaics.length === 0 && <p className="text-slate-500 text-sm">No mosaics yet.</p>}
              </div>
            </div>
          )}

          {/* ── MOSAICS ── */}
          {!loading && panel === 'mosaics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white">Mosaics</h1>
                  <p className="text-slate-500 mt-1">Create and manage event mosaics</p>
                </div>
                <button
                  onClick={() => setShowCreateMosaic(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all"
                >
                  <Plus className="w-4 h-4" /> New Mosaic
                </button>
              </div>

              <div className="space-y-3">
                {mosaics.map(m => (
                  <div key={m.id} className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 bg-indigo-600/20 border border-indigo-500/20 rounded-xl flex items-center justify-center shrink-0 text-lg">🎨</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-white text-base">{m.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border shrink-0 ${m.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-700/40 border-slate-700 text-slate-500'}`}>{m.status}</span>
                      </div>
                      {m.description && <p className="text-slate-500 text-sm mt-0.5">{m.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="font-mono bg-slate-800 px-2 py-0.5 rounded">/{m.slug}</span>
                        <span>{m._count.tiles} tiles</span>
                        <span>{m.admins.length} admin{m.admins.length !== 1 ? 's' : ''}</span>
                      </div>
                      {m.admins.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {m.admins.map(a => (
                            <span key={a.user.id} className="text-xs bg-violet-500/10 border border-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full font-medium">{a.user.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => window.open(`/admin/${m.slug}`, '_blank')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all"
                      >
                        <ExternalLink className="w-3 h-3" /> Open Admin
                      </button>
                      <button onClick={() => handleDeleteMosaic(m.id, m.name)} className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {mosaics.length === 0 && (
                  <div className="text-center py-16 text-slate-500">
                    <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">No mosaics yet</p>
                    <p className="text-sm mt-1">Create your first mosaic event to get started</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ADMINS / USERS ── */}
          {!loading && panel === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white">Admin Users</h1>
                  <p className="text-slate-500 mt-1">Create admins and assign them to mosaics</p>
                </div>
                <button
                  onClick={() => setShowCreateAdmin(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-sm transition-all"
                >
                  <Plus className="w-4 h-4" /> Create Admin
                </button>
              </div>

              <div className="space-y-3">
                {admins.map(admin => (
                  <div key={admin.id} className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 bg-violet-600/20 border border-violet-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <UserIcon className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-white">{admin.name}</h3>
                        <span className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-bold">{admin.role}</span>
                      </div>
                      <p className="text-slate-500 text-sm">{admin.email}</p>
                      {admin.assignments.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {admin.assignments.map(a => (
                            <a
                              key={a.mosaic.id}
                              href={`/admin/${a.mosaic.slug}`}
                              target="_blank"
                              className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-medium hover:bg-indigo-500/20 transition-all"
                            >
                              {a.mosaic.name} ↗
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-600 text-xs mt-1 italic">No mosaics assigned</p>
                      )}
                    </div>
                    <button onClick={() => handleDeleteAdmin(admin.id, admin.name)} className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {admins.length === 0 && (
                  <div className="text-center py-16 text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">No admin users yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* ── WEBSITE / CMS ── */}
          {!loading && panel === 'website' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white">Website & CMS</h1>
                <p className="text-slate-500 mt-1">Manage your public website content, blog posts, and SEO settings.</p>
              </div>
              <WebsitePanel />
            </div>
          )}
        </div>
      </main>

      {/* ── Create Mosaic Modal ── */}
      <AnimatePresence>
        {showCreateMosaic && (
          <Modal title="Create New Mosaic" onClose={() => setShowCreateMosaic(false)}>
            <form onSubmit={handleCreateMosaic} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mosaic Name *</label>
                <input
                  value={newMosaicName} onChange={e => setNewMosaicName(e.target.value)}
                  required placeholder="e.g. Annual Gala 2025"
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 transition-all"
                />
                {newMosaicName && (
                  <p className="text-xs text-slate-500">URL slug: <span className="font-mono text-indigo-400">/{newMosaicName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}</span></p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  value={newMosaicDesc} onChange={e => setNewMosaicDesc(e.target.value)}
                  placeholder="Optional event description…"
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 transition-all resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateMosaic(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all">Cancel</button>
                <button type="submit" disabled={createMosaicLoading} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {createMosaicLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><Plus className="w-4 h-4" /> Create</>}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Create Admin Modal ── */}
      <AnimatePresence>
        {showCreateAdmin && (
          <Modal title="Create Admin User" onClose={() => setShowCreateAdmin(false)}>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Name *</label>
                  <input
                    value={newAdmin.name} onChange={e => setNewAdmin(p => ({ ...p, name: e.target.value }))}
                    required placeholder="Full name"
                    className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/60 transition-all text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password *</label>
                  <input
                    type="password" value={newAdmin.password} onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))}
                    required placeholder="••••••••"
                    className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/60 transition-all text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email *</label>
                <input
                  type="email" value={newAdmin.email} onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))}
                  required placeholder="admin@example.com"
                  className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/60 transition-all text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assign to Mosaics</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                  {mosaics.map(m => {
                    const selected = newAdmin.mosaicIds.includes(m.id);
                    return (
                      <button
                        key={m.id} type="button" onClick={() => toggleMosaicForAdmin(m.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all border ${
                          selected ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' : 'bg-slate-800/50 border-slate-700/40 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${selected ? 'bg-indigo-500 border-indigo-400' : 'border-slate-600'}`}>
                          {selected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="truncate">{m.name}</span>
                      </button>
                    );
                  })}
                  {mosaics.length === 0 && <p className="col-span-2 text-slate-500 text-xs italic">No mosaics available — create one first</p>}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateAdmin(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all">Cancel</button>
                <button type="submit" disabled={createAdminLoading} className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {createAdminLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><Plus className="w-4 h-4" /> Create Admin</>}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
