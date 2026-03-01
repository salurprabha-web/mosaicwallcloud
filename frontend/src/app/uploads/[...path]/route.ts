import { NextRequest } from 'next/server';

const BACKEND_URL = 'https://mosaic-wall-backend.salurprabha.workers.dev';

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  try {
    const backendPath = `/uploads/${path.join('/')}`;
    const url = new URL(req.url);
    const targetUrl = `${BACKEND_URL}${backendPath}${url.search}`;

    const response = await fetch(targetUrl);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return new Response('Uploads proxy error', { status: 500 });
  }
}
