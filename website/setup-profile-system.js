const mysql = require('mysql2/promise');

async function setupUserProfileSystem() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'casino_bot'
    });

    console.log('🚀 Setting up user profile system...');

    // 1. Create user_profiles table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id VARCHAR(32) PRIMARY KEY,
        discord_id VARCHAR(32) UNIQUE NOT NULL,
        custom_username VARCHAR(50) UNIQUE,
        display_name VARCHAR(100),
        bio TEXT,
        website VARCHAR(255),
        twitter VARCHAR(100),
        instagram VARCHAR(100),
        location VARCHAR(100),
        banner_url VARCHAR(500),
        avatar_url VARCHAR(500),
        is_verified BOOLEAN DEFAULT FALSE,
        is_owner BOOLEAN DEFAULT FALSE,
        verification_type ENUM('none', 'verified', 'owner') DEFAULT 'none',
        follower_count INT DEFAULT 0,
        following_count INT DEFAULT 0,
        post_count INT DEFAULT 0,
        joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ user_profiles table created');

    // 2. Create followers table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_followers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        follower_id VARCHAR(32) NOT NULL,
        following_id VARCHAR(32) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (follower_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (following_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
        UNIQUE KEY unique_follow (follower_id, following_id)
      )
    `);
    console.log('✅ user_followers table created');

    // 3. Update blog_posts to track real views
    await connection.execute(`
      ALTER TABLE blog_posts 
      ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0
    `);
    console.log('✅ blog_posts updated with view_count');

    // 4. Create post_views table for tracking unique views
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS post_views (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_id VARCHAR(32),
        ip_address VARCHAR(45),
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
        INDEX idx_post_user (post_id, user_id),
        INDEX idx_post_ip (post_id, ip_address)
      )
    `);
    console.log('✅ post_views table created');

    // 5. Create user_likes table for tracking real likes
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(32) NOT NULL,
        post_id INT,
        comment_id INT,
        type ENUM('post', 'comment') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (comment_id) REFERENCES blog_comments(id) ON DELETE CASCADE,
        INDEX idx_user_post (user_id, post_id),
        INDEX idx_user_comment (user_id, comment_id),
        UNIQUE KEY unique_user_post_like (user_id, post_id, type),
        UNIQUE KEY unique_user_comment_like (user_id, comment_id, type)
      )
    `);
    console.log('✅ user_likes table created');

    // 6. Create neeegroo profile with owner status
    const neeegroDiscordId = '388422519553654786';
    await connection.execute(`
      INSERT INTO user_profiles (
        id, discord_id, custom_username, display_name, bio, 
        is_verified, is_owner, verification_type
      ) VALUES (?, ?, 'neeegroo', 'neeegroo', 'Owner & Founder of Casino Discord Bot 👑', TRUE, TRUE, 'owner')
      ON DUPLICATE KEY UPDATE 
        is_verified = TRUE,
        is_owner = TRUE,
        verification_type = 'owner',
        bio = 'Owner & Founder of Casino Discord Bot 👑'
    `, [neeegroDiscordId, neeegroDiscordId]);
    console.log('👑 neeegroo profile created as OWNER');

    // 7. Update existing blog_posts and blog_comments with author profiles
    await connection.execute(`
      UPDATE blog_posts bp 
      LEFT JOIN user_profiles up ON bp.author_id = up.discord_id 
      SET bp.author_name = COALESCE(up.display_name, up.custom_username, bp.author_name)
      WHERE up.id IS NOT NULL
    `);

    await connection.execute(`
      UPDATE blog_comments bc 
      LEFT JOIN user_profiles up ON bc.author_id = up.discord_id 
      SET bc.author_name = COALESCE(up.display_name, up.custom_username, bc.author_name)
      WHERE up.id IS NOT NULL
    `);
    console.log('✅ Updated existing posts and comments with profile data');

    await connection.end();
    
    console.log('🎉 User profile system setup complete!');
    console.log('📊 Features added:');
    console.log('   - User profiles with custom bios and usernames');
    console.log('   - Follower/following system');
    console.log('   - Real view and like tracking');
    console.log('   - Verification badges');
    console.log('   - Owner crown for neeegroo 👑');

  } catch (error) {
    console.error('❌ Error setting up user profile system:', error.message);
    process.exit(1);
  }
}

setupUserProfileSystem();