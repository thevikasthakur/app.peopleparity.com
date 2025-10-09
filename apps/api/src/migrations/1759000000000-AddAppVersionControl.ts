import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAppVersionControl1759000000000 implements MigrationInterface {
    name = 'AddAppVersionControl1759000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "app_versions" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "version" VARCHAR(20) NOT NULL UNIQUE,
                "is_supported" BOOLEAN DEFAULT true,
                "release_date" DATE NOT NULL,
                "deprecation_date" DATE,
                "notes" TEXT,
                "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_app_versions_supported"
            ON "app_versions"("version", "is_supported")
        `);

        // Insert current version as supported
        await queryRunner.query(`
            INSERT INTO "app_versions" ("version", "is_supported", "release_date", "notes")
            VALUES ('1.1.0', true, CURRENT_DATE, 'Initial version with version control')
            ON CONFLICT (version) DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_app_versions_supported"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "app_versions"`);
    }
}
