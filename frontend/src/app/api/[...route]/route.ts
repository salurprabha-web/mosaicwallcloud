import { NextRequest } from 'next/server';

const BACKEND_URL = 'https://mosaic-wall-backend.salurprabha.workers.dev';

export async function GET(req: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  const { route } = await params;
  return proxyRequest(req, route);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  const { route } = await params;
  return proxyRequest(req, route);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  const { route } = await params;
  return proxyRequest(req, route);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  const { route } = await params;
  return proxyRequest(req, route);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  const { route } = await params;
  return proxyRequest(req, route);
}

async function proxyRequest(req: NextRequest, route: string[]) {
  try {
    const backendPath = `/api/${route.join('/')}`;
    const url = new URL(req.url);
    const targetUrl = `${BACKEND_URL}${backendPath}${url.search}`;

    const headers = new Headers(req.headers);
    headers.delete('host');

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const body = hasBody ? req.body : null;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      // @ts-ignore
      duplex: hasBody ? 'half' : undefined,
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Proxy error', details: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
