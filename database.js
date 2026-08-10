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

/**
 * Get all users except self.
 */
async function getAllUsers(excludeUserId) {
  const { rows } = await pool.query(
    'SELECT id, username FROM users WHERE id != $1 LIMIT 50',
    [excludeUserId]
  );
  return rows;
}

/**
 * Send a friend request.
 */
async function sendFriendRequest(senderId, receiverId) {
  // Check if they are already friends
  const friendsCheck = await pool.query(
    'SELECT 1 FROM friends WHERE (user_id1 = $1 AND user_id2 = $2) OR (user_id1 = $2 AND user_id2 = $1)',
    [senderId, receiverId]
  );
  if (friendsCheck.rows.length > 0) throw new Error('Already friends');

  // Insert
  await pool.query(
    `INSERT INTO friend_requests (sender_id, receiver_id, status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT (sender_id, receiver_id) DO NOTHING`,
    [senderId, receiverId]
  );
}

/**
 * Get pending friend requests for a user.
 */
async function getFriendRequests(userId) {
  const { rows } = await pool.query(
    `SELECT fr.id as request_id, fr.sender_id, u.username as sender_username, fr.status, fr.created_at
     FROM friend_requests fr
     JOIN users u ON fr.sender_id = u.id
     WHERE fr.receiver_id = $1 AND fr.status = 'pending'`,
    [userId]
  );
  return rows;
}

/**
 * Accept or reject a friend request.
 */
async function respondFriendRequest(requestId, receiverId, status) {
  const { rows } = await pool.query(
    'UPDATE friend_requests SET status = $1 WHERE id = $2 AND receiver_id = $3 RETURNING sender_id, receiver_id',
    [status, requestId, receiverId]
  );

  if (rows.length > 0 && status === 'accepted') {
    const { sender_id, receiver_id } = rows[0];
    await pool.query(
      `INSERT INTO friends (user_id1, user_id2) VALUES ($1, $2), ($2, $1) ON CONFLICT DO NOTHING`,
      [sender_id, receiver_id]
    );
    return sender_id; 
  }
  return null;
}

/**
 * Get a user's friends list.
 */
async function getFriends(userId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.username 
     FROM friends f
     JOIN users u ON f.user_id2 = u.id
     WHERE f.user_id1 = $1`,
    [userId]
  );
  return rows;
}

module.exports = { 
  verifyUser, saveMessage, getRoomHistory,
  getAllUsers, sendFriendRequest, getFriendRequests, respondFriendRequest, getFriends
};
