import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserTimezone1758900000000 implements MigrationInterface {
    name = 'AddUserTimezone1758900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN IF NOT EXISTS "timezone" VARCHAR DEFAULT 'Asia/Kolkata'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users"
            DROP COLUMN IF EXISTS "timezone"
        `);
    }
}