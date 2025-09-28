"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialSchema1755701146993 = void 0;
class InitialSchema1755701146993 {
    constructor() {
        this.name = 'InitialSchema1755701146993';
    }
    async up(queryRunner) {
        // Create organizations table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "organizations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "code" character varying NOT NULL,
                "timezone" character varying DEFAULT 'UTC',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_organizations" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_organizations_code" UNIQUE ("code")
            )
        `);
        // Create users table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "password" character varying NOT NULL,
                "name" character varying NOT NULL,
                "role" character varying NOT NULL DEFAULT 'developer',
                "organizationId" uuid,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_users" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_users_email" UNIQUE ("email")
            )
        `);
        // Create projects table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "projects" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "organizationId" uuid NOT NULL,
                "color" character varying,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_projects" PRIMARY KEY ("id")
            )
        `);
        // Create sessions table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "sessions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "projectId" uuid,
                "mode" character varying NOT NULL,
                "task" character varying,
                "startTime" TIMESTAMP NOT NULL,
                "endTime" TIMESTAMP,
                "isActive" boolean NOT NULL DEFAULT true,
                "appVersion" character varying,
                "deviceInfo" character varying,
                "realIpAddress" character varying,
                "location" jsonb,
                "isVpnDetected" boolean DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_sessions" PRIMARY KEY ("id")
            )
        `);
        // Create screenshots table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "screenshots" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "sessionId" uuid NOT NULL,
                "capturedAt" TIMESTAMP NOT NULL,
                "url" character varying,
                "thumbnailUrl" character varying,
                "mode" character varying NOT NULL,
                "notes" text,
                "isDeleted" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_screenshots" PRIMARY KEY ("id")
            )
        `);
        // Create activity_periods table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "activity_periods" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "sessionId" uuid NOT NULL,
                "userId" uuid NOT NULL,
                "screenshotId" uuid,
                "periodStart" TIMESTAMP NOT NULL,
                "periodEnd" TIMESTAMP NOT NULL,
                "mode" character varying NOT NULL,
                "notes" text,
                "activityScore" real DEFAULT 0,
                "isValid" boolean NOT NULL DEFAULT true,
                "classification" character varying,
                "metricsBreakdown" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_activity_periods" PRIMARY KEY ("id")
            )
        `);
        // Create command_hour_activities table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "command_hour_activities" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "activityPeriodId" uuid NOT NULL,
                "uniqueKeys" integer DEFAULT 0,
                "productiveKeyHits" integer DEFAULT 0,
                "mouseClicks" integer DEFAULT 0,
                "mouseScrolls" integer DEFAULT 0,
                "mouseDistance" real DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_command_hour_activities" PRIMARY KEY ("id")
            )
        `);
        // Create client_hour_activities table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "client_hour_activities" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "activityPeriodId" uuid NOT NULL,
                "codeCommitsCount" integer DEFAULT 0,
                "filesSavedCount" integer DEFAULT 0,
                "caretMovedCount" integer DEFAULT 0,
                "textSelectionsCount" integer DEFAULT 0,
                "filesOpenedCount" integer DEFAULT 0,
                "tabsSwitchedCount" integer DEFAULT 0,
                "netLinesCount" integer DEFAULT 0,
                "copilotSuggestionsAccepted" integer DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_client_hour_activities" PRIMARY KEY ("id")
            )
        `);
        // Create browser_activities table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "browser_activities" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "activityPeriodId" uuid NOT NULL,
                "url" character varying NOT NULL,
                "domain" character varying NOT NULL,
                "title" character varying,
                "category" character varying,
                "durationSeconds" integer DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_browser_activities" PRIMARY KEY ("id")
            )
        `);
        // Add foreign key constraints only if they don't exist
        const constraints = [
            { table: 'users', column: 'organizationId', ref_table: 'organizations', ref_column: 'id', name: 'FK_users_organization' },
            { table: 'projects', column: 'organizationId', ref_table: 'organizations', ref_column: 'id', name: 'FK_projects_organization' },
            { table: 'sessions', column: 'userId', ref_table: 'users', ref_column: 'id', name: 'FK_sessions_user' },
            { table: 'sessions', column: 'projectId', ref_table: 'projects', ref_column: 'id', name: 'FK_sessions_project' },
            { table: 'screenshots', column: 'userId', ref_table: 'users', ref_column: 'id', name: 'FK_screenshots_user' },
            { table: 'screenshots', column: 'sessionId', ref_table: 'sessions', ref_column: 'id', name: 'FK_screenshots_session' },
            { table: 'activity_periods', column: 'sessionId', ref_table: 'sessions', ref_column: 'id', name: 'FK_activity_periods_session' },
            { table: 'activity_periods', column: 'userId', ref_table: 'users', ref_column: 'id', name: 'FK_activity_periods_user' },
            { table: 'activity_periods', column: 'screenshotId', ref_table: 'screenshots', ref_column: 'id', name: 'FK_activity_periods_screenshot' },
            { table: 'command_hour_activities', column: 'activityPeriodId', ref_table: 'activity_periods', ref_column: 'id', name: 'FK_command_activities_period' },
            { table: 'client_hour_activities', column: 'activityPeriodId', ref_table: 'activity_periods', ref_column: 'id', name: 'FK_client_activities_period' },
            { table: 'browser_activities', column: 'activityPeriodId', ref_table: 'activity_periods', ref_column: 'id', name: 'FK_browser_activities_period' }
        ];
        for (const constraint of constraints) {
            // Check if constraint already exists
            const existingConstraint = await queryRunner.query(`
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = $1 
                AND constraint_name = $2
            `, [constraint.table, constraint.name]);
            if (existingConstraint.length === 0) {
                await queryRunner.query(`
                    ALTER TABLE "${constraint.table}" 
                    ADD CONSTRAINT "${constraint.name}" 
                    FOREIGN KEY ("${constraint.column}") 
                    REFERENCES "${constraint.ref_table}"("${constraint.ref_column}") 
                    ON DELETE CASCADE
                `);
            }
        }
        // Create indexes
        const indexes = [
            { table: 'sessions', column: 'userId', name: 'IDX_sessions_userId' },
            { table: 'sessions', column: 'isActive', name: 'IDX_sessions_isActive' },
            { table: 'screenshots', column: 'userId', name: 'IDX_screenshots_userId' },
            { table: 'screenshots', column: 'sessionId', name: 'IDX_screenshots_sessionId' },
            { table: 'screenshots', column: 'capturedAt', name: 'IDX_screenshots_capturedAt' },
            { table: 'activity_periods', column: 'sessionId', name: 'IDX_activity_periods_sessionId' },
            { table: 'activity_periods', column: 'userId', name: 'IDX_activity_periods_userId' },
            { table: 'activity_periods', column: 'periodStart', name: 'IDX_activity_periods_periodStart' }
        ];
        for (const index of indexes) {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "${index.name}" 
                ON "${index.table}" ("${index.column}")
            `);
        }
    }
    async down(queryRunner) {
        // Drop all tables in reverse order
        await queryRunner.query(`DROP TABLE IF EXISTS "browser_activities" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "client_hour_activities" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "command_hour_activities" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "activity_periods" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "screenshots" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "sessions" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "projects" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "organizations" CASCADE`);
    }
}
exports.InitialSchema1755701146993 = InitialSchema1755701146993;
//# sourceMappingURL=1755701146993-InitialSchema.js.map