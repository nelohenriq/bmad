import { NextRequest } from 'next/server'
import { POST } from '@/app/api/content/[contentId]/export/route'

// Mock ExportService
jest.mock('@/lib/export/exportService', () => ({
  ExportService: jest.fn().mockImplementation(() => ({
    exportContent: jest.fn()
  }))
}))

describe('/api/content/[contentId]/export', () => {
  let mockExportService: any

  beforeEach(() => {
    jest.clearAllMocks()
    const ExportServiceMock = require('@/lib/export/exportService').ExportService
    mockExportService = new ExportServiceMock()
  })

  describe('POST', () => {
    const mockExportResult = {
      content: '# Test Content\n\nThis is test content.',
      fileName: 'Test_Content_2025-11-15.md',
      mimeType: 'text/markdown',
      fileSize: 42
    }

    it('should export content in markdown format successfully', async () => {
      mockExportService.exportContent.mockResolvedValue(mockExportResult)

      const requestBody = {
        format: 'markdown'
      }

      const request = new NextRequest(
        'http://localhost:3000/api/content/content-123/export',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await POST(request, { params: { contentId: 'content-123' } })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/markdown')
      expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="Test_Content_2025-11-15.md"')

      const responseText = await response.text()
      expect(responseText).toBe(mockExportResult.content)

      expect(mockExportService.exportContent).toHaveBeenCalledWith(
        'content-123',
        'markdown',
        {}
      )
    })

    it('should export content in HTML format successfully', async () => {
      const htmlResult = {
        ...mockExportResult,
        content: '<!DOCTYPE html><html><head><title>Test Content</title></head><body><h1>Test Content</h1><p>This is test content.</p></body></html>',
        fileName: 'Test_Content_2025-11-15.html',
        mimeType: 'text/html'
      }

      mockExportService.exportContent.mockResolvedValue(htmlResult)

      const requestBody = {
        format: 'html'
      }

      const request = new NextRequest(
        'http://localhost:3000/api/content/content-123/export',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await POST(request, { params: { contentId: 'content-123' } })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/html')
      expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="Test_Content_2025-11-15.html"')

      const responseText = await response.text()
      expect(responseText).toBe(htmlResult.content)
    })

    it('should export content with citations when requested', async () => {
      mockExportService.exportContent.mockResolvedValue(mockExportResult)

      const requestBody = {
        format: 'markdown',
        includeCitations: true,
        citationStyle: 'APA'
      }

      const request = new NextRequest(
        'http://localhost:3000/api/content/content-123/export',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await POST(request, { params: { contentId: 'content-123' } })

      expect(response.status).toBe(200)
      expect(mockExportService.exportContent).toHaveBeenCalledWith(
        'content-123',
        'markdown',
        {
          includeCitations: true,
          citationStyle: 'APA'
        }
      )
    })

    it('should handle validation errors for invalid format', async () => {
      const requestBody = {
        format: 'invalid'
      }

      const request = new NextRequest(
        'http://localhost:3000/api/content/content-123/export',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await POST(request, { params: { contentId: 'content-123' } })
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid request data')
      expect(result.details).toBeDefined()

      expect(mockExportService.exportContent).not.toHaveBeenCalled()
    })

    it('should handle validation errors for invalid citation style', async () => {
      const requestBody = {
        format: 'markdown',
        citationStyle: 'invalid'
      }

      const request = new NextRequest(
        'http://localhost:3000/api/content/content-123/export',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await POST(request, { params: { contentId: 'content-123' } })
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid request data')
      expect(result.details).toBeDefined()

      expect(mockExportService.exportContent).not.toHaveBeenCalled()
    })

    it('should handle export service errors', async () => {
      mockExportService.exportContent.mockRejectedValue(new Error('Content not found'))

      const requestBody = {
        format: 'markdown'
      }

      const request = new NextRequest(
        'http://localhost:3000/api/content/content-123/export',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await POST(request, { params: { contentId: 'content-123' } })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Failed to export content')

      expect(mockExportService.exportContent).toHaveBeenCalledWith(
        'content-123',
        'markdown',
        {}
      )
    })

    it('should handle malformed JSON in request body', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/content/content-123/export',
        {
          method: 'POST',
          body: 'invalid json',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await POST(request, { params: { contentId: 'content-123' } })
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid request data')

      expect(mockExportService.exportContent).not.toHaveBeenCalled()
    })

    it('should default to not including citations when not specified', async () => {
      mockExportService.exportContent.mockResolvedValue(mockExportResult)

      const requestBody = {
        format: 'markdown'
      }

      const request = new NextRequest(
        'http://localhost:3000/api/content/content-123/export',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await POST(request, { params: { contentId: 'content-123' } })

      expect(response.status).toBe(200)
      expect(mockExportService.exportContent).toHaveBeenCalledWith(
        'content-123',
        'markdown',
        {}
      )
    })

    it('should pass through citation style when provided', async () => {
      mockExportService.exportContent.mockResolvedValue(mockExportResult)

      const requestBody = {
        format: 'html',
        includeCitations: true,
        citationStyle: 'MLA'
      }

      const request = new NextRequest(
        'http://localhost:3000/api/content/content-123/export',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const response = await POST(request, { params: { contentId: 'content-123' } })

      expect(response.status).toBe(200)
      expect(mockExportService.exportContent).toHaveBeenCalledWith(
        'content-123',
        'html',
        {
          includeCitations: true,
          citationStyle: 'MLA'
        }
      )
    })
  })
})