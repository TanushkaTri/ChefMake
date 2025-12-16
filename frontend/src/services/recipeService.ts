import { Recipe } from '../types/recipe';
import { FilterOptions } from '@/pages/Dashboard';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface RecipesApiResponse {
    recipes: Recipe[];
    message?: string;
}

export const recipeService = {
    getAllRecipes: async (token: string): Promise<Recipe[]> => {
        const response = await fetch(`${API_BASE_URL}/api/recipes`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error("getAllRecipes failed: Server returned non-JSON response", {
                status: response.status,
                statusText: response.statusText,
                contentType,
                body: text.substring(0, 200),
            });
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch all recipes');
        }
        const data: RecipesApiResponse = await response.json();
        return data.recipes;
    },

    searchRecipes: async (query: string, token: string): Promise<Recipe[]> => {
        const response = await fetch(`${API_BASE_URL}/api/recipes/search?q=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error("searchRecipes failed: Server returned non-JSON response", {
                status: response.status,
                statusText: response.statusText,
                contentType,
                body: text.substring(0, 200),
            });
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to search recipes for "${query}"`);
        }
        const data: RecipesApiResponse = await response.json();
        return data.recipes;
    },

    filterRecipes: async (filters: FilterOptions, token: string): Promise<Recipe[]> => {
        const queryParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, values]) => {
            if (values && values.length > 0) {
                values.forEach((value: string) => queryParams.append(key, value));
            }
        });

        const queryString = queryParams.toString();
        const response = await fetch(`${API_BASE_URL}/api/recipes/filter?${queryString}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error("filterRecipes failed: Server returned non-JSON response", {
                status: response.status,
                statusText: response.statusText,
                contentType,
                body: text.substring(0, 200),
            });
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to filter recipes');
        }
        const data: RecipesApiResponse = await response.json();
        return data.recipes;
    },

    getRecipeById: async (id: string, token: string): Promise<Recipe | null> => {
        const response = await fetch(`${API_BASE_URL}/api/recipes/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        const contentType = response.headers.get('content-type');
        
        // Если 404, возвращаем null без проверки Content-Type
        if (response.status === 404) {
            return null;
        }
        
        // Проверяем Content-Type перед парсингом
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error("getRecipeById failed: Server returned non-JSON response", {
                status: response.status,
                statusText: response.statusText,
                contentType,
                url: `${API_BASE_URL}/api/recipes/${id}`,
                body: text.substring(0, 200),
            });
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to fetch recipe with ID ${id}`);
        }
        const data: { recipe: Recipe } = await response.json();
        return data.recipe;
    },
};