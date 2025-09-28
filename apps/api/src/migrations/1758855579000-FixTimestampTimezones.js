"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixTimestampTimezones1234567890000 = void 0;
class FixTimestampTimezones1234567890000 {
    constructor() {
        this.name = 'FixTimestampTimezones1234567890000';
    }
    async up(queryRunner) {
        // Convert timestamp columns to timestamptz to ensure consistent timezone handling
        // This prevents issues where timezone-naive timestamps are compared with timezone-aware values
        await queryRunner.query(`
            ALTER TABLE "screenshots" 
            ALTER COLUMN "capturedAt" TYPE timestamptz USING "capturedAt" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "screenshots" 
            ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC'
        `);
        // Fix activity_periods timestamps as well
        await queryRunner.query(`
            ALTER TABLE "activity_periods" 
            ALTER COLUMN "periodStart" TYPE timestamptz USING "periodStart" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "activity_periods" 
            ALTER COLUMN "periodEnd" TYPE timestamptz USING "periodEnd" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "activity_periods" 
            ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC'
        `);
        // Fix sessions timestamps
        await queryRunner.query(`
            ALTER TABLE "sessions" 
            ALTER COLUMN "startTime" TYPE timestamptz USING "startTime" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "sessions" 
            ALTER COLUMN "endTime" TYPE timestamptz USING "endTime" AT TIME ZONE 'UTC'
        `);
        await queryRunner.query(`
            ALTER TABLE "sessions" 
            ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC'
        `);
    }
    async down(queryRunner) {
        // Revert changes (not recommended, but provided for completeness)
        await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "createdAt" TYPE timestamp`);
        await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "endTime" TYPE timestamp`);
        await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "startTime" TYPE timestamp`);
        await queryRunner.query(`ALTER TABLE "activity_periods" ALTER COLUMN "createdAt" TYPE timestamp`);
        await queryRunner.query(`ALTER TABLE "activity_periods" ALTER COLUMN "periodEnd" TYPE timestamp`);
        await queryRunner.query(`ALTER TABLE "activity_periods" ALTER COLUMN "periodStart" TYPE timestamp`);
        await queryRunner.query(`ALTER TABLE "screenshots" ALTER COLUMN "createdAt" TYPE timestamp`);
        await queryRunner.query(`ALTER TABLE "screenshots" ALTER COLUMN "capturedAt" TYPE timestamp`);
    }
}
exports.FixTimestampTimezones1234567890000 = FixTimestampTimezones1234567890000;
//# sourceMappingURL=1758855579000-FixTimestampTimezones.js.map