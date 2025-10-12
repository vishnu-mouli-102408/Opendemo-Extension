# Database Schema Design Document
## DOM Interaction Recording and Replay System

### 1. Overview

This document details the database schema design for the DOM Interaction Recording and Replay System. The schema is designed for PostgreSQL as the primary database, with support for high-volume data, complex queries, and ACID compliance where needed.

### 2. Database Design Principles

#### 2.1 Core Principles

1. **Normalization**: Tables are normalized to 3NF to reduce redundancy
2. **Performance**: Strategic denormalization for query optimization
3. **Scalability**: Partitioning strategies for large tables
4. **Data Integrity**: Foreign key constraints and check constraints
5. **Audit Trail**: Comprehensive logging and versioning
6. **Flexibility**: JSONB fields for evolving data structures

#### 2.2 Naming Conventions

- **Tables**: snake_case, plural nouns (e.g., `users`, `recordings`)
- **Columns**: snake_case (e.g., `created_at`, `user_id`)
- **Primary Keys**: `id` (UUID)
- **Foreign Keys**: `{table_name}_id` (e.g., `user_id`)
- **Indexes**: `idx_{table_name}_{columns}` (e.g., `idx_recordings_user_id`)
- **Constraints**: `chk_{table_name}_{constraint}` (e.g., `chk_users_email_format`)

### 3. Core Schema

#### 3.1 Users and Authentication

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT chk_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_users_name_length CHECK (char_length(name) >= 2),
    CONSTRAINT chk_users_failed_attempts CHECK (failed_login_attempts >= 0)
);

-- User roles enum
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'member', 'viewer');

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- User settings JSONB structure
COMMENT ON COLUMN users.settings IS 'JSONB structure: {
  "theme": "light|dark",
  "notifications": {
    "email": boolean,
    "push": boolean,
    "slack": boolean
  },
  "defaultPlaybackSpeed": number,
  "autoSaveRecordings": boolean,
  "timezone": "string",
  "locale": "string"
}';
```

```sql
-- User sessions table for authentication tracking
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_sessions_expires_future CHECK (expires_at > created_at)
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- API Keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count BIGINT DEFAULT 0,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_api_keys_name_length CHECK (char_length(name) >= 3),
    CONSTRAINT chk_api_keys_usage_count CHECK (usage_count >= 0)
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = TRUE;
```

#### 3.2 Teams and Organizations

```sql
-- Organizations/Teams table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    settings JSONB DEFAULT '{}',
    subscription_plan organization_plan DEFAULT 'basic',
    subscription_status subscription_status DEFAULT 'active',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_organizations_slug_format CHECK (slug ~* '^[a-z0-9-]+$'),
    CONSTRAINT chk_organizations_name_length CHECK (char_length(name) >= 2)
);

CREATE TYPE organization_plan AS ENUM ('basic', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'suspended', 'cancelled');

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE UNIQUE INDEX idx_organizations_name_lower ON organizations(LOWER(name));

-- Organization members table
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role organization_member_role NOT NULL DEFAULT 'member',
    permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    joined_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(organization_id, user_id)
);

CREATE TYPE organization_member_role AS ENUM ('owner', 'admin', 'manager', 'member', 'viewer');

CREATE INDEX idx_org_members_organization_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(role);
```

#### 3.3 Recordings Schema

```sql
-- Recordings table
CREATE TABLE recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    url VARCHAR(500) NOT NULL,
    status recording_status DEFAULT 'ready',
    visibility recording_visibility DEFAULT 'private',
    
    -- Metadata
    duration_ms INTEGER,
    step_count INTEGER,
    file_size_bytes BIGINT,
    compression_ratio DECIMAL(5,2),
    checksum VARCHAR(64),
    
    -- Recording settings
    settings JSONB DEFAULT '{}',
    
    -- Browser and environment info
    environment_info JSONB,
    
    -- Tags and categorization
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    category VARCHAR(50),
    
    -- Timestamps
    recording_started_at TIMESTAMP WITH TIME ZONE,
    recording_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT chk_recordings_name_length CHECK (char_length(name) >= 3),
    CONSTRAINT chk_recordings_url_format CHECK (url ~* '^https?://'),
    CONSTRAINT chk_recordings_duration CHECK (duration_ms IS NULL OR duration_ms >= 0),
    CONSTRAINT chk_recordings_step_count CHECK (step_count IS NULL OR step_count >= 0),
    CONSTRAINT chk_recordings_file_size CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
    CONSTRAINT chk_recordings_compression CHECK (compression_ratio IS NULL OR (compression_ratio >= 0 AND compression_ratio <= 1))
);

-- Recording enums
CREATE TYPE recording_status AS ENUM ('ready', 'recording', 'processing', 'completed', 'error', 'archived');
CREATE TYPE recording_visibility AS ENUM ('private', 'team', 'organization', 'public');

