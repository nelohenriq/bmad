import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/user/userService'
import { z } from 'zod'

const setPreferenceSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.any(),
  category: z.string().optional(),
  encrypt: z.boolean().optional()
})

export async function GET(request: NextRequest) {
  try {
    // TODO: Get user ID from authentication context
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const category = searchParams.get('category')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const preferences = await userService.getUserPreferences(userId)

    // Filter by category if specified
    let filteredPreferences = preferences
    if (category) {
      filteredPreferences = Object.fromEntries(
        Object.entries(preferences).filter(([key, value]) => {
          // TODO: In a real implementation, we'd store category with each preference
          // For now, we'll do a simple key-based filtering
          return key.startsWith(`${category}.`)
        })
      )
    }

    return NextResponse.json({ preferences: filteredPreferences })
  } catch (error) {
    console.error('Failed to get user preferences:', error)
    return NextResponse.json(
      { error: 'Failed to get user preferences' },
      { status: 500 }
    )
  }
}

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
    const { key, value, category, encrypt } = setPreferenceSchema.parse(body)

    await userService.setUserPreference(userId, key, value, {
      category,
      encrypt
    })

    return NextResponse.json({
      message: 'Preference updated successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid preference data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to set user preference:', error)
    return NextResponse.json(
      { error: 'Failed to set user preference' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // TODO: Get user ID from authentication context
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const key = searchParams.get('key')

    if (!userId || !key) {
      return NextResponse.json(
        { error: 'User ID and preference key are required' },
        { status: 400 }
      )
    }

    await userService.deleteUserPreference(userId, key)

    return NextResponse.json({
      message: 'Preference deleted successfully'
    })
  } catch (error) {
    console.error('Failed to delete user preference:', error)
    return NextResponse.json(
      { error: 'Failed to delete user preference' },
      { status: 500 }
    )
  }
}