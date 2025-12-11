CREATE TABLE IF NOT EXISTS master_classes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    ingredients TEXT[] DEFAULT '{}',
    start_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    video_mode VARCHAR(16) NOT NULL DEFAULT 'stream', -- stream | link
    conference_url TEXT,
    stream_call_id TEXT,
    stream_call_template TEXT DEFAULT 'default',
    status VARCHAR(16) NOT NULL DEFAULT 'scheduled', -- scheduled | live | completed | cancelled
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_classes_start_time ON master_classes(start_time);
CREATE INDEX IF NOT EXISTS idx_master_classes_status ON master_classes(status);

CREATE TABLE IF NOT EXISTS master_class_attendees (
    id SERIAL PRIMARY KEY,
    master_class_id INTEGER NOT NULL REFERENCES master_classes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL DEFAULT 'guest',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(master_class_id, user_id)
);

