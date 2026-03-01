import type { MetadataRoute } from 'next';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://mosaic-wall-backend.salurprabha.workers.dev';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/features`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${siteUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/contact`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.6 },
  ];

  try {
    const res = await fetch(`${backendUrl}/api/blog`, { next: { revalidate: 0 } });
    if (res.ok) {
      const posts: { slug: string; publishedAt: string }[] = await res.json();
      const blogPages: MetadataRoute.Sitemap = posts.map(p => ({
        url: `${siteUrl}/blog/${p.slug}`,
        lastModified: p.publishedAt ? new Date(p.publishedAt) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
      return [...staticPages, ...blogPages];
    }
  } catch {}

  return staticPages;
}
