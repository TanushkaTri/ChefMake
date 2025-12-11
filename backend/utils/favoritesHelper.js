const MIN_PARTIAL_MATCH_LENGTH = 3;
const FAVORITES_KEYWORDS = ['избран', 'favorite', 'любим'];

const normalizeText = (text = '') => text.trim().toLowerCase();

const formatFavoritesList = (favorites) => {
  if (!favorites.length) {
    return { sorted: [], text: '' };
  }

  const sorted = [...favorites].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'ru', { sensitivity: 'base' })
  );

  const lines = sorted.map((recipe, index) => {
    const cookTime = recipe.cook_time ? `${recipe.cook_time} мин` : null;
    return `${index + 1}. ${recipe.name}${cookTime ? ` · ${cookTime}` : ''}`;
  });

  return { sorted, text: lines.join('\n') };
};

const formatRecipeDetails = (recipe) => {
  if (!recipe) return '';

  const prep = recipe.prep_time ? `${recipe.prep_time} мин` : null;
  const cook = recipe.cook_time ? `${recipe.cook_time} мин` : null;
  const timeLabel = prep && cook
    ? `Подготовка ${prep}, готовка ${cook}`
    : (prep || cook || 'Время не указано');

  const difficulty = recipe.difficulty ? recipe.difficulty : 'не указана';

  const ingredients = (recipe.ingredients || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => `• ${item}`)
    .join('\n') || 'Ингредиенты не указаны.';

  const steps = (recipe.instruction || '')
    .split(/\r?\n/)
    .map(step => step.trim())
    .filter(Boolean);
  const limitedSteps = steps.slice(0, 5)
    .map((step, idx) => `${idx + 1}. ${step}`)
    .join('\n') || 'Шаги не указаны.';

  return `«${recipe.name}»\nВремя: ${timeLabel}\nСложность: ${difficulty}\n\nИнгредиенты:\n${ingredients}\n\nШаги:\n${limitedSteps}\n\nНапишите название другого избранного рецепта или «Покажи избранные», чтобы увидеть список.`;
};

const findFavoriteByQuery = (query, favorites) => {
  if (!favorites.length || !query) {
    return null;
  }

  const normalizedFavorites = favorites.map(recipe => ({
    ...recipe,
    normalizedName: (recipe.name || '').toLowerCase()
  }));

  if (/^\d+$/.test(query)) {
    const index = Number(query) - 1;
    if (index >= 0 && index < favorites.length) {
      return favorites[index];
    }
  }

  const exactMatch = normalizedFavorites.find(recipe => recipe.normalizedName === query);
  if (exactMatch) {
    return exactMatch;
  }

  if (query.length >= MIN_PARTIAL_MATCH_LENGTH) {
    const partialMatch = normalizedFavorites.find(recipe => recipe.normalizedName.includes(query));
    if (partialMatch) {
      return partialMatch;
    }
  }

  return null;
};

module.exports = {
  FAVORITES_KEYWORDS,
  MIN_PARTIAL_MATCH_LENGTH,
  normalizeText,
  formatFavoritesList,
  formatRecipeDetails,
  findFavoriteByQuery,
};

