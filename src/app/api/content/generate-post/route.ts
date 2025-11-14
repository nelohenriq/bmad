import { NextRequest, NextResponse } from 'next/server';
import { contentWritingService } from '@/services/content/contentWritingService';
import { prisma } from '@/services/database/prisma';
import { z } from 'zod';

const generatePostSchema = z.object({
  outlineId: z.string().min(1, 'Outline ID is required'),
  style: z.enum(['professional', 'conversational', 'educational', 'promotional']).optional().default('professional'),
  length: z.enum(['short', 'medium', 'long']).optional().default('medium'),
  tone: z.enum(['formal', 'casual', 'enthusiastic', 'analytical']).optional().default('formal'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = generatePostSchema.parse(body);

    // Verify outline exists and has outline content
    const outline = await prisma.content.findUnique({
      where: { id: validatedData.outlineId },
      include: {
        topic: {
          include: {
            approvals: {
              where: { approvalLevel: 'approved' }
            }
          }
        }
      }
    });

    if (!outline) {
      return NextResponse.json(
        { error: 'Outline not found' },
        { status: 404 }
      );
    }

    if (!outline.outline) {
      return NextResponse.json(
        { error: 'Outline content not available' },
        { status: 400 }
      );
    }

    if (!outline.topic) {
      return NextResponse.json(
        { error: 'Outline is not associated with a topic' },
        { status: 400 }
      );
    }

    if (!outline.topic.approvals || outline.topic.approvals.length === 0) {
      return NextResponse.json(
        { error: 'Topic is not approved for content generation' },
        { status: 400 }
      );
    }

    // Generate blog post
    const blogPost = await contentWritingService.generateBlogPost(validatedData);

    // Store the generated blog post
    const content = await prisma.content.create({
      data: {
        userId: outline.topic.approvals[0].approvedBy, // Use the approver as the user
        topicId: outline.topic.id,
        title: blogPost.title,
        content: blogPost.content,
        status: 'generated',
        style: validatedData.style,
        length: validatedData.length,
        model: blogPost.metadata.model,
        wordCount: blogPost.wordCount,
        readingTime: blogPost.readingTime,
        generatedAt: blogPost.metadata.generatedAt,
        // Store additional metadata in prompt field
        prompt: JSON.stringify({
          sections: blogPost.sections,
          processingTime: blogPost.metadata.processingTime,
          tone: validatedData.tone,
          confidence: blogPost.metadata.confidence
        })
      },
    });

    return NextResponse.json({
      contentId: content.id,
      blogPost,
      metadata: blogPost.metadata,
    });

  } catch (error) {
    console.error('Blog post generation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Blog post generation failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}