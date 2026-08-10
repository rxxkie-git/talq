const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

async function exportUsers() {
  const db = await open({
    filename: './talq.db',
    driver: sqlite3.Database
  });

  try {
    console.log('[EXPORT] Fetching users from local SQLite database...');
    const rows = await db.all('SELECT id, username FROM users ORDER BY username ASC');
    
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
    await db.close();
  }
}

exportUsers();
