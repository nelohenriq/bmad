import { NextRequest, NextResponse } from 'next/server'
import { trendAnalysisService, TrendConfiguration } from '@/services/analysis/trendAnalysisService'
import { analysisLogger } from '@/services/analysis/analysisLogger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const timeWindow = parseInt(searchParams.get('timeWindow') || '24')
    const category = searchParams.get('category')
    const direction = searchParams.get('direction') as 'rising' | 'stable' | 'declining' | null
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100
    const minScore = parseFloat(searchParams.get('minScore') || '0.1')

    // Build configuration
    const config: Partial<TrendConfiguration> = {
      timeWindowHours: timeWindow
    }

    // Get trending topics
    const trendingTopics = await trendAnalysisService.getTrendingTopics(config, limit)

    // Apply filters
    let filteredTopics = trendingTopics

    if (category) {
      // Note: This would require joining with topic data to filter by category
      // For now, we'll filter after retrieval
      filteredTopics = filteredTopics.filter(topic => {
        // This is a placeholder - in a real implementation, you'd join with topic table
        return true // Remove topics that don't match category
      })
    }

    if (direction) {
      filteredTopics = filteredTopics.filter(topic => topic.current.trendDirection === direction)
    }

    // Apply minimum score filter
    filteredTopics = filteredTopics.filter(topic => topic.current.trendScore >= minScore)

    // Log the request
    await analysisLogger.log({
      feedItemId: 'api',
      operation: 'trend_api_request',
      status: 'success',
      message: `Retrieved ${filteredTopics.length} trending topics`,
      metadata: {
        timeWindow,
        category,
        direction,
        limit,
        minScore,
        resultsCount: filteredTopics.length
      }
    })

    return NextResponse.json({
      topics: filteredTopics,
      metadata: {
        totalCount: filteredTopics.length,
        timeWindow: `${timeWindow}h`,
        filters: {
          category,
          direction,
          minScore
        },
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Trend API error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await analysisLogger.log({
      feedItemId: 'api',
      operation: 'trend_api_error',
      status: 'error',
      message: `Trend API request failed: ${errorMessage}`,
      metadata: { error: errorMessage }
    })

    return NextResponse.json(
      { error: 'Failed to retrieve trending topics' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'update') {
      // Update all trend data
      const config = body.config || {}
      const updatedCount = await trendAnalysisService.updateAllTrends(config)

      await analysisLogger.log({
        feedItemId: 'api',
        operation: 'trend_update_triggered',
        status: 'success',
        message: `Triggered trend update for ${updatedCount} topics`,
        metadata: { updatedCount, config }
      })

      return NextResponse.json({
        success: true,
        updatedCount,
        message: `Updated trends for ${updatedCount} topics`
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Trend API POST error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await analysisLogger.log({
      feedItemId: 'api',
      operation: 'trend_api_post_error',
      status: 'error',
      message: `Trend API POST request failed: ${errorMessage}`,
      metadata: { error: errorMessage }
    })

    return NextResponse.json(
      { error: 'Failed to process trend update request' },
      { status: 500 }
    )
  }
}