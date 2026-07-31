import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function normalizeEnvironmentValue(value: string): string {
  return value
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^UPSTASH_REDIS_REST_URL=/, "")
    .trim();
}

function createRedisClient(): Redis | null {
  const rawUrl = process.env.UPSTASH_REDIS_REST_URL;
  const rawToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!rawUrl || !rawToken) {
    return null;
  }

  const redisUrl = normalizeEnvironmentValue(rawUrl);
  const redisToken = rawToken.trim().replace(/^["']|["']$/g, "");

  try {
    const parsedUrl = new URL(redisUrl);

    if (parsedUrl.protocol !== "https:") {
      console.error(
        "Upstash rate limiting disabled: REST URL must use HTTPS.",
      );

      return null;
    }

    return new Redis({
      url: parsedUrl.origin,
      token: redisToken,
    });
  } catch {
    console.error(
      "Upstash rate limiting disabled: REST URL is invalid.",
    );

    return null;
  }
}

const redis = createRedisClient();

export const publicApiRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      analytics: true,
      prefix: "duka:public-api",
    })
  : null;

export const authRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "10 m"),
      analytics: true,
      prefix: "duka:auth",
    })
  : null;

export const checkoutRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "10 m"),
      analytics: true,
      prefix: "duka:checkout",
    })
  : null;
