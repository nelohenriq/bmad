import React from 'react'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type FeedStatus =
  | 'success'
  | 'error'
  | 'timeout'
  | 'parsing_error'
  | null

export interface FeedStatusIndicatorProps {
  status: FeedStatus
  healthScore: number // 0-1
  isActive: boolean
  lastFetched?: Date | null
  retryCount?: number
  className?: string
  showDetails?: boolean
}

export function FeedStatusIndicator({
  status,
  healthScore,
  isActive,
  lastFetched,
  retryCount = 0,
  className,
  showDetails = false,
}: FeedStatusIndicatorProps) {
  const getStatusConfig = () => {
    if (!isActive) {
      return {
        icon: WifiOff,
        label: 'Inactive',
        variant: 'secondary' as const,
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
      }
    }

    if (!lastFetched) {
      return {
        icon: Clock,
        label: 'Never fetched',
        variant: 'outline' as const,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      }
    }

    switch (status) {
      case 'success':
        if (healthScore >= 0.8) {
          return {
            icon: CheckCircle,
            label: 'Healthy',
            variant: 'default' as const,
            color: 'text-green-700',
            bgColor: 'bg-green-50',
          }
        } else if (healthScore >= 0.5) {
          return {
            icon: AlertTriangle,
            label: 'Fair',
            variant: 'secondary' as const,
            color: 'text-yellow-700',
            bgColor: 'bg-yellow-50',
          }
        } else {
          return {
            icon: AlertTriangle,
            label: 'Unhealthy',
            variant: 'destructive' as const,
            color: 'text-red-700',
            bgColor: 'bg-red-50',
          }
        }

      case 'error':
      case 'timeout':
      case 'parsing_error':
        return {
          icon: XCircle,
          label:
            status === 'timeout'
              ? 'Timeout'
              : status === 'parsing_error'
                ? 'Parse Error'
                : 'Error',
          variant: 'destructive' as const,
          color: 'text-red-700',
          bgColor: 'bg-red-50',
        }

      default:
        return {
          icon: RefreshCw,
          label: 'Unknown',
          variant: 'outline' as const,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  const getTooltipText = () => {
    if (!isActive) return 'Feed is deactivated'
    if (!lastFetched) return 'Feed has never been fetched'

    let text = `Status: ${config.label}`
    if (lastFetched) {
      text += `\nLast fetched: ${lastFetched.toLocaleString()}`
    }
    if (healthScore !== undefined) {
      text += `\nHealth score: ${Math.round(healthScore * 100)}%`
    }
    if (retryCount && retryCount > 0) {
      text += `\nRetry attempts: ${retryCount}`
    }
    return text
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
          config.bgColor,
          config.color
        )}
        title={getTooltipText()}
      >
        <Icon className="w-3 h-3" />
        <span>{config.label}</span>
        {retryCount && retryCount > 0 && (
          <Badge variant="outline" className="ml-1 px-1 py-0 text-xs">
            {retryCount}
          </Badge>
        )}
      </div>

      {showDetails && healthScore !== undefined && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300',
                healthScore >= 0.8
                  ? 'bg-green-500'
                  : healthScore >= 0.5
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              )}
              style={{ width: `${healthScore * 100}%` }}
            />
          </div>
          <span>{Math.round(healthScore * 100)}%</span>
        </div>
      )}
    </div>
  )
}

export function FeedStatusBadge({
  status,
  healthScore,
  isActive,
  lastFetched,
  retryCount,
  className,
}: FeedStatusIndicatorProps) {
  const getStatusConfig = () => {
    if (!isActive) {
      return {
        label: 'Inactive',
        variant: 'secondary' as const,
      }
    }

    if (!lastFetched) {
      return {
        label: 'Not Fetched',
        variant: 'outline' as const,
      }
    }

    switch (status) {
      case 'success':
        if (healthScore >= 0.8) {
          return { label: 'Healthy', variant: 'default' as const }
        } else if (healthScore >= 0.5) {
          return { label: 'Fair', variant: 'secondary' as const }
        } else {
          return { label: 'Unhealthy', variant: 'destructive' as const }
        }

      case 'error':
      case 'timeout':
      case 'parsing_error':
        return { label: 'Error', variant: 'destructive' as const }

      default:
        return { label: 'Unknown', variant: 'outline' as const }
    }
  }

  const config = getStatusConfig()

  return (
    <Badge
      variant={config.variant}
      className={cn('text-xs', className)}
      title={`Health: ${Math.round((healthScore || 0) * 100)}%`}
    >
      {config.label}
    </Badge>
  )
}
