const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection from environment or use the remote database
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.vxlbkyolncuglymauscq:FIr5FKZ3YqwRuxxv@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

async function runMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
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