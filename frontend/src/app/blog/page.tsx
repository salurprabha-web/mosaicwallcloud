import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8787';

async function getSettings() {
  try { const r = await fetch(`${backendUrl}/api/site-settings`, { next: { revalidate: 300 } }); return r.ok ? r.json() : {}; } catch { return {}; }
}

type Post = { id: string; slug: string; title: string; excerpt?: string; coverImageUrl?: string; author: string; publishedAt?: string; tags?: string };

async function getPosts(): Promise<Post[]> {
  try { const r = await fetch(`${backendUrl}/api/blog`, { next: { revalidate: 60 } }); return r.ok ? r.json() : []; } catch { return []; }
}

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Tips, insights, and event inspiration from the Mosaic Wall team.',
  alternates: { canonical: '/blog' },
  openGraph: { title: 'Blog | Mosaic Wall', type: 'website' },
};

export default async function BlogPage() {
  const [posts, settings] = await Promise.all([getPosts(), getSettings()]);

  return (
    <>
      <Navbar />
      <WhatsAppButton whatsapp={settings.whatsapp} />
      <main className="pt-24 min-h-screen">
        {/* Header */}
        <section className="py-16 text-center relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(99,102,241,0.1),transparent)]"/>
          <div className="relative max-w-3xl mx-auto px-6">
            <span className="inline-block px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-xs font-black rounded-full mb-4 uppercase tracking-widest">📖 Blog</span>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Tips, Ideas & Event Inspiration</h1>
            <p className="text-slate-400 text-lg">Learn how to create unforgettable experiences with digital and physical mosaic walls.</p>
          </div>
        </section>

        {/* Posts Grid */}
        <section className="py-12 max-w-7xl mx-auto px-6">
          {posts.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-6xl mb-4">📝</p>
              <p className="text-slate-400 font-bold">No posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map(post => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group bg-slate-900/40 border border-slate-800/60 hover:border-indigo-500/30 rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(99,102,241,0.1)]">
                  {post.coverImageUrl
                    ? <img src={post.coverImageUrl} alt={post.title} className="w-full h-48 object-cover"/>
                    : <div className="w-full h-48 bg-gradient-to-br from-indigo-900/30 to-violet-900/30 flex items-center justify-center text-4xl">📸</div>
                  }
                  <div className="p-6">
                    {post.tags && <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">{post.tags.split(',')[0]?.trim()}</span>}
                    <h2 className="text-lg font-black text-white mt-2 mb-2 line-clamp-2 group-hover:text-indigo-300 transition-colors">{post.title}</h2>
                    <p className="text-slate-500 text-sm line-clamp-3">{post.excerpt}</p>
                    <div className="flex items-center gap-2 mt-5 pt-5 border-t border-slate-800/60 text-xs text-slate-600">
                      <span className="w-6 h-6 bg-indigo-600/20 rounded-full flex items-center justify-center text-indigo-400 font-black text-xs">{post.author[0]}</span>
                      <span className="font-bold text-slate-400">{post.author}</span>
                      <span>·</span>
                      <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer siteName={settings.site_name} tagline={settings.footer_tagline} contactEmail={settings.contact_email} phone={settings.phone} whatsapp={settings.whatsapp} address={settings.address} socialInstagram={settings.social_instagram} socialTwitter={settings.social_twitter}/>
    </>
  );
}
