import { MigrationInterface, QueryRunner } from "typeorm";

export class FixTimestampTimezones1758855579000 implements MigrationInterface {
    name = 'FixTimestampTimezones1758855579000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Convert timestamp columns to timestamptz to ensure consistent timezone handling
        // This prevents issues where timezone-naive timestamps are compared with timezone-aware values

        // Helper function to check if column is already timestamptz
        const isTimestamptz = async (table: string, column: string): Promise<boolean> => {
            const result = await queryRunner.query(`
                SELECT data_type
                FROM information_schema.columns
                WHERE table_name = $1
                AND column_name = $2
            `, [table, column]);

            return result.length > 0 && result[0].data_type === 'timestamp with time zone';
        };

        // Fix screenshots timestamps
        if (!(await isTimestamptz('screenshots', 'capturedAt'))) {
            await queryRunner.query(`
                ALTER TABLE "screenshots"
                ALTER COLUMN "capturedAt" TYPE timestamptz USING "capturedAt" AT TIME ZONE 'UTC'
            `);
        }

        if (!(await isTimestamptz('screenshots', 'createdAt'))) {
            await queryRunner.query(`
                ALTER TABLE "screenshots"
                ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC'
            `);
        }

        // Fix activity_periods timestamps
        if (!(await isTimestamptz('activity_periods', 'periodStart'))) {
            await queryRunner.query(`
                ALTER TABLE "activity_periods"
                ALTER COLUMN "periodStart" TYPE timestamptz USING "periodStart" AT TIME ZONE 'UTC'
            `);
        }

        if (!(await isTimestamptz('activity_periods', 'periodEnd'))) {
            await queryRunner.query(`
                ALTER TABLE "activity_periods"
                ALTER COLUMN "periodEnd" TYPE timestamptz USING "periodEnd" AT TIME ZONE 'UTC'
            `);
        }

        if (!(await isTimestamptz('activity_periods', 'createdAt'))) {
            await queryRunner.query(`
                ALTER TABLE "activity_periods"
                ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC'
            `);
        }

        // Fix sessions timestamps
        if (!(await isTimestamptz('sessions', 'startTime'))) {
            await queryRunner.query(`
                ALTER TABLE "sessions"
                ALTER COLUMN "startTime" TYPE timestamptz USING "startTime" AT TIME ZONE 'UTC'
            `);
        }

        if (!(await isTimestamptz('sessions', 'endTime'))) {
            await queryRunner.query(`
                ALTER TABLE "sessions"
                ALTER COLUMN "endTime" TYPE timestamptz USING "endTime" AT TIME ZONE 'UTC'
            `);
        }

        if (!(await isTimestamptz('sessions', 'createdAt'))) {
            await queryRunner.query(`
                ALTER TABLE "sessions"
                ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC'
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
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
