// scripts/validate-migration-environment.ts
import * as fs from 'fs';
import * as path from 'path';

interface EnvironmentCheck {
  component: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: any;
}

async function validateMigrationEnvironment(): Promise<EnvironmentCheck[]> {
  const checks: EnvironmentCheck[] = [];

  // Check source database
  const sqlitePath = path.join(process.cwd(), 'data', 'database.db');
  if (fs.existsSync(sqlitePath)) {
    const stats = fs.statSync(sqlitePath);
    checks.push({
      component: 'SQLite Database',
      status: 'ok',
      message: `Found database file (${(stats.size / 1024 / 1024).toFixed(2)} MB)`,
      details: { size: stats.size, modified: stats.mtime }
    });
  } else {
    checks.push({
      component: 'SQLite Database',
      status: 'error',
      message: 'Source database file not found'
    });
  }

  // Check target database connectivity (simplified check)
  try {
    // For now, just check if PostgreSQL environment variables are set
    const requiredEnvVars = ['DATABASE_URL'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      checks.push({
        component: 'PostgreSQL Configuration',
        status: 'error',
        message: `Missing environment variables: ${missingVars.join(', ')}`,
        details: { missingVars }
      });
    } else {
      checks.push({
        component: 'PostgreSQL Configuration',
        status: 'ok',
        message: 'Environment variables configured'
      });
    }
  } catch (error: any) {
    checks.push({
      component: 'PostgreSQL Configuration',
      status: 'error',
      message: 'Configuration check failed',
      details: error.message
    });
  }

  // Check Qdrant connectivity (optional for migration)
  try {
    const qdrantUrl = process.env.QDRANT_URL;
    if (qdrantUrl) {
      checks.push({
        component: 'Qdrant Connection',
        status: 'ok',
        message: 'Qdrant URL configured'
      });
    } else {
      checks.push({
        component: 'Qdrant Connection',
        status: 'warning',
        message: 'Qdrant URL not configured (optional for migration)'
      });
    }
  } catch (error: any) {
    checks.push({
      component: 'Qdrant Connection',
      status: 'warning',
      message: 'Qdrant configuration check failed'
    });
  }

  // Check available disk space (simplified)
  try {
    // For now, just check if we have write permissions
    const testFile = path.join(process.cwd(), 'migration-test.tmp');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);

    checks.push({
      component: 'Disk Space',
      status: 'ok',
      message: 'Write permissions confirmed'
    });
  } catch (error) {
    checks.push({
      component: 'Disk Space',
      status: 'error',
      message: 'No write permissions in current directory'
    });
  }

  return checks;
}

async function runEnvironmentValidation() {
  console.log('🔍 Validating migration environment...\n');

  const checks = await validateMigrationEnvironment();

  checks.forEach(check => {
    const icon = check.status === 'ok' ? '✅' :
                  check.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${check.component}: ${check.message}`);
    if (check.details) {
      console.log(`   Details: ${JSON.stringify(check.details, null, 2)}`);
    }
  });

  const errors = checks.filter(c => c.status === 'error').length;
  const warnings = checks.filter(c => c.status === 'warning').length;

  console.log(`\n📊 Validation Summary:`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Warnings: ${warnings}`);
  console.log(`   OK: ${checks.length - errors - warnings}`);

  if (errors > 0) {
    console.log('\n❌ Environment validation failed. Fix errors before proceeding.');
    process.exit(1);
  }

  if (warnings > 0) {
    console.log('\n⚠️  Warnings detected. Review before proceeding.');
  }

  console.log('\n✅ Environment ready for migration.');

  // Save validation results
  fs.writeFileSync('migration-environment-check.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    checks
  }, null, 2));
}

runEnvironmentValidation().catch(console.error);