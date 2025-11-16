import React, { useState, useEffect } from 'react'
import { ChartComponent, ChartData } from './ChartComponent'
import {
  MetricCard,
  ContentMetricCard,
  AiUsageMetricCard,
  PublishingMetricCard,
  FeedHealthMetricCard
} from './MetricCard'
import { TimeRangeSelector, TimeRange } from './TimeRangeSelector'
import { ExportButton } from './ExportDialog'

interface DashboardData {
  contentCreation: {
    totalContent: number
    contentByDate: Array<{ date: string; count: number }>
    averageLength: number
    topTopics: Array<{ topic: string; count: number }>
    contentTypes: Array<{ type: string; count: number }>
  }
  rssMonitoring: {
    totalFeeds: number
    monitoringFrequency: number
    successRate: number
    newContentDiscovered: number
    feedHealth: Array<{ feed: string; health: number }>
  }
  aiUsage: {
    totalRequests: number
    averageResponseTime: number
    successRate: number
    modelUsage: Array<{ model: string; count: number }>
    tokenUsage: number
  }
  publishing: {
    totalPublished: number
    successRate: number
    averagePublishTime: number
    platformPerformance: Array<{ platform: string; successRate: number; avgTime: number }>
    publishingTrends: Array<{ date: string; count: number }>
  }
}

interface AnalyticsDashboardProps {
  userId: string
  className?: string
}

export function AnalyticsDashboard({ userId, className = '' }: AnalyticsDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('month')
  const [customStartDate, setCustomStartDate] = useState<Date>()
  const [customEndDate, setCustomEndDate] = useState<Date>()

  useEffect(() => {
    loadDashboardData()
  }, [userId, timeRange, customStartDate, customEndDate])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.append('userId', userId)

      if (timeRange === 'custom' && customStartDate && customEndDate) {
        params.append('startDate', customStartDate.toISOString())
        params.append('endDate', customEndDate.toISOString())
      } else if (timeRange !== 'custom') {
        params.append('timeRange', timeRange)
      }

      const response = await fetch(`/api/analytics/dashboard?${params}`)

      if (!response.ok) {
        throw new Error('Failed to load analytics data')
      }

      const data = await response.json()
      setDashboardData(data.dashboard)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/analytics/export?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-data-${userId}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      throw new Error('Failed to export analytics data')
    }
  }

  const prepareChartData = (
    data: Array<{ date: string; count: number }>,
    label: string
  ): ChartData => ({
    labels: data.map(item => {
      const date = new Date(item.date)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }),
    datasets: [{
      label,
      data: data.map(item => item.count),
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 2
    }]
  })

  const preparePieChartData = (
    data: Array<{ [key: string]: string | number }>,
    labelKey: string,
    valueKey: string,
    label: string
  ): ChartData => ({
    labels: data.map(item => String(item[labelKey])),
    datasets: [{
      label,
      data: data.map(item => Number(item[valueKey])),
      backgroundColor: [
        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
      ]
    }]
  })

  if (loading) {
    return (
      <div className={`analytics-dashboard ${className}`}>
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-lg text-gray-600">Loading analytics...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`analytics-dashboard ${className}`}>
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-medium">Failed to load analytics</h3>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className={`analytics-dashboard ${className}`}>
        <div className="text-center py-12">
          <p className="text-gray-500">No analytics data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`analytics-dashboard space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Insights into your content creation workflow</p>
        </div>
        <ExportButton onExport={handleExport} userId={userId} />
      </div>

      {/* Time Range Selector */}
      <div className="bg-white p-4 rounded-lg shadow">
        <TimeRangeSelector
          selectedRange={timeRange}
          onRangeChange={setTimeRange}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onCustomDatesChange={(start, end) => {
            setCustomStartDate(start)
            setCustomEndDate(end)
          }}
        />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ContentMetricCard
          totalContent={dashboardData.contentCreation.totalContent}
          change={{ value: 12, type: 'increase', period: 'vs last month' }}
        />
        <AiUsageMetricCard
          totalRequests={dashboardData.aiUsage.totalRequests}
          change={{ value: 8, type: 'increase', period: 'vs last month' }}
        />
        <PublishingMetricCard
          totalPublished={dashboardData.publishing.totalPublished}
          successRate={dashboardData.publishing.successRate}
        />
        <FeedHealthMetricCard
          totalFeeds={dashboardData.rssMonitoring.totalFeeds}
          healthScore={dashboardData.rssMonitoring.successRate}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content Creation Trends */}
        <div className="bg-white p-6 rounded-lg shadow">
          <ChartComponent
            type="line"
            data={prepareChartData(
              dashboardData.contentCreation.contentByDate,
              'Content Created'
            )}
            title="Content Creation Trends"
            height={300}
          />
        </div>

        {/* Publishing Trends */}
        <div className="bg-white p-6 rounded-lg shadow">
          <ChartComponent
            type="bar"
            data={prepareChartData(
              dashboardData.publishing.publishingTrends,
              'Published Content'
            )}
            title="Publishing Activity"
            height={300}
          />
        </div>

        {/* AI Model Usage */}
        <div className="bg-white p-6 rounded-lg shadow">
          <ChartComponent
            type="pie"
            data={preparePieChartData(
              dashboardData.aiUsage.modelUsage,
              'model',
              'count',
              'AI Model Usage'
            )}
            title="AI Model Distribution"
            height={300}
          />
        </div>

        {/* Platform Performance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <ChartComponent
            type="doughnut"
            data={preparePieChartData(
              dashboardData.publishing.platformPerformance,
              'platform',
              'successRate',
              'Platform Success Rates'
            )}
            title="Publishing Platform Performance"
            height={300}
          />
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content Types */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Content Types</h3>
          <div className="space-y-3">
            {dashboardData.contentCreation.contentTypes.map((type, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{type.type}</span>
                <span className="font-medium">{type.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Topics */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top Topics</h3>
          <div className="space-y-3">
            {dashboardData.contentCreation.topTopics.slice(0, 5).map((topic, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-600 truncate">{topic.topic}</span>
                <span className="font-medium">{topic.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feed Health */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Feed Health</h3>
          <div className="space-y-3">
            {dashboardData.rssMonitoring.feedHealth.slice(0, 5).map((feed, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-600 truncate">{feed.feed}</span>
                <div className="flex items-center">
                  <div className="w-16 h-2 bg-gray-200 rounded mr-2">
                    <div
                      className="h-2 bg-green-500 rounded"
                      style={{ width: `${feed.health}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{feed.health}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-800">Privacy & Data</h4>
            <p className="text-sm text-blue-700 mt-1">
              All analytics data is stored locally and never shared with external services.
              You can export or delete your data at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}