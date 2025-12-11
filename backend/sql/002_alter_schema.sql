-- Add meal_slot column to weekly_plan if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'weekly_plan' AND column_name = 'meal_slot'
    ) THEN
        ALTER TABLE weekly_plan ADD COLUMN meal_slot TEXT;
    END IF;
END $$;

-- Ensure planned_at column exists in weekly_plan
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'weekly_plan' AND column_name = 'planned_at'
    ) THEN
        ALTER TABLE weekly_plan ADD COLUMN planned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Telegram links table
CREATE TABLE IF NOT EXISTS telegram_links (
    telegram_id BIGINT PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Remove old unique constraint that doesn't account for weeks
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'weekly_plan_user_id_day_of_week_meal_slot_key'
    ) THEN
        ALTER TABLE weekly_plan DROP CONSTRAINT weekly_plan_user_id_day_of_week_meal_slot_key;
    END IF;
END $$;

-- Update existing records to have a default meal_slot if NULL
UPDATE weekly_plan SET meal_slot = 'lunch' WHERE meal_slot IS NULL;

-- Update existing records to have planned_at set to current timestamp if NULL
UPDATE weekly_plan SET planned_at = CURRENT_TIMESTAMP WHERE planned_at IS NULL;
