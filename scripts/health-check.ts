// scripts/health-check.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.infrastructure' });
import { PrismaClient } from '@prisma/client';

interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  error?: string;
}

async function checkPostgreSQL(): Promise<HealthStatus> {
  const startTime = Date.now();

  try {
    const prisma = new PrismaClient({
      log: []
    });

    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1 as test`;
    await prisma.$disconnect();

    return {
      service: 'PostgreSQL',
      status: 'healthy',
      responseTime: Date.now() - startTime
    };
  } catch (error: any) {
    return {
      service: 'PostgreSQL',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message
    };
  }
}

async function checkQdrant(): Promise<HealthStatus> {
  const startTime = Date.now();

  try {
    // Use Node.js built-in fetch (available in Node 18+)
    const response = await fetch(`${process.env.QDRANT_URL}/healthz`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    return {
      service: 'Qdrant',
      status: 'healthy',
      responseTime: Date.now() - startTime
    };
  } catch (error: any) {
    return {
      service: 'Qdrant',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message
    };
  }
}

async function runHealthChecks() {
  console.log('🔍 Running infrastructure health checks...\n');

  const [postgresStatus, qdrantStatus] = await Promise.all([
    checkPostgreSQL(),
    checkQdrant()
  ]);

  const results = [postgresStatus, qdrantStatus];

  results.forEach(result => {
    const icon = result.status === 'healthy' ? '✅' : '❌';
    console.log(`${icon} ${result.service}: ${result.status} (${result.responseTime}ms)`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  const allHealthy = results.every(r => r.status === 'healthy');
  console.log(`\n${allHealthy ? '🎉' : '⚠️'} Infrastructure ${allHealthy ? 'healthy' : 'has issues'}`);

  if (!allHealthy) {
    process.exit(1);
  }
}

runHealthChecks().catch(console.error);