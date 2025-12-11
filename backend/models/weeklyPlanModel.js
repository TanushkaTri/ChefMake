const pool = require('../config/db');

const WeeklyPlanModel = {
    /**
     * Retrieves a user's weekly meal plan with recipe details.
     * @param {number} userId - User ID
     * @param {string} weekStart - Optional: Week start date in YYYY-MM-DD format
     */
    async getWeeklyPlan(userId, weekStart = null) {
        try {
            let query, params;
            
            if (weekStart) {
                // Filter by week: get all entries where planned_at falls within the week
                // Week starts on Monday (weekStart) and ends on Sunday (weekStart + 6 days)
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999); // End of Sunday
                
                query = `
                    SELECT
                        wp.id,
                        wp.day_of_week,
                        wp.meal_slot,
                        r.id AS recipe_id,
                        r.name AS recipe_name,
                        r.prep_time,
                        r.cook_time
                    FROM weekly_plan wp
                    INNER JOIN recipes r ON wp.recipe_id = r.id
                    WHERE wp.user_id = $1
                        AND wp.planned_at >= $2::date
                        AND wp.planned_at < ($3::date + INTERVAL '1 day')
                    ORDER BY wp.id;
                `;
                params = [userId, weekStart, weekEnd.toISOString().split('T')[0]];
            } else {
                // Get all plans (backward compatibility)
                query = `
                    SELECT
                        wp.id,
                        wp.day_of_week,
                        wp.meal_slot,
                        r.id AS recipe_id,
                        r.name AS recipe_name,
                        r.prep_time,
                        r.cook_time
                    FROM weekly_plan wp
                    INNER JOIN recipes r ON wp.recipe_id = r.id
                    WHERE wp.user_id = $1
                    ORDER BY wp.id;
                `;
                params = [userId];
            }

            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('[DB] Failed to fetch weekly plan:', error);
            throw error;
        }
    },

    /**
     * Inserts or updates a meal plan entry (one per user/day/slot).
     * @param {number} userId - User ID
     * @param {string} dayOfWeek - Day of week (Monday, Tuesday, etc.)
     * @param {string} mealSlot - Meal slot (breakfast, lunch, dinner)
     * @param {number} recipeId - Recipe ID
     * @param {string} weekStart - Optional: Week start date in YYYY-MM-DD format
     */
    async saveMealPlanEntry(userId, dayOfWeek, mealSlot, recipeId, weekStart = null) {
        try {
            // If weekStart is provided, set planned_at to the specific day of that week
            let plannedAt = new Date();
            if (weekStart) {
                const weekStartDate = new Date(weekStart);
                const dayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(dayOfWeek);
                if (dayIndex !== -1) {
                    plannedAt = new Date(weekStartDate);
                    plannedAt.setDate(plannedAt.getDate() + dayIndex);
                }
            }

            // First, try to find existing entry for this week
            let existingEntry = null;
            if (weekStart) {
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999);
                
                const findQuery = `
                    SELECT id FROM weekly_plan
                    WHERE user_id = $1
                        AND day_of_week = $2
                        AND meal_slot = $3
                        AND planned_at >= $4::date
                        AND planned_at < ($5::date + INTERVAL '1 day')
                    LIMIT 1;
                `;
                const findResult = await pool.query(findQuery, [
                    userId, 
                    dayOfWeek, 
                    mealSlot, 
                    weekStart, 
                    weekEnd.toISOString().split('T')[0]
                ]);
                existingEntry = findResult.rows[0];
            } else {
                // For backward compatibility: find any entry for this user/day/slot
                // (without week filtering)
                const findQuery = `
                    SELECT id FROM weekly_plan
                    WHERE user_id = $1
                        AND day_of_week = $2
                        AND meal_slot = $3
                    ORDER BY planned_at DESC
                    LIMIT 1;
                `;
                const findResult = await pool.query(findQuery, [
                    userId, 
                    dayOfWeek, 
                    mealSlot
                ]);
                existingEntry = findResult.rows[0];
            }

            if (existingEntry) {
                // Update existing entry
                const result = await pool.query(
                    `
                    UPDATE weekly_plan
                    SET recipe_id = $1,
                        planned_at = $2
                    WHERE id = $3
                    RETURNING *;
                    `,
                    [recipeId, plannedAt, existingEntry.id]
                );
                return result.rows[0];
            } else {
                // Insert new entry
                const result = await pool.query(
                    `
                    INSERT INTO weekly_plan (user_id, day_of_week, meal_slot, recipe_id, planned_at)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *;
                    `,
                    [userId, dayOfWeek, mealSlot, recipeId, plannedAt]
                );
                return result.rows[0];
            }
        } catch (error) {
            console.error('[DB] Failed to save meal plan entry:', error);
            throw error;
        }
    },

    /**
     * Deletes a meal plan entry by user/day/slot.
     * @param {number} userId - User ID
     * @param {string} dayOfWeek - Day of week (Monday, Tuesday, etc.)
     * @param {string} mealSlot - Meal slot (breakfast, lunch, dinner)
     * @param {string} weekStart - Optional: Week start date in YYYY-MM-DD format
     */
    async deleteMealPlanEntry(userId, dayOfWeek, mealSlot, weekStart = null) {
        try {
            let query, params;
            
            if (weekStart) {
                // Delete entry for specific week
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999);
                
                query = `
                    DELETE FROM weekly_plan
                    WHERE user_id = $1 
                        AND day_of_week = $2 
                        AND meal_slot = $3
                        AND planned_at >= $4::date
                        AND planned_at < ($5::date + INTERVAL '1 day');
                `;
                params = [userId, dayOfWeek, mealSlot, weekStart, weekEnd.toISOString().split('T')[0]];
            } else {
                // Delete all entries for this day/slot (backward compatibility)
                query = `
                    DELETE FROM weekly_plan
                    WHERE user_id = $1 AND day_of_week = $2 AND meal_slot = $3;
                `;
                params = [userId, dayOfWeek, mealSlot];
            }

            const result = await pool.query(query, params);
            return result.rowCount;
        } catch (error) {
            console.error('[DB] Failed to delete meal plan entry:', error);
            throw error;
        }
    }
};

module.exports = WeeklyPlanModel;