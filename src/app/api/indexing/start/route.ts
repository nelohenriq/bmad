import { NextRequest, NextResponse } from 'next/server'
import { contentIndexingService } from '@/services/content/contentIndexingService'
import { z } from 'zod'

const startIndexingSchema = z.object({
  contentId: z.string().min(1, 'Content ID is required'),
  options: z.object({
    batchSize: z.number().min(1).max(50).optional(),
    skipChunking: z.boolean().optional(),
    forceReindex: z.boolean().optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = startIndexingSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { contentId, options = {} } = validationResult.data

    // Start indexing job
    const jobId = await contentIndexingService.startIndexing(contentId, options)

    return NextResponse.json({
      data: { jobId },
      success: true,
      message: 'Indexing job started successfully'
    })

  } catch (error) {
    console.error('Error starting indexing job:', error)

    return NextResponse.json(
      { error: 'Failed to start indexing job', success: false },
      { status: 500 }
    )
  }
}