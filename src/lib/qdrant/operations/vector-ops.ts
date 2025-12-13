import { getQdrantClient } from '../core/client';
import { collectionManager, CollectionManager } from '../core/collection';

export interface VectorPoint {
  id: number;
  vector: number[];
  payload?: Record<string, any>;
}

export interface SearchRequest {
  vector: number[];
  limit?: number;
  scoreThreshold?: number;
  filter?: Record<string, any>;
  withPayload?: boolean;
  withVector?: boolean;
  searchParams?: {
    hnswEf?: number;
    exact?: boolean;
  };
}

export interface SearchResult {
  id: string;
  score: number;
  payload?: Record<string, any>;
  vector?: number[];
}

export interface BatchOperationResult {
  operationId: string;
  status: 'completed' | 'partial' | 'failed';
  processedCount: number;
  totalCount: number;
  duration: number;
  errors?: string[];
}

export class VectorOperations {
  private client = getQdrantClient();
  private collectionName: string;

  constructor(collectionName: string = CollectionManager.PRODUCTION_CONFIG.name) {
    this.collectionName = collectionName;
  }

  // Optimized single vector storage
  async storeVector(point: VectorPoint): Promise<void> {
    this.validateVector(point.vector);

    try {
      await this.client.executeWithRetry(
        async () => {
          await this.client.getPooledClient().upsert(this.collectionName, {
            points: [{
              id: point.id,
              vector: point.vector,
              payload: point.payload || {}
            }]
          });
        },
        `Store vector ${point.id}`
      );
    } catch (error) {
      console.error(`Failed to store vector ${point.id}:`, error);
      throw error;
    }
  }

