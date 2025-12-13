import { NextRequest, NextResponse } from 'next/server'
import { contentIndexingService } from '@/services/content/contentIndexingService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (jobId) {
      // Get specific job status
      const job = contentIndexingService.getJobStatus(jobId)

      if (!job) {
        return NextResponse.json(
          { error: 'Job not found', success: false },
          { status: 404 }
        )
      }

      return NextResponse.json({
        data: job,
        success: true
      })
    } else {
      // Get all jobs and statistics
      const activeJobs = contentIndexingService.getActiveJobs()
      const stats = await contentIndexingService.getIndexingStats()

      return NextResponse.json({
        data: {
          activeJobs,
          statistics: stats
        },
        success: true
      })
    }

  } catch (error) {
    console.error('Error fetching indexing status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch indexing status', success: false },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required', success: false },
        { status: 400 }
      )
    }

    const cancelled = contentIndexingService.cancelJob(jobId)

    return NextResponse.json({
      data: { cancelled },
      success: true,
      message: cancelled ? 'Job cancelled successfully' : 'Job could not be cancelled'
    })

  } catch (error) {
    console.error('Error cancelling indexing job:', error)
    return NextResponse.json(
      { error: 'Failed to cancel indexing job', success: false },
      { status: 500 }
    )
  }
}