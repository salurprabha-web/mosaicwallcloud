import { Hono, Context } from 'hono';
import { cors } from 'hono/cors';
export { MosaicRoom } from './MosaicRoom';
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { sign } from 'hono/jwt';
import { authMiddleware } from './middleware/auth';
import * as bcrypt from 'bcryptjs';

import type { D1Database, R2Bucket, DurableObjectNamespace } from '@cloudflare/workers-types';

export type Bindings = {
  DB: D1Database;
  UPLOADS_BUCKET: R2Bucket;
  MOSAIC_ROOM: DurableObjectNamespace;
  JWT_SECRET: string;
  FRONTEND_URL: string;
  ALLOWED_ORIGINS?: string;
  SELF_URL?: string;
};

type Variables = {
  prisma: any;
  user?: { userId: string; role: string; email: string; name: string };
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use('*', async (c, next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS 
    ? c.env.ALLOWED_ORIGINS.split(',') 
    : [c.env.FRONTEND_URL || 'http://localhost:3000'];
    
  const corsMiddleware = cors({
    origin: (origin) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return origin;
      }
      return allowedOrigins[0];
    },
    credentials: true,
  });
  return corsMiddleware(c, next);
});

app.use('*', async (c, next) => {
  const adapter = new PrismaD1(c.env.DB);
  const prisma = new PrismaClient({ adapter } as any);
  c.set('prisma', prisma);
  await next();
});

app.get('/health', (c) => c.json({ status: 'ok', time: new Date().toISOString(), runtime: 'cloudflare-worker' }));

