import { NextResponse } from 'next/server'
import { webSearchService } from '@/services/search/webSearchService'

export async function GET() {
  try {
    const availableApis = webSearchService.getAvailableApis()

    return NextResponse.json({
      success: true,
      availableApis,
      configuredApis: Object.entries(availableApis)
        .filter(([_, available]) => available)
        .map(([api]) => api),
      message: availableApis.serpapi || availableApis.google || availableApis.bing
        ? 'Real web search APIs are configured'
        : 'Using mock search (no real API keys configured)'
    })
  } catch (error) {
    console.error('Error checking search API status:', error)
    return NextResponse.json(
      {
        error: 'Failed to check search API status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}