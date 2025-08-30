-- STRICT DATABASE RELATIONSHIPS ENFORCEMENT
-- This migration enforces mandatory foreign key relationships
-- and ensures data integrity for the time tracking system

-- =========================================
-- STEP 1: BACKUP EXISTING DATA (Optional)
-- =========================================
-- CREATE TABLE activity_periods_backup AS SELECT * FROM activity_periods;
-- CREATE TABLE screenshots_backup AS SELECT * FROM screenshots;
-- CREATE TABLE sessions_backup AS SELECT * FROM sessions;

-- =========================================
-- STEP 2: DELETE ALL DATA TO START FRESH
-- =========================================
-- Delete in reverse order of dependencies
DELETE FROM activity_periods;
DELETE FROM screenshots;
DELETE FROM sessions;
DELETE FROM users WHERE role = 'developer'; -- Keep admin users if needed

-- =========================================
-- STEP 3: DROP EXISTING CONSTRAINTS
-- =========================================
ALTER TABLE activity_periods DROP CONSTRAINT IF EXISTS activity_periods_screenshot_fkey;
ALTER TABLE activity_periods DROP CONSTRAINT IF EXISTS activity_periods_session_fkey;
ALTER TABLE screenshots DROP CONSTRAINT IF EXISTS screenshots_session_fkey;
ALTER TABLE screenshots DROP CONSTRAINT IF EXISTS screenshots_user_fkey;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_fkey;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_project_fkey;

-- =========================================
-- STEP 4: MODIFY COLUMN DEFINITIONS
-- =========================================

-- Make screenshotId NOT NULL in activity_periods
ALTER TABLE activity_periods 
ALTER COLUMN "screenshotId" SET NOT NULL;

-- Make sessionId NOT NULL in screenshots
ALTER TABLE screenshots 
ALTER COLUMN "sessionId" SET NOT NULL;

-- Make userId NOT NULL in all tables
ALTER TABLE screenshots 
ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE activity_periods 
ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE sessions 
ALTER COLUMN "userId" SET NOT NULL;

-- =========================================
-- STEP 5: ADD FOREIGN KEY CONSTRAINTS
-- =========================================

-- Activity Periods -> Screenshots (MANDATORY)
ALTER TABLE activity_periods
ADD CONSTRAINT fk_activity_periods_screenshot
FOREIGN KEY ("screenshotId") 
REFERENCES screenshots(id)
ON DELETE CASCADE;  -- When screenshot is deleted, delete all related activity periods

-- Activity Periods -> Sessions (MANDATORY)
ALTER TABLE activity_periods
ADD CONSTRAINT fk_activity_periods_session
FOREIGN KEY ("sessionId") 
REFERENCES sessions(id)
ON DELETE CASCADE;

-- Screenshots -> Sessions (MANDATORY)
ALTER TABLE screenshots
ADD CONSTRAINT fk_screenshots_session
FOREIGN KEY ("sessionId") 
REFERENCES sessions(id)
ON DELETE CASCADE;

-- Screenshots -> Users (MANDATORY)
ALTER TABLE screenshots
ADD CONSTRAINT fk_screenshots_user
FOREIGN KEY ("userId") 
REFERENCES users(id)
ON DELETE CASCADE;

-- Sessions -> Users (MANDATORY)
ALTER TABLE sessions
ADD CONSTRAINT fk_sessions_user
FOREIGN KEY ("userId") 
REFERENCES users(id)
ON DELETE CASCADE;

-- Sessions -> Projects (OPTIONAL - can be NULL)
ALTER TABLE sessions
ADD CONSTRAINT fk_sessions_project
FOREIGN KEY ("projectId") 
REFERENCES projects(id)
ON DELETE SET NULL;

-- =========================================
-- STEP 6: ADD CHECK CONSTRAINTS
-- =========================================

-- Ensure activity period times are valid
ALTER TABLE activity_periods
ADD CONSTRAINT chk_period_times
CHECK ("periodEnd" > "periodStart");

-- Ensure session times are valid
ALTER TABLE sessions
ADD CONSTRAINT chk_session_times
CHECK ("endTime" IS NULL OR "endTime" > "startTime");

-- =========================================
-- STEP 7: CREATE INDEXES FOR PERFORMANCE
-- =========================================

-- Screenshots indexes
CREATE INDEX IF NOT EXISTS idx_screenshots_session_id ON screenshots("sessionId");
CREATE INDEX IF NOT EXISTS idx_screenshots_user_id ON screenshots("userId");
CREATE INDEX IF NOT EXISTS idx_screenshots_captured_at ON screenshots("capturedAt");
CREATE INDEX IF NOT EXISTS idx_screenshots_created_at ON screenshots("createdAt");

-- Activity Periods indexes
CREATE INDEX IF NOT EXISTS idx_activity_periods_screenshot_id ON activity_periods("screenshotId");
CREATE INDEX IF NOT EXISTS idx_activity_periods_session_id ON activity_periods("sessionId");
CREATE INDEX IF NOT EXISTS idx_activity_periods_user_id ON activity_periods("userId");
CREATE INDEX IF NOT EXISTS idx_activity_periods_period_start ON activity_periods("periodStart");
CREATE INDEX IF NOT EXISTS idx_activity_periods_created_at ON activity_periods("createdAt");

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions("userId");
CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions("projectId");
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions("startTime");
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions("isActive");

-- =========================================
-- STEP 8: CREATE TRIGGER TO ENFORCE MAX 10 ACTIVITY PERIODS PER SCREENSHOT
-- =========================================

CREATE OR REPLACE FUNCTION check_max_activity_periods()
RETURNS TRIGGER AS $$
DECLARE
    period_count INTEGER;
BEGIN
    -- Count existing activity periods for this screenshot
    SELECT COUNT(*) INTO period_count
    FROM activity_periods
    WHERE "screenshotId" = NEW."screenshotId";
    
    -- Check if we're at the limit
    IF period_count >= 10 THEN
        RAISE EXCEPTION 'Cannot add more than 10 activity periods per screenshot (screenshot: %)', NEW."screenshotId";
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS enforce_max_activity_periods ON activity_periods;

CREATE TRIGGER enforce_max_activity_periods
BEFORE INSERT ON activity_periods
FOR EACH ROW
EXECUTE FUNCTION check_max_activity_periods();

-- =========================================
-- STEP 9: VERIFY STRUCTURE
-- =========================================

-- Show final table structure
\d screenshots
\d activity_periods
\d sessions

-- Show all constraints
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- =========================================
-- STEP 10: SUMMARY
-- =========================================
-- After this migration:
-- 1. All existing data is deleted (fresh start)
-- 2. screenshotId is MANDATORY in activity_periods
-- 3. sessionId is MANDATORY in screenshots
-- 4. All foreign keys are enforced with CASCADE delete
-- 5. Maximum 10 activity periods per screenshot is enforced
-- 6. Proper indexes are in place for performance
-- 7. Data integrity is guaranteed