app.post('/api/auth/login', async (c) => {
  const prisma = c.get('prisma');
  const body = await c.req.json().catch(() => ({}));
  const { email, password } = body;

  if (!email || !password) return c.json({ error: 'Email and password required' }, 400);

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return c.json({ error: 'Invalid credentials' }, 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return c.json({ error: 'Invalid credentials' }, 401);

  const payload = { userId: user.id, email: user.email, role: user.role, name: user.name, exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 };
  const token = await sign(payload, c.env.JWT_SECRET);

  let mosaicSlug: string | null = null;
  if (user.role === 'admin') {
    const assignment = await prisma.mosaicAdmin.findFirst({
      where: { userId: user.id },
      include: { mosaic: { select: { slug: true } } }
    });
    mosaicSlug = assignment?.mosaic?.slug ?? null;
  }

  c.header('Set-Cookie', `mosaic_jwt=${token}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=86400`);
  return c.json({ success: true, token, role: user.role, name: user.name, mosaicSlug });
});

app.post('/api/auth/logout', (c) => {
  c.header('Set-Cookie', `mosaic_jwt=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0`);
  return c.json({ success: true });
});

app.get('/api/auth/me', authMiddleware, (c) => {
  return c.json({ user: c.get('user') });
});

const requireSuperAdmin = async (c: Context, next: any) => {
  await authMiddleware(c, async () => {
    const user = c.get('user');
    if (user?.role !== 'super_admin') return c.json({ error: 'Forbidden' }, 403);
    return next();
  });
};

const requireAdmin = async (c: Context, next: any) => {
  await authMiddleware(c, async () => {
    const user = c.get('user');
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return c.json({ error: 'Forbidden' }, 403);
    return next();
  });
};

app.get('/api/superadmin/mosaics', requireSuperAdmin, async (c) => {
  const prisma = c.get('prisma');
  const mosaics = await prisma.mosaic.findMany({
    include: {
      admins: { include: { user: { select: { id: true, name: true, email: true } } } },
      _count: { select: { tiles: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return c.json(mosaics);
});

app.post('/api/superadmin/mosaics', requireSuperAdmin, async (c) => {
  const prisma = c.get('prisma');
  const body = await c.req.json().catch(() => ({}));
  const { name, description } = body;
  if (!name) return c.json({ error: 'Name required' }, 400);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  try {
    const mosaic = await prisma.mosaic.create({
      data: { name, slug, description: description || null }
    });
    return c.json(mosaic);
  } catch (err: any) {
    if (err.code === 'P2002') return c.json({ error: 'A mosaic with that name already exists' }, 409);
    return c.json({ error: 'Failed to create mosaic' }, 500);
  }
});

app.patch('/api/superadmin/mosaics/:id', requireSuperAdmin, async (c) => {
  const prisma = c.get('prisma');
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const { name, description, status } = body;
  try {
    const mosaic = await prisma.mosaic.update({
      where: { id },
      data: { name, description, status }
    });
    return c.json(mosaic);
  } catch (err) {
    return c.json({ error: 'Failed to update mosaic' }, 500);
  }
});

app.delete('/api/superadmin/mosaics/:id', requireSuperAdmin, async (c) => {
  const prisma = c.get('prisma');
  const id = c.req.param('id');
  try {
    await prisma.mosaic.delete({ where: { id } });
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Failed to delete mosaic' }, 500);
  }
});

app.delete('/api/superadmin/mosaics/:id/tiles', requireAdmin, async (c) => {
  const prisma = c.get('prisma');
  const mosaicId = c.req.param('id');
  try {
    await prisma.tile.deleteMany({
      where: { mosaicId: mosaicId }
    });

    await broadcastToDo(c.env, 'display:clear', { mosaicId }, mosaicId);
    await broadcastToDo(c.env, 'admin:cleared', { mosaicId }, mosaicId);

    return c.json({ success: true, message: 'Mosaic tiles cleared successfully' });
  } catch (err) {
    console.error('Clear mosaic error:', err);
    return c.json({ error: 'Failed to clear mosaic tiles' }, 500);
  }
});

app.post('/api/superadmin/mosaics/:id/random-fill', requireAdmin, async (c) => {
  const prisma = c.get('prisma');
  const mosaicId = c.req.param('id');
  try {
    const config = await prisma.config.findFirst({ where: { mosaicId } });
    const gridWidth = config?.gridWidth ?? 20;
    const gridHeight = config?.gridHeight ?? 15;

    const occupiedTiles = await prisma.tile.findMany({
      where: { mosaicId, status: 'approved' },
      select: { gridX: true, gridY: true }
    });
    const occupied = new Set(occupiedTiles.map((t: any) => `${t.gridX},${t.gridY}`));

    const available: { x: number; y: number }[] = [];
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (!occupied.has(`${x},${y}`)) available.push({ x, y });
      }
    }

    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }

    const toFill = available.slice(0, 10);
    const results = [];

    for (const cell of toFill) {
      const tile = await prisma.tile.create({
        data: {
          mosaicId,
          imageUrl: `https://picsum.photos/seed/${Math.random()}/300/300`,
          gridX: cell.x,
          gridY: cell.y,
          status: 'approved',
          uploader: 'Auto Fill'
        }
      });
      await checkAndEmitPrize(prisma, tile, c.env, c.req.url, mosaicId);
      results.push(tile);
    }

    return c.json({ success: true, count: results.length });
  } catch (err) {
    console.error('Random fill error:', err);
    return c.json({ error: 'Random fill failed' }, 500);
  }
});

app.get('/api/superadmin/mosaics/:id/prize-cells', requireAdmin, async (c) => {
  const prisma = c.get('prisma');
  const mosaicId = c.req.param('id');
  try {
    const cells = await prisma.prizeCell.findMany({ where: { mosaicId } });
    return c.json(cells);
  } catch (err) {
    return c.json({ error: 'Failed to fetch prize cells' }, 500);
  }
});

app.post('/api/superadmin/mosaics/:id/prize-cells', requireAdmin, async (c) => {
  const prisma = c.get('prisma');
  const mosaicId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const { cells } = body;

  if (!Array.isArray(cells)) return c.json({ error: 'Invalid cells data' }, 400);

  try {
    await prisma.prizeCell.deleteMany({ where: { mosaicId } });
    if (cells.length > 0) {
      await prisma.prizeCell.createMany({
        data: cells.map((c: any) => ({
          mosaicId,
          gridX: c.x,
          gridY: c.y
        }))
      });
    }

    await broadcastToDo(c.env, 'admin:prize_cells_saved', { success: true }, mosaicId);
    await broadcastToDo(c.env, 'admin:prize_cells', cells.map((c: any) => ({ gridX: c.x, gridY: c.y })), mosaicId);

    return c.json({ success: true });
  } catch (err) {
    console.error('Prize cells update error:', err);
    return c.json({ error: 'Failed' }, 500);
  }
});

app.get('/api/superadmin/users', requireSuperAdmin, async (c) => {
  const prisma = c.get('prisma');
  const users = await prisma.user.findMany({
    where: { role: 'admin' },
    select: {
      id: true, email: true, name: true, role: true, createdAt: true,
      assignments: { include: { mosaic: { select: { id: true, name: true, slug: true } } } }
    },
    orderBy: { createdAt: 'desc' },
  });
  return c.json(users);
});

app.post('/api/superadmin/users', requireSuperAdmin, async (c) => {
  const prisma = c.get('prisma');
  const body = await c.req.json().catch(() => ({}));
  const { email, name, password, mosaicIds } = body;
  if (!email || !name || !password) return c.json({ error: 'email, name and password required' }, 400);

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(), name, passwordHash, role: 'admin',
        assignments: mosaicIds?.length
          ? { create: (mosaicIds as string[]).map((mosaicId: string) => ({ mosaicId })) }
          : undefined,
      },
      include: { assignments: { include: { mosaic: true } } }
    });
    const { passwordHash: _, ...userSafe } = user;
    return c.json(userSafe);
  } catch (err: any) {
    if (err.code === 'P2002') return c.json({ error: 'Email already registered' }, 409);
    return c.json({ error: 'Failed to create user' }, 500);
  }
});

