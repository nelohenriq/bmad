import React from 'react'

export interface MetricCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease' | 'neutral'
    period: string
  }
  icon?: React.ReactNode
  className?: string
  loading?: boolean
}

export function MetricCard({
  title,
  value,
  change,
  icon,
  className = '',
  loading = false
}: MetricCardProps) {
  const formatChange = (change: MetricCardProps['change']) => {
    if (!change) return null

    const { value, type, period } = change
    const sign = type === 'increase' ? '+' : type === 'decrease' ? '-' : ''
    const colorClass = type === 'increase'
      ? 'text-green-600'
      : type === 'decrease'
      ? 'text-red-600'
      : 'text-gray-600'

    return (
      <div className={`flex items-center text-sm ${colorClass}`}>
        <span className="mr-1">
          {type === 'increase' && '↗'}
          {type === 'decrease' && '↘'}
          {type === 'neutral' && '→'}
        </span>
        <span>{sign}{Math.abs(value)}% {period}</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow-md border ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-gray-200 rounded mr-3"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md border hover:shadow-lg transition-shadow ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          {icon && (
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              {icon}
            </div>
          )}
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        </div>
      </div>

      <div className="mb-2">
        <div className="text-2xl font-bold text-gray-900">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
      </div>

      {change && formatChange(change)}
    </div>
  )
}

// Specialized metric cards for common analytics metrics

export function ContentMetricCard({
  totalContent,
  change,
  className
}: {
  totalContent: number
  change?: MetricCardProps['change']
  className?: string
}) {
  return (
    <MetricCard
      title="Total Content"
      value={totalContent}
      change={change}
      icon={
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      }
      className={className}
    />
  )
}

export function AiUsageMetricCard({
  totalRequests,
  change,
  className
}: {
  totalRequests: number
  change?: MetricCardProps['change']
  className?: string
}) {
  return (
    <MetricCard
      title="AI Requests"
      value={totalRequests}
      change={change}
      icon={
        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      }
      className={className}
    />
  )
}

export function PublishingMetricCard({
  totalPublished,
  successRate,
  className
}: {
  totalPublished: number
  successRate: number
  className?: string
}) {
  return (
    <MetricCard
      title="Publishing Success"
      value={`${successRate.toFixed(1)}%`}
      icon={
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      }
      className={className}
    />
  )
}

export function FeedHealthMetricCard({
  totalFeeds,
  healthScore,
  className
}: {
  totalFeeds: number
  healthScore: number
  className?: string
}) {
  return (
    <MetricCard
      title="Feed Health"
      value={`${healthScore.toFixed(1)}%`}
      icon={
        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      }
      className={className}
    />
  )
}