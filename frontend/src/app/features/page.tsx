import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';

const backendUrl = 'https://mosaic-wall-backend.salurprabha.workers.dev';

async function getSettings() {
  try { const r = await fetch(`${backendUrl}/api/site-settings`, { next: { revalidate: 300 } }); return r.ok ? r.json() : {}; } catch { return {}; }
}

export const metadata: Metadata = {
  title: 'Features',
  description: 'Explore all features of Mosaic Wall — real-time digital photo mosaics, physical print backdrops, prize boxes, live moderation, and more.',
  alternates: { canonical: '/features' },
  openGraph: { title: 'Features | Mosaic Wall', type: 'website' },
};

const DIGITAL_FEATURES = [
  { icon: '📡', title: 'Real-Time Photo Wall', desc: 'Guest photos appear on the display the moment they upload — no refresh needed.' },
  { icon: '🛡️', title: 'Auto-Approval & Moderation', desc: 'Enable moderation mode to review photos before they go live on the wall.' },
  { icon: '🎁', title: 'Prize Box System', desc: 'Mark specific grid cells as prize boxes. When a guest fills that cell, they win!' },
  { icon: '🎨', title: 'Custom Grid & Animations', desc: 'Configure grid dimensions, gap size, border radius, and entry animations.' },
  { icon: '📱', title: 'No App Required', desc: 'Guests upload from any phone browser via a QR code. Zero friction.' },
  { icon: '🌐', title: 'Multi-Event Support', desc: 'Manage unlimited simultaneous events from one SuperAdmin dashboard.' },
  { icon: '📊', title: 'Live Stats Dashboard', desc: 'See tiles placed, fill percentage, socket status, and recent uploads in real-time.' },
  { icon: '🔗', title: 'Shareable Links', desc: 'Each event has dedicated upload and display URLs — no login needed for guests.' },
];

const PHYSICAL_FEATURES = [
  { icon: '🖨️', title: 'Print-Ready Sticker Sheets', desc: 'Generate print-ready PDF sticker sheets with cell numbers for every participant.' },
  { icon: '🖼️', title: 'Physical Backdrop Design', desc: 'Create a large-format mosaic backdrop template ready for printing.' },
  { icon: '🔢', title: 'Cell-Numbered Tiles', desc: 'Each tile is numbered with its column and row position for easy placement.' },
  { icon: '📐', title: 'Custom Grid Sizes', desc: 'Design any grid size — from intimate 10×10 to massive 60×40 mosaics.' },
  { icon: '🎯', title: 'Physical Prize System', desc: 'Designate special cells on the physical grid for surprise prize moments.' },
  { icon: '🔄', title: 'Digital + Physical Sync', desc: 'Run both digital and physical mosaics simultaneously for maximum impact.' },
];

export default async function FeaturesPage() {
  const settings = await getSettings();

  return (
    <>
      <Navbar />
      <WhatsAppButton whatsapp={settings.whatsapp} />
      <main className="pt-24 min-h-screen">

        {/* Hero */}
        <section className="py-20 text-center relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(99,102,241,0.12),transparent)]"/>
          <div className="relative max-w-4xl mx-auto px-6">
            <span className="inline-block px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-xs font-black rounded-full mb-4 uppercase tracking-widest">🚀 Full-Featured Platform</span>
            <h1 className="text-5xl md:text-6xl font-black text-white mb-6">Every Feature You Need</h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">From real-time digital mosaic walls to printed physical backdrops — Mosaic Wall has everything for a flawless event experience.</p>
          </div>
        </section>

        {/* Digital Mosaic Features */}
        <section className="py-20 max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-2xl">📱</div>
            <div>
              <h2 className="text-3xl font-black text-white">Digital Mosaic Wall</h2>
              <p className="text-slate-400">Real-time, live, interactive photo experiences</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {DIGITAL_FEATURES.map(f => (
              <div key={f.title} className="bg-slate-900/40 border border-slate-800/60 hover:border-indigo-500/30 rounded-2xl p-6 transition-all group">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-black text-white mb-2 group-hover:text-indigo-300 transition-colors">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Physical Mosaic Features */}
        <section className="py-20 bg-slate-900/20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-12 h-12 bg-amber-600/20 border border-amber-500/30 rounded-2xl flex items-center justify-center text-2xl">🖼️</div>
              <div>
                <h2 className="text-3xl font-black text-white">Physical Mosaic Experience</h2>
                <p className="text-slate-400">Print-ready backdrops and sticker systems</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {PHYSICAL_FEATURES.map(f => (
                <div key={f.title} className="bg-slate-900/40 border border-slate-800/60 hover:border-amber-500/30 rounded-2xl p-6 transition-all group">
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="font-black text-white mb-2 group-hover:text-amber-300 transition-colors">{f.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 text-center max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-black text-white mb-4">Ready to Create Something Amazing?</h2>
          <p className="text-slate-400 mb-8">Get your event set up in under 24 hours.</p>
          <a href="/contact" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-black text-lg transition-all shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:-translate-y-1">
            Contact Us →
          </a>
        </section>
      </main>
      <Footer siteName={settings.site_name} tagline={settings.footer_tagline} contactEmail={settings.contact_email} phone={settings.phone} whatsapp={settings.whatsapp} address={settings.address} socialInstagram={settings.social_instagram} socialTwitter={settings.social_twitter}/>
    </>
  );
}
