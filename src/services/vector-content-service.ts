import { vectorOps, VectorOperations } from '@/lib/qdrant/operations/vector-ops';
import { performanceMonitor, VectorPerformanceMonitor } from '@/lib/qdrant/monitoring/performance';
import { collectionManager, CollectionManager } from '@/lib/qdrant/core/collection';

export interface ContentChunk {
  id: number;
  feedItemId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  metadata: {
    sourceUrl?: string;
    publishedAt?: Date;
    feedTitle?: string;
    author?: string;
    tags?: string[];
    quality: number; // 0-1 score
    language?: string;
    wordCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchOptions {
  limit?: number;
  minScore?: number;
  maxScore?: number;
  feedFilter?: string[];
  dateFilter?: {
    from?: Date;
    to?: Date;
  };
  qualityFilter?: {
    min?: number;
    max?: number;
  };
  tagsFilter?: string[];
  languageFilter?: string[];
}

export interface SearchResult {
  chunk: ContentChunk;
  score: number;
  highlights?: string[];
}

export class VectorContentService {
  private vectorOps: VectorOperations;
  private performanceMonitor: VectorPerformanceMonitor;

  constructor() {
    this.vectorOps = vectorOps;
    this.performanceMonitor = performanceMonitor;
  }

  async initialize(): Promise<void> {
    const startTime = Date.now();

    try {
      await collectionManager.ensureCollection();
      this.performanceMonitor.recordMetric('service_initialize', Date.now() - startTime, true);
    } catch (error) {
      this.performanceMonitor.recordMetric('service_initialize', Date.now() - startTime, false, {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async storeContentChunk(chunk: ContentChunk): Promise<void> {
    const startTime = Date.now();

    try {
      this.validateContentChunk(chunk);

      const point = {
        id: chunk.id,
        vector: chunk.embedding,
        payload: {
          feedItemId: chunk.feedItemId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          sourceUrl: chunk.metadata.sourceUrl,
          publishedAt: chunk.metadata.publishedAt?.toISOString(),
          feedTitle: chunk.metadata.feedTitle,
          author: chunk.metadata.author,
          tags: chunk.metadata.tags,
          quality: chunk.metadata.quality,
          language: chunk.metadata.language,
          wordCount: chunk.metadata.wordCount,
          createdAt: chunk.createdAt.toISOString(),
          updatedAt: chunk.updatedAt.toISOString()
        }
      };

      await this.vectorOps.storeVector(point);
      this.performanceMonitor.recordMetric('store_chunk', Date.now() - startTime, true, {
        chunkId: chunk.id,
        feedItemId: chunk.feedItemId,
        wordCount: chunk.metadata.wordCount
      });
    } catch (error) {
      this.performanceMonitor.recordMetric('store_chunk', Date.now() - startTime, false, {
        chunkId: chunk.id,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async storeContentChunks(chunks: ContentChunk[]): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const startTime = Date.now();

    try {
      // Validate all chunks first
      const validationErrors: string[] = [];
      chunks.forEach((chunk, index) => {
        try {
          this.validateContentChunk(chunk);
        } catch (error) {
          validationErrors.push(`Chunk ${index}: ${(error as Error).message}`);
        }
      });

      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join('; ')}`);
      }

      const points = chunks.map(chunk => ({
        id: chunk.id,
        vector: chunk.embedding,
        payload: {
          feedItemId: chunk.feedItemId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          sourceUrl: chunk.metadata.sourceUrl,
          publishedAt: chunk.metadata.publishedAt?.toISOString(),
          feedTitle: chunk.metadata.feedTitle,
          author: chunk.metadata.author,
          tags: chunk.metadata.tags,
          quality: chunk.metadata.quality,
          language: chunk.metadata.language,
          wordCount: chunk.metadata.wordCount,
          createdAt: chunk.createdAt.toISOString(),
          updatedAt: chunk.updatedAt.toISOString()
        }
      }));

      const result = await this.vectorOps.storeVectors(points);

      const response = {
        successful: result.processedCount,
        failed: result.totalCount - result.processedCount,
        errors: result.errors || []
      };

      this.performanceMonitor.recordMetric('store_chunks_batch', Date.now() - startTime, result.status === 'completed', {
        batchSize: chunks.length,
        successful: response.successful,
        failed: response.failed,
        operationId: result.operationId
      });

      return response;

    } catch (error) {
      this.performanceMonitor.recordMetric('store_chunks_batch', Date.now() - startTime, false, {
        batchSize: chunks.length,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async searchSimilarContent(
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const startTime = Date.now();

    try {
      this.validateEmbedding(queryEmbedding);

      // Build filter from search options
      const filter = this.buildSearchFilter(options);

      const searchRequest = {
        vector: queryEmbedding,
        limit: options.limit || 10,
        scoreThreshold: options.minScore || 0.1,
        filter,
        withPayload: true,
        withVector: false,
        searchParams: {
          hnswEf: 128 // Balanced search quality vs speed
        }
      };

      const rawResults = await this.vectorOps.searchVectors(searchRequest);

      const results: SearchResult[] = rawResults.map(result => ({
        chunk: this.payloadToContentChunk(result.id, result.payload),
        score: result.score,
        highlights: result.payload?.content ? this.generateHighlights(result.payload.content, queryEmbedding) : []
      }));

      // Apply post-search filtering
      let filteredResults = results;
      if (options.maxScore) {
        filteredResults = filteredResults.filter(r => r.score <= options.maxScore!);
      }

      // Sort by score descending
      filteredResults.sort((a, b) => b.score - a.score);

      this.performanceMonitor.recordMetric('search_similar', Date.now() - startTime, true, {
        resultsCount: filteredResults.length,
        limit: options.limit,
        minScore: options.minScore,
        hasFilters: Object.keys(options).some(key => key.endsWith('Filter'))
      });

      return filteredResults;

    } catch (error) {
      this.performanceMonitor.recordMetric('search_similar', Date.now() - startTime, false, {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async deleteContentChunks(chunkIds: number[]): Promise<void> {
    const startTime = Date.now();

    try {
      await this.vectorOps.deleteVectors(chunkIds);
      this.performanceMonitor.recordMetric('delete_chunks', Date.now() - startTime, true, {
        count: chunkIds.length
      });
    } catch (error) {
      this.performanceMonitor.recordMetric('delete_chunks', Date.now() - startTime, false, {
        count: chunkIds.length,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async getContentChunk(chunkId: number): Promise<ContentChunk | null> {
    const startTime = Date.now();

    try {
      const point = await this.vectorOps.getVector(chunkId, false);
      if (!point) return null;

      const chunk = this.payloadToContentChunk(point.id, point.payload);
      this.performanceMonitor.recordMetric('get_chunk', Date.now() - startTime, true, {
        chunkId
      });

      return chunk;
    } catch (error) {
      this.performanceMonitor.recordMetric('get_chunk', Date.now() - startTime, false, {
        chunkId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async updateContentMetadata(chunkId: number, metadata: Partial<ContentChunk['metadata']>): Promise<void> {
    const startTime = Date.now();

    try {
      // Get existing payload
      const existing = await this.vectorOps.getVector(chunkId, false);
      if (!existing) {
        throw new Error(`Chunk ${chunkId} not found`);
      }

      // Merge metadata
      const updatedPayload = {
        ...existing.payload,
        ...metadata,
        updatedAt: new Date().toISOString()
      };

      await this.vectorOps.updatePayload(chunkId, updatedPayload);
      this.performanceMonitor.recordMetric('update_metadata', Date.now() - startTime, true, {
        chunkId,
        fieldsUpdated: Object.keys(metadata)
      });
    } catch (error) {
      this.performanceMonitor.recordMetric('update_metadata', Date.now() - startTime, false, {
        chunkId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async getServiceHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    collection: any;
    performance: any;
    alerts: string[];
  }> {
    try {
      const collection = await collectionManager.getCollectionInfo(CollectionManager.PRODUCTION_CONFIG.name);
      const performance = this.performanceMonitor.getHealthMetrics();

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (performance.overallHealth === 'unhealthy' || collection.status !== 'green') {
        status = 'unhealthy';
      } else if (performance.overallHealth === 'degraded' || performance.alerts.length > 0) {
        status = 'degraded';
      }

      return {
        status,
        collection,
        performance,
        alerts: performance.alerts
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        collection: null,
        performance: null,
        alerts: [`Health check failed: ${(error as Error).message}`]
      };
    }
  }

  // Private helper methods
  private validateContentChunk(chunk: ContentChunk): void {
    if (!chunk.id) throw new Error('Chunk ID is required');
    if (!chunk.feedItemId) throw new Error('Feed item ID is required');
    if (chunk.chunkIndex < 0) throw new Error('Chunk index must be non-negative');
    if (!chunk.content) throw new Error('Content is required');
    if (!chunk.embedding || chunk.embedding.length !== 2560) {
      throw new Error('Valid 2560-dimensional embedding is required');
    }
    if (chunk.metadata.quality < 0 || chunk.metadata.quality > 1) {
      throw new Error('Quality score must be between 0 and 1');
    }
  }

  private validateEmbedding(embedding: number[]): void {
    if (!Array.isArray(embedding) || embedding.length !== 2560) {
      throw new Error('Query embedding must be a 2560-dimensional array');
    }
  }

  private buildSearchFilter(options: SearchOptions): Record<string, any> {
    const filter: Record<string, any> = {};

    if (options.feedFilter?.length) {
      filter.feedItemId = { in: options.feedFilter };
    }

    if (options.qualityFilter) {
      if (options.qualityFilter.min !== undefined) {
        filter.quality = { gte: options.qualityFilter.min };
      }
      if (options.qualityFilter.max !== undefined) {
        filter.quality = { ...filter.quality, lte: options.qualityFilter.max };
      }
    }

    if (options.languageFilter) {
      filter.language = options.languageFilter;
    }

    // Date filtering would require more complex filter logic
    // Tags filtering would also need special handling

    return filter;
  }

  private payloadToContentChunk(id: string | number, payload: any): ContentChunk {
    return {
      id: typeof id === 'string' ? parseInt(id) : id,
      feedItemId: payload.feedItemId,
      chunkIndex: payload.chunkIndex,
      content: payload.content,
      embedding: [], // Not stored in payload
      metadata: {
        sourceUrl: payload.sourceUrl,
        publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : undefined,
        feedTitle: payload.feedTitle,
        author: payload.author,
        tags: payload.tags,
        quality: payload.quality,
        language: payload.language,
        wordCount: payload.wordCount
      },
      createdAt: new Date(payload.createdAt),
      updatedAt: new Date(payload.updatedAt)
    };
  }

  private generateHighlights(content: string, queryEmbedding: number[]): string[] {
    // Simple keyword-based highlighting (could be enhanced with ML)
    // This is a placeholder for more sophisticated highlighting logic
    const words = content.split(/\s+/);
    const highlights: string[] = [];

    // Extract potentially relevant phrases (this would be improved with actual semantic analysis)
    for (let i = 0; i < words.length - 2; i++) {
      const phrase = words.slice(i, i + 3).join(' ');
      if (phrase.length > 20 && phrase.length < 100) {
        highlights.push(phrase);
      }
    }

    return highlights.slice(0, 3); // Return top 3 highlights
  }
}

// Export singleton instance
export const vectorContentService = new VectorContentService();