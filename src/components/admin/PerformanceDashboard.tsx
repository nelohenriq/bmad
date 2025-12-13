'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Clock,
  Activity,
  Download,
  RefreshCw,
  Server,
  Database
} from 'lucide-react'
import { monitoringService, ThroughputMetrics, ResourceMetrics, PerformanceMetric } from '@/services/monitoring/monitoringService'

interface PerformanceSummary {
  totalRequests: number
  averageResponseTime: number
  errorRate: number
  topSlowOperations: Array<{ operation: string; avgTime: number; count: number }>
  recentErrors: PerformanceMetric[]
}

export const PerformanceDashboard: React.FC = () => {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null)
  const [throughput, setThroughput] = useState<ThroughputMetrics | null>(null)
  const [resources, setResources] = useState<ResourceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState<'throughput' | 'operations' | 'resources' | 'errors'>('throughput')

  const loadData = async () => {
    try {
      setLoading(true)
      const [summaryData, throughputData, resourcesData] = await Promise.all([
        monitoringService.getPerformanceSummary(),
        monitoringService.getThroughputMetrics('all', '5m'),
        monitoringService.getCurrentResourceMetrics()
      ])

      setSummary(summaryData)
      setThroughput(throughputData)
      setResources(resourcesData)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleExport = () => {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000) // Last 24 hours

    const csvData = monitoringService.exportMetrics(startDate, endDate, 'csv')

    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-metrics-${endDate.toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getStatusColor = (rate: number) => {
    if (rate < 0.01) return 'text-green-600'
    if (rate < 0.05) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading performance data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Performance Monitoring
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Requests
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {summary?.totalRequests.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Avg Response Time
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {summary ? formatTime(summary.averageResponseTime) : '0ms'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${summary ? getStatusColor(summary.errorRate) : 'text-gray-600'}`} />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Error Rate
                </p>
                <p className={`text-2xl font-bold ${summary ? getStatusColor(summary.errorRate) : 'text-gray-900'}`}>
                  {summary ? `${(summary.errorRate * 100).toFixed(1)}%` : '0%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active Requests
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {resources?.activeRequests || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <Button
            variant={activeTab === 'throughput' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('throughput')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Throughput
          </Button>
          <Button
            variant={activeTab === 'operations' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('operations')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Operations
          </Button>
          <Button
            variant={activeTab === 'resources' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('resources')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600"
          >
            <Database className="w-4 h-4 mr-2" />
            Resources
          </Button>
          <Button
            variant={activeTab === 'errors' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('errors')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Errors
          </Button>
        </div>

        {/* Throughput Tab */}
        {activeTab === 'throughput' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Throughput Metrics (Last 5 minutes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {throughput ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {throughput.requestCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Total Requests
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatTime(throughput.averageResponseTime)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Avg Response Time
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatTime(throughput.p95ResponseTime)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      95th Percentile
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className={`text-2xl font-bold ${getStatusColor(throughput.errorRate)}`}>
                      {(throughput.errorRate * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Error Rate
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No throughput data available
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Operations Tab */}
        {activeTab === 'operations' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Slowest Operations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary?.topSlowOperations.length ? (
                <div className="space-y-3">
                  {summary.topSlowOperations.map((op, index) => (
                    <div key={op.operation} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {op.operation}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {formatTime(op.avgTime)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {op.count} requests
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No operation data available
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Resource Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resources ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {resources.cpuUsage.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      CPU Usage
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {resources.memoryUsage.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Memory Usage
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {resources.databaseConnections}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      DB Connections
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {resources.vectorOperations}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Vector Ops
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No resource data available
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Errors Tab */}
        {activeTab === 'errors' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Recent Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary?.recentErrors.length ? (
                <div className="space-y-3">
                  {summary.recentErrors.map((error) => (
                    <div key={error.id || error.timestamp.getTime()} className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            {error.operation}
                          </Badge>
                          {error.errorType && (
                            <Badge variant="outline" className="text-xs">
                              {error.errorType}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {error.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm text-red-800 dark:text-red-200">
                        Duration: {formatTime(error.duration)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent errors
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}