app.delete('/api/superadmin/users/:id', requireSuperAdmin, async (c) => {
  const prisma = c.get('prisma');
  const id = c.req.param('id');
  try {
    await prisma.user.delete({ where: { id } });
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

app.post('/api/superadmin/assign', requireSuperAdmin, async (c) => {
  const prisma = c.get('prisma');
  const body = await c.req.json().catch(() => ({}));
  const { userId, mosaicId, action } = body;
  try {
    if (action === 'remove') {
      await prisma.mosaicAdmin.deleteMany({ where: { userId, mosaicId } });
    } else {
      await prisma.mosaicAdmin.upsert({
        where: { userId_mosaicId: { userId, mosaicId } },
        create: { userId, mosaicId },
        update: {}
      });
    }
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Failed to update assignment' }, 500);
  }
});

app.get('/api/superadmin/stats', requireSuperAdmin, async (c) => {
  const prisma = c.get('prisma');
  const [mosaics, admins, tiles] = await Promise.all([
    prisma.mosaic.count(),
    prisma.user.count({ where: { role: 'admin' } }),
    prisma.tile.count()
  ]);
  return c.json({ mosaics, admins, tiles });
});

app.get('/api/superadmin/site-settings', requireSuperAdmin, async (c) => {
  const prisma = c.get('prisma');
  const settings = await prisma.siteSetting.findMany();
  const obj = settings.reduce((acc: any, s: any) => {
    acc[s.key] = s.value;
    return acc;
  }, {});
  return c.json(obj);
});

app.put('/api/superadmin/site-settings', requireSuperAdmin, async (c) => {
  const prisma = c.get('prisma');
  const body = await c.req.json().catch(() => ({}));
  
  for (const [key, value] of Object.entries(body)) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) }
    });
  }
  return c.json({ success: true });
});

app.get('/api/superadmin/blog', requireSuperAdmin, async (c) => {
  const prisma = c.get('prisma');
  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: 'desc' }
  });
  return c.json(posts);
});

app.post('/api/superadmin/blog', requireSuperAdmin, async (c) => {
  const prisma = c.get('prisma');
  const body = await c.req.json().catch(() => ({}));
  const post = await prisma.blogPost.create({
    data: {
      ...body,
      publishedAt: body.published ? new Date() : null
    }
  });
  return c.json(post);
});

app.put('/api/superadmin/blog/:id', requireSuperAdmin, async (c) => {
  const prisma = c.get('prisma');
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  let publishedAt = existing?.publishedAt;
  if (body.published && !existing?.published) {
    publishedAt = new Date();
  } else if (!body.published) {
    publishedAt = null;
  }

  const { id: _, ...updateData } = body;
  const post = await prisma.blogPost.update({
    where: { id },
    data: { ...updateData, publishedAt }
  });
  return c.json(post);
});

app.delete('/api/superadmin/blog/:id', requireSuperAdmin, async (c) => {
  const prisma = c.get('prisma');
  const id = c.req.param('id');
  await prisma.blogPost.delete({ where: { id } });
  return c.json({ success: true });
});

app.get('/api/superadmin/page-sections/:page', requireSuperAdmin, async (c) => {
  const prisma = c.get('prisma');
  const page = c.req.param('page');
  const sections = await prisma.pageSection.findMany({
    where: { page },
    orderBy: { order: 'asc' }
  });
  return c.json(sections);
});

app.put('/api/superadmin/page-sections', requireSuperAdmin, async (c) => {
  const prisma = c.get('prisma');
  const body = await c.req.json().catch(() => ({}));
  const { id, page, sectionKey, ...data } = body;
  
  const updated = await prisma.pageSection.upsert({
    where: { page_sectionKey: { page, sectionKey } },
    update: data,
    create: { page, sectionKey, ...data }
  });

  return c.json(updated);
});

