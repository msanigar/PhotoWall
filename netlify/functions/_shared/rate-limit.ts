import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { getHeader } from "./headers.js"

let ratelimitSubmit: Ratelimit | null = null
let ratelimitAdmin: Ratelimit | null = null

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export function getSubmitRateLimiter(): Ratelimit | null {
  if (ratelimitSubmit) return ratelimitSubmit
  const redis = getRedis()
  if (!redis) return null
  ratelimitSubmit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 m"),
    analytics: true,
  })
  return ratelimitSubmit
}

export function getAdminRateLimiter(): Ratelimit | null {
  if (ratelimitAdmin) return ratelimitAdmin
  const redis = getRedis()
  if (!redis) return null
  ratelimitAdmin = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
  })
  return ratelimitAdmin
}

export function getClientIp(event: {
  headers: Headers | Record<string, string | undefined>
}): string {
  const xff =
    getHeader(event.headers, "x-forwarded-for") ||
    getHeader(event.headers, "x-real-ip") ||
    ""
  return xff.split(",")[0].trim() || "0.0.0.0"
}
