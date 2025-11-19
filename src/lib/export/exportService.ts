import { PrismaClient } from '@prisma/client'
import { CitationManager } from '../ai/citationManager'

const prisma = new PrismaClient()
const citationManager = new CitationManager()

interface ExportOptions {
  includeCitations?: boolean
  citationStyle?: 'APA' | 'MLA' | 'Chicago'
}

interface ExportResult {
  content: string
  fileName: string
  mimeType: string
  fileSize: number
}

export class ExportService {
  /**
   * Export content in specified format
   */
  async exportContent(
    contentId: string,
    format: 'markdown' | 'html' | 'pdf',
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    try {
      // Get content from database
      const content = await (prisma as any).content.findUnique({
        where: { id: contentId }
      })

      if (!content) {
        throw new Error('Content not found')
      }

      let exportContent = content.content

      // Include citations if requested
      if (options.includeCitations) {
        const citations = await citationManager.getCitations(contentId)
        if (citations.length > 0) {
          exportContent = citationManager.insertCitationsIntoContent(exportContent, citations)
        }
      }

      // Convert to requested format
      const result = await this.convertFormat(exportContent, content.title || 'Untitled', format)

      // Save export record
      await this.saveExportRecord(contentId, format, result.fileName, result.fileSize)

      return result

    } catch (error) {
      console.error('Error exporting content:', error)
      throw error
    }
  }

  /**
   * Convert content to specified format
   */
  private async convertFormat(
    content: string,
    title: string,
    format: 'markdown' | 'html' | 'pdf'
  ): Promise<ExportResult> {
    const timestamp = new Date().toISOString().split('T')[0]
    const baseFileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`

    switch (format) {
      case 'markdown':
        return {
          content,
          fileName: `${baseFileName}.md`,
          mimeType: 'text/markdown',
          fileSize: Buffer.byteLength(content, 'utf8')
        }

      case 'html':
        const htmlContent = this.markdownToHtml(content, title)
        return {
          content: htmlContent,
          fileName: `${baseFileName}.html`,
          mimeType: 'text/html',
          fileSize: Buffer.byteLength(htmlContent, 'utf8')
        }

      case 'pdf':
        // PDF export not yet implemented - placeholder for future development
        throw new Error('PDF export is not yet supported. Please use Markdown or HTML format.')

      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  /**
   * Convert markdown to HTML
   */
  private markdownToHtml(markdown: string, title: string): string {
    // Simple markdown to HTML conversion
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Line breaks
      .replace(/\n/g, '<br>')
      // Paragraphs
      .replace(/<br><br>/g, '</p><p>')
      .replace(/^(.+?)(<br|$)/gm, '<p>$1</p>')

    // Wrap in HTML document
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #333; }
        a { color: #0066cc; }
        .references { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${html}
</body>
</html>`
  }

  /**
   * Save export record to database
   */
  private async saveExportRecord(
    contentId: string,
    format: string,
    fileName: string,
    fileSize: number
  ): Promise<void> {
    try {
      await (prisma as any).contentExport.create({
        data: {
          contentId,
          format,
          fileName,
          fileSize,
          exportedAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error saving export record:', error)
      throw error
    }
  }

  /**
   * Get export history for content
   */
  async getExportHistory(contentId: string): Promise<any[]> {
    try {
      const exports = await (prisma as any).contentExport.findMany({
        where: { contentId },
        orderBy: { exportedAt: 'desc' }
      })

      return exports.map((exp: any) => ({
        id: exp.id,
        format: exp.format,
        fileName: exp.fileName,
        fileSize: exp.fileSize,
        exportedAt: exp.exportedAt
      }))

    } catch (error) {
      console.error('Error getting export history:', error)
      throw error
    }
  }
}