const { Client } = require('pg');

// Database connection from environment or use the remote database
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.vxlbkyolncuglymauscq:FIr5FKZ3YqwRuxxv@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

async function checkSchema() {
  const client = new Client({
    connectionString: DATABASE_URL,
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
      WHERE table_name = 'screenshots'
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