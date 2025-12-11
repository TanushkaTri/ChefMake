# Диаграмма классов ChefMake

## Описание

Диаграмма классов представляет структуру проекта ChefMake - полнофункционального приложения для планирования питания с AI-поддержкой.

## Диаграмма в формате Mermaid

```mermaid
classDiagram
    %% ==========================================
    %% DATABASE ENTITIES (Models)
    %% ==========================================
    
    class User {
        -Integer id
        -String name
        -String email
        -String password
        -Integer level
        -Integer xp
        -Integer streak
        -Timestamp last_login
        -Integer total_meals_cooked
        -Integer north_indian_meals_cooked
        -Integer south_indian_meals_cooked
        -Integer west_indian_meals_cooked
        -Integer east_indian_meals_cooked
        +findUserByEmail(email) User
        +createUser(data) User
        +findUserById(id) User
        +updateUserName(id, name) User
        +updateUserPassword(id, password) void
        +updateLoginMeta(userId) void
        +incrementMealCookedCount(userId, region) void
    }
    
    class Recipe {
        -Integer id
        -String name
        -String ingredients
        -String diet
        -Integer prep_time
        -Integer cook_time
        -Integer total_time
        -String difficulty
        -String flavor_profile
        -String course
        -String state
        -String region
        -String image_url
        -String instruction
        +getAllRecipesWithStatus(userId) Recipe[]
        +getRecipeByIdWithStatus(id, userId) Recipe
        +searchRecipesByNameWithStatus(query, userId) Recipe[]
        +filterRecipesWithStatus(filters, userId) Recipe[]
        +getRandomRecipes(count) Recipe[]
    }
    
    class Favorite {
        -Integer user_id
        -Integer recipe_id
        -Timestamp added_at
        +getUserFavorites(userId) Recipe[]
        +addFavorite(userId, recipeId) void
        +removeFavorite(userId, recipeId) void
    }
    
    class WeeklyPlan {
        -Integer id
        -Integer user_id
        -String day_of_week
        -String meal_slot
        -Integer recipe_id
        -Timestamp planned_at
        +getWeeklyPlan(userId) WeeklyPlan[]
        +saveMealPlanEntry(userId, day, slot, recipeId) WeeklyPlan
        +deleteMealPlanEntry(userId, day, slot) Integer
    }
    
    class ShoppingList {
        -Integer id
        -Integer user_id
        -JSONB items
        -Timestamp generated_at
        +saveShoppingList(userId, items) ShoppingList
        +getLatestShoppingList(userId) ShoppingList
        +getAllShoppingLists(userId) ShoppingList[]
    }
    
    class CookedMeal {
        -Integer id
        -Integer user_id
        -Integer recipe_id
        -String difficulty
        -Integer actual_cook_time_seconds
        -Timestamp cooked_at
        +recordCookedMeal(userId, recipeId, difficulty, time) CookedMeal
        +getCookedMealStats(userId) Stats
    }
    
    class ChatLog {
        -Integer id
        -Integer user_id
        -String message
        -String role
        -Timestamp sent_at
        +getChatHistory(userId) ChatLog[]
        +saveChatMessage(userId, message, role) void
    }
    
    %% ==========================================
    %% CONTROLLERS
    %% ==========================================
    
    class AuthController {
        +register(req, res) void
        +login(req, res) void
        +logout(req, res) void
        +getMe(req, res) void
        +updateProfile(req, res) void
        +changePassword(req, res) void
    }
    
    class RecipesController {
        +getAllRecipes(req, res) void
        +getRecipeById(req, res) void
        +searchRecipes(req, res) void
        +filterRecipes(req, res) void
    }
    
    class FavoritesController {
        +getFavorites(req, res) void
        +addToFavorites(req, res) void
        +removeFromFavorites(req, res) void
    }
    
    class MealPlannerController {
        +getWeeklyPlan(req, res) void
        +saveMealToPlan(req, res) void
        +deleteMealFromPlan(req, res) void
        +randomizeMealPlan(req, res) void
    }
    
    class GamificationController {
        +recordCookedMeal(req, res) void
        +getCookedMealStats(req, res) void
    }
    
    class AIController {
        +customizeRecipe(req, res) void
        +handleChat(req, res) void
        +generateShoppingList(req, res) void
        +getShoppingList(req, res) void
    }
    
    %% ==========================================
    %% MIDDLEWARES & UTILITIES
    %% ==========================================
    
    class AuthMiddleware {
        +authMiddleware(req, res, next) void
    }
    
    class JWTUtils {
        +generateToken(user) String
        +verifyToken(token) Object
    }
    
    class RedisClient {
        +get(key) String
        +set(key, value, expire) void
    }
    
    %% ==========================================
    %% FRONTEND SERVICES
    %% ==========================================
    
    class RecipeService {
        +getAllRecipes(token) Promise~Recipe[]~
        +getRecipeById(id, token) Promise~Recipe~
        +searchRecipes(query, token) Promise~Recipe[]~
        +filterRecipes(filters, token) Promise~Recipe[]~
    }
    
    class FavoritesService {
        +getFavorites(token) Promise~Recipe[]~
        +addFavorite(recipeId, token) Promise~void~
        +removeFavorite(recipeId, token) Promise~void~
    }
    
    class MealPlannerService {
        +getWeeklyPlan(token) Promise~WeeklyPlan[]~
        +saveMeal(day, slot, recipeId, token) Promise~void~
        +deleteMeal(day, slot, token) Promise~void~
        +randomizeMealPlan(token) Promise~void~
    }
    
    class ChatService {
        +sendMessage(message, token) Promise~String~
        +getChatHistory(token) Promise~ChatLog[]~
    }
    
    class ShoppingListService {
        +generateShoppingList(dishNames, token) Promise~ShoppingList~
        +getShoppingList(token) Promise~ShoppingList~
    }
    
    class GamificationService {
        +recordCookedMeal(data, token) Promise~void~
        +getStats(token) Promise~Stats~
    }
    
    %% ==========================================
    %% FRONTEND CONTEXT
    %% ==========================================
    
    class AuthContext {
        -User user
        -Boolean isLoading
        +login(email, password) Promise~Result~
        +register(name, email, password) Promise~Result~
        +logout() void
        +forgotPassword(email) Promise~Result~
        +resetPassword(token, password) Promise~Result~
        +updateProfile(updates) Promise~Result~
    }
    
    %% ==========================================
    %% RELATIONSHIPS
    %% ==========================================
    
    User ||--o{ Favorite : "has"
    User ||--o{ WeeklyPlan : "plans"
    User ||--o{ ShoppingList : "generates"
    User ||--o{ CookedMeal : "records"
    User ||--o{ ChatLog : "sends"
    
    Recipe ||--o{ Favorite : "favorited_by"
    Recipe ||--o{ WeeklyPlan : "included_in"
    Recipe ||--o{ CookedMeal : "cooked_as"
    
    AuthController ..> User : uses
    AuthController ..> JWTUtils : uses
    
    RecipesController ..> Recipe : uses
    
    FavoritesController ..> Favorite : uses
    FavoritesController ..> Recipe : uses
    
    MealPlannerController ..> WeeklyPlan : uses
    MealPlannerController ..> Recipe : uses
    MealPlannerController ..> ShoppingList : uses
    
    GamificationController ..> CookedMeal : uses
    GamificationController ..> User : updates
    
    AIController ..> ShoppingList : uses
    AIController ..> RedisClient : uses
    AIController ..> Recipe : uses
    
    AuthMiddleware ..> JWTUtils : uses
    
    RecipeService ..> AuthContext : requires
    FavoritesService ..> AuthContext : requires
    MealPlannerService ..> AuthContext : requires
    ChatService ..> AuthContext : requires
    ShoppingListService ..> AuthContext : requires
    GamificationService ..> AuthContext : requires
    
    AuthContext ..> User : manages
```

