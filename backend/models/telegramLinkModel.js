const pool = require('../config/db');

const TelegramLinkModel = {
  async linkTelegramAccount(telegramId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Prevent linking if this chat is already bound to another user
      const existing = await client.query(
        `SELECT user_id FROM telegram_links WHERE telegram_id = $1`,
        [telegramId]
      );
      if (existing.rows[0] && existing.rows[0].user_id !== userId) {
        throw new Error("CHAT_ALREADY_LINKED");
      }

      // Ensure the user is not linked to any other Telegram chat
      await client.query(
        `DELETE FROM telegram_links WHERE user_id = $1`,
        [userId]
      );

      await client.query(
        `
        INSERT INTO telegram_links (telegram_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (telegram_id)
        DO UPDATE SET
          user_id = EXCLUDED.user_id,
          linked_at = CURRENT_TIMESTAMP;
        `,
        [telegramId, userId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async unlinkTelegramAccount(telegramId) {
    await pool.query(
      `DELETE FROM telegram_links WHERE telegram_id = $1`,
      [telegramId]
    );
  },

  async getUserIdByTelegramId(telegramId) {
    const result = await pool.query(
      `SELECT user_id FROM telegram_links WHERE telegram_id = $1`,
      [telegramId]
    );

    return result.rows[0]?.user_id || null;
  }
};

module.exports = TelegramLinkModel;

