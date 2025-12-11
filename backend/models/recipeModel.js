const pool = require("../config/db");

// Fetch all recipes with an 'is_cooked' status for a given user
exports.getAllRecipesWithStatus = async (userId) => {
  const result = await pool.query(
    `SELECT
      r.*,
      CASE WHEN cm.recipe_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_cooked
    FROM recipes r
    LEFT JOIN (SELECT DISTINCT recipe_id, user_id FROM cooked_meals WHERE user_id = $1) AS cm
      ON r.id = cm.recipe_id
    ORDER BY r.name ASC;`,
    [userId]
  );
  return result.rows;
};

// Fetch a single recipe by ID with its 'is_cooked' status for a given user
exports.getRecipeByIdWithStatus = async (id, userId) => {
  const result = await pool.query(
    `SELECT
      r.*,
      CASE WHEN cm.recipe_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_cooked
    FROM recipes r
    LEFT JOIN (SELECT DISTINCT recipe_id, user_id FROM cooked_meals WHERE user_id = $1) AS cm
      ON r.id = cm.recipe_id
    WHERE r.id = $2;`,
    [userId, id]
  );
  return result.rows[0];
};

// Search recipes by name or ingredients and return with 'is_cooked' status for a given user
exports.searchRecipesByNameWithStatus = async (query, userId) => {
  const searchTerm = `%${query}%`;
  const result = await pool.query(
    `SELECT
      r.*,
      CASE WHEN cm.recipe_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_cooked
    FROM recipes r
    LEFT JOIN (SELECT DISTINCT recipe_id, user_id FROM cooked_meals WHERE user_id = $1) AS cm
      ON r.id = cm.recipe_id
    WHERE r.name ILIKE $2
      OR COALESCE(r.ingredients, '') ILIKE $2
    ORDER BY r.name ASC;`,
    [userId, searchTerm]
  );
  return result.rows;
};

// Filter recipes by diet, course, flavorProfile, difficulty, and region with 'is_cooked' status for a given user
exports.filterRecipesWithStatus = async ({ course, flavorProfile, difficulty }, userId) => {
  let query = `
    SELECT
      r.*,
      CASE WHEN cm.recipe_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_cooked
    FROM recipes r
    LEFT JOIN (SELECT DISTINCT recipe_id, user_id FROM cooked_meals WHERE user_id = $1) AS cm
      ON r.id = cm.recipe_id
    WHERE 1=1`;
  const values = [userId];
  const toArray = (value) =>
    !value ? [] : Array.isArray(value) ? value : [value];

  const courseValues = toArray(course);
  const flavorValues = toArray(flavorProfile);
  const difficultyValues = toArray(difficulty);

  if (courseValues.length) {
    values.push(courseValues.map((c) => `%${c}%`));
    query += ` AND r.course ILIKE ANY($${values.length})`;
  }

  if (flavorValues.length) {
    values.push(flavorValues.map((f) => `%${f}%`));
    query += ` AND r.flavor_profile ILIKE ANY($${values.length})`;
  }

  if (difficultyValues.length) {
    values.push(difficultyValues);
    query += ` AND r.difficulty = ANY($${values.length})`;
  }
  
  query += ` ORDER BY r.name ASC`;

  const result = await pool.query(query, values);
  return result.rows;
};

// Fetch a given number of random recipes (no user-specific cooked status)
exports.getRandomRecipes = async (count) => {
  try {
    const result = await pool.query(
      `
      SELECT id, name, prep_time, cook_time
      FROM recipes
      ORDER BY RANDOM()
      LIMIT $1;
      `,
      [count]
    );
    return result.rows;
  } catch (error) {
    console.error('[DB] Failed to fetch random recipes:', error);
    throw error;
  }
};
