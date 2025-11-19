const { Client } = require('pg');
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

async function checkSchema() {
  const client = new Client({
    connectionString: getDatabaseUrl(),
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();

    // Check screenshots table columns
    const result = await client.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'screenshots'
      ORDER BY ordinal_position;
    `);

    console.log('\n=== Screenshots Table Schema ===\n');
    console.log('Column Name | Data Type | Nullable | Default');
    console.log('------------|-----------|----------|--------');

    result.rows.forEach(row => {
      console.log(`${row.column_name.padEnd(30)} | ${row.data_type.padEnd(20)} | ${row.is_nullable.padEnd(8)} | ${row.column_default || 'none'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkSchema();