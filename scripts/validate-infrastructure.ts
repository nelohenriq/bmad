// scripts/validate-infrastructure.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.infrastructure' });
import { testDatabaseConnection } from '../src/lib/database';
import { testQdrantConnection, ensureCollection } from '../src/lib/qdrant';

async function validateInfrastructure() {
  console.log('🔍 Validating infrastructure setup...\n');

  // Test connections
  const postgresOk = await testDatabaseConnection();
  const qdrantOk = await testQdrantConnection();

  console.log(`PostgreSQL: ${postgresOk ? '✅' : '❌'}`);
  console.log(`Qdrant: ${qdrantOk ? '✅' : '❌'}`);

  if (!postgresOk || !qdrantOk) {
    console.error('\n💥 Infrastructure validation failed!');
    process.exit(1);
  }

  // Test Qdrant collection creation
  try {
    await ensureCollection();
    console.log('Qdrant collection: ✅');
  } catch (error: any) {
    console.error('Qdrant collection: ❌', error.message);
    process.exit(1);
  }

  // Test basic database operations
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Test basic query
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Database operations: ✅');

    await prisma.$disconnect();
  } catch (error: any) {
    console.error('Database operations: ❌', error.message);
    process.exit(1);
  }

  console.log('\n🎉 Infrastructure validation completed successfully!');
  console.log('Ready for RAG implementation development.');
}

validateInfrastructure().catch(console.error);