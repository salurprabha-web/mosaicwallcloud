import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';

const backendUrl = 'https://mosaic-wall-backend.salurprabha.workers.dev';

type Section = { id: string; sectionKey: string; title?: string; subtitle?: string; body?: string; ctaText?: string; ctaUrl?: string; badge?: string };
type Settings = Record<string, string>;
type Post = { id: string; slug: string; title: string; excerpt?: string; coverImageUrl?: string; author: string; publishedAt?: string; tags?: string };

async function getSections(): Promise<Section[]> {
  try { 
    const r = await fetch(`${backendUrl}/api/page-sections/home`, { next: { revalidate: 0 } }); 
    if (!r.ok) return [{ id: 'error', sectionKey: 'hero', title: `Backend Error: ${r.status}`, subtitle: `Target: ${backendUrl}` }];
    return r.json(); 
  } catch (e: any) { 
    return [{ id: 'error', sectionKey: 'hero', title: 'Connection Failed', subtitle: e.message }]; 
  }
}
async function getSettings(): Promise<Settings> {
  try { 
    const r = await fetch(`${backendUrl}/api/site-settings`, { next: { revalidate: 0 } }); 
    if (!r.ok) return { site_name: `API ERR: ${r.status}` };
    return r.json(); 
  } catch (e: any) { 
    return { site_name: `API FAIL: ${e.message.slice(0, 10)}` }; 
  }
}
async function getRecentPosts(): Promise<Post[]> {
  try { const r = await fetch(`${backendUrl}/api/blog`, { next: { revalidate: 0 } }); return r.ok ? r.json() : []; } catch { return []; }
}

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: s.site_tagline || 'Turn Any Event Into A Living Mosaic',
    description: s.meta_description || 'Mosaic Wall creates stunning real-time digital photo mosaics for any event.',
    alternates: { canonical: '/' },
  };
}

const EVENT_TYPES = [
  { icon: '💍', label: 'Weddings', desc: 'Create a living memory wall where every guest becomes part of the couple\'s story.' },
  { icon: '🏢', label: 'Corporate Events', desc: 'Team photos, conferences, and product launches transformed into stunning branded mosaics.' },
  { icon: '🎂', label: 'Birthday Parties', desc: 'Milestone birthdays made unforgettable with a personalized photo mosaic backdrop.' },
  { icon: '🎪', label: 'Festivals & Expos', desc: 'High-traffic events with QR-code upload for thousands of guests without friction.' },
  { icon: '🎓', label: 'Graduations', desc: 'Commemorate the achievement with a class mosaic — every student in the frame.' },
  { icon: '🏆', label: 'Award Nights', desc: 'Photo walls that capture the glamour and energy of awards ceremonies in real time.' },
];

const TESTIMONIALS = [
  { quote: 'The mosaic wall was the highlight of our wedding! Guests couldn\'t stop uploading photos. Absolutely magical.', name: 'Priya & Arjun', event: 'Wedding, Hyderabad' },
  { quote: 'We used Mosaic Wall for our annual company conference. Our 800 employees loved seeing themselves on the live display.', name: 'Rahul Sharma', event: 'Corporate Event, Bangalore' },
  { quote: 'The physical mosaic backdrop is now framed in our office. A keepsake that reminds us of an incredible day.', name: 'Sunita Reddy', event: 'Product Launch, Hyderabad' },
];

