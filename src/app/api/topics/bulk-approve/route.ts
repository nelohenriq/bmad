import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { topicIds, approvedBy = 'system' }: { topicIds: string[], approvedBy?: string } = body

    if (!Array.isArray(topicIds) || topicIds.length === 0) {
      return NextResponse.json(
        { error: 'topicIds must be a non-empty array' },
        { status: 400 }
      )
    }

    // Verify all topics exist
    const existingTopics = await prisma.topic.findMany({
      where: {
        id: {
          in: topicIds
        }
      },
      select: { id: true, name: true }
    })

    const existingIds = existingTopics.map(t => t.id)
    const missingIds = topicIds.filter(id => !existingIds.includes(id))

    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: `Topics not found: ${missingIds.join(', ')}` },
        { status: 404 }
      )
    }

    // Bulk update approvals
    const approvals = await Promise.all(
      topicIds.map(topicId =>
        prisma.topicApproval.upsert({
          where: { topicId },
          update: {
            approvalLevel: 'approved',
            approvedBy,
            approvalDate: new Date(),
            lastReviewedAt: new Date(),
            reviewCount: {
              increment: 1
            }
          },
          create: {
            topicId,
            approvalLevel: 'approved',
            approvedBy,
            approvalDate: new Date(),
            lastReviewedAt: new Date(),
            reviewCount: 1
          }
        })
      )
    )

    return NextResponse.json({
      success: true,
      approvedCount: approvals.length,
      approvals,
      message: `Successfully approved ${approvals.length} topics`
    })

  } catch (error) {
    console.error('Bulk topic approval API error:', error)
    return NextResponse.json(
      { error: 'Failed to bulk approve topics' },
      { status: 500 }
    )
  }
}