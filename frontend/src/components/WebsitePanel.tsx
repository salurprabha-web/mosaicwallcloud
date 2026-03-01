'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Plus, Trash2, Eye, EyeOff, ExternalLink, AlertCircle, Check, Loader2, Edit3, X, Globe, FileText, Layout } from 'lucide-react';

const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://mosaic-wall-backend.salurprabha.workers.dev';

type BlogPost = {
  id: string; slug: string; title: string; excerpt?: string; content: string;
  coverImageUrl?: string; author: string; published: boolean; publishedAt?: string;
  metaTitle?: string; metaDesc?: string; ogImage?: string; tags?: string;
};

type SiteSettings = Record<string, string>;

type PageSection = {
  id: string; page: string; sectionKey: string; title?: string; subtitle?: string;
  body?: string; ctaText?: string; ctaUrl?: string; badge?: string; visible: boolean;
};

type Tab = 'settings' | 'blog' | 'sections';

// ── Helpers ────────────────────────────────────────────────────────────────────
async function apiFetch(path: string, opts?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('mosaic_token') : null;
  const res = await fetch(`${backend}/api${path}`, { 
    ...opts,
    headers: {
      ...opts?.headers,
      'Authorization': `Bearer ${token}`
    },
    credentials: 'include' 
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Site Settings Panel ────────────────────────────────────────────────────────
const SETTING_FIELDS = [
  { key: 'site_name', label: 'Site Name', placeholder: 'Mosaic Wall' },
  { key: 'site_tagline', label: 'Tagline', placeholder: 'Turn Any Event Into A Living Mosaic' },
  { key: 'meta_description', label: 'Meta Description (SEO)', placeholder: '150-160 chars for search engines...', textarea: true },
  { key: 'og_image', label: 'OG Image URL', placeholder: 'https://your-domain.com/og.jpg' },
  { key: 'ga_id', label: 'Google Analytics ID', placeholder: 'G-XXXXXXXXXX' },
  { key: 'contact_email', label: 'Contact Email', placeholder: 'hello@example.com' },
  { key: 'phone', label: 'Phone Number', placeholder: '9063679687' },
  { key: 'whatsapp', label: 'WhatsApp Number', placeholder: '9063679687 (digits only, no +91)' },
  { key: 'address', label: 'Office Address', placeholder: 'Full address...', textarea: true },
  { key: 'footer_tagline', label: 'Footer Tagline', placeholder: 'Making memories, one photo at a time.' },
  { key: 'social_instagram', label: 'Instagram URL', placeholder: 'https://instagram.com/...' },
  { key: 'social_twitter', label: 'Twitter / X URL', placeholder: 'https://twitter.com/...' },
];

function SiteSettingsPanel() {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch('/superadmin/site-settings').then(setSettings).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/superadmin/site-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-400"/></div>;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-white">Site Settings</h2>
          <p className="text-slate-400 text-sm">Controls your website's SEO meta tags, social info, and branding.</p>
        </div>
        <button onClick={save} disabled={saving} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all ${saved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : saved ? <Check className="w-4 h-4"/> : <Save className="w-4 h-4"/>}
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {SETTING_FIELDS.map(f => (
        <div key={f.key}>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">{f.label}</label>
          {f.textarea
            ? <textarea
                value={settings[f.key] || ''}
                onChange={e => setSettings(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                rows={3}
                className="w-full bg-slate-800/40 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors resize-none"
              />
            : <input
                value={settings[f.key] || ''}
                onChange={e => setSettings(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full bg-slate-800/40 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
              />
          }
        </div>
      ))}
    </div>
  );
}

// ── Blog Post Form ─────────────────────────────────────────────────────────────
const EMPTY_POST: Omit<BlogPost, 'id'> = {
  slug: '', title: '', content: '', excerpt: '', coverImageUrl: '', author: 'Admin',
  published: false, metaTitle: '', metaDesc: '', ogImage: '', tags: '',
};

function BlogForm({ post, onSave, onCancel }: { post?: BlogPost; onSave: () => void; onCancel: () => void }) {
  const [form, setForm] = useState<Omit<BlogPost, 'id'>>(post ? { ...post } : { ...EMPTY_POST });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'content' | 'seo'>('content');

  const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));
  const autoSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const save = async () => {
    if (!form.title || !form.slug) { setError('Title and slug are required.'); return; }
    setSaving(true); setError('');
    try {
      if (post) {
        await apiFetch(`/superadmin/blog/${post.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      } else {
        await apiFetch('/superadmin/blog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      }
      onSave();
    } catch (e: any) { setError(e.message || 'Failed to save'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h3 className="font-black text-white">{post ? 'Edit Post' : 'New Blog Post'}</h3>
          <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
        </div>

        <div className="flex gap-1 px-6 pt-4">
          {(['content', 'seo'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:text-white'}`}>{t}</button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {tab === 'content' ? (
            <>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Title *</label>
                <input value={form.title} onChange={e => { field('title')(e); if (!post) setForm(prev => ({ ...prev, title: e.target.value, slug: autoSlug(e.target.value) })); }} className="w-full bg-slate-800/40 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors" placeholder="Post title..."/>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Slug * <span className="text-slate-600 normal-case font-medium">(URL: /blog/{'{slug}'})</span></label>
                <input value={form.slug} onChange={field('slug')} className="w-full bg-slate-800/40 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none font-mono transition-colors" placeholder="url-friendly-slug"/>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Excerpt</label>
                <textarea value={form.excerpt || ''} onChange={field('excerpt')} rows={2} className="w-full bg-slate-800/40 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none resize-none" placeholder="Short summary..."/>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Content <span className="text-slate-600 normal-case font-medium">(Markdown supported)</span></label>
                <textarea value={form.content} onChange={field('content')} rows={12} className="w-full bg-slate-800/40 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none resize-y font-mono" placeholder="Write your blog post in Markdown...&#10;&#10;## Heading&#10;**bold**, *italic*, [links](url)"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Author</label>
                  <input value={form.author} onChange={field('author')} className="w-full bg-slate-800/40 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="Admin"/>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Tags <span className="text-slate-600 normal-case font-medium">(comma-separated)</span></label>
                  <input value={form.tags || ''} onChange={field('tags')} className="w-full bg-slate-800/40 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="events, mosaic, tips"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Cover Image URL</label>
                <input value={form.coverImageUrl || ''} onChange={field('coverImageUrl')} className="w-full bg-slate-800/40 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="https://..."/>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-indigo-600/5 border border-indigo-500/20 rounded-xl mb-2">
                <p className="text-indigo-300 text-xs font-bold">SEO fields override the default title and description in search results and social shares. Leave empty to use the post title/excerpt.</p>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">SEO Title <span className="text-slate-600 normal-case">(50-60 chars ideal)</span></label>
                <input value={form.metaTitle || ''} onChange={field('metaTitle')} className="w-full bg-slate-800/40 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="Override title for search engines..."/>
                <p className="text-slate-600 text-xs mt-1">{(form.metaTitle || '').length}/60 chars</p>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">SEO Description <span className="text-slate-600 normal-case">(150-160 chars ideal)</span></label>
                <textarea value={form.metaDesc || ''} onChange={field('metaDesc')} rows={3} className="w-full bg-slate-800/40 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none resize-none" placeholder="Override description for search results..."/>
                <p className="text-slate-600 text-xs mt-1">{(form.metaDesc || '').length}/160 chars</p>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">OG Image URL <span className="text-slate-600 normal-case">(1200×630px for social)</span></label>
                <input value={form.ogImage || ''} onChange={field('ogImage')} className="w-full bg-slate-800/40 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="https://..."/>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-800/40 border border-slate-700 rounded-xl">
                <button onClick={() => setForm(prev => ({ ...prev, published: !prev.published }))} className={`relative w-12 h-6 rounded-full transition-all ${form.published ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.published ? 'left-6.5 left-[26px]' : 'left-0.5'}`}/>
                </button>
                <div>
                  <p className="text-white font-black text-sm">{form.published ? '🟢 Published' : '⚪ Draft'}</p>
                  <p className="text-slate-500 text-xs">{form.published ? 'Visible on /blog' : 'Hidden from public'}</p>
                </div>
              </div>
            </>
          )}

          {error && <p className="flex items-center gap-2 text-rose-400 text-sm font-bold"><AlertCircle className="w-4 h-4"/>{error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl font-black text-sm transition-all">
              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
              {saving ? 'Saving...' : post ? 'Update Post' : 'Create Post'}
            </button>
            <button onClick={onCancel} className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition-all">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Blog Panel ─────────────────────────────────────────────────────────────────
function BlogPanel() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogPost | null | 'new'>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/superadmin/blog').then(setPosts).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const del = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    await apiFetch(`/superadmin/blog/${id}`, { method: 'DELETE' });
    load();
  };

  const togglePublish = async (post: BlogPost) => {
    await apiFetch(`/superadmin/blog/${post.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...post, published: !post.published }) });
    load();
  };

  return (
    <div>
      {(editing === 'new' || editing) && (
        <BlogForm
          post={editing === 'new' ? undefined : editing}
          onSave={() => { setEditing(null); load(); }}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-white">Blog Posts</h2>
          <p className="text-slate-400 text-sm">All blog content with full SEO controls per post.</p>
        </div>
        <button onClick={() => setEditing('new')} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-sm transition-all">
          <Plus className="w-4 h-4"/> New Post
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-400"/></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 border border-slate-800 border-dashed rounded-2xl">
          <FileText className="w-10 h-10 text-slate-700 mx-auto mb-3"/>
          <p className="text-slate-500 font-bold">No blog posts yet.</p>
          <button onClick={() => setEditing('new')} className="mt-3 text-indigo-400 hover:text-indigo-300 font-black text-sm transition-colors">Create your first post →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post.id} className="flex items-center gap-4 bg-slate-900/40 border border-slate-800/60 rounded-xl px-5 py-4 hover:border-slate-700 transition-all">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${post.published ? 'bg-emerald-400' : 'bg-slate-600'}`}/>
                  <p className="font-black text-white truncate">{post.title}</p>
                  {post.metaTitle && <span className="shrink-0 text-xs bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold">SEO ✓</span>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  <span className="font-mono">/blog/{post.slug}</span>
                  <span>·</span>
                  <span>{post.author}</span>
                  <span>·</span>
                  <span>{post.published ? `Published ${post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''}` : 'Draft'}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {post.published && (
                  <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-500 hover:text-indigo-400 transition-colors" title="View post">
                    <ExternalLink className="w-4 h-4"/>
                  </a>
                )}
                <button onClick={() => togglePublish(post)} className={`p-2 transition-colors ${post.published ? 'text-emerald-400 hover:text-slate-400' : 'text-slate-500 hover:text-emerald-400'}`} title={post.published ? 'Unpublish' : 'Publish'}>
                  {post.published ? <Eye className="w-4 h-4"/> : <EyeOff className="w-4 h-4"/>}
                </button>
                <button onClick={() => setEditing(post)} className="p-2 text-slate-500 hover:text-white transition-colors" title="Edit">
                  <Edit3 className="w-4 h-4"/>
                </button>
                <button onClick={() => del(post.id)} className="p-2 text-slate-500 hover:text-rose-400 transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page Sections Panel ────────────────────────────────────────────────────────
const SECTION_PAGES = ['home', 'features', 'about'] as const;
const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero Section', digital_mosaic: 'Digital Mosaic', physical_mosaic: 'Physical Mosaic',
  how_it_works: 'How It Works', stats: 'Stats Bar', cta: 'Call To Action',
};

function PageSectionsPanel() {
  const [page, setPage] = useState<typeof SECTION_PAGES[number]>('home');
  const [sections, setSections] = useState<PageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [editing, setEditing] = useState<PageSection | null>(null);
  const [editForm, setEditForm] = useState<Partial<PageSection>>({});

  useEffect(() => {
    setLoading(true);
    apiFetch(`/superadmin/page-sections/${page}`).then(setSections).finally(() => setLoading(false));
  }, [page]);

  const save = async (s: PageSection) => {
    setSaving(s.sectionKey);
    try {
      await apiFetch('/superadmin/page-sections', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
      setSaved(s.sectionKey); setTimeout(() => setSaved(null), 2000);
      setEditing(null);
      apiFetch(`/superadmin/page-sections/${page}`).then(setSections);
    } finally { setSaving(null); }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-black text-white mb-1">Page Sections</h2>
        <p className="text-slate-400 text-sm">Edit the content of each section on your public pages.</p>
      </div>

      <div className="flex gap-2 mb-6">
        {SECTION_PAGES.map(p => (
          <button key={p} onClick={() => setPage(p)} className={`px-4 py-2 rounded-lg text-sm font-black capitalize transition-all ${page === p ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:text-white bg-slate-800/40'}`}>{p}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-400"/></div>
      ) : (
        <div className="space-y-3">
          {Object.keys(SECTION_LABELS).map(key => {
            const s = sections.find(x => x.sectionKey === key);
            const isEditing = editing?.sectionKey === key;
            
            return (
              <div key={key} className={`bg-slate-900/40 border rounded-xl overflow-hidden transition-all ${s ? 'border-slate-800/60' : 'border-dashed border-slate-700/50 opacity-80'}`}>
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                       <p className="font-black text-white text-sm">{SECTION_LABELS[key]}</p>
                       {!s && <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Not Seeded</span>}
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5 truncate max-w-sm">{s?.title || 'No content yet...'}</p>
                  </div>
                  <button
                    onClick={() => { 
                      const target = s || { page, sectionKey: key, visible: true } as PageSection;
                      setEditing(isEditing ? null : target); 
                      setEditForm({ ...target }); 
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black transition-all ${isEditing ? 'bg-slate-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                  >
                    <Edit3 className="w-3.5 h-3.5"/> {isEditing ? 'Close' : s ? 'Edit' : 'Create'}
                  </button>
                </div>

                {isEditing && (
                  <div className="px-5 pb-5 space-y-3 border-t border-slate-800/60 pt-4">
                    {[
                      { k: 'badge', label: 'Badge / Pill Text', placeholder: '✨ Featured' },
                      { k: 'title', label: 'Title', placeholder: 'Section heading...' },
                      { k: 'subtitle', label: 'Subtitle', placeholder: 'Supporting text...' },
                      { k: 'ctaText', label: 'CTA Button Text', placeholder: 'Learn More' },
                      { k: 'ctaUrl', label: 'CTA Button URL', placeholder: '/features' },
                    ].map(f => (
                      <div key={f.k}>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">{f.label}</label>
                        <input value={(editForm as any)[f.k] || ''} onChange={e => setEditForm(prev => ({ ...prev, [f.k]: e.target.value }))} placeholder={f.placeholder} className="w-full bg-slate-800/40 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none transition-colors"/>
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Body / Content</label>
                      <textarea value={(editForm as any).body || ''} onChange={e => setEditForm(prev => ({ ...prev, body: e.target.value }))} rows={4} placeholder="Section body text..." className="w-full bg-slate-800/40 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none resize-none transition-colors"/>
                    </div>
                    <button onClick={() => save(key as any)} disabled={saving === key} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all ${saved === key ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
                      {saving === key ? <Loader2 className="w-4 h-4 animate-spin"/> : saved === key ? <Check className="w-4 h-4"/> : <Save className="w-4 h-4"/>}
                      {saved === key ? 'Saved!' : s ? 'Save Section' : 'Create & Save'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────────
export default function WebsitePanel() {
  const [tab, setTab] = useState<Tab>('settings');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'settings', label: 'Site Settings', icon: <Globe className="w-4 h-4"/> },
    { id: 'blog', label: 'Blog Posts', icon: <FileText className="w-4 h-4"/> },
    { id: 'sections', label: 'Page Sections', icon: <Layout className="w-4 h-4"/> },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-8 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${tab === t.id ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-800/40 text-slate-400 hover:text-white border border-transparent'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {tab === 'settings' && <SiteSettingsPanel/>}
      {tab === 'blog' && <BlogPanel/>}
      {tab === 'sections' && <PageSectionsPanel/>}
    </div>
  );
}
