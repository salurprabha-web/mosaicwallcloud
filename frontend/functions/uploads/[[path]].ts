export const onRequest = async (context: any) => {
  const { request } = context;
  const BACKEND_URL = 'https://mosaic-wall-backend.salurprabha.workers.dev';
  
  try {
    const url = new URL(request.url);
    const backendPath = url.pathname; // This will be /uploads/...
    const targetUrl = `${BACKEND_URL}${backendPath}${url.search}`;

    const headers = new Headers(request.headers);
    headers.delete('host');

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
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
};
