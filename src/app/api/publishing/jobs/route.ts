import { NextRequest, NextResponse } from 'next/server'
import { PublishingService } from '@/lib/publishing/publishingService'
import { z } from 'zod'

const publishingService = new PublishingService()

const publishJobSchema = z.object({
  contentId: z.string().min(1),
  platformId: z.string().min(1),
  scheduleAt: z.string().datetime().optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('contentId')

    if (contentId) {
      const jobs = await publishingService.getPublishingJobs(contentId)
      return NextResponse.json({ jobs })
    }

    return NextResponse.json(
      { error: 'contentId parameter is required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to get publishing jobs:', error)
    return NextResponse.json(
      { error: 'Failed to get publishing jobs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid job data' },
        { status: 400 }
      )
    }

    const jobData = publishJobSchema.parse(body)

    const { contentId, platformId, scheduleAt } = jobData
    const scheduleDate = scheduleAt ? new Date(scheduleAt) : undefined

    const job = await publishingService.publishToPlatform(contentId, platformId, scheduleDate)
    return NextResponse.json({ job }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid job data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to create publishing job:', error)
    return NextResponse.json(
      { error: 'Failed to create publishing job' },
      { status: 500 }
    )
  }
}
