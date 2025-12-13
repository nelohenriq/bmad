// scripts/optimize-postgres-schema.ts
import { PrismaClient } from '@prisma/client';

async function optimizePostgresSchema() {
  const prisma = new PrismaClient();

  try {
    console.log('⚡ Optimizing PostgreSQL schema...');

    // Create performance indexes
    console.log('Creating indexes...');

    // Feed indexes
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feeds_user_id
      ON feeds(user_id);
    `;

    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feeds_url
      ON feeds(url);
    `;

    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feeds_last_fetched
      ON feeds(last_fetched DESC);
    `;

    // Feed item indexes
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feed_items_feed_id
      ON feed_items(feed_id);
    `;

    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feed_items_published_at
      ON feed_items(published_at DESC);
    `;

    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feed_items_created_at
      ON feed_items(created_at DESC);
    `;

    // User indexes
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
      ON users(email);
    `;

    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at
      ON users(created_at DESC);
    `;

    // Content indexes (for future use)
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contents_user_id
      ON contents(user_id);
    `;

    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contents_topic_id
      ON contents(topic_id);
    `;

    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contents_status
      ON contents(status);
    `;

    // Partial indexes for common queries
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feed_items_recent
      ON feed_items(published_at DESC)
      WHERE published_at > NOW() - INTERVAL '30 days';
    `;

    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feeds_active
      ON feeds(last_fetched DESC)
      WHERE is_active = true;
    `;

    // Analyze tables for query optimization
    console.log('Analyzing table statistics...');

    await prisma.$executeRaw`ANALYZE feeds;`;
    await prisma.$executeRaw`ANALYZE feed_items;`;
    await prisma.$executeRaw`ANALYZE users;`;

    console.log('✅ Schema optimization completed');

    // Report on optimization results
    const indexStats = await prisma.$queryRaw`
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;

    console.log('📊 Index Statistics:');
    console.table(indexStats);

    // Performance recommendations
    console.log('\n💡 Performance Recommendations:');
    console.log('1. Monitor query performance with EXPLAIN ANALYZE');
    console.log('2. Consider partitioning large tables by date');
    console.log('3. Use connection pooling for high-traffic scenarios');
    console.log('4. Regularly vacuum and reindex tables');

  } catch (error: any) {
    console.error('❌ Schema optimization failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

optimizePostgresSchema().catch(console.error);