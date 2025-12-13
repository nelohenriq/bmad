import { prisma } from '../database/prisma'

export interface PerformanceMetric {
  id?: string
  timestamp: Date
  operation: string
  duration: number
  status: 'success' | 'error' | 'timeout'
  errorType?: string
  metadata: {
    userId?: string
    sessionId?: string
    component: string
    method: string
    inputSize?: number
    outputSize?: number
    resourceUsage?: {
      cpu?: number
      memory?: number
      databaseConnections?: number
    }
  }
}

export interface ThroughputMetrics {
  operation: string
  timeRange: '1m' | '5m' | '15m' | '1h'
  requestCount: number
  averageResponseTime: number
  p95ResponseTime: number
  errorRate: number
}

export interface ResourceMetrics {
  timestamp: Date
  cpuUsage: number
  memoryUsage: number
  databaseConnections: number
  vectorOperations: number
  activeRequests: number
}

export interface AlertRule {
  id: string
  name: string
  condition: {
    metric: string
    operator: '>' | '<' | '>=' | '<=' | '=='
    threshold: number
    timeWindow: number // minutes
  }
  severity: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
  notificationChannels: string[]
  cooldownPeriod: number // minutes
  lastTriggered?: Date
}

export class MonitoringService {
  private metrics: PerformanceMetric[] = []
  private resourceMetrics: ResourceMetrics[] = []
  private alertRules: AlertRule[] = []
  private maxMetricsInMemory = 10000

  constructor() {
    // Load alert rules from database or config
    this.initializeAlertRules()
    // Start resource monitoring
    this.startResourceMonitoring()
  }

