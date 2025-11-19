import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/services/database/prisma';

export async function GET(request: NextRequest, context: any) {
  try {
    const contentId = context.params.contentId;

    const content = await (prisma as any).content.findUnique({
      where: { id: contentId },
      include: {
        contentVersions: {
          orderBy: { version: 'desc' }
        }
      }
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Transform versions for API response
    const versions = content.contentVersions.map((version: any) => ({
      id: version.id,
      version: version.version,
      title: version.title,
      changeType: version.changeType,
      changeCount: version.changeCount,
      wordCount: version.wordCount,
      charCount: version.charCount,
      editedBy: version.editedBy,
      editedAt: version.editedAt,
      sessionId: version.sessionId,
      timeSpentMs: version.timeSpentMs,
      changes: version.changes ? JSON.parse(version.changes) : [],
      isCurrent: version.version === Math.max(...content.contentVersions.map((v: any) => v.version))
    }));

    return NextResponse.json({
      contentId,
      title: content.title,
      currentVersion: Math.max(...content.contentVersions.map((v: any) => v.version)),
      totalVersions: content.contentVersions.length,
      versions
    });
  } catch (error) {
    console.error('Failed to get content versions:', error);
    return NextResponse.json(
      { error: 'Failed to get content versions' },
      { status: 500 }
    );
  }
}
