import { NextRequest, NextResponse } from 'next/server';
import { FactCheckingService } from '@/lib/ai/factCheckingService';

const factCheckingService = new FactCheckingService();

export async function PUT(request: NextRequest, context: any) {
  try {
    const { contentId, resultId } = context.params;
    const { verification, notes } = await request.json();

    if (!['verified', 'questionable', 'inconsistent'].includes(verification)) {
      return NextResponse.json(
        { error: 'Invalid verification status' },
        { status: 400 }
      );
    }

    await factCheckingService.updateFactCheckResult(
      resultId,
      verification,
      notes
    );

    return NextResponse.json({
      success: true,
      message: 'Fact check result updated successfully'
    });
  } catch (error) {
    console.error('Update fact-check result API error:', error);
    return NextResponse.json(
      { error: 'Failed to update fact check result' },
      { status: 500 }
    );
  }
}
