import Database from 'better-sqlite3';
export declare class DatabaseMigrator {
    private db;
    constructor(db: Database.Database);
    private ensureMigrationsTable;
    private getAppliedMigrations;
    private markMigrationAsApplied;
    runMigrations(): void;
}
//# sourceMappingURL=migrations.d.ts.map