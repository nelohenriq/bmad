# Story Context: 1-3 Vector Database Integration

## Overview

**Story:** 1-3 Vector Database Integration
**Epic:** Epic 1 - Infrastructure & Data Foundation
**Status:** Drafted → Ready for Development
**Estimated Effort:** 8 story points (4-5 days)

## Story Summary

This story implements the complete vector database client and operations layer, establishing the foundation for semantic search and retrieval-augmented generation. It integrates Qdrant vector database with comprehensive CRUD operations, batch processing, similarity search, and performance monitoring to enable efficient storage and retrieval of content embeddings.

## Business Context

### Why Vector Operations Matter
- **Semantic Search:** Enables finding content by meaning, not just keywords
- **RAG Foundation:** Powers retrieval-augmented generation for AI content
- **Performance Critical:** Fast vector operations are essential for user experience
- **Scalability Requirements:** Must handle growing content volumes efficiently
- **AI Integration:** Connects embedding generation with content retrieval

### Business Impact
- **Enhanced Search:** Users can find relevant content through semantic understanding
- **AI-Powered Features:** Enables all RAG and content generation capabilities
- **Performance Gains:** Sub-100ms query times for responsive user experience
- **Content Discovery:** Improved content relevance and user engagement

## Technical Context

### Vector Database Architecture

#### Qdrant Integration Strategy
**Client Selection:** @qdrant/js-client-rest for TypeScript compatibility
**API Pattern:** REST-based communication with connection pooling
**Authentication:** API key support for production security
**Error Handling:** Comprehensive retry logic and circuit breakers

#### Vector Configuration
**Dimensionality:** 384 dimensions (qwen2:0.5b model output)
**Similarity Metric:** Cosine similarity (optimal for text embeddings)
**Indexing Algorithm:** HNSW (Hierarchical Navigable Small World)
**Storage Optimization:** Payload storage alongside vectors

### Performance Requirements

#### Latency Targets
- **Single Vector Search:** < 50ms average response time
- **Batch Operations:** < 100ms for up to 100 vectors
- **Storage Operations:** < 10ms per vector for individual operations
- **Similarity Search:** Top-K retrieval within 100ms

#### Throughput Goals
- **Concurrent Searches:** Support 100+ simultaneous queries
- **Batch Processing:** Handle 1000 vectors per batch operation
- **Memory Efficiency:** Stay within 2GB container memory limits
- **Network Optimization:** Minimize payload size and API calls

## Implementation Guidance

### Phase 1: Core Client Architecture (Day 1-2)

#### 1.1 Qdrant Client Foundation
```typescript
// src/lib/qdrant/core/client.ts
import { QdrantClient as QdrantRestClient } from '@qdrant/js-client-rest';
import { EventEmitter } from 'events';

export interface QdrantConnectionConfig {
  url: string;
  apiKey?: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  healthCheckInterval: number;
}

export interface ConnectionHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastChecked: Date;
  error?: string;
}

export class QdrantClient extends EventEmitter {
  private client: QdrantRestClient;
  private config: QdrantConnectionConfig;
  private healthStatus: ConnectionHealth;
  private healthCheckTimer?: NodeJS.Timeout;
  private connectionPool: Map<string, QdrantRestClient>;

  constructor(config: Partial<QdrantConnectionConfig> = {}) {
    super();

    this.config = {
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      healthCheckInterval: 30000,
      ...config
    };

    this.healthStatus = {
      status: 'unhealthy',
      responseTime: 0,
      lastChecked: new Date(0)
    };

    this.connectionPool = new Map();

    this.initializeClient();
    this.startHealthChecks();
  }

  private initializeClient(): void {
    this.client = new QdrantRestClient({
      url: this.config.url,
      apiKey: this.config.apiKey,
      timeout: this.config.timeout,
      retries: this.config.retries,
      retryDelay: this.config.retryDelay
    });

    // Initialize connection pool for concurrent operations
    for (let i = 0; i < 5; i++) {
      const pooledClient = new QdrantRestClient({
        url: this.config.url,
        apiKey: this.config.apiKey,
        timeout: this.config.timeout
      });
      this.connectionPool.set(`client-${i}`, pooledClient);
    }
  }

  private startHealthChecks(): void {
    const performHealthCheck = async () => {
      const startTime = Date.now();

      try {
        const response = await this.client.api('GET /health');
        const responseTime = Date.now() - startTime;

        const newStatus: ConnectionHealth = {
          status: response.status === 'ok' ? 'healthy' : 'degraded',
          responseTime,
          lastChecked: new Date()
        };

        // Emit status change events
        if (newStatus.status !== this.healthStatus.status) {
          this.emit('healthChanged', newStatus, this.healthStatus);
        }

        this.healthStatus = newStatus;

      } catch (error) {
        const responseTime = Date.now() - startTime;

        this.healthStatus = {
          status: 'unhealthy',
          responseTime,
          lastChecked: new Date(),
          error: error.message
        };

        this.emit('healthChanged', this.healthStatus, this.healthStatus);
      }
    };

    // Initial health check
    performHealthCheck();

    // Schedule periodic health checks
    this.healthCheckTimer = setInterval(performHealthCheck, this.config.healthCheckInterval);
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    customRetries?: number
  ): Promise<T> {
    const maxRetries = customRetries || this.config.retries;
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        if (attempt > 0) {
          console.log(`✅ ${operationName} succeeded on attempt ${attempt + 1}`);
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ ${operationName} failed on attempt ${attempt + 1}:`, error.message);

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * Math.pow(2, attempt)));
        }
      }
    }

    throw new Error(`${operationName} failed after ${maxRetries + 1} attempts: ${lastError.message}`);
  }

  getPooledClient(): QdrantRestClient {
    // Simple round-robin client selection
    const clientKeys = Array.from(this.connectionPool.keys());
    const randomKey = clientKeys[Math.floor(Math.random() * clientKeys.length)];
    return this.connectionPool.get(randomKey)!;
  }

  getHealthStatus(): ConnectionHealth {
    return { ...this.healthStatus };
  }

  getConfig(): QdrantConnectionConfig {
    return { ...this.config };
  }

  async close(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.connectionPool.clear();
    this.removeAllListeners();
  }
}