app.get('/api/site-settings', async (c) => {
  const prisma = c.get('prisma');
  try {
    const settings = await prisma.siteSetting.findMany();
    const map: Record<string, string> = {};
    settings.forEach((s: any) => { map[s.key] = s.value; });
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return c.json(map);
  } catch (err) {
    return c.json({ error: 'Failed to fetch settings' }, 500);
  }
});

app.get('/api/blog', async (c) => {
  const prisma = c.get('prisma');
  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      select: { id: true, slug: true, title: true, excerpt: true, coverImageUrl: true, author: true, publishedAt: true, tags: true },
      orderBy: { publishedAt: 'desc' },
    });
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return c.json(posts);
  } catch (err) {
    return c.json({ error: 'Failed to fetch posts' }, 500);
  }
});

app.get('/api/blog/:slug', async (c) => {
  const prisma = c.get('prisma');
  const slug = c.req.param('slug');
  try {
    const post = await prisma.blogPost.findUnique({ where: { slug } });
    if (!post || !post.published) return c.json({ error: 'Post not found' }, 404);
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return c.json(post);
  } catch (err) {
    return c.json({ error: 'Failed to fetch post' }, 500);
  }
});

app.get('/api/page-sections/:page', async (c) => {
  const prisma = c.get('prisma');
  const page = c.req.param('page');
  try {
    const sections = await prisma.pageSection.findMany({
      where: { page, visible: true },
      orderBy: { order: 'asc' },
    });
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return c.json(sections);
  } catch (err) {
    return c.json({ error: 'Failed to fetch sections' }, 500);
  }
});

// ✅ BULLETPROOF REWRITE — no longer uses the fragile relational
// `include: { configs: true }` pattern at all. Queries Config directly
// via the exact same simple, proven pattern every other route in this
// file already uses successfully (prisma.config.findFirst). This
// removes any dependency on Prisma Client generation timing/relation
// resolution being exactly in sync with schema.prisma — the suspected
// fragile link behind the repeated "Failed to fetch initial state"
// errors despite the underlying data being confirmed correct.
app.get('/api/mosaic/:slug/init', async (c) => {
  const prisma = c.get('prisma');
  const slug = c.req.param('slug');
  try {
    const mosaic = await prisma.mosaic.findUnique({
      where: { slug },
    });
    if (!mosaic) return c.json({ error: 'Mosaic not found' }, 404);

    const mosaicId = mosaic.id;

    const [config, tiles, prizeCells] = await Promise.all([
      prisma.config.findFirst({ where: { mosaicId } }),
      prisma.tile.findMany({ where: { mosaicId, status: 'approved' } }),
      prisma.prizeCell.findMany({ where: { mosaicId } }),
    ]);

    const url = new URL(c.req.url);
    const backendHost = `${url.protocol}//${url.host}`;

    const fixedTiles = tiles.map((t: any) => ({
      ...t,
      imageUrl: t.imageUrl.includes('/uploads/')
        ? `${backendHost}/uploads/${t.imageUrl.split('/uploads/')[1]}`
        : t.imageUrl
    }));

    let fixedConfig: any = config;
    if (fixedConfig && fixedConfig.bgImageUrl && fixedConfig.bgImageUrl.includes('/uploads/')) {
      fixedConfig = {
        ...fixedConfig,
        bgImageUrl: `${backendHost}/uploads/${fixedConfig.bgImageUrl.split('/uploads/')[1]}`
      };
    }

    return c.json({ config: fixedConfig || null, tiles: fixedTiles, prizeCells });
  } catch (err: any) {
    console.error('[init route] Failed to fetch initial state:', err?.message || err);
    return c.json({ error: 'Failed to fetch initial state', details: err?.message }, 500);
  }
});

app.get('/api/mosaic/:slug', async (c) => {
  const prisma = c.get('prisma');
  const slug = c.req.param('slug');
  try {
    const mosaic = await prisma.mosaic.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, status: true },
    });
    if (!mosaic) return c.json({ error: 'Mosaic not found' }, 404);
    return c.json(mosaic);
  } catch (err) {
    return c.json({ error: 'Failed to fetch mosaic' }, 500);
  }
});

