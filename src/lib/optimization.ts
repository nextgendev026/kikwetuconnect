/**
 * Resource Optimization Module
 * Handles Supabase and Vercel resource balancing
 */

// Connection pooling configuration
export const dbPoolConfig = {
  // Max connections per client
  max: 20,
  // Idle timeout in milliseconds
  idleTimeoutMillis: 30000,
  // Connection timeout
  connectionTimeoutMillis: 2000,
}

// Query optimization helpers
export const queryOptimizations = {
  // Cache durations in seconds
  cache: {
    feed: 300, // 5 minutes
    posts: 600, // 10 minutes
    profiles: 3600, // 1 hour
    topics: 86400, // 24 hours
    regions: 86400, // 24 hours
  },

  // Pagination defaults
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
    minLimit: 5,
  },

  // Request batching
  batchSize: {
    posts: 50,
    users: 100,
    notifications: 50,
  },
}

// Vercel edge caching configuration
export const edgeCacheConfig = {
  // Cache control headers
  cacheControl: {
    feed: 'public, s-maxage=300, stale-while-revalidate=600',
    static: 'public, s-maxage=31536000, immutable',
    dynamic: 'private, no-cache, no-store, must-revalidate',
  },

  // Revalidation times (ISR)
  revalidate: {
    feed: 300, // 5 minutes
    posts: 3600, // 1 hour
    profiles: 7200, // 2 hours
    topics: 86400, // 24 hours
  },
}

// Image optimization settings
export const imageOptimization = {
  sizes: {
    avatar: '48px',
    post: '100vw',
    thumbnail: '200px',
    hero: '1200px',
  },

  quality: 75,
  formats: ['image/avif', 'image/webp'],
}

// Database query optimization
export class QueryOptimizer {
  /**
   * Add SELECT clause optimization to reduce payload size
   */
  static optimizeSelect(columns: string[]): string {
    return columns.join(',')
  }

  /**
   * Build efficient pagination query
   */
  static buildPaginationQuery(page: number, limit: number) {
    const offset = (page - 1) * limit
    return { offset, limit: Math.min(limit, queryOptimizations.pagination.maxLimit) }
  }

  /**
   * Batch multiple queries into one
   */
  static batchQueries<T>(queries: Promise<T>[]): Promise<T[]> {
    return Promise.all(queries)
  }

  /**
   * Add request debouncing
   */
  static debounce<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => Promise<any> {
    let timeoutId: NodeJS.Timeout | null = null

    return (...args: Parameters<T>) => {
      return new Promise((resolve) => {
        if (timeoutId) clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          resolve(fn(...args))
        }, delay)
      })
    }
  }
}

// Supabase connection pooling
export class ConnectionPool {
  private connections: Map<string, any> = new Map()
  private maxConnections: number

  constructor(max: number = dbPoolConfig.max) {
    this.maxConnections = max
  }

  /**
   * Get or create a connection
   */
  getConnection(key: string): any {
    if (!this.connections.has(key) && this.connections.size < this.maxConnections) {
      this.connections.set(key, { createdAt: Date.now() })
    }
    return this.connections.get(key)
  }

  /**
   * Release idle connections
   */
  releaseIdleConnections(): void {
    const now = Date.now()
    const idle = dbPoolConfig.idleTimeoutMillis

    for (const [key, conn] of this.connections.entries()) {
      if (now - conn.createdAt > idle) {
        this.connections.delete(key)
      }
    }
  }

  /**
   * Clear all connections
   */
  clear(): void {
    this.connections.clear()
  }
}

// Response caching utility
export class ResponseCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private ttls: Map<string, number> = new Map()

  /**
   * Set cache TTL for specific keys
   */
  setTTL(key: string, seconds: number): void {
    this.ttls.set(key, seconds * 1000)
  }

  /**
   * Get cached response
   */
  get(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    const ttl = this.ttls.get(key) || 3600000 // Default 1 hour
    const isExpired = Date.now() - cached.timestamp > ttl

    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  /**
   * Set cached response
   */
  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  /**
   * Clear cache by pattern
   */
  clearPattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }
}

// Monitor resource usage
export class ResourceMonitor {
  private metrics: Map<string, number[]> = new Map()

  /**
   * Record metric
   */
  record(metric: string, value: number): void {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, [])
    }
    this.metrics.get(metric)?.push(value)

    // Keep only last 100 measurements
    const values = this.metrics.get(metric)!
    if (values.length > 100) {
      values.shift()
    }
  }

  /**
   * Get average metric
   */
  getAverage(metric: string): number {
    const values = this.metrics.get(metric)
    if (!values || values.length === 0) return 0
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  /**
   * Get peak metric
   */
  getPeak(metric: string): number {
    const values = this.metrics.get(metric)
    return values ? Math.max(...values) : 0
  }

  /**
   * Get all metrics summary
   */
  getSummary(): Record<string, { average: number; peak: number }> {
    const summary: Record<string, { average: number; peak: number }> = {}

    for (const [metric] of this.metrics) {
      summary[metric] = {
        average: this.getAverage(metric),
        peak: this.getPeak(metric),
      }
    }

    return summary
  }
}

// Singleton instances
export const responseCache = new ResponseCache()
export const resourceMonitor = new ResourceMonitor()

// Set default cache TTLs
Object.entries(queryOptimizations.cache).forEach(([key, seconds]) => {
  responseCache.setTTL(key, seconds)
})
