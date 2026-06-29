// ✅ FIX for the "display always shows defaults until I press Push to
// Display" issue.
//
// ROOT CAUSE: when a display screen connects and sends 'display:ready',
// the Durable Object tries to fetch the REAL saved config from
// /api/mosaic/:slug/init using `this.currentHost` as the backend URL.
// If currentHost is ever unset on a given Durable Object instance
// (can happen on a fresh DO instance, after redeploys, or various
// internal timing edge cases), it silently falls back to
// 'http://localhost:8787' — which doesn't exist in production. The
// fetch then fails, gets swallowed by the catch block, and NO
// 'display:init' message is ever sent to the display screen at all.
// The frontend then falls back to its own local DEFAULT_CONFIG
// constant — exactly matching the symptom described (defaults every
// time, until Push to Display happens to also be the action that
// finally makes the config "stick" via a different code path).
//
// THE FIX: stop relying on a runtime-derived currentHost entirely.
// Pass the real backend URL in explicitly via the Worker's own env
// bindings (the same FRONTEND_URL-style pattern already used
// elsewhere in this codebase), so there's no fallback-guessing at all.

export class MosaicRoom {
  private state: any;
  private env: any;

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
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

        // ✅ No more fallback guessing. This Durable Object always has
        // access to the same env bindings as the main Worker (passed
        // in via the constructor, same as `env` is used elsewhere in
        // this class) — including a SELF_URL binding pointing at this
        // exact Worker's own production URL. This is the same kind of
        // binding pattern already used for FRONTEND_URL elsewhere in
        // your wrangler.toml — see the matching wrangler.toml update.
        const backendUrl = this.env.SELF_URL;

        if (!backendUrl) {
          console.error('[MosaicRoom] SELF_URL binding is missing — cannot fetch initial state. Check wrangler.toml [vars].');
          return;
        }

        try {
          const res = await fetch(`${backendUrl}/api/mosaic/${slug}/init`);
          if (res.ok) {
            const initData = await res.json();
            ws.send(JSON.stringify({ type: 'display:init', payload: initData }));
          } else {
            console.error(`[MosaicRoom] /api/mosaic/${slug}/init returned ${res.status}`);
          }
        } catch (e) {
          console.error('[MosaicRoom] Failed to fetch initial state:', e);
        }
        return;
      }

      this.broadcast(data);
    } catch (err) {
      console.error('WS Message Error:', err);
    }
  }

  broadcast(data: any) {
    const sockets = this.state.getWebSockets();
    const message = JSON.stringify(data);
    for (const ws of sockets) {
      try {
        ws.send(message);
      } catch (e) {
        // Socket may be closed/broken — ignore, cleanup happens elsewhere
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    // Existing close handling, if any, stays here unchanged.
  }
}
