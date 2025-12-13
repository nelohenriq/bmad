'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Users,
  Target,
  Lightbulb,
  RefreshCw,
  Download
} from 'lucide-react'
import { qualityService, QualityTrend, ABTestSummary } from '@/services/quality/qualityService'

interface QualityMetrics {
  retrievalAccuracy: {
    precision: number
    recall: number
    f1Score: number
    meanReciprocalRank: number
    normalizedDiscountedCumulativeGain: number
  }
  generationQuality: {
    relevance: number
    coherence: number
    factualAccuracy: number
    readability: number
    overallScore: number
  }
  userSatisfaction: {
    averageRating: number
    totalFeedback: number
    recentTrend: 'improving' | 'declining' | 'stable'
  }
}

export const QualityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null)
  const [trends, setTrends] = useState<{
    retrieval: QualityTrend
    generation: QualityTrend
    satisfaction: QualityTrend
  } | null>(null)
  const [abTests, setAbTests] = useState<ABTestSummary[]>([])
  const [insights, setInsights] = useState<{
    insights: string[]
    recommendations: string[]
    alerts: Array<{ level: 'warning' | 'critical'; message: string }>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const loadData = async () => {
    try {
      setLoading(true)

      // Load quality metrics (mock data for now)
      const mockMetrics: QualityMetrics = {
        retrievalAccuracy: {
          precision: 0.85,
          recall: 0.78,
          f1Score: 0.81,
          meanReciprocalRank: 0.72,
          normalizedDiscountedCumulativeGain: 0.89
        },
        generationQuality: {
          relevance: 0.82,
          coherence: 0.76,
          factualAccuracy: 0.88,
          readability: 0.71,
          overallScore: 0.79
        },
        userSatisfaction: {
          averageRating: 4.2,
          totalFeedback: 156,
          recentTrend: 'improving'
        }
      }

      // Load trends
      const [retrievalTrend, generationTrend, satisfactionTrend] = await Promise.all([
        qualityService.getQualityTrends('retrieval_accuracy', 'day', 7),
        qualityService.getQualityTrends('generation_quality', 'day', 7),
        qualityService.getQualityTrends('user_satisfaction', 'day', 7)
      ])

      // Load insights
      const qualityInsights = await qualityService.getQualityInsights()

      setMetrics(mockMetrics)
      setTrends({
        retrieval: retrievalTrend,
        generation: generationTrend,
        satisfaction: satisfactionTrend
      })
      setInsights(qualityInsights)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to load quality data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    // Auto-refresh every 5 minutes
    const interval = setInterval(loadData, 300000)
    return () => clearInterval(interval)
  }, [])

  const handleExport = () => {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days

    // In a real implementation, this would export quality metrics
    const csvData = `timestamp,metric_type,score\n${endDate.toISOString()},quality_summary,${metrics?.generationQuality.overallScore || 0}`

    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quality-metrics-${endDate.toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`
  const formatRating = (rating: number) => `${rating.toFixed(1)}/5`

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      default:
        return <Minus className="w-4 h-4 text-gray-600" />
    }
  }

  const getTrendColor = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return 'text-green-600'
      case 'declining':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading quality metrics...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Quality Monitoring
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

      {/* Quality Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Retrieval Accuracy
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {metrics ? formatPercentage(metrics.retrievalAccuracy.f1Score) : '0%'}
                </p>
                {trends?.retrieval && (
                  <div className={`flex items-center gap-1 text-xs ${getTrendColor(trends.retrieval.trendDirection)}`}>
                    {getTrendIcon(trends.retrieval.trendDirection)}
                    <span className="capitalize">{trends.retrieval.trendDirection}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Generation Quality
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {metrics ? formatPercentage(metrics.generationQuality.overallScore) : '0%'}
                </p>
                {trends?.generation && (
                  <div className={`flex items-center gap-1 text-xs ${getTrendColor(trends.generation.trendDirection)}`}>
                    {getTrendIcon(trends.generation.trendDirection)}
                    <span className="capitalize">{trends.generation.trendDirection}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  User Satisfaction
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {metrics ? formatRating(metrics.userSatisfaction.averageRating) : '0/5'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {metrics?.userSatisfaction.totalFeedback || 0} responses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Detailed Metrics</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="ab-testing">A/B Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Retrieval Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Retrieval Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics && (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Precision</span>
                      <span className="font-medium">{formatPercentage(metrics.retrievalAccuracy.precision)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Recall</span>
                      <span className="font-medium">{formatPercentage(metrics.retrievalAccuracy.recall)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">F1 Score</span>
                      <span className="font-medium">{formatPercentage(metrics.retrievalAccuracy.f1Score)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">MRR</span>
                      <span className="font-medium">{formatPercentage(metrics.retrievalAccuracy.meanReciprocalRank)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">NDCG</span>
                      <span className="font-medium">{formatPercentage(metrics.retrievalAccuracy.normalizedDiscountedCumulativeGain)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generation Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Generation Quality</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics && (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Relevance</span>
                      <span className="font-medium">{formatPercentage(metrics.generationQuality.relevance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Coherence</span>
                      <span className="font-medium">{formatPercentage(metrics.generationQuality.coherence)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Factual Accuracy</span>
                      <span className="font-medium">{formatPercentage(metrics.generationQuality.factualAccuracy)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Readability</span>
                      <span className="font-medium">{formatPercentage(metrics.generationQuality.readability)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-sm font-medium text-gray-900">Overall Score</span>
                      <span className="font-bold text-lg">{formatPercentage(metrics.generationQuality.overallScore)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Trends (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {trends && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Retrieval Accuracy</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatPercentage(trends.retrieval.averageScore)}</span>
                      {getTrendIcon(trends.retrieval.trendDirection)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Generation Quality</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatPercentage(trends.generation.averageScore)}</span>
                      {getTrendIcon(trends.generation.trendDirection)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-purple-600" />
                      <span className="font-medium">User Satisfaction</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatRating(trends.satisfaction.averageScore * 5)}</span>
                      {getTrendIcon(trends.satisfaction.trendDirection)}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {insights && (
            <>
              {/* Alerts */}
              {insights.alerts.length > 0 && (
                <Card className="border-red-200 bg-red-50 dark:bg-red-950">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
                      <AlertTriangle className="w-5 h-5" />
                      Quality Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {insights.alerts.map((alert, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 text-red-600" />
                          <span className="text-sm text-red-800 dark:text-red-200">{alert.message}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {insights.insights.map((insight, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
                        <span className="text-sm">{insight}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {insights.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 mt-0.5 text-blue-600" />
                        <span className="text-sm">{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="ab-testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>A/B Testing</CardTitle>
            </CardHeader>
            <CardContent>
              {abTests.length > 0 ? (
                <div className="space-y-4">
                  {abTests.map((test) => (
                    <div key={test.testId} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">{test.name}</h3>
                        <Badge variant={test.status === 'active' ? 'default' : 'secondary'}>
                          {test.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="text-lg font-bold">{formatPercentage(test.variantA.metrics.averageScore)}</div>
                          <div className="text-sm text-gray-600">Variant A</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="text-lg font-bold">{formatPercentage(test.variantB.metrics.averageScore)}</div>
                          <div className="text-sm text-gray-600">Variant B</div>
                        </div>
                      </div>
                      {test.winner && (
                        <div className="mt-3 text-center">
                          <Badge variant="outline" className="text-green-600">
                            Winner: {test.winner}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No active A/B tests
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}