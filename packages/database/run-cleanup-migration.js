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
    const migrationPath = path.join(__dirname, 'migrations', '003_cleanup_duplicate_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration: 003_cleanup_duplicate_columns.sql');
    
    // Execute the entire migration as one transaction
    await client.query('BEGIN');
    
    try {
      // Split by semicolons but handle DO blocks specially
      const statements = migrationSQL
        .split(/;\s*(?=(?:[^$]*\$\$[^$]*\$\$)*[^$]*$)/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        let statement = statements[i];
        
        // Skip pure comments
        if (statement.trim().startsWith('--')) continue;
        
        // Add semicolon back if not present
        if (!statement.trim().endsWith(';')) {
          statement += ';';
        }
        
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await client.query(statement);
          console.log(`✓ Statement ${i + 1} completed`);
        } catch (error) {
          console.error(`✗ Error in statement ${i + 1}:`, error.message);
          // Continue with other statements for non-critical errors
          if (!error.message.includes('does not exist')) {
            throw error;
          }
        }
      }
      
      await client.query('COMMIT');
      console.log('\n✓ Migration completed successfully!');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // Show the final schema
    const result = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'screenshots'
      ORDER BY ordinal_position;
    `);

    console.log('\n=== Final Screenshots Table Schema ===\n');
    console.log('Column Name | Data Type | Nullable');
    console.log('------------|-----------|----------');
    
    result.rows.forEach(row => {
      console.log(`${row.column_name.padEnd(20)} | ${row.data_type.padEnd(30)} | ${row.is_nullable}`);
    });

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();