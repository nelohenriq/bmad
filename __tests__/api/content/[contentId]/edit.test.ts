import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/content/[contentId]/edit/route';
import { prisma } from '@/services/database/prisma';

// Mock Prisma
jest.mock('@/services/database/prisma', () => ({
  prisma: {
    content: {
      findUnique: jest.fn(),
      update: jest.fn()
    }
  }
}));

describe('/api/content/[contentId]/edit', () => {
  const mockContentId = 'test-content-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('returns content data when found', async () => {
      const mockContent = {
        id: mockContentId,
        prompt: '<p>Edited content</p>',
        outline: 'Original outline',
        updatedAt: new Date('2025-11-14T10:00:00Z'),
        topic: { id: 'topic-1', name: 'Test Topic' }
      };

      (prisma.content.findUnique as jest.Mock).mockResolvedValue(mockContent);

      const request = new NextRequest('http://localhost:3000/api/content/test-content-id/edit');
      const response = await GET(request, { params: { contentId: mockContentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content).toBe('<p>Edited content</p>');
      expect(data.originalContent).toBe('Original outline');
      expect(data.topic).toEqual(mockContent.topic);
    });

    it('returns 404 when content not found', async () => {
      (prisma.content.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/content/test-content-id/edit');
      const response = await GET(request, { params: { contentId: mockContentId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Content not found');
    });

    it('falls back to content field when prompt is empty', async () => {
      const mockContent = {
        id: mockContentId,
        prompt: null,
        content: 'Original content',
        outline: 'Original outline',
        updatedAt: new Date(),
        topic: null
      };

      (prisma.content.findUnique as jest.Mock).mockResolvedValue(mockContent);

      const request = new NextRequest('http://localhost:3000/api/content/test-content-id/edit');
      const response = await GET(request, { params: { contentId: mockContentId } });
      const data = await response.json();

      expect(data.content).toBe('Original content');
    });
  });

  describe('PUT', () => {
    it('updates content successfully', async () => {
      const mockUpdatedContent = {
        id: mockContentId,
        updatedAt: new Date('2025-11-14T11:00:00Z')
      };

      (prisma.content.update as jest.Mock).mockResolvedValue(mockUpdatedContent);

      const request = new NextRequest('http://localhost:3000/api/content/test-content-id/edit', {
        method: 'PUT',
        body: JSON.stringify({
          content: '<p>Updated content</p>',
          changes: [],
          autoSave: false
        })
      });

      const response = await PUT(request, { params: { contentId: mockContentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.contentId).toBe(mockContentId);
      expect(data.autoSave).toBe(false);
    });

    it('handles auto-save requests', async () => {
      const mockUpdatedContent = {
        id: mockContentId,
        updatedAt: new Date()
      };

      (prisma.content.update as jest.Mock).mockResolvedValue(mockUpdatedContent);

      const request = new NextRequest('http://localhost:3000/api/content/test-content-id/edit', {
        method: 'PUT',
        body: JSON.stringify({
          content: '<p>Auto-saved content</p>',
          changes: [{ type: 'modify', position: 0, length: 10 }],
          autoSave: true
        })
      });

      const response = await PUT(request, { params: { contentId: mockContentId } });
      const data = await response.json();

      expect(data.autoSave).toBe(true);
      expect(data.changesCount).toBe(1);
    });

    it('validates request data', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/test-content-id/edit', {
        method: 'PUT',
        body: JSON.stringify({
          invalidField: 'value'
        })
      });

      const response = await PUT(request, { params: { contentId: mockContentId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('handles database errors', async () => {
      (prisma.content.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/content/test-content-id/edit', {
        method: 'PUT',
        body: JSON.stringify({
          content: '<p>Content</p>',
          changes: []
        })
      });

      const response = await PUT(request, { params: { contentId: mockContentId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to save content');
    });
  });
});