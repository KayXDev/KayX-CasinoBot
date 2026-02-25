// setup-admin-system.mjs
// Script to create admin system and set neeegroo as owner

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function setupAdminSystem() {
  try {
    let dbConfig = {
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'casino_bot'
    };

    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      dbConfig = {
        host: url.hostname,
        user: url.username || 'root',
        password: url.password || '',
        database: url.pathname.slice(1)
      };
    }

    console.log('Connecting to database...');
    const connection = await mysql.createConnection(dbConfig);

    // Create blog_admins table
    console.log('Creating blog_admins table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS blog_admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(32) NOT NULL,
        username VARCHAR(100) NOT NULL,
        role ENUM('owner', 'admin', 'moderator') NOT NULL DEFAULT 'moderator',
        permissions JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user (user_id),
        INDEX idx_role (role),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);
    console.log('✅ blog_admins table created');

    // Set neeegroo as owner with full permissions
    console.log('Setting neeegroo as owner...');
    await connection.execute(`
      INSERT INTO blog_admins (user_id, username, role, permissions) 
      VALUES (?, ?, 'owner', ?) 
      ON DUPLICATE KEY UPDATE 
        username = VALUES(username),
        role = VALUES(role),
        permissions = VALUES(permissions),
        updated_at = NOW()
    `, [
      '388422519553654786',
      'neeegroo',
      JSON.stringify({
        "manage_posts": true,
        "delete_any_post": true,
        "edit_any_post": true,
        "manage_comments": true,
        "delete_any_comment": true,
        "manage_users": true,
        "manage_admins": true,
        "view_analytics": true,
        "moderate_content": true,
        "featured_posts": true,
        "system_settings": true
      })
    ]);
    console.log('✅ neeegroo set as owner with full permissions');

    // Create audit log table for admin actions
    console.log('Creating admin audit log table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS blog_admin_actions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id VARCHAR(32) NOT NULL,
        admin_username VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        target_type ENUM('post', 'comment', 'user', 'system') NOT NULL,
        target_id VARCHAR(32),
        details JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin (admin_id),
        INDEX idx_action (action),
        INDEX idx_target (target_type, target_id),
        INDEX idx_created (created_at)
      )
    `);
    console.log('✅ blog_admin_actions table created');

    // Log the initial setup
    await connection.execute(`
      INSERT INTO blog_admin_actions (
        admin_id, admin_username, action, target_type, target_id, details
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      '388422519553654786',
      'neeegroo',
      'system_setup',
      'system',
      'blog_admin_system',
      JSON.stringify({
        "description": "Initial admin system setup",
        "timestamp": new Date().toISOString()
      })
    ]);

    console.log('\\n🎉 Admin system setup complete!');
    console.log('👑 neeegroo is now the owner with full permissions');
    console.log('\\nPermissions granted:');
    console.log('• Delete any post or comment');
    console.log('• Edit any content');
    console.log('• Manage users and admins'); 
    console.log('• View analytics');
    console.log('• Moderate all content');
    console.log('• Feature/unfeature posts');
    console.log('• System settings');

    await connection.end();
  } catch (error) {
    console.error('❌ Error setting up admin system:', error.message);
  }
}

setupAdminSystem();