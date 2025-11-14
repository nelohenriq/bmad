import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  Clock,
  XCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ErrorRecord {
  id: string
  feedId: string
  errorType: 'network' | 'timeout' | 'parsing' | 'rate_limit' | 'auth' | 'other'
  message: string
  timestamp: Date
  resolved: boolean
  retryCount: number
}

export interface FeedErrorHistoryProps {
  feedId: string
  className?: string
}

export function FeedErrorHistory({ feedId, className }: FeedErrorHistoryProps) {
  const [errors, setErrors] = useState<ErrorRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  // Mock data for now - in real implementation, this would come from the database
  useEffect(() => {
    const mockErrors: ErrorRecord[] = [
      {
        id: '1',
        feedId,
        errorType: 'timeout',
        message: 'Request timed out after 10 seconds',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        resolved: true,
        retryCount: 2,
      },
      {
        id: '2',
        feedId,
        errorType: 'parsing',
        message: 'Invalid XML structure in RSS feed',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        resolved: false,
        retryCount: 0,
      },
    ]

    setTimeout(() => {
      setErrors(mockErrors)
      setLoading(false)
    }, 500)
  }, [feedId])

  const getErrorIcon = (errorType: ErrorRecord['errorType']) => {
    switch (errorType) {
      case 'network':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'timeout':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'parsing':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />
      case 'rate_limit':
        return <AlertCircle className="w-4 h-4 text-blue-500" />
      case 'auth':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />
    }
  }

  const getErrorBadgeVariant = (errorType: ErrorRecord['errorType']) => {
    switch (errorType) {
      case 'network':
      case 'auth':
        return 'destructive' as const
      case 'timeout':
      case 'parsing':
        return 'secondary' as const
      case 'rate_limit':
        return 'outline' as const
      default:
        return 'secondary' as const
    }
  }

  const formatErrorType = (errorType: ErrorRecord['errorType']) => {
    return errorType.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const recentErrors = errors.filter((error) => !error.resolved).slice(0, 3)
  const hasMoreErrors =
    errors.length > 3 || errors.some((error) => error.resolved)

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm">Error History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Error History</span>
          {errors.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {errors.filter((e) => !e.resolved).length} active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {errors.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm text-gray-500">No errors recorded</p>
          </div>
        ) : (
          <>
            {(expanded ? errors : recentErrors).map((error) => (
              <div
                key={error.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border',
                  error.resolved
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                )}
              >
                {getErrorIcon(error.errorType)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={getErrorBadgeVariant(error.errorType)}
                      className="text-xs"
                    >
                      {formatErrorType(error.errorType)}
                    </Badge>
                    {error.resolved && (
                      <Badge
                        variant="outline"
                        className="text-xs text-green-600"
                      >
                        Resolved
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{error.message}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{error.timestamp.toLocaleString()}</span>
                    {error.retryCount > 0 && (
                      <span>{error.retryCount} retries</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {hasMoreErrors && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="w-full text-xs"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3 h-3 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 mr-1" />
                    Show {errors.length - recentErrors.length} More
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
