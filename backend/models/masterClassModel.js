const pool = require("../config/db");

const baseSelect = `
  SELECT
    mc.*,
    u.name AS host_name,
    u.email AS host_email
  FROM master_classes mc
  JOIN users u ON u.id = mc.created_by
`;

exports.createMasterClass = async ({
  title,
  description,
  ingredients,
  start_time,
  duration_minutes,
  video_mode,
  conference_url,
  stream_call_id,
  stream_call_template,
  created_by,
}) => {
  const result = await pool.query(
    `INSERT INTO master_classes
      (title, description, ingredients, start_time, duration_minutes, video_mode, conference_url, stream_call_id, stream_call_template, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      title,
      description,
      ingredients,
      start_time,
      duration_minutes,
      video_mode,
      conference_url,
      stream_call_id,
      stream_call_template,
      created_by,
    ]
  );
  return result.rows[0];
};

exports.listMasterClasses = async ({ filter, userId }) => {
  const now = new Date();
  let where = [];
  const values = [];

  if (filter === "upcoming") {
    values.push(now);
    where.push(`mc.start_time >= $${values.length}`);
  } else if (filter === "past") {
    values.push(now);
    where.push(`mc.start_time < $${values.length}`);
  } else if (filter === "mine" && userId) {
    values.push(userId);
    where.push(`mc.created_by = $${values.length}`);
  }

  const query = [
    baseSelect,
    where.length ? `WHERE ${where.join(" AND ")}` : "",
    "ORDER BY mc.start_time ASC",
  ].join(" ");

  const result = await pool.query(query, values);
  return result.rows;
};

exports.findMasterClassById = async (id) => {
  const result = await pool.query(`${baseSelect} WHERE mc.id = $1`, [id]);
  return result.rows[0];
};

exports.deleteMasterClass = async (id) => {
  await pool.query(`DELETE FROM master_classes WHERE id = $1`, [id]);
};

exports.updateStatus = async (id, status) => {
  const result = await pool.query(
    `UPDATE master_classes SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0];
};

exports.upsertAttendee = async ({ masterClassId, userId, role }) => {
  const result = await pool.query(
    `INSERT INTO master_class_attendees (master_class_id, user_id, role)
     VALUES ($1,$2,$3)
     ON CONFLICT (master_class_id, user_id)
     DO UPDATE SET role = EXCLUDED.role, joined_at = NOW()
     RETURNING *`,
    [masterClassId, userId, role]
  );
  return result.rows[0];
};