// Global client instance
let globalClient: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (!globalClient) {
    globalClient = new QdrantClient();
  }
  return globalClient;
}

export function createQdrantClient(config: Partial<QdrantConnectionConfig>): QdrantClient {
  return new QdrantClient(config);
}
```

#### 1.2 Collection Management System
```typescript
// src/lib/qdrant/core/collection.ts
import { getQdrantClient } from './client';

export interface VectorCollectionConfig {
  name: string;
  vectorSize: number;
  distance: 'Cosine' | 'Euclid' | 'Dot';
  description?: string;
  optimizersConfig?: {
    defaultSegmentNumber?: number;
    indexingThreshold?: number;
    memmapThreshold?: number;
  };
  hnswConfig?: {
    m?: number;
    efConstruct?: number;
    fullScanThreshold?: number;
    maxIndexingThreads?: number;
  };
  quantizationConfig?: {
    scalar?: {
      type: 'int8';
      quantile?: number;
      alwaysRam?: boolean;
    };
  };
}

export interface CollectionInfo {
  name: string;
  vectorCount: number;
  status: string;
  config: any;
  indexedVectors: number;
  pointsCount: number;
}

export class CollectionManager {
  private client = getQdrantClient();

  // Production-ready default configuration
  static readonly PRODUCTION_CONFIG: VectorCollectionConfig = {
    name: 'feed_chunks',
    vectorSize: 384,
    distance: 'Cosine',
    description: 'Content chunks for RAG retrieval and semantic search',
    optimizersConfig: {
      defaultSegmentNumber: 4,
      indexingThreshold: 50000,
      memmapThreshold: 100000
    },
    hnswConfig: {
      m: 32,              // Increased connections for better recall
      efConstruct: 200,   // Higher construction quality
      fullScanThreshold: 10000,
      maxIndexingThreads: 4
    }
  };

  async createCollection(config: VectorCollectionConfig = CollectionManager.PRODUCTION_CONFIG): Promise<void> {
    console.log(`Creating vector collection: ${config.name}`);

    try {
      await this.client.executeWithRetry(
        async () => {
          await this.client.getPooledClient().createCollection(config.name, {
            vectors: {
              size: config.vectorSize,
              distance: config.distance
            },
            description: config.description,
            optimizers_config: config.optimizersConfig,
            hnsw_config: config.hnswConfig,
            quantization_config: config.quantizationConfig
          });
        },
        `Create collection ${config.name}`
      );

      console.log(`✅ Collection '${config.name}' created successfully`);

      // Wait for indexing to complete
      await this.waitForIndexing(config.name);

    } catch (error) {
      console.error(`❌ Failed to create collection '${config.name}':`, error);
      throw error;
    }
  }