-- Indexes for recordings table
CREATE INDEX idx_recordings_user_id ON recordings(user_id);
CREATE INDEX idx_recordings_organization_id ON recordings(organization_id);
CREATE INDEX idx_recordings_status ON recordings(status);
CREATE INDEX idx_recordings_visibility ON recordings(visibility);
CREATE INDEX idx_recordings_tags ON recordings USING GIN(tags);
CREATE INDEX idx_recordings_category ON recordings(category);
CREATE INDEX idx_recordings_url ON recordings(url);
CREATE INDEX idx_recordings_created_at ON recordings(created_at);
CREATE INDEX idx_recordings_last_accessed_at ON recordings(last_accessed_at);
CREATE INDEX idx_recordings_deleted_at ON recordings(deleted_at) WHERE deleted_at IS NOT NULL;

-- Full-text search index
CREATE INDEX idx_recordings_search ON recordings USING GIN(
    to_tsvector('english', 
        coalesce(name, '') || ' ' || 
        coalesce(description, '') || ' ' || 
        coalesce(array_to_string(tags, ' '), '')
    )
);

-- Recording settings JSONB structure
COMMENT ON COLUMN recordings.settings IS 'JSONB structure: {
  "captureConsole": boolean,
  "captureNetwork": boolean,
  "maskSensitiveData": boolean,
  "maxDuration": number,
  "customSelectors": ["string"],
  "frameworkHints": ["string"],
  "quality": "high|medium|low"
}';

-- Environment info JSONB structure  
COMMENT ON COLUMN recordings.environment_info IS 'JSONB structure: {
  "userAgent": "string",
  "platform": "string",
  "browserName": "string",
  "browserVersion": "string",
  "viewport": {"width": number, "height": number},
  "screenResolution": {"width": number, "height": number},
  "timezone": "string",
  "locale": "string"
}';
```

```sql
-- Recording steps table (partitioned by recording_id for performance)
CREATE TABLE recording_steps (
    id UUID DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    timestamp_ms BIGINT NOT NULL,
    interaction_type interaction_type NOT NULL,
    
    -- Element selection information
    element_selector JSONB NOT NULL,
    
    -- Interaction data
    interaction_data JSONB,
    
    -- DOM state
    dom_snapshot JSONB,
    dom_mutations JSONB,
    
    -- Performance metrics
    execution_time_ms INTEGER,
    
    -- Error information
    error_info JSONB,
    
    -- Screenshots and artifacts
    screenshot_url VARCHAR(500),
    artifacts JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_steps_step_number CHECK (step_number >= 1),
    CONSTRAINT chk_steps_timestamp CHECK (timestamp_ms >= 0),
    CONSTRAINT chk_steps_execution_time CHECK (execution_time_ms IS NULL OR execution_time_ms >= 0),
    
    PRIMARY KEY (recording_id, step_number, id)
) PARTITION BY HASH (recording_id);

-- Create partitions for recording_steps
CREATE TABLE recording_steps_p0 PARTITION OF recording_steps FOR VALUES WITH (modulus 4, remainder 0);
CREATE TABLE recording_steps_p1 PARTITION OF recording_steps FOR VALUES WITH (modulus 4, remainder 1);
CREATE TABLE recording_steps_p2 PARTITION OF recording_steps FOR VALUES WITH (modulus 4, remainder 2);
CREATE TABLE recording_steps_p3 PARTITION OF recording_steps FOR VALUES WITH (modulus 4, remainder 3);

-- Interaction types enum
CREATE TYPE interaction_type AS ENUM (
    'page_load', 'navigation', 'click', 'double_click', 'right_click',
    'input', 'change', 'submit', 'focus', 'blur', 'hover',
    'scroll', 'resize', 'key_down', 'key_up', 'key_press',
    'mouse_move', 'mouse_enter', 'mouse_leave', 'drag', 'drop'
);

-- Indexes for recording_steps partitions
CREATE INDEX idx_recording_steps_p0_recording_id ON recording_steps_p0(recording_id);
CREATE INDEX idx_recording_steps_p0_step_number ON recording_steps_p0(recording_id, step_number);
CREATE INDEX idx_recording_steps_p0_timestamp ON recording_steps_p0(timestamp_ms);
CREATE INDEX idx_recording_steps_p0_interaction_type ON recording_steps_p0(interaction_type);

