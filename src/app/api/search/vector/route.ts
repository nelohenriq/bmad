import { NextRequest, NextResponse } from 'next/server'
import { vectorSearchService } from '@/services/search/vectorSearchService'
import { z } from 'zod'

const vectorSearchSchema = z.object({
  embedding: z.array(z.number()).min(1, 'Embedding vector is required'),
  options: z.object({
    limit: z.number().min(1).max(50).optional(),
    scoreThreshold: z.number().min(0).max(1).optional(),
    includeContentInfo: z.boolean().optional(),
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
    const validationResult = vectorSearchSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { embedding, options = {} } = validationResult.data

    // Parse date filters
    const searchOptions = {
      ...options,
      filters: options.filters ? {
        ...options.filters,
        dateFrom: options.filters.dateFrom ? new Date(options.filters.dateFrom) : undefined,
        dateTo: options.filters.dateTo ? new Date(options.filters.dateTo) : undefined
      } : undefined
    }

    // Validate search options
    const optionsValidation = vectorSearchService.validateSearchOptions(searchOptions)
    if (!optionsValidation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid search options',
          details: optionsValidation.errors
        },
        { status: 400 }
      )
    }

    // Perform vector search
    const results = await vectorSearchService.searchByVector(embedding, searchOptions)

    return NextResponse.json({
      data: results,
      success: true,
      message: `Found ${results.length} vector search results`
    })

  } catch (error) {
    console.error('Error performing vector search:', error)

    return NextResponse.json(
      { error: 'Failed to perform vector search', success: false },
      { status: 500 }
    )
  }
}