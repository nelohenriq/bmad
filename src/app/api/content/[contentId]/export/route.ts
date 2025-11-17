import { NextRequest, NextResponse } from 'next/server';
import { ExportService } from '@/lib/export/exportService';
import { z } from 'zod';

const exportService = new ExportService();

const exportContentSchema = z.object({
  format: z.enum(['markdown', 'html', 'pdf']),
  includeCitations: z.boolean().optional(),
  citationStyle: z.enum(['APA', 'MLA', 'Chicago']).optional()
});

export async function POST(
  request: NextRequest,
  context: any
) {
  try {
    const contentId = context.params.contentId;
    const body = await request.json();

    const { format, includeCitations, citationStyle } = exportContentSchema.parse(body);

    const result = await exportService.exportContent(contentId, format, {
      includeCitations,
      citationStyle
    });

    return new NextResponse(result.content, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.fileName}"`
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
