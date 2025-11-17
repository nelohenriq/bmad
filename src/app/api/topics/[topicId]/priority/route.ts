import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest, context: any) {
  try {
    const { topicId } = context.params;
    const body = await request.json();
    const { priority }: { priority: 'high' | 'medium' | 'low' } = body;

    if (!['high', 'medium', 'low'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value. Must be high, medium, or low.' },
        { status: 400 }
      );
    }

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

    // Create or update approval record with priority
    const approval = await prisma.topicApproval.upsert({
      where: { topicId },
      update: {
        priority,
        lastReviewedAt: new Date(),
        reviewCount: {
          increment: 1
        }
      },
      create: {
        topicId,
        priority,
        lastReviewedAt: new Date(),
        reviewCount: 1
      }
    });

    return NextResponse.json({
      success: true,
      approval,
      message: `Topic ${topic.name} priority updated to ${priority}`
    });

  } catch (error) {
    console.error('Topic priority API error:', error);
    return NextResponse.json(
      { error: 'Failed to update topic priority' },
      { status: 500 }
    );
  }
}
