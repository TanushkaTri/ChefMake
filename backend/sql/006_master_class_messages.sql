CREATE TABLE IF NOT EXISTS master_class_messages (
    id SERIAL PRIMARY KEY,
    master_class_id INTEGER NOT NULL REFERENCES master_classes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_class_messages_class_id ON master_class_messages(master_class_id);
CREATE INDEX IF NOT EXISTS idx_master_class_messages_created_at ON master_class_messages(created_at DESC);

