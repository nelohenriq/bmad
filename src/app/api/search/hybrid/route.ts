import { NextRequest, NextResponse } from 'next/server'
import { hybridSearchService } from '@/services/search/hybridSearchService'
import { z } from 'zod'

const hybridSearchSchema = z.object({
  query: z.string().min(1, 'Query text is required'),
  options: z.object({
    limit: z.number().min(1).max(50).optional(),
    vectorWeight: z.number().min(0).max(1).optional(),
    keywordWeight: z.number().min(0).max(1).optional(),
    scoreThreshold: z.number().min(0).max(1).optional(),
    deduplicationThreshold: z.number().min(0).max(1).optional(),
    includeContentInfo: z.boolean().optional(),
    useCache: z.boolean().optional(),
    cacheTtl: z.number().min(0).optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = hybridSearchSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { query, options = {} } = validationResult.data

    // Validate hybrid search options
    const optionsValidation = hybridSearchService.validateOptions({ query, ...options })
    if (!optionsValidation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid hybrid search options',
          details: optionsValidation.errors
        },
        { status: 400 }
      )
    }

    // Perform hybrid search
    const results = await hybridSearchService.hybridSearch({ query, ...options })

    return NextResponse.json({
      data: results,
      metadata: {
        totalResults: results.length,
        averageHybridScore: results.length > 0 ?
          results.reduce((sum, r) => sum + r.hybridScore, 0) / results.length : 0,
        averageRankImprovement: results.length > 0 ?
          results.reduce((sum, r) => sum + r.rankImprovement, 0) / results.length : 0,
        searchMethods: [...new Set(results.map(r => r.searchMethod))]
      },
      success: true,
      message: `Hybrid search completed with ${results.length} results`
    })

  } catch (error) {
    console.error('Error performing hybrid search:', error)

    return NextResponse.json(
      { error: 'Failed to perform hybrid search', success: false },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'metrics') {
      // Get hybrid search metrics
      const metrics = hybridSearchService.getMetrics()
      return NextResponse.json({
        data: metrics,
        success: true
      })
    } else if (action === 'clear-cache') {
      // Clear query cache
      hybridSearchService.clearCache()
      return NextResponse.json({
        message: 'Cache cleared successfully',
        success: true
      })
    }

    return NextResponse.json(
      { error: 'Invalid action parameter', success: false },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error fetching hybrid search data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hybrid search data', success: false },
      { status: 500 }
    )
  }
}