  // High-throughput batch operations
  async storeVectors(points: VectorPoint[], batchSize: number = 100): Promise<BatchOperationResult> {
    const operationId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Validate all vectors first
    points.forEach((point, index) => {
      try {
        this.validateVector(point.vector);
      } catch (error) {
        throw new Error(`Validation failed for point at index ${index}: ${(error as Error).message}`);
      }
    });

    const batches = this.chunkArray(points, batchSize);
    let processedCount = 0;
    const errors: string[] = [];

    console.log(`Starting batch operation ${operationId}: ${points.length} vectors in ${batches.length} batches`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchStartTime = Date.now();

      try {
        const qdrantPoints = batch.map(point => ({
          id: point.id,
          vector: point.vector,
          payload: point.payload || {}
        }));

        await this.client.executeWithRetry(
          async () => {
            await this.client.getPooledClient().upsert(this.collectionName, {
              points: qdrantPoints
            });
          },
          `Batch ${i + 1}/${batches.length} (${batch.length} vectors)`,
          2 // Fewer retries for batch operations
        );

        processedCount += batch.length;
        const batchDuration = Date.now() - batchStartTime;

        console.log(`✅ Batch ${i + 1}/${batches.length} completed: ${batch.length} vectors in ${batchDuration}ms`);

      } catch (error: any) {
        const errorMsg = `Batch ${i + 1} failed: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);

        // Continue with other batches unless it's a critical error
        if (error.message.includes('connection') || error.message.includes('timeout')) {
          break; // Stop on connection issues
        }
      }
    }

    const duration = Date.now() - startTime;
    const status: 'completed' | 'partial' | 'failed' =
      errors.length === 0 ? 'completed' :
      processedCount > 0 ? 'partial' : 'failed';

    const result: BatchOperationResult = {
      operationId,
      status,
      processedCount,
      totalCount: points.length,
      duration,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log(`📊 Batch operation ${operationId} ${status}: ${processedCount}/${points.length} vectors in ${duration}ms`);

    return result;
  }

  // Optimized similarity search
  async searchVectors(request: SearchRequest): Promise<SearchResult[]> {
    const {
      vector,
      limit = 10,
      scoreThreshold,
      filter,
      withPayload = true,
      withVector = false,
      searchParams = {}
    } = request;

    this.validateVector(vector);

    try {
      const searchRequest = {
        vector,
        limit,
        with_payload: withPayload,
        with_vector: withVector,
        score_threshold: scoreThreshold,
        filter: filter ? this.buildQdrantFilter(filter) : undefined,
        params: {
          hnsw_ef: searchParams.hnswEf || 128,
          exact: searchParams.exact || false
        }
      };

      const response = await this.client.executeWithRetry(
        async () => await this.client.getPooledClient().search(this.collectionName, searchRequest),
        `Search vectors (limit: ${limit})`
      );

      return response.map((result: any) => ({
        id: result.id.toString(),
        score: result.score,
        payload: result.payload,
        vector: result.vector
      }));

    } catch (error) {
      console.error('Vector search failed:', error);
      throw error;
    }
  }

  // Multi-vector search for ensemble methods
  async searchMultipleVectors(
    queries: SearchRequest[],
    combineResults: boolean = false
  ): Promise<SearchResult[][] | SearchResult[]> {
    const promises = queries.map(query => this.searchVectors(query));
    const results = await Promise.all(promises);

    if (!combineResults) {
      return results;
    }

    // Combine and deduplicate results
    const combined = new Map<string, SearchResult>();

    results.flat().forEach(result => {
      const existing = combined.get(result.id);
      if (!existing || result.score > existing.score) {
        combined.set(result.id, result);
      }
    });

    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, queries[0]?.limit || 10);
  }

  // Vector deletion operations
  async deleteVectors(vectorIds: number[]): Promise<void> {
    if (vectorIds.length === 0) return;

    try {
      await this.client.executeWithRetry(
        async () => {
          await this.client.getPooledClient().delete(this.collectionName, {
            points: vectorIds
          });
        },
        `Delete ${vectorIds.length} vectors`
      );
    } catch (error) {
      console.error(`Failed to delete vectors:`, error);
      throw error;
    }
  }

  // Payload update operations
  async updatePayload(vectorId: number, payload: Record<string, any>): Promise<void> {
    try {
      await this.client.executeWithRetry(
        async () => {
          await this.client.getPooledClient().setPayload(this.collectionName, {
            payload,
            points: [vectorId]
          });
        },
        `Update payload for vector ${vectorId}`
      );
    } catch (error) {
      console.error(`Failed to update payload for vector ${vectorId}:`, error);
      throw error;
    }
  }

  // Vector retrieval
  async getVector(vectorId: number, withVector: boolean = true): Promise<VectorPoint | null> {
    try {
      const response = await this.client.executeWithRetry(
        async () => await this.client.getPooledClient().retrieve(this.collectionName, {
          ids: [vectorId],
          with_payload: true,
          with_vector: withVector
        }),
        `Retrieve vector ${vectorId}`
      );

      if (response.length === 0) return null;

      const point = response[0];
      const vector = point.vector;
      return {
        id: point.id as number,
        vector: (Array.isArray(vector) && vector.every(v => typeof v === 'number')) ? vector as number[] : [],
        payload: point.payload || {}
      };
    } catch (error) {
      console.error(`Failed to retrieve vector ${vectorId}:`, error);
      throw error;
    }
  }

  // Utility methods
  private validateVector(vector: number[]): void {
    if (!Array.isArray(vector)) {
      throw new Error('Vector must be an array of numbers');
    }

    if (vector.length !== 384) {
      throw new Error(`Vector must have exactly 384 dimensions, got ${vector.length}`);
    }

    if (!vector.every(n => typeof n === 'number' && !isNaN(n))) {
      throw new Error('All vector elements must be valid numbers');
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private buildQdrantFilter(filter: Record<string, any>) {
    const conditions = Object.entries(filter).map(([key, value]) => {
      if (value.in) {
        return {
          key,
          match: { any: value.in }
        };
      } else if (value.gte !== undefined || value.lte !== undefined) {
        return {
          key,
          range: {
            gte: value.gte,
            lte: value.lte
          }
        };
      } else {
        return {
          key,
          match: { value }
        };
      }
    });

    return {
      must: conditions
    };
  }
}

// Export optimized instance
export const vectorOps = new VectorOperations();