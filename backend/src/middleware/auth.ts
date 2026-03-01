import { verify } from 'hono/jwt';
import { Context, Next } from 'hono';

// Middleware to verify JWT token from cookies or auth header
export const authMiddleware = async (c: Context, next: Next) => {
  try {
    const cookies = c.req.header('Cookie') || '';
    let token = '';

    // Extract token from cookie
    const tokenCookie = cookies.split(';').find((cookie) => cookie.trim().startsWith('mosaic_jwt='));
    if (tokenCookie) {
      token = tokenCookie.split('=')[1];
    }

    // Fallback exactly as before (Auth header)
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return c.json({ error: 'Unauthorized: missing token' }, 401);
    }

    // Third argument is the algorithm used for signing
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256');
    
    // Mount user payload to request context
    c.set('user', payload);
    return await next();
  } catch (err) {
    return c.json({ error: 'Unauthorized: invalid token' }, 401);
  }
};
