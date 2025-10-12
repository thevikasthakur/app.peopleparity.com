-- Check version 1.1.0 status in app_versions table

-- 1. Check if version exists and its current status
SELECT
    version,
    "isSupported",
    "releaseDate",
    "deprecationDate",
    notes,
    "createdAt",
    "updatedAt"
FROM app_versions
WHERE version = '1.1.0';

-- 2. If version 1.1.0 is marked as unsupported or missing, fix it:
/*
-- If missing, insert it:
INSERT INTO app_versions (version, "isSupported", "releaseDate", notes)
VALUES (
    '1.1.0',
    true,
    NOW(),
    'Desktop app with bot detection moved to backend, sync queue fixes, and tracking reminder system'
);

-- If exists but marked as unsupported, update it:
UPDATE app_versions
SET "isSupported" = true,
    "deprecationDate" = NULL
WHERE version = '1.1.0';
*/

-- 3. Check all versions to see the full picture
SELECT
    version,
    "isSupported",
    CASE
        WHEN "isSupported" = true THEN 'Supported'
        ELSE 'Not Supported'
    END as status,
    "releaseDate",
    "deprecationDate"
FROM app_versions
ORDER BY "releaseDate" DESC;