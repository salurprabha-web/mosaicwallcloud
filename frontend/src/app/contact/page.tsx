import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';

const backendUrl = 'https://mosaic-wall-backend.salurprabha.workers.dev';

async function getSettings() {
  try { const r = await fetch(`${backendUrl}/api/site-settings`, { next: { revalidate: 300 } }); return r.ok ? r.json() : {}; } catch { return {}; }
}

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Mosaic Wall via WhatsApp, phone, or email to book your digital or physical mosaic experience for any event.',
  alternates: { canonical: '/contact' },
};

export default async function ContactPage() {
  const settings = await getSettings();
  const waNumber = settings.whatsapp ? `91${settings.whatsapp.replace(/\D/g, '')}` : null;
  const waMessage = encodeURIComponent("Hi! I'm interested in Mosaic Wall for my event. Can you share more details and pricing?");

  return (
    <>
      <Navbar />
      <WhatsAppButton whatsapp={settings.whatsapp} />

      <main className="pt-24 min-h-screen">
        {/* Hero */}
        <section className="py-20 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(99,102,241,0.1),transparent)]"/>
          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <span className="inline-block px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-xs font-black rounded-full mb-4 uppercase tracking-widest">💬 Get In Touch</span>
            <h1 className="text-5xl md:text-6xl font-black text-white mb-6">Let's Make Your Event Unforgettable</h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">Contact us via WhatsApp, phone, or email. We'll get your mosaic wall set up in under 24 hours.</p>
          </div>
        </section>

        <section className="py-12 max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-10 items-start">

            {/* Left — Contact details */}
            <div className="md:col-span-2 space-y-6">
              <h2 className="text-2xl font-black text-white mb-6">Reach Us Directly</h2>

              {/* WhatsApp */}
              {waNumber && (
                <a href={`https://wa.me/${waNumber}?text=${waMessage}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-4 p-5 bg-green-500/5 border border-green-500/20 hover:border-green-500/40 rounded-2xl transition-all group">
                  <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-all">
                    <svg className="w-6 h-6 fill-current text-green-400" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </div>
                  <div>
                    <p className="text-xs font-black text-green-400 uppercase tracking-widest mb-1">WhatsApp — Fastest Reply</p>
                    <p className="text-white font-black text-lg">+91 {settings.whatsapp}</p>
                    <p className="text-slate-500 text-sm mt-1">Tap to open WhatsApp →</p>
                  </div>
                </a>
              )}

              {/* Phone */}
              {settings.phone && (
                <a href={`tel:${settings.phone}`} className="flex items-start gap-4 p-5 bg-slate-900/40 border border-slate-800/60 hover:border-indigo-500/30 rounded-2xl transition-all group">
                  <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-xl">📞</span>
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Call Us</p>
                    <p className="text-white font-black text-lg">{settings.phone}</p>
                    <p className="text-slate-500 text-sm mt-1">Mon–Sat, 9am–7pm IST</p>
                  </div>
                </a>
              )}

              {/* Email */}
              {settings.contact_email && (
                <a href={`mailto:${settings.contact_email}?subject=Mosaic Wall Event Enquiry`} className="flex items-start gap-4 p-5 bg-slate-900/40 border border-slate-800/60 hover:border-indigo-500/30 rounded-2xl transition-all group">
                  <div className="w-12 h-12 bg-violet-600/10 border border-violet-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-xl">✉️</span>
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                    <p className="text-white font-black break-all">{settings.contact_email}</p>
                    <p className="text-slate-500 text-sm mt-1">We reply within 24 hours</p>
                  </div>
                </a>
              )}

              {/* Address */}
              {settings.address && (
                <div className="flex items-start gap-4 p-5 bg-slate-900/40 border border-slate-800/60 rounded-2xl">
                  <div className="w-12 h-12 bg-amber-600/10 border border-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-xl">📍</span>
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Office Address</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{settings.address}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right — Quick enquiry card */}
            <div className="md:col-span-3">
              <div className="bg-gradient-to-br from-indigo-900/30 to-violet-900/30 border border-indigo-500/20 rounded-3xl p-8">
                <h3 className="text-2xl font-black text-white mb-2">Send Us a Quick Enquiry</h3>
                <p className="text-slate-400 text-sm mb-8">Include your event details and we'll get back to you with a quote.</p>

                <div className="space-y-4 mb-8">
                  {['Your event name and date', 'Expected number of guests', 'Venue type (indoor / outdoor)', 'Digital and/or physical mosaic', 'Any special requirements or theme'].map(item => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-indigo-600/20 border border-indigo-500/30 rounded-full flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                      </div>
                      <span className="text-slate-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  {waNumber && (
                    <a href={`https://wa.me/${waNumber}?text=${waMessage}`} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-3 py-4 bg-green-500 hover:bg-green-400 text-white rounded-2xl font-black transition-all shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:-translate-y-0.5">
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      WhatsApp Now
                    </a>
                  )}
                  {settings.contact_email && (
                    <a href={`mailto:${settings.contact_email}?subject=Mosaic Wall Event Enquiry&body=Hi,%0A%0AI'm interested in Mosaic Wall for my event.%0A%0AEvent Name:%0ADate:%0AGuests:%0AVenue:%0AType (Digital/Physical):%0A%0AThanks`}
                      className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-800/60 border border-slate-700 hover:border-indigo-500/40 text-white rounded-2xl font-black transition-all hover:-translate-y-0.5">
                      ✉️ Send Email
                    </a>
                  )}
                </div>
              </div>

              {/* Why choose us */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                {[
                  { icon: '⚡', title: '24hr Setup', desc: 'Ready for your event' },
                  { icon: '🤝', title: 'Dedicated Support', desc: 'On-site team available' },
                  { icon: '✅', title: 'Hassle-Free', desc: 'We handle everything' },
                ].map(item => (
                  <div key={item.title} className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 text-center">
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <p className="text-white font-black text-sm">{item.title}</p>
                    <p className="text-slate-500 text-xs mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

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
