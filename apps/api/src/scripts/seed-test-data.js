"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const dotenv = __importStar(require("dotenv"));
const path_1 = require("path");
// Load environment variables
dotenv.config({ path: (0, path_1.join)(__dirname, '../../.env') });
// Create the data source with the same configuration as the app
const AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    entities: [(0, path_1.join)(__dirname, '../entities/*.entity.{ts,js}')],
    synchronize: false,
    logging: true
});
async function seedTestData() {
    try {
        // Initialize the data source
        await AppDataSource.initialize();
        console.log('Connected to database');
        // Create test organization
        const orgId = 'b09149e6-6ba6-498d-ae3b-f35a1e11f7f4'; // Test org ID
        const existingOrg = await AppDataSource.query(`SELECT id FROM organizations WHERE id = $1`, [orgId]);
        if (existingOrg.length === 0) {
            await AppDataSource.query(`INSERT INTO organizations (id, name, code, timezone, "firstDayOfWeek", "isActive", "createdAt", "updatedAt") 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`, [orgId, 'Test Organization', 'TEST-ORG', 'UTC', 0, true]);
            console.log('Created test organization');
        }
        else {
            console.log('Test organization already exists');
        }
        // Create test user with the specific ID we've been using
        const userId = 'b09149e6-6ba6-498d-ae3b-f35a1e11f7f5'; // The user ID from local DB
        const existingUser = await AppDataSource.query(`SELECT id FROM users WHERE id = $1`, [userId]);
        if (existingUser.length === 0) {
            const hashedPassword = await bcrypt.hash('testpassword123', 10);
            await AppDataSource.query(`INSERT INTO users (id, email, name, password, role, "organizationId", "authProvider", "isActive", "createdAt", "updatedAt") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`, [
                userId,
                'test@peopleparity.com',
                'Test Developer',
                hashedPassword,
                'developer',
                orgId,
                'local',
                true
            ]);
            console.log('Created test user');
            console.log('Login credentials:');
            console.log('Email: test@peopleparity.com');
            console.log('Password: testpassword123');
            console.log('User ID:', userId);
        }
        else {
            console.log('Test user already exists');
            // Update the password in case it's different
            const hashedPassword = await bcrypt.hash('testpassword123', 10);
            await AppDataSource.query(`UPDATE users SET password = $1 WHERE id = $2`, [hashedPassword, userId]);
            console.log('Updated test user password');
            console.log('Login credentials:');
            console.log('Email: test@peopleparity.com');
            console.log('Password: testpassword123');
        }
        // Create the session that's been trying to sync
        const sessionId = 'b2c9ce71-0757-42a1-bc9f-17a058b3d242';
        const existingSession = await AppDataSource.query(`SELECT id FROM sessions WHERE id = $1`, [sessionId]);
        if (existingSession.length === 0) {
            await AppDataSource.query(`INSERT INTO sessions (id, "userId", mode, "startTime", "isActive", task, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`, [
                sessionId,
                userId,
                'command_hours',
                new Date('2025-08-28T10:16:56Z'),
                true,
                'Idle - No active tracking'
            ]);
            console.log('Created idle session:', sessionId);
        }
        else {
            console.log('Session already exists:', sessionId);
        }
        // Also create the old session that might be referenced
        const oldSessionId = '17b632dd-e3ca-4481-bc7a-084c64212c04';
        const existingOldSession = await AppDataSource.query(`SELECT id FROM sessions WHERE id = $1`, [oldSessionId]);
        if (existingOldSession.length === 0) {
            await AppDataSource.query(`INSERT INTO sessions (id, "userId", mode, "startTime", "endTime", "isActive", task, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`, [
                oldSessionId,
                userId,
                'command_hours',
                new Date('2025-08-18T14:20:01Z'),
                new Date('2025-08-18T16:20:01Z'),
                false,
                'Code review for PR #42'
            ]);
            console.log('Created old session:', oldSessionId);
        }
        console.log('\nTest data seeded successfully!');
        console.log('You can now login with the test user to get an auth token.');
    }
    catch (error) {
        console.error('Error seeding test data:', error);
    }
    finally {
        await AppDataSource.destroy();
    }
}
seedTestData();
//# sourceMappingURL=seed-test-data.js.map