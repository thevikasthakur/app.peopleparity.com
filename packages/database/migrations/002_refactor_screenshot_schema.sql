-- Migration: Refactor screenshot schema to use separate columns instead of metadata
-- Date: 2025-08-19
-- Description: Removes screenshot_periods table, adds separate columns for aggregated data

-- Step 1: Add new columns if they don't exist (handle nullable first)
ALTER TABLE screenshots 
ADD COLUMN IF NOT EXISTS session_id UUID;

ALTER TABLE screenshots 
ADD COLUMN IF NOT EXISTS capture_time TIMESTAMP WITH TIME ZONE;

ALTER TABLE screenshots 
ADD COLUMN IF NOT EXISTS aggregated_score INTEGER DEFAULT 0;

ALTER TABLE screenshots 
ADD COLUMN IF NOT EXISTS activity_period_ids TEXT[];

-- Step 2: Migrate existing data from metadata if it exists
UPDATE screenshots 
SET 
  capture_time = COALESCE(
    (metadata->>'localCaptureTime')::timestamp with time zone,
    (metadata->>'captureTime')::timestamp with time zone,
    captured_at
  ),
  aggregated_score = COALESCE(
    (metadata->>'aggregatedScore')::integer,
    0
  ),
  activity_period_ids = CASE 
    WHEN metadata->>'relatedPeriodIds' IS NOT NULL 
    THEN ARRAY(SELECT jsonb_array_elements_text(metadata->'relatedPeriodIds'))
    ELSE NULL
  END
WHERE metadata IS NOT NULL;

-- Step 3: Try to populate session_id from activity periods for existing records
UPDATE screenshots s
SET session_id = (
  SELECT ap.session_id 
  FROM activity_periods ap 
  WHERE ap.id = s.activity_period_id
  LIMIT 1
)
WHERE s.session_id IS NULL 
  AND s.activity_period_id IS NOT NULL;

-- Step 4: For any remaining null session_ids, try to find a session based on timestamp
UPDATE screenshots s
SET session_id = (
  SELECT sess.id 
  FROM sessions sess
  WHERE sess.user_id = s.user_id
    AND sess.start_time <= s.captured_at
    AND (sess.end_time IS NULL OR sess.end_time >= s.captured_at)
  ORDER BY sess.start_time DESC
  LIMIT 1
)
WHERE s.session_id IS NULL;

-- Step 5: Create a default session for orphaned screenshots if needed
DO $$ 
DECLARE
  default_session_id UUID;
BEGIN
  -- Check if there are any screenshots without session_id
  IF EXISTS (SELECT 1 FROM screenshots WHERE session_id IS NULL) THEN
    -- Create a default session for migration purposes
    default_session_id := gen_random_uuid();
    
    INSERT INTO sessions (
      id, 
      user_id, 
      mode, 
      start_time, 
      end_time, 
      is_active, 
      task,
      created_at
    )
    SELECT 
      default_session_id,
      user_id,
      'command_hours',
      MIN(captured_at),
      MAX(captured_at),
      false,
      'Migration session',
      CURRENT_TIMESTAMP
    FROM screenshots
    WHERE session_id IS NULL
    GROUP BY user_id;
    
    -- Update orphaned screenshots with the default session
    UPDATE screenshots
    SET session_id = default_session_id
    WHERE session_id IS NULL;
  END IF;
END $$;

-- Step 6: Now make session_id NOT NULL since all records should have it
ALTER TABLE screenshots 
ALTER COLUMN session_id SET NOT NULL;

-- Step 7: Add foreign key constraint to sessions table
ALTER TABLE screenshots
ADD CONSTRAINT fk_screenshot_session
  FOREIGN KEY (session_id) 
  REFERENCES sessions(id) 
  ON DELETE CASCADE;

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_screenshots_session_id 
  ON screenshots(session_id);

CREATE INDEX IF NOT EXISTS idx_screenshots_capture_time 
  ON screenshots(capture_time);

CREATE INDEX IF NOT EXISTS idx_screenshots_aggregated_score 
  ON screenshots(aggregated_score);

-- Step 9: Drop the screenshot_periods table if it exists
DROP TABLE IF EXISTS screenshot_periods CASCADE;

-- Step 10: Drop the metadata column (optional - can keep for backward compatibility)
-- ALTER TABLE screenshots DROP COLUMN IF EXISTS metadata;

-- Step 11: Drop the activity_period_id column (after verifying migration)
-- This is commented out for safety - run manually after verification
-- ALTER TABLE screenshots DROP COLUMN IF EXISTS activity_period_id;

-- Step 12: Add helpful comments
COMMENT ON COLUMN screenshots.session_id IS 
'Foreign key to sessions table - establishes 1:M relationship (one session has many screenshots)';

COMMENT ON COLUMN screenshots.capture_time IS 
'Local capture timestamp from the desktop client for accurate ordering';

COMMENT ON COLUMN screenshots.aggregated_score IS 
'Average activity score from the 10 one-minute activity periods';

COMMENT ON COLUMN screenshots.activity_period_ids IS 
'Array of the 10 activity period IDs that this screenshot aggregates';

COMMENT ON COLUMN screenshots.notes IS 
'Copy of the session task at the time of screenshot capture';