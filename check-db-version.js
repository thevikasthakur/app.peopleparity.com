#!/usr/bin/env node

const { Client } = require('pg');

async function checkVersion() {
  const client = new Client({
    host: 'ppv1-db.c6lwoh7tpmqk.ap-south-1.rds.amazonaws.com',
    database: 'ppv1_db',
    user: 'postgres',
    password: 'postgres',
    port: 5432
  });

  try {
    console.log('Connecting to database...');
    await client.connect();

    // Check version 1.1.0
    console.log('\n=== Checking Version 1.1.0 ===');
    const versionResult = await client.query(
      `SELECT version, is_supported, release_date, deprecation_date
       FROM app_versions
       WHERE version = '1.1.0'`
    );

    if (versionResult.rows.length === 0) {
      console.log('Version 1.1.0 NOT FOUND in database!');
    } else {
      console.log('Version 1.1.0 found:');
      console.log(versionResult.rows[0]);
    }

    // Show all versions
    console.log('\n=== All Versions in Database ===');
    const allVersions = await client.query(
      `SELECT version, is_supported, release_date
       FROM app_versions
       ORDER BY release_date DESC`
    );

    console.log('Total versions:', allVersions.rows.length);
    allVersions.rows.forEach(row => {
      console.log(`- ${row.version}: supported=${row.is_supported}, released=${row.release_date}`);
    });

    // Check column names
    console.log('\n=== Column Names in app_versions Table ===');
    const columnsResult = await client.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'app_versions'
       ORDER BY ordinal_position`
    );

    columnsResult.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkVersion();