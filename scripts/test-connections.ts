// scripts/test-connections.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.infrastructure' });
import { PrismaClient } from '@prisma/client';

async function testPostgreSQL() {
  console.log('Testing PostgreSQL connection...');

  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error']
  });

  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL connection successful');

    // Test basic query
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('✅ PostgreSQL query successful:', result);

    await prisma.$disconnect();
    console.log('✅ PostgreSQL disconnection successful');
  } catch (error: any) {
    console.error('❌ PostgreSQL test failed:', error);
    throw error;
  }
}

async function testQdrant() {
  console.log('Testing Qdrant connection...');

  try {
    // Test health endpoint
    const healthResponse = await fetch(`${process.env.QDRANT_URL}/healthz`);
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
    console.log('✅ Qdrant health check successful');

    // Test collections endpoint
    const collectionsResponse = await fetch(`${process.env.QDRANT_URL}/collections`);
    if (!collectionsResponse.ok) {
      throw new Error(`Collections check failed: ${collectionsResponse.status}`);
    }
    const collectionsData = await collectionsResponse.json();
    console.log('✅ Qdrant collections query successful:', collectionsData.collections?.length || 0, 'collections');

    console.log('✅ Qdrant connection test completed');
  } catch (error: any) {
    console.error('❌ Qdrant test failed:', error);
    throw error;
  }
}

async function runConnectionTests() {
  try {
    await testPostgreSQL();
    console.log();
    await testQdrant();
    console.log('\n🎉 All connection tests passed!');
  } catch (error) {
    console.error('\n💥 Connection tests failed!');
    process.exit(1);
  }
}

runConnectionTests();