-- Repeat for other partitions...
CREATE INDEX idx_recording_steps_p1_recording_id ON recording_steps_p1(recording_id);
CREATE INDEX idx_recording_steps_p1_step_number ON recording_steps_p1(recording_id, step_number);
CREATE INDEX idx_recording_steps_p2_recording_id ON recording_steps_p2(recording_id);
CREATE INDEX idx_recording_steps_p2_step_number ON recording_steps_p2(recording_id, step_number);
CREATE INDEX idx_recording_steps_p3_recording_id ON recording_steps_p3(recording_id);
CREATE INDEX idx_recording_steps_p3_step_number ON recording_steps_p3(recording_id, step_number);

-- Element selector JSONB structure
COMMENT ON COLUMN recording_steps.element_selector IS 'JSONB structure: {
  "primarySelector": "string",
  "fallbackSelectors": ["string"],
  "xpath": "string",
  "cssPath": "string",
  "attributes": {"key": "value"},
  "textContent": "string",
  "position": {"x": number, "y": number, "width": number, "height": number},
  "dataTestId": "string",
  "ariaLabel": "string"
}';

-- Interaction data JSONB structure
COMMENT ON COLUMN recording_steps.interaction_data IS 'JSONB structure: {
  "value": "any",
  "oldValue": "any",
  "keyCode": number,
  "charCode": number,
  "key": "string",
  "shiftKey": boolean,
  "ctrlKey": boolean,
  "altKey": boolean,
  "metaKey": boolean,
  "button": number,
  "buttons": number,
  "coordinates": {"x": number, "y": number},
  "deltaX": number,
  "deltaY": number,
  "target": "string",
  "currentTarget": "string"
}';
```

#### 3.4 Playback System Schema

```sql
-- Playback sessions table
CREATE TABLE playback_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Session identification
    session_token VARCHAR(255) UNIQUE,
    
    -- Status and progress
    status playback_status DEFAULT 'created',
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER NOT NULL,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Configuration
    environment JSONB NOT NULL,
    options JSONB DEFAULT '{}',
    
    -- Results and metrics
    success_rate DECIMAL(5,2),
    error_count INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    total_duration_ms INTEGER,
    
    -- Execution details
    browser_session_id VARCHAR(255),
    execution_log JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    paused_at TIMESTAMP WITH TIME ZONE,
    resumed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_playback_current_step CHECK (current_step >= 0),
    CONSTRAINT chk_playback_total_steps CHECK (total_steps > 0),
    CONSTRAINT chk_playback_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT chk_playback_success_rate CHECK (success_rate IS NULL OR (success_rate >= 0 AND success_rate <= 100)),
    CONSTRAINT chk_playback_error_count CHECK (error_count >= 0),
    CONSTRAINT chk_playback_retry_count CHECK (retry_count >= 0)
);

-- Playback status enum
CREATE TYPE playback_status AS ENUM (
    'created', 'preparing', 'running', 'paused', 'completed', 'failed', 'cancelled', 'timeout'
);

-- Indexes for playback_sessions
CREATE INDEX idx_playback_sessions_recording_id ON playback_sessions(recording_id);
CREATE INDEX idx_playback_sessions_user_id ON playback_sessions(user_id);
CREATE INDEX idx_playback_sessions_status ON playback_sessions(status);
CREATE INDEX idx_playback_sessions_created_at ON playback_sessions(created_at);
CREATE INDEX idx_playback_sessions_completed_at ON playback_sessions(completed_at);
CREATE INDEX idx_playback_sessions_token ON playback_sessions(session_token);

-- Environment JSONB structure
COMMENT ON COLUMN playback_sessions.environment IS 'JSONB structure: {
  "browser": "chrome|firefox|safari|edge",
  "browserVersion": "string",
  "platform": "windows|macos|linux",
  "viewport": {"width": number, "height": number},
  "userAgent": "string",
  "locale": "string",
  "timezone": "string",
  "headless": boolean
}';

-- Options JSONB structure
COMMENT ON COLUMN playback_sessions.options IS 'JSONB structure: {
  "speed": number,
  "skipInactivity": boolean,
  "maxInactivityTime": number,
  "autoWait": boolean,
  "debugMode": boolean,
  "strictMode": boolean,
  "stopOnError": boolean,
  "maxRetries": number,
  "retryDelay": number,
  "screenshotOnError": boolean,
  "videoRecording": boolean
}';
```

```sql
-- Playback step results table
CREATE TABLE playback_step_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES playback_sessions(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    step_id UUID, -- Reference to recording_steps.id
    
    -- Execution results
    status step_execution_status NOT NULL,
    execution_time_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    
    -- Element location
    element_found BOOLEAN,
    element_selector_used VARCHAR(500),
    element_location_time_ms INTEGER,
    
    -- Error information
    error_type VARCHAR(100),
    error_message TEXT,
    error_details JSONB,
    
    -- Evidence
    screenshot_before_url VARCHAR(500),
    screenshot_after_url VARCHAR(500),
    screenshot_error_url VARCHAR(500),
    
    -- Performance metrics
    dom_ready_time_ms INTEGER,
    network_requests JSONB,
    console_logs JSONB,
    
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT chk_step_results_step_number CHECK (step_number >= 1),
    CONSTRAINT chk_step_results_execution_time CHECK (execution_time_ms IS NULL OR execution_time_ms >= 0),
    CONSTRAINT chk_step_results_retry_count CHECK (retry_count >= 0),
    
    UNIQUE(session_id, step_number)
);

