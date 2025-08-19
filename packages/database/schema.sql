-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Organization branches/geographies
CREATE TABLE organization_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    timezone VARCHAR(50) NOT NULL,
    first_day_of_week INTEGER NOT NULL CHECK (first_day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES organization_branches(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('developer', 'admin', 'org_admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects/Repositories
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    repository_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User project assignments
CREATE TABLE user_projects (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, project_id)
);

-- Time sessions
CREATE TABLE time_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('client_hours', 'command_hours')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activity periods (10-minute windows)
CREATE TABLE activity_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES time_sessions(id) ON DELETE CASCADE,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('client_hours', 'command_hours')),
    notes TEXT,
    activity_score DECIMAL(5,2) DEFAULT 0,
    is_valid BOOLEAN DEFAULT true,
    classification VARCHAR(50) CHECK (classification IN ('coding', 'pr_review', 'research', 'meetings', 'comms', 'building_testing')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Screenshots
CREATE TABLE screenshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_period_id UUID NOT NULL REFERENCES activity_periods(id) ON DELETE CASCADE,
    screenshot_url VARCHAR(500) NOT NULL,
    local_path VARCHAR(500),
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activity metrics for command hours
CREATE TABLE command_hour_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_period_id UUID NOT NULL REFERENCES activity_periods(id) ON DELETE CASCADE,
    unique_keys INTEGER DEFAULT 0,
    productive_key_hits INTEGER DEFAULT 0,
    mouse_clicks INTEGER DEFAULT 0,
    mouse_scrolls INTEGER DEFAULT 0,
    mouse_distance DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activity metrics for client hours (from VS Code extension)
CREATE TABLE client_hour_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_period_id UUID NOT NULL REFERENCES activity_periods(id) ON DELETE CASCADE,
    code_commits_count INTEGER DEFAULT 0,
    files_saved_count INTEGER DEFAULT 0,
    caret_moved_count INTEGER DEFAULT 0,
    text_selections_count INTEGER DEFAULT 0,
    files_opened_count INTEGER DEFAULT 0,
    tabs_switched_count INTEGER DEFAULT 0,
    net_lines_count INTEGER DEFAULT 0,
    copilot_suggestions_accepted INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Browser activities
CREATE TABLE browser_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_period_id UUID NOT NULL REFERENCES activity_periods(id) ON DELETE CASCADE,
    url VARCHAR(1000) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    title VARCHAR(500),
    category VARCHAR(50) CHECK (category IN ('development', 'project_related', 'research', 'other')),
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context tracking
CREATE TABLE activity_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_period_id UUID NOT NULL REFERENCES activity_periods(id) ON DELETE CASCADE,
    editor_active_percent DECIMAL(5,2) DEFAULT 0,
    pr_view_active_percent DECIMAL(5,2) DEFAULT 0,
    meeting_active_percent DECIMAL(5,2) DEFAULT 0,
    comms_active_percent DECIMAL(5,2) DEFAULT 0,
    research_active_percent DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analytics/Insights
CREATE TABLE user_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    focus_minutes INTEGER DEFAULT 0,
    hands_on_keyboard_minutes INTEGER DEFAULT 0,
    compute_minutes INTEGER DEFAULT 0,
    research_minutes INTEGER DEFAULT 0,
    ai_assistance_minutes INTEGER DEFAULT 0,
    total_client_hours DECIMAL(5,2) DEFAULT 0,
    total_command_hours DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- Recent notes for quick selection
CREATE TABLE recent_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    use_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_activity_periods_user_period ON activity_periods(user_id, period_start);
CREATE INDEX idx_activity_periods_session ON activity_periods(session_id);
CREATE INDEX idx_screenshots_period ON screenshots(activity_period_id);
CREATE INDEX idx_screenshots_user_time ON screenshots(user_id, captured_at);
CREATE INDEX idx_time_sessions_user ON time_sessions(user_id, start_time);
CREATE INDEX idx_user_analytics_user_date ON user_analytics(user_id, date);
CREATE INDEX idx_browser_activities_period ON browser_activities(activity_period_id);
CREATE INDEX idx_recent_notes_user ON recent_notes(user_id, last_used_at);