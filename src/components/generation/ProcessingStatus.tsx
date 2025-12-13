import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Wand2, CheckCircle, XCircle, AlertTriangle, X, Clock, BarChart3 } from 'lucide-react'

interface ProcessingMetrics {
  duration: number
  chunksRetrieved: number
  tokensGenerated: number
  apiCalls: number
}

interface ProcessingStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'completed' | 'error'
  duration?: number
  message?: string
}

interface ProcessingStatusProps {
  jobId?: string
  phase?: 'retrieval' | 'generation' | 'complete' | 'error' | 'timeout'
  progress?: number // 0-100
  message?: string
  error?: string | null
  metrics?: ProcessingMetrics
  startTime?: Date
  onCancel?: () => void
  timeoutMs?: number
  steps?: ProcessingStep[]
  currentStep?: string
}

const getPhaseIcon = (phase: string) => {
  switch (phase) {
    case 'retrieval':
      return <Search className="w-4 h-4" />
    case 'generation':
      return <Wand2 className="w-4 h-4" />
    case 'complete':
      return <CheckCircle className="w-4 h-4" />
    case 'error':
      return <XCircle className="w-4 h-4" />
    case 'timeout':
      return <Clock className="w-4 h-4" />
    default:
      return <Loader2 className="w-4 h-4 animate-spin" />
  }
}

const getStepIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-3 h-3 text-green-600" />
    case 'active':
      return <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
    case 'error':
      return <XCircle className="w-3 h-3 text-red-600" />
    default:
      return <Clock className="w-3 h-3 text-gray-400" />
  }
}

const getStepColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'text-green-700 dark:text-green-300'
    case 'active':
      return 'text-blue-700 dark:text-blue-300'
    case 'error':
      return 'text-red-700 dark:text-red-300'
    default:
      return 'text-gray-500 dark:text-gray-400'
  }
}

const getPhaseColor = (phase: string) => {
  switch (phase) {
    case 'complete':
      return 'text-green-600 dark:text-green-400'
    case 'error':
    case 'timeout':
      return 'text-red-600 dark:text-red-400'
    case 'retrieval':
    case 'generation':
      return 'text-blue-600 dark:text-blue-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}

const getCardStyling = (phase: string) => {
  switch (phase) {
    case 'complete':
      return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950'
    case 'error':
    case 'timeout':
      return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950'
    default:
      return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950'
  }
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  jobId,
  phase = 'retrieval',
  progress = 0,
  message = 'Processing...',
  error = null,
  metrics,
  startTime,
  onCancel,
  timeoutMs = 30000, // 30 seconds default timeout
  steps = [],
  currentStep
}) => {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isTimeout, setIsTimeout] = useState(false)

  // Track elapsed time
  useEffect(() => {
    if (!startTime || phase === 'complete' || phase === 'error') return

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime.getTime())
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, phase])

  // Handle timeout
  useEffect(() => {
    if (!startTime || phase === 'complete' || phase === 'error') return

    const timeout = setTimeout(() => {
      setIsTimeout(true)
    }, timeoutMs)

    return () => clearTimeout(timeout)
  }, [startTime, phase, timeoutMs])

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`
  }

  const currentPhase = isTimeout ? 'timeout' : phase
  const displayMessage = isTimeout
    ? `Processing timed out after ${formatTime(timeoutMs)}`
    : error || message

  if (!jobId && !message) return null

  return (
    <Card className={getCardStyling(currentPhase)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <div className={getPhaseColor(currentPhase)}>
              {getPhaseIcon(currentPhase)}
            </div>
            <span>RAG Processing Status</span>
            {jobId && (
              <Badge variant="outline" className="text-xs">
                Job {jobId.slice(-8)}
              </Badge>
            )}
          </div>
          {onCancel && currentPhase !== 'complete' && currentPhase !== 'error' && !isTimeout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
              aria-label="Cancel processing"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Status */}
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            {displayMessage}
          </p>

          {/* Progress Bar */}
          {currentPhase !== 'complete' && currentPhase !== 'error' && !isTimeout && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(progress, 5)}%` }}
              />
            </div>
          )}
        </div>

        {/* Processing Steps */}
        {steps.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Processing Steps</h4>
            <div className="space-y-1">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-2 text-xs">
                  <div className="flex-shrink-0">
                    {getStepIcon(step.status)}
                  </div>
                  <span className={`flex-1 ${getStepColor(step.status)}`}>
                    {step.label}
                    {step.message && (
                      <span className="ml-2 text-gray-500 dark:text-gray-400">
                        {step.message}
                      </span>
                    )}
                  </span>
                  {step.duration && (
                    <span className="text-gray-500 dark:text-gray-400">
                      {formatTime(step.duration)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Details */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-100 dark:bg-red-900 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-800 dark:text-red-200">
              <p className="font-medium">Processing Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <div className="text-xs">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {metrics.chunksRetrieved} chunks
                </div>
                <div className="text-gray-600 dark:text-gray-400">retrieved</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <div className="text-xs">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {formatTime(metrics.duration)}
                </div>
                <div className="text-gray-600 dark:text-gray-400">duration</div>
              </div>
            </div>
            {metrics.tokensGenerated > 0 && (
              <>
                <div className="text-xs">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {metrics.tokensGenerated.toLocaleString()}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">tokens generated</div>
                </div>
                <div className="text-xs">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {metrics.apiCalls}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">API calls</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Time Tracking */}
        {startTime && currentPhase !== 'complete' && currentPhase !== 'error' && (
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Elapsed: {formatTime(elapsedTime)}</span>
            <span>Timeout: {formatTime(timeoutMs)}</span>
          </div>
        )}

        {/* Success Summary */}
        {currentPhase === 'complete' && metrics && (
          <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Processing Complete
              </span>
            </div>
            <div className="text-xs text-green-700 dark:text-green-300 space-y-1">
              <div>Retrieved {metrics.chunksRetrieved} relevant chunks</div>
              <div>Generated {metrics.tokensGenerated.toLocaleString()} tokens</div>
              <div>Completed in {formatTime(metrics.duration)}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}