export default async function HomePage() {
  const [sections, settings, posts] = await Promise.all([getSections(), getSettings(), getRecentPosts()]);
  const byKey = (key: string) => sections.find(s => s.sectionKey === key);
  const hero = byKey('hero');
  const digital = byKey('digital_mosaic');
  const physical = byKey('physical_mosaic');
  const howItWorks = byKey('how_it_works');
  const stats = byKey('stats');
  const cta = byKey('cta');

  const steps = howItWorks?.body?.split('\n').map(line => { const [t, d] = line.split('|'); return { t, d }; }) || [];
  const statItems = stats?.body?.split('\n').map(line => { const [v, l] = line.split('|'); return { v, l }; }) || [];
  const recentPosts = posts.slice(0, 3);

  const waNumber = settings.whatsapp ? `91${settings.whatsapp.replace(/\D/g, '')}` : null;
  const waMessage = encodeURIComponent("Hi! I'm interested in Mosaic Wall for my event. Can you share more details?");

  return (
    <>
      <Navbar />
      <WhatsAppButton whatsapp={settings.whatsapp} />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Layered background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(99,102,241,0.18),transparent)]"/>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_80%_60%,rgba(139,92,246,0.08),transparent)]"/>
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.8) 1px,transparent 1px)', backgroundSize:'60px 60px' }}/>

        {/* Animated floating tiles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[
            { w:80, h:80, x:8, y:15, d:0, dur:4 }, { w:56, h:56, x:88, y:10, d:0.5, dur:5 },
            { w:100, h:100, x:3, y:65, d:1, dur:3.5 }, { w:64, h:64, x:92, y:55, d:1.5, dur:4.5 },
            { w:48, h:48, x:15, y:82, d:0.8, dur:6 }, { w:72, h:72, x:78, y:78, d:0.3, dur:3 },
            { w:40, h:40, x:45, y:5, d:2, dur:5 }, { w:90, h:90, x:55, y:88, d:0.7, dur:4 },
          ].map((t, i) => (
            <div key={i}
              className="absolute rounded-2xl border animate-pulse"
              style={{
                width: t.w, height: t.h, left: `${t.x}%`, top: `${t.y}%`,
                animationDelay: `${t.d}s`, animationDuration: `${t.dur}s`,
                background: `linear-gradient(135deg, rgba(${i%2===0?'99,102,241':'139,92,246'},0.12) 0%, rgba(${i%2===0?'139,92,246':'99,102,241'},0.04) 100%)`,
                borderColor: `rgba(${i%2===0?'99,102,241':'139,92,246'},0.2)`,
              }}
            />
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto px-5 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — Text */}
          <div>
            {hero?.badge && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold mb-6 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"/>
                {hero.badge}
              </div>
            )}
            <h1 className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-black tracking-tight text-white leading-[1.05] mb-5">
              {hero?.title?.split(' ').map((w, i, arr) => (
                <span key={i} className={i >= arr.length - 3 ? 'bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400' : ''}>{w} </span>
              ))}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-slate-400 mb-8 leading-relaxed font-medium max-w-xl">{hero?.subtitle}</p>

            <div className="flex flex-col sm:flex-row gap-3">
              {waNumber && (
                <a href={`https://wa.me/${waNumber}?text=${waMessage}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-green-500 hover:bg-green-400 text-white rounded-2xl font-black text-base transition-all shadow-[0_0_40px_rgba(34,197,94,0.35)] hover:shadow-[0_0_60px_rgba(34,197,94,0.5)]">
                  <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp Us
                </a>
              )}
              <Link href={hero?.ctaUrl || '/features'}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-black text-base transition-all shadow-[0_0_40px_rgba(99,102,241,0.3)]">
                {hero?.ctaText || 'See Features'} →
              </Link>
            </div>

            {/* Trust pill */}
            <div className="flex items-center gap-3 mt-8 flex-wrap">
              <div className="flex -space-x-2">
                {['🧑','👩','👨','🧑','👩'].map((e, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-sm">{e}</div>
                ))}
              </div>
              <p className="text-slate-400 text-sm font-medium"><span className="text-white font-black">500+ events</span> powered across India</p>
            </div>
          </div>

          {/* Right — Animated mosaic preview */}
          <div className="relative hidden lg:block">
            <div className="relative aspect-square max-w-md mx-auto">
              {/* Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-violet-600/20 rounded-3xl blur-3xl"/>
              <div className="relative w-full h-full bg-slate-900/60 border border-slate-700/60 rounded-3xl p-5 backdrop-blur-sm">
                <div className="w-full h-full grid grid-cols-6 grid-rows-6 gap-1.5 rounded-2xl overflow-hidden">
                  {[...Array(36)].map((_, i) => {
                    const colors = ['bg-indigo-600','bg-violet-600','bg-purple-600','bg-indigo-400/70','bg-slate-700','bg-indigo-800/60','bg-violet-800/60'];
                    return <div key={i} className={`rounded-sm ${colors[i%colors.length]} transition-all`} style={{ animationDelay: `${i*0.05}s` }}/>;
                  })}
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-3 -right-3 bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-sm rounded-2xl px-4 py-2.5 text-emerald-400 text-sm font-black">
                🟢 Live · 247 photos
              </div>
              <div className="absolute -top-3 -left-3 bg-indigo-600/20 border border-indigo-500/30 backdrop-blur-sm rounded-2xl px-4 py-2.5 text-indigo-300 text-sm font-black">
                📸 Real-time Upload
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EVENT TYPES TICKER ── */}
      <section className="py-6 border-y border-slate-800/40 bg-slate-900/20 overflow-hidden">
        <div className="flex gap-8 items-center" style={{ animation: 'marquee 20s linear infinite' }}>
          {[...EVENT_TYPES, ...EVENT_TYPES].map((e, i) => (
            <span key={i} className="flex items-center gap-2 text-slate-500 font-bold text-sm whitespace-nowrap shrink-0">
              <span>{e.icon}</span>{e.label}
            </span>
          ))}
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
      </section>

      {/* ── DIGITAL MOSAIC ── */}
      <section className="py-16 md:py-28 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_20%_50%,rgba(99,102,241,0.06),transparent)]"/>
        <div className="max-w-7xl mx-auto px-5">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              {digital?.badge && <span className="inline-block px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-xs font-black rounded-full mb-5 uppercase tracking-widest">{digital.badge}</span>}
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-5">{digital?.title}</h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-4">{digital?.subtitle}</p>
              <p className="text-slate-500 leading-relaxed mb-8">{digital?.body}</p>
              <div className="grid grid-cols-2 gap-3">
                {['Real-time WebSocket display','Auto-moderation controls','QR code guest upload','Custom grid & animations','Prize box system','Multi-event support'].map(f => (
                  <div key={f} className="flex items-center gap-2.5 text-sm text-slate-300 font-medium">
                    <div className="w-5 h-5 bg-indigo-600/20 border border-indigo-500/30 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                    </div>
                    {f}
                  </div>
                ))}
              </div>
            </div>
            {/* Visual */}
            <div className="relative">
              <div className="aspect-[4/3] rounded-3xl bg-slate-900/60 border border-slate-700/60 p-5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-transparent"/>
                <div className="relative w-full h-full grid grid-cols-5 grid-rows-4 gap-1.5 rounded-xl overflow-hidden">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className={`rounded-sm ${['bg-indigo-600','bg-violet-700','bg-indigo-400/80','bg-slate-700/80','bg-violet-500/80'][i%5]}`}/>
                  ))}
                </div>
                <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/>
                  <span className="text-slate-300 text-xs font-bold">Live · 20/20 filled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PHYSICAL MOSAIC ── */}
      <section className="py-16 md:py-28 bg-slate-900/20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_50%,rgba(245,158,11,0.05),transparent)]"/>
        <div className="max-w-7xl mx-auto px-5">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="aspect-[4/3] rounded-3xl bg-slate-900/60 border border-amber-500/20 p-8 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 to-transparent"/>
                <div className="relative grid grid-cols-8 grid-rows-6 gap-1 w-full h-full">
                  {[...Array(48)].map((_, i) => (
                    <div key={i} className={`rounded-sm ${['bg-amber-600/60','bg-orange-700/60','bg-amber-400/40','bg-slate-700/60','bg-amber-800/40'][i%5]}`}/>
                  ))}
                </div>
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2">
                  <span className="text-amber-400 text-xs font-black">🖨️ Print-Ready</span>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              {physical?.badge && <span className="inline-block px-3 py-1.5 bg-amber-600/10 border border-amber-500/20 text-amber-400 text-xs font-black rounded-full mb-5 uppercase tracking-widest">{physical.badge}</span>}
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-5">{physical?.title}</h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-4">{physical?.subtitle}</p>
              <p className="text-slate-500 leading-relaxed mb-8">{physical?.body}</p>
              <div className="grid grid-cols-2 gap-3">
                {['Sticker sheet printing','Custom backdrop template','Cell-numbered tiles','Any grid size','Physical prize system','Digital + Physical sync'].map(f => (
                  <div key={f} className="flex items-center gap-2.5 text-sm text-slate-300 font-medium">
                    <div className="w-5 h-5 bg-amber-600/20 border border-amber-500/30 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                    </div>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EVENT TYPES GRID ── */}
      <section className="py-16 md:py-28">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center mb-10 md:mb-16">
            <span className="inline-block px-3 py-1.5 bg-violet-600/10 border border-violet-500/20 text-violet-400 text-xs font-black rounded-full mb-4 uppercase tracking-widest">🎪 Event Types</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4">Perfect For Every Occasion</h2>
            <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto">From intimate weddings to massive festivals — Mosaic Wall transforms any gathering into an unforgettable experience.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EVENT_TYPES.map((event, i) => (
              <div key={i} className="group bg-slate-900/40 border border-slate-800/60 hover:border-indigo-500/30 rounded-2xl p-5 md:p-7 transition-all cursor-default relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
                <div className="text-3xl md:text-4xl mb-3 md:mb-5">{event.icon}</div>
                <h3 className="text-sm md:text-lg font-black text-white mb-2 group-hover:text-indigo-300 transition-colors">{event.label}</h3>
                <p className="text-slate-500 text-xs md:text-sm leading-relaxed hidden sm:block">{event.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      {steps.length > 0 && (
        <section className="py-16 md:py-28 bg-slate-900/20">
          <div className="max-w-5xl mx-auto px-5">
            <div className="text-center mb-10 md:mb-16">
              <span className="inline-block px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-xs font-black rounded-full mb-4 uppercase tracking-widest">⚡ Simple Process</span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4">{howItWorks?.title}</h2>
              <p className="text-slate-400 text-base md:text-lg">{howItWorks?.subtitle}</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-6">
              {steps.map((step, i) => (
                <div key={i} className="bg-slate-900/60 border border-slate-800/60 rounded-3xl p-6 md:p-8 text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-600/30 to-violet-600/30 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                    <span className="text-xl font-black text-indigo-300">{i+1}</span>
                  </div>
                  <h3 className="text-base md:text-lg font-black text-white mb-2">{step.t}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{step.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ── */}
      <section className="py-16 md:py-28">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center mb-10 md:mb-16">
            <span className="inline-block px-3 py-1.5 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-xs font-black rounded-full mb-4 uppercase tracking-widest">⭐ Testimonials</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4">Loved By Event Hosts</h2>
            <p className="text-slate-400 text-base md:text-lg">Real stories from real events across India.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 relative overflow-hidden group hover:border-indigo-500/20 transition-all">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"/>
                <div className="text-4xl text-indigo-500/30 font-black mb-4 leading-none">"</div>
                <p className="text-slate-300 text-base leading-relaxed mb-6 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600/40 to-violet-600/40 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-black">{t.name[0]}</div>
                  <div>
                    <p className="text-white font-black text-sm">{t.name}</p>
                    <p className="text-slate-500 text-xs">{t.event}</p>
                  </div>
                </div>
                {/* Star rating */}
                <div className="flex gap-1 mt-4">
                  {[...Array(5)].map((_, s) => <span key={s} className="text-amber-400 text-xs">★</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      {statItems.length > 0 && (
        <section className="py-14 md:py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 via-violet-600/10 to-purple-600/5"/>
          <div className="absolute inset-0 border-y border-slate-800/40"/>
          <div className="max-w-5xl mx-auto px-5">
            <p className="text-center text-slate-600 font-black uppercase tracking-widest text-xs mb-8 md:mb-12">{stats?.title}</p>
            <div className="grid grid-cols-3 gap-4 md:gap-8">
              {statItems.map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 leading-none mb-2">{stat.v}</p>
                  <p className="text-slate-500 font-bold text-xs sm:text-sm uppercase tracking-widest">{stat.l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── RECENT POSTS ── */}
      {recentPosts.length > 0 && (
        <section className="py-16 md:py-28">
          <div className="max-w-7xl mx-auto px-5">
            <div className="flex items-end justify-between mb-8 md:mb-12">
              <div>
                <span className="inline-block px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-xs font-black rounded-full mb-3 uppercase tracking-widest">📝 Blog</span>
                <h2 className="text-2xl md:text-3xl font-black text-white">Latest Event Ideas</h2>
              </div>
              <Link href="/blog" className="text-indigo-400 hover:text-indigo-300 font-black text-sm transition-colors shrink-0">View All →</Link>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
              {recentPosts.map(post => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group bg-slate-900/40 border border-slate-800/60 hover:border-indigo-500/30 rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(99,102,241,0.1)]">
                  {post.coverImageUrl
                    ? <img src={post.coverImageUrl} alt={post.title} className="w-full h-44 object-cover"/>
                    : <div className="w-full h-44 bg-gradient-to-br from-indigo-900/30 to-violet-900/30 flex items-center justify-center text-3xl">📸</div>
                  }
                  <div className="p-5">
                    {post.tags && <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">{post.tags.split(',')[0]?.trim()}</span>}
                    <h3 className="font-black text-white mt-1 line-clamp-2 group-hover:text-indigo-300 transition-colors">{post.title}</h3>
                    <p className="text-slate-500 text-sm mt-2 line-clamp-2">{post.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="py-16 md:py-28">
        <div className="max-w-5xl mx-auto px-5">
          <div className="bg-gradient-to-br from-indigo-900/40 to-violet-900/40 border border-indigo-500/20 rounded-3xl p-8 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.12),transparent)]"/>
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"/>
            <span className="relative inline-block px-4 py-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-300 text-sm font-black rounded-full mb-5">🎉 Let's Create Together</span>
            <h2 className="relative text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">{cta?.title}</h2>
            <p className="relative text-slate-400 text-base md:text-lg mb-8 max-w-xl mx-auto">{cta?.subtitle}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {waNumber && (
                <a href={`https://wa.me/${waNumber}?text=${waMessage}`} target="_blank" rel="noopener noreferrer"
                  className="relative flex items-center gap-3 px-8 py-4 bg-green-500 hover:bg-green-400 text-white rounded-2xl font-black text-lg transition-all shadow-[0_0_40px_rgba(34,197,94,0.3)] hover:-translate-y-1">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp Us Now
                </a>
              )}
              <Link href={cta?.ctaUrl || '/contact'}
                className="relative flex items-center gap-2 px-8 py-4 bg-slate-800/60 border border-slate-700 hover:border-indigo-500/40 text-white rounded-2xl font-black text-lg transition-all hover:-translate-y-1">
                {cta?.ctaText || 'Contact Us'} →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer
        siteName={settings.site_name}
        tagline={settings.footer_tagline}
        contactEmail={settings.contact_email}
        phone={settings.phone}
        whatsapp={settings.whatsapp}
        address={settings.address}
        socialInstagram={settings.social_instagram}
        socialTwitter={settings.social_twitter}
      />
    </>
  );
}
