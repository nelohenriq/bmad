import { NextRequest, NextResponse } from 'next/server'
import { PublishingService } from '@/lib/publishing/publishingService'
import { z } from 'zod'

const publishingService = new PublishingService()

const platformSchema = z.object({
  name: z.string().min(1).max(100),
  platform: z.enum(['wordpress', 'medium', 'blogger']),
  credentials: z.object({
    apiKey: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    siteUrl: z.string().url().optional(),
    blogId: z.string().optional()
  }),
  settings: z.object({
    defaultTags: z.array(z.string()).optional(),
    defaultCategory: z.string().optional(),
    publishImmediately: z.boolean().default(true),
    format: z.enum(['markdown', 'html']).default('html')
  }),
  isActive: z.boolean().default(true)
})

export async function GET() {
  try {
    const platforms = await publishingService.getPlatforms()
    return NextResponse.json({ success: true, platforms })
  } catch (error) {
    console.error('Failed to get platforms:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get platforms' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const platformData = platformSchema.parse(body)

    const platform = await publishingService.addPlatform(platformData)
    return NextResponse.json({ success: true, platform }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid platform data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to add platform:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create platform' },
      { status: 500 }
    )
  }
}
