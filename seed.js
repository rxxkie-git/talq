require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  try {
    console.log('[SEED] Connecting to database...');

    // 1. Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        room VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS friend_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
        receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(sender_id, receiver_id)
      );

      CREATE TABLE IF NOT EXISTS friends (
        user_id1 UUID REFERENCES users(id) ON DELETE CASCADE,
        user_id2 UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(user_id1, user_id2)
      );
    `);
    console.log('[SEED] Tables ensured.');

    // 2. Clear old test data (optional but good for a fresh seed)
    // We will just insert if they don't exist.

    const usersToSeed = [
      'srinand', 'deeya', 'alice', 'bob', 'charlie',
      'david', 'eve', 'frank', 'grace', 'heidi'
    ];

    const defaultPassword = 'password123';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    for (const username of usersToSeed) {
      // Check if exists
      const { rows } = await pool.query('SELECT id FROM users WHERE lower(username) = lower($1)', [username]);
      
      if (rows.length === 0) {
        await pool.query(
          'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
          [username, passwordHash]
        );
        console.log(`[SEED] Created user: ${username}`);
      } else {
        console.log(`[SEED] User already exists: ${username}`);
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
