const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let db;
async function initDb() {
  if (db) return db;
  db = await open({
    filename: './talq.db',
    driver: sqlite3.Database
  });
  console.log('[DB] Connected to local SQLite database.');
  await db.exec('PRAGMA foreign_keys = ON');
  return db;
}

// ── Exported API ─────────────────────────────────────────

async function verifyUser(username, password) {
  if (!db) await initDb();
  const user = await db.get('SELECT id, username, password_hash FROM users WHERE lower(username) = lower(?)', [username]);
  if (!user) return null;
  const valid = bcrypt.compareSync(password, user.password_hash);
  return valid ? { id: user.id, username: user.username } : null;
}

async function createUser(username, password) {
  if (!db) await initDb();
  
  // Check if username already exists
  const existing = await db.get('SELECT id FROM users WHERE lower(username) = lower(?)', [username]);
  if (existing) throw new Error('Username already exists');

  const password_hash = bcrypt.hashSync(password, 10);
  
  // Let SQLite generate the ID
  await db.run(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)',
    [username, password_hash]
  );
  
  // Return the newly created user
  const newUser = await db.get('SELECT id, username FROM users WHERE lower(username) = lower(?)', [username]);
  return newUser;
}

async function saveMessage({ id, username, room, message, timestamp }) {
  if (!db) await initDb();
  await db.run(
    'INSERT INTO messages (id, username, room, message, timestamp) VALUES (?, ?, ?, ?, ?)',
    [id, username, room, message, timestamp]
  );
}

async function getRoomHistory(room, limit = 50) {
  if (!db) await initDb();
  const rows = await db.all(
    `SELECT * FROM (
       SELECT id, username, room, message, timestamp FROM messages WHERE room = ?
       ORDER BY timestamp DESC LIMIT ?
     ) ORDER BY timestamp ASC`,
    [room, limit]
  );
  return rows;
}

async function getAllUsers(excludeUserId) {
  if (!db) await initDb();
  const rows = await db.all(
    'SELECT id, username FROM users WHERE id != ? LIMIT 50',
    [excludeUserId]
  );
  return rows;
}

async function sendFriendRequest(senderId, receiverId) {
  if (!db) await initDb();
  const check = await db.get(
    'SELECT 1 FROM friends WHERE (user_id1 = ? AND user_id2 = ?) OR (user_id1 = ? AND user_id2 = ?)',
    [senderId, receiverId, receiverId, senderId]
  );
  if (check) throw new Error('Already friends');

  await db.run(
    `INSERT OR IGNORE INTO friend_requests (sender_id, receiver_id, status) VALUES (?, ?, 'pending')`,
    [senderId, receiverId]
  );
}

async function getFriendRequests(userId) {
  if (!db) await initDb();
  const rows = await db.all(
    `SELECT fr.id as request_id, fr.sender_id, u.username as sender_username, fr.status, fr.created_at
     FROM friend_requests fr
     JOIN users u ON fr.sender_id = u.id
     WHERE fr.receiver_id = ? AND fr.status = 'pending'`,
    [userId]
  );
  return rows;
}

async function respondFriendRequest(requestId, receiverId, status) {
  if (!db) await initDb();
  const req = await db.get('SELECT sender_id FROM friend_requests WHERE id = ? AND receiver_id = ?', [requestId, receiverId]);
  if (!req) return null;

  await db.run('UPDATE friend_requests SET status = ? WHERE id = ?', [status, requestId]);

  if (status === 'accepted') {
    await db.run(
      `INSERT OR IGNORE INTO friends (user_id1, user_id2) VALUES (?, ?), (?, ?)`,
      [req.sender_id, receiverId, receiverId, req.sender_id]
    );
    return req.sender_id;
  }
  return null;
}

async function getFriends(userId) {
  if (!db) await initDb();
  const rows = await db.all(
    `SELECT u.id, u.username 
     FROM friends f
     JOIN users u ON f.user_id2 = u.id
     WHERE f.user_id1 = ?`,
    [userId]
  );
  return rows;
}

module.exports = {
  verifyUser, createUser, saveMessage, getRoomHistory,
  getAllUsers, sendFriendRequest, getFriendRequests, respondFriendRequest, getFriends,
  initDb
};
