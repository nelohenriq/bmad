import { ContentOutlineService, BlogOutline } from '@/services/content/contentOutlineService';
import { prisma } from '@/services/database/prisma';

// Mock the OllamaClient
jest.mock('@/services/ai/ollamaClient', () => ({
  OllamaClient: jest.fn().mockImplementation(() => ({
    generateContent: jest.fn(),
  })),
}));

// Mock Prisma
jest.mock('@/services/database/prisma', () => ({
  prisma: {
    topic: {
      findUnique: jest.fn(),
    },
  },
}));

describe('ContentOutlineService', () => {
  let service: ContentOutlineService;
  let mockOllamaClient: any;
  let mockPrisma: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Get the mocked OllamaClient instance
    const { OllamaClient } = require('@/services/ai/ollamaClient');
    mockOllamaClient = new OllamaClient();
    service = new ContentOutlineService();

    // Replace the service's ollamaClient with our mock
    (service as any).ollamaClient = mockOllamaClient;

    mockPrisma = require('@/services/database/prisma').prisma;
  });

  describe('generateOutline', () => {
    const mockTopic = {
      id: 'topic-1',
      name: 'Test Topic',
      description: 'A test topic for outline generation',
      contentAngles: [
        {
          id: 'angle-1',
          title: 'Angle 1',
          description: 'Description of angle 1',
          keywords: 'keyword1, keyword2',
        },
        {
          id: 'angle-2',
          title: 'Angle 2',
          description: 'Description of angle 2',
          keywords: 'keyword3, keyword4',
        },
      ],
    };

    const mockRequest = {
      topicId: 'topic-1',
      angleIds: ['angle-1'],
      style: 'standard' as const,
      length: 'medium' as const,
    };

    it('should generate a valid outline for approved topic', async () => {
      // Mock successful topic fetch
      mockPrisma.topic.findUnique.mockResolvedValue(mockTopic);

      // Mock successful LLM response
      const mockLLMResponse = JSON.stringify({
        title: 'Test Blog Post Title',
        introduction: {
          title: 'Introduction',
          content: 'This is an introduction to the topic',
          keyPoints: ['Point 1', 'Point 2'],
        },
        body: [
          {
            title: 'Main Section',
            content: 'This is the main content section',
            keyPoints: ['Key point 1', 'Key point 2'],
          },
        ],
        conclusion: {
          title: 'Conclusion',
          content: 'This is the conclusion',
          keyPoints: ['Final point'],
        },
      });

      mockOllamaClient.generateContent.mockResolvedValue(mockLLMResponse);

      const result = await service.generateOutline(mockRequest);

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Blog Post Title');
      expect(result.introduction).toBeDefined();
      expect(result.body).toHaveLength(1);
      expect(result.conclusion).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.confidence).toBeGreaterThan(0);
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for non-existent topic', async () => {
      mockPrisma.topic.findUnique.mockResolvedValue(null);

      await expect(service.generateOutline(mockRequest)).rejects.toThrow('Topic not found');
    });

    it('should handle LLM response parsing errors gracefully', async () => {
      mockPrisma.topic.findUnique.mockResolvedValue(mockTopic);
      mockOllamaClient.generateContent.mockResolvedValue('Invalid JSON response');

      const result = await service.generateOutline(mockRequest);

      // Should return fallback outline
      expect(result).toBeDefined();
      expect(result.title).toContain('Understanding');
      expect(result.introduction).toBeDefined();
      expect(result.body).toHaveLength(2); // Uses both angles from mockTopic
      expect(result.conclusion).toBeDefined();
    });

    it('should incorporate content angles in outline generation', async () => {
      mockPrisma.topic.findUnique.mockResolvedValue(mockTopic);

      const mockLLMResponse = JSON.stringify({
        title: 'Angle-Incorporated Title',
        introduction: {
          title: 'Introduction',
          content: 'Content with angle 1 and angle 2 references',
          keyPoints: ['Angle 1 insights', 'Angle 2 perspectives'],
        },
        body: [
          {
            title: 'Angle 1 Deep Dive',
            content: 'Exploring angle 1 in detail',
            keyPoints: ['Angle 1 point 1', 'Angle 1 point 2'],
          },
        ],
        conclusion: {
          title: 'Conclusion',
          content: 'Summarizing angle-based insights',
          keyPoints: ['Integrated perspective'],
        },
      });

      mockOllamaClient.generateContent.mockResolvedValue(mockLLMResponse);

      const result = await service.generateOutline({
        ...mockRequest,
        angleIds: ['angle-1', 'angle-2'],
      });

      expect(result.title).toBe('Angle-Incorporated Title');
      expect(result.metadata.confidence).toBeGreaterThan(0.5); // Higher confidence due to angle incorporation
    });
  });

  describe('validateOutline', () => {
    it('should validate complete outline successfully', () => {
      const validOutline: BlogOutline = {
        title: 'Valid Title',
        introduction: {
          title: 'Introduction',
          content: 'This is a sufficiently long introduction with enough content to pass validation requirements.',
          keyPoints: ['Point 1', 'Point 2'],
        },
        body: [
          {
            title: 'Section 1',
            content: 'This is body content that meets the minimum length requirements for validation.',
            keyPoints: ['Key point'],
          },
          {
            title: 'Section 2',
            content: 'Another body section with adequate content length.',
            keyPoints: ['Another point'],
          },
        ],
        conclusion: {
          title: 'Conclusion',
          content: 'This conclusion has enough content to pass the validation checks.',
          keyPoints: ['Final point'],
        },
        metadata: {
          generatedAt: new Date(),
          model: 'test-model',
          confidence: 0.8,
          processingTime: 1000,
        },
      };

      const result = service.validateOutline(validOutline);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should identify validation issues', () => {
      const invalidOutline: BlogOutline = {
        title: '', // Empty title
        introduction: {
          title: 'Introduction',
          content: 'Too short', // Too short
          keyPoints: [],
        },
        body: [], // No body sections
        conclusion: {
          title: 'Conclusion',
          content: 'Also too short', // Too short
          keyPoints: [],
        },
        metadata: {
          generatedAt: new Date(),
          model: 'test-model',
          confidence: 0.8,
          processingTime: 1000,
        },
      };

      const result = service.validateOutline(invalidOutline);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing or empty title');
      expect(result.issues).toContain('Introduction too short (minimum 50 characters)');
      expect(result.issues).toContain('Missing body sections');
      expect(result.issues).toContain('Conclusion too short (minimum 50 characters)');
    });
  });

  describe('calculateOutlineConfidence', () => {
    it('should calculate confidence based on outline quality', () => {
      const outline: Omit<BlogOutline, 'metadata'> = {
        title: 'Good Title with Keywords',
        introduction: {
          title: 'Introduction',
          content: 'This is a comprehensive introduction with sufficient length and detail.',
          keyPoints: ['Point 1', 'Point 2'],
        },
        body: [
          {
            title: 'Section 1',
            content: 'Good body content',
            keyPoints: ['Key point'],
          },
          {
            title: 'Section 2',
            content: 'More body content',
            keyPoints: ['Another point'],
          },
          {
            title: 'Section 3',
            content: 'Even more content',
            keyPoints: ['Third point'],
          },
        ],
        conclusion: {
          title: 'Conclusion',
          content: 'This is a comprehensive conclusion with adequate length.',
          keyPoints: ['Final point'],
        },
      };

      const topic = {
        contentAngles: [
          { keywords: 'keyword1, keyword2' },
          { keywords: 'keyword3, keyword4' },
        ],
      };

      const confidence = (service as any).calculateOutlineConfidence(outline, topic);

      expect(confidence).toBeGreaterThan(0.5);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });
  });
});