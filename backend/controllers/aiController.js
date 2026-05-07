const axios = require('axios');
const ShoppingListModel = require('../models/shoppingListModel');
const FavoritesModel = require('../models/favoritesModel');
const redisClient = require('../utils/redisClient'); 
const pool = require('../config/db');
const {
    FAVORITES_KEYWORDS,
    normalizeText,
    formatFavoritesList,
    formatRecipeDetails,
    findFavoriteByQuery,
} = require('../utils/favoritesHelper');

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-large-2512';
const MISTRAL_ENDPOINT = 'https://api.mistral.ai/v1/chat/completions';

const callMistralChat = async ({ messages, temperature = 0.3, maxTokens = 1200 }) => {
    if (!MISTRAL_API_KEY) {
        throw new Error('MISTRAL_API_KEY is not configured.');
    }

    const response = await axios.post(
        MISTRAL_ENDPOINT,
        {
            model: MISTRAL_MODEL,
            messages,
            temperature,
            max_tokens: maxTokens,
        },
        {
            headers: {
                Authorization: `Bearer ${MISTRAL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 90000,
        }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
        throw new Error('AI service returned an invalid or empty response.');
    }
    return content.trim();
};

const mapCustomizationOptionToInstruction = (optionParam) => {
    switch (optionParam) {
        case 'vegan':
            return "Перепиши рецепт на русский язык, сделай его полностью веганским, заменив продукты животного происхождения на растительные аналоги.";
        case 'low-calorie':
            return "Перепиши рецепт на русский язык, уменьшив калорийность: используй более лёгкие продукты и щадящие способы приготовления.";
        case 'quick':
            return "Перепиши рецепт на русский язык, сократи и упростив шаги, чтобы приготовить быстрее и с минимальным количеством действий.";
        case 'gluten-free':
            return "Перепиши рецепт на русский язык, заменив все продукты с глютеном на безглютеновые аналоги.";
        case 'high-protein':
            return "Перепиши рецепт на русский язык, увеличив содержание белка с помощью богатых белком ингредиентов.";
        case 'kid-friendly':
        case 'general':
            return "Перепиши рецепт на русский язык, сделав его понятным и удобным для домашнего повара: ясные шаги и аккуратное форматирование.";
        default:
            return "Перепиши рецепт на русский язык, улучшив читаемость, структуру и чётко пронумеровав шаги.";
    }
};

// Made caching resilient to Redis failures
const safeSetCache = async (key, value, expireTime) => {
    try {
        await redisClient.set(key, value, 'EX', expireTime);
    } catch (err) {
        console.error('Failed to set cache for key:', key, err);
    }
};

exports.customizeRecipe = async (req, res) => {
    const { originalRecipe, customizationOption } = req.body;
    
    if (!originalRecipe || !customizationOption) {
        return res.status(400).json({ message: "Original recipe and customization option are required." });
    }

    const cacheKey = `custom_recipe:${customizationOption}:${originalRecipe}`;
    let cachedResult = null;
    
    try {
        cachedResult = await redisClient.get(cacheKey);
    } catch (redisErr) {
        console.warn('Redis cache unavailable, continuing without cache:', redisErr.message);
    }
    
    if (cachedResult) {
        console.log('Serving customized recipe from Redis cache.');
        return res.status(200).json(JSON.parse(cachedResult));
    }

    const userInstruction = mapCustomizationOptionToInstruction(customizationOption);

    // Fallback: if no AI key configured, return a simple local transformation
    if (!MISTRAL_API_KEY) {
        console.warn('MISTRAL_API_KEY not configured, using fallback transformation');
        const header = `Customization: ${customizationOption}`;
        const body = originalRecipe
            .split('\n')
            .filter(Boolean)
            .map((line, idx) => `${idx + 1}. ${line}`)
            .join('\n');
        const responseData = { customizedRecipe: `${header}\n\n${body}` };
        await safeSetCache(cacheKey, JSON.stringify(responseData), 3600);
        return res.status(200).json(responseData);
    }

    try {
        const aiText = await callMistralChat({
            messages: [
                {
                    role: 'system',
                    content: 'Ты кулинарный редактор. Отвечай на русском. Форматируй рецепт чётко, с пронумерованными шагами. Если нужно, перепиши ингредиенты и шаги, но сохрани структуру блюда. Не добавляй пояснений вне рецепта.',
                },
                {
                    role: 'user',
                    content: `Исходный рецепт:\n${originalRecipe}\n\nИнструкция:\n${userInstruction}\n\nВыведи финальный рецепт на русском, с явными шагами.`,
                },
            ],
            temperature: 0.35,
            maxTokens: 1500,
        });

        let formattedRecipe = aiText;

        // Если AI ответ не на русском — простой локальный переформат
        if (!isMostlyCyrillic(formattedRecipe)) {
            console.warn("AI customization not in Russian, applying local Russian fallback.");
            const lines = formattedRecipe
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean);
            formattedRecipe = lines.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
        }

        const responseData = { customizedRecipe: formattedRecipe };

        await safeSetCache(cacheKey, JSON.stringify(responseData), 3600);
        return res.status(200).json(responseData);

    } catch (error) {
        console.error("Error in customizeRecipe:", error.message);
        if (error.response) {
            console.error('AI service error response:', error.response.status, error.response.data);
            return res.status(error.response.status).json({
                message: error.response.data?.detail || `AI service error: ${error.response.status}`,
                details: error.response.data,
            });
        } else if (error.request) {
            console.error('AI service request failed - no response received');
            return res.status(504).json({ 
                message: "AI service is unreachable or timed out. Please check if the service is running.",
                details: error.message
            });
        } else {
            console.error('Request setup error:', error.message);
            return res.status(500).json({ message: `Request setup failed: ${error.message}` });
        }
    }
};

exports.handleChat = async (req, res) => {
    const { message } = req.body;
    const userId = req.user.id;

    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    if (!message) return res.status(400).json({ error: 'Message is required.' });

    const normalizedMessage = normalizeText(message);

    let favorites = [];
    let favoritesError = null;
    try {
        favorites = await FavoritesModel.getUserFavorites(userId);
    } catch (error) {
        favoritesError = error;
        console.error('Failed to fetch favorites for chat:', error.message);
    }

    const hasFavorites = favorites.length > 0;

    const favoritesRequest = FAVORITES_KEYWORDS.some(keyword => normalizedMessage.includes(keyword));
    if (favoritesRequest) {
        if (favoritesError) {
            return res.status(200).json({
                reply: 'Не удалось загрузить список избранных рецептов. Попробуйте ещё раз чуть позже.'
            });
        }
        if (!hasFavorites) {
            return res.status(200).json({
                reply: 'У вас пока нет избранных рецептов. Добавьте понравившиеся блюда и я покажу их здесь.'
            });
        }
        const { sorted, text } = formatFavoritesList(favorites);
        return res.status(200).json({
            reply: `Вот ваши избранные рецепты:\n${text}\n\nНапишите номер или название рецепта, чтобы получить подробности.`
        });
    }

    if (hasFavorites) {
        const { sorted } = formatFavoritesList(favorites);
        const favoriteMatch = findFavoriteByQuery(normalizedMessage, sorted);
        if (favoriteMatch) {
            return res.status(200).json({ reply: formatRecipeDetails(favoriteMatch) });
        }
    }

    // Проверка наличия AI сервиса
    if (!MISTRAL_API_KEY) {
        console.warn('MISTRAL_API_KEY not configured, returning fallback response');
        return res.status(503).json({ 
            error: 'AI service is not configured. Please set MISTRAL_API_KEY in environment variables.',
            reply: 'К сожалению, AI сервис сейчас недоступен. Свяжитесь с администратором.',
        });
    }

    const cacheKey = `chat:${userId}:${message}`;
    let cachedResult = null;
    
    try {
        cachedResult = await redisClient.get(cacheKey);
    } catch (redisErr) {
        console.warn('Redis cache unavailable, continuing without cache:', redisErr.message);
    }

    if (cachedResult) {
        console.log('Serving chat response from Redis cache.');
        return res.status(200).json(JSON.parse(cachedResult));
    }

    try {
        const assistantReply = await callMistralChat({
            messages: [
                {
                    role: 'system',
                    content: 'Ты ChiefMake — дружелюбный кулинарный ассистент и чат-поддержка приложения ChefMake. Отвечай кратко, по-русски, по делу. Ты помогаешь пользователям с вопросами о готовке, рецептах, планировании питания, а также отвечаешь на вопросы о работе приложения. Если спрашивают об избранных рецептах — используй данные, которые тебе передали; иначе отвечай как опытный шеф-повар и помощник по использованию приложения.',
                },
                { role: 'user', content: message },
            ],
            temperature: 0.35,
            maxTokens: 800,
        });

        const responseData = { reply: assistantReply };
        
        try {
            await safeSetCache(cacheKey, JSON.stringify(responseData), 3600);
        } catch (cacheErr) {
            console.warn('Failed to cache response:', cacheErr.message);
        }
        
        res.status(200).json(responseData);

    } catch (error) {
        console.error("Error in handleChat:", error.message);
        const status = error.response?.status || 500;
        return res.status(status).json({
            error: error.response?.data || error.message || 'AI service error',
            details: error.response?.data,
        });
    }
};

const buildLocalShoppingList = async (dishNames, userId) => {
    // Backward-compatible local list builder (no quantity aggregation).
    // Prefer using buildAggregatedShoppingListFromRecipes when recipeIds are available.
    const dbResult = await pool.query(
        `SELECT name, ingredients FROM recipes WHERE name = ANY($1::text[])`,
        [dishNames]
    );

    const ingredientSet = new Set();
    for (const row of dbResult.rows) {
        const parts = (row.ingredients || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        parts.forEach(p => ingredientSet.add(p));
    }

    const lines = ingredientSet.size > 0
        ? Array.from(ingredientSet).map((ing, idx) => `${idx + 1}. ${ing}`)
        : dishNames.map((d, idx) => `${idx + 1}. Ингредиенты для ${d}`);

    const generatedList = `Список покупок\n\n${lines.join('\n')}`;
    const listToSave = { content: generatedList, dishes: dishNames };
    const savedList = await ShoppingListModel.saveShoppingList(userId, listToSave);
    return { generatedList, savedList };
};

const normalizeUnit = (rawUnit) => {
    const u = (rawUnit || "").toLowerCase().replace(/\./g, "").trim();
    if (!u) return null;
    if (u === "г" || u === "гр" || u === "грамм" || u === "грамма" || u === "граммов") return "g";
    if (u === "кг" || u === "килограмм" || u === "килограмма" || u === "килограммов") return "kg";
    if (u === "мл" || u === "миллилитр" || u === "миллилитра" || u === "миллилитров") return "ml";
    if (u === "л" || u === "литр" || u === "литра" || u === "литров") return "l";
    if (u === "шт" || u === "ш" || u === "штука" || u === "штуки" || u === "штук") return "pcs";
    if (u === "пачка" || u === "пач" || u === "пачки" || u === "пачек") return "pack";
    if (u === "уп" || u === "упак" || u === "упаковка" || u === "упаковки" || u === "упаковок") return "pack";
    return u;
};

const UNIT_LABEL_RU = {
    g: "г",
    kg: "кг",
    ml: "мл",
    l: "л",
    pcs: "шт",
    pack: "пач.",
};

const parseIngredientToken = (token) => {
    // Examples supported:
    // "200 г муки", "1.5 кг картофеля", "2 шт яйца", "1 пачка творога"
    // If no quantity detected -> quantity null, unit null, name = token
    const original = (token || "").trim();
    if (!original) return null;

    const cleaned = original
        .replace(/\s+/g, " ")
        .replace(/^\-+\s*/, "")
        .replace(/^•\s*/, "")
        .trim();

    // 1) Format: "200 г муки" / "1.5 кг картофеля" / "2 шт яйца"
    const m = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*([A-Za-zА-Яа-яЁё.]+)\s+(.+)$/);
    if (m) {
        const qty = parseFloat(m[1].replace(",", "."));
        const unit = normalizeUnit(m[2]);
        const name = (m[3] || "").trim();
        return { qty: Number.isFinite(qty) ? qty : null, unit: unit || null, name: name || cleaned };
    }

    // 2) Format: "мука 200 г" / "баранина 400гр" / "вода 2000мл"
    const mEnd = cleaned.match(/^(.+?)\s*(\d+(?:[.,]\d+)?)\s*([A-Za-zА-Яа-яЁё.]+)\s*$/);
    if (mEnd) {
        const name = (mEnd[1] || "").trim();
        const qty = parseFloat(mEnd[2].replace(",", "."));
        const unit = normalizeUnit(mEnd[3]);
        return { qty: Number.isFinite(qty) ? qty : null, unit: unit || null, name: name || cleaned };
    }

    // Quantity without unit (fallback): keep qty but no unit (we won't render as "шт")
    const m2 = cleaned.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
    if (m2) {
        const qty = parseFloat(m2[1].replace(",", "."));
        const name = (m2[2] || "").trim();
        return { qty: Number.isFinite(qty) ? qty : null, unit: null, name: name || cleaned };
    }

    return { qty: null, unit: null, name: cleaned };
};

const normalizeIngredientName = (name) => {
    return (name || "")
        .toLowerCase()
        .replace(/[()]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
};

const aggregateItems = (items) => {
    // items: {name, qty, unit}
    const map = new Map();
    for (const it of items) {
        if (!it || !it.name) continue;
        const normName = normalizeIngredientName(it.name);
        const unitKey = it.unit || "unknown";
        const key = `${normName}::${unitKey}`;

        const prev = map.get(key) || {
            name: it.name.trim(),
            qty: typeof it.qty === "number" && Number.isFinite(it.qty) ? it.qty : null,
            unit: it.unit || null,
        };

        if (prev.qty !== null && typeof it.qty === "number" && Number.isFinite(it.qty)) {
            prev.qty += it.qty;
        } else if (prev.qty === null && typeof it.qty === "number" && Number.isFinite(it.qty)) {
            prev.qty = it.qty;
            prev.unit = it.unit || null;
        }

        map.set(key, prev);
    }
    return Array.from(map.values());
};

const convertAndFormat = (items) => {
    // Convert g->kg when >=1000, ml->l when >=1000
    const converted = items.map((it) => {
        if (it.unit === "g" && it.qty >= 1000) {
            return { ...it, qty: it.qty / 1000, unit: "kg" };
        }
        if (it.unit === "ml" && it.qty >= 1000) {
            return { ...it, qty: it.qty / 1000, unit: "l" };
        }
        return it;
    });

    const byUnitOrder = (u) => {
        if (u === "kg" || u === "g") return 1;
        if (u === "l" || u === "ml") return 2;
        if (u === "pack") return 3;
        if (u === "pcs") return 4;
        return 10;
    };

    converted.sort((a, b) => {
        const au = byUnitOrder(a.unit);
        const bu = byUnitOrder(b.unit);
        if (au !== bu) return au - bu;
        return a.name.localeCompare(b.name, "ru");
    });

    const formatQty = (qty) => {
        if (!Number.isFinite(qty)) return "";
        // keep 1 decimal max for converted values
        const rounded = Math.round(qty * 10) / 10;
        return String(rounded).replace(".", ",");
    };

    return converted.map((it) => {
        if (it.qty === null || it.qty === undefined || !Number.isFinite(it.qty)) {
            return `- ${it.name}`.trim();
        }

        if (!it.unit) {
            return `- ${it.name} — ${formatQty(it.qty)}`.trim();
        }

        const unitLabel = UNIT_LABEL_RU[it.unit] || it.unit;
        return `- ${it.name} — ${formatQty(it.qty)} ${unitLabel}`.trim();
    });
};

const buildAggregatedShoppingListFromRecipes = async ({ recipeIds, userId }) => {
    const ids = (recipeIds || []).map((x) => Number(x)).filter((x) => Number.isInteger(x));
    if (!ids.length) {
        throw new Error("recipeIds must be a non-empty array of integers");
    }

    const dbResult = await pool.query(
        `SELECT id, name, ingredients FROM recipes WHERE id = ANY($1::int[])`,
        [ids]
    );

    const rawItems = [];
    for (const row of dbResult.rows) {
        const raw = (row.ingredients || "").toString();
        const parts = raw
            .split(/,|\n|\r\n/g)
            .map((s) => s.trim())
            .filter(Boolean);

        for (const part of parts) {
            const parsed = parseIngredientToken(part);
            if (!parsed) continue;
            rawItems.push({
                name: parsed.name,
                qty: parsed.qty,
                unit: parsed.unit,
            });
        }
    }

    const aggregated = aggregateItems(rawItems);
    const lines = convertAndFormat(aggregated);

    const recipeNames = dbResult.rows.map((r) => r.name).filter(Boolean);
    const generatedList = [
        "Список покупок",
        "",
        ...lines,
        "",
        recipeNames.length ? `Блюда: ${recipeNames.join(", ")}` : "",
    ]
        .filter((x) => x !== "")
        .join("\n");

    const listToSave = { content: generatedList, dishes: recipeNames };
    const savedList = await ShoppingListModel.saveShoppingList(userId, listToSave);
    return { generatedList, savedList, recipeNames };
};

const isMostlyCyrillic = (text) => {
    if (!text) return false;
    const letters = (text.match(/[A-Za-zА-Яа-яЁё]/g) || []).length;
    const cyr = (text.match(/[А-Яа-яЁё]/g) || []).length;
    if (letters === 0) return false;
    return cyr / letters >= 0.4; // at least 40% русских букв
};

exports.generateShoppingList = async (req, res) => {
    const { dishNames, recipeIds } = req.body;
    const userId = req.user.id;

    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    const hasRecipeIds = Array.isArray(recipeIds) && recipeIds.length > 0;
    const hasDishNames = Array.isArray(dishNames) && dishNames.length > 0;
    if (!hasRecipeIds && !hasDishNames) {
        return res.status(400).json({ error: 'Please provide dishNames or recipeIds.' });
    }

    const cacheSignature = hasRecipeIds
        ? JSON.stringify([...new Set(recipeIds.map((x) => Number(x)).filter((x) => Number.isInteger(x)))].sort((a, b) => a - b))
        : JSON.stringify(dishNames.slice().sort());

    const specificCacheKey = `shopping_list:${userId}:${cacheSignature}`;
    const latestListCacheKey = `latest_shopping_list:${userId}`;

    // Check if the specific list is already in the cache
    let cachedResult = null;
    try {
        cachedResult = await redisClient.get(specificCacheKey);
    } catch (redisErr) {
        console.warn('Redis cache unavailable, continuing without cache:', redisErr.message);
    }
    
    if (cachedResult) {
        console.log('Serving shopping list from Redis cache.');
        return res.status(200).json(JSON.parse(cachedResult));
    }

    // If recipeIds are provided (meal plan scenario), always generate locally with quantity/unit aggregation.
    if (hasRecipeIds) {
        try {
            const { generatedList, savedList, recipeNames } = await buildAggregatedShoppingListFromRecipes({ recipeIds, userId });
            const responseData = { shoppingList: generatedList, savedListId: savedList.id, dishes: recipeNames };

            await safeSetCache(specificCacheKey, JSON.stringify(responseData), 3600);
            await safeSetCache(
                latestListCacheKey,
                JSON.stringify({ shoppingList: savedList.items, generatedAt: savedList.generated_at.toISOString() }),
                3600
            );

            return res.status(200).json(responseData);
        } catch (error) {
            console.error("Aggregated shopping list failed:", error);
            return res.status(500).json({ error: "Failed to generate shopping list from recipes.", details: error.message });
        }
    }

    const russianShoppingInstruction = "Ты помощник-повар. Пиши ТОЛЬКО на русском, без английских слов. Составь краткий список покупок, сгруппированный по категориям (овощи, молочное, крупы, специи и т.д.). Формат: подзаголовок категории и пункты ниже. Без пояснений, только список.";

    // Local fallback when AI is not configured
    if (!MISTRAL_API_KEY) {
        console.warn('MISTRAL_API_KEY not configured, using local database fallback');
        try {
            const { generatedList, savedList } = await buildLocalShoppingList(dishNames, userId);
            const responseData = { shoppingList: generatedList, savedListId: savedList.id };

            await safeSetCache(specificCacheKey, JSON.stringify(responseData), 3600);
            await safeSetCache(
                latestListCacheKey,
                JSON.stringify({ shoppingList: savedList.items, generatedAt: savedList.generated_at.toISOString() }),
                3600
            );

            return res.status(200).json(responseData);
        } catch (error) {
            console.error('Local shopping list fallback failed:', error);
            return res.status(500).json({ error: 'Failed to generate shopping list locally.' });
        }
    }

    try {
        const generatedList = await callMistralChat({
            messages: [
                {
                    role: 'system',
                    content: russianShoppingInstruction,
                },
                {
                    role: 'user',
                    content: `Сформируй список покупок по блюдам: ${dishNames.join(', ')}`,
                },
            ],
            temperature: 0.3,
            maxTokens: 900,
        });
        
        let finalList = generatedList;
        // If AI responded mostly not in Russian, rebuild locally in Russian
        if (!isMostlyCyrillic(generatedList)) {
            console.warn('AI shopping list not in Russian, rebuilding locally.');
            try {
                const { generatedList: localList, savedList } = await buildLocalShoppingList(dishNames, userId);
                finalList = localList;
                const responseData = { shoppingList: finalList, savedListId: savedList.id };

                await safeSetCache(specificCacheKey, JSON.stringify(responseData), 3600);
                await safeSetCache(
                    latestListCacheKey,
                    JSON.stringify({ 
                        shoppingList: savedList.items,
                        generatedAt: savedList.generated_at.toISOString() 
                    }),
                    3600
                );

                return res.status(200).json(responseData);
            } catch (fallbackErr) {
                console.error('Local rebuild after non-Russian AI response failed:', fallbackErr);
            }
        }
        
        const listToSave = {
            content: finalList,
            dishes: dishNames,
        };

        const savedList = await ShoppingListModel.saveShoppingList(userId, listToSave);
        const responseData = { shoppingList: finalList, savedListId: savedList.id };

        // Cache the specific list for future identical requests
        await safeSetCache(specificCacheKey, JSON.stringify(responseData), 3600);
        
        // Also update the 'latest list' cache key for immediate retrieval
        await safeSetCache(
            latestListCacheKey,
            JSON.stringify({ 
                shoppingList: savedList.items,
                generatedAt: savedList.generated_at.toISOString() 
            }),
            3600
        );

        res.status(200).json(responseData);

    } catch (error) {
        console.error("Error in generateShoppingList:", error.message);
        if (error.response) {
            console.error('AI service error response:', error.response.status, error.response.data);
            res.status(error.response.status).json({
                error: error.response.data?.detail || `AI service error: ${error.response.status}`,
                details: error.response.data,
            });
        } else if (error.request) {
            console.error('AI service request failed - no response received');
            res.status(504).json({ 
                error: "AI shopping list service is unreachable or timed out. Please check if the service is running.",
                details: error.message
            });
        } else {
            console.error('Request setup error:', error.message);
            res.status(500).json({ error: `Request setup failed: ${error.message}` });
        }
    }
};

exports.getShoppingList = async (req, res) => {
    const userId = req.user.id;
    const cacheKey = `latest_shopping_list:${userId}`; 

    let cachedResult = null;
    try {
        cachedResult = await redisClient.get(cacheKey);
    } catch (redisErr) {
        console.warn('Redis cache unavailable, continuing without cache:', redisErr.message);
    }
    
    if (cachedResult) {
        console.log('Serving latest shopping list from Redis cache.');
        return res.status(200).json(JSON.parse(cachedResult));
    }

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
        const latestList = await ShoppingListModel.getLatestShoppingList(userId);
        if (!latestList) {
            return res.status(404).json({ message: 'No shopping list found for this user.' });
        }

        // Parse items if it's a string (JSONB from PostgreSQL)
        let items = latestList.items;
        if (typeof items === 'string') {
            try {
                items = JSON.parse(items);
            } catch (parseErr) {
                console.error('Error parsing items JSON:', parseErr);
                items = { content: items, dishes: [] };
            }
        }

        const responseData = {
            shoppingList: items,
            generatedAt: latestList.generated_at,
        };
        
        await safeSetCache(cacheKey, JSON.stringify(responseData), 3600);

        res.status(200).json(responseData);

    } catch (error) {
        console.error('Error in getShoppingList:', error);
        res.status(500).json({ error: 'Failed to load shopping list.', details: error.message });
    }
};