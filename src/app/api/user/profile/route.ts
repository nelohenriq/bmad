import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/user/userService'
import { z } from 'zod'

// Note: In a real implementation, user authentication would be handled
// by middleware. For this demo, we'll assume the user ID comes from
// a session token or similar authentication mechanism.

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional()
})

export async function GET(request: NextRequest) {
  try {
    // TODO: Get user ID from authentication context
    // For now, we'll use a query parameter for demo purposes
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const user = await userService.getUserById(userId)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Failed to get user profile:', error)
    return NextResponse.json(
      { error: 'Failed to get user profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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
    const updateData = updateProfileSchema.parse(body)

    const updatedUser = await userService.updateUser(userId, updateData)

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid profile data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to update user profile:', error)
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    )
  }
}