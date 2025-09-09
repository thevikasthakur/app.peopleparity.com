// Test database connection
const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: process.env.DATABASE_HOST?.includes('supabase.com') 
      ? { rejectUnauthorized: false }
      : false,
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log('Attempting to connect to database...');
    console.log('Host:', process.env.DATABASE_HOST);
    await client.connect();
    console.log('✅ Database connection successful!');
    
    const result = await client.query('SELECT NOW()');
    console.log('Current time from DB:', result.rows[0].now);
    
    await client.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error code:', error.code);
  }
}

testConnection();