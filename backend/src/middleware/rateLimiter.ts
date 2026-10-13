import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipBuckets = new Map<string, RateLimitRecord>();

/**
 * Creates an in-memory rate limiter per IP address for sensitive authentication routes.
 * @param windowMs Time window in milliseconds
 * @param maxRequests Maximum requests allowed within the window
 */
export function createRateLimiter(windowMs: number = 60000, maxRequests: number = 30) {
  // Clean up expired buckets periodically
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipBuckets.entries()) {
      if (now > record.resetTime) {
        ipBuckets.delete(ip);
      }
    }
  }, 120000).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();

    const existing = ipBuckets.get(ip);
    if (!existing || now > existing.resetTime) {
      ipBuckets.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (existing.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((existing.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        error: 'Too many authentication attempts. Please slow down and try again shortly.',
        retryAfterSeconds,
      });
    }

    existing.count += 1;
    return next();
  };
}
