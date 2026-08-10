require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function exportUsers() {
  try {
    console.log('[EXPORT] Fetching users from database...');
    const { rows } = await pool.query('SELECT id, username FROM users ORDER BY username ASC');
    
    if (rows.length === 0) {
      console.log('[EXPORT] No users found in the database.');
      return;
    }

    let fileContent = 'Talq Users List\n==============================\n\n';
    rows.forEach(user => {
      fileContent += `Username: ${user.username}\nID:       ${user.id}\n------------------------------\n`;
    });

    const filePath = path.join(__dirname, 'users_list.txt');
    fs.writeFileSync(filePath, fileContent, 'utf8');

    console.log(`[EXPORT] Successfully wrote ${rows.length} users to ${filePath}`);
  } catch (err) {
    console.error('[EXPORT] Error exporting users:', err.message);
  } finally {
    await pool.end();
  }
}

exportUsers();
