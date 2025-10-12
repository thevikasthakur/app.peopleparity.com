#!/usr/bin/env node

const { Client } = require('pg');

async function checkVersion() {
  const client = new Client({
    host: 'aws-1-ap-south-1.pooler.supabase.com',
    database: 'postgres',
    user: 'postgres.wbqjfspfleboymnvkkte',
    password: 'FIr5FKZ3YqwRuxxv',
    port: 6543
  });

  try {
    console.log('Connecting to Supabase database...');
    await client.connect();

    // Check version 1.1.0
    console.log('\n=== Checking Version 1.1.0 ===');
    const versionResult = await client.query(
      `SELECT version, is_supported, release_date, deprecation_date
       FROM app_versions
       WHERE version = '1.1.0'`
    );

    if (versionResult.rows.length === 0) {
      console.log('❌ Version 1.1.0 NOT FOUND in database!');
      console.log('This is why it shows as unsupported - it does not exist in the database.');
    } else {
      const row = versionResult.rows[0];
      console.log('✅ Version 1.1.0 found:');
      console.log(`  version: ${row.version}`);
      console.log(`  is_supported: ${row.is_supported} (${typeof row.is_supported})`);
      console.log(`  release_date: ${row.release_date}`);
      console.log(`  deprecation_date: ${row.deprecation_date}`);

      if (row.is_supported === false) {
        console.log('\n⚠️ Version 1.1.0 is marked as NOT SUPPORTED in the database!');
        console.log('This is why you are getting the error message.');
      }
    }

    // Show all versions
    console.log('\n=== All Versions in Database ===');
    const allVersions = await client.query(
      `SELECT version, is_supported, release_date
       FROM app_versions
       ORDER BY release_date DESC
       LIMIT 10`
    );

    console.log(`Total versions shown: ${allVersions.rows.length}`);
    allVersions.rows.forEach(row => {
      const supportStatus = row.is_supported ? '✅ supported' : '❌ not supported';
      console.log(`- ${row.version}: ${supportStatus}, released: ${row.release_date}`);
    });

    // Insert version 1.1.0 if it doesn't exist
    if (versionResult.rows.length === 0) {
      console.log('\n=== Adding Version 1.1.0 to Database ===');
      const insertResult = await client.query(
        `INSERT INTO app_versions (version, is_supported, release_date, notes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (version) DO UPDATE
         SET is_supported = $2
         RETURNING *`,
        ['1.1.0', true, new Date(), 'Desktop app with bot detection moved to backend']
      );
      console.log('✅ Version 1.1.0 added successfully:', insertResult.rows[0]);
    } else if (versionResult.rows[0].is_supported === false) {
      console.log('\n=== Updating Version 1.1.0 to Supported ===');
      const updateResult = await client.query(
        `UPDATE app_versions
         SET is_supported = true, deprecation_date = NULL
         WHERE version = '1.1.0'
         RETURNING *`
      );
      console.log('✅ Version 1.1.0 updated to supported:', updateResult.rows[0]);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkVersion();