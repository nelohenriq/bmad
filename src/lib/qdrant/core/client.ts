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
  private client!: QdrantRestClient;
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
      timeout: this.config.timeout
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
        // Use the collections endpoint to check health (more reliable than health endpoint)
        await this.client.getCollections();
        const responseTime = Date.now() - startTime;

        const newStatus: ConnectionHealth = {
          status: 'healthy',
          responseTime,
          lastChecked: new Date()
        };

        // Emit status change events
        if (newStatus.status !== this.healthStatus.status) {
          this.emit('healthChanged', newStatus, this.healthStatus);
        }

        this.healthStatus = newStatus;

      } catch (error: any) {
        const responseTime = Date.now() - startTime;

        this.healthStatus = {
          status: 'unhealthy',
          responseTime,
          lastChecked: new Date(),
          error: error?.message || 'Unknown error'
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
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        if (attempt > 0) {
          console.log(`✅ ${operationName} succeeded on attempt ${attempt + 1}`);
        }
        return result;
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ ${operationName} failed on attempt ${attempt + 1}:`, lastError.message);

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