import { createHash } from 'crypto'

export interface CacheEntry {
  key: string
  value: any
  expiresAt: Date
  createdAt: Date
}

export class AnalysisCache {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly defaultTTL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

  /**
   * Generate a cache key from content
   */
  generateKey(content: string, type: string = 'analysis'): string {
    const hash = createHash('sha256')
      .update(`${type}:${content}`)
      .digest('hex')
    return `${type}_${hash.substring(0, 16)}`
  }

  /**
   * Get cached value if it exists and hasn't expired
   */
  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    if (new Date() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.value
  }

  /**
   * Set a value in cache with optional TTL
   */
  set(key: string, value: any, ttl: number = this.defaultTTL): void {
    const expiresAt = new Date(Date.now() + ttl)
    const entry: CacheEntry = {
      key,
      value,
      expiresAt,
      createdAt: new Date()
    }

    this.cache.set(key, entry)
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) {
      return false
    }

    if (new Date() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all expired entries
   */
  cleanup(): number {
    let removed = 0
    const now = new Date()

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        removed++
      }
    }

    return removed
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number
    validEntries: number
    expiredEntries: number
  } {
    let validEntries = 0
    let expiredEntries = 0
    const now = new Date()

    for (const entry of Array.from(this.cache.values())) {
      if (now > entry.expiresAt) {
        expiredEntries++
      } else {
        validEntries++
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }
}

export const analysisCache = new AnalysisCache()

// Auto-cleanup every hour
setInterval(() => {
  const removed = analysisCache.cleanup()
  if (removed > 0) {
    console.log(`Analysis cache cleanup: removed ${removed} expired entries`)
  }
}, 60 * 60 * 1000)