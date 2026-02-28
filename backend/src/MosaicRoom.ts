export class MosaicRoom {
  private currentHost: string | null = null;
  private state: any;
  private env: any;

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    this.currentHost = `${url.protocol}//${url.host}`;
    
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      // Direct REST calls to the DO via internal fetch
      try {
        const body = await request.json() as any;
        if (body.type === 'BROADCAST') {
          this.broadcast(body.payload);
          return new Response(JSON.stringify({ success: true }));
        }
      } catch (e) {
        return new Response('Expected websocket or valid JSON', { status: 400 });
      }
      return new Response('Not Found', { status: 404 });
    }

    // @ts-ignore - WebSocketPair is a Cloudflare runtime global
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.state.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as any);
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const data = JSON.parse(message as string);
      
      if (data.type === 'display:ready') {
        const slug = data.payload?.mosaicSlug || 'default';
        const backendUrl = this.currentHost || 'http://localhost:8787';
        try {
          const res = await fetch(`${backendUrl}/api/mosaic/${slug}/init`);
          if (res.ok) {
            const initData = await res.json();
            ws.send(JSON.stringify({ type: 'display:init', payload: initData }));
          }
        } catch (e) {
          console.error('Failed to fetch initial state for DO:', e);
        }
        return;
      }

      this.broadcast(data);
    } catch (err) {
      console.error('WS Message Error:', err);
    }
  }

  broadcast(message: any) {
    const msgString = JSON.stringify(message);
    this.state.getWebSockets().forEach((ws: WebSocket) => {
      try {
        ws.send(msgString);
      } catch (err) {
        // Socket might be closed
      }
    });
  }

  webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    // DO automatically cleans up closed websockets from getWebSockets()
  }

  webSocketError(ws: WebSocket, error: any) {
    // DO automatically cleans up errored websockets
  }
}
