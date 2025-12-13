import { NextRequest, NextResponse } from 'next/server'
import { embeddingService } from '@/services/embedding/embeddingService'
import { z } from 'zod'

// Validation schema for embedding generation request
const generateEmbeddingSchema = z.object({
  chunks: z.array(z.object({
    id: z.string(),
    text: z.string().min(1, 'Text cannot be empty')
  })).min(1, 'At least one chunk is required'),
  options: z.object({
    model: z.string().optional(),
    batchSize: z.number().min(1).max(50).optional(),
    storeInVectorDB: z.boolean().optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = generateEmbeddingSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { chunks, options = {} } = validationResult.data
    const { storeInVectorDB = true, ...embeddingOptions } = options

    // Generate embeddings
    const embeddings = await embeddingService.generateEmbeddings(chunks, embeddingOptions)

    // Store in vector database if requested
    if (storeInVectorDB) {
      try {
        await embeddingService.storeEmbeddings(embeddings)
      } catch (storageError) {
        console.error('Failed to store embeddings:', storageError)
        // Don't fail the request, but log the error
      }
    }

    return NextResponse.json({
      data: embeddings,
      success: true,
      message: `Generated ${embeddings.length} embeddings${storeInVectorDB ? ' and stored in vector database' : ''}`
    })

  } catch (error) {
    console.error('Error generating embeddings:', error)

    return NextResponse.json(
      { error: 'Failed to generate embeddings', success: false },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get embedding statistics
    const stats = await embeddingService.getStats()

    return NextResponse.json({
      data: stats,
      success: true
    })

  } catch (error) {
    console.error('Error fetching embedding stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch embedding statistics', success: false },
      { status: 500 }
    )
  }
}