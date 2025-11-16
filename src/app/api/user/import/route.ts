import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/user/userService'
import { z } from 'zod'

const importDataSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().optional(),
    bio: z.string().optional(),
    avatar: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string()
  }),
  settings: z.object({
    id: z.string(),
    userId: z.string(),
    defaultModel: z.string().optional(),
    defaultStyle: z.string().optional(),
    defaultLength: z.string().optional(),
    theme: z.string().optional(),
    language: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string()
  }).optional(),
  preferences: z.record(z.any()).optional(),
  sessions: z.array(z.object({
    id: z.string(),
    userId: z.string(),
    expiresAt: z.string(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    createdAt: z.string()
  })).optional(),
  exportedAt: z.string(),
  version: z.string()
})

export async function POST(request: NextRequest) {
  try {
    // TODO: Get user ID from authentication context
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const importData = importDataSchema.parse(body)

    // Validate that the import data belongs to the requesting user
    if (importData.user.id !== userId) {
      return NextResponse.json(
        { error: 'Import data does not match the authenticated user' },
        { status: 403 }
      )
    }

    await userService.importUserData(userId, importData)

    return NextResponse.json({
      message: 'User data imported successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid import data format', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to import user data:', error)
    return NextResponse.json(
      { error: 'Failed to import user data' },
      { status: 500 }
    )
  }
}