import { NextRequest, NextResponse } from 'next/server'
import { retrievalService } from '@/services/retrieval/retrievalService'
import { z } from 'zod'

const hybridSearchSchema = z.object({
  query: z.string().min(1, 'Query text is required'),
  options: z.object({
    limit: z.number().min(1).max(50).optional(),
    scoreThreshold: z.number().min(0).max(1).optional(),
    includeContentInfo: z.boolean().optional(),
    vectorWeight: z.number().min(0).max(1).optional(),
    keywordWeight: z.number().min(0).max(1).optional(),
    useCache: z.boolean().optional(),
    cacheTtl: z.number().min(0).optional(),
    filters: z.object({
      contentId: z.string().optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
      wordCountMin: z.number().min(0).optional(),
      wordCountMax: z.number().max(10000).optional()
    }).optional()
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

    // Parse date filters
    const searchOptions = {
      query,
      ...options,
      filters: options.filters ? {
        ...options.filters,
        dateFrom: options.filters.dateFrom ? new Date(options.filters.dateFrom) : undefined,
        dateTo: options.filters.dateTo ? new Date(options.filters.dateTo) : undefined
      } : undefined
    }


    // Perform hybrid search
    const results = await retrievalService.hybridSearch(searchOptions)

    return NextResponse.json({
      data: results,
      success: true,
      message: `Found ${results.length} hybrid search results for "${query}"`
    })

  } catch (error) {
    console.error('Error performing hybrid search:', error)

    return NextResponse.json(
      { error: 'Failed to perform hybrid search', success: false },
      { status: 500 }
    )
  }
}