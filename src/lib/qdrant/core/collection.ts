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
    vectorSize: 2560, // Updated to match qwen3-embedding:4b model dimensions
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
      const createParams: any = {
        vectors: {
          size: config.vectorSize,
          distance: config.distance
        },
        optimizers_config: config.optimizersConfig,
        hnsw_config: config.hnswConfig
      };

      if (config.quantizationConfig) {
        createParams.quantization_config = config.quantizationConfig;
      }

      await this.client.executeWithRetry(
        async () => {
          await this.client.getPooledClient().createCollection(config.name, createParams);
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

      const exists = collections.collections.some((col: any) => col.name === config.name);

      if (exists) {
        console.log(`Collection '${config.name}' already exists, recreating...`);
        await this.deleteCollection(config.name);
      }

      await this.createCollection(config);
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
      const vectorsConfig = collection.config.params?.vectors;
      if (!vectorsConfig) {
        throw new Error('Vector configuration not found in collection');
      }

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

        if (info.indexedVectors >= info.pointsCount) {
          console.log(`✅ Indexing completed: ${info.indexedVectors}/${info.pointsCount} vectors indexed`);
          return;
        }

        console.log(`Indexing progress: ${info.indexedVectors}/${info.pointsCount} vectors...`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds

      } catch (error) {
        console.warn('Error checking indexing status:', error);
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
        name: collectionName,
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