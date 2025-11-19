import { OllamaClient } from '../ai/ollamaClient';
import { prisma } from '../database/prisma';

export interface BlogPostGenerationRequest {
  outlineId: string;
  style?: 'professional' | 'conversational' | 'educational' | 'promotional';
  length?: 'short' | 'medium' | 'long';
  tone?: 'formal' | 'casual' | 'enthusiastic' | 'analytical';
}

export interface BlogPostSection {
  title: string;
  content: string;
  wordCount: number;
  keyPoints?: string[];
}

export interface BlogPost {
  title: string;
  content: string;
  wordCount: number;
  readingTime: number;
  sections: BlogPostSection[];
  metadata: {
    generatedAt: Date;
    model: string;
    confidence: number;
    processingTime: number;
    outlineId: string;
    style: string;
    length: string;
    tone: string;
  };
}

export class ContentWritingService {
  private ollamaClient: OllamaClient;

  constructor() {
    this.ollamaClient = new OllamaClient();
  }

  /**
   * Generate a complete blog post from an approved outline
   */
  async generateBlogPost(request: BlogPostGenerationRequest): Promise<BlogPost> {
    const startTime = Date.now();

    try {
      // Fetch outline and related data
      const outline = await prisma.content.findUnique({
        where: { id: request.outlineId },
        include: {
          topic: {
            include: {
              contentAngles: true
            }
          }
        }
      });

      if (!outline) {
        throw new Error(`Outline not found: ${request.outlineId}`);
      }

      if (!outline.outline) {
        throw new Error(`Outline content not available for: ${request.outlineId}`);
      }

      // Parse outline structure
      const outlineData = JSON.parse(outline.outline);

      // Generate content for each outline section
      const sections = await this.generateContentSections(outlineData, request);

      // Combine sections into complete blog post
      const fullContent = this.combineSectionsIntoPost(outlineData.title, sections);

      // Calculate metadata
      const wordCount = this.calculateWordCount(fullContent);
      const readingTime = Math.ceil(wordCount / 200); // Average reading speed
      const confidence = this.calculateContentConfidence(sections, outlineData);
      const processingTime = Date.now() - startTime;

      return {
        title: outlineData.title,
        content: fullContent,
        wordCount,
        readingTime,
        sections,
        metadata: {
          generatedAt: new Date(),
          model: 'llama2:7b',
          confidence,
          processingTime,
          outlineId: request.outlineId,
          style: request.style || 'professional',
          length: request.length || 'medium',
          tone: request.tone || 'formal'
        }
      };

    } catch (error) {
      console.error('Blog post generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Blog post generation failed: ${errorMessage}`);
    }
  }

  /**
   * Generate content for each outline section
   */
  private async generateContentSections(
    outlineData: any,
    request: BlogPostGenerationRequest
  ): Promise<BlogPostSection[]> {
    const sections: BlogPostSection[] = [];

    // Generate introduction
    if (outlineData.introduction) {
      const introContent = await this.generateSectionContent(
        'Introduction',
        outlineData.introduction,
        request,
        'introduction'
      );
      sections.push({
        title: outlineData.introduction.title,
        content: introContent,
        wordCount: this.calculateWordCount(introContent),
        keyPoints: outlineData.introduction.keyPoints || []
      });
    }

    // Generate body sections
    if (outlineData.body && outlineData.body.length > 0) {
      for (let i = 0; i < outlineData.body.length; i++) {
        const section = outlineData.body[i];
        const sectionContent = await this.generateSectionContent(
          `Body Section ${i + 1}`,
          section,
          request,
          'body'
        );
        sections.push({
          title: section.title,
          content: sectionContent,
          wordCount: this.calculateWordCount(sectionContent),
          keyPoints: section.keyPoints || []
        });
      }
    }

    // Generate conclusion
    if (outlineData.conclusion) {
      const conclusionContent = await this.generateSectionContent(
        'Conclusion',
        outlineData.conclusion,
        request,
        'conclusion'
      );
      sections.push({
        title: outlineData.conclusion.title,
        content: conclusionContent,
        wordCount: this.calculateWordCount(conclusionContent),
        keyPoints: outlineData.conclusion.keyPoints || []
      });
    }

    return sections;
  }

  /**
   * Generate content for a specific outline section
   */
  private async generateSectionContent(
    sectionType: string,
    sectionData: any,
    request: BlogPostGenerationRequest,
    sectionRole: string
  ): Promise<string> {
    const prompt = this.buildSectionPrompt(sectionType, sectionData, request, sectionRole);

    try {
      // Initialize Ollama client if not already done
      if (!this.ollamaClient.isInitialized()) {
        await this.ollamaClient.initialize();
      }
      
      const response = await this.ollamaClient.generateContent(prompt);
      return this.extractContentFromResponse(response);
    } catch (error) {
      console.warn(`Failed to generate ${sectionType} content, using fallback:`, error);
      return this.createFallbackContent(sectionData, sectionRole);
    }
  }

  /**
   * Build the content generation prompt for a section
   */
  private buildSectionPrompt(
    sectionType: string,
    sectionData: any,
    request: BlogPostGenerationRequest,
    sectionRole: string
  ): string {
    const style = request.style || 'professional';
    const length = request.length || 'medium';
    const tone = request.tone || 'formal';

    const lengthGuidelines = {
      short: '300-500 words',
      medium: '600-800 words',
      long: '1000-1200 words'
    };

    const sectionInstructions = {
      introduction: 'Hook the reader, provide context, and outline what will be covered',
      body: 'Provide detailed analysis, examples, and supporting evidence',
      conclusion: 'Summarize key points, provide final insights, and call to action'
    };

    return `Write a ${sectionType} section for a blog post.

Section Title: ${sectionData.title}
Section Description: ${sectionData.content}
Key Points to Cover: ${sectionData.keyPoints?.join(', ') || 'N/A'}

Writing Style: ${style}
Tone: ${tone}
Length: ${lengthGuidelines[length as keyof typeof lengthGuidelines]}

Instructions:
- Write in ${tone} tone suitable for ${style} content
- ${sectionInstructions[sectionRole as keyof typeof sectionInstructions]}
- Ensure content flows naturally and engages readers
- Include specific examples and practical insights
- Maintain consistency with the overall blog post theme
- Write clearly and concisely while being comprehensive

Generate only the section content without the title. Focus on creating engaging, informative prose that follows the description and key points provided.`;
  }

  /**
   * Extract clean content from LLM response
   */
  private extractContentFromResponse(response: string): string {
    // Remove any markdown formatting or extra text
    return response.trim();
  }

  /**
   * Create fallback content when LLM generation fails
   */
  private createFallbackContent(sectionData: any, sectionRole: string): string {
    const baseContent = sectionData.content || 'Content for this section';

    switch (sectionRole) {
      case 'introduction':
        return `${baseContent} This section introduces the main topic and sets the stage for the discussion that follows.`;
      case 'body':
        return `${baseContent} This section provides detailed analysis and insights into the topic, offering practical examples and key considerations.`;
      case 'conclusion':
        return `${baseContent} In conclusion, this section summarizes the main points and provides final thoughts on the topic.`;
      default:
        return baseContent;
    }
  }

  /**
   * Combine sections into a complete blog post
   */
  private combineSectionsIntoPost(title: string, sections: BlogPostSection[]): string {
    let fullContent = `# ${title}\n\n`;

    sections.forEach(section => {
      fullContent += `## ${section.title}\n\n${section.content}\n\n`;
    });

    return fullContent.trim();
  }

  /**
   * Calculate word count for content
   */
  private calculateWordCount(content: string): number {
    return content.trim().split(/\s+/).length;
  }

  /**
   * Calculate content confidence score
   */
  private calculateContentConfidence(sections: BlogPostSection[], outlineData: any): number {
    let score = 0.5; // Base score

    // Content length score
    const totalWords = sections.reduce((sum, section) => sum + section.wordCount, 0);
    if (totalWords > 1000) score += 0.2;
    else if (totalWords > 500) score += 0.1;

    // Section completeness score
    if (sections.length >= 3) score += 0.1; // Intro + at least 1 body + conclusion

    // Key points coverage (simplified check)
    const hasKeyPoints = sections.some(section => section.keyPoints && section.keyPoints.length > 0);
    if (hasKeyPoints) score += 0.1;

    // Outline adherence (basic check for title and structure)
    if (outlineData.title && sections.length > 0) score += 0.1;

    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Validate generated blog post
   */
  validateBlogPost(post: BlogPost): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check required fields
    if (!post.title?.trim()) {
      issues.push('Missing or empty title');
    }

    if (!post.content?.trim()) {
      issues.push('Missing or empty content');
    }

    if (!post.sections || post.sections.length === 0) {
      issues.push('Missing blog post sections');
    }

    // Check content quality
    if (post.wordCount < 300) {
      issues.push('Content too short (minimum 300 words)');
    }

    if (post.sections.length < 3) {
      issues.push('Insufficient sections (minimum introduction, body, conclusion)');
    }

    // Check metadata
    if (!post.metadata?.generatedAt) {
      issues.push('Missing generation timestamp');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}

export const contentWritingService = new ContentWritingService();