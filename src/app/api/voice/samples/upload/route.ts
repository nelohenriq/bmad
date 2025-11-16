import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/services/database/prisma'

// File size limit: 10,000 words ≈ 50KB
const MAX_FILE_SIZE = 50 * 1024
const MAX_WORD_COUNT = 10000

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const source = formData.get('source') as string || 'user_provided'
    const tags = formData.get('tags') as string

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Mock user ID - in real app would come from auth
    const userId = 'user-1'

    const results = []

    for (const file of files) {
      try {
        // Validate file type
        if (!file.type.includes('text/') && !file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
          results.push({
            file: file.name,
            success: false,
            error: 'Invalid file type. Only text and markdown files are supported.'
          })
          continue
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          results.push({
            file: file.name,
            success: false,
            error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024}KB.`
          })
          continue
        }

        // Read file content
        const content = await file.text()

        // Validate word count
        const wordCount = content.split(/\s+/).length
        if (wordCount > MAX_WORD_COUNT) {
          results.push({
            file: file.name,
            success: false,
            error: `File too long. Maximum ${MAX_WORD_COUNT} words allowed.`
          })
          continue
        }

        // Basic quality validation
        const quality = validateSampleQuality(content)
        if (quality.score < 0.3) {
          results.push({
            file: file.name,
            success: false,
            error: `Sample quality too low: ${quality.issues.join(', ')}`
          })
          continue
        }

        // Create voice profile if it doesn't exist
        let profile = await prisma.voiceProfile.findFirst({
          where: { userId, isActive: true }
        })

        if (!profile) {
          profile = await prisma.voiceProfile.create({
            data: {
              userId,
              name: 'Default Voice Profile',
              description: 'Automatically created voice profile',
              formalityLevel: 0.5,
              complexityLevel: 0.5,
              engagementLevel: 0.5
            }
          })
        }

        // Save sample to database
        const sample = await prisma.voiceSample.create({
          data: {
            profileId: profile.id,
            content,
            source,
            quality: quality.score
          }
        })

        // Update profile sample count using atomic increment
        await prisma.voiceProfile.update({
          where: { id: profile.id },
          data: {
            sampleCount: {
              increment: 1
            }
          }
        })

        results.push({
          file: file.name,
          success: true,
          sampleId: sample.id,
          wordCount,
          quality: quality.score
        })

      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        results.push({
          file: file.name,
          success: false,
          error: 'Internal server error during processing'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const totalCount = results.length

    return NextResponse.json({
      success: successCount > 0,
      message: `Processed ${successCount}/${totalCount} files successfully`,
      results
    })

  } catch (error) {
    console.error('Sample upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    )
  }
}

function validateSampleQuality(content: string): { score: number, issues: string[] } {
  const issues: string[] = []
  let score = 1.0

  // Check minimum length
  if (content.length < 100) {
    issues.push('Content too short (minimum 100 characters)')
    score -= 0.3
  }

  // Check for actual content (not just whitespace)
  const trimmed = content.trim()
  if (trimmed.length < content.length * 0.8) {
    issues.push('Too much whitespace')
    score -= 0.2
  }

  // Check for readable text (not binary or encoded)
  const printableChars = content.replace(/[\x20-\x7E\n\r\t]/g, '').length
  const printableRatio = printableChars / content.length
  if (printableRatio > 0.1) {
    issues.push('Contains non-text characters')
    score -= 0.3
  }

  // Check for sentence structure
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
  if (sentences.length < 2) {
    issues.push('Insufficient sentence structure')
    score -= 0.2
  }

  return {
    score: Math.max(0, score),
    issues
  }
}