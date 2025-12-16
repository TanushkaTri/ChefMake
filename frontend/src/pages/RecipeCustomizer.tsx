import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import CookingBox from "@/components/CookingBox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';

// Backend API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Default recipe content used as placeholder
const DEFAULT_SAMPLE_RECIPE = `Классическая паста карбонара

Ингредиенты:
• 400 г спагетти
• 200 г панчетты или гуанчале
• 4 крупных яйца
• 100 г тёртого сыра пекорино романо
• Чёрный перец
• Соль

Инструкции:
1. Отварите спагетти в подсоленной воде до состояния al dente.
2. Нарежьте панчетту кубиками и обжарьте до хруста.
3. Смешайте яйца с тёртым сыром и перцем.
4. Слейте макароны, оставив немного воды.
5. Соедините горячие макароны с панчеттой, быстро вмешайте яичную смесь.
6. При необходимости добавьте воду от пасты для кремовой текстуры.
7. Подавайте сразу, посыпав сыром.

Подготовка: 10 мин | Готовка: 15 мин | Порций: 4`;

/**
 * RecipeCustomizer
 * A feature to apply AI-powered transformations to user-provided recipes.
 */
interface SavedRecipe {
  id: string;
  title: string;
  content: string;
  savedAt: string;
  variantLabel?: string;
  variantParam?: string;
  baseRecipeName?: string;
  dishName?: string;
  ingredients?: string[];
}

const SAVED_RECIPES_KEY = 'chefmake_saved_custom_recipes';

const parseRecipeContent = (text: string) => {
  if (!text) {
    return { description: [], ingredients: [], steps: [] };
  }

  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const description: string[] = [];
  const ingredients: string[] = [];
  const steps: string[] = [];

  let mode: 'none' | 'ingredients' | 'steps' = 'none';

  lines.forEach(line => {
    const lower = line.toLowerCase();
    
    // Распознавание заголовков для ингредиентов (более гибко)
    if (lower.includes('ингредиент') || lower.includes('ingredient') || 
        lower.includes('состав') || (lower.includes('необходимо') && lower.length < 30)) {
      mode = 'ingredients';
      return; // Не добавляем сам заголовок
    }
    
    // Распознавание заголовков для шагов
    if (lower.includes('инструк') || lower.includes('instruction') || 
        (lower.includes('шаг') && lower.length < 20) || lower.includes('step') || 
        lower.includes('приготов') || lower.includes('готов')) {
      mode = 'steps';
      return; // Не добавляем сам заголовок
    }

    // Если строка начинается с маркера списка (•, -, *)
    if (/^[-•*]\s/.test(line) || /^[-•*]/.test(line)) {
      const cleaned = line.replace(/^[-•*]\s*/, '').trim();
      if (cleaned) {
        // Если мы еще не в режиме шагов, это ингредиент
        if (mode === 'ingredients' || mode === 'none') {
          ingredients.push(cleaned);
          if (mode === 'none') mode = 'ingredients';
        } else if (mode === 'steps') {
          // В режиме шагов маркеры списка тоже могут быть шагами
          steps.push(cleaned);
        }
      }
      return;
    }

    // Если строка начинается с цифры и точки - это шаг
    if (/^\d+\.\s/.test(line) || /^\d+\./.test(line)) {
      const cleaned = line.replace(/^\d+\.\s*/, '').trim();
      if (cleaned) {
        steps.push(cleaned);
        if (mode === 'none') mode = 'steps';
      }
      return;
    }

    // Если мы в режиме ингредиентов, добавляем строку в ингредиенты
    if (mode === 'ingredients') {
      // Пропускаем только если это явно заголовок
      if (line.length > 0 && !lower.match(/^(ингредиент|ingredient|состав|необходимо)/)) {
        ingredients.push(line);
      }
      return;
    }

    // Если мы в режиме шагов, добавляем строку в шаги
    if (mode === 'steps') {
      // Пропускаем только если это явно заголовок
      if (line.length > 0 && !lower.match(/^(инструк|instruction|шаг|step|приготов|готов)/)) {
        steps.push(line);
      }
      return;
    }

    // Если режим не установлен, добавляем в описание
    description.push(line);
  });

  return { description, ingredients, steps };
};

