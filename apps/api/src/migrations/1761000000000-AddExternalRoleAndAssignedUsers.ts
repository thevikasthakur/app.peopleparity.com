import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExternalRoleAndAssignedUsers1761000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'external' to the user role enum
    await queryRunner.query(`ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'external'`);

    // Add assignedUserIds column (JSONB, nullable)
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "assignedUserIds" jsonb DEFAULT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the column
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "assignedUserIds"`);

    // Note: PostgreSQL does not support removing enum values directly.
    // To fully revert, you'd need to recreate the enum type.
  }
}
