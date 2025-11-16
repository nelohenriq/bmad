import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/user/userService'

export async function GET(request: NextRequest) {
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

    const exportData = await userService.exportUserData(userId)

    // Set headers for file download
    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('Content-Disposition', `attachment; filename="user-data-${userId}-${new Date().toISOString().split('T')[0]}.json"`)

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('Failed to export user data:', error)
    return NextResponse.json(
      { error: 'Failed to export user data' },
      { status: 500 }
    )
  }
}