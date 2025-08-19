-- Migration: Add metadata column to screenshots table for 1-minute period support
-- Date: 2025-08-19

-- Add metadata column to screenshots table
ALTER TABLE screenshots 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create index on metadata for better query performance
CREATE INDEX IF NOT EXISTS idx_screenshots_metadata ON screenshots USING GIN (metadata);

-- Create screenshot_periods junction table for tracking multiple activity periods per screenshot
CREATE TABLE IF NOT EXISTS screenshot_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screenshot_id UUID NOT NULL REFERENCES screenshots(id) ON DELETE CASCADE,
    activity_period_id UUID NOT NULL REFERENCES activity_periods(id) ON DELETE CASCADE,
    period_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(screenshot_id, activity_period_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_screenshot_periods_screenshot ON screenshot_periods(screenshot_id);
CREATE INDEX IF NOT EXISTS idx_screenshot_periods_activity_period ON screenshot_periods(activity_period_id);

-- Comment updates
COMMENT ON COLUMN screenshots.metadata IS 'JSON metadata including aggregatedScore, localCaptureTime, and relatedPeriodIds';
COMMENT ON TABLE screenshot_periods IS 'Junction table linking screenshots to multiple 1-minute activity periods';
COMMENT ON TABLE activity_periods IS 'Activity periods (1-minute windows) tracking user activity metrics';