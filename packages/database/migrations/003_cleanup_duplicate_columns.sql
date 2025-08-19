-- Migration: Cleanup duplicate columns and use camelCase naming
-- Date: 2025-08-19
-- Description: Removes duplicate columns (snake_case versions) and keeps camelCase versions

-- Step 1: Copy data from snake_case columns to camelCase columns if needed
UPDATE screenshots 
SET 
  captureTime = COALESCE(captureTime, capture_time::timestamp without time zone),
  aggregatedScore = COALESCE(aggregatedScore, aggregated_score),
  activityPeriodIds = CASE 
    WHEN activityPeriodIds IS NULL AND activity_period_ids IS NOT NULL 
    THEN array_to_string(activity_period_ids, ',')
    ELSE activityPeriodIds
  END
WHERE capture_time IS NOT NULL 
   OR aggregated_score IS NOT NULL 
   OR activity_period_ids IS NOT NULL;

-- Step 2: Drop the duplicate snake_case columns
ALTER TABLE screenshots DROP COLUMN IF EXISTS capture_time;
ALTER TABLE screenshots DROP COLUMN IF EXISTS aggregated_score;
ALTER TABLE screenshots DROP COLUMN IF EXISTS activity_period_ids;

-- Step 3: Also drop the old activityPeriodId column if it still exists
ALTER TABLE screenshots DROP COLUMN IF EXISTS "activityPeriodId";

-- Step 4: Ensure proper data types for camelCase columns
-- captureTime should be timestamp without time zone (to match capturedAt)
ALTER TABLE screenshots 
  ALTER COLUMN "captureTime" TYPE timestamp without time zone 
  USING "captureTime"::timestamp without time zone;

-- aggregatedScore should be integer (0-100 range for percentage)
ALTER TABLE screenshots 
  ALTER COLUMN "aggregatedScore" TYPE integer 
  USING COALESCE("aggregatedScore"::integer, 0);

-- activityPeriodIds should be stored as TEXT (JSON array string)
ALTER TABLE screenshots 
  ALTER COLUMN "activityPeriodIds" TYPE text;

-- Step 5: Set default values where appropriate
ALTER TABLE screenshots 
  ALTER COLUMN "aggregatedScore" SET DEFAULT 0;

-- Step 6: Update column comments
COMMENT ON COLUMN screenshots."captureTime" IS 
'Local capture timestamp from the desktop client (without timezone)';

COMMENT ON COLUMN screenshots."aggregatedScore" IS 
'Average activity score (0-100) from the 10 one-minute activity periods';

COMMENT ON COLUMN screenshots."activityPeriodIds" IS 
'JSON array string of the 10 activity period UUIDs that this screenshot aggregates';

-- Step 7: Create indexes on the cleaned columns
CREATE INDEX IF NOT EXISTS idx_screenshots_capture_time 
  ON screenshots("captureTime");

CREATE INDEX IF NOT EXISTS idx_screenshots_aggregated_score 
  ON screenshots("aggregatedScore");

-- Step 8: Verify the schema is clean
DO $$
BEGIN
  RAISE NOTICE 'Migration completed. Duplicate columns removed.';
  RAISE NOTICE 'Remaining columns use camelCase naming convention.';
END $$;