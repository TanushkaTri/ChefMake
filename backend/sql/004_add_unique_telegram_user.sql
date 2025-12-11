-- Ensure each application user can be linked to only one Telegram chat
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'telegram_links'
          AND constraint_name = 'telegram_links_user_id_key'
    ) THEN
        ALTER TABLE telegram_links
        ADD CONSTRAINT telegram_links_user_id_key UNIQUE (user_id);
    END IF;
END $$;

