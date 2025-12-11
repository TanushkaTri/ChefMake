const pool = require("../config/db");

exports.listMessages = async (masterClassId) => {
  const result = await pool.query(
    `SELECT m.id, m.master_class_id, m.user_id, m.message, m.created_at, u.name AS author_name
     FROM master_class_messages m
     JOIN users u ON u.id = m.user_id
     WHERE m.master_class_id = $1
     ORDER BY m.created_at ASC`,
    [masterClassId]
  );
  return result.rows;
};

exports.createMessage = async ({ masterClassId, userId, message }) => {
  const result = await pool.query(
    `INSERT INTO master_class_messages (master_class_id, user_id, message)
     VALUES ($1, $2, $3)
     RETURNING id, master_class_id, user_id, message, created_at`,
    [masterClassId, userId, message]
  );
  return result.rows[0];
};

