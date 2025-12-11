# Master Classes API

Новый модуль позволяет пользователям ChefMake создавать и проводить мастер-классы с видеоконференцией Stream и встроенным чатом. Все маршруты защищены JWT и требуют заголовок `Authorization: Bearer <token>`.

## Конфигурация

Добавьте переменные в `.env` backend:

```
STREAM_API_KEY=...
STREAM_API_SECRET=...
STREAM_APP_ID=...            # опционально, но полезно для отладки
STREAM_VIDEO_TEMPLATE=default
```

## Маршруты

### `POST /api/master-classes`
Создаёт мастер-класс.

**Body**

```json
{
  "title": "Пицца без дрожжей",
  "description": "Готовим быстрый вариант ужина",
  "startTime": "2025-12-01T18:00:00.000Z",
  "durationMinutes": 90,
  "ingredients": ["мука", "сыр", "томатный соус"],
  "videoMode": "stream",          // или "link"
  "conferenceUrl": "https://meet.example.com/123" // обязательно для videoMode=link
}
```

**Response 201**

```
{
  "masterClass": { ... },
  "stream": {
    "apiKey": "...",
    "token": "...",
    "callId": "masterclass_xxx",
    "callTemplate": "default",
    "user": { "id": "1", "name": "Анна" }
  }
}
```

### `GET /api/master-classes?filter=upcoming|past|mine`
Возвращает упорядоченный список ближайших/прошедших/моих мастер-классов.

### `GET /api/master-classes/:id`
Детали одного мастер-класса.

### `POST /api/master-classes/:id/token`
Выдаёт токен для подключения к мастер-классу.

- Если `video_mode = "link"`, вернёт `conferenceUrl`.
- Если `video_mode = "stream"`, вернёт `apiKey`, `token`, `callId`, `callTemplate` и объект пользователя. Ответ используется на фронтенде для инициализации `@stream-io/video-react-sdk`.

### `DELETE /api/master-classes/:id`
Удаляет мастер-класс. Доступно только автору (`created_by`). Возвращает `{ message: "Мастер-класс удалён" }`.

### `GET /api/master-classes/:id/messages`
Возвращает чат мастер-класса:

```
{
  "items": [
    { "id": 1, "user_id": 5, "author_name": "Анна", "message": "Какая температура?", "created_at": "..." }
  ]
}
```

### `POST /api/master-classes/:id/messages`
Добавляет сообщение в чат. Тело: `{ "message": "Ваш вопрос" }`. Любой авторизованный пользователь может задавать вопросы, ведущий читает список и отвечает в эфире.

## База данных

Скрипт `backend/sql/005_master_classes.sql` создаёт таблицы:

- `master_classes` — основная информация о сессии.
- `master_class_attendees` — связь пользователей и сессий с ролью (host/guest).

Ингредиенты хранятся как `TEXT[]`, поэтому в контроллере список можно передавать полем `ingredients` (массив или текст с переносами строк).

