import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/services/database/prisma';

interface RouteParams {
  params: {
    contentId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { contentId } = params;

    // Fetch the blog post content
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: {
        topic: {
          include: {
            contentAngles: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Parse additional metadata from prompt field
    let metadata = {};
    try {
      if (content.prompt) {
        metadata = JSON.parse(content.prompt);
      }
    } catch (error) {
      console.warn('Failed to parse content metadata:', error);
    }

    // Format response
    const response = {
      id: content.id,
      title: content.title,
      content: content.content,
      status: content.status,
      style: content.style,
      length: content.length,
      model: content.model,
      wordCount: content.wordCount,
      readingTime: content.readingTime,
      generatedAt: content.generatedAt,
      topic: content.topic ? {
        id: content.topic.id,
        name: content.topic.name,
        description: content.topic.description
      } : null,
      author: content.user,
      metadata: {
        ...metadata,
        outlineGeneratedAt: content.outlineGeneratedAt,
        outlineModel: content.outlineModel,
        outlineConfidence: content.outlineConfidence
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Blog post retrieval error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Blog post retrieval failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}