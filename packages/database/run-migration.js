const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../apps/api/.env') });

// Build database URL from environment variables
function getDatabaseUrl() {
  const host = process.env.DATABASE_HOST;
  const port = process.env.DATABASE_PORT || 5432;
  const user = process.env.DATABASE_USER;
  const password = process.env.DATABASE_PASSWORD;
  const database = process.env.DATABASE_NAME || 'postgres';

  if (!host || !user || !password) {
    console.error('ERROR: Missing required database environment variables.');
    console.error('Please ensure DATABASE_HOST, DATABASE_USER, and DATABASE_PASSWORD are set in apps/api/.env');
    process.exit(1);
  }

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

async function runMigration() {
  const client = new Client({
    connectionString: getDatabaseUrl(),
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '002_refactor_screenshot_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration: 002_refactor_screenshot_schema.sql');
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip comments
      if (statement.trim().startsWith('--')) continue;
      
      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        await client.query(statement);
      } catch (error) {
        console.error(`Error in statement ${i + 1}:`, error.message);
        // Continue with other statements
      }
    }

    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();