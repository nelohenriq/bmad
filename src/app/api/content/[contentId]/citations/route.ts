import { NextRequest, NextResponse } from 'next/server'
import { CitationManager } from '@/lib/ai/citationManager'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const citationManager = new CitationManager()

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await context.params
    const citations = await citationManager.getCitations(contentId)

    return NextResponse.json({
      success: true,
      citations
    })

  } catch (error) {
    console.error('Get citations API error:', error)
    return NextResponse.json(
      { error: 'Failed to get citations' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await context.params
    const { sources, style } = await request.json()

    if (!sources || !Array.isArray(sources)) {
      return NextResponse.json(
        { error: 'Sources array is required' },
        { status: 400 }
      )
    }

    // Get content and related RSS sources
    const content = await (prisma as any).content.findUnique({
      where: { id: contentId },
      include: {
        sources: true
      }
    })

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      )
    }

    // Use provided sources or extract from content sources
    const rssSources = sources.length > 0 ? sources : content.sources.map((s: any) => ({
      url: s.url,
      title: s.title,
      content: '',
      publishedAt: null,
      author: null
    }))

    const citations = await citationManager.generateCitations(contentId, rssSources, style || 'APA')

    return NextResponse.json({
      success: true,
      citations
    })

  } catch (error) {
    console.error('Generate citations API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate citations' },
      { status: 500 }
    )
  }
}