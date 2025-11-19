import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrganizationColumns1760100000000 implements MigrationInterface {
    name = 'AddOrganizationColumns1760100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add firstDayOfWeek column if it doesn't exist
        const firstDayOfWeekExists = await queryRunner.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'organizations'
            AND column_name = 'firstDayOfWeek'
        `);

        if (firstDayOfWeekExists.length === 0) {
            console.log('Adding firstDayOfWeek column to organizations table...');
            await queryRunner.query(`
                ALTER TABLE "organizations"
                ADD COLUMN "firstDayOfWeek" character varying DEFAULT 'sunday'
            `);
            console.log('✅ Added firstDayOfWeek column');
        } else {
            console.log('⏭️  firstDayOfWeek column already exists, skipping');
        }

        // Add isActive column if it doesn't exist
        const isActiveExists = await queryRunner.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'organizations'
            AND column_name = 'isActive'
        `);

        if (isActiveExists.length === 0) {
            console.log('Adding isActive column to organizations table...');
            await queryRunner.query(`
                ALTER TABLE "organizations"
                ADD COLUMN "isActive" boolean DEFAULT true
            `);
            console.log('✅ Added isActive column');
        } else {
            console.log('⏭️  isActive column already exists, skipping');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "organizations"
            DROP COLUMN IF EXISTS "isActive"
        `);

        await queryRunner.query(`
            ALTER TABLE "organizations"
            DROP COLUMN IF EXISTS "firstDayOfWeek"
        `);
    }
}
