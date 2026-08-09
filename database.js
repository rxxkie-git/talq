/* ─────────────────────────────────────────────────────────
   Talq — Database Layer (Postgres via Supabase)
   ───────────────────────────────────────────────────────── */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Supabase
});

// ── Test connection on startup ───────────────────────────
pool.query('SELECT 1').then(() => {
  console.log('[DB] Connected to Supabase Postgres ✅');
}).catch(err => {
  console.error('[DB] Connection failed ❌', err.message);
  process.exit(1);
});

// ── Exported API ─────────────────────────────────────────

/**
 * Look up a user by username and verify their password.
 * Returns { id, username } on success, or null on failure.
 */
async function verifyUser(username, password) {
  const { rows } = await pool.query(
    'SELECT id, username, password_hash FROM users WHERE lower(username) = lower($1)',
    [username]
  );
  if (!rows.length) return null;
  const user  = rows[0];
  const valid = bcrypt.compareSync(password, user.password_hash);
  return valid ? { id: user.id, username: user.username } : null;
}

/**
 * Save a chat message to the database.
 */
async function saveMessage({ id, username, room, message, timestamp }) {
  await pool.query(
    'INSERT INTO messages (id, username, room, message, timestamp) VALUES ($1, $2, $3, $4, $5)',
    [id, username, room, message, timestamp]
  );
}

/**
 * Retrieve the last `limit` messages for a given room, oldest-first.
 */
async function getRoomHistory(room, limit = 50) {
  const { rows } = await pool.query(
    `SELECT id, username, room, message, timestamp
     FROM (
       SELECT * FROM messages WHERE room = $1
       ORDER BY timestamp DESC LIMIT $2
     ) sub
     ORDER BY timestamp ASC`,
    [room, limit]
  );
  return rows;
}

module.exports = { verifyUser, saveMessage, getRoomHistory };