async function broadcastToDo(env: Bindings, type: string, payload: any, mosaicId: string = 'global') {
  try {
    const id = env.MOSAIC_ROOM.idFromName(mosaicId);
    const obj = env.MOSAIC_ROOM.get(id);
    await obj.fetch('http://do/api/broadcast', {
      method: 'POST',
      body: JSON.stringify({ type: 'BROADCAST', payload: { type, payload } })
    });
  } catch (err) {
    console.error('DO Broadcast Error:', err);
  }
}
async function checkAndEmitPrize(prisma: PrismaClient, tile: any, env: Bindings, reqUrl: string, mosaicId: string) {
  const url = new URL(reqUrl);
  const backendHost = `${url.protocol}//${url.host}`;
  const fixedTile = {
    ...tile,
    imageUrl: tile.imageUrl.includes('/uploads/')
      ? `${backendHost}/uploads/${tile.imageUrl.split('/uploads/')[1]}`
      : tile.imageUrl
  };

  await broadcastToDo(env, 'display:new_tile', fixedTile, mosaicId);

  const prizeCell = await prisma.prizeCell.findFirst({
    where: { mosaicId, gridX: tile.gridX, gridY: tile.gridY }
  });
  
  if (prizeCell) {
    await broadcastToDo(env, 'display:prize_won', { tile, winner: tile.uploader || 'Guest' }, mosaicId);
    console.log(`🎁 Prize won by ${tile.uploader} at (${tile.gridX},${tile.gridY}) on mosaic ${mosaicId}`);
  }
}

app.get('/uploads/:filename', async (c) => {
  const filename = c.req.param('filename');

  try {
    const file = await c.env.UPLOADS_BUCKET.get(filename);

    if (!file) {
      console.error(`[uploads] File not found in R2: ${filename}`);
      return c.notFound();
    }

    const contentType = file.httpMetadata?.contentType || 'application/octet-stream';

    return new Response(file.body as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'ETag': file.httpEtag,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error(`[uploads] Error serving ${filename}:`, err?.message || err);
    return c.json({ error: 'Failed to serve file', details: err?.message }, 500);
  }
});

app.post('/api/upload', async (c) => {
  const prisma = c.get('prisma');
  
  try {
    const formData = await c.req.parseBody();
    const file = formData['image'];
    
    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file uploaded' }, 400);
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    
    await c.env.UPLOADS_BUCKET.put(filename, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type }
    });

    const url = new URL(c.req.url);
    const mosaicId = formData['mosaicId'] as string;
    
    if (!mosaicId) {
      return c.json({ error: 'Mosaic ID required' }, 400);
    }

    const imageUrl = `${url.protocol}//${url.host}/uploads/${filename}`;

    const config = await prisma.config.findFirst({ where: { mosaicId } });
    const gridWidth = config?.gridWidth ?? 20;
    const gridHeight = config?.gridHeight ?? 15;

    const occupiedTiles = await prisma.tile.findMany({
      where: { mosaicId, status: 'approved' },
      select: { gridX: true, gridY: true }
    });
    const occupied = new Set(occupiedTiles.map((t: any) => `${t.gridX},${t.gridY}`));

    const available: { x: number; y: number }[] = [];
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (!occupied.has(`${x},${y}`)) available.push({ x, y });
      }
    }

    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }

    const chosen = available.length > 0
      ? available[0]
      : { x: Math.floor(Math.random() * gridWidth), y: Math.floor(Math.random() * gridHeight) };

    const tile = await prisma.tile.create({
      data: {
        mosaicId,
        imageUrl,
        gridX: chosen.x,
        gridY: chosen.y,
        status: 'approved',
        uploader: (formData['name'] as string) || 'Guest',
        email: (formData['email'] as string) || null,
      }
    });

    await checkAndEmitPrize(prisma, tile, c.env, c.req.url, mosaicId);

    return c.json({ success: true, tile });
  } catch (err) {
    console.error('Upload error:', err);
    return c.json({ error: 'Upload failed' }, 500);
  }
});

