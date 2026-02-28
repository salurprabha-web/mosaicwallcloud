import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8787';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

type Post = {
  id: string; slug: string; title: string; excerpt?: string; content: string;
  coverImageUrl?: string; author: string; publishedAt?: string; tags?: string;
  metaTitle?: string; metaDesc?: string; ogImage?: string;
};

async function getPost(slug: string): Promise<Post | null> {
  try {
    const r = await fetch(`${backendUrl}/api/blog/${slug}`, { next: { revalidate: 60 } });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

async function getSettings() {
  try { const r = await fetch(`${backendUrl}/api/site-settings`, { next: { revalidate: 300 } }); return r.ok ? r.json() : {}; } catch { return {}; }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: 'Post Not Found' };
  const title = post.metaTitle || post.title;
  const desc = post.metaDesc || post.excerpt || '';
  const image = post.ogImage || post.coverImageUrl;
  return {
    title,
    description: desc,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { title, description: desc, type: 'article', publishedTime: post.publishedAt, authors: [post.author], images: image ? [{ url: image }] : [] },
    twitter: { card: 'summary_large_image', title, description: desc, images: image ? [image] : [] },
  };
}

// Simple markdown → HTML renderer (no deps)
function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-black text-white mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-black text-white mt-10 mb-4">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-black text-white mt-10 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-black">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-slate-300">$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-indigo-400 hover:text-indigo-300 underline">$1</a>')
    .replace(/^- (.+)$/gm, '<li class="text-slate-400 ml-4 list-disc">$1</li>')
    .split('\n\n').map(p => p.startsWith('<') ? p : `<p class="text-slate-400 leading-relaxed my-4">${p}</p>`).join('\n');
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const [post, settings] = await Promise.all([getPost(params.slug), getSettings()]);
  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.coverImageUrl,
    author: { '@type': 'Person', name: post.author },
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    publisher: { '@type': 'Organization', name: settings.site_name || 'Mosaic Wall' },
    url: `${siteUrl}/blog/${post.slug}`,
  };

  return (
    <>
      <Navbar />
      <WhatsAppButton whatsapp={settings.whatsapp} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}/>

      <main className="pt-24 min-h-screen">
        {/* Cover */}
        {post.coverImageUrl && <div className="w-full h-80 overflow-hidden"><img src={post.coverImageUrl} alt={post.title} className="w-full h-full object-cover"/></div>}
        {!post.coverImageUrl && <div className="w-full h-64 bg-gradient-to-br from-indigo-900/20 to-violet-900/20"/>}

        <article className="max-w-3xl mx-auto px-6 py-12">
          {/* Meta */}
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags?.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
              <span key={tag} className="px-3 py-1 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-xs font-black rounded-full uppercase tracking-wider">{tag}</span>
            ))}
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6">{post.title}</h1>

          <div className="flex items-center gap-3 pb-8 border-b border-slate-800/60 mb-8">
            <div className="w-10 h-10 bg-indigo-600/20 border border-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 font-black">{post.author[0]}</div>
            <div>
              <p className="text-white font-black text-sm">{post.author}</p>
              <p className="text-slate-500 text-xs">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</p>
            </div>
          </div>

          {/* Content */}
          <div className="prose-custom" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}/>

          {/* Footer nav */}
          <div className="mt-16 pt-8 border-t border-slate-800/60">
            <Link href="/blog" className="text-indigo-400 hover:text-indigo-300 font-black text-sm transition-colors">← Back to Blog</Link>
          </div>
        </article>
      </main>

      <Footer siteName={settings.site_name} tagline={settings.footer_tagline} contactEmail={settings.contact_email} phone={settings.phone} whatsapp={settings.whatsapp} address={settings.address} socialInstagram={settings.social_instagram} socialTwitter={settings.social_twitter}/>
    </>
  );
}
