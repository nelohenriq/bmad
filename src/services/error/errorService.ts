import { monitoringService } from '../monitoring/monitoringService'

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  operation: string
  userId?: string
  sessionId?: string
  requestId?: string
  metadata?: Record<string, any>
  stackTrace?: string
  timestamp: Date
}

export interface ErrorReport {
  id: string
  message: string
  code?: string
  severity: ErrorSeverity
  category: ErrorCategory
  context: ErrorContext
  retryable: boolean
  resolved: boolean
  resolution?: string
  createdAt: Date
  resolvedAt?: Date
}

export interface CircuitBreakerState {
  service: string
  state: 'closed' | 'open' | 'half-open'
  failureCount: number
  lastFailureTime?: Date
  nextRetryTime?: Date
}

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
  jitter: boolean
}

export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private failureCount = 0
  private lastFailureTime?: Date
  private nextRetryTime?: Date

  constructor(
    private serviceName: string,
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000, // 1 minute
    private monitoringPeriod: number = 10000 // 10 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.nextRetryTime && Date.now() < this.nextRetryTime.getTime()) {
        throw new Error(`Circuit breaker is OPEN for service: ${this.serviceName}`)
      } else {
        this.state = 'half-open'
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0
    this.state = 'closed'
    this.lastFailureTime = undefined
    this.nextRetryTime = undefined
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = new Date()

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open'
      this.nextRetryTime = new Date(Date.now() + this.recoveryTimeout)
    }
  }

  getState(): CircuitBreakerState {
    return {
      service: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextRetryTime: this.nextRetryTime
    }
  }

  reset(): void {
    this.state = 'closed'
    this.failureCount = 0
    this.lastFailureTime = undefined
    this.nextRetryTime = undefined
  }
}

export class RetryService {
  private circuitBreakers = new Map<string, CircuitBreaker>()

  constructor(private defaultConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: true
  }) {}

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    serviceName: string,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const retryConfig = { ...this.defaultConfig, ...config }

    // Get or create circuit breaker for this service
    let circuitBreaker = this.circuitBreakers.get(serviceName)
    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker(serviceName)
      this.circuitBreakers.set(serviceName, circuitBreaker)
    }

    return circuitBreaker.execute(async () => {
      let lastError: Error

      for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
        try {
          return await operation()
        } catch (error) {
          lastError = error as Error

          if (attempt === retryConfig.maxAttempts) {
            break
          }

          // Calculate delay with exponential backoff
          const baseDelay = retryConfig.baseDelay * Math.pow(retryConfig.backoffFactor, attempt - 1)
          const delay = Math.min(baseDelay, retryConfig.maxDelay)

          // Add jitter to prevent thundering herd
          const jitteredDelay = retryConfig.jitter
            ? delay * (0.5 + Math.random() * 0.5)
            : delay

          await new Promise(resolve => setTimeout(resolve, jitteredDelay))
        }
      }

      throw lastError!
    })
  }

  getCircuitBreakerStates(): CircuitBreakerState[] {
    return Array.from(this.circuitBreakers.values()).map(cb => cb.getState())
  }

  resetCircuitBreaker(serviceName: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(serviceName)
    if (circuitBreaker) {
      circuitBreaker.reset()
      return true
    }
    return false
  }
}

export class ErrorService {
  private retryService = new RetryService()
  private errorReports = new Map<string, ErrorReport>()

  constructor() {
    // Set up global error handlers
    this.setupGlobalErrorHandlers()
  }

  /**
   * Report an error with full context
   */
  async reportError(
    error: Error | string,
    severity: ErrorSeverity,
    category: ErrorCategory,
    context: ErrorContext,
    retryable: boolean = false
  ): Promise<string> {
    const errorMessage = error instanceof Error ? error.message : error
    const stackTrace = error instanceof Error ? error.stack : undefined

    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      message: errorMessage,
      severity,
      category,
      context: {
        ...context,
        stackTrace,
        timestamp: new Date()
      },
      retryable,
      resolved: false,
      createdAt: new Date()
    }

    this.errorReports.set(errorReport.id, errorReport)

    // Log to monitoring service
    await monitoringService.recordError({
      message: errorMessage,
      severity,
      category,
      operation: context.operation,
      userId: context.userId,
      metadata: {
        ...context.metadata,
        stackTrace,
        errorId: errorReport.id
      }
    })

