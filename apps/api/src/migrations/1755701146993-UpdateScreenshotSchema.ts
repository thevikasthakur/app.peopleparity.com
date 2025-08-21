import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateScreenshotSchema1755701146993 implements MigrationInterface {
    name = 'UpdateScreenshotSchema1755701146993'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. First make url column nullable if it exists and is NOT NULL
        const urlColumnExists = await queryRunner.query(`
            SELECT column_name, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'screenshots' 
            AND column_name = 'url'
        `);
        
        if (urlColumnExists.length > 0 && urlColumnExists[0].is_nullable === 'NO') {
            await queryRunner.query(`ALTER TABLE "screenshots" ALTER COLUMN "url" DROP NOT NULL`);
        } else if (urlColumnExists.length === 0) {
            // Add url column as nullable
            await queryRunner.query(`ALTER TABLE "screenshots" ADD "url" character varying`);
        }

        // 2. Remove columns that are no longer needed
        const columnsToRemove = ['aggregatedScore', 'activityPeriodIds', 's3Url', 'metadata', 'activityPeriodId'];
        
        for (const column of columnsToRemove) {
            const columnExists = await queryRunner.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'screenshots' 
                AND column_name = $1
            `, [column.toLowerCase()]);
            
            if (columnExists.length > 0) {
                // First drop any constraints on this column
                const constraints = await queryRunner.query(`
                    SELECT constraint_name 
                    FROM information_schema.constraint_column_usage 
                    WHERE table_name = 'screenshots' 
                    AND column_name = $1
                `, [column.toLowerCase()]);
                
                for (const constraint of constraints) {
                    await queryRunner.query(`ALTER TABLE "screenshots" DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}"`);
                }
                
                // Then drop the column
                await queryRunner.query(`ALTER TABLE "screenshots" DROP COLUMN IF EXISTS "${column.toLowerCase()}"`);
            }
        }

        // 3. Add screenshotId column to activity_periods if it doesn't exist
        const screenshotIdExists = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'activity_periods' 
            AND column_name = 'screenshotId'
        `);
        
        if (screenshotIdExists.length === 0) {
            await queryRunner.query(`ALTER TABLE "activity_periods" ADD "screenshotId" uuid`);
            
            // Add foreign key constraint
            await queryRunner.query(`
                ALTER TABLE "activity_periods" 
                ADD CONSTRAINT "FK_activity_periods_screenshot" 
                FOREIGN KEY ("screenshotId") 
                REFERENCES "screenshots"("id") 
                ON DELETE SET NULL
            `);
        }

        // 4. Ensure sessionId column exists and is NOT NULL
        const sessionIdColumn = await queryRunner.query(`
            SELECT column_name, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'screenshots' 
            AND column_name = 'sessionId'
        `);
        
        if (sessionIdColumn.length === 0) {
            // Add sessionId column if it doesn't exist
            await queryRunner.query(`ALTER TABLE "screenshots" ADD "sessionId" uuid`);
            
            // Try to populate it from existing sessions
            await queryRunner.query(`
                UPDATE "screenshots" s
                SET "sessionId" = (
                    SELECT id FROM "sessions" sess
                    WHERE sess."userId" = s."userId"
                    AND sess."startTime" <= s."capturedAt"
                    AND (sess."endTime" IS NULL OR sess."endTime" >= s."capturedAt")
                    LIMIT 1
                )
                WHERE "sessionId" IS NULL
            `);
            
            // Delete any screenshots that still don't have a sessionId
            await queryRunner.query(`
                DELETE FROM "screenshots" 
                WHERE "sessionId" IS NULL
            `);
            
            // Now make it NOT NULL
            await queryRunner.query(`ALTER TABLE "screenshots" ALTER COLUMN "sessionId" SET NOT NULL`);
            
            // Add foreign key constraint
            await queryRunner.query(`
                ALTER TABLE "screenshots" 
                ADD CONSTRAINT "FK_screenshots_session" 
                FOREIGN KEY ("sessionId") 
                REFERENCES "sessions"("id") 
                ON DELETE CASCADE
            `);
        } else if (sessionIdColumn[0].is_nullable === 'YES') {
            // Column exists but is nullable, make it NOT NULL
            await queryRunner.query(`
                DELETE FROM "screenshots" 
                WHERE "sessionId" IS NULL
            `);
            
            await queryRunner.query(`ALTER TABLE "screenshots" ALTER COLUMN "sessionId" SET NOT NULL`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse the migration
        
        // Drop screenshotId from activity_periods
        await queryRunner.query(`ALTER TABLE "activity_periods" DROP CONSTRAINT IF EXISTS "FK_activity_periods_screenshot"`);
        await queryRunner.query(`ALTER TABLE "activity_periods" DROP COLUMN IF EXISTS "screenshotId"`);
        
        // Add back removed columns to screenshots
        await queryRunner.query(`ALTER TABLE "screenshots" ADD "aggregatedScore" integer DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "screenshots" ADD "activityPeriodIds" text`);
        
        // Make sessionId nullable again
        await queryRunner.query(`ALTER TABLE "screenshots" ALTER COLUMN "sessionId" DROP NOT NULL`);
        
        // Make url required
        await queryRunner.query(`ALTER TABLE "screenshots" ALTER COLUMN "url" SET NOT NULL`);
    }
}
