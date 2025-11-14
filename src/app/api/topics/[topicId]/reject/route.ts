import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface RouteParams {
  params: {
    topicId: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { topicId } = params
    const body = await request.json()
    const { reason, rejectedBy = 'system' } = body

    // Check if topic exists
    const topic = await prisma.topic.findUnique({
      where: { id: topicId }
    })

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      )
    }

    // Create or update approval record
    const approval = await prisma.topicApproval.upsert({
      where: { topicId },
      update: {
        approvalLevel: 'rejected',
        rejectionReason: reason,
        lastReviewedAt: new Date(),
        reviewCount: {
          increment: 1
        }
      },
      create: {
        topicId,
        approvalLevel: 'rejected',
        rejectionReason: reason,
        lastReviewedAt: new Date(),
        reviewCount: 1
      }
    })

    return NextResponse.json({
      success: true,
      approval,
      message: `Topic ${topic.name} rejected successfully`
    })

  } catch (error) {
    console.error('Topic rejection API error:', error)
    return NextResponse.json(
      { error: 'Failed to reject topic' },
      { status: 500 }
    )
  }
}