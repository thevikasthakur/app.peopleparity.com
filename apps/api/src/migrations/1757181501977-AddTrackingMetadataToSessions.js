"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddTrackingMetadataToSessions1757181501977 = void 0;
class AddTrackingMetadataToSessions1757181501977 {
    constructor() {
        this.name = 'AddTrackingMetadataToSessions1757181501976';
    }
    async up(queryRunner) {
        // 1. Check and add appVersion column if it doesn't exist
        const appVersionExists = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sessions' 
            AND column_name = 'appVersion'
        `);
        if (appVersionExists.length === 0) {
            await queryRunner.query(`ALTER TABLE "sessions" ADD "appVersion" character varying`);
            console.log('Added appVersion column to sessions table');
        }
        // 2. Add deviceInfo column to track device hostname
        const deviceInfoExists = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sessions' 
            AND column_name = 'deviceInfo'
        `);
        if (deviceInfoExists.length === 0) {
            await queryRunner.query(`ALTER TABLE "sessions" ADD "deviceInfo" text`);
            console.log('Added deviceInfo column to sessions table');
        }
        // 3. Add realIpAddress column for VPN-proof IP tracking
        const realIpAddressExists = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sessions' 
            AND column_name = 'realIpAddress'
        `);
        if (realIpAddressExists.length === 0) {
            await queryRunner.query(`ALTER TABLE "sessions" ADD "realIpAddress" character varying(45)`);
            console.log('Added realIpAddress column to sessions table');
        }
        // 4. Add location column for lat/lon coordinates (stored as JSON)
        const locationExists = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sessions' 
            AND column_name = 'location'
        `);
        if (locationExists.length === 0) {
            await queryRunner.query(`ALTER TABLE "sessions" ADD "location" jsonb`);
            console.log('Added location column to sessions table');
        }
        // 5. Add isVpnDetected flag column
        const isVpnDetectedExists = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sessions' 
            AND column_name = 'isVpnDetected'
        `);
        if (isVpnDetectedExists.length === 0) {
            await queryRunner.query(`ALTER TABLE "sessions" ADD "isVpnDetected" boolean DEFAULT false`);
            console.log('Added isVpnDetected column to sessions table');
        }
        // 6. Create indexes for better query performance
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_sessions_realIpAddress" 
            ON "sessions" ("realIpAddress")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_sessions_isVpnDetected" 
            ON "sessions" ("isVpnDetected")
        `);
        // 7. Create GIN index for JSONB location column for geospatial queries
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_sessions_location" 
            ON "sessions" USING GIN ("location")
        `);
        console.log('✅ Successfully added tracking metadata columns to sessions table');
    }
    async down(queryRunner) {
        // Drop indexes first
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_location"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_isVpnDetected"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_realIpAddress"`);
        // Drop columns
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "isVpnDetected"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "location"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "realIpAddress"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "deviceInfo"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "appVersion"`);
    }
}
exports.AddTrackingMetadataToSessions1757181501977 = AddTrackingMetadataToSessions1757181501977;
//# sourceMappingURL=1757181501977-AddTrackingMetadataToSessions.js.map