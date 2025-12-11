const WeeklyPlanModel = require('../models/weeklyPlanModel');
const ShoppingListModel = require('../models/shoppingListModel');
const RecipeModel = require('../models/recipeModel');

/**
 * Retrieves the weekly meal plan for the logged-in user.
 * @route GET /api/planner/weekly-plan?week_start=YYYY-MM-DD
 * @access Protected
 */
exports.getWeeklyPlan = async (req, res) => {
    const userId = req.user.id;
    const weekStart = req.query.week_start; // Optional: YYYY-MM-DD format

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
        const plan = await WeeklyPlanModel.getWeeklyPlan(userId, weekStart);
        res.status(200).json({ plan });
    } catch (error) {
        console.error("[MealPlanner] Error fetching weekly plan:", error.message);
        res.status(500).json({ error: 'Failed to load weekly plan.', details: error.message });
    }
};

/**
 * Saves or updates a meal plan entry for the logged-in user.
 * @route POST /api/planner/weekly-plan/meal
 * @access Protected
 */
exports.saveMealToPlan = async (req, res) => {
    const userId = req.user.id;
    const { day_of_week, meal_slot, recipe_id } = req.body;
 
    if (!day_of_week || !meal_slot || !recipe_id) {
        return res.status(400).json({ error: 'Day, meal slot, and recipe ID are required.' });
    }
 
    try {
        const weekStart = req.body.week_start; // Optional: YYYY-MM-DD format
        const result = await WeeklyPlanModel.saveMealPlanEntry(userId, day_of_week, meal_slot, recipe_id, weekStart);
        const plan = await WeeklyPlanModel.getWeeklyPlan(userId, weekStart);
        res.status(200).json({ message: 'Meal plan entry saved.', plan });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save meal plan entry.', details: error.message });
    }
};

/**
 * Deletes a meal plan entry for the logged-in user.
 * @route DELETE /api/planner/weekly-plan/meal
 * @access Protected
 */
exports.deleteMealFromPlan = async (req, res) => {
    const userId = req.user.id;
    const { day_of_week, meal_slot } = req.body;

    if (!day_of_week || !meal_slot) {
        return res.status(400).json({ error: 'Day and meal slot are required.' });
    }

    try {
        const weekStart = req.body.week_start; // Optional: YYYY-MM-DD format
        await WeeklyPlanModel.deleteMealPlanEntry(userId, day_of_week, meal_slot, weekStart);
        const plan = await WeeklyPlanModel.getWeeklyPlan(userId, weekStart);
        res.status(200).json({ message: 'Meal plan entry deleted.', plan });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete meal plan entry.', details: error.message });
    }
};

/**
 * Fills empty meal plan slots with random recipes for the logged-in user.
 * @route POST /api/planner/random-meals
 * @access Protected
 */
exports.randomizeMealPlan = async (req, res) => {
    const userId = req.user.id;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
        const weekStart = req.body.week_start; // Optional: YYYY-MM-DD format
        const currentPlan = await WeeklyPlanModel.getWeeklyPlan(userId, weekStart);
        const plannedSlots = new Set(currentPlan.map(meal => `${meal.day_of_week}-${meal.meal_slot}`));

        const emptySlots = [];
        const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const mealTypes = ["breakfast", "lunch", "dinner"];

        weekDays.forEach(day => {
            mealTypes.forEach(mealType => {
                if (!plannedSlots.has(`${day}-${mealType}`)) {
                    emptySlots.push({ day, mealType });
                }
            });
        });

        if (emptySlots.length === 0) {
            return res.status(200).json({ message: 'All meal slots are already filled.', plan: currentPlan });
        }

        const randomRecipes = await RecipeModel.getRandomRecipes(emptySlots.length);

        if (randomRecipes.length < emptySlots.length) {
            return res.status(500).json({ error: 'Not enough recipes in the database to fill all slots.' });
        }

        for (let i = 0; i < emptySlots.length; i++) {
            const { day, mealType } = emptySlots[i];
            const recipe = randomRecipes[i];
            await WeeklyPlanModel.saveMealPlanEntry(userId, day, mealType, recipe.id, weekStart);
        }

        const updatedPlan = await WeeklyPlanModel.getWeeklyPlan(userId, weekStart);
        res.status(200).json({ message: 'Empty slots filled with random meals.', plan: updatedPlan });

    } catch (error) {
        console.error("[MealPlanner] Error randomizing meal plan:", error.message);
        res.status(500).json({ error: 'Failed to randomize meal plan.', details: error.message });
    }
};