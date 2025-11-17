import { NextRequest, NextResponse } from 'next/server'

// Mock voice sample data structure
interface VoiceSample {
  id: string
  userId: string
  profileId?: string
  content: string
  audioUrl?: string
  duration?: number
  createdAt: Date
  metadata?: {
    formalityScore?: number
    complexityScore?: number
    engagementScore?: number
    wordCount: number
  }
}

// Mock storage - in real app this would be a database
let mockVoiceSamples: VoiceSample[] = [
  {
    id: 'sample-1',
    userId: 'user-1',
    profileId: 'profile-1',
    content: 'This is a professional voice sample demonstrating clear communication and structured thinking.',
    duration: 15.5,
    createdAt: new Date('2024-01-15'),
    metadata: {
      formalityScore: 0.8,
      complexityScore: 0.6,
      engagementScore: 0.7,
      wordCount: 12
    }
  },
  {
    id: 'sample-2',
    userId: 'user-1',
    content: 'Innovation drives our success through creative problem-solving and collaborative teamwork.',
    duration: 8.2,
    createdAt: new Date('2024-01-20'),
    metadata: {
      formalityScore: 0.7,
      complexityScore: 0.8,
      engagementScore: 0.9,
      wordCount: 8
    }
  }
]

// For now, using a mock user ID - in real app this would come from auth
const MOCK_USER_ID = 'user-1'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let samples = mockVoiceSamples.filter(sample => sample.userId === MOCK_USER_ID)

    if (profileId) {
      samples = samples.filter(sample => sample.profileId === profileId)
    }

    // Apply pagination
    const paginatedSamples = samples.slice(offset, offset + limit)

    return NextResponse.json({
      success: true,
      data: paginatedSamples,
      pagination: {
        total: samples.length,
        limit,
        offset,
        hasMore: offset + limit < samples.length
      }
    })
  } catch (error) {
    console.error('Voice samples fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch voice samples' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content, profileId, audioUrl, duration } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      )
    }

    if (content.trim().length < 10) {
      return NextResponse.json(
        { error: 'Content must be at least 10 characters long' },
        { status: 400 }
      )
    }

    // Basic content analysis for metadata
    const wordCount = content.trim().split(/\s+/).length
    const formalityScore = calculateFormalityScore(content)
    const complexityScore = calculateComplexityScore(content)
    const engagementScore = calculateEngagementScore(content)

    const newSample: VoiceSample = {
      id: `sample-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: MOCK_USER_ID,
      profileId: profileId || null,
      content: content.trim(),
      audioUrl,
      duration: duration || null,
      createdAt: new Date(),
      metadata: {
        formalityScore,
        complexityScore,
        engagementScore,
        wordCount
      }
    }

    mockVoiceSamples.push(newSample)

    return NextResponse.json({
      success: true,
      data: newSample
    }, { status: 201 })
  } catch (error) {
    console.error('Voice sample creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create voice sample' },
      { status: 500 }
    )
  }
}

// Helper functions for content analysis
function calculateFormalityScore(text: string): number {
  const formalWords = ['therefore', 'however', 'furthermore', 'consequently', 'hence']
  const casualWords = ['yeah', 'ok', 'gonna', 'wanna', 'cool']

  const words = text.toLowerCase().split(/\s+/)
  const formalCount = words.filter(word => formalWords.includes(word)).length
  const casualCount = words.filter(word => casualWords.includes(word)).length

  const totalWords = words.length
  return Math.max(0, Math.min(1, (formalCount - casualCount) / totalWords + 0.5))
}

function calculateComplexityScore(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const words = text.split(/\s+/).filter(w => w.length > 0)

  const avgSentenceLength = words.length / sentences.length
  const longWords = words.filter(word => word.length > 6).length

  const complexity = (avgSentenceLength * 0.4) + (longWords / words.length * 100 * 0.6)
  return Math.min(1, complexity / 20)
}

function calculateEngagementScore(text: string): number {
  const engagingWords = ['amazing', 'incredible', 'fantastic', 'wonderful', 'exciting']
  const neutralWords = ['is', 'are', 'was', 'were', 'be']

  const words = text.toLowerCase().split(/\s+/)
  const engagingCount = words.filter(word => engagingWords.includes(word)).length
  const neutralCount = words.filter(word => neutralWords.includes(word)).length

  const totalWords = words.length
  const engagement = (engagingCount - neutralCount) / totalWords + 0.5
  return Math.max(0, Math.min(1, engagement))
}