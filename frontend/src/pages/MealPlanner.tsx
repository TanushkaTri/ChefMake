import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChefHat, ShoppingCart, Plus, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { mealPlannerService } from '@/services/mealPlannerService';
import { shoppingListService } from '@/services/shoppingListService';
import RecipeSearchModal from "@/components/RecipeSearchModal";

interface PlannedMeal {
    id: number;
    day_of_week: string;
    meal_slot: string;
    recipe_id: number;
    recipe_name: string;
    prep_time: string;
    cook_time: string;
}

interface FormattedMealPlan {
    [day: string]: {
        breakfast: { name: string; prep: string; recipeId: number; planId: number } | null;
        lunch: { name: string; prep: string; recipeId: number; planId: number } | null;
        dinner: { name: string; prep: string; recipeId: number; planId: number } | null;
    };
}

interface RecipeForSelection {
    id: number;
    name: string;
    prep_time: string;
}

const MealPlanner = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const mealTypes = ["breakfast", "lunch", "dinner"];
    const dayLabels: Record<string, string> = {
        Monday: "Понедельник",
        Tuesday: "Вторник",
        Wednesday: "Среда",
        Thursday: "Четверг",
        Friday: "Пятница",
        Saturday: "Суббота",
        Sunday: "Воскресенье"
    };
    const mealTypeLabels: Record<string, string> = {
        breakfast: "завтрак",
        lunch: "обед",
        dinner: "ужин"
    };

    // Helper function to get Monday of the week for a given date
    const getWeekStart = (date: Date): Date => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(d.setDate(diff));
    };

    // Helper function to format date as YYYY-MM-DD
    const formatDate = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

    // Helper function to format week range for display
    const formatWeekRange = (weekStart: Date): string => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const startStr = weekStart.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        const endStr = weekEnd.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
        return `${startStr} - ${endStr}`;
    };

    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
    const [mealPlan, setMealPlan] = useState<FormattedMealPlan>({});
    const [isInitialPlanLoading, setIsInitialPlanLoading] = useState(true);
    const [isRefreshingPlan, setIsRefreshingPlan] = useState(false);
    const [hasLoadedPlan, setHasLoadedPlan] = useState(false);
    const [planError, setPlanError] = useState<string | null>(null);
    const [isGeneratingList, setIsGeneratingList] = useState(false);
    const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
    const [currentSlotForSelection, setCurrentSlotForSelection] = useState<{ day: string; mealType: string } | null>(null);
    const [isRandomizing, setIsRandomizing] = useState(false);
    const [isCopying, setIsCopying] = useState(false); 

    // Fetches the user's weekly meal plan and formats it for rendering.
    const fetchWeeklyPlan = async (
        weekStart?: Date,
        options: { showInitialLoader?: boolean; skipRefreshIndicator?: boolean } = {}
    ) => {
        if (!user?.token) {
            setPlanError("Войдите, чтобы увидеть план питания.");
            setMealPlan({});
            setIsInitialPlanLoading(false);
            setIsRefreshingPlan(false);
            setHasLoadedPlan(false);
            return;
        }

        const shouldShowInitialLoader = options.showInitialLoader ?? !hasLoadedPlan;
        const shouldShowRefreshIndicator = !shouldShowInitialLoader && !(options.skipRefreshIndicator ?? false);

        if (shouldShowInitialLoader) {
            setIsInitialPlanLoading(true);
        } else if (shouldShowRefreshIndicator) {
            setIsRefreshingPlan(true);
        }

        setPlanError(null);

        const weekToFetch = weekStart || currentWeekStart;
        const weekStartDate = formatDate(weekToFetch);

        try {
            const fetchedPlan = await mealPlannerService.getWeeklyPlan(user.token, weekStartDate);

            // Initialize empty structure
            const formatted: FormattedMealPlan = {};
            weekDays.forEach(day => {
                formatted[day] = { breakfast: null, lunch: null, dinner: null };
            });

            // Fill in meals where data exists
            fetchedPlan.forEach(item => {
                if (formatted[item.day_of_week] && mealTypes.includes(item.meal_slot)) {
                    formatted[item.day_of_week][item.meal_slot as keyof FormattedMealPlan['Monday']] = {
                        name: item.recipe_name,
                        prep: item.prep_time || "N/A min",
                        recipeId: item.recipe_id,
                        planId: item.id,
                    };
                }
            });

            setMealPlan(formatted);
        } catch (err: any) {
            setPlanError(err.message || "Не удалось загрузить недельный план.");
            toast({ title: "Ошибка", description: err.message || "Не удалось загрузить недельный план.", variant: "destructive" });
        } finally {
            if (shouldShowInitialLoader) {
                setIsInitialPlanLoading(false);
            }
            if (shouldShowRefreshIndicator) {
                setIsRefreshingPlan(false);
            }
            setHasLoadedPlan(true);
        }
    };

    useEffect(() => {
        fetchWeeklyPlan();
    }, [user?.token, currentWeekStart]);

    // Navigation functions for week
    const handlePreviousWeek = () => {
        const newWeekStart = new Date(currentWeekStart);
        newWeekStart.setDate(newWeekStart.getDate() - 7);
        setCurrentWeekStart(newWeekStart);
    };

    const handleNextWeek = () => {
        const newWeekStart = new Date(currentWeekStart);
        newWeekStart.setDate(newWeekStart.getDate() + 7);
        setCurrentWeekStart(newWeekStart);
    };

    const handleCurrentWeek = () => {
        setCurrentWeekStart(getWeekStart(new Date()));
    };

    // Helper function to download shopping list as DOCX file
    const downloadShoppingListAsFile = async (content: string, filename: string = 'shopping-list.docx') => {
        try {
            const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');
            const { saveAs } = await import('file-saver');
            
            // Parse the shopping list content
            const lines = content.split('\n').filter(line => line.trim());
            const docChildren: any[] = [];
            
            // Add title
            docChildren.push(
                new Paragraph({
                    text: "Список покупок",
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                })
            );
            
            // Add date
            const currentDate = new Date().toLocaleDateString('ru-RU', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            docChildren.push(
                new Paragraph({
                    text: currentDate,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 600 },
                })
            );
            
            // Process lines
            lines.forEach((line) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) {
                    docChildren.push(new Paragraph({ text: "" }));
                    return;
                }
                
                // Check if line is a header
                if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
                    const headerText = trimmedLine.replace(/\*\*/g, '');
                    docChildren.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: headerText,
                                    bold: true,
                                    size: 28,
                                    color: "2d8659",
                                }),
                            ],
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 200, after: 200 },
                        })
                    );
                } else if (trimmedLine.match(/^[A-Z\s]+$/) && trimmedLine.length > 3) {
                    docChildren.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: trimmedLine,
                                    bold: true,
                                    size: 28,
                                    color: "2d8659",
                                }),
                            ],
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 200, after: 200 },
                        })
                    );
                } else {
                    // Regular line - handle bold text
                    const parts: any[] = [];
                    let boldRegex = /\*\*(.*?)\*\*/g;
                    let match;
                    let lastIndex = 0;
                    
                    while ((match = boldRegex.exec(trimmedLine)) !== null) {
                        if (match.index > lastIndex) {
                            parts.push(
                                new TextRun({
                                    text: trimmedLine.substring(lastIndex, match.index),
                                })
                            );
                        }
                        parts.push(
                            new TextRun({
                                text: match[1],
                                bold: true,
                                color: "4ade80",
                            })
                        );
                        lastIndex = match.index + match[0].length;
                    }
                    
                    if (lastIndex < trimmedLine.length) {
                        parts.push(
                            new TextRun({
                                text: trimmedLine.substring(lastIndex),
                            })
                        );
                    }
                    
                    if (parts.length === 0) {
                        parts.push(new TextRun({ text: trimmedLine }));
                    }
                    
                    docChildren.push(
                        new Paragraph({
                            children: parts,
                            spacing: { after: 100 },
                        })
                    );
                }
            });
            
            // Create document
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: docChildren,
                }],
            });
            
            // Generate and save file
            const blob = await Packer.toBlob(doc);
            saveAs(blob, filename);
        } catch (err) {
            console.error("Failed to create DOCX:", err);
            // Fallback to plain text if DOCX fails
            const plainText = content.replace(/\*\*(.*?)\*\*/g, '$1');
            const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename.replace('.docx', '.txt');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    // Generates shopping list from the current meal plan.
    const handleGenerateShoppingList = async () => {
        if (!user?.token) {
            toast({ title: "Нужна авторизация", description: "Войдите, чтобы сформировать список покупок.", variant: "destructive" });
            return;
        }

        const meals = Object.values(mealPlan)
            .flatMap(day => Object.values(day).filter(Boolean))
            .map(meal => (meal as { name: string }).name); 
        
        if (meals.length === 0) {
            toast({ title: "Нет блюд в плане", description: "Добавьте рецепты, прежде чем формировать список.", variant: "info" });
            return;
        }

        setIsGeneratingList(true);
        try {
            const response = await shoppingListService.generateList(meals, user.token);
            
            // Automatically download the shopping list as DOCX file
            if (response.shoppingList) {
                const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
                const filename = `shopping-list-${timestamp}.docx`;
                await downloadShoppingListAsFile(response.shoppingList, filename);
                toast({ 
                    title: "Готово", 
                    description: "Список покупок сформирован и загружен в Word.", 
                    variant: "success" 
                });
            } else {
                toast({ title: "Готово", description: "Список покупок сформирован.", variant: "success" });
            }
            
            navigate('/shopping-list');
        } catch (error: any) {
            toast({ title: "Не удалось создать список", description: error.message || "Попробуйте позже.", variant: "destructive" });
        } finally {
            setIsGeneratingList(false);
        }
    };

    // Fills empty meal slots with random recipes.
    const handleRandomizeMeals = async () => {
        if (!user?.token) {
            toast({ title: "Нужна авторизация", description: "Войдите, чтобы заполнить план автоматически.", variant: "destructive" });
            return;
        }
        
        setIsRandomizing(true);
        try {
            const weekStartDate = formatDate(currentWeekStart);
            await mealPlannerService.randomizeMealPlan(user.token, weekStartDate);
            await fetchWeeklyPlan();
            toast({ title: "Готово", description: "Пустые слоты заполнены случайными блюдами.", variant: "success" });
        } catch (error: any) {
            toast({ title: "Не удалось заполнить", description: error.message || "Попробуйте позже.", variant: "destructive" });
        } finally {
            setIsRandomizing(false);
        }
    };

    // Copies the current week's meal plan to the next week
    const handleCopyToNextWeek = async () => {
        if (!user?.token) {
            toast({ title: "Нужна авторизация", description: "Войдите, чтобы копировать план питания.", variant: "destructive" });
            return;
        }

        // Check if current week has any meals
        const hasMeals = Object.values(mealPlan).some(day => 
            Object.values(day).some(meal => meal !== null)
        );

        if (!hasMeals) {
            toast({ title: "Нет блюд для копирования", description: "Добавьте блюда в текущую неделю перед копированием.", variant: "info" });
            return;
        }

        setIsCopying(true);
        try {
            const nextWeekStart = new Date(currentWeekStart);
            nextWeekStart.setDate(nextWeekStart.getDate() + 7);
            const nextWeekStartDate = formatDate(nextWeekStart);

            // Copy all meals from current week to next week
            let copiedCount = 0;
            for (const day of weekDays) {
                for (const mealType of mealTypes) {
                    const meal = mealPlan[day]?.[mealType as keyof FormattedMealPlan['Monday']];
                    if (meal) {
                        await mealPlannerService.saveMealToPlan(
                            day,
                            mealType,
                            meal.recipeId,
                            user.token,
                            nextWeekStartDate
                        );
                        copiedCount++;
                    }
                }
            }

            toast({ 
                title: "План скопирован", 
                description: `Скопировано ${copiedCount} блюд на следующую неделю.`, 
                variant: "success" 
            });
        } catch (error: any) {
            toast({ title: "Не удалось скопировать", description: error.message || "Попробуйте позже.", variant: "destructive" });
        } finally {
            setIsCopying(false);
        }
    };

    // Opens recipe selection modal for the chosen day/meal type.
    const handleOpenRecipeModal = (day: string, mealType: string) => {
        if (!user) {
            toast({ title: "Нужна авторизация", description: "Войдите, чтобы изменять план питания.", variant: "destructive" });
            return;
        }
        setCurrentSlotForSelection({ day, mealType });
        setIsRecipeModalOpen(true);
    };

    // Opens recipe search modal without a specific slot (user will choose after selecting recipe)
    const handleOpenRecipeSearch = () => {
        if (!user) {
            toast({ title: "Нужна авторизация", description: "Войдите, чтобы искать рецепты.", variant: "destructive" });
            return;
        }
        setCurrentSlotForSelection(null);
        setIsRecipeModalOpen(true);
    };

    // Handles when a recipe is chosen from the modal.
    const handleRecipeSelected = async (selectedRecipe: RecipeForSelection) => {
        if (!user?.token) return;

        const { id: recipeId, name } = selectedRecipe;

        // If no slot is selected, navigate to recipe detail page
        if (!currentSlotForSelection) {
            setIsRecipeModalOpen(false);
            navigate(`/recipe/${recipeId}`);
            return;
        }

        // Original behavior: slot is already selected, add to plan
        const { day, mealType } = currentSlotForSelection;
        setIsRecipeModalOpen(false);
        setIsRefreshingPlan(true);

        try {
            const weekStartDate = formatDate(currentWeekStart);
            await mealPlannerService.saveMealToPlan(day, mealType, recipeId, user.token, weekStartDate);
            await fetchWeeklyPlan(undefined, { skipRefreshIndicator: true });
            toast({ title: "Блюдо добавлено", description: `${name} добавлено на ${dayLabels[day]} (${mealTypeLabels[mealType]}).`, variant: "success" });
        } catch (error: any) {
            toast({ title: "Не удалось добавить", description: error.message || "Не получилось обновить план.", variant: "destructive" });
        } finally {
            setIsRefreshingPlan(false);
            setCurrentSlotForSelection(null);
        }
    };

    // Removes a meal from the plan for the given day/meal type.
    const handleRemoveMeal = async (day: string, mealType: string) => {
        if (!user?.token) {
            toast({ title: "Нужна авторизация", description: "Войдите, чтобы изменять план питания.", variant: "destructive" });
            return;
        }

        setIsRefreshingPlan(true);
        try {
            const weekStartDate = formatDate(currentWeekStart);
            await mealPlannerService.deleteMealFromPlan(day, mealType, user.token, weekStartDate);
            await fetchWeeklyPlan(undefined, { skipRefreshIndicator: true });
            toast({ title: "Блюдо удалено", description: `Удалено из ${dayLabels[day]} (${mealTypeLabels[mealType]}).`, variant: "success" });
        } catch (error: any) {
            toast({ title: "Не удалось удалить", description: error.message || "Не получилось обновить план.", variant: "destructive" });
        } finally {
            setIsRefreshingPlan(false);
        }
    };

    // Returns Tailwind classes for meal type styling.
    const getMealTypeColor = (mealType: string) => {
        switch (mealType) {
            case "breakfast": return "bg-orange-100 text-orange-700 border-orange-300";
            case "lunch": return "bg-green-100 text-green-700 border-green-300";
            case "dinner": return "bg-blue-100 text-blue-700 border-blue-300";
            default: return "bg-gray-100 text-gray-700 border-gray-300";
        }
    };

    // Loading state
    if (isInitialPlanLoading) {
        return <div className="text-center py-12 text-white">Загружаем план питания...</div>;
    }

    // Error state
    if (planError) {
        return (
            <div className="text-center py-12 text-red-400">
                <p>Ошибка: {planError}</p>
                <Button
                    onClick={() => fetchWeeklyPlan(undefined, { showInitialLoader: !hasLoadedPlan })}
                    className="mt-4"
                >
                    Повторить
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Планировщик питания</h1>
                <p className="text-gray-400">Составляйте меню на неделю и формируйте списки покупок.</p>
            </div>

            {/* Generate Shopping List */}
            <div className="flex justify-center mb-6">
                <Button
                    onClick={handleGenerateShoppingList}
                    disabled={isGeneratingList || !user}
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 text-lg"
                >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    {isGeneratingList ? "Создаём..." : "Сформировать список покупок"}
                </Button>
            </div>

            {/* Weekly Meal Plan */}
            <Card className="bg-[#2c2c3d] border-gray-700">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2 text-white">
                            <Calendar className="h-5 w-5 text-blue-500" />
                            <span>Недельный план</span>
                        </CardTitle>
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePreviousWeek}
                                className="text-white border-gray-600 hover:bg-gray-700"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="text-white text-sm min-w-[200px] text-center">
                                {formatWeekRange(currentWeekStart)}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleNextWeek}
                                className="text-white border-gray-600 hover:bg-gray-700"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCurrentWeek}
                                className="text-white border-gray-600 hover:bg-gray-700 text-xs"
                            >
                                Текущая неделя
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="relative">
                    {isRefreshingPlan && (
                        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
                            <span className="text-white text-sm">Обновляем план…</span>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                        {weekDays.map(day => (
                            <div key={day} className="border rounded-lg p-3 bg-white">
                                <div className="text-center mb-3">
                                    <h3 className="font-semibold text-gray-900 text-sm">{dayLabels[day]}</h3>
                                </div>
                                <div className="space-y-2">
                                    {mealTypes.map(mealType => {
                                        const meal = mealPlan[day]?.[mealType as keyof FormattedMealPlan['Monday']];
                                        return (
                                            <div
                                                key={mealType}
                                                className="min-h-[60px] border-2 border-dashed border-gray-200 rounded p-2 hover:border-gray-300 cursor-pointer relative"
                                                onClick={() => handleOpenRecipeModal(day, mealType)}
                                            >
                                                {meal ? (
                                                    <div className={`p-2 rounded text-xs ${getMealTypeColor(mealType)} flex justify-between items-center`}>
                                                        <div>
                                                            <div className="font-medium truncate">{meal.name}</div>
                                                        <div className="text-xs opacity-75">⏱ {meal.prep}</div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 absolute top-0 right-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveMeal(day, mealType);
                                                            }}
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex items-center justify-center text-gray-400 text-xs hover:text-gray-600">
                                                        <Plus className="h-4 w-4 mr-1" />
                                                        Добавить {mealTypeLabels[mealType]}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-[#2c2c3d] border-gray-700">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-white">
                        <ChefHat className="h-5 w-5 text-orange-500" />
                        <span>Быстрые действия</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button 
                            variant="outline" 
                            className="p-6 h-auto flex-col space-y-2"
                            onClick={handleOpenRecipeSearch}
                            disabled={!user}
                        >
                            <span>Найти рецепт</span>
                        </Button>
                        <Button 
                            variant="outline" 
                            className="p-6 h-auto flex-col space-y-2"
                            onClick={handleCopyToNextWeek}
                            disabled={isCopying || !user}
                        >
                            <span>{isCopying ? "Копируем..." : "Скопировать на следующую неделю"}</span>
                        </Button>
                        <Button 
                            variant="outline" 
                            className="p-6 h-auto flex-col space-y-2"
                            onClick={handleRandomizeMeals}
                            disabled={isRandomizing || !user}
                        >
                            <span>{isRandomizing ? "Заполняем..." : "Случайные блюда"}</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Recipe Selection Modal */}
            {isRecipeModalOpen && (
                <RecipeSearchModal
                    isOpen={isRecipeModalOpen}
                    onClose={() => {
                        setIsRecipeModalOpen(false);
                        setCurrentSlotForSelection(null);
                    }}
                    onSelectRecipe={currentSlotForSelection ? handleRecipeSelected : undefined}
                    showRecipeCard={!currentSlotForSelection}
                />
            )}
        </div>
    );
};

export default MealPlanner;
