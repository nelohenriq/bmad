import { NextRequest, NextResponse } from 'next/server'
import { PublishingService } from '@/lib/publishing/publishingService'
import { z } from 'zod'

const publishingService = new PublishingService()

const updatePlatformSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  credentials: z.object({
    apiKey: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    siteUrl: z.string().url().optional(),
    blogId: z.string().optional()
  }).optional(),
  settings: z.object({
    defaultTags: z.array(z.string()).optional(),
    defaultCategory: z.string().optional(),
    publishImmediately: z.boolean().optional(),
    format: z.enum(['markdown', 'html']).optional()
  }).optional(),
  isActive: z.boolean().optional()
})

export async function PUT(request: NextRequest, context: any) {
  try {
    const id = context.params.id
    const body = await request.json()
    const updates = updatePlatformSchema.parse(body)

    const platform = await publishingService.updatePlatform(id, updates)
    return NextResponse.json({ platform })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid platform data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to update platform:', error)
    return NextResponse.json(
      { error: 'Failed to update platform' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: any) {
  try {
    const id = context.params.id
    await publishingService.deletePlatform(id)
    return NextResponse.json({ message: 'Platform deleted successfully' })
  } catch (error) {
    console.error('Failed to delete platform:', error)
    return NextResponse.json(
      { error: 'Failed to delete platform' },
      { status: 500 }
    )
  }
}
