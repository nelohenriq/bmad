#!/usr/bin/env tsx

/**
 * Comprehensive test script for Vector Database Integration (Story 1.3)
 * Tests all components: client, collection management, vector operations, performance monitoring, and content service
 */

import { vectorContentService, ContentChunk } from '../src/services/vector-content-service';
import { collectionManager } from '../src/lib/qdrant/core/collection';
import { performanceMonitor } from '../src/lib/qdrant/monitoring/performance';
import { getQdrantClient } from '../src/lib/qdrant/core/client';

// Test data
const testChunks: ContentChunk[] = [
  {
    id: 1,
    feedItemId: 'feed-1',
    chunkIndex: 0,
    content: 'This is a test content chunk about artificial intelligence and machine learning. It contains information about neural networks and deep learning algorithms.',
    embedding: Array.from({ length: 384 }, () => Math.random() - 0.5), // Random 384-dim vector
    metadata: {
      sourceUrl: 'https://example.com/article1',
      publishedAt: new Date('2024-01-01'),
      feedTitle: 'AI News Feed',
      author: 'Dr. AI Researcher',
      tags: ['AI', 'Machine Learning', 'Neural Networks'],
      quality: 0.9,
      language: 'en',
      wordCount: 25
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 2,
    feedItemId: 'feed-1',
    chunkIndex: 1,
    content: 'Another test chunk discussing vector databases and similarity search. This covers Qdrant, Pinecone, and other vector database solutions for semantic search.',
    embedding: Array.from({ length: 384 }, () => Math.random() - 0.5),
    metadata: {
      sourceUrl: 'https://example.com/article2',
      publishedAt: new Date('2024-01-02'),
      feedTitle: 'Tech Database Feed',
      author: 'Database Expert',
      tags: ['Vector Databases', 'Qdrant', 'Semantic Search'],
      quality: 0.85,
      language: 'en',
      wordCount: 28
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 3,
    feedItemId: 'feed-2',
    chunkIndex: 0,
    content: 'Content about web development and React components. This discusses modern frontend development practices and component architecture patterns.',
    embedding: Array.from({ length: 384 }, () => Math.random() - 0.5),
    metadata: {
      sourceUrl: 'https://example.com/article3',
      publishedAt: new Date('2024-01-03'),
      feedTitle: 'Web Dev Feed',
      author: 'Frontend Developer',
      tags: ['React', 'Web Development', 'Components'],
      quality: 0.8,
      language: 'en',
      wordCount: 22
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function testClientHealth(): Promise<boolean> {
  console.log('\n🩺 Testing Qdrant Client Health...');

  try {
    const client = getQdrantClient();
    const health = client.getHealthStatus();

    console.log(`Client status: ${health.status}`);
    console.log(`Response time: ${health.responseTime}ms`);

    if (health.status === 'healthy') {
      console.log('✅ Client health check passed');
      return true;
    } else {
      console.log('❌ Client health check failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Client health check error:', error);
    return false;
  }
}

async function testCollectionManagement(): Promise<boolean> {
  console.log('\n📚 Testing Collection Management...');

  try {
    // Test collection creation/verification
    await collectionManager.ensureCollection();
    console.log('✅ Collection ensured');

    // Test collection info retrieval
    const info = await collectionManager.getCollectionInfo('feed_chunks');
    console.log(`Collection: ${info.name}, Vectors: ${info.vectorCount}, Status: ${info.status}`);

    return true;
  } catch (error) {
    console.error('❌ Collection management test failed:', error);
    return false;
  }
}

async function testContentStorage(): Promise<boolean> {
  console.log('\n💾 Testing Content Storage...');

  try {
    // Test single chunk storage
    await vectorContentService.storeContentChunk(testChunks[0]);
    console.log('✅ Single chunk stored');

    // Test batch storage
    const batchResult = await vectorContentService.storeContentChunks(testChunks.slice(1));
    console.log(`✅ Batch storage: ${batchResult.successful} successful, ${batchResult.failed} failed`);

    return batchResult.failed === 0;
  } catch (error) {
    console.error('❌ Content storage test failed:', error);
    return false;
  }
}

async function testContentRetrieval(): Promise<boolean> {
  console.log('\n🔍 Testing Content Retrieval...');

  try {
    // Test single chunk retrieval
    const chunk = await vectorContentService.getContentChunk(testChunks[0].id);
    if (!chunk) {
      console.log('❌ Chunk retrieval failed - chunk not found');
      return false;
    }
    console.log('✅ Single chunk retrieved');

    return true;
  } catch (error) {
    console.error('❌ Content retrieval test failed:', error);
    return false;
  }
}

async function testSimilaritySearch(): Promise<boolean> {
  console.log('\n🔎 Testing Similarity Search...');

  try {
    // Search using the first chunk's embedding
    const queryEmbedding = testChunks[0].embedding;
    const results = await vectorContentService.searchSimilarContent(queryEmbedding, {
      limit: 5,
      minScore: 0.1
    });

    console.log(`✅ Found ${results.length} similar results`);
    if (results.length > 0) {
      console.log(`Top result score: ${results[0].score.toFixed(3)}`);
    }

    // Test with filters
    const filteredResults = await vectorContentService.searchSimilarContent(queryEmbedding, {
      limit: 5,
      feedFilter: ['feed-1'],
      qualityFilter: { min: 0.8 }
    });

    console.log(`✅ Filtered search: ${filteredResults.length} results`);

    return results.length > 0;
  } catch (error) {
    console.error('❌ Similarity search test failed:', error);
    return false;
  }
}

async function testPerformanceMonitoring(): Promise<boolean> {
  console.log('\n📊 Testing Performance Monitoring...');

  try {
    const health = performanceMonitor.getHealthMetrics();
    console.log(`Overall health: ${health.overallHealth}`);

    const stats = performanceMonitor.getAllOperationStats();
    console.log(`Operations tracked: ${Object.keys(stats).length}`);

    if (Object.keys(stats).length > 0) {
      const sampleOp = Object.values(stats)[0];
      console.log(`Sample operation - ${sampleOp.operation}: ${sampleOp.count} calls, ${(sampleOp.successRate * 100).toFixed(1)}% success`);
    }

    return health.overallHealth !== 'unhealthy';
  } catch (error) {
    console.error('❌ Performance monitoring test failed:', error);
    return false;
  }
}

async function testServiceHealth(): Promise<boolean> {
  console.log('\n🏥 Testing Service Health...');

  try {
    const health = await vectorContentService.getServiceHealth();
    console.log(`Service status: ${health.status}`);
    console.log(`Alerts: ${health.alerts.length}`);

    if (health.alerts.length > 0) {
      console.log('Health alerts:', health.alerts);
    }

    return health.status !== 'unhealthy';
  } catch (error) {
    console.error('❌ Service health test failed:', error);
    return false;
  }
}

async function testContentDeletion(): Promise<boolean> {
  console.log('\n🗑️ Testing Content Deletion...');

  try {
    // Delete test chunks
    await vectorContentService.deleteContentChunks(testChunks.map(c => c.id));
    console.log('✅ Test chunks deleted');

    // Verify deletion
    const chunk = await vectorContentService.getContentChunk(testChunks[0].id);
    if (chunk) {
      console.log('❌ Chunk still exists after deletion');
      return false;
    }

    console.log('✅ Deletion verified');
    return true;
  } catch (error) {
    console.error('❌ Content deletion test failed:', error);
    return false;
  }
}

async function runPerformanceBenchmark(): Promise<void> {
  console.log('\n⚡ Running Performance Benchmark...');

  const benchmarkChunks: ContentChunk[] = [];
  for (let i = 0; i < 10; i++) {
    benchmarkChunks.push({
      ...testChunks[0],
      id: 100 + i,
      chunkIndex: i,
      embedding: Array.from({ length: 384 }, () => Math.random() - 0.5)
    });
  }

  // Benchmark batch storage
  const startTime = Date.now();
  await vectorContentService.storeContentChunks(benchmarkChunks);
  const storageTime = Date.now() - startTime;

  console.log(`Batch storage (10 chunks): ${storageTime}ms (${(storageTime / 10).toFixed(1)}ms per chunk)`);

  // Benchmark search
  const searchStart = Date.now();
  await vectorContentService.searchSimilarContent(testChunks[0].embedding, { limit: 5 });
  const searchTime = Date.now() - searchStart;

  console.log(`Similarity search: ${searchTime}ms`);

  // Cleanup
  await vectorContentService.deleteContentChunks(benchmarkChunks.map(c => c.id));
}

async function main() {
  console.log('🚀 Starting Vector Database Integration Tests (Story 1.3)');
  console.log('=' .repeat(60));

  const results = {
    clientHealth: false,
    collectionManagement: false,
    contentStorage: false,
    contentRetrieval: false,
    similaritySearch: false,
    performanceMonitoring: false,
    serviceHealth: false,
    contentDeletion: false
  };

  try {
    // Initialize service
    console.log('🔧 Initializing vector content service...');
    await vectorContentService.initialize();
    console.log('✅ Service initialized');

    // Run tests
    results.clientHealth = await testClientHealth();
    results.collectionManagement = await testCollectionManagement();
    results.contentStorage = await testContentStorage();
    results.contentRetrieval = await testContentRetrieval();
    results.similaritySearch = await testSimilaritySearch();
    results.performanceMonitoring = await testPerformanceMonitoring();
    results.serviceHealth = await testServiceHealth();

    // Run performance benchmark
    await runPerformanceBenchmark();

    // Cleanup
    results.contentDeletion = await testContentDeletion();

  } catch (error) {
    console.error('💥 Test suite failed with error:', error);
  }

  // Results summary
  console.log('\n' + '=' .repeat(60));
  console.log('📋 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${test.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
  });

  console.log('\n' + '=' .repeat(60));
  console.log(`🎯 OVERALL RESULT: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! Vector Database Integration is ready for production.');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed. Please review the implementation.');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  process.exit(1);
});

// Run tests
main().catch((error) => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});