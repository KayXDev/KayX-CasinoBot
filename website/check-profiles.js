const mysql = require('mysql2/promise');

async function checkProfiles() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'casino_bot'
    });

    console.log('🔍 Checking user profiles in database...\n');

    // Check if table exists
    const [tableCheck] = await conn.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'casino_bot' AND table_name = 'user_profiles'
    `);

    if (tableCheck[0].count === 0) {
      console.log('❌ user_profiles table does not exist!');
      await conn.end();
      return;
    }

    // Get all profiles
    const [profiles] = await conn.execute(`
      SELECT id, discord_id, display_name, custom_username, created_at, is_verified, is_owner
      FROM user_profiles 
      ORDER BY created_at DESC
    `);

    if (profiles.length === 0) {
      console.log('📭 No user profiles found in database');
    } else {
      console.log(`📊 Found ${profiles.length} user profiles:`);
      console.table(profiles);
    }

    await conn.end();
  } catch (error) {
    console.error('❌ Error checking profiles:', error.message);
  }
}

checkProfiles();