"use client";

import { useState, useEffect, useRef } from 'react';
// Removed socket.io-client for raw WebSockets compatible with Cloudflare Durable Objects
import {
  Settings, Play, Pause, Zap, Shield, LayoutGrid,
  Image as ImageIcon, Upload, ChevronRight, Activity,
  X, Check, Sliders, MonitorPlay, Home, Loader2, Gift, Star, Printer, LogOut, Link2, Copy, ExternalLink, DownloadCloud
} from 'lucide-react';

type PushStatus = 'idle' | 'pushing' | 'success' | 'error';
type ClearStatus = 'idle' | 'clearing' | 'success' | 'error';

type NavSection = 'overview' | 'controls' | 'grid' | 'background' | 'moderation' | 'prizebox' | 'physical' | 'analytics';

interface GridConfig {
  width: number;
  height: number;
  gapSize: number;
  borderRadius: number;
  animation: string;
  animationSpeed: number;
  bgOpacity: number;
}

interface Tile {
  id: string;
  imageUrl: string;
  gridX: number;
  gridY: number;
  uploader?: string;
  createdAt?: string;
}

// ── ShareLinkRow subcomponent ─────────────────────────────────────────────────
function ShareLinkRow({ label, url, desc }: { label: string; url: string; desc: string }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-white">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
        <p className="text-xs text-indigo-400 font-mono mt-1 truncate">{url}</p>
      </div>
      <button
        onClick={doCopy}
        title="Copy link"
        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
          copied ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'
        }`}
      >
        {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 rounded-lg text-xs font-bold transition-all"
      >
        <ExternalLink className="w-3.5 h-3.5" /> Open
      </a>
    </div>
  );
}

export default function AdminDashboard({
  mosaicId,
  mosaicName = 'Admin Panel',
  mosaicSlug = 'default',
}: {
  mosaicId?: string;
  mosaicName?: string;
  mosaicSlug?: string;
}) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushStatus>('idle');
  const [clearStatus, setClearStatus] = useState<ClearStatus>('idle');
  const [approvedTiles, setApprovedTiles] = useState<Tile[]>([]);
  const [totalApproved, setTotalApproved] = useState(0);
  const [fillStatus, setFillStatus] = useState<'idle' | 'filling' | 'done' | 'error'>('idle');
  const [fillMessage, setFillMessage] = useState('');
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [prizeCells, setPrizeCells] = useState<Set<string>>(new Set()); // 'x,y' strings
  const [prizeStatus, setPrizeStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const pushToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fillTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [grid, setGrid] = useState<GridConfig>({
    width: 20,
    height: 15,
    gapSize: 2,
    borderRadius: 4,
    animation: 'fade',
    animationSpeed: 0.6,
    bgOpacity: 50,
  });

  useEffect(() => {
    const backendAbsoluteUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://mosaic-wall-backend.salurprabha.workers.dev';
    const wsUrl = backendAbsoluteUrl.replace('http', 'ws') + `/api/ws?mosaicId=${mosaicId}`;
    const sock = new WebSocket(wsUrl);
    setSocket(sock);
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://mosaic-wall-backend.salurprabha.workers.dev';

    const on = (type: string, handler: (data: any) => void) => {
      sock.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === type) handler(data.payload);
        } catch (e) {}
      });
    };

    sock.onopen = () => {
      setConnected(true);
      // Fetch initial tile stats from backend
      let token = localStorage.getItem('mosaic_token');
      fetch(`${backendUrl}/api/stats?mosaicId=${mosaicId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then((r) => r.json())
        .then((data) => {
          if (typeof data.approved === 'number') setTotalApproved(data.approved);
          if (data.config) {
            setGrid((prev) => ({
              ...prev,
              width: data.config.gridWidth ?? prev.width,
              height: data.config.gridHeight ?? prev.height,
              animation: data.config.entryAnimation ?? prev.animation,
              animationSpeed: data.config.animationSpeed ?? prev.animationSpeed,
              bgOpacity: Math.round((data.config.bgOpacity ?? 0.5) * 100),
            }));
            if (data.config.bgImageUrl) setBgPreview(data.config.bgImageUrl);
          }
        })
        .catch(() => {});
      
      // Fetch Prize Cells via REST
      token = localStorage.getItem('mosaic_token');
      fetch(`${backendUrl}/api/superadmin/mosaics/${mosaicId}/prize-cells`, { 
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include' 
      })
        .then(r => r.json())
        .then(cells => {
          if (Array.isArray(cells)) {
            setPrizeCells(new Set(cells.map((c: any) => `${c.gridX},${c.gridY}`)));
          }
        })
        .catch(err => console.error("Failed to fetch prize cells", err));
    };

    sock.onclose = () => setConnected(false);
    
    on('admin:config_saved', (result: { success: boolean }) => {
      setPushStatus(result.success ? 'success' : 'error');
      if (pushToastTimer.current) clearTimeout(pushToastTimer.current);
      pushToastTimer.current = setTimeout(() => setPushStatus('idle'), 3000);
    });
    on('admin:new_approved', (tile: Tile) => {
      setApprovedTiles((prev) => [tile, ...prev].slice(0, 50));
      setTotalApproved((prev) => prev + 1);
    });
    on('admin:fill_complete', (result: { success: boolean; filled?: number; message?: string }) => {
      setFillStatus(result.success ? 'done' : 'error');
      setFillMessage(result.success ? `Filled ${result.filled ?? 0} cells!` : (result.message || 'Fill failed'));
      if (fillTimer.current) clearTimeout(fillTimer.current);
      fillTimer.current = setTimeout(() => { setFillStatus('idle'); setFillMessage(''); }, 4000);
    });
    on('admin:cleared', () => {
      setTotalApproved(0);
      setApprovedTiles([]);
      setClearStatus('success');
      if (clearToastTimer.current) clearTimeout(clearToastTimer.current);
      clearToastTimer.current = setTimeout(() => setClearStatus('idle'), 3000);
    });
    on('admin:prize_cells', (cells: { gridX: number; gridY: number }[]) => {
      setPrizeCells(new Set(cells.map(c => `${c.gridX},${c.gridY}`)));
    });
    on('admin:prize_cells_saved', (result: { success: boolean }) => {
      setPrizeStatus(result.success ? 'saved' : 'error');
      setTimeout(() => setPrizeStatus('idle'), 3000);
    });

    return () => {
      sock.close();
      if (pushToastTimer.current) clearTimeout(pushToastTimer.current);
      if (fillTimer.current) clearTimeout(fillTimer.current);
    };
  }, []);

  const handleBgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://mosaic-wall-backend.salurprabha.workers.dev';
    const token = localStorage.getItem('mosaic_token');
    const formData = new FormData();
    formData.append('file', file);
    if (mosaicId) formData.append('mosaicId', mosaicId);

    try {
      const res = await fetch(`${backendUrl}/api/superadmin/config/background`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setBgPreview(data.imageUrl);
    } catch (err) {
      console.error('BG Upload error:', err);
      // Fallback to local preview for immediate visual feedback if upload fails (though it won't persist)
      const reader = new FileReader();
      reader.onloadend = () => setBgPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const updateGrid = (key: keyof GridConfig, val: number | string) =>
    setGrid((prev) => ({ ...prev, [key]: val }));

  const handleRandomFill = async () => {
    if (fillStatus === 'filling') return;
    setFillStatus('filling');
    setFillMessage('');
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://mosaic-wall-backend.salurprabha.workers.dev';
    const token = localStorage.getItem('mosaic_token');
    try {
      const res = await fetch(`${backendUrl}/api/superadmin/mosaics/${mosaicId}/random-fill`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Random fill failed');
      
      setFillStatus('done');
      setFillMessage(`Filled ${data.count ?? 0} cells!`);
      if (fillTimer.current) clearTimeout(fillTimer.current);
      fillTimer.current = setTimeout(() => { setFillStatus('idle'); setFillMessage(''); }, 4000);
    } catch (err) {
      console.error('Random fill error:', err);
      setFillStatus('error');
      setFillMessage(err instanceof Error ? err.message : 'Fill failed');
      if (fillTimer.current) clearTimeout(fillTimer.current);
      fillTimer.current = setTimeout(() => { setFillStatus('idle'); setFillMessage(''); }, 4000);
    }
  };

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) return;
    setBulkProgress({ done: 0, total: bulkFiles.length });
    setBulkError(null);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://mosaic-wall-backend.salurprabha.workers.dev';
    const token = localStorage.getItem('mosaic_token');
    const formData = new FormData();
    if (mosaicId) formData.append('mosaicId', mosaicId);
    bulkFiles.forEach((f) => formData.append('images', f));
    try {
      const res = await fetch(`${backendUrl}/api/bulk-upload`, { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setBulkProgress({ done: data.count, total: data.count });
      setTimeout(() => { setBulkProgress(null); setBulkFiles([]); }, 3000);
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Upload failed');
      setBulkProgress(null);
    }
  };

  const savePrizeCells = async () => {
    if (prizeStatus === 'saving') return;
    setPrizeStatus('saving');
    const cells = Array.from(prizeCells).map(k => {
      const [x, y] = k.split(',').map(Number);
      return { x, y };
    });
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://mosaic-wall-backend.salurprabha.workers.dev';
    const token = localStorage.getItem('mosaic_token');
    try {
      const res = await fetch(`${backendUrl}/api/superadmin/mosaics/${mosaicId}/prize-cells`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cells }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to save prize cells');
      setPrizeStatus('saved');
    } catch (err) {
      console.error('Prize save error:', err);
      setPrizeStatus('error');
    } finally {
      setTimeout(() => setPrizeStatus('idle'), 3000);
    }
  };

  const togglePrizeCell = (x: number, y: number) => {
    const key = `${x},${y}`;
    setPrizeCells(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleClearMosaic = async () => {
    if (!window.confirm('Are you sure you want to clear the entire mosaic? This will delete all guest photos permanently.')) return;
    
    setClearStatus('clearing');
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://mosaic-wall-backend.salurprabha.workers.dev';
    const token = localStorage.getItem('mosaic_token');
    
    try {
      const res = await fetch(`${backendUrl}/api/superadmin/mosaics/${mosaicId}/tiles`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to clear mosaic');
      }
      
      // Success is handled via WebSocket 'admin:cleared' broadcast
    } catch (err) {
      console.error('Clear error:', err);
      setClearStatus('error');
      if (clearToastTimer.current) clearTimeout(clearToastTimer.current);
      clearToastTimer.current = setTimeout(() => setClearStatus('idle'), 3000);
    }
  };

  const pushConfig = async () => {
    if (pushStatus === 'pushing') return;
    setPushStatus('pushing');
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://mosaic-wall-backend.salurprabha.workers.dev';
    const token = localStorage.getItem('mosaic_token');
    const configPayload = {
      mosaicId,
      gridWidth: grid.width,
      gridHeight: grid.height,
      gapSize: grid.gapSize,
      borderRadius: grid.borderRadius,
      bgImageUrl: bgPreview,
      bgOpacity: grid.bgOpacity / 100,
      animationSpeed: grid.animationSpeed,
      entryAnimation: grid.animation,
    };

    try {
      const res = await fetch(`${backendUrl}/api/superadmin/config`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(configPayload),
        credentials: 'include'
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save config');
      }

      setPushStatus('success');
      if (pushToastTimer.current) clearTimeout(pushToastTimer.current);
      pushToastTimer.current = setTimeout(() => setPushStatus('idle'), 3000);
    } catch (err) {
      console.error('Config push error:', err);
      setPushStatus('error');
      if (pushToastTimer.current) clearTimeout(pushToastTimer.current);
      pushToastTimer.current = setTimeout(() => setPushStatus('idle'), 5000);
    }
  };

  const navItems: { id: NavSection; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Home className="w-5 h-5" /> },
    { id: 'controls', label: 'Live Controls', icon: <Activity className="w-5 h-5" /> },
    { id: 'grid', label: 'Grid Setup', icon: <LayoutGrid className="w-5 h-5" /> },
    { id: 'background', label: 'Background', icon: <ImageIcon className="w-5 h-5" /> },
    { id: 'moderation', label: 'Moderation', icon: <Shield className="w-5 h-5" /> },
    { id: 'prizebox', label: 'Prize Boxes', icon: <Gift className="w-5 h-5" /> },
    { id: 'physical', label: 'Physical Mosaic', icon: <Printer className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics & Export', icon: <Activity className="w-5 h-5" /> },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50 font-sans overflow-hidden">
      {/* ── SIDEBAR ── */}
      <aside
        className={`relative flex-shrink-0 flex flex-col bg-slate-900/60 backdrop-blur-xl border-r border-slate-800/60 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 py-6 border-b border-slate-800/60">
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h1 className="text-base font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 truncate">
                {mosaicName}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Admin Console</p>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed((p) => !p)}
            className="p-2 rounded-xl hover:bg-slate-800 transition-colors text-slate-400 hover:text-white ml-auto"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-semibold text-sm text-left ${
                activeSection === item.id
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <span className={`shrink-0 ${activeSection === item.id ? 'text-indigo-400' : ''}`}>{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Connection badge */}
        <div className={`px-4 py-3 border-t border-slate-800/60 flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${connected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500'}`} />
          {!sidebarCollapsed && (
            <span className="text-xs font-semibold text-slate-400">
              {connected ? 'WebSockets Live' : 'Disconnected'}
            </span>
          )}
        </div>

        {/* Logout */}
        <div className={`px-3 pb-4 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={async () => {
              const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://mosaic-wall-backend.salurprabha.workers.dev';
              const token = localStorage.getItem('mosaic_token');
              await fetch(`${backendUrl}/api/auth/logout`, { 
                method: 'POST', 
                headers: { 'Authorization': `Bearer ${token}` },
                credentials: 'include' 
              });
              localStorage.removeItem('mosaic_token');
              document.cookie = "mosaic_jwt=; Path=/; Max-Age=0";
              window.location.href = '/login';
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-semibold text-sm text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 ${sidebarCollapsed ? 'justify-center w-10' : 'w-full'}`}
            title="Sign out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-8 py-4 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800/60">
          <div>
            <h2 className="text-2xl font-black tracking-tight capitalize text-white">
              {navItems.find((n) => n.id === activeSection)?.label}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{mosaicName} · Admin Console</p>
          </div>
          <div className="flex items-center gap-3">
            {clearStatus === 'success' && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                <Check className="w-3.5 h-3.5" /> Cleared!
              </span>
            )}
            {clearStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
                <X className="w-3.5 h-3.5" /> Clear failed
              </span>
            )}
            {pushStatus === 'success' && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                <Check className="w-3.5 h-3.5" /> Pushed!
              </span>
            )}
            {pushStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
                <X className="w-3.5 h-3.5" /> Push failed
              </span>
            )}
            <button
              onClick={pushConfig}
              disabled={pushStatus === 'pushing' || !connected}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all hover:-translate-y-0.5"
            >
              {pushStatus === 'pushing'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Pushing...</>
                : <><MonitorPlay className="w-4 h-4" /> Push to Display</>}
            </button>
          </div>
        </header>

        <div className="p-8 space-y-8">

          {/* ── OVERVIEW ── */}
          {activeSection === 'overview' && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Tiles placed */}
              <div className="bg-slate-900/40 backdrop-blur-lg border border-slate-800/60 rounded-2xl p-6 flex items-center gap-5">
                <div className="p-3 rounded-xl shrink-0" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}>
                  <LayoutGrid className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tiles on Wall</p>
                  <p className="text-2xl font-black text-white mt-0.5">
                    <span className="text-blue-400">{totalApproved}</span>
                    <span className="text-slate-600 text-lg font-bold"> / {grid.width * grid.height}</span>
                  </p>
                </div>
              </div>

              {/* Grid Size */}
              <div className="bg-slate-900/40 backdrop-blur-lg border border-slate-800/60 rounded-2xl p-6 flex items-center gap-5">
                <div className="p-3 rounded-xl shrink-0" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}>
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Grid Size</p>
                  <p className="text-2xl font-black text-white mt-0.5">{grid.width} × {grid.height}</p>
                </div>
              </div>

              {/* Fill % */}
              <div className="bg-slate-900/40 backdrop-blur-lg border border-slate-800/60 rounded-2xl p-6 flex items-center gap-5">
                <div className="p-3 rounded-xl shrink-0" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24' }}>
                  <Shield className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Wall Fill</p>
                  <p className="text-2xl font-black text-white mt-0.5">
                    {grid.width * grid.height > 0
                      ? Math.round((totalApproved / (grid.width * grid.height)) * 100)
                      : 0}%
                  </p>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, grid.width * grid.height > 0 ? Math.round((totalApproved / (grid.width * grid.height)) * 100) : 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Animation */}
              <div className="bg-slate-900/40 backdrop-blur-lg border border-slate-800/60 rounded-2xl p-6 flex items-center gap-5">
                <div className="p-3 rounded-xl shrink-0" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#c084fc' }}>
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Entry Animation</p>
                  <p className="text-2xl font-black text-white mt-0.5 capitalize">{grid.animation}</p>
                </div>
              </div>

              {/* Background */}
              <div className="bg-slate-900/40 backdrop-blur-lg border border-slate-800/60 rounded-2xl p-6 flex items-center gap-5">
                <div className="p-3 rounded-xl shrink-0" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Background</p>
                  <p className="text-2xl font-black mt-0.5">
                    <span className={bgPreview ? 'text-emerald-400' : 'text-slate-600'}>{bgPreview ? 'Set ✓' : 'None'}</span>
                  </p>
                </div>
              </div>

              {/* Socket Status */}
              <div className="bg-slate-900/40 backdrop-blur-lg border border-slate-800/60 rounded-2xl p-6 flex items-center gap-5">
                <div className="p-3 rounded-xl shrink-0" style={connected ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' } : { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Socket Status</p>
                  <p className={`text-2xl font-black mt-0.5 ${connected ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {connected ? 'Live' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>

            {/* Share Links */}
            <div className="col-span-full bg-slate-900/40 backdrop-blur-lg border border-indigo-500/20 rounded-2xl p-6 mt-2">
              <h3 className="text-sm font-black text-slate-200 flex items-center gap-2 mb-4">
                <Link2 className="w-4 h-4 text-indigo-400" /> Shareable Links
                <span className="text-xs font-bold text-slate-500 bg-slate-800/60 border border-slate-700 px-2 py-0.5 rounded-full">No login required</span>
              </h3>
              <div className="space-y-3">
                <ShareLinkRow
                  label="📸 Guest Upload Page"
                  url={typeof window !== 'undefined' ? `${window.location.origin}/upload/${mosaicSlug}` : `/upload/${mosaicSlug}`}
                  desc={`Share with guests for "${mosaicName}" — no login needed`}
                />
                <ShareLinkRow
                  label="📺 TV / Display Screen"
                  url={typeof window !== 'undefined' ? `${window.location.origin}/display/${mosaicSlug}` : `/display/${mosaicSlug}`}
                  desc={`Open on the TV or projector for "${mosaicName}" — no login needed`}
                />
              </div>
            </div>
            </>
          )}

          {/* ── LIVE CONTROLS ── */}
          {activeSection === 'controls' && (
            <div className="space-y-6 max-w-3xl">

              {/* Row 1: basic controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => socket?.send(JSON.stringify({ type: 'admin:trigger_animation', payload: { type: 'celebration', mosaicId } }))}
                  className="col-span-full flex items-center justify-center gap-3 py-5 bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white border border-white/10 hover:brightness-110 rounded-2xl font-black text-base tracking-wide transition-all shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:-translate-y-1"
                >
                  <Zap className="w-5 h-5" /> Trigger Reveal Animation
                </button>
                <button
                  onClick={() => socket?.send(JSON.stringify({ type: 'admin:pause', payload: { mosaicId } }))}
                  className="flex items-center justify-center gap-3 py-4 bg-slate-800/50 hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 border border-slate-700/50 hover:border-rose-500/40 rounded-2xl font-bold text-sm transition-all"
                >
                  <Pause className="w-5 h-5" /> Pause Display
                </button>
                <button
                  onClick={() => socket?.send(JSON.stringify({ type: 'admin:resume', payload: { mosaicId } }))}
                  className="flex items-center justify-center gap-3 py-4 bg-slate-800/50 hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-400 border border-slate-700/50 hover:border-emerald-500/40 rounded-2xl font-bold text-sm transition-all"
                >
                  <Play className="w-5 h-5" /> Resume Display
                </button>
                <button
                  onClick={handleClearMosaic}
                  disabled={clearStatus === 'clearing' || !connected}
                  className="col-span-full flex items-center justify-center gap-3 py-4 bg-slate-800/50 hover:bg-orange-500/10 text-slate-300 hover:text-orange-400 border border-slate-700/50 hover:border-orange-500/40 rounded-2xl font-bold text-sm transition-all"
                >
                  {clearStatus === 'clearing' ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
                  {clearStatus === 'clearing' ? 'Clearing Mosaic...' : 'Clear Mosaic'}
                </button>
              </div>

              {/* Random Fill panel */}
              <div className="bg-slate-900/40 backdrop-blur-lg border border-slate-800/60 rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-200 flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-purple-400" /> Random Fill
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Fill all remaining empty cells using already-uploaded guest photos. Photos cycle randomly.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {fillMessage && (
                    <span className={`text-xs font-bold px-3 py-2 rounded-xl border ${fillStatus === 'done' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'}`}>
                      {fillMessage}
                    </span>
                  )}
                  <button
                    onClick={handleRandomFill}
                    disabled={fillStatus === 'filling' || !connected}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all"
                  >
                    {fillStatus === 'filling'
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Filling…</>
                      : <><LayoutGrid className="w-4 h-4" /> Fill Empty Cells</>}
                  </button>
                </div>
              </div>

              {/* Bulk Upload panel */}
              <div className="bg-slate-900/40 backdrop-blur-lg border border-slate-800/60 rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-200 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-indigo-400" /> Bulk Upload
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Upload up to 50 images at once — each is auto-approved and placed at a random free cell.
                  </p>
                </div>

                {/* File picker */}
                <div
                  onClick={() => bulkInputRef.current?.click()}
                  className={`relative w-full py-8 border-2 border-dashed rounded-xl cursor-pointer transition-all text-center ${bulkFiles.length > 0 ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-slate-700 hover:border-indigo-500/40 hover:bg-slate-900'}`}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                  {bulkFiles.length > 0 ? (
                    <p className="text-indigo-400 font-bold">{bulkFiles.length} file{bulkFiles.length > 1 ? 's' : ''} selected</p>
                  ) : (
                    <p className="text-slate-500 font-medium">Click to select multiple images</p>
                  )}
                  <p className="text-xs text-slate-600 mt-1">PNG, JPG, WEBP · up to 50 files</p>
                  <input
                    ref={bulkInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []).slice(0, 50);
                      setBulkFiles(files);
                      setBulkError(null);
                      setBulkProgress(null);
                    }}
                  />
                </div>

                {/* Selected file chips */}
                {bulkFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                    {bulkFiles.map((f, i) => (
                      <span key={i} className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-lg truncate max-w-[140px] border border-slate-700">
                        {f.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Progress / error */}
                {bulkProgress && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-400">
                      <span>{bulkProgress.done === bulkProgress.total ? '✓ All uploaded!' : 'Uploading…'}</span>
                      <span>{bulkProgress.done} / {bulkProgress.total}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {bulkError && (
                  <p className="text-rose-400 text-sm font-semibold bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                    {bulkError}
                  </p>
                )}

                <div className="flex items-center gap-3">
                  {bulkFiles.length > 0 && (
                    <button
                      onClick={() => { setBulkFiles([]); setBulkError(null); setBulkProgress(null); }}
                      className="px-4 py-2.5 text-sm font-bold text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-xl transition-all"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={handleBulkUpload}
                    disabled={bulkFiles.length === 0 || !!bulkProgress}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all"
                  >
                    {bulkProgress && bulkProgress.done < bulkProgress.total
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                      : <><Upload className="w-4 h-4" /> Upload {bulkFiles.length > 0 ? bulkFiles.length : ''} Photos</>}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ── GRID SETUP ── */}
          {activeSection === 'grid' && (
            <div className="max-w-2xl space-y-8">
              <div className="bg-slate-900/40 backdrop-blur-lg border border-slate-800/60 rounded-2xl p-8 space-y-8">
                <h3 className="text-lg font-bold text-slate-200">Grid Dimensions</h3>

                {/* Custom width / height */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Columns (Width)</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateGrid('width', Math.max(1, grid.width - 1))} className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors shrink-0">−</button>
                      <input
                        type="number" min={1} max={100}
                        value={grid.width}
                        onChange={(e) => updateGrid('width', parseInt(e.target.value) || 1)}
                        className="flex-1 text-center p-2.5 bg-slate-950/50 border border-slate-700/50 rounded-xl outline-none focus:border-indigo-500/50 text-white font-bold text-lg"
                      />
                      <button onClick={() => updateGrid('width', Math.min(100, grid.width + 1))} className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors shrink-0">+</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Rows (Height)</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateGrid('height', Math.max(1, grid.height - 1))} className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors shrink-0">−</button>
                      <input
                        type="number" min={1} max={100}
                        value={grid.height}
                        onChange={(e) => updateGrid('height', parseInt(e.target.value) || 1)}
                        className="flex-1 text-center p-2.5 bg-slate-950/50 border border-slate-700/50 rounded-xl outline-none focus:border-indigo-500/50 text-white font-bold text-lg"
                      />
                      <button onClick={() => updateGrid('height', Math.min(100, grid.height + 1))} className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors shrink-0">+</button>
                    </div>
                  </div>
                </div>

                {/* Total tiles indicator */}
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-400">Total Tiles</span>
                  <span className="text-2xl font-black text-indigo-400">{grid.width * grid.height}</span>
                </div>

                {/* Quick presets */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Quick Presets</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Small', w: 10, h: 10 },
                      { label: 'Standard', w: 20, h: 15 },
                      { label: 'Wide 4K', w: 40, h: 25 },
                      { label: 'Portrait', w: 12, h: 20 },
                      { label: 'Square', w: 25, h: 25 },
                      { label: 'Ultra', w: 50, h: 30 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        onClick={() => setGrid((prev) => ({ ...prev, width: p.w, height: p.h }))}
                        className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${grid.width === p.w && grid.height === p.h ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}
                      >
                        {p.label}<br/>
                        <span className="font-mono opacity-60">{p.w}×{p.h}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-slate-800/60" />
                <h3 className="text-lg font-bold text-slate-200">Visual Styling</h3>

                {/* Gap size */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Tile Gap</label>
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md">{grid.gapSize}px</span>
                  </div>
                  <input type="range" min={0} max={16} value={grid.gapSize}
                    onChange={(e) => updateGrid('gapSize', parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                </div>

                {/* Border radius */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Tile Rounding</label>
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md">{grid.borderRadius}px</span>
                  </div>
                  <input type="range" min={0} max={20} value={grid.borderRadius}
                    onChange={(e) => updateGrid('borderRadius', parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                </div>

                <hr className="border-slate-800/60" />
                <h3 className="text-lg font-bold text-slate-200">Animations</h3>

                {/* Animation type */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Entry Animation</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['fade', 'scale', 'slide'].map((anim) => (
                      <button key={anim}
                        onClick={() => updateGrid('animation', anim)}
                        className={`py-3 rounded-xl text-sm font-bold capitalize border transition-all ${grid.animation === anim ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}>
                        {anim}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Animation speed */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Animation Speed</label>
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md">{grid.animationSpeed}s</span>
                  </div>
                  <input type="range" min={0.1} max={3} step={0.1} value={grid.animationSpeed}
                    onChange={(e) => updateGrid('animationSpeed', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                </div>
              </div>
            </div>
          )}

          {/* ── BACKGROUND ── */}
          {activeSection === 'background' && (
            <div className="max-w-2xl space-y-8">
              <div className="bg-slate-900/40 backdrop-blur-lg border border-slate-800/60 rounded-2xl p-8 space-y-6">
                <h3 className="text-lg font-bold text-slate-200">Background Image</h3>

                {/* Upload zone */}
                <div
                  onClick={() => bgFileRef.current?.click()}
                  className={`relative w-full aspect-video rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden group transition-all ${bgPreview ? 'border-transparent shadow-2xl' : 'border-slate-700 bg-slate-950/50 hover:border-indigo-500/50 hover:bg-slate-900'}`}
                >
                  {bgPreview ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={bgPreview} alt="Background preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <span className="text-white font-bold flex items-center gap-2 bg-white/20 px-5 py-3 rounded-full backdrop-blur-md">
                          <Upload className="w-4 h-4" /> Change Image
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setBgPreview(null); }}
                          className="text-white font-bold flex items-center gap-2 bg-rose-500/50 px-5 py-3 rounded-full backdrop-blur-md hover:bg-rose-500"
                        >
                          <X className="w-4 h-4" /> Remove
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8 space-y-4">
                      <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30 transition-all">
                        <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-slate-300 group-hover:text-indigo-400 transition-colors">Click to upload background</p>
                        <p className="text-sm text-slate-500 mt-1">PNG, JPG, WEBP — recommended 1920×1080</p>
                      </div>
                    </div>
                  )}
                  <input ref={bgFileRef} type="file" accept="image/*" className="hidden" onChange={handleBgFile} />
                </div>

                {/* Opacity control */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Background Opacity (behind tiles)</label>
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md">{grid.bgOpacity}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={grid.bgOpacity}
                    onChange={(e) => updateGrid('bgOpacity', parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                </div>

                {bgPreview && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                    <p className="text-sm text-emerald-300 font-semibold">Background image loaded. Hit <span className="text-white font-bold">&quot;Push to Display&quot;</span> to apply to the live wall.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── MODERATION / LIVE FEED ── */}
          {activeSection === 'moderation' && (
            <div className="max-w-2xl space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-200">Live Approved Feed</h3>
                  <p className="text-slate-500 text-sm font-medium mt-0.5">Auto-approval is ON — photos go straight to the display.</p>
                </div>
                <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs rounded-lg">
                  {approvedTiles.length} Added
                </span>
              </div>

              {approvedTiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 bg-slate-900/40 border border-slate-800/60 rounded-2xl text-center">
                  <ImageIcon className="w-12 h-12 text-slate-700 mb-4" />
                  <p className="font-bold text-slate-500">No photos uploaded yet</p>
                  <p className="text-sm text-slate-600 mt-1">Approved photos will appear here in real-time.</p>
                </div>
              ) : (
                approvedTiles.map((tile) => (
                  <div key={tile.id} className="flex items-center gap-5 p-5 bg-slate-900/40 backdrop-blur-lg border border-slate-800/60 rounded-2xl hover:bg-slate-800/40 transition-colors">
                    <div className="w-20 h-20 bg-slate-800 rounded-xl border border-slate-700 shrink-0 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={tile.imageUrl} alt="Tile" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-200 truncate">{tile.uploader || 'Guest'}</h4>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        Grid position: ({tile.gridX}, {tile.gridY})
                      </p>
                      <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <Check className="w-3 h-3" /> Auto-approved · On display
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          {/* ── PRIZE BOX ── */}
          {activeSection === 'prizebox' && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-slate-900/40 backdrop-blur-lg border border-slate-800/60 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-base font-black text-slate-200 flex items-center gap-2">
                      <Gift className="w-5 h-5 text-yellow-400" /> Prize Cell Selector
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Click cells to mark them as prize boxes. When a guest photo lands on one, the TV shows a win celebration.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {prizeCells.size > 0 && (
                      <span className="px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-black text-sm rounded-xl flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5" /> {prizeCells.size} selected
                      </span>
                    )}
                    {prizeCells.size > 0 && (
                      <button onClick={() => setPrizeCells(new Set())} className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-xl transition-all">
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={savePrizeCells}
                      disabled={prizeStatus === 'saving' || !connected}
                      className="flex items-center gap-2 px-5 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-xl font-black text-sm transition-all"
                    >
                      {prizeStatus === 'saving' ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                        : prizeStatus === 'saved' ? <><Check className="w-4 h-4" /> Saved!</>
                        : <><Gift className="w-4 h-4" /> Save Prize Cells</>}
                    </button>
                  </div>
                </div>
                <div className="overflow-auto max-h-[55vh] rounded-xl border border-slate-800/60 bg-black/30 p-2">
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${grid.width}, minmax(18px, 1fr))`, gap: '2px' }}>
                    {Array.from({ length: grid.width * grid.height }).map((_, idx) => {
                      const x = idx % grid.width;
                      const y = Math.floor(idx / grid.width);
                      const key = `${x},${y}`;
                      const isPrize = prizeCells.has(key);
                      return (
                        <button
                          key={key}
                          onClick={() => togglePrizeCell(x, y)}
                          title={`(${x},${y})${isPrize ? ' — Prize!' : ''}`}
                          className={`aspect-square rounded-sm transition-all flex items-center justify-center text-[7px] ${isPrize
                            ? 'bg-yellow-400/25 border border-yellow-400/70 shadow-[0_0_6px_rgba(234,179,8,0.5)]'
                            : 'bg-slate-800/60 border border-slate-700/30 hover:bg-slate-700/60'}`}
                        >
                          {isPrize ? '🎁' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="text-xs text-slate-600 text-center">
                  Grid {grid.width} × {grid.height} · {grid.width * grid.height} total cells · click to toggle
                </p>
              </div>
            </div>
          )}
          {/* ── ANALYTICS & EXPORT ── */}
          {activeSection === 'analytics' && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-slate-900/40 backdrop-blur-lg border border-slate-800/60 rounded-2xl p-8 space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-200 flex items-center gap-2">
                    <Activity className="w-6 h-6 text-blue-400" /> Event Analytics & Data Export
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Export all guest submissions, contact details, and photo links to share with your client or for post-event marketing.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CSV Export Card */}
                  <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400">
                        <MonitorPlay className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-200">CSV Spreadsheet</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Full guest list & metadata</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Includes guest names, email addresses, grid positions, and direct links to every uploaded photo.
                    </p>
                    <button
                      onClick={() => {
                        const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://mosaic-wall-backend.salurprabha.workers.dev';
                        const token = localStorage.getItem('mosaic_token');
                        window.open(`${backend}/api/admin/export-csv?mosaicId=${mosaicId}&token=${token}`, '_blank');
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all"
                    >
                      <DownloadCloud className="w-4 h-4" /> Download Event Report (.csv)
                    </button>
                  </div>

                  {/* Photo Archive Placeholder/Info */}
                  <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-200">Photo Archive</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Raw original images</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      You can find all originally uploaded high-resolution photos in the `uploads/` folder of the backend.
                    </p>
                    <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-center">
                      <p className="text-xs font-mono text-slate-500">Total Approved Photos: {totalApproved}</p>
                    </div>
                  </div>
                </div>

                {/* Integration Tips */}
                <div className="p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex gap-4">
                  <div className="mt-1">
                    <Zap className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-200 text-sm">Pro Tip: Client Sharing</h5>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                      The CSV report can be directly imported into Excel or Google Sheets. It&apos;s the perfect document to hand over to your event client as proof of engagement.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PHYSICAL MOSAIC ── */}
          {activeSection === 'physical' && (
            <div className="space-y-6 max-w-3xl">

              {/* How it works strip */}
              <div className="bg-slate-900/40 backdrop-blur-lg border border-slate-800/60 rounded-2xl p-6">
                <h3 className="text-base font-black text-slate-200 flex items-center gap-2 mb-4">
                  <Printer className="w-5 h-5 text-indigo-400" /> How Physical Mosaic Works
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    { n: '1', icon: '📸', title: 'Guests Upload', desc: 'They receive a sticker card with their position' },
                    { n: '2', icon: '🖨️', title: 'Print Stickers', desc: 'Download the sticker sheet PDF and cut each tile' },
                    { n: '3', icon: '🗺️', title: 'Stick to Backdrop', desc: 'Guests find their numbered spot and stick their photo to reveal the image' },
                  ].map(s => (
                    <div key={s.n} className="flex flex-col items-center gap-2 p-4 bg-slate-800/40 rounded-xl border border-slate-700/30">
                      <span className="text-3xl">{s.icon}</span>
                      <p className="font-black text-slate-200 text-sm">{s.title}</p>
                      <p className="text-slate-500 text-xs">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sticker Sheet card */}
              <div className="bg-slate-900/40 backdrop-blur-lg border border-slate-800/60 rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-200 flex items-center gap-2">
                    <span className="text-xl">🏷️</span> Sticker Sheet
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    All guest photos laid out as cut-and-stick tiles on A4 pages. Each shows name, column, row, and cell number.
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-slate-400 font-bold">Sticker size:</span>
                  {[{ label: '5 × 5 cm', v: '0' }, { label: '7 × 7 cm', v: '1' }, { label: '10 × 10 cm', v: '2' }].map(s => (
                    <span key={s.v} className="px-3 py-1 bg-slate-800 text-slate-400 text-xs font-bold rounded-lg border border-slate-700">{s.label}</span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.open(`/print/stickers?mosaicId=${mosaicId}`, '_blank')}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all"
                  >
                    <Printer className="w-4 h-4" /> Open Sticker Sheet →
                  </button>
                  <button
                    onClick={() => window.open(`/print/cards?mosaicId=${mosaicId}`, '_blank')}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-sm border border-slate-700 transition-all"
                  >
                    <Printer className="w-4 h-4" /> Open 6x4 Photo Cards →
                  </button>
                </div>
              </div>

              {/* Backdrop Template card */}
              <div className="bg-slate-900/40 backdrop-blur-lg border border-slate-800/60 rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-200 flex items-center gap-2">
                    <span className="text-xl">🗺️</span> Backdrop Template
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Numbered grid overlay on your background image — ready for large-format printing. Each cell shows its number so guests know exactly where to place their sticker.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 font-bold">Grid: {grid.width} × {grid.height}</span>
                  <span className="bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 font-bold">{grid.width * grid.height} cells</span>
                  <span className={`px-3 py-1 rounded-lg border font-bold ${connected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                    Background: {connected ? 'Ready' : 'Check admin'}
                  </span>
                </div>
                <button
                  onClick={() => window.open(`/print/backdrop?mosaicId=${mosaicId}`, '_blank')}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all"
                >
                  <Printer className="w-4 h-4" /> Open Backdrop Template →
                </button>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}