const RecipeCustomizer = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useLocation();

  const [originalRecipe, setOriginalRecipe] = useState(DEFAULT_SAMPLE_RECIPE);
  const [customizedRecipe, setCustomizedRecipe] = useState("");
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [showCookingMode, setShowCookingMode] = useState(false);
  const [cookingSteps, setCookingSteps] = useState<string[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [currentRecipeName, setCurrentRecipeName] = useState("Classic Spaghetti Carbonara");
  const [savedIngredients, setSavedIngredients] = useState<string[] | undefined>(undefined);
  const [lastCustomizationOption, setLastCustomizationOption] = useState<{ label: string; param: string } | null>(null);
  const parsedCustomizedRecipe = useMemo(() => parseRecipeContent(customizedRecipe), [customizedRecipe]);
  const parsedOriginalRecipe = useMemo(() => parseRecipeContent(originalRecipe), [originalRecipe]);

  // Используем кастомизированные ингредиенты, если они есть, иначе оригинальные
  // При загрузке сохранённого рецепта принудительно используем ингредиенты из него
  const ingredientsToDisplay = useMemo(() => {
    // Если есть сохраненные ингредиенты (из загруженного рецепта), используем их в первую очередь
    if (savedIngredients && savedIngredients.length > 0) {
      return savedIngredients;
    }
    
    if (customizedRecipe) {
      // Если есть кастомизированный рецепт, используем его ингредиенты
      if (parsedCustomizedRecipe?.ingredients?.length) {
        return parsedCustomizedRecipe.ingredients;
      }
      // Если парсер не нашёл ингредиенты, попробуем извлечь их вручную
      // Ищем строки с маркерами списка до первого шага
      const lines = customizedRecipe.split('\n').map(l => l.trim()).filter(Boolean);
      const extractedIngredients: string[] = [];
      let foundSteps = false;
      
      for (const line of lines) {
        const lower = line.toLowerCase();
        // Если встретили заголовок шагов, прекращаем поиск ингредиентов
        if (lower.includes('инструк') || lower.includes('instruction') || 
            lower.includes('шаг') || lower.includes('step') ||
            /^\d+\./.test(line)) {
          foundSteps = true;
          break;
        }
        // Если строка начинается с маркера списка, это ингредиент
        if (/^[-•*]\s/.test(line) || /^[-•*]/.test(line)) {
          const cleaned = line.replace(/^[-•*]\s*/, '').trim();
          if (cleaned && !lower.includes('ингредиент') && !lower.includes('ingredient')) {
            extractedIngredients.push(cleaned);
          }
        }
      }
      
      // Если нашли ингредиенты вручную, используем их
      if (extractedIngredients.length > 0) {
        return extractedIngredients;
      }
    }
    
    // Fallback на оригинальные ингредиенты
    return parsedOriginalRecipe?.ingredients || [];
  }, [customizedRecipe, parsedCustomizedRecipe, parsedOriginalRecipe, savedIngredients]);

  useEffect(() => {
    if (location.state && (location.state as any).originalRecipeContent) {
      const { originalRecipeContent, originalRecipeName } = location.state as any;
      setOriginalRecipe(`--- Рецепт с панели: ${originalRecipeName} ---\n\n${originalRecipeContent}`);
      setCustomizedRecipe("");
      if (originalRecipeName) {
        setCurrentRecipeName(originalRecipeName);
      }
      toast({
        title: "Рецепт загружен",
        description: `"${originalRecipeName}" готов к кастомизации.`,
        duration: 3000,
      });
    }
  }, [location.state, toast]);

  useEffect(() => {
    const stored = localStorage.getItem(SAVED_RECIPES_KEY);
    if (stored) {
      try {
        const parsed: SavedRecipe[] = JSON.parse(stored);
        setSavedRecipes(parsed);
      } catch (error) {
        console.error('Failed to parse saved recipes:', error);
      }
    }
  }, []);

  const persistSavedRecipes = useCallback((recipes: SavedRecipe[]) => {
    setSavedRecipes(recipes);
    localStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(recipes));
  }, []);

  const customizationOptions = [
    { label: "Сделать веганским 🌱", description: "Заменить продукты животного происхождения растительными", param: "vegan", defaultBg: "bg-green-600/10", defaultBorder: "border-green-500", defaultText: "text-green-300" },
    { label: "Уменьшить калорийность 📉", description: "Лёгкий вариант с более полезными ингредиентами", param: "low-calorie", defaultBg: "bg-blue-600/10", defaultBorder: "border-blue-500", defaultText: "text-blue-300" },
    { label: "Ускорить ⚡", description: "Сократить время готовки и упростить шаги", param: "quick", defaultBg: "bg-orange-600/10", defaultBorder: "border-orange-500", defaultText: "text-orange-300" },
    { label: "Без глютена 🌾", description: "Заменить ингредиенты, содержащие глютен", param: "gluten-free", defaultBg: "bg-purple-600/10", defaultBorder: "border-purple-500", defaultText: "text-purple-300" },
    { label: "Больше белка 💪", description: "Увеличить долю белка для спортивных целей", param: "high-protein", defaultBg: "bg-red-600/10", defaultBorder: "border-red-500", defaultText: "text-red-300" },
    { label: "Для детей 👶", description: "Сделать блюдо безопасным и привлекательным для детей", param: "kid-friendly", defaultBg: "bg-pink-600/10", defaultBorder: "border-pink-500", defaultText: "text-pink-300" },
    { label: "Общий рерайт ✍️", description: "Получить версию с более понятным описанием", param: "general", defaultBg: "bg-purple-600/10", defaultBorder: "border-gray-500", defaultText: "text-red-200" },
    { label: "Меньше углеводов 🍞🚫", description: "Сократить углеводы, заменив крахмалистые продукты", param: "low-carb", defaultBg: "bg-yellow-600/10", defaultBorder: "border-yellow-500", defaultText: "text-yellow-300" },
    { label: "Погорячее 🔥", description: "Добавить остроты и усилить вкус", param: "spicy", defaultBg: "bg-red-600/10", defaultBorder: "border-red-500", defaultText: "text-red-300" },
  ];

  const handleCustomize = async (optionParam: string) => {
    const optionMeta = customizationOptions.find(option => option.param === optionParam) || null;
    setLastCustomizationOption(optionMeta);

    if (!originalRecipe.trim()) {
      toast({
        title: "Нет рецепта",
        description: "Вставьте рецепт в поле перед кастомизацией.",
        variant: "destructive",
      });
      return;
    }

    if (!user || !user.token) {
      toast({
        title: "Нужна авторизация",
        description: "Войдите, чтобы использовать кастомизацию.",
        variant: "destructive",
      });
      return;
    }

    setIsCustomizing(true);
    setCustomizedRecipe("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/customize-recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({ originalRecipe, customizationOption: optionParam }),
      });

      const data = await response.json();

      if (response.ok && data.customizedRecipe) {
        setCustomizedRecipe(data.customizedRecipe);
        setSavedIngredients(undefined); // Сбрасываем сохраненные ингредиенты при новой кастомизации
        toast({
          title: "Рецепт готов!",
          description: "AI успешно преобразовал ваш рецепт.",
        });
      } else {
        toast({
          title: "Не удалось изменить",
          description: data.message || "Не получилось преобразовать рецепт.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("API Error:", error);
      toast({
        title: "Ошибка сети",
        description: error.message || "Не удалось связаться с AI-сервисом.",
        variant: "destructive",
      });
    } finally {
      setIsCustomizing(false);
    }
  };

  const handleCopyCustomizedRecipe = useCallback(async () => {
    if (!customizedRecipe.trim()) {
      toast({
        title: "Нет рецепта",
        description: "Сначала получите результат кастомизации.",
        variant: "destructive",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(customizedRecipe);
      toast({ title: "Скопировано", description: "Рецепт скопирован в буфер обмена." });
    } catch (error: any) {
      console.error("Clipboard error:", error);
      toast({
        title: "Не удалось скопировать",
        description: error.message || "Попробуйте ещё раз.",
        variant: "destructive",
      });
    }
  }, [customizedRecipe, toast]);

  const handleSaveCustomizedRecipe = useCallback(() => {
    if (!customizedRecipe.trim()) {
      toast({
        title: "Нет рецепта",
        description: "Сначала получите результат кастомизации.",
        variant: "destructive",
      });
      return;
    }

    const optionLabel = lastCustomizationOption?.label || "Кастомизация";
    const title = `${optionLabel} • ${currentRecipeName}`;

    const newRecipe: SavedRecipe = {
      id: crypto.randomUUID(),
      title,
      content: customizedRecipe,
      savedAt: new Date().toISOString(),
      variantLabel: lastCustomizationOption?.label || "Кастомизация",
      variantParam: lastCustomizationOption?.param,
      baseRecipeName: currentRecipeName,
      dishName: currentRecipeName,
      ingredients: ingredientsToDisplay,
    };

    const updated = [newRecipe, ...savedRecipes];
    persistSavedRecipes(updated);
    toast({ title: "Сохранено", description: `"${title}" добавлен в список.` });
  }, [customizedRecipe, savedRecipes, persistSavedRecipes, toast, currentRecipeName, ingredientsToDisplay, lastCustomizationOption]);

  const handleLoadSavedRecipe = useCallback((recipe: SavedRecipe) => {
    setCustomizedRecipe(recipe.content);
    if (recipe.baseRecipeName || recipe.dishName) {
      setCurrentRecipeName(recipe.dishName || recipe.baseRecipeName || "");
    }
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      setSavedIngredients(recipe.ingredients);
    } else {
      setSavedIngredients(undefined);
    }
    if (recipe.variantParam && recipe.variantLabel) {
      setLastCustomizationOption({ param: recipe.variantParam, label: recipe.variantLabel });
    }
    toast({ title: "Рецепт загружен", description: `«${recipe.dishName || recipe.title}» готов к просмотру.` });
    
    // Прокрутить к блоку с результатом после небольшой задержки, чтобы React успел отрендерить
    setTimeout(() => {
      const resultCard = document.querySelector('[data-customized-recipe]');
      if (resultCard) {
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, [toast]);

  const handleDeleteSavedRecipe = useCallback((recipeId: string) => {
    const updated = savedRecipes.filter(recipe => recipe.id !== recipeId);
    persistSavedRecipes(updated);
    toast({ title: "Удалено", description: "Рецепт удалён из сохранённых." });
  }, [persistSavedRecipes, savedRecipes, toast]);

  const handleCopySavedRecipe = useCallback(async (recipe: SavedRecipe) => {
    try {
      await navigator.clipboard.writeText(recipe.content);
      toast({ title: "Скопировано", description: `«${recipe.title}» скопирован в буфер обмена.` });
    } catch (error: any) {
      console.error("Clipboard error:", error);
      toast({
        title: "Не удалось скопировать",
        description: error.message || "Попробуйте ещё раз.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleStartCooking = () => {
    const steps = customizedRecipe
      .split('\n')
      .filter(line => /^\d+\./.test(line))
      .map(step => step.replace(/^\d+\.\s*/, ''));

    if (steps.length === 0) {
      toast({
        title: "Нет шагов",
        description: "Не удалось извлечь шаги приготовления.",
        variant: "destructive",
      });
      return;
    }

    setCookingSteps(steps);
    setShowCookingMode(true);
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-white mb-2">AI-кастомизация рецептов 🤖</h1>
      <p className="text-gray-300 mb-8">Преобразуйте любой рецепт под свои ограничения и предпочтения.</p>

      <div className="max-w-4xl space-y-8">
        {/* Recipe input */}
        <Card className="bg-[#2a2f45] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">📝 <span>Исходный рецепт</span></CardTitle>
            <CardDescription className="text-gray-400">Вставьте свой текст или используйте пример</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={originalRecipe}
              onChange={(e) => setOriginalRecipe(e.target.value)}
              rows={12}
              className="font-mono text-sm bg-[#1e1e2f] border-gray-600 text-white"
              placeholder="Вставьте рецепт здесь..."
            />
          </CardContent>
        </Card>

        {/* Customization Options */}
        <Card className="bg-[#2a2f45] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">✨ <span>Выберите трансформацию</span></CardTitle>
            <CardDescription className="text-gray-400">Выберите подходящий стиль</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customizationOptions.map(option => (
                <Button
                  key={option.param}
                  variant="outline"
                  className={`h-full w-full p-4 flex flex-col justify-center items-center text-center whitespace-normal
                    ${option.defaultBg} ${option.defaultBorder} ${option.defaultText}
                    hover:bg-orange-500/30 hover:text-white hover:border-orange-500/80
                    ${isCustomizing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => handleCustomize(option.param)}
                  disabled={isCustomizing}
                >
                  <div className="font-semibold text-base mb-1">{option.label}</div>
                  <div className="text-sm text-gray-400">{option.description}</div>
                </Button>
              ))}
            </div>

            {/* Loading Spinner */}
                {isCustomizing && (
              <div className="mt-8 text-center">
                <div className="animate-spin h-8 w-8 border-3 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-lg text-orange-400 font-medium">AI работает над рецептом...</p>
                <p className="text-sm text-gray-400 mt-2">Это займёт несколько секунд</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customized Recipe */}
        {customizedRecipe && (
          <Card className="border-2 border-green-500 bg-[#2a2f45] shadow-lg shadow-green-500/20" data-customized-recipe>
            <CardHeader className="bg-gradient-to-r from-green-500/10 to-transparent">
              <CardTitle className="text-green-400 text-xl flex items-center space-x-2">🎉 <span>Ваш обновлённый рецепт</span></CardTitle>
              <CardDescription className="text-gray-400">AI завершил преобразование</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-[#1e1e2f] p-6 rounded-lg border border-gray-600 space-y-6">
                {/* Dish Name */}
                {currentRecipeName && (
                  <div>
                    <h3 className="text-white text-xl font-bold mb-2">{currentRecipeName}</h3>
                  </div>
                )}

                {/* Ingredients */}
                {ingredientsToDisplay && ingredientsToDisplay.length > 0 && (
                  <div>
                    <h4 className="text-white font-semibold mb-2 flex items-center space-x-2">
                      <span>🥘</span>
                      <span>Ингредиенты</span>
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-300 list-disc list-inside">
                      {ingredientsToDisplay.map((ingredient, idx) => (
                        <li key={idx}>{ingredient}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {parsedCustomizedRecipe?.description?.length ? (
                  <div className="space-y-2">
                    {parsedCustomizedRecipe.description.map((line, idx) => (
                      <p key={idx} className="text-sm text-gray-300">
                        {line}
                      </p>
                    ))}
                  </div>
                ) : null}

                <div>
                  <h4 className="text-white font-semibold mb-2 flex items-center space-x-2">
                    <span>👣</span>
                    <span>Шаги приготовления</span>
                  </h4>
                  {parsedCustomizedRecipe?.steps?.length ? (
                    <ol className="space-y-1 text-sm text-gray-300 max-h-60 overflow-y-auto pr-2 list-decimal list-inside">
                      {parsedCustomizedRecipe.steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-gray-500">Шаги не обнаружены.</p>
                  )}
                </div>

                {!parsedCustomizedRecipe?.description?.length &&
                !parsedCustomizedRecipe?.steps?.length ? (
                  <pre className="whitespace-pre-wrap text-sm font-mono text-gray-300">
                    {customizedRecipe}
                  </pre>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleStartCooking} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 text-lg font-medium">🍳 Начать готовить</Button>
                <Button variant="outline" className="border-gray-600 text-gray-300 px-6 py-3" onClick={handleSaveCustomizedRecipe}>💾 Сохранить</Button>
                <Button variant="outline" className="border-gray-600 text-gray-300 px-6 py-3" onClick={handleCopyCustomizedRecipe}>📋 Копировать</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-[#2a2f45] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">📚 <span>Сохранённые кастомизации</span></CardTitle>
            <CardDescription className="text-gray-400">Повторно используйте понравившиеся варианты</CardDescription>
          </CardHeader>
          <CardContent>
            {savedRecipes.length === 0 ? (
              <p className="text-gray-400">Пока нет сохранённых кастомизаций.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedRecipes.map(recipe => (
                  <Card
                    key={recipe.id}
                    className="bg-[#2a2f45] border-gray-700 hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/50 overflow-hidden flex flex-col"
                  >
                    <div className="bg-gradient-to-r from-orange-500/10 via-transparent to-transparent p-4 flex items-center justify-between">
                      <Badge className="bg-orange-500/20 text-orange-100 border border-orange-400/50">
                        {recipe.variantLabel || "Кастомизация"}
                      </Badge>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(recipe.savedAt).toLocaleString('ru-RU')}
                      </span>
                    </div>
                    <CardContent className="p-5 flex flex-col space-y-4 flex-1">
                      <div>
                        <h3 className="text-white text-lg font-semibold line-clamp-1">
                          {recipe.baseRecipeName || recipe.title}
                        </h3>
                        <p className="text-sm text-gray-400 line-clamp-3 mt-2">
                          {recipe.content.split('\n').filter(Boolean).slice(0, 4).join(' ')}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                        {recipe.variantParam && (
                          <Badge variant="outline" className="border-gray-600 text-gray-300">
                            {recipe.variantParam}
                          </Badge>
                        )}
                        <Badge variant="outline" className="border-gray-600 text-gray-300">
                          {recipe.baseRecipeName ? recipe.baseRecipeName : "Пользовательский рецепт"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-auto">
                        <Button
                          className="flex-1 bg-orange-500 hover:bg-orange-600"
                          onClick={() => handleLoadSavedRecipe(recipe)}
                        >
                          📄 Открыть
                        </Button>
                        <Button
                          variant="outline"
                          className="border-gray-600 text-gray-300"
                          onClick={() => handleCopySavedRecipe(recipe)}
                        >
                          📋 Копировать
                        </Button>
                        <Button
                          variant="outline"
                          className="border-red-500 text-red-300 hover:bg-red-500/10"
                          onClick={() => handleDeleteSavedRecipe(recipe.id)}
                        >
                          🗑
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cooking Mode */}
      {showCookingMode && (
        <React.Suspense fallback={<div>Загружаем режим готовки...</div>}>
          <CookingBox
            steps={cookingSteps}
            totalCookTime={25}
            title="AI-рецепт"
            onExit={() => setShowCookingMode(false)}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export default RecipeCustomizer;