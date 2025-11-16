import { NextRequest } from 'next/server'
import { GET } from '@/app/api/content/[contentId]/exports/route'

// Mock ExportService
jest.mock('@/lib/export/exportService', () => ({
  ExportService: jest.fn().mockImplementation(() => ({
    getExportHistory: jest.fn()
  }))
}))

describe('/api/content/[id]/exports', () => {
  let mockExportService: any

  beforeEach(() => {
    jest.clearAllMocks()
    const ExportServiceMock = require('@/lib/export/exportService').ExportService
    mockExportService = new ExportServiceMock()
  })

  describe('GET', () => {
    const mockExportHistory = [
      {
        id: 'export-1',
        format: 'markdown',
        fileName: 'Test_Content_2025-11-15.md',
        fileSize: 150,
        exportedAt: new Date('2025-11-15T10:00:00Z')
      },
      {
        id: 'export-2',
        format: 'html',
        fileName: 'Test_Content_2025-11-15.html',
        fileSize: 250,
        exportedAt: new Date('2025-11-15T11:00:00Z')
      }
    ]

    it('should return export history successfully', async () => {
      mockExportService.getExportHistory.mockResolvedValue(mockExportHistory)

      const request = new NextRequest('http://localhost:3000/api/content/content-123/exports')
      const response = await GET(request, { params: { contentId: 'content-123' } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.exports).toHaveLength(2)
      expect(result.exports[0]).toEqual({
        id: 'export-1',
        format: 'markdown',
        fileName: 'Test_Content_2025-11-15.md',
        fileSize: 150,
        exportedAt: new Date('2025-11-15T10:00:00Z')
      })
      expect(result.exports[1]).toEqual({
        id: 'export-2',
        format: 'html',
        fileName: 'Test_Content_2025-11-15.html',
        fileSize: 250,
        exportedAt: new Date('2025-11-15T11:00:00Z')
      })

      expect(mockExportService.getExportHistory).toHaveBeenCalledWith('content-123')
    })

    it('should return empty array when no export history exists', async () => {
      mockExportService.getExportHistory.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/content/content-123/exports')
      const response = await GET(request, { params: { contentId: 'content-123' } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.exports).toEqual([])

      expect(mockExportService.getExportHistory).toHaveBeenCalledWith('content-123')
    })

    it('should handle export service errors', async () => {
      mockExportService.getExportHistory.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/content/content-123/exports')
      const response = await GET(request, { params: { contentId: 'content-123' } })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Failed to get export history')

      expect(mockExportService.getExportHistory).toHaveBeenCalledWith('content-123')
    })

    it('should return exports ordered by most recent first', async () => {
      const unorderedExports = [
        {
          id: 'export-1',
          format: 'markdown',
          fileName: 'Test_Content_2025-11-14.md',
          fileSize: 150,
          exportedAt: new Date('2025-11-14T10:00:00Z')
        },
        {
          id: 'export-2',
          format: 'html',
          fileName: 'Test_Content_2025-11-15.md',
          fileSize: 250,
          exportedAt: new Date('2025-11-15T10:00:00Z')
        },
        {
          id: 'export-3',
          format: 'markdown',
          fileName: 'Test_Content_2025-11-13.md',
          fileSize: 100,
          exportedAt: new Date('2025-11-13T10:00:00Z')
        }
      ]

      mockExportService.getExportHistory.mockResolvedValue(unorderedExports)

      const request = new NextRequest('http://localhost:3000/api/content/content-123/exports')
      const response = await GET(request, { params: { id: 'content-123' } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.exports).toHaveLength(3)
      // Should be ordered by exportedAt desc (most recent first)
      expect(result.exports[0].id).toBe('export-2') // 2025-11-15
      expect(result.exports[1].id).toBe('export-1') // 2025-11-14
      expect(result.exports[2].id).toBe('export-3') // 2025-11-13
    })

    it('should include all required fields in export records', async () => {
      const detailedExport = [{
        id: 'export-1',
        format: 'markdown',
        fileName: 'Test_Content_2025-11-15.md',
        fileSize: 150,
        exportedAt: new Date('2025-11-15T10:00:00Z')
      }]

      mockExportService.getExportHistory.mockResolvedValue(detailedExport)

      const request = new NextRequest('http://localhost:3000/api/content/content-123/exports')
      const response = await GET(request, { params: { id: 'content-123' } })
      const result = await response.json()

      expect(response.status).toBe(200)
      const exportRecord = result.exports[0]
      expect(exportRecord).toHaveProperty('id')
      expect(exportRecord).toHaveProperty('format')
      expect(exportRecord).toHaveProperty('fileName')
      expect(exportRecord).toHaveProperty('fileSize')
      expect(exportRecord).toHaveProperty('exportedAt')
      expect(exportRecord.exportedAt).toBeInstanceOf(Date)
    })

    it('should handle different content IDs correctly', async () => {
      mockExportService.getExportHistory.mockResolvedValue(mockExportHistory)

      const request = new NextRequest('http://localhost:3000/api/content/different-id/exports')
      const response = await GET(request, { params: { id: 'different-id' } })

      expect(response.status).toBe(200)
      expect(mockExportService.getExportHistory).toHaveBeenCalledWith('different-id')
    })
  })
})