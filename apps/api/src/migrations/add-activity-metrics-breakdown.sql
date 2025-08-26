-- Add comprehensive activity metrics breakdown to activity_periods table
-- This will store detailed metrics for transparency and debugging

-- Add the metrics_breakdown column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'activity_periods' 
        AND column_name = 'metrics_breakdown'
    ) THEN
        ALTER TABLE activity_periods 
        ADD COLUMN metrics_breakdown JSONB;
        
        COMMENT ON COLUMN activity_periods.metrics_breakdown IS 
        'Detailed breakdown of activity metrics including:
        - Keyboard metrics (productive_keystrokes, total_keystrokes, unique_keys, etc.)
        - Mouse metrics (distance_pixels, clicks, scrolls, etc.)
        - Bot detection (bot_activity_detected, penalties_applied)
        - Score calculation (formula, components, final_score)
        - Time metrics (active_seconds, idle_seconds, etc.)';
        
        RAISE NOTICE 'Added metrics_breakdown column to activity_periods table';
    END IF;
END $$;

-- Create an index on the metrics_breakdown for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_activity_periods_metrics_breakdown 
ON activity_periods USING GIN (metrics_breakdown);

-- Create an index for querying bot activity
CREATE INDEX IF NOT EXISTS idx_activity_periods_bot_activity 
ON activity_periods ((metrics_breakdown->>'bot_activity_detected'));

-- Create an index for querying by activity score ranges
CREATE INDEX IF NOT EXISTS idx_activity_periods_activity_score 
ON activity_periods (activity_score);

-- Example of the JSON structure that will be stored:
/*
{
  "keyboard": {
    "total_keystrokes": 523,
    "productive_keystrokes": 412,
    "navigation_keystrokes": 111,
    "unique_keys": 45,
    "productive_unique_keys": 38,
    "keys_per_minute": 52.3,
    "typing_rhythm": {
      "consistent": true,
      "avg_interval_ms": 120,
      "std_deviation_ms": 45
    }
  },
  "mouse": {
    "total_clicks": 89,
    "left_clicks": 82,
    "right_clicks": 7,
    "double_clicks": 12,
    "total_scrolls": 34,
    "distance_pixels": 15234,
    "distance_per_minute": 1523.4,
    "movement_pattern": {
      "smooth": true,
      "avg_speed": 234.5
    }
  },
  "bot_detection": {
    "keyboard_bot_detected": false,
    "mouse_bot_detected": false,
    "repetitive_patterns": 0,
    "suspicious_intervals": 0,
    "penalty_applied": 0,
    "confidence": 0.95
  },
  "time_metrics": {
    "period_duration_seconds": 60,
    "active_seconds": 45,
    "idle_seconds": 15,
    "activity_percentage": 75
  },
  "score_calculation": {
    "components": {
      "keyboard_score": 35,
      "mouse_score": 15,
      "consistency_score": 10,
      "activity_time_score": 8
    },
    "penalties": {
      "bot_penalty": 0,
      "idle_penalty": 2,
      "suspicious_activity_penalty": 0
    },
    "formula": "min(100, (keyboard_score + mouse_score + consistency_score + activity_time_score) * (1 - penalties))",
    "raw_score": 68,
    "final_score": 66
  },
  "classification": {
    "category": "active",
    "confidence": 0.85,
    "tags": ["consistent_typing", "normal_mouse_usage", "productive"]
  },
  "metadata": {
    "version": "1.0",
    "calculated_at": "2024-01-20T10:15:30Z",
    "calculation_time_ms": 12
  }
}
*/

-- Function to validate metrics_breakdown JSON structure
CREATE OR REPLACE FUNCTION validate_metrics_breakdown()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure metrics_breakdown has required fields if not null
    IF NEW.metrics_breakdown IS NOT NULL THEN
        IF NOT (NEW.metrics_breakdown ? 'keyboard' 
            AND NEW.metrics_breakdown ? 'mouse' 
            AND NEW.metrics_breakdown ? 'score_calculation') THEN
            RAISE EXCEPTION 'metrics_breakdown must contain keyboard, mouse, and score_calculation fields';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate metrics_breakdown
DROP TRIGGER IF EXISTS validate_metrics_breakdown_trigger ON activity_periods;
CREATE TRIGGER validate_metrics_breakdown_trigger
BEFORE INSERT OR UPDATE ON activity_periods
FOR EACH ROW
EXECUTE FUNCTION validate_metrics_breakdown();

-- Create a view for easy metrics analysis
CREATE OR REPLACE VIEW activity_metrics_analysis AS
SELECT 
    ap.id,
    ap.session_id,
    ap.screenshot_id,
    ap.period_start,
    ap.period_end,
    ap.activity_score,
    ap.metrics_breakdown->>'keyboard' as keyboard_metrics,
    (ap.metrics_breakdown->'keyboard'->>'productive_keystrokes')::int as productive_keystrokes,
    (ap.metrics_breakdown->'keyboard'->>'total_keystrokes')::int as total_keystrokes,
    (ap.metrics_breakdown->'mouse'->>'distance_pixels')::int as mouse_distance,
    (ap.metrics_breakdown->'mouse'->>'total_clicks')::int as mouse_clicks,
    (ap.metrics_breakdown->'bot_detection'->>'keyboard_bot_detected')::boolean as keyboard_bot_detected,
    (ap.metrics_breakdown->'bot_detection'->>'mouse_bot_detected')::boolean as mouse_bot_detected,
    (ap.metrics_breakdown->'score_calculation'->>'final_score')::float as calculated_score,
    ap.metrics_breakdown->'score_calculation'->>'formula' as score_formula,
    u.email as user_email,
    s.mode as session_mode
FROM activity_periods ap
JOIN sessions s ON ap.session_id = s.id
JOIN users u ON ap.user_id = u.id
WHERE ap.metrics_breakdown IS NOT NULL;

-- Grant permissions on the view
GRANT SELECT ON activity_metrics_analysis TO PUBLIC;

COMMENT ON VIEW activity_metrics_analysis IS 
'Simplified view of activity metrics for analysis and debugging';