  async ensureCollection(config: VectorCollectionConfig = CollectionManager.PRODUCTION_CONFIG): Promise<void> {
    try {
      const collections = await this.client.executeWithRetry(
        async () => await this.client.getPooledClient().getCollections(),
        'Get collections'
      );

      const exists = collections.collections.some(col => col.name === config.name);

      if (!exists) {
        await this.createCollection(config);
      } else {
        console.log(`Collection '${config.name}' already exists`);
        await this.validateCollection(config);
      }
    } catch (error) {
      console.error(`Failed to ensure collection '${config.name}':`, error);
      throw error;
    }
  }

  private async validateCollection(config: VectorCollectionConfig): Promise<void> {
    try {
      const collection = await this.client.executeWithRetry(
        async () => await this.client.getPooledClient().getCollection(config.name),
        `Get collection ${config.name}`
      );

      // Validate vector configuration
      const vectorsConfig = collection.config.params.vectors;
      if (vectorsConfig.size !== config.vectorSize) {
        throw new Error(`Vector size mismatch: expected ${config.vectorSize}, got ${vectorsConfig.size}`);
      }

      if (vectorsConfig.distance !== config.distance) {
        throw new Error(`Distance metric mismatch: expected ${config.distance}, got ${vectorsConfig.distance}`);
      }

      console.log(`✅ Collection '${config.name}' validation passed`);

    } catch (error) {
      console.error(`Collection validation failed:`, error);
      throw error;
    }
  }

