import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogOverlay } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import RecipePagination from "@/components/RecipePagination";
import RecipeModal from "@/components/RecipeModal";
import { useDebounce } from "@/hooks/useDebounce";
import { useQuery } from '@tanstack/react-query';
import { recipeService } from '@/services/recipeService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface RecipeForSelection {
    id: number;
    name: string;
    prep_time: string;
}

interface Recipe {
    id: number;
    name: string;
    description: string;
    ingredients: string;
    instruction: string;
    prep_time: string;
    cook_time: string;
    difficulty: string;
    cuisine?: string;
    course?: string;
    flavor_profile?: string;
    diet?: string;
    region?: string;
    image_url?: string;
}

interface RecipeSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectRecipe?: (recipe: RecipeForSelection) => void;
    showRecipeCard?: boolean; // Если true, показывать карточку рецепта вместо вызова onSelectRecipe
}

const RECIPES_PER_PAGE = 6;

const FALLBACK_IMAGE_URL = '/placeholder.svg';

const RecipeSearchModal: React.FC<RecipeSearchModalProps> = ({ isOpen, onClose, onSelectRecipe, showRecipeCard = false }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);

    const { data: recipes, isLoading, isError, error } = useQuery<Recipe[], Error>({
        queryKey: ['searchRecipes', debouncedSearchQuery],
        queryFn: async () => {
             if (debouncedSearchQuery && user?.token) { 
                return recipeService.searchRecipes(debouncedSearchQuery, user.token); 
            }
            return Promise.resolve([]);
        },
        enabled: isOpen && debouncedSearchQuery.length > 0 && !!user?.token, 
        staleTime: 5 * 60 * 1000,
    });

    const { paginatedRecipes, totalPages } = useMemo(() => {
        const allRecipes = Array.isArray(recipes) ? recipes : [];
        const totalPages = Math.ceil(allRecipes.length / RECIPES_PER_PAGE);
        const startIndex = (currentPage - 1) * RECIPES_PER_PAGE;
        return {
            paginatedRecipes: allRecipes.slice(startIndex, startIndex + RECIPES_PER_PAGE),
            totalPages,
        };
    }, [recipes, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery]);

    const handlePageChange = useCallback((page: number) => {
        setCurrentPage(page);
    }, []);

    const handleSelectRecipeForPlan = (recipe: Recipe) => {
        console.log('handleSelectRecipeForPlan called', { recipe, showRecipeCard, onSelectRecipe });
        if (showRecipeCard) {
            // Показываем карточку рецепта
            console.log('Setting selected recipe and opening modal');
            setSelectedRecipe(recipe);
            setIsRecipeModalOpen(true);
        } else if (onSelectRecipe) {
            // Вызываем callback для добавления в план
            console.log('Calling onSelectRecipe');
            onSelectRecipe({
                id: recipe.id,
                name: recipe.name,
                prep_time: recipe.prep_time || "— мин",
            });
        }
    };

    const handleCloseRecipeModal = () => {
        console.log('Closing recipe modal');
        setIsRecipeModalOpen(false);
        setSelectedRecipe(null);
        // Dialog останется открытым, так как isOpen контролируется извне
    };

    const handleStartCooking = () => {
        // Можно добавить логику для начала готовки, если нужно
        toast({
            title: "Режим готовки",
            description: "Переход к режиму готовки будет добавлен позже.",
        });
    };

    // RecipeModal для отображения карточки рецепта
    return (
        <>
            <Dialog open={isOpen && !isRecipeModalOpen} onOpenChange={onClose}>
                <DialogOverlay className="bg-black/50" />
                <DialogContent className="sm:max-w-[800px] w-full max-h-[90vh] overflow-y-auto bg-[#1e1e2f] border-gray-700 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-white">Найдите рецепт</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            {showRecipeCard 
                                ? "Используйте поиск, чтобы найти и просмотреть рецепт."
                                : "Используйте поиск, чтобы добавить блюдо в план питания."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center gap-2 mb-4">
                        <Input
                            type="text"
                            placeholder="Поиск рецептов..."
                            className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Button variant="secondary">
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>

                    {debouncedSearchQuery.length === 0 && !isLoading && (
                        <p className="text-center text-gray-400">Начните печатать, чтобы найти рецепт.</p>
                    )}
                    {isLoading && debouncedSearchQuery.length > 0 && (
                        <p className="text-center text-gray-400">Идёт поиск...</p>
                    )}
                    {isError && debouncedSearchQuery.length > 0 && (
                        <p className="text-center text-red-400">Ошибка загрузки: {error?.message}</p>
                    )}
                    {!isLoading && !isError && debouncedSearchQuery.length > 0 && paginatedRecipes.length === 0 && (
                        <p className="text-center text-gray-400">Рецептов по запросу "{debouncedSearchQuery}" нет.</p>
                    )}

                    {/* Updated section to display recipe names directly */}
                    {!isLoading && !isError && paginatedRecipes.length > 0 && (
                        <div className="space-y-2 max-h-[calc(80vh-200px)] overflow-y-auto pr-2">
                            {paginatedRecipes.map((recipe) => (
                                <div
                                    key={recipe.id}
                                    onClick={() => handleSelectRecipeForPlan(recipe)}
                                    className="p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors duration-200"
                                >
                                    <h4 className="font-semibold text-white">{recipe.name}</h4>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Original pagination component remains */}
                    {!isLoading && !isError && paginatedRecipes.length > 0 && (
                        <RecipePagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    )}

                    <div className="flex justify-end mt-4">
                        <Button variant="outline" onClick={onClose}>
                            Закрыть
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* RecipeModal для отображения карточки рецепта */}
            {selectedRecipe && (
                <RecipeModal
                    recipe={{
                        id: selectedRecipe.id,
                        title: selectedRecipe.name,
                        image: selectedRecipe.image_url || FALLBACK_IMAGE_URL,
                        prepTime: parseInt(selectedRecipe.prep_time) || 0,
                        cookTime: parseInt(selectedRecipe.cook_time) || 0,
                        difficulty: selectedRecipe.difficulty,
                        tags: [selectedRecipe.flavor_profile, selectedRecipe.course].filter(Boolean) as string[],
                        description: selectedRecipe.ingredients?.split(',').map(item => item.trim()).join(', ') || selectedRecipe.description || '',
                        course: selectedRecipe.course || '',
                        flavorProfile: selectedRecipe.flavor_profile || '',
                        diet: selectedRecipe.diet || '',
                        region: selectedRecipe.region,
                        ingredients: selectedRecipe.ingredients?.split(',').map(item => item.trim()) || [],
                        steps: selectedRecipe.instruction?.split('\r\n').map(s => s.trim()).filter(Boolean) || [],
                        is_cooked: false
                    }}
                    isOpen={isRecipeModalOpen}
                    onClose={handleCloseRecipeModal}
                    onStartCooking={handleStartCooking}
                    is_cooked={false}
                    showStartCookingButton={false}
                />
            )}
        </>
    );
};

export default RecipeSearchModal;