import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest, context: any) {
  try {
    const { topicId } = context.params;
    const body = await request.json();
    const { approvedBy = 'system' } = body;

    // Check if topic exists
    const topic = await prisma.topic.findUnique({
      where: { id: topicId }
    });

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    // Create or update approval record
    const approval = await prisma.topicApproval.upsert({
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
    });

    return NextResponse.json({
      success: true,
      approval,
      message: `Topic ${topic.name} approved successfully`
    });

  } catch (error) {
    console.error('Topic approval API error:', error);
    return NextResponse.json(
      { error: 'Failed to approve topic' },
      { status: 500 }
    );
  }
}