app.post('/api/bulk-upload', async (c) => {
  const prisma = c.get('prisma');
  
  try {
    const formData = await c.req.parseBody({ all: true });
    const files = formData['images'] as File[];
    const mosaicId = formData['mosaicId'] as string;

    if (!mosaicId) return c.json({ error: 'Mosaic ID required' }, 400);
    
    if (!files || files.length === 0 || !(files[0] instanceof File)) {
      return c.json({ error: 'No files uploaded' }, 400);
    }

    const config = await prisma.config.findFirst({ where: { mosaicId } });
    const gridWidth = config?.gridWidth ?? 20;
    const gridHeight = config?.gridHeight ?? 15;

    const results = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      const ext = file.name.split('.').pop() || 'jpg';
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      
      await c.env.UPLOADS_BUCKET.put(filename, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type }
      });
  
      const url = new URL(c.req.url);
      const imageUrl = `${url.protocol}//${url.host}/uploads/${filename}`;

      const occupiedTiles = await prisma.tile.findMany({
        where: { mosaicId, status: 'approved' },
        select: { gridX: true, gridY: true }
      });
      const occupied = new Set(occupiedTiles.map((t: any) => `${t.gridX},${t.gridY}`));

      const available: { x: number; y: number }[] = [];
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          if (!occupied.has(`${x},${y}`)) available.push({ x, y });
        }
      }

      for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
      }

      const chosen = available.length > 0
        ? available[0]
        : { x: Math.floor(Math.random() * gridWidth), y: Math.floor(Math.random() * gridHeight) };

      const tile = await prisma.tile.create({
        data: {
          mosaicId,
          imageUrl,
          gridX: chosen.x,
          gridY: chosen.y,
          status: 'approved',
          uploader: (formData['name'] as string) || 'Admin',
        }
      });

      await checkAndEmitPrize(prisma, tile, c.env, c.req.url, mosaicId);
      results.push(tile);
    }

    return c.json({ success: true, count: results.length, tiles: results });
  } catch (err) {
    console.error('Bulk upload error:', err);
    return c.json({ error: 'Bulk upload failed' }, 500);
  }
});

app.post('/api/superadmin/config/background', requireAdmin, async (c) => {
  const prisma = c.get('prisma');
  try {
    const formData = await c.req.parseBody();
    const file = formData['file'];
    const mosaicId = formData['mosaicId'] as string;
    
    if (!file || !(file instanceof File)) return c.json({ error: 'No file' }, 400);

    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `bg-${mosaicId || 'global'}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    
    await c.env.UPLOADS_BUCKET.put(filename, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type }
    });

    const url = new URL(c.req.url);
    const imageUrl = `${url.protocol}//${url.host}/uploads/${filename}`;
    
    return c.json({ success: true, imageUrl });
  } catch (err) {
    return c.json({ error: 'BG upload failed' }, 500);
  }
});

app.put('/api/superadmin/config', requireAdmin, async (c) => {
  const prisma = c.get('prisma');
  const body = await c.req.json().catch(() => ({}));
  const { mosaicId, ...configData } = body;
  
  if (!mosaicId) return c.json({ error: 'Mosaic ID required' }, 400);

  try {
    const existing = await prisma.config.findFirst({ where: { mosaicId } });
    let updated;
    if (existing) {
      updated = await prisma.config.update({
        where: { id: existing.id },
        data: configData
      });
    } else {
      updated = await prisma.config.create({
        data: { ...configData, mosaicId }
      });
    }

    await broadcastToDo(c.env, 'display:config_updated', updated, mosaicId);

    return c.json(updated);
  } catch (err) {
    console.error('Config update error:', err);
    return c.json({ error: 'Failed to update config' }, 500);
  }
});