-- Step execution status enum
CREATE TYPE step_execution_status AS ENUM (
    'pending', 'running', 'completed', 'failed', 'skipped', 'retrying', 'timeout'
);

-- Indexes for playback_step_results
CREATE INDEX idx_step_results_session_id ON playback_step_results(session_id);
CREATE INDEX idx_step_results_step_number ON playback_step_results(session_id, step_number);
CREATE INDEX idx_step_results_status ON playback_step_results(status);
CREATE INDEX idx_step_results_error_type ON playback_step_results(error_type) WHERE error_type IS NOT NULL;
CREATE INDEX idx_step_results_completed_at ON playback_step_results(completed_at);

-- Error details JSONB structure
COMMENT ON COLUMN playback_step_results.error_details IS 'JSONB structure: {
  "originalSelector": "string",
  "fallbacksAttempted": ["string"],
  "suggestedSelectors": ["string"],
  "pageUrl": "string",
  "elementVisible": boolean,
  "elementEnabled": boolean,
  "waitTime": number,
  "stackTrace": "string",
  "domSnapshot": "string"
}';
```

#### 3.5 Analytics and Reporting Schema

```sql
-- Analytics events table (time-series data)
CREATE TABLE analytics_events (
    id UUID DEFAULT gen_random_uuid(),
    event_type analytics_event_type NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    
    -- Context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
    session_id UUID REFERENCES playback_sessions(id) ON DELETE CASCADE,
    
    -- Event data
    event_data JSONB DEFAULT '{}',
    properties JSONB DEFAULT '{}',
    
    -- Metrics
    numeric_value DECIMAL(10,4),
    string_value VARCHAR(255),
    
    -- Context information
    ip_address INET,
    user_agent TEXT,
    referer VARCHAR(500),
    
    -- Timestamp (partitioning key)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (created_at, id)
) PARTITION BY RANGE (created_at);

-- Analytics event types
CREATE TYPE analytics_event_type AS ENUM (
    'recording_created', 'recording_started', 'recording_completed', 'recording_failed',
    'playback_started', 'playback_completed', 'playback_failed', 'playback_paused',
    'step_executed', 'step_failed', 'element_not_found',
    'user_login', 'user_logout', 'api_request',
    'error_occurred', 'performance_metric'
);

-- Create monthly partitions for analytics_events (example for 2024)
CREATE TABLE analytics_events_2024_01 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE analytics_events_2024_02 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- ... continue for other months

-- Indexes for analytics_events partitions
CREATE INDEX idx_analytics_events_2024_01_type ON analytics_events_2024_01(event_type);
CREATE INDEX idx_analytics_events_2024_01_user_id ON analytics_events_2024_01(user_id);
CREATE INDEX idx_analytics_events_2024_01_recording_id ON analytics_events_2024_01(recording_id);
CREATE INDEX idx_analytics_events_2024_01_session_id ON analytics_events_2024_01(session_id);

-- Aggregated analytics table for performance
CREATE TABLE analytics_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    summary_type analytics_summary_type NOT NULL,
    time_period analytics_time_period NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Dimensions
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Metrics
    metrics JSONB NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(summary_type, time_period, period_start, user_id, organization_id)
);

CREATE TYPE analytics_summary_type AS ENUM (
    'recording_stats', 'playback_stats', 'user_activity', 'error_stats', 'performance_stats'
);

CREATE TYPE analytics_time_period AS ENUM ('hourly', 'daily', 'weekly', 'monthly');

-- Indexes for analytics_summaries
CREATE INDEX idx_analytics_summaries_type_period ON analytics_summaries(summary_type, time_period);
CREATE INDEX idx_analytics_summaries_period_start ON analytics_summaries(period_start);
CREATE INDEX idx_analytics_summaries_user_id ON analytics_summaries(user_id);
CREATE INDEX idx_analytics_summaries_org_id ON analytics_summaries(organization_id);

