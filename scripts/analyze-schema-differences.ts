// scripts/analyze-schema-differences.ts
import * as fs from 'fs';
import * as path from 'path';

interface SchemaDifference {
  table: string;
  column: string;
  sqliteType: string;
  postgresType: string;
  nullable: boolean;
  needsTransform: boolean;
  transformLogic?: string;
}

// Map SQLite types to PostgreSQL types
function mapSQLiteToPostgresType(sqliteType: string): string {
  const typeMap: { [key: string]: string } = {
    'INTEGER': 'INTEGER',
    'TEXT': 'TEXT',
    'REAL': 'DOUBLE PRECISION',
    'BLOB': 'BYTEA',
    'DATETIME': 'TIMESTAMPTZ'
  };

  return typeMap[sqliteType.toUpperCase()] || 'TEXT';
}

// Determine if transformation is needed
function needsTransformation(column: any, tableName: string): boolean {
  // Primary keys in SQLite are INTEGER, but we want UUID in PostgreSQL
  if (column.pk === 1 && tableName !== 'feeds') {
    return true;
  }

  // Date/time fields need conversion
  if (column.type.toUpperCase() === 'DATETIME') {
    return true;
  }

  return false;
}

// Generate transformation logic
function getTransformLogic(column: any, tableName: string): string {
  if (column.pk === 1) {
    return `generateUUID(${column.name}) // Convert INTEGER PK to UUID`;
  }

  if (column.type.toUpperCase() === 'DATETIME') {
    return `new Date(${column.name}) // Convert string to Date object`;
  }

  return 'Direct mapping';
}

// Analyze schema differences (simplified version without better-sqlite3)
async function analyzeSchemaDifferences(): Promise<SchemaDifference[]> {
  const differences: SchemaDifference[] = [];

  // For now, we'll define the expected schema differences based on the Prisma schema
  // In a real implementation, this would query the actual SQLite database

  const expectedTables = [
    {
      name: 'feeds',
      columns: [
        { name: 'id', type: 'INTEGER', pk: 1, notnull: 1 },
        { name: 'url', type: 'TEXT', pk: 0, notnull: 1 },
        { name: 'title', type: 'TEXT', pk: 0, notnull: 0 },
        { name: 'description', type: 'TEXT', pk: 0, notnull: 0 },
        { name: 'last_fetched', type: 'DATETIME', pk: 0, notnull: 0 },
        { name: 'created_at', type: 'DATETIME', pk: 0, notnull: 0 }
      ]
    },
    {
      name: 'feed_items',
      columns: [
        { name: 'id', type: 'INTEGER', pk: 1, notnull: 1 },
        { name: 'feed_id', type: 'INTEGER', pk: 0, notnull: 1 },
        { name: 'guid', type: 'TEXT', pk: 0, notnull: 0 },
        { name: 'title', type: 'TEXT', pk: 0, notnull: 1 },
        { name: 'content', type: 'TEXT', pk: 0, notnull: 0 },
        { name: 'published_at', type: 'DATETIME', pk: 0, notnull: 0 },
        { name: 'created_at', type: 'DATETIME', pk: 0, notnull: 0 }
      ]
    }
  ];

  for (const table of expectedTables) {
    for (const col of table.columns) {
      const pgType = mapSQLiteToPostgresType(col.type);
      const needsTransform = needsTransformation(col, table.name);

      differences.push({
        table: table.name,
        column: col.name,
        sqliteType: col.type,
        postgresType: pgType,
        nullable: col.notnull === 0,
        needsTransform,
        transformLogic: needsTransform ? getTransformLogic(col, table.name) : undefined
      });
    }
  }

  return differences;
}

async function generateMigrationPlan() {
  console.log('🔍 Analyzing schema differences...\n');

  const differences = await analyzeSchemaDifferences();

  console.log('📊 Schema Differences Found:');
  differences.forEach(diff => {
    const transform = diff.needsTransform ? ' (needs transform)' : '';
    console.log(`  ${diff.table}.${diff.column}: ${diff.sqliteType} → ${diff.postgresType}${transform}`);
    if (diff.transformLogic) {
      console.log(`    Transform: ${diff.transformLogic}`);
    }
  });

  const transformsNeeded = differences.filter(d => d.needsTransform).length;
  console.log(`\n📈 Summary:`);
  console.log(`   Total columns: ${differences.length}`);
  console.log(`   Need transformation: ${transformsNeeded}`);
  console.log(`   Direct mappings: ${differences.length - transformsNeeded}`);

  // Save analysis
  fs.writeFileSync('schema-analysis.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    differences,
    summary: {
      totalColumns: differences.length,
      transformsNeeded,
      directMappings: differences.length - transformsNeeded
    }
  }, null, 2));

  console.log('\n📄 Analysis saved to schema-analysis.json');
}

generateMigrationPlan().catch(console.error);