-- Add version 1.1.0 to app_versions table
-- This script should be run against the production database

INSERT INTO app_versions (version, "isSupported", "releaseDate", notes)
VALUES (
    '1.1.0',
    true,
    NOW(),
    'Desktop app with bot detection moved to backend, sync queue fixes, and tracking reminder system'
)
ON CONFLICT (version)
DO UPDATE SET
    "isSupported" = true,
    notes = 'Desktop app with bot detection moved to backend, sync queue fixes, and tracking reminder system';

-- Verify the insertion
SELECT version, "isSupported", "releaseDate", notes
FROM app_versions
WHERE version = '1.1.0';