-- Metrics JSONB structure examples
COMMENT ON COLUMN analytics_summaries.metrics IS 'JSONB structure examples:
recording_stats: {
  "count": number,
  "totalDuration": number,
  "averageDuration": number,
  "totalSteps": number,
  "averageSteps": number,
  "successRate": number
}
playback_stats: {
  "sessionsCount": number,
  "successRate": number,
  "averageDuration": number,
  "errorRate": number,
  "retryRate": number
}';
```

#### 3.6 File Storage and Assets Schema

```sql
-- File storage table for recording data and assets
CREATE TABLE file_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
    session_id UUID REFERENCES playback_sessions(id) ON DELETE CASCADE,
    
    -- File information
    file_type file_type NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100),
    checksum VARCHAR(64) NOT NULL,
    
    -- Storage information
    storage_provider storage_provider NOT NULL,
    storage_bucket VARCHAR(100),
    storage_key VARCHAR(500) NOT NULL,
    storage_region VARCHAR(50),
    
    -- Access information
    is_public BOOLEAN DEFAULT FALSE,
    public_url VARCHAR(500),
    signed_url_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Lifecycle
    compressed BOOLEAN DEFAULT FALSE,
    compression_ratio DECIMAL(5,2),
    archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_file_storage_size CHECK (file_size_bytes > 0),
    CONSTRAINT chk_file_storage_compression CHECK (compression_ratio IS NULL OR (compression_ratio >= 0 AND compression_ratio <= 1))
);

-- File and storage enums
CREATE TYPE file_type AS ENUM (
    'recording_data', 'dom_snapshot', 'screenshot', 'video', 'log', 'report', 'export'
);

CREATE TYPE storage_provider AS ENUM ('aws_s3', 'gcs', 'azure_blob', 'local');

-- Indexes for file_storage
CREATE INDEX idx_file_storage_recording_id ON file_storage(recording_id);
CREATE INDEX idx_file_storage_session_id ON file_storage(session_id);
CREATE INDEX idx_file_storage_file_type ON file_storage(file_type);
CREATE INDEX idx_file_storage_created_at ON file_storage(created_at);
CREATE INDEX idx_file_storage_checksum ON file_storage(checksum);
CREATE INDEX idx_file_storage_archived ON file_storage(archived) WHERE archived = TRUE;
```

#### 3.7 Webhooks and Notifications Schema

```sql
-- Webhooks table
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Webhook configuration
    name VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    secret_key VARCHAR(255),
    
    -- Events to listen for
    events TEXT[] NOT NULL,
    
    -- Status and health
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    success_count BIGINT DEFAULT 0,
    failure_count BIGINT DEFAULT 0,
    
    -- Retry configuration
    retry_policy JSONB DEFAULT '{"maxRetries": 3, "retryDelay": 5000}',
    
    -- Custom headers
    headers JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_webhooks_url_format CHECK (url ~* '^https?://'),
    CONSTRAINT chk_webhooks_name_length CHECK (char_length(name) >= 3),
    CONSTRAINT chk_webhooks_events_not_empty CHECK (array_length(events, 1) > 0)
);

-- Indexes for webhooks
CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX idx_webhooks_organization_id ON webhooks(organization_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_webhooks_events ON webhooks USING GIN(events);

-- Webhook deliveries table
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    
    -- Delivery information
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    
    -- HTTP details
    http_method VARCHAR(10) DEFAULT 'POST',
    headers JSONB,
    
    -- Response details
    status_code INTEGER,
    response_body TEXT,
    response_headers JSONB,
    
    -- Timing
    duration_ms INTEGER,
    
    -- Status
    status webhook_delivery_status NOT NULL DEFAULT 'pending',
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Error information
    error_message TEXT,
    
    -- Timestamps
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT chk_webhook_deliveries_attempt_count CHECK (attempt_count >= 0),
    CONSTRAINT chk_webhook_deliveries_max_attempts CHECK (max_attempts > 0),
    CONSTRAINT chk_webhook_deliveries_status_code CHECK (status_code IS NULL OR (status_code >= 100 AND status_code <= 599))
);

CREATE TYPE webhook_delivery_status AS ENUM ('pending', 'delivered', 'failed', 'cancelled');

-- Indexes for webhook_deliveries
CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_scheduled_at ON webhook_deliveries(scheduled_at);
CREATE INDEX idx_webhook_deliveries_event_type ON webhook_deliveries(event_type);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE status = 'pending' AND next_retry_at IS NOT NULL;
```

#### 3.8 Audit and Security Schema

```sql
-- Audit log table
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid(),
    
    -- Actor information
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    
    -- Action information
    action audit_action NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    
    -- Details
    details JSONB,
    old_values JSONB,
    new_values JSONB,
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    
    -- Result
    status audit_status NOT NULL,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (created_at, id)
) PARTITION BY RANGE (created_at);

-- Audit enums
CREATE TYPE audit_action AS ENUM (
    'create', 'read', 'update', 'delete', 'login', 'logout',
    'upload', 'download', 'share', 'execute', 'cancel'
);

CREATE TYPE audit_status AS ENUM ('success', 'failure', 'partial');

