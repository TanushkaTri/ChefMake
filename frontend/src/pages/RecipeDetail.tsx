import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, ChefHat, MapPin, Utensils, Copy, Sparkles } from "lucide-react";
import CookingBox from "@/components/CookingBox";
import { useToast } from "@/hooks/use-toast";
import { Recipe } from '@/types/recipe';
import { useAuth } from '@/contexts/AuthContext'; 
import { parseSteps } from "@/lib/utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const FALLBACK_IMAGE_URL = '/placeholder.svg';

/**
 * Displays detailed information for a single recipe.
 * Includes loading state, error handling, share, and rewrite features.
 */
const RecipeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth(); 

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCookingMode, setShowCookingMode] = useState(false);

  // Fetch recipe by ID on component mount or ID change
  useEffect(() => {
    const fetchRecipe = async () => {
      if (!id) {
        setError("Отсутствует идентификатор рецепта.");
        setIsLoading(false);
        return;
      }
      
      // Check for token before making the call
      if (!user?.token) {
        setError("Нет токена авторизации");
        setIsLoading(false);
        toast({
          title: "Не удалось загрузить рецепт",
          description: "Токен не найден",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (!API_BASE_URL) {
          setError("API_BASE_URL is not configured");
          toast({
            title: "Ошибка конфигурации",
            description: "API_BASE_URL не настроен",
            variant: "destructive",
          });
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/recipes/${id}`, {
            headers: {
                'Authorization': `Bearer ${user.token}`,
            },
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error("Recipe fetch failed: Server returned non-JSON response", {
            status: response.status,
            statusText: response.statusText,
            contentType,
            body: text.substring(0, 200),
          });
          setError(`Ошибка сервера: ${response.status} ${response.statusText}`);
          toast({
            title: "Ошибка сервера",
            description: `Сервер вернул не-JSON ответ: ${response.status}`,
            variant: "destructive",
          });
          return;
        }

        const data = await response.json();

        if (response.ok) {
          setRecipe(data.recipe);
        } else {
          setError(data.message || "Не удалось загрузить рецепт.");
          toast({
            title: "Не удалось загрузить рецепт",
            description: data.message || "Не получилось получить подробности.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Network error:", err);
        setError("Ошибка сети. Проверьте подключение.");
        toast({
          title: "Ошибка сети",
          description: "Не удалось подключиться к сервису рецептов.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecipe();
  }, [id, toast, user]); 

  // Copies formatted recipe details to clipboard.
  const handleShareRecipe = async () => {
    if (!recipe) {
      toast({
        title: "Рецепт ещё не загружен",
        description: "Подождите завершения загрузки.",
        variant: "destructive",
      });
      return;
    }

    const ingredientsArray = recipe.ingredients
      ? recipe.ingredients.split(',').map(ing => ing.trim())
      : [];

    const stepsArray = parseSteps(recipe.instruction || recipe.description);

    const recipeText = `
🍽️ ${recipe.name}

📋 Ингредиенты:
${ingredientsArray.map(ing => `• ${ing}`).join('\n')}

👨‍🍳 Инструкции:
${stepsArray.map((step, i) => `${i + 1}. ${step}`).join('\n')}

⏱️ Подготовка: ${recipe.prep_time} мин | Готовка: ${recipe.cook_time} мин
🥗 Тип: ${recipe.diet}
📍 Регион: ${recipe.state}, ${recipe.region}
    `.trim();

    try {
      await navigator.clipboard.writeText(recipeText);
      toast({
        title: "Рецепт скопирован",
        description: "Данные готовы к отправке друзьям.",
      });
    } catch {
      toast({
        title: "Не удалось скопировать",
        description: "Попробуйте ещё раз.",
        variant: "destructive",
      });
    }
  };

  // Navigates to AI-based recipe customizer with pre-filled content.
  const handleRewriteRecipe = () => {
    if (!recipe) {
      toast({
        title: "Рецепт ещё не загружен",
        description: "Подождите завершения загрузки.",
        variant: "destructive",
      });
      return;
    }

    const formattedRecipeContent = `
${recipe.name}

Ингредиенты:
${recipe.ingredients.split(',').map(ing => `• ${ing.trim()}`).join('\n')}

Инструкции:
${parseSteps(recipe.instruction || recipe.description).map((step, i) => `${i + 1}. ${step}`).join('\n')}

Подготовка: ${recipe.prep_time} мин | Готовка: ${recipe.cook_time} мин
    `.trim();

    navigate('/recipe-customizer', {
      state: {
        originalRecipeContent: formattedRecipeContent,
        originalRecipeName: recipe.name,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-white">Загружаем рецепт...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center space-x-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад к рецептам
            </Button>
          </Link>
        </div>
        <div className="text-center py-12">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center space-x-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад к рецептам
            </Button>
          </Link>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-400">Рецепт не найден.</p>
        </div>
      </div>
    );
  }

  const ingredientsForDisplay = recipe.ingredients
    ? recipe.ingredients.split(',').map(item => item.trim())
    : [];

  const stepsForDisplay = parseSteps(recipe.instruction || recipe.description);

  const prepTimeNum = parseInt(recipe.prep_time);
  const cookTimeNum = parseInt(recipe.cook_time);
  const totalTimeNum = parseInt(recipe.total_time);

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к рецептам
            
          </Button>
        </Link>
        <div className="flex space-x-2">
          <Button
            onClick={handleShareRecipe}
            variant="outline"
            size="sm"
            className="bg-gray-700 border-gray-600 text-white hover:bg-orange-500 hover:border-orange-500"
          >
            <Copy className="h-4 w-4 mr-2" />
            Копировать 
          </Button>
          <Button
            onClick={handleRewriteRecipe}
            variant="outline"
            size="sm"
            className="bg-orange-600 border-orange-500 text-white hover:bg-orange-700"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Переписать рецепт
          </Button>
        </div>
      </div>

      <Card className="bg-[#2c2f3d] border-gray-700">
        <div className="relative">
          <img
            src={recipe.image_url || FALLBACK_IMAGE_URL}
            alt={recipe.name}
            className="w-full h-64 md:h-80 object-cover rounded-t-lg"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-t-lg" />
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{recipe.name}</h1>
            <div className="flex flex-wrap gap-2">
            <Badge variant={recipe.diet === 'Vegetarian' ? 'secondary' : 'destructive'} className="text-sm">
              {recipe.diet === 'Vegetarian' ? 'Вегетарианское' : recipe.diet === 'Non-Vegetarian' ? 'С мясом' : recipe.diet}
              </Badge>
              <Badge variant="outline" className="text-sm text-gray-300 border-gray-500">
                {recipe.course}
              </Badge>
              <Badge variant="outline" className="text-sm text-orange-300 border-orange-500">
                {recipe.flavor_profile}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="bg-[#2c2f3d] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow icon={<Clock className="h-4 w-4 text-blue-400" />} label="Подготовка" value={`${prepTimeNum} мин`} />
              <InfoRow icon={<ChefHat className="h-4 w-4 text-green-400" />} label="Готовка" value={`${cookTimeNum} мин`} />
              <InfoRow icon={<MapPin className="h-4 w-4 text-red-400" />} label="Регион" value={`${recipe.state}, ${recipe.region}`} />
              <InfoRow icon={<Utensils className="h-4 w-4 text-yellow-400" />} label="Всего" value={`${totalTimeNum} мин`} />
            </CardContent>
          </Card>

          <Button
            onClick={() => setShowCookingMode(!showCookingMode)}
            disabled={!recipe} 
            className="w-full bg-orange-500 hover:bg-orange-600 text-lg py-3"
          >
            {showCookingMode ? "Скрыть режим готовки" : "🍳 Начать готовить"}
          </Button>
        </div>

        <Card className="bg-[#2c2f3d] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Ингредиенты</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {ingredientsForDisplay.map((ingredient, index) => (
                <li key={index} className="flex items-start space-x-2 text-gray-300">
                  <span className="text-orange-400 mt-1">•</span>
                  <span>{ingredient}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {showCookingMode && (
        <CookingBox
          steps={stepsForDisplay}
          totalCookTime={cookTimeNum}
          title={recipe.name}
          onExit={() => setShowCookingMode(false)}
          recipeId={recipe.id}
          difficulty={recipe.difficulty}
        />
      )}

      <Card className="bg-[#2c2f3d] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Шаги приготовления</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4 list-decimal list-inside">
            {stepsForDisplay.map((step, index) => (
              <li key={index} className="text-gray-300 leading-relaxed">
                <span className="font-semibold text-white mr-1">Шаг {index + 1}:</span> {step}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

const InfoRow = ({ icon, label, value }: { icon: JSX.Element; label: string; value: string }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-2 text-gray-300">
      {icon}
      <span className="text-sm">{label}</span>
    </div>
    <span className="text-white font-medium">{value}</span>
  </div>
);

export default RecipeDetail;