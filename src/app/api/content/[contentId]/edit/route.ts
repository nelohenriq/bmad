import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/services/database/prisma';
import { z } from 'zod';

const editContentSchema = z.object({
  content: z.string(),
  changes: z.array(z.object({
    type: z.enum(['insert', 'delete', 'modify']),
    position: z.number(),
    length: z.number(),
    content: z.string(),
    timestamp: z.date().optional()
  })).optional(),
  autoSave: z.boolean().optional(),
  sessionId: z.string().optional(),
  timeSpentMs: z.number().optional()
});

export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    const { contentId } = context.params;

    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: {
        topic: true
      }
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      content: content.prompt || content.content, // Use prompt for edited content, fallback to original content
      originalContent: content.outline || '',
      updatedAt: content.updatedAt,
      topic: content.topic,
      outline: content.outline
    });
  } catch (error) {
    console.error('Failed to load content for editing:', error);
    return NextResponse.json(
      { error: 'Failed to load content' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: any
) {
  try {
    const { contentId } = context.params;
    const body = await request.json();

    const validatedData = editContentSchema.parse(body);
    const { content, changes = [], autoSave = false, sessionId, timeSpentMs } = validatedData;

    // Get current content for version comparison
    const currentContent = await (prisma as any).content.findUnique({
      where: { id: contentId },
      include: { contentVersions: { orderBy: { version: 'desc' }, take: 1 } }
    });

    if (!currentContent) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Determine next version number
    const latestVersion = (currentContent as any).contentVersions[0];
    const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

    // Create new version
    await (prisma as any).contentVersion.create({
      data: {
        contentId,
        title: currentContent.title,
        versionContent: content,
        version: nextVersion,
        changeType: autoSave ? 'auto_save' : 'manual_save',
        changeCount: changes.length,
        wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
        charCount: content.length,
        editedBy: 'user', // TODO: Get from auth context
        sessionId: sessionId || `session-${Date.now()}`,
        timeSpentMs: timeSpentMs,
        changes: JSON.stringify(changes),
      }
    });

    // Update content with edited version
    const updatedContent = await prisma.content.update({
      where: { id: contentId },
      data: {
        prompt: content, // Store edited content in prompt field
        updatedAt: new Date()
      }
    });

    // Log the edit operation
    console.log(`Content ${contentId} ${autoSave ? 'auto-saved' : 'saved'} with ${changes.length} changes (version ${nextVersion})`);

    return NextResponse.json({
      success: true,
      contentId: updatedContent.id,
      updatedAt: updatedContent.updatedAt,
      changesCount: changes.length,
      autoSave,
      version: nextVersion
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Failed to save edited content:', error);
    return NextResponse.json(
      { error: 'Failed to save content' },
      { status: 500 }
    );
  }
}