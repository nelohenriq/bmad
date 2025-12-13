// src/app/api/infrastructure/status/route.ts
import { NextResponse } from 'next/server';
import { testDatabaseConnection } from '@/lib/database';
import { testQdrantConnection } from '@/lib/qdrant';

export async function GET() {
  try {
    const [postgresHealthy, qdrantHealthy] = await Promise.all([
      testDatabaseConnection(),
      testQdrantConnection()
    ]);

    const overallHealthy = postgresHealthy && qdrantHealthy;

    return NextResponse.json({
      status: overallHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        postgresql: {
          status: postgresHealthy ? 'healthy' : 'unhealthy',
          type: 'relational'
        },
        qdrant: {
          status: qdrantHealthy ? 'healthy' : 'unhealthy',
          type: 'vector'
        }
      }
    });
  } catch (error: any) {
    console.error('Infrastructure status check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to check infrastructure status'
      },
      { status: 500 }
    );
  }
}