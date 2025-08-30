-- Remove deprecated columns from screenshots table
-- These columns are no longer needed as we use proper foreign key relationships

-- Check if columns exist before dropping them
DO $$ 
BEGIN
    -- Drop aggregatedScore column if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'screenshots' 
        AND column_name = 'aggregatedScore'
    ) THEN
        ALTER TABLE screenshots DROP COLUMN "aggregatedScore";
        RAISE NOTICE 'Dropped column aggregatedScore from screenshots table';
    END IF;

    -- Drop activityPeriodIds column if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'screenshots' 
        AND column_name = 'activityPeriodIds'
    ) THEN
        ALTER TABLE screenshots DROP COLUMN "activityPeriodIds";
        RAISE NOTICE 'Dropped column activityPeriodIds from screenshots table';
    END IF;
END $$;

-- Add index on sessionId for better query performance
CREATE INDEX IF NOT EXISTS idx_screenshots_session_id ON screenshots(sessionId);

-- Add index on userId for better query performance  
CREATE INDEX IF NOT EXISTS idx_screenshots_user_id ON screenshots(userId);

-- Add index on capturedAt for time-based queries
CREATE INDEX IF NOT EXISTS idx_screenshots_captured_at ON screenshots(capturedAt);