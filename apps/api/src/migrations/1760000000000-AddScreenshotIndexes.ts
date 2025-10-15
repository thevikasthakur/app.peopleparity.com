import { MigrationInterface, QueryRunner } from "typeorm";

export class AddScreenshotIndexes1760000000000 implements MigrationInterface {
    name = 'AddScreenshotIndexes1760000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add composite index for common query pattern: userId + capturedAt range + isDeleted filter
        // This dramatically improves performance for the 10-minute window check in screenshot uploads
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_screenshots_user_time_deleted"
            ON "screenshots" ("userId", "capturedAt", "isDeleted")
        `);

        // Add index on sessionId for faster joins
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_screenshots_session"
            ON "screenshots" ("sessionId")
        `);

        console.log('✅ Created indexes for screenshots table');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_screenshots_user_time_deleted"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_screenshots_session"`);
        console.log('✅ Dropped indexes from screenshots table');
    }
}
