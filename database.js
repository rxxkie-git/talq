const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  query_timeout: 5000
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
});

async function initDb() {
  // Test connection
  const client = await pool.connect();
  client.release();
  console.log('[DB] Connected to Supabase Postgres database.');
  return pool;
}

// ── Exported API ─────────────────────────────────────────

async function verifyUser(username, password) {
  const res = await pool.query('SELECT id, username, password_hash FROM users WHERE lower(username) = lower($1)', [username]);
  const user = res.rows[0];
  if (!user) return null;
  const valid = bcrypt.compareSync(password, user.password_hash);
  return valid ? { id: user.id, username: user.username } : null;
}

async function createUser(username, password) {
  // Check if username already exists
  const existing = await pool.query('SELECT id FROM users WHERE lower(username) = lower($1)', [username]);
  if (existing.rows.length > 0) throw new Error('Username already exists');

  const password_hash = bcrypt.hashSync(password, 10);
  
  // Let Postgres generate the ID via gen_random_uuid() if set, or just use returning
  const res = await pool.query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
    [username, password_hash]
  );
  
  return res.rows[0];
}

async function saveMessage({ id, username, room, message, timestamp }) {
  await pool.query(
    'INSERT INTO messages (id, username, room, message, timestamp) VALUES ($1, $2, $3, $4, $5)',
    [id, username, room, message, timestamp]
  );
}

async function getRoomHistory(room, limit = 50) {
  const res = await pool.query(
    `SELECT * FROM (
       SELECT id, username, room, message, timestamp FROM messages WHERE room = $1
       ORDER BY timestamp DESC LIMIT $2
     ) sub ORDER BY timestamp ASC`,
    [room, limit]
  );
  return res.rows;
}

async function getAllUsers(excludeUserId) {
  const res = await pool.query(
    'SELECT id, username FROM users WHERE id != $1 LIMIT 50',
    [excludeUserId]
  );
  return res.rows;
}

async function searchUsers(excludeUserId, query) {
  if (!query) return [];
  const res = await pool.query(
    'SELECT id, username FROM users WHERE id != $1 AND username ILIKE $2 LIMIT 50',
    [excludeUserId, `%${query}%`]
  );
  return res.rows;
}

async function sendFriendRequest(senderId, receiverId) {
  const check = await pool.query(
    'SELECT 1 FROM friends WHERE (user_id1 = $1 AND user_id2 = $2) OR (user_id1 = $3 AND user_id2 = $4)',
    [senderId, receiverId, receiverId, senderId]
  );
  if (check.rows.length > 0) throw new Error('Already friends');

  await pool.query(
    `INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, 'pending') ON CONFLICT DO NOTHING`,
    [senderId, receiverId]
  );
}

async function getFriendRequests(userId) {
  const res = await pool.query(
    `SELECT fr.id as request_id, fr.sender_id, u.username as sender_username, fr.status, fr.created_at
     FROM friend_requests fr
     JOIN users u ON fr.sender_id = u.id
     WHERE fr.receiver_id = $1 AND fr.status = 'pending'`,
    [userId]
  );
  return res.rows;
}

async function respondFriendRequest(requestId, receiverId, status) {
  const reqRes = await pool.query('SELECT sender_id FROM friend_requests WHERE id = $1 AND receiver_id = $2', [requestId, receiverId]);
  const req = reqRes.rows[0];
  if (!req) return null;

  await pool.query('UPDATE friend_requests SET status = $1 WHERE id = $2', [status, requestId]);

  if (status === 'accepted') {
    await pool.query(
      `INSERT INTO friends (user_id1, user_id2) VALUES ($1, $2), ($3, $4) ON CONFLICT DO NOTHING`,
      [req.sender_id, receiverId, receiverId, req.sender_id]
    );
    return req.sender_id;
  }
  return null;
}

async function getFriends(userId) {
  const res = await pool.query(
    `SELECT u.id, u.username 
     FROM friends f
     JOIN users u ON f.user_id2 = u.id
     WHERE f.user_id1 = $1`,
    [userId]
  );
  return res.rows;
}

async function deleteOldMessages() {
  try {
    const res = await pool.query(`DELETE FROM messages WHERE timestamp < NOW() - INTERVAL '7 days'`);
    if (res.rowCount > 0) {
      console.log(`[DB] Deleted ${res.rowCount} old messages to free up space.`);
    }
  } catch (err) {
    console.error('[DB] deleteOldMessages error:', err.message);
  }
}

module.exports = {
  verifyUser, createUser, saveMessage, getRoomHistory,
  getAllUsers, searchUsers, sendFriendRequest, getFriendRequests, respondFriendRequest, getFriends,
  initDb, deleteOldMessages
};
