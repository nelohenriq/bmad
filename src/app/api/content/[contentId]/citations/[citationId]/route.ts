import { NextRequest, NextResponse } from 'next/server'
import { CitationManager } from '@/lib/ai/citationManager'

const citationManager = new CitationManager()

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ contentId: string; citationId: string }> }
) {
  try {
    const { citationId } = await context.params
    const updates = await request.json()

    await citationManager.updateCitation(citationId, updates)

    return NextResponse.json({
      success: true,
      message: 'Citation updated successfully'
    })

  } catch (error) {
    console.error('Update citation API error:', error)
    return NextResponse.json(
      { error: 'Failed to update citation' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ contentId: string; citationId: string }> }
) {
  try {
    const { citationId } = await context.params

    await citationManager.deleteCitation(citationId)

    return NextResponse.json({
      success: true,
      message: 'Citation deleted successfully'
    })

  } catch (error) {
    console.error('Delete citation API error:', error)
    return NextResponse.json(
      { error: 'Failed to delete citation' },
      { status: 500 }
    )
  }
}