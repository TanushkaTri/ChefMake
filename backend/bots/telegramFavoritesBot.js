require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const bcrypt = require('bcrypt');

const FavoritesModel = require('../models/favoritesModel');
const TelegramLinkModel = require('../models/telegramLinkModel');
const { findUserByEmail } = require('../models/userModel');
const {
  FAVORITES_KEYWORDS,
  normalizeText,
  formatFavoritesList,
  formatRecipeDetails,
  findFavoriteByQuery,
} = require('../utils/favoritesHelper');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  const isStandalone = typeof require !== 'undefined' && require.main === module;
  if (isStandalone) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set. Please add it to backend/.env');
    process.exit(1);
  }
  // If imported by server.js, throw error to be caught by server.js
  throw new Error('TELEGRAM_BOT_TOKEN is not set');
}

const bot = new TelegramBot(token, { polling: true });

const buildFavoritesKeyboard = () => ({
  reply_markup: {
    keyboard: [
      [{ text: 'Покажи избранные' }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  }
});

const splitAndSendMessage = async (chatId, text, extra = {}) => {
  const chunkSize = 3500;
  if (text.length <= chunkSize) {
    await bot.sendMessage(chatId, text, extra);
    return;
  }

  for (let offset = 0; offset < text.length; offset += chunkSize) {
    const chunk = text.slice(offset, offset + chunkSize);
    // eslint-disable-next-line no-await-in-loop
    await bot.sendMessage(chatId, chunk, extra);
  }
};

const ensureLinkedUser = async (chatId, telegramId) => {
  const userId = await TelegramLinkModel.getUserIdByTelegramId(telegramId);
  if (!userId) {
    await bot.sendMessage(
      chatId,
      'Сначала выполните авторизацию командой:\n/login ваш_email ваш_пароль'
    );
    return null;
  }
  return userId;
};

const sendFavoritesList = async (chatId, userId) => {
  const favorites = await FavoritesModel.getUserFavorites(userId);
  if (!favorites.length) {
    await bot.sendMessage(chatId, 'У вас пока нет избранных рецептов.');
    return;
  }

  const { text } = formatFavoritesList(favorites);
  await splitAndSendMessage(
    chatId,
    `Ваши избранные рецепты:\n${text}\n\nНапишите номер или название рецепта, чтобы получить подробности.`,
    buildFavoritesKeyboard()
  );
};

const sendFavoriteDetails = async (chatId, favorites, normalizedMessage) => {
  if (!favorites.length) {
    await bot.sendMessage(chatId, 'У вас пока нет избранных рецептов.');
    return;
  }

  const { sorted } = formatFavoritesList(favorites);
  const recipe = findFavoriteByQuery(normalizedMessage, sorted);

  if (!recipe) {
    await bot.sendMessage(
      chatId,
      'Не нашёл такой рецепт среди избранных. Напишите «/favorites» или «Покажи избранные», чтобы увидеть список.'
    );
    return;
  }

  await splitAndSendMessage(chatId, formatRecipeDetails(recipe), buildFavoritesKeyboard());
};

bot.onText(/^\/start/i, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    [
      '👋 Привет! Я бот ChefMake и помогу работать с избранными рецептами.',
      '',
      'Доступные команды:',
      '• /login email пароль — войти (используются те же данные, что и на сайте)',
      '• /logout — выйти',
      '• /favorites — показать весь список избранных',
      '',
      'После входа просто отправьте «Покажи избранные» или название рецепта, чтобы получить описание.',
      '',
      '⚠️ Никому не пересылайте свои данные из чата. Команда /login передает пароль в Telegram, используйте её только в доверенной среде.'
    ].join('\n'),
    buildFavoritesKeyboard()
  );
});

bot.onText(/^\/login\s+(\S+)\s+(.+)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  const email = match[1];
  const password = match[2];

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      await bot.sendMessage(chatId, 'Пользователь с таким email не найден.');
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await bot.sendMessage(chatId, 'Неверный пароль. Попробуйте снова.');
      return;
    }

    try {
      await TelegramLinkModel.linkTelegramAccount(telegramId, user.id);
      await bot.sendMessage(
        chatId,
        'Готово! Теперь вы можете использовать /favorites или написать название избранного рецепта.',
        buildFavoritesKeyboard()
      );
    } catch (error) {
      if (error.message === "CHAT_ALREADY_LINKED") {
        await bot.sendMessage(
          chatId,
          'Этот чат уже привязан к другому пользователю. Сначала выполните /logout в этом чате или используйте другой чат.',
        );
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('[TelegramBot] login error:', error);
    await bot.sendMessage(chatId, 'Не удалось выполнить вход. Попробуйте позже.');
  }
});

bot.onText(/^\/logout/i, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    await TelegramLinkModel.unlinkTelegramAccount(telegramId);
    await bot.sendMessage(chatId, 'Вы вышли из бота. Чтобы снова получить избранные, выполните /login.');
  } catch (error) {
    console.error('[TelegramBot] logout error:', error);
    await bot.sendMessage(chatId, 'Не удалось выполнить выход. Попробуйте позже.');
  }
});

bot.onText(/^\/favorites/i, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    const userId = await ensureLinkedUser(chatId, telegramId);
    if (!userId) return;
    await sendFavoritesList(chatId, userId);
  } catch (error) {
    console.error('[TelegramBot] favorites error:', error);
    await bot.sendMessage(chatId, 'Не удалось получить список избранных. Попробуйте позже.');
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) {
    return;
  }

  try {
    const userId = await ensureLinkedUser(chatId, telegramId);
    if (!userId) return;

    const normalizedMessage = normalizeText(text);

    if (FAVORITES_KEYWORDS.some(keyword => normalizedMessage.includes(keyword))) {
      await sendFavoritesList(chatId, userId);
      return;
    }

    const favorites = await FavoritesModel.getUserFavorites(userId);
    await sendFavoriteDetails(chatId, favorites, normalizedMessage);
  } catch (error) {
    console.error('[TelegramBot] generic handler error:', error);
    await bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in Telegram bot:', reason);
});

console.log('🤖 Telegram бот ChefMake запущен. Нажмите CTRL+C для остановки.');

