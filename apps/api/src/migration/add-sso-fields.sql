-- Add SSO fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "microsoftId" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "authProvider" VARCHAR(50) DEFAULT 'local';

-- Make password nullable for SSO users
ALTER TABLE users 
ALTER COLUMN password DROP NOT NULL;