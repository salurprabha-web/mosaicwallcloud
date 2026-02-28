export const onRequest = async (context: any) => {
  const { request, params } = context;
  const BACKEND_URL = 'https://mosaic-wall-backend.salurprabha.workers.dev';
  
  try {
    const url = new URL(request.url);
    const backendPath = url.pathname; // This will be /api/...
    const targetUrl = `${BACKEND_URL}${backendPath}${url.search}`;

    const headers = new Headers(request.headers);
    headers.delete('host');

    // For Cloudflare Pages Functions, we use a standard fetch to the backend
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      // @ts-ignore
      duplex: 'half',
    });

    const responseHeaders = new Headers(response.headers);
    // Remove headers that might conflict or cause issues at the edge
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
};
