const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('[SEED] Connecting to Supabase Postgres database...');
    
    await pool.query(`
      DROP TABLE IF EXISTS friends CASCADE;
      DROP TABLE IF EXISTS friend_requests CASCADE;
      DROP TABLE IF EXISTS messages CASCADE;
      DROP TABLE IF EXISTS users CASCADE;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        room TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS friend_requests (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        sender_id TEXT,
        receiver_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(sender_id, receiver_id),
        FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS friends (
        user_id1 TEXT,
        user_id2 TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
      const existing = await pool.query('SELECT id FROM users WHERE lower(username) = lower($1)', [u.username]);
      if (existing.rows.length === 0) {
        const idToUse = u.id || crypto.randomUUID();
        await pool.query(
          'INSERT INTO users (id, username, password_hash) VALUES ($1, $2, $3)',
          [idToUse, u.username, passwordHash]
        );
        console.log(`[SEED] Created user: ${u.username}`);
      } else {
        console.log(`[SEED] User already exists: ${u.username}`);
      }
    }

    console.log('[SEED] Seeding complete! All dummy users have the password "password123".');
  } catch (err) {
    console.error('[SEED] Error during seeding:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
