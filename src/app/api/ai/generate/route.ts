import { NextRequest, NextResponse } from 'next/server'
import { aiService, ContentGenerationOptions } from '@/services/ai/aiService'
import logger from '@/lib/logger'

export async function POST(request: NextRequest) {
  let options: ContentGenerationOptions | undefined

  try {
    // Initialize AI service if not already done
    await aiService.initialize()

    const body = await request.json()
    const { topic, style, length, includeSources }: ContentGenerationOptions = body

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }

    options = {
      topic,
      style: style || 'professional',
      length: length || 'medium',
      includeSources: includeSources ?? true,
      userId: 'user-1' // TODO: Get from authenticated user session
    }

    const content = await aiService.generateBlogPost(options)

    return NextResponse.json({
      success: true,
      content,
      options,
      generatedAt: new Date().toISOString()
    })

   } catch (error) {
     logger.error('AI generation error', {
       error: error instanceof Error ? error.message : 'Unknown error',
       stack: error instanceof Error ? error.stack : undefined,
       topic: options?.topic,
       style: options?.style
     })

     return NextResponse.json(
       {
         error: 'Failed to generate content',
         details: error instanceof Error ? error.message : 'Unknown error'
       },
       { status: 500 }
     )
   }
}

export async function GET() {
  try {
    const isConnected = await aiService.checkConnection()
    const modelInfo = aiService.getModelInfo()

    return NextResponse.json({
      status: 'ok',
      connected: isConnected,
      model: modelInfo,
      endpoints: {
        generate: 'POST /api/ai/generate',
        summarize: 'POST /api/ai/summarize',
        analyze: 'POST /api/ai/analyze'
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}