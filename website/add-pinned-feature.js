const mysql = require('mysql2/promise');

async function addPinnedFeature() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'casino_bot'
    });

    console.log('🚀 Adding pinned posts feature...');

    // Add pinned column to blog_posts
    await connection.execute(`
      ALTER TABLE blog_posts 
      ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE AFTER featured
    `);
    console.log('✅ Added pinned column to blog_posts');

    // Add pinned_at timestamp for ordering
    await connection.execute(`
      ALTER TABLE blog_posts 
      ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP NULL AFTER pinned
    `);
    console.log('✅ Added pinned_at column to blog_posts');

    // Update the individual blog API to return these fields
    const [testQuery] = await connection.execute(`
      SELECT id, title, featured, pinned, pinned_at 
      FROM blog_posts 
      LIMIT 1
    `);
    console.log('✅ Database schema updated successfully');

    await connection.end();
    
    console.log('🎉 Pinned posts feature ready!');
    console.log('📌 Features added:');
    console.log('   - pinned column (boolean)');
    console.log('   - pinned_at timestamp for ordering');
    console.log('   - Ready for admin pin/unpin functionality');

  } catch (error) {
    console.error('❌ Error adding pinned feature:', error.message);
    process.exit(1);
  }
}

addPinnedFeature();