import { NextRequest, NextResponse } from 'next/server'
import { contextAssemblyService } from '@/services/context/contextAssemblyService'
import { z } from 'zod'

const assembleContextSchema = z.object({
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
  })),
  options: z.object({
    maxTokens: z.number().min(100).max(8000).optional(),
    maxChunks: z.number().min(1).max(50).optional(),
    minScore: z.number().min(0).max(1).optional(),
    prioritizeDiversity: z.boolean().optional(),
    deduplicationThreshold: z.number().min(0).max(1).optional(),
    strategy: z.enum(['relevance', 'diversity', 'balanced']).optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = assembleContextSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { results, options = {} } = validationResult.data

    // Validate assembly options
    const optionsValidation = contextAssemblyService.validateOptions(options)
    if (!optionsValidation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid assembly options',
          details: optionsValidation.errors
        },
        { status: 400 }
      )
    }

    // Assemble context
    const assembledContext = await contextAssemblyService.assembleContext(results, options)

    return NextResponse.json({
      data: assembledContext,
      success: true,
      message: `Assembled context with ${assembledContext.chunks.length} chunks (${assembledContext.metadata.estimatedTokens} estimated tokens)`
    })

  } catch (error) {
    console.error('Error assembling context:', error)

    return NextResponse.json(
      { error: 'Failed to assemble context', success: false },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return service capabilities
    const capabilities = {
      supportedStrategies: ['relevance', 'diversity', 'balanced'],
      defaultMaxTokens: 4000,
      defaultMaxChunks: 20,
      defaultMinScore: 0.1,
      supportedOptions: [
        'maxTokens',
        'maxChunks',
        'minScore',
        'prioritizeDiversity',
        'deduplicationThreshold',
        'strategy'
      ]
    }

    return NextResponse.json({
      data: capabilities,
      success: true
    })

  } catch (error) {
    console.error('Error fetching context assembly capabilities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch capabilities', success: false },
      { status: 500 }
    )
  }
}