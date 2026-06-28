import { NextRequest } from 'next/server';

// ✅ FIX — THE ACTUAL ROOT CAUSE of "Uploads proxy error" on every image:
// BACKEND_URL was set to an empty string (''). That meant the constructed
// targetUrl was just a relative path like "/uploads/171234-abc.png" with
// nothing in front of it. fetch() inside a Next.js server route handler
// cannot resolve a bare relative path like this — it throws immediately,
// landing straight in the catch block below, which is exactly why every
// single image request returned the same generic "Uploads proxy error"
// regardless of whether the file existed, regardless of any backend fix.
//
// This was the real, single point of failure the whole time — the
// Cloudflare Worker route and R2 serving logic were very likely fine
// and never even being reached, because this frontend proxy crashed
// before ever making a real outbound request.
const BACKEND_URL = 'https://mosaic-wall-backend.salurprabha.workers.dev';

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  try {
    const backendPath = `/uploads/${path.join('/')}`;
    const url = new URL(req.url);
    const targetUrl = `${BACKEND_URL}${backendPath}${url.search}`;

    const response = await fetch(targetUrl);

    // ✅ Also surfacing the real upstream status/error instead of
    // silently passing through, so if the backend itself 404s or 500s,
    // that's visible rather than masked by a generic success-shaped response.
    if (!response.ok) {
      console.error(`[uploads proxy] Backend returned ${response.status} for ${targetUrl}`);
    }

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    // ✅ Logs the REAL underlying error to your Vercel function logs
    // instead of only ever showing the generic string to the browser.
    console.error('[uploads proxy] Fetch failed:', error?.message || error);
    return new Response('Uploads proxy error', { status: 500 });
  }
}
