-- Migration: One-to-Many Relationship - Screenshot to Activity Periods
-- Date: 2025-08-19
-- Description: Implements proper one-to-many relationship where one screenshot has many (10) activity periods

-- ============================================================================
-- RELATIONSHIP DESIGN:
-- 1 Screenshot → 10 Activity Periods (one-to-many)
-- 
-- Flow:
-- 1. Activity periods are created every minute (independent entities)
-- 2. Screenshot is taken every 10 minutes
-- 3. Screenshot "owns" the last 10 activity periods via screenshot_periods table
-- ============================================================================

-- Step 1: Ensure metadata column exists on screenshots table
ALTER TABLE screenshots 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Step 2: Create screenshot_periods mapping table (one-to-many relationship)
-- This is NOT a junction table for many-to-many
-- This maps which activity periods belong to each screenshot
CREATE TABLE IF NOT EXISTS screenshot_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screenshot_id UUID NOT NULL,
    activity_period_id UUID NOT NULL,
    period_order INTEGER NOT NULL,  -- Position in the 10-period sequence (0-9)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_screenshot 
        FOREIGN KEY (screenshot_id) 
        REFERENCES screenshots(id) 
        ON DELETE CASCADE,  -- When screenshot is deleted, remove all mappings
    
    CONSTRAINT fk_activity_period 
        FOREIGN KEY (activity_period_id) 
        REFERENCES activity_periods(id) 
        ON DELETE RESTRICT,  -- Prevent deletion of periods that belong to screenshots
    
    -- Ensure each period is only linked once per screenshot
    CONSTRAINT unique_screenshot_period 
        UNIQUE(screenshot_id, activity_period_id),
    
    -- Ensure proper ordering
    CONSTRAINT unique_screenshot_order 
        UNIQUE(screenshot_id, period_order),
    
    -- Ensure period_order is within valid range
    CONSTRAINT valid_period_order 
        CHECK (period_order >= 0 AND period_order <= 9)
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_screenshot_periods_screenshot 
    ON screenshot_periods(screenshot_id);

CREATE INDEX IF NOT EXISTS idx_screenshot_periods_activity_period 
    ON screenshot_periods(activity_period_id);

CREATE INDEX IF NOT EXISTS idx_screenshot_periods_order 
    ON screenshot_periods(screenshot_id, period_order);

-- Step 4: Add helpful comments
COMMENT ON TABLE screenshot_periods IS 
'One-to-many relationship table: Maps which 10 activity periods belong to each screenshot.
Each screenshot owns exactly 10 consecutive 1-minute activity periods.
This is NOT a many-to-many junction table - each activity period belongs to at most one screenshot.';

COMMENT ON COLUMN screenshot_periods.screenshot_id IS 
'The screenshot that owns these activity periods';

COMMENT ON COLUMN screenshot_periods.activity_period_id IS 
'One of the 10 activity periods that belongs to this screenshot';

COMMENT ON COLUMN screenshot_periods.period_order IS 
'Order of this period within the screenshot (0-9). 0 = first/oldest period, 9 = last/newest period';

COMMENT ON COLUMN screenshots.activity_period_id IS 
'DEPRECATED: Legacy field kept for backward compatibility. 
References the FIRST of the 10 activity periods.
Use screenshot_periods table for complete relationship.';

COMMENT ON COLUMN screenshots.metadata IS 
'JSON metadata containing:
- aggregatedScore: Average activity score across all 10 owned periods
- localCaptureTime: Client-side capture timestamp
- relatedPeriodIds: Array of the 10 activity period IDs (denormalized for performance)';

-- Step 5: Create view for easier querying
CREATE OR REPLACE VIEW screenshot_with_activity_details AS
WITH period_aggregates AS (
    SELECT 
        sp.screenshot_id,
        jsonb_agg(
            jsonb_build_object(
                'period_id', ap.id,
                'period_start', ap.period_start,
                'period_end', ap.period_end,
                'activity_score', ap.activity_score,
                'order', sp.period_order
            ) ORDER BY sp.period_order
        ) as periods,
        AVG(ap.activity_score) as avg_activity_score,
        COUNT(*) as period_count
    FROM screenshot_periods sp
    JOIN activity_periods ap ON sp.activity_period_id = ap.id
    GROUP BY sp.screenshot_id
)
SELECT 
    s.id,
    s.user_id,
    s.captured_at,
    s.s3_url,
    s.thumbnail_url,
    s.mode,
    COALESCE(pa.avg_activity_score, (s.metadata->>'aggregatedScore')::numeric) as aggregated_score,
    s.metadata->>'localCaptureTime' as local_capture_time,
    pa.periods as activity_periods,
    pa.period_count
FROM screenshots s
LEFT JOIN period_aggregates pa ON s.id = pa.screenshot_id;

-- Step 6: Helper function to link screenshot with its 10 periods
CREATE OR REPLACE FUNCTION link_screenshot_to_periods(
    p_screenshot_id UUID,
    p_period_ids UUID[]
) RETURNS VOID AS $$
DECLARE
    i INTEGER;
BEGIN
    -- Validate we have exactly 10 periods
    IF array_length(p_period_ids, 1) != 10 THEN
        RAISE EXCEPTION 'Screenshot must have exactly 10 activity periods, got %', array_length(p_period_ids, 1);
    END IF;
    
    -- Clear any existing mappings (shouldn't exist for new screenshots)
    DELETE FROM screenshot_periods WHERE screenshot_id = p_screenshot_id;
    
    -- Insert the 10 period mappings
    FOR i IN 1..10 LOOP
        INSERT INTO screenshot_periods (screenshot_id, activity_period_id, period_order)
        VALUES (p_screenshot_id, p_period_ids[i], i - 1);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Example query to get screenshot with its activity breakdown
/*
SELECT 
    s.id,
    s.captured_at,
    s.metadata->>'aggregatedScore' as overall_score,
    ap.period_start,
    ap.period_end,
    ap.activity_score,
    sp.period_order
FROM screenshots s
JOIN screenshot_periods sp ON s.id = sp.screenshot_id
JOIN activity_periods ap ON sp.activity_period_id = ap.id
WHERE s.id = 'some-screenshot-id'
ORDER BY sp.period_order;
*/