-- Create monthly partitions for audit_logs
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
-- ... continue for other months

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_2024_01_user_id ON audit_logs_2024_01(user_id);
CREATE INDEX idx_audit_logs_2024_01_action ON audit_logs_2024_01(action);
CREATE INDEX idx_audit_logs_2024_01_resource ON audit_logs_2024_01(resource_type, resource_id);
CREATE INDEX idx_audit_logs_2024_01_ip_address ON audit_logs_2024_01(ip_address);

-- Security events table
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event information
    event_type security_event_type NOT NULL,
    severity security_severity NOT NULL,
    
    -- Actor information
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    
    -- Details
    description TEXT NOT NULL,
    details JSONB,
    
    -- Status
    status security_status DEFAULT 'open',
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Security enums
CREATE TYPE security_event_type AS ENUM (
    'failed_login', 'suspicious_activity', 'rate_limit_exceeded',
    'unauthorized_access', 'data_breach_attempt', 'malicious_request'
);

CREATE TYPE security_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE security_status AS ENUM ('open', 'investigating', 'resolved', 'false_positive');

-- Indexes for security_events
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_status ON security_events(status);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_ip_address ON security_events(ip_address);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);
```

### 4. Views and Functions

#### 4.1 Useful Views

```sql
-- Recording summary view
CREATE VIEW recording_summaries AS
SELECT 
    r.id,
    r.name,
    r.description,
    r.url,
    r.status,
    r.visibility,
    r.duration_ms,
    r.step_count,
    r.tags,
    r.created_at,
    r.updated_at,
    u.name AS user_name,
    u.email AS user_email,
    o.name AS organization_name,
    COALESCE(ps.playback_count, 0) AS playback_count,
    COALESCE(ps.avg_success_rate, 0) AS avg_success_rate,
    COALESCE(ps.last_playback, NULL) AS last_playback
FROM recordings r
LEFT JOIN users u ON r.user_id = u.id
LEFT JOIN organizations o ON r.organization_id = o.id
LEFT JOIN (
    SELECT 
        recording_id,
        COUNT(*) AS playback_count,
        AVG(success_rate) AS avg_success_rate,
        MAX(completed_at) AS last_playback
    FROM playback_sessions 
    WHERE status = 'completed'
    GROUP BY recording_id
) ps ON r.id = ps.recording_id
WHERE r.deleted_at IS NULL;

-- Active playback sessions view
CREATE VIEW active_playback_sessions AS
SELECT 
    ps.id,
    ps.recording_id,
    r.name AS recording_name,
    ps.user_id,
    u.name AS user_name,
    ps.status,
    ps.current_step,
    ps.total_steps,
    ps.progress_percentage,
    ps.started_at,
    ps.last_activity_at,
    EXTRACT(EPOCH FROM (NOW() - ps.started_at))::INTEGER AS running_time_seconds
FROM playback_sessions ps
JOIN recordings r ON ps.recording_id = r.id
LEFT JOIN users u ON ps.user_id = u.id
WHERE ps.status IN ('running', 'paused', 'preparing');

-- User activity summary view
CREATE VIEW user_activity_summaries AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u.created_at AS user_created_at,
    u.last_login_at,
    COUNT(DISTINCT r.id) AS total_recordings,
    COUNT(DISTINCT ps.id) AS total_playback_sessions,
    COALESCE(AVG(r.duration_ms), 0) AS avg_recording_duration,
    COALESCE(AVG(ps.success_rate), 0) AS avg_playback_success_rate