## Основные компоненты

### DBClasses (Классы для работы с базой данных)

DBClasses содержит классы, которые позволяют организовать соединение с базой данных и работу с ней. К данным классам относится:

#### Классы подключения к БД:
- **DB Pool** (`backend/config/db.js`) - создает и экспортирует пул соединений PostgreSQL через библиотеку `pg`. Использует SSL-соединение для подключения к Supabase PostgreSQL. Предоставляет единый пул соединений, который переиспользуется всеми моделями проекта.

- **RedisClient** (`backend/utils/redisClient.js`) - клиент для подключения к Redis серверу для кэширования данных. Используется для оптимизации производительности API-запросов, особенно для AI-функционала (кэширование результатов кастомизации рецептов, чата и списков покупок).

#### Модели данных (Data Models):
Все модели находятся в директории `backend/models/` и используют общий пул соединений (`pool`) из `config/db.js`:

- **UserModel** (`backend/models/userModel.js`) - управляет операциями с таблицей `users`. Содержит методы для поиска пользователей по email и ID, создания новых пользователей, обновления профиля, управления паролями, обновления метаданных входа (login streak) и подсчета приготовленных блюд для геймификации.

- **RecipeModel** (`backend/models/recipeModel.js`) - управляет операциями с таблицей `recipes`. Предоставляет методы для получения всех рецептов с учетом статуса "приготовлено", поиска рецептов по названию, фильтрации по диете/курсу/региону и получения случайных рецептов.

