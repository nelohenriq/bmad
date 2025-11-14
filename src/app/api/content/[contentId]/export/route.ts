import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/services/database/prisma';
import { z } from 'zod';

const exportContentSchema = z.object({
  format: z.enum(['markdown', 'html'])
});

export async function POST(
  request: NextRequest,
  { params }: { params: { contentId: string } }
) {
  try {
    const contentId = params.contentId;
    const body = await request.json();

    const { format } = exportContentSchema.parse(body);

    const content = await prisma.content.findUnique({
      where: { id: contentId }
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Get the edited content (from prompt field) or original content
    const contentToExport = content.prompt || content.content;

    let exportedContent: string;
    let mimeType: string;
    let fileExtension: string;

    if (format === 'markdown') {
      // Convert HTML to Markdown (basic conversion)
      exportedContent = htmlToMarkdown(contentToExport);
      mimeType = 'text/markdown';
      fileExtension = 'md';
    } else {
      // Return as HTML
      exportedContent = contentToExport;
      mimeType = 'text/html';
      fileExtension = 'html';
    }

    // Add metadata header
    const header = format === 'markdown'
      ? `---
title: "${content.title}"
style: "${content.style}"
length: "${content.length}"
generated: "${content.generatedAt.toISOString()}"
---

`
      : `<!-- ${content.title} - ${content.style} style, ${content.length} length - Generated: ${content.generatedAt.toISOString()} -->
`;

    exportedContent = header + exportedContent;

    return new NextResponse(exportedContent, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${content.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${fileExtension}"`
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Failed to export content:', error);
    return NextResponse.json(
      { error: 'Failed to export content' },
      { status: 500 }
    );
  }
}

// Basic HTML to Markdown conversion
function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br[^>]*>/gi, '\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<ul[^>]*>(.*?)<\/ul>/gi, (match, content) => {
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    })
    .replace(/<ol[^>]*>(.*?)<\/ol>/gi, (match, content) => {
      let counter = 1;
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`);
    })
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```\n\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}