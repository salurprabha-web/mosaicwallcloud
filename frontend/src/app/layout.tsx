import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const backendUrl = 'https://mosaic-wall-backend.salurprabha.workers.dev';

async function getSiteSettings(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${backendUrl}/api/site-settings`, { next: { revalidate: 0 } });
    if (!res.ok) return {};
    return res.json();
  } catch { return {}; }
}

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  const title = s.site_name || 'Mosaic Wall';
  const desc = s.meta_description || 'Live interactive digital mosaic experience';
  const ogImage = s.og_image || undefined;
  return {
    title: { default: title, template: `%s | ${title}` },
    description: desc,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    openGraph: {
      type: 'website',
      siteName: title,
      title,
      description: desc,
      images: ogImage ? [{ url: ogImage }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: ogImage ? [ogImage] : [],
    },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#080c14] text-slate-50 min-h-screen selection:bg-indigo-500/30`}>
        {children}
      </body>
    </html>
  );
}
