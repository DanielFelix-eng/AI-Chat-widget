const store = new Map();

function getClientKey(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function makeLimiter({ windowMs, max, keyPrefix }) {
  return (req, res, next) => {
    const key = `${keyPrefix}:${getClientKey(req)}`;
    const now = Date.now();
    const bucket = store.get(key) || { count: 0, resetAt: now + windowMs };

    if (now >= bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    if (bucket.count >= max) {
      return res.status(429).json({
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please wait a moment and try again.',
      });
    }

    bucket.count += 1;
    store.set(key, bucket);
    next();
  };
}

export const signupLimiter = makeLimiter({ windowMs: 60 * 1000, max: 5, keyPrefix: 'signup' });
export const widgetChatLimiter = makeLimiter({ windowMs: 60 * 1000, max: 60, keyPrefix: 'widget-chat' });
