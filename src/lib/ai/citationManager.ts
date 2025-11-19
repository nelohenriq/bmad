import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface Citation {
  id: string
  contentId: string
  sourceUrl: string
  title?: string
  accessDate: Date
  citationStyle: string
  formattedCitation: string
}

interface RSSSource {
  url: string
  title?: string
  content: string
  publishedAt?: Date
  author?: string
}

export class CitationManager {
  /**
   * Generate citations for content sources
   */
  async generateCitations(contentId: string, sources: RSSSource[], style: 'APA' | 'MLA' | 'Chicago' = 'APA'): Promise<Citation[]> {
    try {
      const citations: Citation[] = []

      for (const source of sources) {
        const formatted = this.formatCitation(source, style)
        const citation: Citation = {
          id: `cit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          contentId,
          sourceUrl: source.url,
          title: source.title,
          accessDate: new Date(),
          citationStyle: style,
          formattedCitation: formatted
        }
        citations.push(citation)
      }

      // Save to database
      await this.saveCitations(citations)

      return citations

    } catch (error) {
      console.error('Error generating citations:', error)
      throw error
    }
  }

  /**
   * Format citation according to style
   */
  private formatCitation(source: RSSSource, style: string): string {
    const title = source.title || 'Untitled'
    const url = source.url
    const date = source.publishedAt ? new Date(source.publishedAt).getFullYear() : new Date().getFullYear()
    const author = source.author || 'Unknown Author'

    switch (style) {
      case 'APA':
        return `${author}. (${date}). ${title}. Retrieved from ${url}`

      case 'MLA':
        return `"${title}." ${author}, ${date}, ${url}.`

      case 'Chicago':
        return `${author}. "${title}." ${date}. ${url}.`

      default:
        return `${title} - ${url}`
    }
  }

  /**
   * Get citations for content
   */
  async getCitations(contentId: string): Promise<Citation[]> {
    try {
      const citations = await (prisma as any).citation.findMany({
        where: { contentId },
        orderBy: { accessDate: 'desc' }
      })

      return citations.map((c: any) => ({
        id: c.id,
        contentId: c.contentId,
        sourceUrl: c.sourceUrl,
        title: c.title,
        accessDate: c.accessDate,
        citationStyle: c.citationStyle,
        formattedCitation: c.formattedCitation
      }))

    } catch (error) {
      console.error('Error getting citations:', error)
      throw error
    }
  }

  /**
   * Update citation
   */
  async updateCitation(citationId: string, updates: Partial<Citation>): Promise<void> {
    try {
      await (prisma as any).citation.update({
        where: { id: citationId },
        data: {
          title: updates.title,
          citationStyle: updates.citationStyle,
          formattedCitation: updates.formattedCitation
        }
      })
    } catch (error) {
      console.error('Error updating citation:', error)
      throw error
    }
  }

  /**
   * Delete citation
   */
  async deleteCitation(citationId: string): Promise<void> {
    try {
      await (prisma as any).citation.delete({
        where: { id: citationId }
      })
    } catch (error) {
      console.error('Error deleting citation:', error)
      throw error
    }
  }

  /**
   * Save citations to database
   */
  private async saveCitations(citations: Citation[]): Promise<void> {
    try {
      await (prisma as any).citation.createMany({
        data: citations.map(c => ({
          id: c.id,
          contentId: c.contentId,
          sourceUrl: c.sourceUrl,
          title: c.title,
          accessDate: c.accessDate,
          citationStyle: c.citationStyle,
          formattedCitation: c.formattedCitation
        }))
      })
    } catch (error) {
      console.error('Error saving citations:', error)
      throw error
    }
  }

  /**
   * Insert citations into content
   */
  insertCitationsIntoContent(content: string, citations: Citation[]): string {
    if (citations.length === 0) return content

    // Simple insertion at the end
    const citationList = citations.map((c, i) => `${i + 1}. ${c.formattedCitation}`).join('\n')
    return `${content}\n\n## References\n${citationList}`
  }
}