-- App version control table
CREATE TABLE app_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(20) NOT NULL UNIQUE,
    is_supported BOOLEAN DEFAULT true,
    release_date DATE NOT NULL,
    deprecation_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick version lookup
CREATE INDEX idx_app_versions_supported ON app_versions(version, is_supported);

-- Insert current version as supported
INSERT INTO app_versions (version, is_supported, release_date, notes)
VALUES ('1.1.0', true, CURRENT_DATE, 'Initial version with version control');