  /**
   * Record a performance metric
   */
  async recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): Promise<void> {
    const fullMetric: PerformanceMetric = {
      ...metric,
      id: this.generateId(),
      timestamp: new Date()
    }

    // Store in memory for quick access
    this.metrics.push(fullMetric)

    // Keep only recent metrics in memory
    if (this.metrics.length > this.maxMetricsInMemory) {
      this.metrics = this.metrics.slice(-this.maxMetricsInMemory)
    }

    // Persist to database asynchronously
    
    try {
      await this.persistMetric(fullMetric)
    } catch (error) {
      console.error('Failed to persist metric:', error)
    }

    // Check alert rules
    await this.checkAlerts(fullMetric)
  }

  /**
   * Get throughput metrics for a time range
   */
  getThroughputMetrics(operation: string, timeRange: '1m' | '5m' | '15m' | '1h' = '5m'): ThroughputMetrics | null {
    const now = Date.now()
    const timeWindowMs = this.getTimeWindowMs(timeRange)

    const relevantMetrics = this.metrics.filter(m =>
      m.operation === operation &&
      (now - m.timestamp.getTime()) <= timeWindowMs
    )

    if (relevantMetrics.length === 0) {
      return null
    }

    const responseTimes = relevantMetrics.map(m => m.duration).sort((a, b) => a - b)
    const errorCount = relevantMetrics.filter(m => m.status === 'error').length

    return {
      operation,
      timeRange,
      requestCount: relevantMetrics.length,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
      errorRate: errorCount / relevantMetrics.length
    }
  }

  /**
   * Get current resource metrics
   */
  getCurrentResourceMetrics(): ResourceMetrics | null {
    return this.resourceMetrics[this.resourceMetrics.length - 1] || null
  }

  /**
   * Get resource metrics history
   */
  getResourceMetricsHistory(hours: number = 1): ResourceMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    return this.resourceMetrics.filter(m => m.timestamp.getTime() > cutoff)
  }

  /**
   * Get performance summary for dashboard
   */
  getPerformanceSummary(): {
    totalRequests: number
    averageResponseTime: number
    errorRate: number
    topSlowOperations: Array<{ operation: string; avgTime: number; count: number }>
    recentErrors: PerformanceMetric[]
  } | null {
    const lastHour = Date.now() - (60 * 60 * 1000)
    const recentMetrics = this.metrics.filter(m => m.timestamp.getTime() > lastHour)

    if (recentMetrics.length === 0) {
      return null
    }

    const totalRequests = recentMetrics.length
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests
    const errorCount = recentMetrics.filter(m => m.status === 'error').length
    const errorRate = errorCount / totalRequests

    // Group by operation and calculate averages
    const operationStats = new Map<string, { totalTime: number; count: number }>()
    recentMetrics.forEach(metric => {
      const existing = operationStats.get(metric.operation) || { totalTime: 0, count: 0 }
      operationStats.set(metric.operation, {
        totalTime: existing.totalTime + metric.duration,
        count: existing.count + 1
      })
    })

    const topSlowOperations = Array.from(operationStats.entries())
      .map(([operation, stats]) => ({
        operation,
        avgTime: stats.totalTime / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5)

    const recentErrors = recentMetrics
      .filter(m => m.status === 'error')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)

    return {
      totalRequests,
      averageResponseTime,
      errorRate,
      topSlowOperations,
      recentErrors
    }
  }

  /**
   * Export metrics data
   */
  exportMetrics(startDate: Date, endDate: Date, format: 'json' | 'csv' = 'json'): string {
    const metrics = this.metrics.filter(m =>
      m.timestamp >= startDate && m.timestamp <= endDate
    )

    if (format === 'csv') {
      const headers = ['timestamp', 'operation', 'duration', 'status', 'errorType', 'component', 'method']
      const rows = metrics.map(m => [
        m.timestamp.toISOString(),
        m.operation,
        m.duration.toString(),
        m.status,
        m.errorType || '',
        m.metadata.component,
        m.metadata.method
      ])

      return [headers, ...rows].map(row => row.join(',')).join('\n')
    }

    return JSON.stringify(metrics, null, 2)
  }

  /**
   * Configure alert rules
   */
  updateAlertRule(rule: AlertRule): void {
    const existingIndex = this.alertRules.findIndex(r => r.id === rule.id)
    if (existingIndex >= 0) {
      this.alertRules[existingIndex] = rule
    } else {
      this.alertRules.push(rule)
    }
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules]
  }

  private async persistMetric(metric: PerformanceMetric): Promise<void> {
    // In a real implementation, this would save to a time-series database
    // For now, we'll use Prisma to save to a metrics table
    try {
      await prisma.performanceMetrics.create({
        data: {
          operation: metric.operation,
          duration: metric.duration,
          status: metric.status,
          errorType: metric.errorType,
          component: metric.metadata.component,
          method: metric.metadata.method,
          inputSize: metric.metadata.inputSize,
          outputSize: metric.metadata.outputSize,
          userId: metric.metadata.userId,
          sessionId: metric.metadata.sessionId,
          resourceUsage: metric.metadata.resourceUsage ? JSON.stringify(metric.metadata.resourceUsage) : null,
          timestamp: metric.timestamp
        }
      })
    } catch (error) {
      // If database save fails, log but don't throw
      console.error('Failed to save metric to database:', error)
    }
  }

  private async checkAlerts(metric: PerformanceMetric): Promise<void> {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue

      // Check if rule is in cooldown
      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldownPeriod * 60 * 1000
        if (Date.now() - rule.lastTriggered.getTime() < cooldownMs) continue
      }

      const shouldTrigger = this.evaluateAlertCondition(rule, metric)
      if (shouldTrigger) {
        await this.triggerAlert(rule, metric)
        rule.lastTriggered = new Date()
      }
    }
  }

  private evaluateAlertCondition(rule: AlertRule, metric: PerformanceMetric): boolean {
    let value: number

    switch (rule.condition.metric) {
      case 'responseTime':
        value = metric.duration
        break
      case 'errorRate':
        // Calculate error rate for this operation in the time window
        const timeWindowMs = rule.condition.timeWindow * 60 * 1000
        const relevantMetrics = this.metrics.filter(m =>
          m.operation === metric.operation &&
          (Date.now() - m.timestamp.getTime()) <= timeWindowMs
        )
        const errorCount = relevantMetrics.filter(m => m.status === 'error').length
        value = relevantMetrics.length > 0 ? errorCount / relevantMetrics.length : 0
        break
      default:
        return false
    }

    switch (rule.condition.operator) {
      case '>': return value > rule.condition.threshold
      case '<': return value < rule.condition.threshold
      case '>=': return value >= rule.condition.threshold
      case '<=': return value <= rule.condition.threshold
      case '==': return value === rule.condition.threshold
      default: return false
    }
  }

  private async triggerAlert(rule: AlertRule, metric: PerformanceMetric): Promise<void> {
    // In a real implementation, this would send notifications via email, Slack, etc.
    console.warn(`ALERT [${rule.severity.toUpperCase()}]: ${rule.name}`)
    console.warn(`Condition: ${rule.condition.metric} ${rule.condition.operator} ${rule.condition.threshold}`)
    console.warn(`Triggered by: ${metric.operation} (${metric.duration}ms)`)

    // For now, just log the alert
    // TODO: Implement actual notification channels
  }

  private initializeAlertRules(): void {
    // Default alert rules
    this.alertRules = [
      {
        id: 'high-response-time',
        name: 'High Response Time',
        condition: {
          metric: 'responseTime',
          operator: '>',
          threshold: 5000, // 5 seconds
          timeWindow: 5
        },
        severity: 'medium',
        enabled: true,
        notificationChannels: ['console'],
        cooldownPeriod: 10
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        condition: {
          metric: 'errorRate',
          operator: '>',
          threshold: 0.1, // 10%
          timeWindow: 15
        },
        severity: 'high',
        enabled: true,
        notificationChannels: ['console'],
        cooldownPeriod: 30
      }
    ]
  }

  private startResourceMonitoring(): void {
    // Monitor system resources every 30 seconds
    setInterval(() => {
      // In a real implementation, this would collect actual system metrics
      // For now, we'll simulate resource monitoring
      const metric: ResourceMetrics = {
        timestamp: new Date(),
        cpuUsage: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        databaseConnections: Math.floor(Math.random() * 20) + 5,
        vectorOperations: Math.floor(Math.random() * 100) + 10,
        activeRequests: Math.floor(Math.random() * 50) + 5
      }

      this.resourceMetrics.push(metric)

      // Keep only last 24 hours of resource metrics
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
      this.resourceMetrics = this.resourceMetrics.filter(m => m.timestamp.getTime() > oneDayAgo)
    }, 30000)
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * Record an error event
   */
  async recordError(error: {
    message: string
    severity: string
    category: string
    operation: string
    userId?: string
    metadata?: any
  }): Promise<void> {
    await this.recordMetric({
      operation: error.operation,
      duration: 0,
      status: 'error',
      errorType: error.category,
      metadata: {
        component: 'error-service',
        method: 'recordError',
        userId: error.userId,
        sessionId: undefined,
        ...error.metadata
      }
    })
  }

  /**
   * Record an alert event
   */
  async recordAlert(alert: {
    type: string
    severity: string
    message: string
    metadata?: any
  }): Promise<void> {
    // Store alert as a special type of metric
    await this.recordMetric({
      operation: 'alert',
      duration: 0,
      status: 'success',
      metadata: {
        component: 'alert-system',
        method: 'recordAlert',
        ...alert.metadata,
        alertType: alert.type,
        alertSeverity: alert.severity,
        alertMessage: alert.message
      }
    })
  }

  private getTimeWindowMs(timeRange: '1m' | '5m' | '15m' | '1h'): number {
    switch (timeRange) {
      case '1m': return 60 * 1000
      case '5m': return 5 * 60 * 1000
      case '15m': return 15 * 60 * 1000
      case '1h': return 60 * 60 * 1000
      default: return 5 * 60 * 1000
    }
  }
}

export const monitoringService = new MonitoringService()