    // Trigger alerts for high-severity errors
    if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH) {
      await this.triggerAlert(errorReport)
    }

    return errorReport.id
  }

  /**
   * Execute operation with automatic retry and circuit breaker
   */
  async executeWithProtection<T>(
    operation: () => Promise<T>,
    serviceName: string,
    context: ErrorContext,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    try {
      return await this.retryService.executeWithRetry(operation, serviceName, retryConfig)
    } catch (error) {
      const errorId = await this.reportError(
        error as Error,
        ErrorSeverity.MEDIUM,
        ErrorCategory.EXTERNAL_API,
        context,
        true
      )
      throw new Error(`Operation failed after retries (Error ID: ${errorId}): ${(error as Error).message}`)
    }
  }

  /**
   * Gracefully degrade functionality when services are unavailable
   */
  getGracefulDegradationStrategy(serviceName: string): {
    fallbackAvailable: boolean
    degradedMode: boolean
    message: string
  } {
    const circuitBreaker = Array.from(this.retryService.getCircuitBreakerStates())
      .find(state => state.service === serviceName)

    if (circuitBreaker?.state === 'open') {
      switch (serviceName) {
        case 'ollama':
          return {
            fallbackAvailable: true,
            degradedMode: true,
            message: 'AI generation will use simplified mode without advanced features'
          }
        case 'qdrant':
          return {
            fallbackAvailable: true,
            degradedMode: true,
            message: 'Search will use basic keyword matching instead of semantic search'
          }
        case 'database':
          return {
            fallbackAvailable: false,
            degradedMode: true,
            message: 'System is operating in read-only mode'
          }
        default:
          return {
            fallbackAvailable: false,
            degradedMode: true,
            message: 'Service is temporarily unavailable'
          }
      }
    }

    return {
      fallbackAvailable: true,
      degradedMode: false,
      message: 'All services operating normally'
    }
  }

  /**
   * Get error statistics and trends
   */
  getErrorStatistics(timeRange: number = 3600000): {
    totalErrors: number
    errorsBySeverity: Record<ErrorSeverity, number>
    errorsByCategory: Record<ErrorCategory, number>
    topFailingOperations: Array<{ operation: string; count: number }>
    recentErrors: ErrorReport[]
  } {
    const cutoffTime = new Date(Date.now() - timeRange)
    const recentErrors = Array.from(this.errorReports.values())
      .filter(report => report.createdAt >= cutoffTime)

    const errorsBySeverity = Object.values(ErrorSeverity).reduce((acc, severity) => {
      acc[severity] = recentErrors.filter(e => e.severity === severity).length
      return acc
    }, {} as Record<ErrorSeverity, number>)

    const errorsByCategory = Object.values(ErrorCategory).reduce((acc, category) => {
      acc[category] = recentErrors.filter(e => e.category === category).length
      return acc
    }, {} as Record<ErrorCategory, number>)

    const operationCounts = recentErrors.reduce((acc, error) => {
      const operation = error.context.operation
      acc[operation] = (acc[operation] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topFailingOperations = Object.entries(operationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([operation, count]) => ({ operation, count }))

    return {
      totalErrors: recentErrors.length,
      errorsBySeverity,
      errorsByCategory,
      topFailingOperations,
      recentErrors: recentErrors.slice(-10) // Last 10 errors
    }
  }

  /**
   * Resolve an error report
   */
  async resolveError(errorId: string, resolution: string): Promise<boolean> {
    const errorReport = this.errorReports.get(errorId)
    if (errorReport) {
      errorReport.resolved = true
      errorReport.resolution = resolution
      errorReport.resolvedAt = new Date()
      return true
    }
    return false
  }

  /**
   * Get circuit breaker states
   */
  getCircuitBreakerStates(): CircuitBreakerState[] {
    return this.retryService.getCircuitBreakerStates()
  }

  /**
   * Reset circuit breaker for a service
   */
  resetCircuitBreaker(serviceName: string): boolean {
    return this.retryService.resetCircuitBreaker(serviceName)
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async triggerAlert(errorReport: ErrorReport): Promise<void> {
    // In a real implementation, this would send alerts via email, Slack, etc.
    console.error(`🚨 ${errorReport.severity.toUpperCase()} ERROR:`, {
      id: errorReport.id,
      message: errorReport.message,
      category: errorReport.category,
      operation: errorReport.context.operation
    })

    // Record alert in monitoring service
    await monitoringService.recordAlert({
      type: 'error',
      severity: errorReport.severity,
      message: `Critical error in ${errorReport.context.operation}: ${errorReport.message}`,
      metadata: {
        errorId: errorReport.id,
        category: errorReport.category,
        operation: errorReport.context.operation
      }
    })
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason)
      this.reportError(
        `Unhandled promise rejection: ${reason}`,
        ErrorSeverity.HIGH,
        ErrorCategory.SYSTEM,
        {
          operation: 'system',
          metadata: { type: 'unhandledRejection', reason: String(reason) },
          timestamp: new Date()
        }
      )
    })

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error)
      this.reportError(
        error,
        ErrorSeverity.CRITICAL,
        ErrorCategory.SYSTEM,
        {
          operation: 'system',
          metadata: { type: 'uncaughtException' },
          timestamp: new Date()
        }
      )
    })
  }
}

export const errorService = new ErrorService()