app.get('/api/stats', async (c) => {
  const prisma = c.get('prisma');
  const mosaicId = c.req.query('mosaicId');
  if (!mosaicId) return c.json({ error: 'Mosaic ID required' }, 400);

  try {
    const [approved, config] = await Promise.all([
      prisma.tile.count({ where: { mosaicId, status: 'approved' } }),
      prisma.config.findFirst({ where: { mosaicId } }),
    ]);
    
    const url = new URL(c.req.url);
    const backendHost = `${url.protocol}//${url.host}`;
    
    let fixedConfig = config as any;
    if (fixedConfig && fixedConfig.bgImageUrl && fixedConfig.bgImageUrl.includes('/uploads/')) {
      fixedConfig = {
        ...fixedConfig,
        bgImageUrl: `${backendHost}/uploads/${fixedConfig.bgImageUrl.split('/uploads/')[1]}`
      };
    }
    
    return c.json({ approved, config: fixedConfig || null });
  } catch (err) {
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

app.get('/api/config', async (c) => {
  const prisma = c.get('prisma');
  const mosaicId = c.req.query('mosaicId');
  if (!mosaicId) return c.json({ error: 'Mosaic ID required' }, 400);

  try {
    const config = await prisma.config.findFirst({ where: { mosaicId } });
    if (!config) return c.json({});
    
    const url = new URL(c.req.url);
    const backendHost = `${url.protocol}//${url.host}`;
    
    let fixedConfig = config as any;
    if (fixedConfig.bgImageUrl && fixedConfig.bgImageUrl.includes('/uploads/')) {
      fixedConfig = {
        ...fixedConfig,
        bgImageUrl: `${backendHost}/uploads/${fixedConfig.bgImageUrl.split('/uploads/')[1]}`
      };
    }
    
    return c.json(fixedConfig);
  } catch (err) {
    return c.json({ error: 'Failed to fetch config' }, 500);
  }
});

app.get('/api/print/sticker-sheet', async (c) => {
  const prisma = c.get('prisma');
  const mosaicId = c.req.query('mosaicId');
  if (!mosaicId) return c.json({ error: 'Mosaic ID required' }, 400);

  try {
    const [tiles, config] = await Promise.all([
      prisma.tile.findMany({ where: { mosaicId, status: 'approved' }, orderBy: { createdAt: 'asc' } }),
      prisma.config.findFirst({ where: { mosaicId } }),
    ]);
    
    const url = new URL(c.req.url);
    const backendHost = `${url.protocol}//${url.host}`;
    
    const gridWidth = config?.gridWidth ?? 20;
    const withNumbers = tiles.map((t: any) => ({
      ...t,
      imageUrl: t.imageUrl.includes('/uploads/') 
        ? `${backendHost}/uploads/${t.imageUrl.split('/uploads/')[1]}`
        : t.imageUrl,
      cellNumber: t.gridY * gridWidth + t.gridX + 1,
      colLabel: `C${t.gridX + 1}`,
      rowLabel: `R${t.gridY + 1}`,
    }));
    return c.json({ tiles: withNumbers, config: config || {}, total: tiles.length });
  } catch (err) {
    return c.json({ error: 'Failed to fetch sticker sheet' }, 500);
  }
});

app.get('/api/print/sticker/:id', async (c) => {
  const prisma = c.get('prisma');
  try {
    const id = c.req.param('id');
    const tile = await prisma.tile.findUnique({ where: { id } });
    if (!tile) return c.json({ error: 'Tile not found' }, 404);
    
    const config = await prisma.config.findFirst({ where: { mosaicId: tile.mosaicId } });
    const gridWidth = config?.gridWidth ?? 20;
    return c.json({
      ...tile,
      cellNumber: tile.gridY * gridWidth + tile.gridX + 1,
      colLabel: `C${tile.gridX + 1}`,
      rowLabel: `R${tile.gridY + 1}`,
    });
  } catch (err) {
    return c.json({ error: 'Failed to fetch sticker' }, 500);
  }
});

app.get('/api/print/backdrop-config', async (c) => {
  const prisma = c.get('prisma');
  const mosaicId = c.req.query('mosaicId');
  if (!mosaicId) return c.json({ error: 'Mosaic ID required' }, 400);

  try {
    const config = await prisma.config.findFirst({ where: { mosaicId } });
    if (!config) return c.json({});
    
    const url = new URL(c.req.url);
    const backendHost = `${url.protocol}//${url.host}`;
    
    let fixedConfig = config as any;
    if (fixedConfig.bgImageUrl && fixedConfig.bgImageUrl.includes('/uploads/')) {
      fixedConfig = {
        ...fixedConfig,
        bgImageUrl: `${backendHost}/uploads/${fixedConfig.bgImageUrl.split('/uploads/')[1]}`
      };
    }
    
    return c.json(fixedConfig);
  } catch (err) {
    return c.json({ error: 'Failed to fetch backdrop config' }, 500);
  }
});

app.get('/api/admin/export-csv', async (c) => {
  const prisma = c.get('prisma');
  const mosaicId = c.req.query('mosaicId');
  if (!mosaicId) return c.json({ error: 'Mosaic ID required' }, 400);

  try {
    const tiles = await prisma.tile.findMany({
      where: { mosaicId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, uploader: true, email: true, gridX: true, gridY: true, imageUrl: true, createdAt: true }
    });

    let csv = 'ID,Name,Email,Grid X,Grid Y,Image URL,Submitted At\n';
    tiles.forEach((t: any) => {
      const row = [
        t.id,
        `"${(t.uploader || 'Guest').replace(/"/g, '""')}"`,
        `"${(t.email || '').replace(/"/g, '""')}"`,
        t.gridX,
        t.gridY,
        t.imageUrl,
        t.createdAt.toISOString()
      ].join(',');
      csv += row + '\n';
    });

    c.header('Content-Type', 'text/csv');
    c.header('Content-Disposition', 'attachment; filename=mosaic_export.csv');
    return c.body(csv);
  } catch (err) {
    return c.json({ error: 'Failed to export CSV' }, 500);
  }
});

app.post('/api/setup-database', async (c) => {
  const prisma = c.get('prisma');
  const body = await c.req.json().catch(() => ({}));
  if (body.secret !== c.env.JWT_SECRET) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const superAdminEmail = 'suryasalur@retreatarcade.in';
    const hash = await bcrypt.hash('surya12345', 10);
    
    const exists = await prisma.user.findUnique({ where: { email: superAdminEmail } });
    if (!exists) {
      await prisma.user.create({ data: { email: superAdminEmail, name: 'Surya', passwordHash: hash, role: 'super_admin' } });
    }

    const mosaicCount = await prisma.mosaic.count();
    if (mosaicCount === 0) {
      await prisma.mosaic.create({ data: { name: 'Default Event', slug: 'default', description: 'Auto-created default mosaic' } });
    }

    const defaultSettings: Record<string, string> = {
      site_name: 'Mosaic Wall', site_tagline: 'Turn Any Event Into A Living Mosaic',
      meta_description: 'Mosaic Wall creates stunning real-time digital photo mosaics for weddings, corporate events, and parties across India. Every guest becomes part of the art.', 
      og_image: '', ga_id: '',
      contact_email: 'suryasalur@retreatarcade.in', phone: '9063679687', whatsapp: '9063679687',
      address: 'Plot No:964, H.No 3-964, Sri Nilayam 3rd Floor, Ayyappa Society, Madhapur, Telangana, 500084', 
      footer_tagline: 'Making memories, one photo at a time.'
    };
    
    for (const [key, value] of Object.entries(defaultSettings)) {
      const setExists = await prisma.siteSetting.findUnique({ where: { key } });
      if (!setExists) await prisma.siteSetting.create({ data: { key, value } });
    }

    const defaultSections = [
      { page: 'home', sectionKey: 'hero', title: 'Turn Any Event Into A Living Mosaic', subtitle: 'Real-time digital photo walls and stunning physical print backdrops.', badge: '✨ Powered by Live Tech' },
      { page: 'home', sectionKey: 'digital_mosaic', title: 'Interactive Digital Mosaic', subtitle: 'A live display that grows with every photo.', body: 'Perfect for weddings, corporate events, and parties. Your guests upload photos via QR code, and they appear instantly on the big screen, forming a beautiful branded mosaic.' },
      { page: 'home', sectionKey: 'physical_mosaic', title: 'Physical Print Backdrop', subtitle: 'A tangible keepsake built by your guests.', body: 'We print guest photos as stickers with grid coordinates. Guests place them on a massive template to reveal the final masterpiece.' },
      { page: 'home', sectionKey: 'how_it_works', title: 'How It Works', subtitle: 'Three simple steps to event magic.', body: 'Snap & Scan|Guests take a photo and scan the event QR code.\nUpload|Photos are sent instantly to our real-time engine.\nWatch it Grow|The mosaic comes to life cell-by-cell on screen or wall.' },
      { page: 'home', sectionKey: 'stats', title: 'OUR IMPACT IN NUMBERS', subtitle: '', body: '500+|Events Powered\n250k+|Photos Captured\n100%|Guest Engagement' },
      { page: 'home', sectionKey: 'cta', title: 'Ready to Mosaic Your Next Event?', subtitle: 'Contact us for a custom quote and demo today.', ctaText: 'Get Started', ctaUrl: '/contact' },
      { page: 'features', sectionKey: 'hero', title: 'Every Feature You Need', subtitle: 'From real-time digital mosaic walls to printed physical backdrops.', badge: '🚀 Full-Featured Platform' },
      { page: 'about', sectionKey: 'hero', title: 'We Make Events Unforgettable', subtitle: "Mosaic Wall was born from a simple idea: what if your guests could become the art?", badge: '💡 Our Story' },
    ];

    for (const s of defaultSections) {
      const secExists = await prisma.pageSection.findUnique({ where: { page_sectionKey: { page: s.page, sectionKey: s.sectionKey } }});
      if (!secExists) await prisma.pageSection.create({ data: { ...s, visible: true } });
    }

    return c.json({ success: true, message: 'Database seeded successfully.' });
  } catch (err: any) {
    return c.json({ error: 'Setup failed', details: err.message }, 500);
  }
});

app.get('/api/ws', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return c.json({ error: 'Expected Upgrade: websocket' }, 426);
  }
  
  const mosaicId = c.req.query('mosaicId') || 'global';
  const id = c.env.MOSAIC_ROOM.idFromName(mosaicId);
  const obj = c.env.MOSAIC_ROOM.get(id);
  
  // @ts-ignore - Cloudflare request proxy bypasses standard TS DOM request typing
  const response = await obj.fetch(c.req.raw);
  return response as any;
});

export default app;
