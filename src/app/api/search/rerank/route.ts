import { NextRequest, NextResponse } from 'next/server'
import { crossEncoderRerankingService } from '@/services/search/crossEncoderRerankingService'
import { z } from 'zod'

const rerankRequestSchema = z.object({
  query: z.string().min(1, 'Query text is required'),
  results: z.array(z.object({
    chunkId: z.string(),
    contentId: z.string(),
    text: z.string(),
    score: z.number(),
    metadata: z.object({
      model: z.string(),
      generatedAt: z.string(),
      chunkIndex: z.number(),
      wordCount: z.number(),
      charCount: z.number()
    }),
    contentInfo: z.object({
      title: z.string(),
      source: z.string(),
      publishedAt: z.string().optional()
    }).optional()
  })).min(1, 'At least one result is required'),
  options: z.object({
    model: z.string().optional(),
    batchSize: z.number().min(1).max(32).optional(),
    scoreThreshold: z.number().min(0).max(1).optional(),
    fallbackToOriginal: z.boolean().optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = rerankRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { query, results, options = {} } = validationResult.data

    // Validate reranking options
    const optionsValidation = crossEncoderRerankingService.validateOptions(options)
    if (!optionsValidation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid reranking options',
          details: optionsValidation.errors
        },
        { status: 400 }
      )
    }

    // Perform reranking
    const rerankedResults = await crossEncoderRerankingService.rerankResults(query, results, options)

    return NextResponse.json({
      data: rerankedResults,
      success: true,
      message: `Reranked ${rerankedResults.length} results using cross-encoder`
    })

  } catch (error) {
    console.error('Error performing reranking:', error)

    return NextResponse.json(
      { error: 'Failed to perform reranking', success: false },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get reranking service statistics
    const stats = crossEncoderRerankingService.getStats()

    return NextResponse.json({
      data: stats,
      success: true
    })

  } catch (error) {
    console.error('Error fetching reranking stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reranking statistics', success: false },
      { status: 500 }
    )
  }
}