FROM users u
LEFT JOIN recordings r ON u.id = r.user_id AND r.deleted_at IS NULL
LEFT JOIN playback_sessions ps ON u.id = ps.user_id AND ps.status = 'completed'
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.name, u.email, u.role, u.created_at, u.last_login_at;
```

#### 4.2 Database Functions

```sql
-- Function to calculate recording file size compression ratio
CREATE OR REPLACE FUNCTION calculate_compression_ratio(
    original_size BIGINT,
    compressed_size BIGINT
) RETURNS DECIMAL(5,2) AS $$
BEGIN
    IF original_size IS NULL OR original_size = 0 THEN
        RETURN NULL;
    END IF;
    
    RETURN ROUND((compressed_size::DECIMAL / original_size::DECIMAL), 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate recording step statistics
CREATE OR REPLACE FUNCTION get_recording_step_stats(recording_uuid UUID)
RETURNS TABLE(
    total_steps INTEGER,
    avg_step_duration DECIMAL,
    interaction_type_breakdown JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER AS total_steps,
        ROUND(AVG(execution_time_ms), 2) AS avg_step_duration,
        json_object_agg(
            interaction_type, 
            count
        )::JSONB AS interaction_type_breakdown
    FROM (
        SELECT 
            rs.interaction_type,
            rs.execution_time_ms,
            COUNT(*) OVER (PARTITION BY rs.interaction_type) as count
        FROM recording_steps rs 
        WHERE rs.recording_id = recording_uuid
    ) step_data;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to clean up old audit logs (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
    partition_name TEXT;
    cutoff_date DATE;
BEGIN
    cutoff_date := CURRENT_DATE - INTERVAL '1 day' * retention_days;
    deleted_count := 0;
    
    -- Drop old partitions
    FOR partition_name IN 
        SELECT schemaname||'.'||tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'audit_logs_%' 
        AND tablename < 'audit_logs_' || TO_CHAR(cutoff_date, 'YYYY_MM')
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || partition_name;
        deleted_count := deleted_count + 1;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

### 5. Triggers and Constraints

#### 5.1 Audit Triggers

```sql
-- Function for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_recordings_updated_at
    BEFORE UPDATE ON recordings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_playback_sessions_updated_at
    BEFORE UPDATE ON playback_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger for sensitive tables
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_data JSONB;
BEGIN
    -- Determine the action
    IF TG_OP = 'DELETE' THEN
        audit_data := to_jsonb(OLD);
        INSERT INTO audit_logs (
            action, resource_type, resource_id, old_values, status, created_at
        ) VALUES (
            'delete'::audit_action, 
            TG_TABLE_NAME, 
            (OLD.id)::UUID, 
            audit_data, 
            'success'::audit_status, 
            CURRENT_TIMESTAMP
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (
            action, resource_type, resource_id, old_values, new_values, status, created_at
        ) VALUES (
            'update'::audit_action, 
            TG_TABLE_NAME, 
            (NEW.id)::UUID, 
            to_jsonb(OLD), 
            to_jsonb(NEW), 
            'success'::audit_status, 
            CURRENT_TIMESTAMP
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (
            action, resource_type, resource_id, new_values, status, created_at
        ) VALUES (
            'create'::audit_action, 
            TG_TABLE_NAME, 
            (NEW.id)::UUID, 
            to_jsonb(NEW), 
            'success'::audit_status, 
            CURRENT_TIMESTAMP
        );
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to critical tables
CREATE TRIGGER audit_recordings_trigger
    AFTER INSERT OR UPDATE OR DELETE ON recordings
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();
```

### 6. Performance Optimization

#### 6.1 Indexes for Performance

```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_recordings_user_status_created 
    ON recordings(user_id, status, created_at DESC) 
    WHERE deleted_at IS NULL;

CREATE INDEX idx_playback_sessions_recording_status 
    ON playback_sessions(recording_id, status, completed_at DESC);

CREATE INDEX idx_recording_steps_recording_timestamp 
    ON recording_steps(recording_id, timestamp_ms);

-- Partial indexes for active/non-deleted records
CREATE INDEX idx_users_active_email 
    ON users(email) 
    WHERE is_active = TRUE AND deleted_at IS NULL;

CREATE INDEX idx_recordings_public 
    ON recordings(visibility, created_at DESC) 
    WHERE visibility = 'public' AND deleted_at IS NULL;

-- Functional indexes for search
CREATE INDEX idx_recordings_name_trgm 
    ON recordings USING gin(name gin_trgm_ops);

CREATE INDEX idx_recordings_description_trgm 
    ON recordings USING gin(description gin_trgm_ops);
```

#### 6.2 Partitioning Maintenance

```sql
-- Function to create new monthly partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(
    table_name TEXT,
    year_month TEXT
) RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || year_month;
    start_date := (year_month || '-01')::DATE;
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        partition_name, table_name, start_date, end_date
    );
    
    -- Create indexes on the new partition
    IF table_name = 'analytics_events' THEN
        EXECUTE format('CREATE INDEX idx_%I_type ON %I(event_type)', partition_name, partition_name);
        EXECUTE format('CREATE INDEX idx_%I_user_id ON %I(user_id)', partition_name, partition_name);
        EXECUTE format('CREATE INDEX idx_%I_recording_id ON %I(recording_id)', partition_name, partition_name);
    ELSIF table_name = 'audit_logs' THEN
        EXECUTE format('CREATE INDEX idx_%I_user_id ON %I(user_id)', partition_name, partition_name);
        EXECUTE format('CREATE INDEX idx_%I_action ON %I(action)', partition_name, partition_name);
        EXECUTE format('CREATE INDEX idx_%I_resource ON %I(resource_type, resource_id)', partition_name, partition_name);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Automated partition creation for next month
CREATE OR REPLACE FUNCTION ensure_future_partitions()
RETURNS VOID AS $$
DECLARE
    next_month TEXT;
BEGIN
    next_month := TO_CHAR(CURRENT_DATE + INTERVAL '1 month', 'YYYY_MM');
    
    PERFORM create_monthly_partition('analytics_events', next_month);
    PERFORM create_monthly_partition('audit_logs', next_month);
END;
$$ LANGUAGE plpgsql;
```

### 7. Data Retention and Archival

#### 7.1 Retention Policies

```sql
-- Retention configuration table
CREATE TABLE retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL UNIQUE,
    retention_days INTEGER NOT NULL,
    archive_before_delete BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_retention_days CHECK (retention_days > 0)
);

-- Default retention policies
INSERT INTO retention_policies (table_name, retention_days, archive_before_delete) VALUES
('audit_logs', 365, TRUE),
('analytics_events', 730, TRUE),
('webhook_deliveries', 90, FALSE),
('user_sessions', 30, FALSE),
('playback_step_results', 365, TRUE),
('file_storage', 1095, TRUE); -- 3 years

-- Archival function
CREATE OR REPLACE FUNCTION archive_old_data(
    table_name_param TEXT,
    retention_days_param INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    retention_days INTEGER;
    cutoff_date TIMESTAMP WITH TIME ZONE;
    archived_count INTEGER := 0;
BEGIN
    -- Get retention policy
    IF retention_days_param IS NULL THEN
        SELECT rp.retention_days INTO retention_days
        FROM retention_policies rp
        WHERE rp.table_name = table_name_param AND rp.is_active = TRUE;
        
        IF retention_days IS NULL THEN
            RAISE EXCEPTION 'No retention policy found for table %', table_name_param;
        END IF;
    ELSE
        retention_days := retention_days_param;
    END IF;
    
    cutoff_date := CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days;
    
    -- Archive based on table
    CASE table_name_param
        WHEN 'recordings' THEN
            UPDATE recordings 
            SET deleted_at = CURRENT_TIMESTAMP,
                archived_at = CURRENT_TIMESTAMP
            WHERE created_at < cutoff_date 
              AND deleted_at IS NULL 
              AND archived_at IS NULL;
            GET DIAGNOSTICS archived_count = ROW_COUNT;
            
        WHEN 'playback_sessions' THEN
            -- Move old sessions to archive table (if exists)
            -- For now, just mark as archived
            archived_count := 0; -- Implementation depends on archival strategy
            
        ELSE
            RAISE EXCEPTION 'Archival not implemented for table %', table_name_param;
    END CASE;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
```

### 8. Database Maintenance

#### 8.1 Regular Maintenance Tasks

```sql
-- Database statistics update function
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS VOID AS $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ANALYZE ' || quote_ident(table_record.schemaname) || '.' || quote_ident(table_record.tablename);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Index maintenance function
CREATE OR REPLACE FUNCTION reindex_tables()
RETURNS VOID AS $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
          AND tablename NOT LIKE '%_p[0-9]%' -- Skip partitions
    LOOP
        EXECUTE 'REINDEX TABLE ' || quote_ident(table_record.schemaname) || '.' || quote_ident(table_record.tablename);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Vacuum and analyze function
CREATE OR REPLACE FUNCTION vacuum_analyze_tables()
RETURNS VOID AS $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'VACUUM ANALYZE ' || quote_ident(table_record.schemaname) || '.' || quote_ident(table_record.tablename);
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### 9. Backup and Recovery

#### 9.1 Backup Strategy

```sql
-- Backup metadata table
CREATE TABLE backup_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type backup_type NOT NULL,
    backup_name VARCHAR(100) NOT NULL,
    backup_path VARCHAR(500) NOT NULL,
    backup_size_bytes BIGINT,
    compression_type VARCHAR(20),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    status backup_status DEFAULT 'running',
    error_message TEXT,
    retention_until TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE backup_type AS ENUM ('full', 'incremental', 'transaction_log');
CREATE TYPE backup_status AS ENUM ('running', 'completed', 'failed', 'cancelled');

-- Point-in-time recovery information
CREATE TABLE recovery_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    recovery_time TIMESTAMP WITH TIME ZONE NOT NULL,
    lsn_position TEXT, -- LSN (Log Sequence Number) for PostgreSQL
    backup_files JSONB, -- Array of backup files needed for recovery
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 10. Monitoring and Health Checks

#### 10.1 Database Health Views

```sql
-- Database size and growth view
CREATE VIEW database_size_stats AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_relation_size(schemaname||'.'||tablename) AS table_size_bytes,
    (pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage statistics view
CREATE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Long-running queries view
CREATE VIEW long_running_queries AS
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state,
    wait_event_type,
    wait_event
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  AND state = 'active'
ORDER BY duration DESC;
```

This comprehensive database schema provides a solid foundation for the DOM Interaction Recording and Replay System, with considerations for performance, scalability, data integrity, and maintainability. The schema supports complex queries, provides audit trails, and includes mechanisms for data retention and archival.