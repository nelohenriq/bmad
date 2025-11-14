import { NextRequest, NextResponse } from 'next/server';
import { contentOutlineService } from '@/services/content/contentOutlineService';
import { prisma } from '@/services/database/prisma';
import { z } from 'zod';

const generateOutlineSchema = z.object({
  topicId: z.string().min(1, 'Topic ID is required'),
  angleIds: z.array(z.string()).optional(),
  style: z.enum(['standard', 'deep-dive', 'listicle', 'how-to']).optional().default('standard'),
  length: z.enum(['short', 'medium', 'long']).optional().default('medium'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = generateOutlineSchema.parse(body);

    // Verify topic exists and is approved
    const topic = await prisma.topic.findUnique({
      where: { id: validatedData.topicId },
      include: {
        approvals: {
          where: { approvalLevel: 'approved' }
        }
      }
    });

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    if (!topic.approvals || topic.approvals.length === 0) {
      return NextResponse.json(
        { error: 'Topic is not approved for content generation' },
        { status: 400 }
      );
    }

    // Generate outline
    const outline = await contentOutlineService.generateOutline(validatedData);

    // Create content record with outline
    const content = await prisma.content.create({
      data: {
        userId: topic.approvals[0].approvedBy, // Use the approver as the user
        topicId: validatedData.topicId,
        title: outline.title,
        content: '', // Content will be filled when generating full blog post
        outline: JSON.stringify(outline),
        status: 'outline_generated',
        style: validatedData.style,
        length: validatedData.length,
        model: outline.metadata.model,
        outlineGeneratedAt: outline.metadata.generatedAt,
        outlineModel: outline.metadata.model,
        outlineConfidence: outline.metadata.confidence,
      },
    });

    return NextResponse.json({
      contentId: content.id,
      outline,
      metadata: outline.metadata,
    });

  } catch (error) {
    console.error('Outline generation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Outline generation failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}