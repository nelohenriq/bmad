import { NextRequest, NextResponse } from 'next/server';
import { autoContentGenerator } from '@/services/rss/autoContentGenerator';
import { z } from 'zod';

const generateKnowledgeSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  style: z.enum(['professional', 'casual', 'technical', 'creative']).optional().default('professional'),
  length: z.enum(['short', 'medium', 'long']).optional().default('medium'),
  userId: z.string().optional().default('user-1'), // TODO: Get from auth
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = generateKnowledgeSchema.parse(body);

    const { topic, style, length, userId } = validatedData;

    console.log(`Generating knowledge-based content for topic: "${topic}"`);

    // Generate content using semantic search on extended knowledge base
    const result = await autoContentGenerator.generateContentFromKnowledgeBase(topic, userId, {
      style,
      length,
      includeSources: true,
      maxSearchResults: 5,
      enableAutoGeneration: true
    });

    if (!result) {
      return NextResponse.json(
        { error: 'No relevant knowledge found or content generation failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      contentId: result.id,
      title: result.title,
      content: result.content,
      generatedAt: result.generatedAt,
      metadata: {
        style: result.style,
        length: result.length,
        searchResultsUsed: result.searchResults.totalResults
      }
    });

  } catch (error) {
    console.error('Knowledge-based content generation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Content generation failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}