import { NextRequest, NextResponse } from 'next/server'
import { semanticAnalysisService } from '@/services/analysis/semanticAnalysisService'
import { analysisJobQueue } from '@/services/analysis/analysisJobQueue'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { feedItemId, title, content, description, priority = 'normal' } = body

    if (!feedItemId || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: feedItemId, title, content' },
        { status: 400 }
      )
    }

    // Check if analysis already exists
    const existingStatus = await semanticAnalysisService.getAnalysisStatus(feedItemId)
    if (existingStatus === 'completed') {
      return NextResponse.json({
        message: 'Analysis already completed',
        status: 'completed'
      })
    }

    if (existingStatus === 'processing') {
      return NextResponse.json({
        message: 'Analysis already in progress',
        status: 'processing'
      })
    }

    // Add to job queue
    const jobId = await analysisJobQueue.addJob({
      feedItemId,
      title,
      content,
      description
    }, priority)

    return NextResponse.json({
      message: 'Analysis job queued successfully',
      jobId,
      status: 'queued'
    })

  } catch (error) {
    console.error('Analysis API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const feedItemId = searchParams.get('feedItemId')
    const jobId = searchParams.get('jobId')

    if (feedItemId) {
      // Get analysis result for a feed item
      const result = await semanticAnalysisService.getAnalysisResult(feedItemId)
      const status = await semanticAnalysisService.getAnalysisStatus(feedItemId)

      if (!result) {
        return NextResponse.json({
          status,
          message: status === 'pending' ? 'Analysis not yet completed' : 'Analysis failed or not found'
        })
      }

      return NextResponse.json({
        status: 'completed',
        result
      })
    }

    if (jobId) {
      // Get job status
      const jobStatus = await analysisJobQueue.getJobStatus(jobId)

      if (!jobStatus) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(jobStatus)
    }

    // Get queue status
    const queueStatus = analysisJobQueue.getQueueStatus()
    return NextResponse.json({
      queue: queueStatus
    })

  } catch (error) {
    console.error('Analysis GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}