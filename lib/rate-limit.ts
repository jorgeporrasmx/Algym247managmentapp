/**
 * Simple in-memory rate limiter using sliding window algorithm
 *
 * For production with multiple instances, replace with Redis-based solution:
 * npm install @upstash/ratelimit @upstash/redis
 *
 * Usage:
 * const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 10 })
 * const result = await limiter.check(identifier)
 * if (!result.success) { return rateLimitResponse(result) }
 */

import { NextResponse } from 'next/server'

interface RateLimitEntry {
  timestamps: number[]
  lastCleanup: number
}

interface RateLimitConfig {
  /** Time window in milliseconds (default: 60000 = 1 minute) */
  windowMs?: number
  /** Maximum requests per window (default: 10) */
  maxRequests?: number
  /** Identifier prefix for namespacing (default: 'default') */
  prefix?: string
}

interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean
  /** Maximum requests allowed in window */
  limit: number
  /** Remaining requests in current window */
  remaining: number
  /** Timestamp when the rate limit resets */
  reset: number
  /** Time until reset in milliseconds */
  retryAfter: number
}

// Global store for rate limit entries
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

/**
 * Create a rate limiter instance with configuration
 */
export function createRateLimiter(config: RateLimitConfig = {}) {
  const {
    windowMs = 60 * 1000, // 1 minute default
    maxRequests = 10,
    prefix = 'default'
  } = config

  return {
    /**
     * Check if a request is allowed for the given identifier
     * @param identifier - Unique identifier (IP, user ID, API key, etc.)
     */
    async check(identifier: string): Promise<RateLimitResult> {
      const key = `${prefix}:${identifier}`
      const now = Date.now()
      const windowStart = now - windowMs

      // Get or create entry
      let entry = rateLimitStore.get(key)
      if (!entry) {
        entry = { timestamps: [], lastCleanup: now }
        rateLimitStore.set(key, entry)
      }

      // Cleanup old timestamps
      entry.timestamps = entry.timestamps.filter(ts => ts > windowStart)

      // Periodic global cleanup
      if (now - entry.lastCleanup > CLEANUP_INTERVAL_MS) {
        entry.lastCleanup = now
        cleanupExpiredEntries(windowMs)
      }

      const currentCount = entry.timestamps.length
      const remaining = Math.max(0, maxRequests - currentCount)
      const oldestTimestamp = entry.timestamps[0] || now
      const reset = oldestTimestamp + windowMs
      const retryAfter = Math.max(0, reset - now)

      if (currentCount >= maxRequests) {
        return {
          success: false,
          limit: maxRequests,
          remaining: 0,
          reset,
          retryAfter
        }
      }

      // Add current request timestamp
      entry.timestamps.push(now)

      return {
        success: true,
        limit: maxRequests,
        remaining: remaining - 1,
        reset: now + windowMs,
        retryAfter: 0
      }
    },

    /**
     * Reset the rate limit for a specific identifier
     */
    async reset(identifier: string): Promise<void> {
      const key = `${prefix}:${identifier}`
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Cleanup expired entries from the global store
 */
function cleanupExpiredEntries(windowMs: number): void {
  const now = Date.now()
  const cutoff = now - windowMs

  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries with no recent timestamps
    if (entry.timestamps.every(ts => ts < cutoff)) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */

// Strict limiter for dangerous operations (seed, bulk operations)
export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 3,       // Only 3 requests per minute
  prefix: 'strict'
})

// Standard API limiter
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,      // 60 requests per minute
  prefix: 'api'
})

// Auth limiter (prevent brute force)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,            // 5 attempts per 15 minutes
  prefix: 'auth'
})

/**
 * Get client identifier from request (IP address or forwarded header)
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback to a hash of user agent + some request properties
  const userAgent = request.headers.get('user-agent') || 'unknown'
  return `ua:${hashCode(userAgent)}`
}

/**
 * Simple hash function for fallback identifier
 */
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Create a rate limit exceeded response with appropriate headers
 */
export function rateLimitExceededResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(result.retryAfter / 1000)
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toString(),
        'Retry-After': Math.ceil(result.retryAfter / 1000).toString()
      }
    }
  )
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.reset.toString())
  return response
}
