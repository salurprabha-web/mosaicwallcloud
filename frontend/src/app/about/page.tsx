import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

async function getSettings() {
  try { const r = await fetch(`${backendUrl}/api/site-settings`, { next: { revalidate: 300 } }); return r.ok ? r.json() : {}; } catch { return {}; }
}

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about Mosaic Wall — the story behind the platform that turns events into living, breathing art.',
  alternates: { canonical: '/about' },
};

export default async function AboutPage() {
  const settings = await getSettings();

  return (
    <>
      <Navbar />
      <WhatsAppButton whatsapp={settings.whatsapp} />
      <main className="pt-24 min-h-screen">
        <section className="py-20 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(99,102,241,0.1),transparent)]"/>
          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <span className="inline-block px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-xs font-black rounded-full mb-4 uppercase tracking-widest">💡 Our Story</span>
            <h1 className="text-5xl md:text-6xl font-black text-white mb-6">We Make Events Unforgettable</h1>
            <p className="text-xl text-slate-400 leading-relaxed max-w-3xl mx-auto">
              Mosaic Wall was born from a simple idea: <strong className="text-white">what if your guests could become the art?</strong> We build real-time interactive technologies that put people at the heart of every event.
            </p>
          </div>
        </section>

        <section className="py-16 max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '🎯', title: 'Our Mission', body: 'To create immersive, participatory experiences that connect people and make every event memorable for years to come.' },
              { icon: '💡', title: 'Our Vision', body: 'A world where every event has a living, breathing art installation built by the people who matter most — the guests.' },
              { icon: '❤️', title: 'Our Values', body: 'We believe in simplicity, delight, and inclusivity. No frustrating apps. No complicated setups. Just pure human connection.' },
            ].map(item => (
              <div key={item.title} className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h2 className="text-xl font-black text-white mb-3">{item.title}</h2>
                <p className="text-slate-400 text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16 bg-slate-900/20">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-black text-white mb-12">What We Build</h2>
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div className="bg-slate-900/40 border border-indigo-500/20 rounded-3xl p-8">
                <h3 className="text-2xl font-black text-indigo-400 mb-3">📱 Digital Mosaic Wall</h3>
                <p className="text-slate-400 leading-relaxed">A real-time digital display where guest photos appear instantly and form a beautiful mosaic. Powered by WebSockets, it updates live — no refreshes, no delays.</p>
              </div>
              <div className="bg-slate-900/40 border border-amber-500/20 rounded-3xl p-8">
                <h3 className="text-2xl font-black text-amber-400 mb-3">🖼️ Physical Mosaic Experience</h3>
                <p className="text-slate-400 leading-relaxed">We print each guest photo as a sticker that gets physically placed on a massive mosaic backdrop. The result is a stunning piece of art that lives on after the event.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 text-center max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-black text-white mb-4">Let's Work Together</h2>
          <p className="text-slate-400 mb-8">Get in touch and let's create something unforgettable for your next event.</p>
          <a href="/contact" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-black text-lg transition-all shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:-translate-y-1">
            Contact Us →
          </a>
        </section>
      </main>
      <Footer siteName={settings.site_name} tagline={settings.footer_tagline} contactEmail={settings.contact_email} phone={settings.phone} whatsapp={settings.whatsapp} address={settings.address} socialInstagram={settings.social_instagram} socialTwitter={settings.social_twitter}/>
    </>
  );
}
