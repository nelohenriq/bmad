import { NextRequest, NextResponse } from 'next/server'
import { retrievalService } from '@/services/retrieval/retrievalService'
import { advancedFilteringService } from '@/services/search/advancedFilteringService'
import { z } from 'zod'

const advancedSearchSchema = z.object({
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
      wordCountMax: z.number().max(10000).optional(),
      charCountMin: z.number().min(0).optional(),
      charCountMax: z.number().max(100000).optional(),
      chunkIndexMin: z.number().min(0).optional(),
      chunkIndexMax: z.number().max(1000).optional(),
      model: z.string().optional(),
      scoreMin: z.number().min(0).max(1).optional(),
      scoreMax: z.number().min(0).max(1).optional(),
      contentType: z.array(z.string()).optional(),
      source: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional()
    }).optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = advancedSearchSchema.safeParse(body)
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

    // Validate filter criteria
    if (searchOptions.filters) {
      const filterValidation = advancedFilteringService.validateCriteria(searchOptions.filters)
      if (!filterValidation.valid) {
        return NextResponse.json(
          {
            error: 'Invalid filter criteria',
            details: filterValidation.errors
          },
          { status: 400 }
        )
      }
    }

    // Perform hybrid search
    const results = await retrievalService.hybridSearch(searchOptions)

    // Apply advanced filters if specified
    let filteredResults = results
    if (searchOptions.filters) {
      filteredResults = advancedFilteringService.applyFilters(results, searchOptions.filters)
    }

    return NextResponse.json({
      data: filteredResults,
      metadata: {
        totalResults: results.length,
        filteredResults: filteredResults.length,
        appliedFilters: searchOptions.filters ? Object.keys(searchOptions.filters).filter(key =>
          (searchOptions.filters as any)[key] !== undefined
        ) : []
      },
      success: true,
      message: `Found ${filteredResults.length} results after applying ${searchOptions.filters ? Object.keys(searchOptions.filters).length : 0} filters`
    })

  } catch (error) {
    console.error('Error performing advanced search:', error)

    return NextResponse.json(
      { error: 'Failed to perform advanced search', success: false },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'presets') {
      // Get filter presets
      const presets = advancedFilteringService.getPresets()
      return NextResponse.json({
        data: presets,
        success: true
      })
    } else if (action === 'stats') {
      // Get filter statistics
      const stats = advancedFilteringService.getFilterStats()
      return NextResponse.json({
        data: stats,
        success: true
      })
    }

    return NextResponse.json(
      { error: 'Invalid action parameter', success: false },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error fetching advanced search data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch advanced search data', success: false },
      { status: 500 }
    )
  }
}