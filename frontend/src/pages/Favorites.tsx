import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { Heart } from 'lucide-react';
import RecipeCard from '@/components/RecipeCard';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Recipe } from '@/types/recipe';
import { favoritesService } from '@/services/favoritesService';

const FALLBACK_IMAGE_URL = '/placeholder.svg';

/**
 * Favorites Page
 * Displays user's favorite recipes with stats and handles favorite toggle.
 */
export const Favorites = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdatingFavorites, setIsUpdatingFavorites] = useState(false);

  // Fetch user's favorite recipes
  const {
    data: favoriteRecipes,
    isLoading: favoritesLoading,
    isFetching: favoritesFetching,
    isError: favoritesError,
    error: favoritesFetchError
  } = useQuery<Recipe[], Error>({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user?.token) return [];
      const fetchedFavorites = await favoritesService.getFavorites(user.token);
      return Array.isArray(fetchedFavorites) ? fetchedFavorites : [];
    },
    enabled: !!user?.id,
    staleTime: 0,
    keepPreviousData: true
  });

  // Show toast on fetch error
  useEffect(() => {
    if (favoritesError && favoritesFetchError) {
      toast({
        title: "Ошибка загрузки избранного",
        description: favoritesFetchError.message || "Не удалось получить избранные рецепты.",
        variant: "destructive",
      });
    }
  }, [favoritesError, favoritesFetchError, toast]);

  // Mutation to add a recipe to favorites
  const addFavoriteMutation = useMutation<void, Error, number>({
    mutationFn: async (recipeId) => {
      if (!user?.token) throw new Error('Требуется авторизация.');
      await favoritesService.addToFavorites(recipeId, user.token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast({ title: 'Добавлено в избранное!', description: 'Рецепт сохранён.' });
    },
    onError: (err) => {
      toast({ title: 'Не удалось добавить', description: err.message || 'Не получилось добавить рецепт.', variant: 'destructive' });
    },
  });

  // Mutation to remove a recipe from favorites
  const removeFavoriteMutation = useMutation<void, Error, number>({
    mutationFn: async (recipeId) => {
      if (!user?.token) throw new Error('Требуется авторизация.');
      await favoritesService.removeFromFavorites(recipeId, user.token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast({ title: 'Удалено из избранного', description: 'Рецепт убран из избранного.' });
    },
    onError: (err) => {
      toast({ title: 'Не удалось удалить', description: err.message || 'Не получилось удалить рецепт.', variant: 'destructive' });
    },
  });

  // Toggle favorite status
  const handleFavoriteToggle = useCallback(async (recipeId: number, isFavorited: boolean) => {
    if (!user) {
      toast({ title: 'Нужна авторизация', description: 'Войдите, чтобы управлять избранным.', variant: 'destructive' });
      return;
    }
    setIsUpdatingFavorites(true);
    try {
      if (isFavorited) {
        await removeFavoriteMutation.mutateAsync(recipeId);
      } else {
        await addFavoriteMutation.mutateAsync(recipeId);
      }
    } catch (error) {
      // error handled in mutation onError
    } finally {
      setIsUpdatingFavorites(false);
    }
  }, [user, addFavoriteMutation, removeFavoriteMutation, toast]);

  // Safely fallback to empty array
  const recipesToDisplay: Recipe[] = Array.isArray(favoriteRecipes) ? favoriteRecipes : [];

  // Compute stats: total count, average cook time, most common tag
  const stats = useMemo(() => {
    const totalFavorites = recipesToDisplay.length;

    const totalCookTime = recipesToDisplay.reduce((sum, recipe) => {
      const cookTime = parseInt(recipe.cook_time);
      return sum + (isNaN(cookTime) ? 0 : cookTime);
    }, 0);

    const avgCookTime = totalFavorites > 0 ? Math.round(totalCookTime / totalFavorites) : 0;

    const tagCounts: Record<string, number> = {};
    recipesToDisplay.forEach(recipe => {
      if (recipe.flavor_profile) tagCounts[recipe.flavor_profile] = (tagCounts[recipe.flavor_profile] || 0) + 1;
      if (recipe.course) tagCounts[recipe.course] = (tagCounts[recipe.course] || 0) + 1;
    });

    let mostPopularTag = '—';
    let maxCount = 0;
    for (const tag in tagCounts) {
      if (tagCounts[tag] > maxCount) {
        maxCount = tagCounts[tag];
        mostPopularTag = tag;
      }
    }

    return { totalFavorites, avgCookTime, mostPopularTag };
  }, [recipesToDisplay]);

  // Loading state
  const initialLoading = (authLoading || favoritesLoading) && (!favoriteRecipes || favoriteRecipes.length === 0);

  if (initialLoading) {
    return (
      <div className="max-w-7xl mx-auto py-10 text-center text-white">
        Загружаем избранные рецепты...
      </div>
    );
  }

  // Error state
  if (favoritesError) {
    return (
      <div className="max-w-7xl mx-auto py-10 text-center text-red-400">
        <p>Ошибка: {favoritesFetchError?.message || "Не удалось загрузить избранное."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Heart className="h-8 w-8 text-red-500 fill-current" />
          <h1 className="text-3xl font-bold text-white">Мои избранные рецепты</h1>
        </div>
        <p className="text-gray-300">Сохранённые блюда, которые всегда под рукой ❤️</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#2a2f45] rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Всего рецептов</p>
              <p className="text-2xl font-bold text-white">{stats.totalFavorites}</p>
            </div>
            <Heart className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-[#2a2f45] rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Среднее время готовки</p>
              <p className="text-2xl font-bold text-white">{stats.avgCookTime} мин</p>
            </div>
            <div className="text-2xl text-gray-400">⏰</div>
          </div>
        </div>
        <div className="bg-[#2a2f45] rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Самый частый тег</p>
              <p className="text-2xl font-bold text-white">{stats.mostPopularTag}</p>
            </div>
            <div className="text-2xl text-gray-400">🏷️</div>
          </div>
        </div>
      </div>

      {/* Favorite Recipes List */}
      {recipesToDisplay.length > 0 ? (
        <div className="relative">
          {(favoritesFetching || isUpdatingFavorites) && (
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
              <span className="text-white text-sm">Обновляем избранное…</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recipesToDisplay.map((recipe) => {
              const ingredientsArray = recipe.ingredients
                ? recipe.ingredients.split(',').map(item => item.trim())
                : [];

              return (
                <RecipeCard
                  key={recipe.id}
                  recipe={{
                    id: recipe.id,
                    title: recipe.name,
                    image: recipe.image_url || FALLBACK_IMAGE_URL,
                    cookTime: `${parseInt(recipe.cook_time)} мин`,
                    difficulty: recipe.difficulty,
                    tags: [recipe.flavor_profile, recipe.course].filter(Boolean) as string[],
                    description: ingredientsArray.join(', '),
                    course: recipe.course,
                    flavorProfile: recipe.flavor_profile,
                    diet: recipe.diet,
                    region: recipe.region,
                    ingredients: ingredientsArray,
                    steps: recipe.instruction
                      ? recipe.instruction.split('\r\n').map(s => s.trim()).filter(Boolean)
                      : [],
                    prepTime: parseInt(recipe.prep_time)
                  }}
                  isFavorited={true}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              );
            })}
          </div>
        </div>
      ) : (
        // Empty state UI
        <div className="text-center py-16">
          <Heart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">Здесь пока пусто</h3>
          <p className="text-gray-500">
            Изучайте рецепты и добавляйте понравившиеся, нажимая кнопку ❤️!
          </p>
        </div>
      )}
    </div>
  );
};

export default Favorites;