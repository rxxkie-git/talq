const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function seed() {
  const db = await open({
    filename: './talq.db',
    driver: sqlite3.Database
  });

  try {
    console.log('[SEED] Connecting to local SQLite database...');
    await db.exec('PRAGMA foreign_keys = ON');

    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        room TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS friend_requests (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        sender_id TEXT,
        receiver_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(sender_id, receiver_id),
        FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS friends (
        user_id1 TEXT,
        user_id2 TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(user_id1, user_id2),
        FOREIGN KEY(user_id1) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id2) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log('[SEED] Tables ensured.');

    const usersToSeed = [
      { username: 'srinand', id: 'usr_srinand' },
      { username: 'deeya', id: 'usr_deeya' },
      { username: 'alice', id: null },
      { username: 'bob', id: null },
      { username: 'charlie', id: null },
      { username: 'david', id: null },
      { username: 'eve', id: null },
      { username: 'frank', id: null },
      { username: 'grace', id: null },
      { username: 'heidi', id: null }
    ];

    const defaultPassword = 'password123';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    for (const u of usersToSeed) {
      const user = await db.get('SELECT id FROM users WHERE lower(username) = lower(?)', [u.username]);
      if (!user) {
        if (u.id) {
          await db.run(
            'INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)',
            [u.id, u.username, passwordHash]
          );
        } else {
          await db.run(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
            [u.username, passwordHash]
          );
        }
        console.log(`[SEED] Created user: ${u.username}`);
      } else {
        console.log(`[SEED] User already exists: ${u.username}`);
      }
    }

    console.log('[SEED] Seeding complete! All dummy users have the password "password123".');
  } catch (err) {
    console.error('[SEED] Error during seeding:', err.message);
  } finally {
    await db.close();
  }
}

seed();
