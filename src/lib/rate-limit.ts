// =================================
// 🚦 Rate Limiting Middleware
// =================================

interface RateLimitOptions {
  interval: number; // Time window in ms
  uniqueTokenPerInterval?: number; // Max requests per IP
}

interface RateLimitCache {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private cache: RateLimitCache = {};
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = options;

    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.cache).forEach((key) => {
      if (this.cache[key].resetTime < now) {
        delete this.cache[key];
      }
    });
  }

  check(identifier: string): {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  } {
    const now = Date.now();
    const limit = this.options.uniqueTokenPerInterval || 100;

    if (!this.cache[identifier] || this.cache[identifier].resetTime < now) {
      this.cache[identifier] = {
        count: 1,
        resetTime: now + this.options.interval,
      };

      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: this.cache[identifier].resetTime,
      };
    }

    this.cache[identifier].count++;

    const remaining = Math.max(0, limit - this.cache[identifier].count);
    const success = this.cache[identifier].count <= limit;

    return {
      success,
      limit,
      remaining,
      reset: this.cache[identifier].resetTime,
    };
  }
}

// Create rate limiter instances
const apiRateLimiter = new RateLimiter({
  interval: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  uniqueTokenPerInterval: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
});

const paymentRateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 5, // Max 5 payment creations per minute per IP
});

const webhookRateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 10, // Max 10 webhook tests per minute per IP
});

export function rateLimit(
  request: Request,
  type: "api" | "payment" | "webhook" = "api"
): {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  // Get client IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : "unknown";

  // Select appropriate rate limiter
  let limiter: RateLimiter;
  switch (type) {
    case "payment":
      limiter = paymentRateLimiter;
      break;
    case "webhook":
      limiter = webhookRateLimiter;
      break;
    default:
      limiter = apiRateLimiter;
      break;
  }

  return limiter.check(ip);
}

export function createRateLimitResponse(
  limit: number,
  remaining: number,
  reset: number
) {
  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded",
      error_cn: "请求频率超限",
      message: "Too many requests, please try again later",
      message_cn: "请求过于频繁，请稍后重试",
      limit,
      remaining,
      reset,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": new Date(reset).toISOString(),
        "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
      },
    }
  );
}
