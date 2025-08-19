-- Migration: Final schema cleanup
-- Date: 2025-08-19
-- Description: Remove captureTime, rename s3Url to url

-- Step 1: Drop captureTime column (we only need capturedAt)
ALTER TABLE screenshots DROP COLUMN IF EXISTS "captureTime";

-- Step 2: Rename s3Url to url
ALTER TABLE screenshots RENAME COLUMN "s3Url" TO url;

-- Step 3: Update column comments
COMMENT ON COLUMN screenshots.url IS 
'Full-size screenshot URL in S3';

COMMENT ON COLUMN screenshots."capturedAt" IS 
'Timestamp when the screenshot was captured';

COMMENT ON COLUMN screenshots."aggregatedScore" IS 
'Average activity score (0-100) calculated from the related 10 activity periods';

COMMENT ON COLUMN screenshots."activityPeriodIds" IS 
'JSON array string of the 10 activity period UUIDs that this screenshot aggregates';

COMMENT ON COLUMN screenshots."notes" IS 
'Copy of the session task at the time of screenshot capture';

COMMENT ON COLUMN screenshots."sessionId" IS 
'Foreign key to sessions table - one session has many screenshots (1:M relationship)';