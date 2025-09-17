import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeScreenshotIdNullable1757181501978 implements MigrationInterface {
    name = 'MakeScreenshotIdNullable1757181501978'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Make screenshotId nullable in activity_periods table
        await queryRunner.query(`
            ALTER TABLE "activity_periods" 
            ALTER COLUMN "screenshotId" DROP NOT NULL
        `);
        
        console.log('✅ Made screenshotId column nullable in activity_periods table');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert - make screenshotId NOT NULL again (but first remove any NULL values)
        await queryRunner.query(`
            DELETE FROM "activity_periods" 
            WHERE "screenshotId" IS NULL
        `);
        
        await queryRunner.query(`
            ALTER TABLE "activity_periods" 
            ALTER COLUMN "screenshotId" SET NOT NULL
        `);
    }
}