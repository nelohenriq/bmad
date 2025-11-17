import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/services/database/prisma';

export async function GET(request: NextRequest, context: any) {
  try {
    const { contentId } = context.params;

    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Parse outline from outline field
    let outline = null;
    if (content.outline) {
      try {
        outline = JSON.parse(content.outline);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid outline format' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'No outline found for this content' },
        { status: 404 }
      );
    }

    const response = {
      outline,
      metadata: {
        contentId: content.id,
        title: content.title,
        status: content.status || 'draft',
        style: content.style,
        length: content.length,
        model: content.model,
        generatedAt: content.generatedAt,
        outlineGeneratedAt: content.outlineGeneratedAt,
        outlineModel: content.outlineModel,
        outlineConfidence: content.outlineConfidence,
      },
      user: content.user,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Outline retrieval error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Outline retrieval failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