  private async waitForIndexing(collectionName: string, timeoutMs: number = 300000): Promise<void> {
    const startTime = Date.now();
    console.log(`Waiting for indexing to complete on '${collectionName}'...`);

    while (Date.now() - startTime < timeoutMs) {
      try {
        const info = await this.getCollectionInfo(collectionName);

        if (info.indexedVectors >= info.pointsCount && info.pointsCount > 0) {
          console.log(`✅ Indexing completed: ${info.indexedVectors}/${info.pointsCount} vectors indexed`);
          return;
        }

        console.log(`Indexing progress: ${info.indexedVectors}/${info.pointsCount} vectors...`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds

      } catch (error) {
        console.warn('Error checking indexing status:', error.message);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait longer on error
      }
    }

    throw new Error(`Indexing timeout after ${timeoutMs}ms`);
  }

  async getCollectionInfo(collectionName: string): Promise<CollectionInfo> {
    try {
      const collection = await this.client.executeWithRetry(
        async () => await this.client.getPooledClient().getCollection(collectionName),
        `Get collection info ${collectionName}`
      );

      const count = await this.client.executeWithRetry(
        async () => await this.client.getPooledClient().count(collectionName),
        `Count vectors in ${collectionName}`
      );

      return {
        name: collection.name,
        vectorCount: count.count,
        status: collection.status,
        config: collection.config,
        indexedVectors: collection.indexed_vectors_count || 0,
        pointsCount: collection.points_count || 0
      };
    } catch (error) {
      console.error(`Failed to get collection info for '${collectionName}':`, error);
      throw error;
    }
  }

  async deleteCollection(collectionName: string): Promise<void> {
    try {
      await this.client.executeWithRetry(
        async () => await this.client.getPooledClient().deleteCollection(collectionName),
        `Delete collection ${collectionName}`
      );

      console.log(`✅ Collection '${collectionName}' deleted successfully`);
    } catch (error) {
      console.error(`❌ Failed to delete collection '${collectionName}':`, error);
      throw error;
    }
  }

  async optimizeCollection(collectionName: string): Promise<void> {
    try {
      console.log(`Optimizing collection '${collectionName}'...`);

      // Trigger optimization
      await this.client.executeWithRetry(
        async () => await this.client.getPooledClient().updateCollection(collectionName, {
          optimizers_config: {
            default_segment_number: 2,
            indexing_threshold: 10000
          }
        }),
        `Optimize collection ${collectionName}`
      );

      console.log(`✅ Collection '${collectionName}' optimization triggered`);
    } catch (error) {
      console.error(`❌ Failed to optimize collection '${collectionName}':`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const collectionManager = new CollectionManager();
```

### Phase 2: Vector Operations Engine (Day 3-4)

#### 2.1 High-Performance Vector Operations
```typescript
// src/lib/qdrant/operations/vector-ops.ts
import { getQdrantClient } from '../core/client';
import { collectionManager, CollectionManager } from '../core/collection';

export interface VectorPoint {
  id: string;
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
        throw new Error(`Validation failed for point at index ${index}: ${error.message}`);
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

      } catch (error) {
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

      return response.map(result => ({
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
  async deleteVectors(vectorIds: string[]): Promise<void> {
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
  async updatePayload(vectorId: string, payload: Record<string, any>): Promise<void> {
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
  async getVector(vectorId: string, withVector: boolean = true): Promise<VectorPoint | null> {
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
      return {
        id: point.id.toString(),
        vector: point.vector || [],
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
    const conditions = Object.entries(filter).map(([key, value]) => ({
      key,
      match: { value }
    }));

    return {
      must: conditions
    };
  }
}

// Export optimized instance
export const vectorOps = new VectorOperations();
```

#### 2.2 Performance Monitoring & Analytics
```typescript
// src/lib/qdrant/monitoring/performance.ts
import { getQdrantClient } from '../core/client';

interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface PerformanceStats {
  operation: string;
  count: number;
  successRate: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  timeRange: {
    from: Date;
    to: Date;
  };
}

export class VectorPerformanceMonitor {
  private client = getQdrantClient();
  private metrics: PerformanceMetric[] = [];
  private maxHistorySize = 10000;
  private statsCache = new Map<string, { stats: PerformanceStats; expires: Date }>();
  private cacheTimeout = 300000; // 5 minutes

  recordMetric(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      success,
      timestamp: new Date(),
      metadata
    };

    this.metrics.push(metric);

    // Maintain history size
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics.shift();
    }

    // Clear expired cache entries
    for (const [key, value] of this.statsCache) {
      if (value.expires < new Date()) {
        this.statsCache.delete(key);
      }
    }

    // Log performance issues
    if (duration > 5000) { // 5 seconds
      console.warn(`🐌 Slow vector operation: ${operation} took ${duration}ms`, metadata);
    } else if (duration > 1000) { // 1 second
      console.info(`🐌 Slow vector operation: ${operation} took ${duration}ms`, metadata);
    }
  }

  getMetrics(
    operation?: string,
    since?: Date,
    limit?: number
  ): PerformanceMetric[] {
    let filtered = this.metrics;

    if (operation) {
      filtered = filtered.filter(m => m.operation === operation);
    }

    if (since) {
      filtered = filtered.filter(m => m.timestamp >= since);
    }

    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  getStats(operation?: string, since?: Date, useCache: boolean = true): PerformanceStats | null {
    const cacheKey = `${operation || 'all'}-${since?.getTime() || 'all'}`;

    // Check cache first
    if (useCache) {
      const cached = this.statsCache.get(cacheKey);
      if (cached && cached.expires > new Date()) {
        return cached.stats;
      }
    }

    const metrics = this.getMetrics(operation, since);
    if (metrics.length === 0) return null;

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const successCount = metrics.filter(m => m.success).length;

    const stats: PerformanceStats = {
      operation: operation || 'all',
      count: metrics.length,
      successRate: successCount / metrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50Duration: this.percentile(durations, 50),
      p95Duration: this.percentile(durations, 95),
      p99Duration: this.percentile(durations, 99),
      timeRange: {
        from: metrics[0].timestamp,
        to: metrics[metrics.length - 1].timestamp
      }
    };

    // Cache the result
    if (useCache) {
      this.statsCache.set(cacheKey, {
        stats,
        expires: new Date(Date.now() + this.cacheTimeout)
      });
    }

    return stats;
  }

  getAllOperationStats(since?: Date): Record<string, PerformanceStats> {
    const operations = [...new Set(this.metrics.map(m => m.operation))];
    const stats: Record<string, PerformanceStats> = {};

    for (const operation of operations) {
      const opStats = this.getStats(operation, since);
      if (opStats) {
        stats[operation] = opStats;
      }
    }

    return stats;
  }

  getHealthMetrics(): {
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
    clientHealth: any;
    recentPerformance: Record<string, PerformanceStats>;
    alerts: string[];
  } {
    const alerts: string[] = [];
    const clientHealth = this.client.getHealthStatus();
    const recentStats = this.getAllOperationStats(new Date(Date.now() - 3600000)); // Last hour

    // Check client health
    if (clientHealth.status !== 'healthy') {
      alerts.push(`Qdrant client is ${clientHealth.status}`);
    }

    // Check performance degradation
    for (const [operation, stats] of Object.entries(recentStats)) {
      if (stats.successRate < 0.95) {
        alerts.push(`${operation} success rate degraded: ${(stats.successRate * 100).toFixed(1)}%`);
      }

      if (stats.p95Duration > 2000) { // 2 seconds
        alerts.push(`${operation} p95 latency high: ${stats.p95Duration}ms`);
      }
    }

    // Determine overall health
    let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (alerts.length > 0) {
      overallHealth = alerts.some(alert => alert.includes('unhealthy') || alert.includes('degraded'))
        ? 'unhealthy' : 'degraded';
    }

    return {
      overallHealth,
      clientHealth,
      recentPerformance: recentStats,
      alerts
    };
  }

  private percentile(sortedArray: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
    if (lower === upper) return sortedArray[lower];

    return sortedArray[lower] * (1 - (index % 1)) + sortedArray[upper] * (index % 1);
  }

  clearMetrics(): void {
    this.metrics = [];
    this.statsCache.clear();
  }

  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
}

// Global performance monitor
export const performanceMonitor = new VectorPerformanceMonitor();
```

### Phase 3: Application Integration Layer (Day 5-6)

#### 3.1 Content Chunk Service
```typescript
// src/services/vector-content-service.ts
import { vectorOps, VectorOperations } from '@/lib/qdrant/operations/vector-ops';
import { performanceMonitor, VectorPerformanceMonitor } from '@/lib/qdrant/monitoring/performance';
import { collectionManager, CollectionManager } from '@/lib/qdrant/core/collection';

export interface ContentChunk {
  id: string;
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
        error: error.message
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
        error: error.message
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
          validationErrors.push(`Chunk ${index}: ${error.message}`);
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
        error: error.message
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
        highlights: this.generateHighlights(result.payload.content, queryEmbedding)
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
        error: error.message
      });
      throw error;
    }
  }

  async deleteContentChunks(chunkIds: string[]): Promise<void> {
    const startTime = Date.now();

    try {
      await this.vectorOps.deleteVectors(chunkIds);
      this.performanceMonitor.recordMetric('delete_chunks', Date.now() - startTime, true, {
        count: chunkIds.length
      });
    } catch (error) {
      this.performanceMonitor.recordMetric('delete_chunks', Date.now() - startTime, false, {
        count: chunkIds.length,
        error: error.message
      });
      throw error;
    }
  }

  async getContentChunk(chunkId: string): Promise<ContentChunk | null> {
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
        error: error.message
      });
      throw error;
    }
  }

  async updateContentMetadata(chunkId: string, metadata: Partial<ContentChunk['metadata']>): Promise<void> {
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
        error: error.message
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
        alerts: [`Health check failed: ${error.message}`]
      };
    }
  }

  // Private helper methods
  private validateContentChunk(chunk: ContentChunk): void {
    if (!chunk.id) throw new Error('Chunk ID is required');
    if (!chunk.feedItemId) throw new Error('Feed item ID is required');
    if (chunk.chunkIndex < 0) throw new Error('Chunk index must be non-negative');
    if (!chunk.content) throw new Error('Content is required');
    if (!chunk.embedding || chunk.embedding.length !== 384) {
      throw new Error('Valid 384-dimensional embedding is required');
    }
    if (chunk.metadata.quality < 0 || chunk.metadata.quality > 1) {
      throw new Error('Quality score must be between 0 and 1');
    }
  }

  private validateEmbedding(embedding: number[]): void {
    if (!Array.isArray(embedding) || embedding.length !== 384) {
      throw new Error('Query embedding must be a 384-dimensional array');
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

  private payloadToContentChunk(id: string, payload: any): ContentChunk {
    return {
      id,
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
```

## Development Workflow

### Implementation Phases
1. **Core Infrastructure** - Client setup and collection management
2. **Vector Operations** - CRUD operations with performance monitoring
3. **Application Integration** - Content service layer
4. **Testing & Optimization** - Performance tuning and validation

### Quality Gates
- **Unit Tests** - All vector operations tested with edge cases
- **Integration Tests** - End-to-end workflows validated
- **Performance Tests** - Latency and throughput requirements met
- **Load Tests** - Concurrent operations and resource usage validated

### Performance Baselines
- **Search Latency** - < 100ms for typical queries
- **Batch Operations** - < 500ms for 100 vectors
- **Memory Usage** - < 2GB during normal operations
- **Concurrent Users** - Support 50+ simultaneous searches

## Success Criteria Validation

### Functional Validation
- [ ] Vector storage operations work correctly
- [ ] Similarity search returns relevant results
- [ ] Batch operations handle large datasets
- [ ] Metadata filtering functions properly
- [ ] Error handling prevents data loss

### Performance Validation
- [ ] Search operations meet latency requirements
- [ ] Batch operations scale appropriately
- [ ] Memory usage stays within limits
- [ ] Concurrent operations supported
- [ ] Indexing performance acceptable

### Quality Validation
- [ ] TypeScript types comprehensive and accurate
- [ ] Error messages clear and actionable
- [ ] Logging provides sufficient debugging information
- [ ] Code follows established patterns and practices

## Risk Mitigation

### Technical Risks
1. **Performance Degradation**