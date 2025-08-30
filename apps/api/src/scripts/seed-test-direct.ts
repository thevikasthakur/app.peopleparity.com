import { Client } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

async function seedTestData() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Create test organization
    const orgId = 'b09149e6-6ba6-498d-ae3b-f35a1e11f7f4';
    const orgResult = await client.query(
      `SELECT id FROM organizations WHERE id = $1`,
      [orgId]
    );

    if (orgResult.rows.length === 0) {
      await client.query(
        `INSERT INTO organizations (id, name, code, timezone, "firstDayOfWeek", "isActive", "createdAt", "updatedAt") 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [orgId, 'Test Organization', 'TEST-ORG', 'UTC', 0, true]
      );
      console.log('✅ Created test organization');
    } else {
      console.log('ℹ️ Test organization already exists');
    }

    // Create test user
    const userId = 'b09149e6-6ba6-498d-ae3b-f35a1e11f7f5';
    const userResult = await client.query(
      `SELECT id FROM users WHERE id = $1`,
      [userId]
    );

    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    
    if (userResult.rows.length === 0) {
      await client.query(
        `INSERT INTO users (id, email, name, password, role, "organizationId", "authProvider", "isActive", "createdAt", "updatedAt") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          userId,
          'test@peopleparity.com',
          'Test Developer',
          hashedPassword,
          'developer',
          orgId,
          'local',
          true
        ]
      );
      console.log('✅ Created test user');
    } else {
      await client.query(
        `UPDATE users SET password = $1, email = $2, name = $3 WHERE id = $4`,
        [hashedPassword, 'test@peopleparity.com', 'Test Developer', userId]
      );
      console.log('✅ Updated test user');
    }

    // Create the idle session
    const sessionId = 'b2c9ce71-0757-42a1-bc9f-17a058b3d242';
    const sessionResult = await client.query(
      `SELECT id FROM sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      await client.query(
        `INSERT INTO sessions (id, "userId", mode, "startTime", "isActive", task, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [
          sessionId,
          userId,
          'command_hours',
          new Date('2025-08-28T10:16:56Z'),
          true,
          'Idle - No active tracking'
        ]
      );
      console.log('✅ Created idle session:', sessionId);
    } else {
      console.log('ℹ️ Session already exists:', sessionId);
    }

    // Create the old session
    const oldSessionId = '17b632dd-e3ca-4481-bc7a-084c64212c04';
    const oldSessionResult = await client.query(
      `SELECT id FROM sessions WHERE id = $1`,
      [oldSessionId]
    );

    if (oldSessionResult.rows.length === 0) {
      await client.query(
        `INSERT INTO sessions (id, "userId", mode, "startTime", "endTime", "isActive", task, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [
          oldSessionId,
          userId,
          'command_hours',
          new Date('2025-08-18T14:20:01Z'),
          new Date('2025-08-18T16:20:01Z'),
          false,
          'Code review for PR #42'
        ]
      );
      console.log('✅ Created old session:', oldSessionId);
    } else {
      console.log('ℹ️ Old session already exists');
    }

    console.log('\n📝 Test data seeded successfully!');
    console.log('\n🔑 Login credentials:');
    console.log('   Email: test@peopleparity.com');
    console.log('   Password: testpassword123');
    console.log('   User ID:', userId);
    console.log('\n✅ You can now login to get an auth token');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
  } finally {
    await client.end();
  }
}

seedTestData();