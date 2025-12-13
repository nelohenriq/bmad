import { getQdrantClient } from '../core/client';

interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface PerformanceStats {
  operation: string;
  count: number;
  successRate: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  timeRange: {
    from: Date;
    to: Date;
  };
}

export class VectorPerformanceMonitor {
  private client = getQdrantClient();
  private metrics: PerformanceMetric[] = [];
  private maxHistorySize = 10000;
  private statsCache = new Map<string, { stats: PerformanceStats; expires: Date }>();
  private cacheTimeout = 300000; // 5 minutes

  recordMetric(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      success,
      timestamp: new Date(),
      metadata
    };

    this.metrics.push(metric);

    // Maintain history size
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics.shift();
    }

    // Clear expired cache entries
    for (const [key, value] of this.statsCache) {
      if (value.expires < new Date()) {
        this.statsCache.delete(key);
      }
    }

    // Log performance issues
    if (duration > 5000) { // 5 seconds
      console.warn(`🐌 Slow vector operation: ${operation} took ${duration}ms`, metadata);
    } else if (duration > 1000) { // 1 second
      console.info(`🐌 Slow vector operation: ${operation} took ${duration}ms`, metadata);
    }
  }

  getMetrics(
    operation?: string,
    since?: Date,
    limit?: number
  ): PerformanceMetric[] {
    let filtered = this.metrics;

    if (operation) {
      filtered = filtered.filter(m => m.operation === operation);
    }

    if (since) {
      filtered = filtered.filter(m => m.timestamp >= since);
    }

    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  getStats(operation?: string, since?: Date, useCache: boolean = true): PerformanceStats | null {
    const cacheKey = `${operation || 'all'}-${since?.getTime() || 'all'}`;

    // Check cache first
    if (useCache) {
      const cached = this.statsCache.get(cacheKey);
      if (cached && cached.expires > new Date()) {
        return cached.stats;
      }
    }

    const metrics = this.getMetrics(operation, since);
    if (metrics.length === 0) return null;

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const successCount = metrics.filter(m => m.success).length;

    const stats: PerformanceStats = {
      operation: operation || 'all',
      count: metrics.length,
      successRate: successCount / metrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50Duration: this.percentile(durations, 50),
      p95Duration: this.percentile(durations, 95),
      p99Duration: this.percentile(durations, 99),
      timeRange: {
        from: metrics[0].timestamp,
        to: metrics[metrics.length - 1].timestamp
      }
    };

    // Cache the result
    if (useCache) {
      this.statsCache.set(cacheKey, {
        stats,
        expires: new Date(Date.now() + this.cacheTimeout)
      });
    }

    return stats;
  }

  getAllOperationStats(since?: Date): Record<string, PerformanceStats> {
    const operations = [...new Set(this.metrics.map(m => m.operation))];
    const stats: Record<string, PerformanceStats> = {};

    for (const operation of operations) {
      const opStats = this.getStats(operation, since);
      if (opStats) {
        stats[operation] = opStats;
      }
    }

    return stats;
  }

  getHealthMetrics(): {
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
    clientHealth: any;
    recentPerformance: Record<string, PerformanceStats>;
    alerts: string[];
  } {
    const alerts: string[] = [];
    const clientHealth = this.client.getHealthStatus();
    const recentStats = this.getAllOperationStats(new Date(Date.now() - 3600000)); // Last hour

    // Check client health
    if (clientHealth.status !== 'healthy') {
      alerts.push(`Qdrant client is ${clientHealth.status}`);
    }

    // Check performance degradation
    for (const [operation, stats] of Object.entries(recentStats)) {
      if (stats.successRate < 0.95) {
        alerts.push(`${operation} success rate degraded: ${(stats.successRate * 100).toFixed(1)}%`);
      }

      if (stats.p95Duration > 2000) { // 2 seconds
        alerts.push(`${operation} p95 latency high: ${stats.p95Duration}ms`);
      }
    }

    // Determine overall health
    let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (alerts.length > 0) {
      overallHealth = alerts.some(alert => alert.includes('unhealthy') || alert.includes('degraded'))
        ? 'unhealthy' : 'degraded';
    }

    return {
      overallHealth,
      clientHealth,
      recentPerformance: recentStats,
      alerts
    };
  }

  private percentile(sortedArray: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
    if (lower === upper) return sortedArray[lower];

    return sortedArray[lower] * (1 - (index % 1)) + sortedArray[upper] * (index % 1);
  }

  clearMetrics(): void {
    this.metrics = [];
    this.statsCache.clear();
  }

  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
}

// Global performance monitor
export const performanceMonitor = new VectorPerformanceMonitor();