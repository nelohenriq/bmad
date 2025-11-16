import { NextRequest, NextResponse } from 'next/server'
import { ExportService } from '@/lib/export/exportService'

const exportService = new ExportService()

export async function GET(
  request: NextRequest,
  { params }: { params: { contentId: string } }
) {
  try {
    const contentId = params.contentId

    const history = await exportService.getExportHistory(contentId)

    return NextResponse.json({
      success: true,
      exports: history
    })

  } catch (error) {
    console.error('Get export history API error:', error)
    return NextResponse.json(
      { error: 'Failed to get export history' },
      { status: 500 }
    )
  }
}