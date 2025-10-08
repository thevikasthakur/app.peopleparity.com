import { Client } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

interface UserToCreate {
  email: string;
  name: string;
  password: string;
}

async function createUsers() {
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

    // First, get Paras's organization ID and role to use as reference
    const parasResult = await client.query(
      `SELECT "organizationId", role FROM users WHERE email = $1`,
      ['paras@inzint.com']
    );

    if (parasResult.rows.length === 0) {
      console.error('❌ Could not find user paras@inzint.com to use as reference');
      return;
    }

    const { organizationId, role } = parasResult.rows[0];
    console.log(`📍 Using organization: ${organizationId}, role: ${role}`);

    // Users to create with unique passwords based on their names
    const usersToCreate: UserToCreate[] = [
      {
        email: 'ravi@inzint.com',
        name: 'Ravi',
        password: 'R@vi#2025$ecure'
      },
      {
        email: 'vartika.pandey@inzint.com',
        name: 'Vartika Pandey',
        password: 'V@rtik@#P2025!'
      },
      {
        email: 'vishal.kumar@inzint.com',
        name: 'Vishal Kumar',
        password: 'Vi$h@l#K2025!'
      },
      {
        email: 'harshit@inzint.com',
        name: 'Harshit',
        password: 'H@r$hit#2025!'
      },
      {
        email: 'samrah@inzint.com',
        name: 'Samrah',
        password: 'S@mr@h#2025$ec'
      },
      {
        email: 'ashna@inzint.com',
        name: 'Ashna',
        password: '@shn@#2025$ec!'
      },
      {
        email: 'abhay@inzint.com',
        name: 'Abhay',
        password: 'Abh@y#2025$ec!'
      },
      {
        email: 'abhiraj@inzint.com',
        name: 'Abhiraj',
        password: '@bhiraJ#2025!'
      },
      {
        email: 'aloksharma@inzint.com',
        name: 'Alok Sharma',
        password: 'Al0k$h@rm@!'
      },
      {
        email: 'pratham@inzint.com',
        name: 'Pratham',
        password: 'Pr@th@m#2025wow!'
      },
      {
        email: 'himanshu@inzint.com',
        name: 'Himanshu',
        password: '#!manshu2025~'
      }
    ];

    console.log('\n📝 Creating users...\n');

    for (const user of usersToCreate) {
      // Check if user already exists
      const existingUser = await client.query(
        `SELECT id FROM users WHERE email = $1`,
        [user.email]
      );

      if (existingUser.rows.length > 0) {
        console.log(`⚠️  User ${user.email} already exists, skipping...`);
        continue;
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const userId = uuidv4();

      // Create the user
      await client.query(
        `INSERT INTO users (id, email, name, password, role, "organizationId", "authProvider", "isActive", timezone, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [
          userId,
          user.email,
          user.name,
          hashedPassword,
          role, // Same role as Paras
          organizationId, // Same organization as Paras
          'local',
          true,
          'Asia/Kolkata' // Default timezone
        ]
      );
      console.log(`✅ Created user: ${user.email}`);
    }

    console.log('\n🔐 User Credentials:\n');
    console.log('=' .repeat(50));
    for (const user of usersToCreate) {
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${user.password}`);
      console.log('-'.repeat(50));
    }
    console.log('\n✅ All users have been created successfully!');
    console.log(`📍 Organization ID: ${organizationId}`);
    console.log(`👤 Role: ${role}`);

  } catch (error) {
    console.error('❌ Error creating users:', error);
  } finally {
    await client.end();
  }
}

createUsers();