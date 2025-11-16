// Mock CitationManager
jest.mock('../../../src/lib/ai/citationManager', () => ({
  CitationManager: jest.fn().mockImplementation(() => ({
    getCitations: jest.fn(),
    insertCitationsIntoContent: jest.fn()
  }))
}))

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    content: {
      findUnique: jest.fn()
    },
    contentExport: {
      create: jest.fn(),
      findMany: jest.fn()
    }
  }))
}))

import { ExportService } from '../../../src/lib/export/exportService'

describe('ExportService', () => {
  let exportService: ExportService
  let mockCitationManager: any
  let mockPrisma: any

  beforeEach(() => {
    jest.clearAllMocks()
    exportService = new ExportService()
    // Get the mocked CitationManager instance
    const CitationManagerMock = require('../../../src/lib/ai/citationManager').CitationManager
    mockCitationManager = new CitationManagerMock()
    // Get the mocked Prisma instance
    mockPrisma = new (require('@prisma/client').PrismaClient)()
  })

  describe('exportContent', () => {
    const mockContent = {
      id: 'content-1',
      title: 'Test Article',
      content: '# Test Content\n\nThis is a test article.'
    }

    it('should export content in markdown format without citations', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(mockContent)
      mockCitationManager.getCitations.mockResolvedValue([])
      mockPrisma.contentExport.create.mockResolvedValue({})

      const result = await exportService.exportContent('content-1', 'markdown')

      expect(result).toEqual({
        content: mockContent.content,
        fileName: 'Test_Article_2025-11-15.md',
        mimeType: 'text/markdown',
        fileSize: Buffer.byteLength(mockContent.content, 'utf8')
      })

      expect(mockPrisma.content.findUnique).toHaveBeenCalledWith({
        where: { id: 'content-1' }
      })
      expect(mockCitationManager.getCitations).not.toHaveBeenCalled()
      expect(mockPrisma.contentExport.create).toHaveBeenCalled()
    })

    it('should export content in HTML format without citations', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(mockContent)
      mockCitationManager.getCitations.mockResolvedValue([])
      mockPrisma.contentExport.create.mockResolvedValue({})

      const result = await exportService.exportContent('content-1', 'html')

      expect(result.fileName).toBe('Test_Article_2025-11-15.html')
      expect(result.mimeType).toBe('text/html')
      expect(result.content).toContain('<h1>Test Article</h1>')
      expect(result.content).toContain('<h1>Test Content</h1>')
      expect(result.content).toContain('<p>This is a test article.</p>')
      expect(result.content).toContain('<style>')
      expect(result.content).toContain('</style>')
      expect(result.content).toContain('</html>')

      expect(mockPrisma.contentExport.create).toHaveBeenCalled()
    })

    it('should export content with citations when requested', async () => {
      const mockCitations = [
        {
          id: 'cit-1',
          contentId: 'content-1',
          sourceUrl: 'https://example.com',
          title: 'Source Article',
          accessDate: new Date(),
          citationStyle: 'APA',
          formattedCitation: 'Author. (2023). Source Article. Retrieved from https://example.com'
        }
      ]

      const contentWithCitations = `${mockContent.content}\n\n## References\n1. Author. (2023). Source Article. Retrieved from https://example.com`

      mockPrisma.content.findUnique.mockResolvedValue(mockContent)
      mockCitationManager.getCitations.mockResolvedValue(mockCitations)
      mockCitationManager.insertCitationsIntoContent.mockReturnValue(contentWithCitations)
      mockPrisma.contentExport.create.mockResolvedValue({})

      const result = await exportService.exportContent('content-1', 'markdown', {
        includeCitations: true,
        citationStyle: 'APA'
      })

      expect(result.content).toBe(contentWithCitations)
      expect(mockCitationManager.getCitations).toHaveBeenCalledWith('content-1')
      expect(mockCitationManager.insertCitationsIntoContent).toHaveBeenCalledWith(
        mockContent.content,
        mockCitations
      )
    })

    it('should handle content not found error', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(null)

      await expect(exportService.exportContent('nonexistent', 'markdown'))
        .rejects.toThrow('Content not found')

      expect(mockPrisma.contentExport.create).not.toHaveBeenCalled()
    })

    it('should handle database errors during export record creation', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(mockContent)
      mockCitationManager.getCitations.mockResolvedValue([])
      mockPrisma.contentExport.create.mockRejectedValue(new Error('Database error'))

      await expect(exportService.exportContent('content-1', 'markdown'))
        .rejects.toThrow('Database error')
    })

    it('should handle citation retrieval errors', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(mockContent)
      mockCitationManager.getCitations.mockRejectedValue(new Error('Citation error'))

      await expect(exportService.exportContent('content-1', 'markdown', {
        includeCitations: true
      })).rejects.toThrow('Citation error')
    })

    it('should use default title when content title is null', async () => {
      const contentWithoutTitle = {
        id: 'content-1',
        title: null,
        content: 'Test content'
      }

      mockPrisma.content.findUnique.mockResolvedValue(contentWithoutTitle)
      mockCitationManager.getCitations.mockResolvedValue([])
      mockPrisma.contentExport.create.mockResolvedValue({})

      const result = await exportService.exportContent('content-1', 'markdown')

      expect(result.fileName).toBe('Untitled_2025-11-15.md')
    })

    it('should sanitize title for filename', async () => {
      const contentWithSpecialChars = {
        id: 'content-1',
        title: 'Test: Article / With @ Special # Chars!',
        content: 'Test content'
      }

      mockPrisma.content.findUnique.mockResolvedValue(contentWithSpecialChars)
      mockCitationManager.getCitations.mockResolvedValue([])
      mockPrisma.contentExport.create.mockResolvedValue({})

      const result = await exportService.exportContent('content-1', 'markdown')

      expect(result.fileName).toBe('Test__Article___With___Special___Chars__2025-11-15.md')
    })
  })

  describe('convertFormat', () => {
    it('should throw error for PDF format (not yet implemented)', async () => {
      await expect(exportService['convertFormat']('content', 'title', 'pdf'))
        .rejects.toThrow('PDF export is not yet supported. Please use Markdown or HTML format.')
    })

    it('should handle empty content', async () => {
      const result = await exportService['convertFormat']('', 'Empty', 'markdown')

      expect(result.content).toBe('')
      expect(result.fileName).toBe('Empty_2025-11-15.md')
      expect(result.fileSize).toBe(0)
    })

    it('should handle HTML conversion with complex markdown', async () => {
      const complexMarkdown = `# Header 1
## Header 2
**Bold text**
*Italic text*
[Link](https://example.com)
- List item 1
- List item 2

Paragraph with line break.
Another paragraph.`

      const result = await exportService['convertFormat'](complexMarkdown, 'Complex', 'html')

      expect(result.content).toContain('<h1>Header 1</h1>')
      expect(result.content).toContain('<h2>Header 2</h2>')
      expect(result.content).toContain('<strong>Bold text</strong>')
      expect(result.content).toContain('<em>Italic text</em>')
      expect(result.content).toContain('<a href="https://example.com">Link</a>')
      expect(result.content).toContain('<br>')
      expect(result.content).toContain('<p>')
      expect(result.fileName).toBe('Complex_2025-11-15.html')
    })
  })

  describe('markdownToHtml', () => {
    it('should convert basic markdown elements', () => {
      const markdown = `# Title
## Subtitle
**Bold**
*Italic*
[Link](url)
Normal paragraph.`

      const result = exportService['markdownToHtml'](markdown, 'Test Title')

      expect(result).toContain('<h1>Title</h1>')
      expect(result).toContain('<h2>Subtitle</h2>')
      expect(result).toContain('<strong>Bold</strong>')
      expect(result).toContain('<em>Italic</em>')
      expect(result).toContain('<a href="url">Link</a>')
      expect(result).toContain('<p>Normal paragraph.</p>')
      expect(result).toContain('<title>Test Title</title>')
    })

    it('should handle line breaks and paragraphs', () => {
      const markdown = `Line 1
Line 2

New paragraph.`

      const result = exportService['markdownToHtml'](markdown, 'Test')

      expect(result).toContain('Line 1<br>Line 2</p><p>New paragraph.')
    })

    it('should include proper HTML structure', () => {
      const result = exportService['markdownToHtml']('content', 'Title')

      expect(result).toContain('<!DOCTYPE html>')
      expect(result).toContain('<html lang="en">')
      expect(result).toContain('<head>')
      expect(result).toContain('<meta charset="UTF-8">')
      expect(result).toContain('<title>Title</title>')
      expect(result).toContain('<style>')
      expect(result).toContain('<body>')
      expect(result).toContain('<h1>Title</h1>')
      expect(result).toContain('content')
      expect(result).toContain('</body>')
      expect(result).toContain('</html>')
    })
  })

  describe('saveExportRecord', () => {
    it('should save export record successfully', async () => {
      const mockRecord = {
        id: 'export-1',
        contentId: 'content-1',
        format: 'markdown',
        fileName: 'test.md',
        fileSize: 100,
        exportedAt: new Date()
      }

      mockPrisma.contentExport.create.mockResolvedValue(mockRecord)

      await exportService['saveExportRecord']('content-1', 'markdown', 'test.md', 100)

      expect(mockPrisma.contentExport.create).toHaveBeenCalledWith({
        data: {
          contentId: 'content-1',
          format: 'markdown',
          fileName: 'test.md',
          fileSize: 100,
          exportedAt: expect.any(Date)
        }
      })
    })

    it('should handle database errors during save', async () => {
      mockPrisma.contentExport.create.mockRejectedValue(new Error('Save failed'))

      await expect(exportService['saveExportRecord']('content-1', 'markdown', 'test.md', 100))
        .rejects.toThrow('Save failed')
    })
  })

  describe('getExportHistory', () => {
    it('should return export history ordered by date', async () => {
      const mockExports = [
        {
          id: 'export-1',
          contentId: 'content-1',
          format: 'markdown',
          fileName: 'test-1.md',
          fileSize: 100,
          exportedAt: new Date('2023-11-15T10:00:00Z')
        },
        {
          id: 'export-2',
          contentId: 'content-1',
          format: 'html',
          fileName: 'test-2.html',
          fileSize: 200,
          exportedAt: new Date('2023-11-15T11:00:00Z')
        }
      ]

      mockPrisma.contentExport.findMany.mockResolvedValue(mockExports)

      const result = await exportService.getExportHistory('content-1')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'export-1',
        format: 'markdown',
        fileName: 'test-1.md',
        fileSize: 100,
        exportedAt: new Date('2023-11-15T10:00:00Z')
      })
      expect(result[1]).toEqual({
        id: 'export-2',
        format: 'html',
        fileName: 'test-2.html',
        fileSize: 200,
        exportedAt: new Date('2023-11-15T11:00:00Z')
      })

      expect(mockPrisma.contentExport.findMany).toHaveBeenCalledWith({
        where: { contentId: 'content-1' },
        orderBy: { exportedAt: 'desc' }
      })
    })

    it('should return empty array when no exports found', async () => {
      mockPrisma.contentExport.findMany.mockResolvedValue([])

      const result = await exportService.getExportHistory('content-1')

      expect(result).toEqual([])
    })

    it('should handle database errors', async () => {
      mockPrisma.contentExport.findMany.mockRejectedValue(new Error('Query failed'))

      await expect(exportService.getExportHistory('content-1'))
        .rejects.toThrow('Query failed')
    })
  })
})