-- Debug script to understand version 1.1.0 issue

-- 1. Check the actual column names in the table (PostgreSQL)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'app_versions'
ORDER BY ordinal_position;

-- 2. Check the actual data for version 1.1.0 with all columns
SELECT *
FROM app_versions
WHERE version = '1.1.0';

-- 3. Check if there are any duplicate or similar versions
SELECT version,
       "isSupported" as camel_case_supported,
       is_supported as snake_case_supported,
       "releaseDate" as camel_case_release,
       release_date as snake_case_release
FROM app_versions
WHERE version LIKE '%1.1%'
   OR version = '1.1.0';

-- 4. Try both column naming conventions
-- This will show which column naming actually exists
SELECT version,
       CASE
           WHEN EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_name = 'app_versions' AND column_name = 'isSupported'
           ) THEN 'camelCase columns'
           WHEN EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_name = 'app_versions' AND column_name = 'is_supported'
           ) THEN 'snake_case columns'
           ELSE 'unknown'
       END as column_naming_style
FROM app_versions
LIMIT 1;

-- 5. Show all versions with their support status
SELECT version, is_supported
FROM app_versions
ORDER BY release_date DESC;