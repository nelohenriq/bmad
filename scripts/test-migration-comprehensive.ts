// scripts/test-migration-comprehensive.ts
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

interface TestSuite {
  name: string;
  tests: TestCase[];
}

interface TestCase {
  name: string;
  test: () => Promise<{ passed: boolean; details?: string; error?: string }>;
}

async function runComprehensiveTests(): Promise<void> {
  const prisma = new PrismaClient();

  const testSuites: TestSuite[] = [
    {
      name: 'Data Integrity',
      tests: [
        {
          name: 'Record count validation',
          test: async () => {
            const postgresFeeds = await prisma.feed.count();
            const postgresItems = await prisma.feedItem.count();

            // Expected counts (from sample data)
            const expectedFeeds = 2;
            const expectedItems = 2;

            const feedsOk = postgresFeeds === expectedFeeds;
            const itemsOk = postgresItems === expectedItems;

            return {
              passed: feedsOk && itemsOk,
              details: `Feeds: ${postgresFeeds}/${expectedFeeds}, Items: ${postgresItems}/${expectedItems}`
            };
          }
        },
        {
          name: 'Referential integrity',
          test: async () => {
            const orphanedItems = await prisma.$queryRaw<{ count: number }[]>`
              SELECT COUNT(*) as count FROM feed_items fi
              LEFT JOIN feeds f ON fi.feed_id = f.id
              WHERE f.id IS NULL
            `;

            return {
              passed: orphanedItems[0].count === 0,
              details: `Orphaned items: ${orphanedItems[0].count}`
            };
          }
        },
        {
          name: 'UUID format validation',
          test: async () => {
            const feeds = await prisma.feed.findMany({ select: { id: true } });
            const items = await prisma.feedItem.findMany({ select: { id: true, feedId: true } });

            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            const invalidIds = [...feeds, ...items]
              .map(record => record.id)
              .filter(id => !uuidRegex.test(id));

            return {
              passed: invalidIds.length === 0,
              details: `Invalid UUIDs: ${invalidIds.length}`
            };
          }
        }
      ]
    },
    {
      name: 'Data Consistency',
      tests: [
        {
          name: 'Feed URL uniqueness',
          test: async () => {
            const duplicateUrls = await prisma.$queryRaw`
              SELECT url, COUNT(*) as count
              FROM feeds
              GROUP BY url
              HAVING COUNT(*) > 1
            ` as any[];

            return {
              passed: duplicateUrls.length === 0,
              details: `Duplicate URLs found: ${duplicateUrls.length}`
            };
          }
        },
        {
          name: 'Date field validation',
          test: async () => {
            const invalidDates = await prisma.feedItem.count({
              where: {
                OR: [
                  { publishedAt: { equals: new Date('1970-01-01') } },
                  { createdAt: { equals: new Date('1970-01-01') } }
                ]
              }
            });

            return {
              passed: invalidDates === 0,
              details: `Invalid dates found: ${invalidDates}`
            };
          }
        },
        {
          name: 'Required field validation',
          test: async () => {
            const invalidFeeds = await prisma.feed.count({
              where: { url: { equals: '' } }
            });

            const invalidItems = await prisma.$queryRaw<{ count: number }[]>`
              SELECT COUNT(*) as count FROM feed_items
              WHERE title = '' OR title IS NULL
            `;

            return {
              passed: invalidFeeds === 0 && invalidItems[0].count === 0,
              details: `Invalid feeds: ${invalidFeeds}, Invalid items: ${invalidItems[0].count}`
            };
          }
        }
      ]
    },
    {
      name: 'Performance',
      tests: [
        {
          name: 'Query performance baseline',
          test: async () => {
            const startTime = Date.now();

            // Test common queries
            await prisma.feedItem.findMany({
              take: 100,
              include: { feed: true },
              orderBy: { publishedAt: 'desc' }
            });

            const duration = Date.now() - startTime;

            return {
              passed: duration < 5000, // 5 seconds max
              details: `Query took ${duration}ms`
            };
          }
        },
        {
          name: 'Index effectiveness',
          test: async () => {
            // Check if indexes are being used
            const indexUsage = await prisma.$queryRaw`
              SELECT schemaname, tablename, indexname, idx_scan
              FROM pg_stat_user_indexes
              WHERE schemaname = 'public' AND idx_scan > 0
              ORDER BY idx_scan DESC
              LIMIT 5
            ` as any[];

            return {
              passed: indexUsage.length > 0,
              details: `Indexes used: ${indexUsage.length}`
            };
          }
        }
      ]
    },
    {
      name: 'Schema Validation',
      tests: [
        {
          name: 'Table structure validation',
          test: async () => {
            const tables = await prisma.$queryRaw`
              SELECT tablename
              FROM pg_tables
              WHERE schemaname = 'public'
              ORDER BY tablename
            ` as { tablename: string }[];

            const expectedTables = ['feeds', 'feed_items', 'users'];
            const missingTables = expectedTables.filter(table =>
              !tables.some(t => t.tablename === table)
            );

            return {
              passed: missingTables.length === 0,
              details: `Missing tables: ${missingTables.join(', ')}`
            };
          }
        },
        {
          name: 'Foreign key constraints',
          test: async () => {
            const constraints = await prisma.$queryRaw`
              SELECT conname, conrelid::regclass, confrelid::regclass
              FROM pg_constraint
              WHERE contype = 'f' AND connamespace = 'public'::regnamespace
            ` as any[];

            // Should have at least feed_items -> feeds constraint
            const hasFeedConstraint = constraints.some(c =>
              c.conrelid.includes('feed_items') && c.confrelid.includes('feeds')
            );

            return {
              passed: hasFeedConstraint,
              details: `Foreign key constraints: ${constraints.length}`
            };
          }
        }
      ]
    }
  ];

  console.log('🧪 Running comprehensive migration tests...\n');

  const results = [];

  for (const suite of testSuites) {
    console.log(`\n📋 ${suite.name}`);

    for (const testCase of suite.tests) {
      try {
        const result = await testCase.test();
        const icon = result.passed ? '✅' : '❌';

        console.log(`  ${icon} ${testCase.name}`);
        if (result.details) console.log(`     ${result.details}`);
        if (result.error) console.log(`     Error: ${result.error}`);

        results.push({
          suite: suite.name,
          test: testCase.name,
          ...result
        });

      } catch (error: any) {
        console.log(`  ❌ ${testCase.name}`);
        console.log(`     Error: ${error.message}`);

        results.push({
          suite: suite.name,
          test: testCase.name,
          passed: false,
          error: error.message
        });
      }
    }
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log(`\n📊 Test Summary: ${passed}/${total} passed`);

  if (passed === total) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Review results above.');
  }

  // Save detailed results
  fs.writeFileSync('comprehensive-test-results.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
    summary: { passed, total, success: passed === total }
  }, null, 2));

  await prisma.$disconnect();

  if (passed !== total) {
    process.exit(1);
  }
}

runComprehensiveTests().catch(console.error);