'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react'
import { errorService, ErrorSeverity, ErrorCategory } from '@/services/error/errorService'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showErrorDetails?: boolean
  enableRetry?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: 0
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Report error to error service
    errorService.reportError(
      error,
      ErrorSeverity.HIGH,
      ErrorCategory.SYSTEM,
      {
        operation: 'ui-error-boundary',
        metadata: {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'
        },
        timestamp: new Date()
      },
      false // UI errors are typically not retryable
    )

    this.setState({
      error,
      errorInfo
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <CardTitle className="text-xl text-gray-900 dark:text-gray-100">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-gray-600 dark:text-gray-400">
                We encountered an unexpected error. Our team has been notified and is working to fix it.
              </p>

              {this.props.showErrorDetails && this.state.error && (
                <details className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                  <summary className="cursor-pointer font-medium text-gray-900 dark:text-gray-100">
                    Error Details (for developers)
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <strong className="text-red-600 dark:text-red-400">Error:</strong>
                      <pre className="text-sm bg-red-50 dark:bg-red-950 p-2 rounded mt-1 overflow-auto">
                        {this.state.error.message}
                      </pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong className="text-red-600 dark:text-red-400">Component Stack:</strong>
                        <pre className="text-sm bg-red-50 dark:bg-red-950 p-2 rounded mt-1 overflow-auto">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-2 justify-center">
                {this.props.enableRetry && this.state.retryCount < this.maxRetries && (
                  <Button onClick={this.handleRetry} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again ({this.maxRetries - this.state.retryCount} left)
                  </Button>
                )}
                <Button onClick={this.handleReload}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
              </div>

              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                <p>If the problem persists, please contact support.</p>
                <p className="mt-1">
                  Error ID: {this.state.error ? 'ERR_' + Date.now() : 'Unknown'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for functional components to handle errors
export const useErrorHandler = () => {
  return (error: Error, context?: any) => {
    errorService.reportError(
      error,
      ErrorSeverity.MEDIUM,
      ErrorCategory.BUSINESS_LOGIC,
      {
        operation: 'functional-component',
        metadata: context,
        timestamp: new Date()
      },
      false
    )
  }
}

// Higher-order component for error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

// Async error boundary for handling promise rejections in components
export class AsyncErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  componentDidMount() {
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection)
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason))

    this.setState({
      hasError: true,
      error,
      errorInfo: null
    })

    errorService.reportError(
      error,
      ErrorSeverity.HIGH,
      ErrorCategory.SYSTEM,
      {
        operation: 'async-error-boundary',
        metadata: { type: 'unhandledRejection' },
        timestamp: new Date()
      },
      false
    )

    // Prevent default browser handling
    event.preventDefault()
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-yellow-600" />
            <span className="text-yellow-800 dark:text-yellow-200">
              An async operation failed. Please try again.
            </span>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}