import Database from 'better-sqlite3';

interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

export class DatabaseMigrator {
  private db: Database.Database;
  
  constructor(db: Database.Database) {
    this.db = db;
  }
  
  private ensureMigrationsTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      )
    `);
  }
  
  private getAppliedMigrations(): number[] {
    const rows = this.db.prepare('SELECT version FROM migrations ORDER BY version').all() as { version: number }[];
    return rows.map(row => row.version);
  }
  
  private markMigrationAsApplied(version: number, name: string) {
    this.db.prepare('INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
      version,
      name,
      Date.now()
    );
  }
  
  runMigrations() {
    console.log('Running database migrations...');
    
    // Ensure migrations table exists
    this.ensureMigrationsTable();
    
    // Get list of applied migrations
    const appliedMigrations = this.getAppliedMigrations();
    console.log(`Applied migrations: ${appliedMigrations.join(', ') || 'none'}`);
    
    // Define all migrations
    const migrations: Migration[] = [
      {
        version: 1,
        name: 'initial_schema',
        up: (db) => {
          console.log('Migration 1: Creating initial schema...');
          
          // Current user table
          db.exec(`
            CREATE TABLE IF NOT EXISTS current_user (
              id TEXT PRIMARY KEY,
              email TEXT NOT NULL,
              name TEXT NOT NULL,
              organizationId TEXT NOT NULL,
              organizationName TEXT NOT NULL,
              role TEXT NOT NULL,
              lastSync INTEGER NOT NULL
            )
          `);
          
          // Cached projects
          db.exec(`
            CREATE TABLE IF NOT EXISTS cached_projects (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              organizationId TEXT NOT NULL,
              color TEXT,
              isActive INTEGER DEFAULT 1,
              lastSync INTEGER NOT NULL
            )
          `);
          
          // Sessions
          db.exec(`
            CREATE TABLE IF NOT EXISTS sessions (
              id TEXT PRIMARY KEY,
              userId TEXT NOT NULL,
              projectId TEXT,
              projectName TEXT,
              mode TEXT NOT NULL CHECK(mode IN ('client_hours', 'command_hours')),
              startTime INTEGER NOT NULL,
              endTime INTEGER,
              isActive INTEGER DEFAULT 1,
              task TEXT,
              isSynced INTEGER DEFAULT 0,
              createdAt INTEGER NOT NULL
            )
          `);
          
          // Activity periods (with screenshotId from the start)
          db.exec(`
            CREATE TABLE IF NOT EXISTS activity_periods (
              id TEXT PRIMARY KEY,
              sessionId TEXT NOT NULL,
              userId TEXT NOT NULL,
              screenshotId TEXT,
              periodStart INTEGER NOT NULL,
              periodEnd INTEGER NOT NULL,
              mode TEXT NOT NULL CHECK(mode IN ('client_hours', 'command_hours')),
              notes TEXT,
              activityScore REAL DEFAULT 0,
              isValid INTEGER DEFAULT 1,
              classification TEXT,
              metricsBreakdown TEXT,
              isSynced INTEGER DEFAULT 0,
              createdAt INTEGER NOT NULL,
              FOREIGN KEY (sessionId) REFERENCES sessions(id),
              FOREIGN KEY (screenshotId) REFERENCES screenshots(id)
            )
          `);
          
          // Screenshots
          db.exec(`
            CREATE TABLE IF NOT EXISTS screenshots (
              id TEXT PRIMARY KEY,
              userId TEXT NOT NULL,
              sessionId TEXT NOT NULL,
              localPath TEXT NOT NULL,
              thumbnailPath TEXT,
              url TEXT,
              thumbnailUrl TEXT,
              capturedAt INTEGER NOT NULL,
              mode TEXT NOT NULL CHECK(mode IN ('client_hours', 'command_hours')),
              notes TEXT,
              isDeleted INTEGER DEFAULT 0,
              isSynced INTEGER DEFAULT 0,
              createdAt INTEGER NOT NULL,
              FOREIGN KEY (sessionId) REFERENCES sessions(id)
            )
          `);
          
          // Command hour activities
          db.exec(`
            CREATE TABLE IF NOT EXISTS command_hour_activities (
              id TEXT PRIMARY KEY,
              activityPeriodId TEXT NOT NULL,
              uniqueKeys INTEGER DEFAULT 0,
              productiveKeyHits INTEGER DEFAULT 0,
              mouseClicks INTEGER DEFAULT 0,
              mouseScrolls INTEGER DEFAULT 0,
              mouseDistance REAL DEFAULT 0,
              isSynced INTEGER DEFAULT 0,
              createdAt INTEGER NOT NULL,
              FOREIGN KEY (activityPeriodId) REFERENCES activity_periods(id)
            )
          `);
          
          // Client hour activities
          db.exec(`
            CREATE TABLE IF NOT EXISTS client_hour_activities (
              id TEXT PRIMARY KEY,
              activityPeriodId TEXT NOT NULL,
              codeCommitsCount INTEGER DEFAULT 0,
              filesSavedCount INTEGER DEFAULT 0,
              caretMovedCount INTEGER DEFAULT 0,
              textSelectionsCount INTEGER DEFAULT 0,
              filesOpenedCount INTEGER DEFAULT 0,
              tabsSwitchedCount INTEGER DEFAULT 0,
              netLinesCount INTEGER DEFAULT 0,
              copilotSuggestionsAccepted INTEGER DEFAULT 0,
              isSynced INTEGER DEFAULT 0,
              createdAt INTEGER NOT NULL,
              FOREIGN KEY (activityPeriodId) REFERENCES activity_periods(id)
            )
          `);
          
          // Browser activities
          db.exec(`
            CREATE TABLE IF NOT EXISTS browser_activities (
              id TEXT PRIMARY KEY,
              activityPeriodId TEXT NOT NULL,
              url TEXT NOT NULL,
              domain TEXT NOT NULL,
              title TEXT,
              category TEXT,
              durationSeconds INTEGER DEFAULT 0,
              isSynced INTEGER DEFAULT 0,
              createdAt INTEGER NOT NULL,
              FOREIGN KEY (activityPeriodId) REFERENCES activity_periods(id)
            )
          `);
          
          // Recent notes
          db.exec(`
            CREATE TABLE IF NOT EXISTS recent_notes (
              id TEXT PRIMARY KEY,
              userId TEXT NOT NULL,
              noteText TEXT NOT NULL,
              lastUsedAt INTEGER NOT NULL,
              useCount INTEGER DEFAULT 1,
              createdAt INTEGER NOT NULL
            )
          `);
          
          // Sync queue
          db.exec(`
            CREATE TABLE IF NOT EXISTS sync_queue (
              id TEXT PRIMARY KEY,
              entityType TEXT NOT NULL,
              entityId TEXT NOT NULL,
              operation TEXT NOT NULL,
              data TEXT NOT NULL,
              attempts INTEGER DEFAULT 0,
              lastAttempt INTEGER,
              createdAt INTEGER NOT NULL
            )
          `);
          
          // Create indexes
          db.exec(`
            CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId);
            CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(isActive);
            CREATE INDEX IF NOT EXISTS idx_sessions_sync ON sessions(isSynced);
            CREATE INDEX IF NOT EXISTS idx_activity_periods_session ON activity_periods(sessionId);
            CREATE INDEX IF NOT EXISTS idx_activity_periods_user_time ON activity_periods(userId, periodStart);
            CREATE INDEX IF NOT EXISTS idx_activity_periods_sync ON activity_periods(isSynced);
            CREATE INDEX IF NOT EXISTS idx_screenshots_session ON screenshots(sessionId);
            CREATE INDEX IF NOT EXISTS idx_screenshots_user_time ON screenshots(userId, capturedAt);
            CREATE INDEX IF NOT EXISTS idx_screenshots_sync ON screenshots(isSynced);
            CREATE INDEX IF NOT EXISTS idx_sync_queue_attempts ON sync_queue(attempts);
          `);
        }
      },
      {
        version: 2,
        name: 'migrate_screenshots_table',
        up: (db) => {
          console.log('Migration 2: Migrating screenshots table...');
          
          // Check if screenshots table exists
          const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='screenshots'").get();
          
          if (tableExists) {
            const columns = db.prepare("PRAGMA table_info(screenshots)").all() as any[];
            const columnNames = columns.map(col => col.name);
            
            // Check if we need to migrate (has old columns)
            if (columnNames.includes('activityPeriodIds') || 
                columnNames.includes('aggregatedScore') || 
                columnNames.includes('s3Url') ||
                !columnNames.includes('url')) {
              
              console.log('Old screenshots schema detected, migrating...');
              
              // Create backup table
              db.exec(`
                CREATE TABLE IF NOT EXISTS screenshots_backup AS 
                SELECT * FROM screenshots
              `);
              
              // Drop the old table
              db.exec('DROP TABLE IF EXISTS screenshots');
              
              // Create new table with correct schema
              db.exec(`
                CREATE TABLE screenshots (
                  id TEXT PRIMARY KEY,
                  userId TEXT NOT NULL,
                  sessionId TEXT NOT NULL,
                  localPath TEXT NOT NULL,
                  thumbnailPath TEXT,
                  url TEXT,
                  thumbnailUrl TEXT,
                  capturedAt INTEGER NOT NULL,
                  mode TEXT NOT NULL CHECK(mode IN ('client_hours', 'command_hours')),
                  notes TEXT,
                  isDeleted INTEGER DEFAULT 0,
                  isSynced INTEGER DEFAULT 0,
                  createdAt INTEGER NOT NULL,
                  FOREIGN KEY (sessionId) REFERENCES sessions(id)
                )
              `);
              
              // Migrate data from backup
              const hasS3Url = columnNames.includes('s3Url');
              const hasUrl = columnNames.includes('url');
              const hasThumbnailUrl = columnNames.includes('thumbnailUrl');
              const hasThumbnailPath = columnNames.includes('thumbnailPath');
              
              let urlColumn = 'NULL';
              if (hasUrl && hasS3Url) {
                urlColumn = 'COALESCE(url, s3Url)';
              } else if (hasUrl) {
                urlColumn = 'url';
              } else if (hasS3Url) {
                urlColumn = 's3Url';
              }
              
              let thumbnailUrlColumn = 'NULL';
              if (hasThumbnailUrl) {
                thumbnailUrlColumn = 'thumbnailUrl';
              }
              
              let thumbnailPathColumn = 'NULL';
              if (hasThumbnailPath) {
                thumbnailPathColumn = 'thumbnailPath';
              }
              
              db.exec(`
                INSERT INTO screenshots (
                  id, userId, sessionId, localPath, thumbnailPath,
                  url, thumbnailUrl, capturedAt, mode, notes,
                  isDeleted, isSynced, createdAt
                )
                SELECT 
                  id, userId, sessionId, localPath, ${thumbnailPathColumn},
                  ${urlColumn},
                  ${thumbnailUrlColumn},
                  capturedAt, mode, notes,
                  COALESCE(isDeleted, 0),
                  COALESCE(isSynced, 0),
                  createdAt
                FROM screenshots_backup
              `);
              
              // Drop backup table
              db.exec('DROP TABLE screenshots_backup');
              
              // Recreate index
              db.exec(`
                CREATE INDEX IF NOT EXISTS idx_screenshots_session ON screenshots(sessionId);
                CREATE INDEX IF NOT EXISTS idx_screenshots_user_time ON screenshots(userId, capturedAt);
                CREATE INDEX IF NOT EXISTS idx_screenshots_sync ON screenshots(isSynced);
              `);
            }
          }
        }
      },
      {
        version: 3,
        name: 'add_screenshot_id_to_activity_periods',
        up: (db) => {
          console.log('Migration 3: Adding screenshotId to activity_periods...');
          
          const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_periods'").get();
          
          if (tableExists) {
            const columns = db.prepare("PRAGMA table_info(activity_periods)").all() as any[];
            const columnNames = columns.map(col => col.name);
            
            if (!columnNames.includes('screenshotId')) {
              console.log('Adding screenshotId column...');
              db.exec('ALTER TABLE activity_periods ADD COLUMN screenshotId TEXT');
            }
          }
        }
      },
      {
        version: 4,
        name: 'add_metrics_breakdown_to_activity_periods',
        up: (db) => {
          console.log('Migration 4: Adding metricsBreakdown to activity_periods...');
          
          const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_periods'").get();
          
          if (tableExists) {
            const columns = db.prepare("PRAGMA table_info(activity_periods)").all() as any[];
            const columnNames = columns.map(col => col.name);
            
            if (!columnNames.includes('metricsBreakdown')) {
              console.log('Adding metricsBreakdown column...');
              db.exec('ALTER TABLE activity_periods ADD COLUMN metricsBreakdown TEXT');
            }
          }
        }
      },
      {
        version: 5,
        name: 'drop_screenshot_periods_table',
        up: (db) => {
          console.log('Migration 5: Dropping screenshot_periods table if exists...');
          db.exec('DROP TABLE IF EXISTS screenshot_periods');
        }
      },
      {
        version: 6,
        name: 'ensure_foreign_keys',
        up: (db) => {
          console.log('Migration 6: Ensuring foreign key constraints...');
          
          // Enable foreign keys (they might be disabled)
          db.pragma('foreign_keys = ON');
          
          // Clean up orphaned records
          console.log('Cleaning up orphaned activity periods...');
          db.exec(`
            DELETE FROM activity_periods 
            WHERE sessionId NOT IN (SELECT id FROM sessions)
          `);
          
          console.log('Cleaning up orphaned screenshots...');
          db.exec(`
            DELETE FROM screenshots 
            WHERE sessionId NOT IN (SELECT id FROM sessions)
          `);
          
          console.log('Cleaning up orphaned command hour activities...');
          db.exec(`
            DELETE FROM command_hour_activities 
            WHERE activityPeriodId NOT IN (SELECT id FROM activity_periods)
          `);
          
          console.log('Cleaning up orphaned client hour activities...');
          db.exec(`
            DELETE FROM client_hour_activities 
            WHERE activityPeriodId NOT IN (SELECT id FROM activity_periods)
          `);
          
          console.log('Cleaning up orphaned browser activities...');
          db.exec(`
            DELETE FROM browser_activities 
            WHERE activityPeriodId NOT IN (SELECT id FROM activity_periods)
          `);
        }
      }
    ];
    
    // Run pending migrations
    let migrationsRun = 0;
    for (const migration of migrations) {
      if (!appliedMigrations.includes(migration.version)) {
        console.log(`Running migration ${migration.version}: ${migration.name}`);
        
        try {
          // Start transaction
          this.db.exec('BEGIN TRANSACTION');
          
          // Run migration
          migration.up(this.db);
          
          // Mark as applied
          this.markMigrationAsApplied(migration.version, migration.name);
          
          // Commit transaction
          this.db.exec('COMMIT');
          
          console.log(`✅ Migration ${migration.version} completed successfully`);
          migrationsRun++;
        } catch (error) {
          // Rollback on error
          this.db.exec('ROLLBACK');
          console.error(`❌ Migration ${migration.version} failed:`, error);
          throw error;
        }
      }
    }
    
    if (migrationsRun > 0) {
      console.log(`✅ Successfully ran ${migrationsRun} migration(s)`);
    } else {
      console.log('✅ Database is up to date');
    }
  }
}