import { NextRequest, NextResponse } from 'next/server'
import { trendAnalysisService } from '@/services/analysis/trendAnalysisService'
import { analysisLogger } from '@/services/analysis/analysisLogger'

export async function GET(request: NextRequest, context: any) {
  try {
    const { topicId } = context.params
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const timeWindow = parseInt(searchParams.get('timeWindow') || '168') // 7 days default

    // Get detailed trend analysis for the topic
    const trendAnalysis = await trendAnalysisService.getTopicTrendAnalysis(topicId, timeWindow)

    if (!trendAnalysis) {
      return NextResponse.json(
        { error: 'Topic not found or no trend data available' },
        { status: 404 }
      )
    }

    // Log the request
    await analysisLogger.log({
      feedItemId: topicId,
      operation: 'topic_trend_api_request',
      status: 'success',
      message: `Retrieved trend analysis for topic ${topicId}`,
      metadata: {
        timeWindow,
        dataPoints: trendAnalysis.history.length,
        trendDirection: trendAnalysis.current.trendDirection,
        trendScore: trendAnalysis.current.trendScore
      }
    })

    return NextResponse.json({
      topic: {
        id: trendAnalysis.topicId,
        name: trendAnalysis.topicName,
        current: trendAnalysis.current,
        history: trendAnalysis.history,
        summary: trendAnalysis.summary
      },
      metadata: {
        timeWindow: `${timeWindow}h`,
        dataPoints: trendAnalysis.history.length,
        lastUpdated: trendAnalysis.current.timestamp.toISOString()
      }
    })

  } catch (error) {
    console.error('Topic trend API error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await analysisLogger.log({
      feedItemId: context.params.topicId,
      operation: 'topic_trend_api_error',
      status: 'error',
      message: `Topic trend API request failed: ${errorMessage}`,
      metadata: { error: errorMessage }
    })

    return NextResponse.json(
      { error: 'Failed to retrieve topic trend data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, context: any) {
  try {
    const { topicId } = context.params
    const body = await request.json()
    const { action, config } = body

    if (action === 'calculate') {
      // Recalculate trend for this specific topic
      const trendMetrics = await trendAnalysisService.calculateTopicTrend(topicId, config || {})

      if (!trendMetrics) {
        return NextResponse.json(
          { error: 'Failed to calculate trend - insufficient data' },
          { status: 400 }
        )
      }

      await analysisLogger.log({
        feedItemId: topicId,
        operation: 'topic_trend_recalculation',
        status: 'success',
        message: `Recalculated trend for topic ${topicId}: ${trendMetrics.trendDirection}`,
        metadata: {
          trendDirection: trendMetrics.trendDirection,
          trendScore: trendMetrics.trendScore,
          velocity: trendMetrics.velocity,
          momentum: trendMetrics.momentum
        }
      })

      return NextResponse.json({
        success: true,
        trend: trendMetrics,
        message: `Trend recalculated for topic ${topicId}`
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Topic trend API POST error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await analysisLogger.log({
      feedItemId: context.params.topicId,
      operation: 'topic_trend_api_post_error',
      status: 'error',
      message: `Topic trend API POST request failed: ${errorMessage}`,
      metadata: { error: errorMessage }
    })

    return NextResponse.json(
      { error: 'Failed to process topic trend request' },
      { status: 500 }
    )
  }
}