- **FavoritesModel** (`backend/models/favoritesModel.js`) - управляет операциями с таблицей `favorites` (связь many-to-many между пользователями и рецептами). Содержит методы для получения избранных рецептов пользователя, добавления и удаления рецептов из избранного.

- **WeeklyPlanModel** (`backend/models/weeklyPlanModel.js`) - управляет операциями с таблицей `weekly_plan`. Предоставляет методы для получения недельного плана питания пользователя, сохранения и удаления записей о запланированных приемах пищи (с указанием дня недели и типа приема пищи: breakfast/lunch/dinner).

- **ShoppingListModel** (`backend/models/shoppingListModel.js`) - управляет операциями с таблицей `shopping_lists`. Содержит методы для сохранения сгенерированных AI списков покупок (в формате JSONB), получения последнего списка и всех списков пользователя.

- **GamificationModel** (`backend/models/gamificationModel.js`) - управляет операциями с таблицей `cooked_meals` (история приготовленных блюд). Предоставляет методы для записи приготовленных блюд с указанием сложности и фактического времени приготовления, а также получения статистики приготовленных блюд по категориям сложности.

- **ChatModel** (`backend/models/chatModel.js`) - управляет операциями с таблицей `chat_logs`. Содержит методы для сохранения сообщений чата (пользователя и AI-ассистента) и получения истории чата для конкретного пользователя.

Все модели используют асинхронные методы (async/await) и возвращают промисы, что обеспечивает неблокирующую работу с базой данных.

### Backend (Node.js/Express)

#### Модели (Models)
- **User** - Управление пользователями и геймификацией
- **Recipe** - Хранение и поиск рецептов
- **Favorite** - Избранные рецепты пользователей
- **WeeklyPlan** - Еженедельный план питания
- **ShoppingList** - Списки покупок, сгенерированные AI
- **CookedMeal** - История приготовленных блюд для статистики
- **ChatLog** - История чата с AI-ассистентом

#### Контроллеры (Controllers)
- **AuthController** - Аутентификация и управление профилем
- **RecipesController** - Управление рецептами
- **FavoritesController** - Управление избранными
- **MealPlannerController** - Планирование питания
- **GamificationController** - Статистика и достижения
- **AIController** - Интеграция с AI-сервисами (Hugging Face)

#### Утилиты (Utils)
- **JWTUtils** - Генерация и проверка JWT токенов
- **RedisClient** - Кэширование запросов
- **AuthMiddleware** - Проверка аутентификации

### Frontend (React/TypeScript)

#### Сервисы (Services)
- **RecipeService** - API для работы с рецептами
- **FavoritesService** - API для избранных
- **MealPlannerService** - API для планирования питания
- **ChatService** - API для чата с AI
- **ShoppingListService** - API для списков покупок
- **GamificationService** - API для статистики

#### Контексты (Contexts)
- **AuthContext** - Глобальное состояние аутентификации

## Связи между классами

1. **User** связан с множеством других сущностей (Favorite, WeeklyPlan, ShoppingList, CookedMeal, ChatLog)
2. **Recipe** используется в Favorite, WeeklyPlan и CookedMeal
3. Контроллеры используют соответствующие модели для обработки запросов
4. Frontend сервисы зависят от AuthContext для получения токена аутентификации
5. **AIController** интегрируется с внешним Hugging Face API и использует Redis для кэширования

## Примечания

- Проект использует архитектуру MVC на backend
- Frontend использует паттерн Service Layer для инкапсуляции API-вызовов
- Аутентификация реализована через JWT токены
- AI-функционал вынесен в отдельный внешний сервис (Hugging Face)
- Кэширование реализовано через Redis для оптимизации производительности

